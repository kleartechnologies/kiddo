import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Billplz for KIDDO's route handlers. Server-only, like the Admin SDK.
 *
 *   BILLPLZ_SECRET_KEY     the API secret. Never NEXT_PUBLIC_, never in a
 *                          browser bundle, never logged.
 *   BILLPLZ_COLLECTION_ID  the collection KIDDO's lifetime bills belong to.
 *   BILLPLZ_XSIGNATURE_KEY the collection's X-Signature key, which is what
 *                          lets the callback prove it came from Billplz.
 *   BILLPLZ_MODE           "sandbox" (the default) or "production".
 *
 * The mode defaults to sandbox on purpose. A deployment that has not said
 * out loud that it is live talks to billplz-sandbox.com, where no real
 * money moves — so the failure mode of a half-finished configuration is a
 * test payment, not a real one.
 *
 * `server-only` above is the enforcement, not a note: importing this from a
 * client component is a build error rather than a leaked key.
 */

const SANDBOX_BASE = "https://www.billplz-sandbox.com/api/";
const PRODUCTION_BASE = "https://www.billplz.com/api/";

export type BillplzMode = "sandbox" | "production";

export function billplzMode(): BillplzMode {
  return process.env.BILLPLZ_MODE === "production" ? "production" : "sandbox";
}

export function billplzBase(): string {
  return billplzMode() === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function billplzConfigured(): boolean {
  return Boolean(process.env.BILLPLZ_SECRET_KEY && process.env.BILLPLZ_COLLECTION_ID);
}

function secretKey(): string {
  const key = process.env.BILLPLZ_SECRET_KEY;
  if (!key) throw new Error("BILLPLZ_SECRET_KEY is not set.");
  return key;
}

function collectionId(): string {
  const id = process.env.BILLPLZ_COLLECTION_ID;
  if (!id) throw new Error("BILLPLZ_COLLECTION_ID is not set.");
  return id;
}

/** The X-Signature key, or null on a deployment that has not set one. */
export function signatureKey(): string | null {
  return process.env.BILLPLZ_XSIGNATURE_KEY || null;
}

/** Billplz authenticates with HTTP Basic: the secret key as the username. */
function authHeader(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

/* ---- The bill ---------------------------------------------------------- */

/**
 * A Billplz bill, as much of it as KIDDO reads.
 *
 * `paid` and `state` are the two that decide anything, and they are only
 * ever believed when they came back from `getBill` — that is, from a
 * request KIDDO made with its own secret key. The same fields arriving on
 * a callback body are a hint that it is worth asking.
 */
export interface Bill {
  id: string;
  collection_id: string;
  paid: boolean;
  state: string;
  /** Sen. What the bill asked for. */
  amount: number;
  /** Sen. What was actually received. */
  paid_amount: number;
  email: string | null;
  name: string | null;
  url: string;
  /** Billplz's own timestamp string, e.g. "2015-3-9 16:23:59 +0800". */
  paid_at: string | null;
  reference_1: string | null;
  reference_1_label: string | null;
}

export class BillplzError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "BillplzError";
    this.status = status;
  }
}

function toBill(raw: Record<string, unknown>): Bill {
  return {
    id: String(raw.id ?? ""),
    collection_id: String(raw.collection_id ?? ""),
    paid: raw.paid === true,
    state: typeof raw.state === "string" ? raw.state : "",
    amount: Number(raw.amount ?? 0),
    paid_amount: Number(raw.paid_amount ?? 0),
    email: typeof raw.email === "string" ? raw.email : null,
    name: typeof raw.name === "string" ? raw.name : null,
    url: typeof raw.url === "string" ? raw.url : "",
    paid_at: typeof raw.paid_at === "string" ? raw.paid_at : null,
    reference_1: typeof raw.reference_1 === "string" ? raw.reference_1 : null,
    reference_1_label: typeof raw.reference_1_label === "string" ? raw.reference_1_label : null,
  };
}

/** How long KIDDO waits on Billplz before giving the parent an answer. */
const TIMEOUT_MS = 15_000;

