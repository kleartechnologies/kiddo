/**
 * KIDDO's subscription, as one small state the whole product agrees on.
 *
 * Stripe is the billing authority; this module is the vocabulary. The
 * server (webhook) turns a Stripe subscription into a `SubscriptionState`
 * and writes it to `users/{uid}.subscription`; the client reads it back
 * and asks one question — `hasAccess` — to decide whether KIDDO is open.
 * Nothing here talks to the network, so every transition is unit-tested.
 *
 * There are exactly two plans. No free tier, no trial, no lifetime.
 */

export type Plan = "monthly" | "yearly";

/**
 * The prices, in one place.
 *
 * `AMOUNTS` is the only place a number is written down: everything a parent
 * reads — the price on a card, the "a month, billed yearly" line, the
 * saving on the annual plan — is derived from it, so changing a price is
 * changing one integer here (and the matching price in Stripe, which is
 * what actually charges the card; see `src/server/stripe.ts`).
 *
 * Amounts are in sen, the smallest unit of the Malaysian ringgit, the way
 * Stripe holds them: RM9.90 is 990.
 */
export const CURRENCY_SYMBOL = "RM";

export const AMOUNTS: Record<Plan, number> = {
  monthly: 990,
  yearly: 5990,
};

/** How many months one billing period of each plan covers. */
export const MONTHS: Record<Plan, number> = { monthly: 1, yearly: 12 };

/** An amount in sen as a parent reads it: 990 → "RM9.90". */
export function money(sen: number): string {
  return `${CURRENCY_SYMBOL}${(sen / 100).toFixed(2)}`;
}

/** What a year of the yearly plan works out at per month. */
export const YEARLY_PER_MONTH = money(Math.round(AMOUNTS.yearly / MONTHS.yearly));

/**
 * How much less a year on the yearly plan costs than twelve monthly ones,
 * as a whole percent. Arithmetic on the two amounts above — never a figure
 * typed into a marketing string.
 */
export const YEARLY_SAVING_PERCENT = Math.round(
  (1 - AMOUNTS.yearly / (AMOUNTS.monthly * MONTHS.yearly)) * 100,
);

export interface PlanDetail {
  /** What the plan is called on screen. */
  name: string;
  /** The amount charged each period, in sen. */
  amount: number;
  /** That amount as a parent reads it. */
  price: string;
  /** The period, for "RM9.90 a month". */
  per: string;
  /** The badge on the card, when there is one. */
  note: string | null;
  /** One line under the price. */
  blurb: string;
  /** The button that starts this plan. */
  cta: string;
}

export const PLANS: Record<Plan, PlanDetail> = {
  yearly: {
    name: "Yearly",
    amount: AMOUNTS.yearly,
    price: money(AMOUNTS.yearly),
    per: "year",
    note: "Best value",
    blurb: `${YEARLY_PER_MONTH} a month, billed once a year`,
    cta: "Start Yearly",
  },
  monthly: {
    name: "Monthly",
    amount: AMOUNTS.monthly,
    price: money(AMOUNTS.monthly),
    per: "month",
    note: null,
    blurb: "Flexible monthly access",
    cta: "Start Monthly",
  },
};

export const PLAN_ORDER: Plan[] = ["yearly", "monthly"];

export function isPlan(value: unknown): value is Plan {
  return value === "monthly" || value === "yearly";
}

/**
 * Every state KIDDO models, explicitly:
 *
 *  - `none`        never subscribed (no Stripe subscription exists)
 *  - `incomplete`  Checkout was completed but the first payment has not
 *                  been confirmed by Stripe yet — no access
 *  - `active`      paid up; the only state that opens KIDDO
 *  - `past_due`    a renewal payment failed and Stripe is retrying — no
 *                  access until it succeeds; the parent is told plainly
 *  - `cancelled`   cancelled and ended (Stripe `canceled`)
 *  - `expired`     ended without payment (Stripe `unpaid`,
 *                  `incomplete_expired`, `paused`)
 */
export type SubscriptionStatus = "none" | "incomplete" | "active" | "past_due" | "cancelled" | "expired";

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: Plan | null;
  /** Unix ms; when the paid period ends (renews, or ends if cancelling). */
  currentPeriodEnd: number | null;
  /** True when the parent has cancelled and access runs out at period end. */
  cancelAtPeriodEnd: boolean;
  /** Present once Checkout has created them. Never written by the client. */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** `event.created` (unix seconds) of the Stripe event that produced this. */
  eventCreated: number;
}

export const NO_SUBSCRIPTION: SubscriptionState = {
  status: "none",
  plan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  eventCreated: 0,
};

/** A day of tolerance for a renewal webhook that is late, not missing. */
const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Whether KIDDO is open. Only `active` counts — and even then, if the paid
 * period ended more than a day ago and no renewal has been heard about,
 * the answer is no: a stale "active" must never outlive its payment.
 */
export function hasAccess(state: SubscriptionState | null | undefined, now: number): boolean {
  if (!state || state.status !== "active") return false;
  if (state.currentPeriodEnd === null) return true;
  return now <= state.currentPeriodEnd + RENEWAL_GRACE_MS;
}

