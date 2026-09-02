/**
 * The Stripe subscription, kept alive for the parents who already have one.
 *
 * KIDDO used to sell a monthly and a yearly plan. It does not any more —
 * there is one price, paid once, and `src/lib/billing/access.ts` is the
 * vocabulary for it. But subscriptions that were live on the day the shop
 * changed are still live in Stripe, and a parent who is paying must not
 * lose the product they are paying for. So this module survives, reduced
 * to the one job it still has:
 *
 *   read what the Stripe webhook wrote, and say whether it still opens KIDDO.
 *
 * What is deliberately gone: the plans, the prices, the per-month
 * arithmetic and every sentence a *buyer* would read. Nothing sells a
 * subscription any more, so nothing here describes one to a shopper. What
 * an existing subscriber sees in the account area is a status and a way
 * into Stripe's own portal to change or stop it — no price, because the
 * price they pay is the one Stripe already has and not one KIDDO should be
 * quoting back at them.
 *
 * No new code path writes any of this. See `docs/kiddo-billing.md`.
 */

import { formatDay } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

/** The two plans that were once for sale. Historical; read, never offered. */
export type Plan = "monthly" | "yearly";

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
 * Whether this legacy subscription still opens KIDDO. Only `active` counts
 * — and even then, if the paid period ended more than a day ago and no
 * renewal has been heard about, the answer is no: a stale "active" must
 * never outlive its payment.
 *
 * Callers ask `hasAccess` in `./access`, which consults this second and
 * only when there is no lifetime purchase.
 */
export function subscriptionActive(state: SubscriptionState | null | undefined, now: number): boolean {
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
    /* KIDDO sold no trials, so `trialing` cannot happen; if it ever did
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
 * How final a state is, for deciding same-second ties below. Higher wins:
 * an event that takes access away must never be undone by one that grants
 * it, when the two are indistinguishable by time.
 */
const FINALITY: Record<SubscriptionStatus, number> = {
  none: 0,
  incomplete: 1,
  active: 2,
  past_due: 3,
  cancelled: 4,
  expired: 5,
};

/** Status first, then a scheduled cancellation, as one comparable number. */
function finality(state: SubscriptionState): number {
  return FINALITY[state.status] * 2 + (state.cancelAtPeriodEnd ? 1 : 0);
}

/**
 * Stripe may deliver events twice and out of order, and it stamps them in
 * whole seconds. An event older than the one already applied is ignored.
 *
 * The same second is the interesting case, and it is not hypothetical:
 * cancelling a subscription produces `customer.subscription.updated` and
 * `customer.subscription.deleted` with the same `created`, and Stripe does
 * not promise which arrives first. Accepting whichever landed last — which
 * is what a plain `>=` on the timestamp did — meant a stale "still active"
 * update could follow the deletion and reopen access to an account that
 * had just been closed.
 *
 * So a tie is broken by the states themselves rather than by arrival:
 *  - the more final status wins, so a deletion beats a same-second update;
 *  - at equal status, a scheduled cancellation wins, so an update carrying
 *    `cancel_at_period_end` (or `cancel_at`) is not reverted by a plain
 *    active one from the same second.
 *
 * Two events describing the *same* state still tie, and a tie still applies:
 * writing the state that is already there is a no-op, and the webhook's
 * event-id claim has already turned away the genuine duplicates.
 */
export function isNewer(incoming: SubscriptionState, existing: SubscriptionState | null | undefined): boolean {
  if (!existing) return true;
  if (incoming.eventCreated !== existing.eventCreated) {
    return incoming.eventCreated > existing.eventCreated;
  }
  return finality(incoming) >= finality(existing);
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
 * The status as one word, for the row an existing subscriber still sees.
 *
 * No prices and no plan names: the sentence below says what is happening
 * and where to change it, and quoting a figure back at somebody whose card
 * Stripe is already charging would be a number KIDDO no longer owns.
 */
export function subscriptionLabel(
  state: SubscriptionState,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  switch (state.status) {
    case "active":
      if (!subscriptionActive(state, now)) return translate(locale, "legacy.status.renewing");
      return translate(locale, state.cancelAtPeriodEnd ? "legacy.status.ending" : "legacy.status.active");
    case "past_due":
      return translate(locale, "legacy.status.past_due");
    case "incomplete":
      return translate(locale, "legacy.status.incomplete");
    case "cancelled":
      return translate(locale, "legacy.status.cancelled");
    case "expired":
      return translate(locale, "legacy.status.expired");
    case "none":
      return translate(locale, "legacy.status.none");
  }
}

/** The sentence under it. Plain, never a code, and never a price. */
export function describeSubscription(
  state: SubscriptionState,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const when = state.currentPeriodEnd ? formatDay(state.currentPeriodEnd, locale) : null;
  switch (state.status) {
    case "active":
      if (!subscriptionActive(state, now)) return translate(locale, "legacy.describe.renewing");
      if (state.cancelAtPeriodEnd) {
        return when
          ? translate(locale, "legacy.describe.endingOn", { when })
          : translate(locale, "legacy.describe.ending");
      }
      return when
        ? translate(locale, "legacy.describe.activeRenews", { when })
        : translate(locale, "legacy.describe.active");
    case "past_due":
      return translate(locale, "legacy.describe.past_due");
    case "incomplete":
      return translate(locale, "legacy.describe.incomplete");
    case "cancelled":
      return when
        ? translate(locale, "legacy.describe.endedOn", { when })
        : translate(locale, "legacy.describe.ended");
    case "expired":
      return translate(locale, "legacy.describe.ended");
    case "none":
      return translate(locale, "legacy.describe.none");
  }
}
