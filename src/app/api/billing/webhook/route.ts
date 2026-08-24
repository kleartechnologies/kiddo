import type Stripe from "stripe";

import { applySubscription, claimEvent, releaseEvent, uidOf } from "@/server/billing";
import { billingUnavailable, json, problem } from "@/server/http";
import { stripe, webhookSecret } from "@/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Stripe → KIDDO. The only writer of
 * `users/{uid}.subscription` (with the customer id set by Checkout).
 *
 *  1. The signature is verified against the raw body with
 *     STRIPE_WEBHOOK_SECRET; anything else is 400 and nothing is read.
 *  2. The event id is claimed in `stripeEvents/{id}`; a repeat is 200 and
 *     ignored.
 *  3. The subscription on the event is mapped to KIDDO's state and written
 *     unless an event newer than this one has already been applied.
 *
 * Handled: checkout.session.completed, customer.subscription.created /
 * updated / deleted. Everything else is acknowledged and ignored. No card
 * data is on any of these events and none is stored.
 */
export const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const down = billingUnavailable();
  if (down) return down;
  if (!process.env.STRIPE_WEBHOOK_SECRET) return problem(503, "billing-not-configured");

  const signature = request.headers.get("stripe-signature");
  if (!signature) return problem(400, "missing-signature");
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch {
    return problem(400, "bad-signature");
  }

  if (!HANDLED_EVENTS.has(event.type)) return json({ received: true, ignored: event.type });

  try {
    const first = await claimEvent(event.id, event.type);
    if (!first) return json({ received: true, duplicate: true });

    let sub: Stripe.Subscription | null = null;
    let session: Stripe.Checkout.Session | null = null;
    if (event.type === "checkout.session.completed") {
      session = event.data.object as Stripe.Checkout.Session;
      const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!id) return json({ received: true, ignored: "no-subscription" });
      sub = await stripe().subscriptions.retrieve(id);
    } else {
      sub = event.data.object as Stripe.Subscription;
    }

    const uid = await uidOf(sub, session);
    if (!uid) {
      console.error("[billing/webhook] no uid for", event.id, sub?.id);
      return json({ received: true, ignored: "no-uid" });
    }
    await applySubscription(uid, sub, event.created);
    return json({ received: true });
  } catch (error) {
    /* A 500 makes Stripe retry later, which is what we want for a Firestore
       hiccup. The claim is released so the retry is processed, not skipped. */
    console.error("[billing/webhook]", event.id, error instanceof Error ? error.message : error);
    await releaseEvent(event.id).catch(() => {});
    return problem(500, "webhook-failed");
  }
}
