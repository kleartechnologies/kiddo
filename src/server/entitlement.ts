import "server-only";

import { LIFETIME_AMOUNT, parseEntitlement, type Entitlement } from "@/lib/billing/access";
import { parseJoinEvent, type JoinEvent } from "@/lib/social/joins";
import { adminDb } from "./firebaseAdmin";
import type { Bill } from "./billplz";
import { billIsSettled } from "./billplz";

/**
 * The lifetime entitlement, and the ledger that makes granting it safe to
 * do twice.
 *
 * Two collections, both server-only:
 *
 *   users/{uid}.access        the entitlement itself. One boolean and its
 *                             receipt. Written here and nowhere else; the
 *                             Firestore rules forbid every client to touch
 *                             it (see `firestore.rules`).
 *   billplzBills/{billId}     who a bill was created for, and whether it
 *                             has been settled. Written the moment a bill
 *                             is created, which is what lets the callback
 *                             answer "whose is this?" without believing a
 *                             word the callback said.
 *
 * The ledger is the whole idempotency story. Billplz may deliver a callback
 * more than once, and the redirect leg asks the same question again from
 * the browser; both end up in `settleBill`, which is a transaction keyed on
 * the bill id. The first one through writes the entitlement and marks the
 * bill settled. Every later one reads `settled: true` and does nothing.
 *
 * Granting is also idempotent by nature — `lifetime: true` written twice is
 * the same state — so a duplicate cannot produce a *different* outcome even
 * if the transaction were somehow bypassed. There is no counter to
 * double-increment, no period to extend and no second charge to make: that
 * is the quiet advantage of selling a thing once.
 */

const USERS = "users";
const BILLS = "billplzBills";
const JOINS = "joinEvents";

export interface BillRecord {
  /** The KIDDO account the bill was created for. The only source of truth
      about whose payment this is — never the email on the callback. */
  uid: string;
  email: string | null;
  /** Sen, as asked for at creation. */
  amount: number;
  createdAt: number;
  /** True once the entitlement has been granted for this bill. */
  settled: boolean;
  settledAt: number | null;
  /** Billplz's own last word on the bill, for support questions. */
  state: string | null;
  paidAmount: number | null;
}

/** The whole billing half of a user document, parsed and untrusted. */
export async function entitlementOf(uid: string): Promise<Entitlement> {
  const snap = await adminDb().collection(USERS).doc(uid).get();
  return parseEntitlement(snap.exists ? (snap.data() ?? {}) : {});
}

/**
 * Remember, before the parent ever reaches Billplz, which account a bill
 * belongs to.
 *
 * This runs between creating the bill and handing back its URL, and the
 * route treats a failure here as a failed purchase — an unpaid bill nobody
 * is sent to is harmless, whereas a paid bill with no owner is a support
 * ticket. `create` rather than `set`, so a bill id can never be re-pointed
 * at a different account.
 */
export async function recordBill(billId: string, record: Omit<BillRecord, "settled" | "settledAt" | "state" | "paidAmount">): Promise<void> {
  await adminDb()
    .collection(BILLS)
    .doc(billId)
    .create({ ...record, settled: false, settledAt: null, state: null, paidAmount: null });
}

export async function billRecord(billId: string): Promise<BillRecord | null> {
  const snap = await adminDb().collection(BILLS).doc(billId).get();
  if (!snap.exists) return null;
  const raw = snap.data() ?? {};
  if (typeof raw.uid !== "string" || !raw.uid) return null;
  return {
    uid: raw.uid,
    email: typeof raw.email === "string" ? raw.email : null,
    amount: typeof raw.amount === "number" ? raw.amount : LIFETIME_AMOUNT,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
    settled: raw.settled === true,
    settledAt: typeof raw.settledAt === "number" ? raw.settledAt : null,
    state: typeof raw.state === "string" ? raw.state : null,
    paidAmount: typeof raw.paidAmount === "number" ? raw.paidAmount : null,
  };
}

export type Settlement =
  /** This call is the one that opened KIDDO. */
  | { outcome: "granted"; uid: string }
  /** Already done — a repeat callback, or the redirect racing it. */
  | { outcome: "already"; uid: string }
  /** Billplz says the money is not there. Nothing is written. */
  | { outcome: "unpaid"; uid: string }
  /** No ledger row: a bill KIDDO did not create, or one from another site. */
  | { outcome: "unknown" };

/**
 * Turn a paid bill into lifetime access, once.
 *
 * `bill` must be the answer to `getBill` — Billplz's own word, fetched with
 * KIDDO's secret key — and never a callback body. Both callers fetch it
 * before getting here, and this function re-checks the amount and the
 * collection through `billIsSettled` rather than assuming they did.
 *
 * The two writes are one transaction so a crash between them is not a
 * granted entitlement with an unsettled bill (which the next callback would
 * happily grant again) or a settled bill with no entitlement (which nothing
 * would ever retry).
 */
export async function settleBill(bill: Bill): Promise<Settlement> {
  const db = adminDb();
  const billRef = db.collection(BILLS).doc(bill.id);

  const result = await db.runTransaction(async (tx) => {
    const billSnap = await tx.get(billRef);
    if (!billSnap.exists) return { outcome: "unknown" } as const;
    const raw = billSnap.data() ?? {};
    const uid = typeof raw.uid === "string" ? raw.uid : "";
    if (!uid) return { outcome: "unknown" } as const;

    const expected = typeof raw.amount === "number" ? raw.amount : LIFETIME_AMOUNT;
    if (!billIsSettled(bill, expected)) return { outcome: "unpaid", uid } as const;
    if (raw.settled === true) return { outcome: "already", uid } as const;

    const userRef = db.collection(USERS).doc(uid);
    const now = Date.now();
    tx.set(
      userRef,
      {
        access: {
          lifetime: true,
          grantedAt: now,
          source: "billplz",
          billId: bill.id,
          amount: bill.paid_amount,
        },
        updatedAt: now,
      },
      { merge: true },
    );
    tx.update(billRef, {
      settled: true,
      settledAt: now,
      state: bill.state,
      paidAmount: bill.paid_amount,
    });
    return { outcome: "granted", uid, at: now } as const;
  });

  /* A notice on the landing page, and never a reason to fail a payment. */
  if (result.outcome === "granted") await recordJoin(bill.id, result.at);
  return result;
}

/**
 * Remember, in a form that identifies nobody, that a family joined: when,
 * and nothing else. Keyed by the bill id so one purchase can only ever
 * produce one notice however many times KIDDO is told about it.
 */
async function recordJoin(billId: string, at: number): Promise<void> {
  try {
    await adminDb().collection(JOINS).doc(billId).create({ at });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    if (code === 6 || code === "already-exists" || code === "ALREADY_EXISTS") return;
    console.error("[billplz/join]", error instanceof Error ? error.message : error);
  }
}

/**
 * The recent joins, for `GET /api/social/recent`. Reads only the one public
 * field; nothing private is in the document to begin with. It lives beside
 * the function that writes them so that `joinEvents` has exactly one module
 * in front of it.
 */
export async function recentJoinEvents(limit: number): Promise<JoinEvent[]> {
  const snap = await adminDb().collection(JOINS).orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((doc) => parseJoinEvent(doc.data())).filter((e): e is JoinEvent => e !== null);
}