async function call(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`${billplzBase()}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: authHeader() },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    /* Billplz answers errors as `{ "error": { "message": [...] } }`. The
       body is echoed because it names the field that was wrong, and it
       never contains the secret — which is in a header, not the body. */
    throw new BillplzError(response.status, text.slice(0, 500));
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new BillplzError(502, "billplz returned a body that is not JSON");
  }
}

export interface NewBill {
  /** The parent's name for the receipt. Billplz requires something. */
  name: string;
  /** From the verified ID token, never from the browser. */
  email: string;
  /** Sen. KIDDO only ever sends `LIFETIME_AMOUNT`. */
  amount: number;
  description: string;
  callbackUrl: string;
  redirectUrl: string;
  /** The KIDDO account this bill is for, so a human can reconcile one. */
  uid: string;
}

/**
 * Create a bill and get back the page to send the parent to.
 *
 * `deliver: false` because KIDDO sends nobody an email about a bill it is
 * about to redirect them to; the receipt Billplz sends on payment is a
 * separate setting on the collection.
 */
export async function createBill(bill: NewBill): Promise<Bill> {
  const body = new URLSearchParams({
    collection_id: collectionId(),
    email: bill.email,
    name: bill.name,
    amount: String(bill.amount),
    callback_url: bill.callbackUrl,
    redirect_url: bill.redirectUrl,
    description: bill.description,
    reference_1_label: "KIDDO account",
    reference_1: bill.uid,
    deliver: "false",
  });
  const raw = await call("v3/bills", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return toBill(raw);
}

/**
 * Ask Billplz what a bill's state really is.
 *
 * This is the authority. A callback body says a bill was paid; this is
 * KIDDO going and checking, with its own credentials, over a connection
 * nobody else can stand in the middle of. Nothing grants access without it.
 */
export async function getBill(id: string): Promise<Bill> {
  const raw = await call(`v3/bills/${encodeURIComponent(id)}`, { method: "GET" });
  return toBill(raw);
}

/**
 * Whether a bill is one KIDDO should act on: paid, in KIDDO's own
 * collection, and paid for at least what was asked.
 *
 * The collection check matters. A secret key can read every bill on the
 * account, so without it a bill created by some other product on the same
 * Billplz account could open KIDDO.
 */
export function billIsSettled(bill: Bill, expectedAmount: number): boolean {
  if (!bill.paid || bill.state !== "paid") return false;
  if (bill.collection_id !== process.env.BILLPLZ_COLLECTION_ID) return false;
  return bill.paid_amount >= expectedAmount;
}

/* ---- X-Signature ------------------------------------------------------- */

/**
 * Billplz signs what it sends back with the collection's X-Signature key.
 *
 * The source string is every parameter except the signature itself, each
 * written as `key` immediately followed by `value`, sorted by key and
 * joined with `|`. The digest is HMAC-SHA256, hex.
 *
 * The redirect spells its parameters `billplz[id]`; the callback spells the
 * same field `id`. `sourceString` is given already-flattened keys, and
 * `billplzRedirectFields` below does the flattening, so one implementation
 * covers both.
 */
export function sourceString(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((key) => key !== "x_signature" && key !== "billplzx_signature")
    .sort()
    .map((key) => `${key}${fields[key]}`)
    .join("|");
}

export function sign(fields: Record<string, string>, key: string): string {
  return createHmac("sha256", key).update(sourceString(fields), "utf8").digest("hex");
}

/**
 * Whether a signature is Billplz's. Constant-time, and false for anything
 * malformed rather than throwing — a caller should get one answer to one
 * question, and every "no" should cost the same.
 */
export function verifySignature(
  fields: Record<string, string>,
  signature: string | undefined,
  key: string,
): boolean {
  if (!signature) return false;
  const expected = sign(fields, key);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Flatten a redirect's `billplz[...]` query parameters into the shape
 * `sourceString` signs: `billplz[paid_at]` becomes `billplzpaid_at`.
 */
export function billplzRedirectFields(params: URLSearchParams): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of params) {
    const match = /^billplz\[(.+)\]$/.exec(key);
    if (match) fields[`billplz${match[1]}`] = value;
  }
  return fields;
}
