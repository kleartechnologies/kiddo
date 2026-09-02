import "server-only";

import type Stripe from "stripe";

import {
  isNewer,
  parseSubscription,
  stateFromStripe,
  type Plan,
  type SubscriptionState,
} from "@/lib/billing/subscription";
import { adminDb } from "./firebaseAdmin";
import { priceIds, stripe } from "./stripe";

/**
 * What is left of Stripe: reading a parent's old subscription, and applying
 * a Stripe event to `users/{uid}`.
 *
 * KIDDO is sold once now, through Billplz — see `src/server/billplz.ts` and
 * `src/server/entitlement.ts`. This file no longer opens Checkout, no longer
 * creates customers and no longer starts subscriptions; nothing here can.
 * It exists for the parents who subscribed before the change: their
 * subscription still renews at Stripe, the webhook still records what
 * happens to it, `hasAccess` still honours it, and the customer portal still
 * lets them manage or end it. See `docs/kiddo-billing.md`.
 */

const USERS = "users";
const EVENTS = "stripeEvents";

export async function userDoc(uid: string): Promise<FirebaseFirestore.DocumentData | null> {
  const snap = await adminDb().collection(USERS).doc(uid).get();
  return snap.exists ? (snap.data() ?? null) : null;
}

export async function subscriptionOf(uid: string): Promise<SubscriptionState> {
  const data = await userDoc(uid);
  return parseSubscription(data?.subscription);
}

/**
 * Write a Stripe subscription to the user document, unless an event newer
 * than this one has already been applied. Nothing but this function writes
 * the `subscription` field; the client cannot, and neither can the Billplz
 * side, which writes `access` and leaves this alone.
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
    return incoming;
  });
  /* No join notice from here any more. A join is a family arriving, and
     nobody arrives through Stripe now — nothing can start a subscription,
     so every event this function still sees belongs to a parent who joined
     long ago. `settleBill` writes the notices; see `entitlement.ts`. */
  return applied;
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
