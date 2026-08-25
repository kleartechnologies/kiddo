import "server-only";

import type Stripe from "stripe";

import {
  isNewer,
  parseSubscription,
  stateFromStripe,
  type Plan,
  type SubscriptionState,
} from "@/lib/billing/subscription";
import { parseJoinEvent, type JoinEvent } from "@/lib/social/joins";
import { adminDb } from "./firebaseAdmin";
import { priceIds, stripe } from "./stripe";

/**
 * What the billing routes share: finding or making the parent's Stripe
 * customer, and applying a Stripe subscription to `users/{uid}`.
 *
 * The customer id is remembered on the user document so a parent who opens
 * Checkout twice (or cancels and comes back) is one customer in Stripe, not
 * two — which is also what stops a second, duplicate subscription: before
 * starting Checkout the route looks for a live subscription on the
 * customer and refuses to start another.
 */

const USERS = "users";
const EVENTS = "stripeEvents";
const JOINS = "joinEvents";

export async function userDoc(uid: string): Promise<FirebaseFirestore.DocumentData | null> {
  const snap = await adminDb().collection(USERS).doc(uid).get();
  return snap.exists ? (snap.data() ?? null) : null;
}

export async function subscriptionOf(uid: string): Promise<SubscriptionState> {
  const data = await userDoc(uid);
  return parseSubscription(data?.subscription);
}

/** The parent's Stripe customer id, creating the customer on first use. */
export async function customerFor(uid: string, email: string | null): Promise<string> {
  const data = await userDoc(uid);
  const existing = data?.subscription?.stripeCustomerId;
  if (typeof existing === "string" && existing) return existing;
  const customer = await stripe().customers.create({
    email: email ?? undefined,
    metadata: { uid },
  });
  await adminDb()
    .collection(USERS)
    .doc(uid)
    .set({ subscription: { stripeCustomerId: customer.id } }, { merge: true });
  return customer.id;
}

/** Subscriptions on the customer that still count as "in progress". */
export async function liveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const list = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  return list.data.filter((s) =>
    ["active", "trialing", "past_due", "incomplete", "unpaid"].includes(s.status),
  );
}

/**
 * Write a Stripe subscription to the user document, unless an event newer
 * than this one has already been applied. Nothing but this function and
 * `customerFor` writes the `subscription` field; the client cannot.
 */
export async function applySubscription(
  uid: string,
  sub: Stripe.Subscription,
  eventCreated: number,
): Promise<SubscriptionState | null> {
  const incoming = stateFromStripe(
    {
      id: sub.id,
      status: sub.status,
      customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      cancel_at_period_end: sub.cancel_at_period_end,
      cancel_at: sub.cancel_at,
      items: {
        data: sub.items.data.map((item) => ({
          price: { id: item.price.id },
          current_period_end: item.current_period_end,
        })),
      },
    },
    priceIds(),
    eventCreated,
  );
  const ref = adminDb().collection(USERS).doc(uid);
  const applied = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? parseSubscription(snap.data()?.subscription) : null;
    if (existing && existing.eventCreated > 0 && !isNewer(incoming, existing)) return null;
    tx.set(ref, { subscription: { ...incoming, updatedAt: Date.now() } }, { merge: true });
    return { incoming, wasActive: existing?.status === "active" };
  });
  if (!applied) return null;
  /* A subscription that has just started paying for the first time is the
     one thing a stranger may be told about — as "a family joined", nothing
     more. A renewal is active → active and says nothing new. */
  if (applied.incoming.status === "active" && !applied.wasActive) {
    await recordJoin(sub.id, applied.incoming.plan, eventCreated * 1000);
  }
  return applied.incoming;
}

/**
 * Remember, in a form that identifies nobody, that a family joined: when,
 * and which plan. Keyed by the Stripe subscription id so one subscription
 * can only ever produce one notice however many times Stripe tells us
 * about it. Never blocks the webhook — a notice is not worth a retry.
 */
export async function recordJoin(
  subscriptionId: string,
  plan: Plan | null,
  at: number,
): Promise<void> {
  try {
    await adminDb().collection(JOINS).doc(subscriptionId).create({ at, plan });
  } catch (error) {
    if (isAlreadyExists(error)) return;
    console.error("[billing/join]", error instanceof Error ? error.message : error);
  }
}

/**
 * The recent joins, for `GET /api/social/recent`. Reads only the two
 * public fields; the private ones are not in the document to begin with.
 */
export async function recentJoinEvents(limit: number): Promise<JoinEvent[]> {
  const snap = await adminDb().collection(JOINS).orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((doc) => parseJoinEvent(doc.data())).filter((e): e is JoinEvent => e !== null);
}

/**
 * Idempotency: Stripe retries until it sees a 2xx, and may deliver the same
 * event more than once. Each event id is recorded once; a second sighting
 * is acknowledged and ignored. Returns true when this is the first time.
 */
export async function claimEvent(eventId: string, type: string): Promise<boolean> {
  try {
    await adminDb().collection(EVENTS).doc(eventId).create({ type, receivedAt: Date.now() });
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) return false;
    throw error;
  }
}

export async function releaseEvent(eventId: string): Promise<void> {
  await adminDb().collection(EVENTS).doc(eventId).delete();
}

function isAlreadyExists(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

/** The uid a Stripe object belongs to: from Checkout, then from the customer. */
export async function uidOf(
  sub: Stripe.Subscription | null,
  session: Stripe.Checkout.Session | null,
): Promise<string | null> {
  const fromSession = session?.client_reference_id || session?.metadata?.uid;
  if (fromSession) return fromSession;
  const fromSub = sub?.metadata?.uid;
  if (fromSub) return fromSub;
  const customerId = sub
    ? typeof sub.customer === "string" ? sub.customer : sub.customer.id
    : typeof session?.customer === "string" ? session.customer : session?.customer?.id;
  if (!customerId) return null;
  const customer = await stripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.uid || null;
}

export function planFromPrice(priceId: string): Plan | null {
  const ids = priceIds();
  return priceId === ids.yearly ? "yearly" : priceId === ids.monthly ? "monthly" : null;
}
