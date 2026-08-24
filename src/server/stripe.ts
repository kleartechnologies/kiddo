import "server-only";

import Stripe from "stripe";

import type { Plan } from "@/lib/billing/subscription";

/**
 * Stripe for KIDDO's route handlers. Server-only, like the Admin SDK.
 *
 *   STRIPE_SECRET_KEY      sk_test_… / sk_live_…   (never NEXT_PUBLIC_)
 *   STRIPE_WEBHOOK_SECRET  whsec_…  from the webhook endpoint in Stripe
 *   STRIPE_PRICE_MONTHLY   price_…  RM9.90 / month, recurring
 *   STRIPE_PRICE_YEARLY    price_…  RM59.90 / year, recurring
 *
 * The prices live in Stripe; this code only knows their ids. KIDDO never
 * sends an amount to Stripe, so a typo here cannot charge the wrong sum —
 * Checkout fails instead.
 */

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_YEARLY,
  );
}

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client = new Stripe(key, { typescript: true });
  return client;
}

export function priceIds(): Record<Plan, string> {
  const monthly = process.env.STRIPE_PRICE_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_YEARLY;
  if (!monthly || !yearly) throw new Error("STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY are not set.");
  return { monthly, yearly };
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return secret;
}