/** The Stripe statuses this module knows how to map. */
export type StripeStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/** The slice of a Stripe subscription the webhook reads. Shape, not SDK. */
export interface StripeSubscriptionLike {
  id: string;
  status: StripeStatus | (string & {});
  customer: string;
  cancel_at_period_end: boolean;
  /**
   * Unix seconds. Stripe ≥ 2026-07-29 records a Customer Portal
   * cancellation here and leaves `cancel_at_period_end` false, so both have
   * to be read to know a subscription is scheduled to end.
   */
  cancel_at?: number | null;
  /** Unix seconds. Stripe ≥ 2025 puts this on each item. */
  current_period_end?: number | null;
  items: { data: Array<{ price: { id: string }; current_period_end?: number | null }> };
}

export function statusFromStripe(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    /* KIDDO sells no trials, so `trialing` cannot happen; if it ever did
       (a trial granted by hand in the Stripe dashboard) it is paid-for
       access in every way that matters. */
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "incomplete":
      return "incomplete";
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "expired";
    default:
      /* A status this code has never heard of is never "active". */
      return "expired";
  }
}

/**
 * Turn a Stripe subscription into KIDDO's state. `prices` says which Stripe
 * price is which plan; a subscription on an unknown price has `plan: null`
 * (it still grants access if Stripe says it is active — it is a paid KIDDO
 * subscription created in the Stripe dashboard).
 */
export function stateFromStripe(
  sub: StripeSubscriptionLike,
  prices: Record<Plan, string>,
  eventCreated: number,
): SubscriptionState {
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan: Plan | null =
    priceId === prices.yearly ? "yearly" : priceId === prices.monthly ? "monthly" : null;
  const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
  return {
    status: statusFromStripe(sub.status),
    plan,
    currentPeriodEnd: periodEnd ? periodEnd * 1000 : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: sub.id,
    eventCreated,
  };
}

/**
 * Stripe may deliver events twice and out of order. An event older than the
 * one already applied is ignored; the same or newer wins.
 */
export function isNewer(incoming: SubscriptionState, existing: SubscriptionState | null | undefined): boolean {
  return !existing || incoming.eventCreated >= existing.eventCreated;
}

/** Read a state back from Firestore (or anywhere) without trusting it. */
export function parseSubscription(raw: unknown): SubscriptionState {
  if (!raw || typeof raw !== "object") return NO_SUBSCRIPTION;
  const r = raw as Record<string, unknown>;
  const status = r.status;
  const known: SubscriptionStatus[] = ["none", "incomplete", "active", "past_due", "cancelled", "expired"];
  return {
    status: known.includes(status as SubscriptionStatus) ? (status as SubscriptionStatus) : "none",
    plan: isPlan(r.plan) ? r.plan : null,
    currentPeriodEnd: typeof r.currentPeriodEnd === "number" ? r.currentPeriodEnd : null,
    cancelAtPeriodEnd: r.cancelAtPeriodEnd === true,
    stripeCustomerId: typeof r.stripeCustomerId === "string" ? r.stripeCustomerId : null,
    stripeSubscriptionId: typeof r.stripeSubscriptionId === "string" ? r.stripeSubscriptionId : null,
    eventCreated: typeof r.eventCreated === "number" ? r.eventCreated : 0,
  };
}

/**
 * The status as one word for the account area's chip. The sentence below
 * says what to do about it; this says what it is.
 */
export function statusLabel(state: SubscriptionState, now: number): string {
  switch (state.status) {
    case "active":
      if (!hasAccess(state, now)) return "Renewing";
      return state.cancelAtPeriodEnd ? "Ending" : "Active";
    case "past_due":
      return "Payment failed";
    case "incomplete":
      return "Confirming";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Ended";
    case "none":
      return "No subscription";
  }
}

/** The sentence a parent reads on the billing card. Plain, never a code. */
export function describeSubscription(state: SubscriptionState, now: number): string {
  const plan = state.plan ? PLANS[state.plan] : null;
  const when = state.currentPeriodEnd ? formatDay(state.currentPeriodEnd) : null;
  switch (state.status) {
    case "active":
      if (!hasAccess(state, now)) return "Your subscription is being renewed. If this takes more than a day, please check your payment details.";
      if (state.cancelAtPeriodEnd) return when ? `Cancelled. KIDDO stays open until ${when}.` : "Cancelled. KIDDO stays open until the end of the paid period.";
      return plan
        ? when ? `${plan.name} plan, ${plan.price} a ${plan.per}. Renews on ${when}.` : `${plan.name} plan, ${plan.price} a ${plan.per}.`
        : when ? `Active. Renews on ${when}.` : "Active.";
    case "past_due":
      return "The last payment didn’t go through, so KIDDO is paused. Update your payment details to carry on.";
    case "incomplete":
      return "Your payment is still being confirmed.";
    case "cancelled":
      return when ? `Your subscription ended on ${when}.` : "Your subscription has ended.";
    case "expired":
      return "Your subscription has ended.";
    case "none":
      return "No subscription yet.";
  }
}

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
}
