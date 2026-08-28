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

import { formatDay } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

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

/**
 * The same currency, as the three letters anything that is not a price on
 * screen wants: Stripe's own code for the prices in `src/server/stripe.ts`,
 * and the currency the conversion events carry (`src/lib/analytics`).
 */
export const CURRENCY_CODE = "MYR";

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
 * The words on a plan, in the language the reader is in.
 *
 * `PLANS` above stays exactly as it was — English, and the only place a
 * price is written down. What moves here is the half of a plan that is
 * *language* rather than *fact*: its name, its period, its badge and its
 * button. The amount, the formatted price and the plan key are the same
 * sentence in every language, and a translator can no more change RM59.90
 * than they can change which Stripe price it maps to.
 *
 * The default locale on this and the two functions below is what keeps the
 * existing billing tests meaningful: called the way they were always called,
 * these return the English they always returned.
 */
export interface PlanText {
  name: string;
  price: string;
  per: string;
  note: string | null;
  blurb: string;
  cta: string;
}

export function planText(plan: Plan, locale: Locale = DEFAULT_LOCALE): PlanText {
  return {
    name: translate(locale, `plan.${plan}.name`),
    price: PLANS[plan].price,
    per: translate(locale, `plan.${plan}.per`),
    /* Only the yearly plan has a badge, and "no badge" is an empty string in
       the catalogue rather than a missing key — a translator should see every
       row of the plan, including the one that is deliberately blank. */
    note: translate(locale, `plan.${plan}.note`) || null,
    blurb: translate(locale, `plan.${plan}.blurb`, { perMonth: YEARLY_PER_MONTH }),
    cta: translate(locale, `plan.${plan}.cta`),
  };
}

/**
 * The status as one word for the account area's chip. The sentence below
 * says what to do about it; this says what it is.
 */
export function statusLabel(
  state: SubscriptionState,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  switch (state.status) {
    case "active":
      if (!hasAccess(state, now)) return translate(locale, "billing.status.renewing");
      return translate(
        locale,
        state.cancelAtPeriodEnd ? "billing.status.ending" : "billing.status.active",
      );
    case "past_due":
      return translate(locale, "billing.status.past_due");
    case "incomplete":
      return translate(locale, "billing.status.incomplete");
    case "cancelled":
      return translate(locale, "billing.status.cancelled");
    case "expired":
      return translate(locale, "billing.status.expired");
    case "none":
      return translate(locale, "billing.status.none");
  }
}

/**
 * The sentence a parent reads on the billing card. Plain, never a code.
 *
 * Every branch is a whole sentence in the catalogue rather than English
 * fragments glued together, because the pieces do not survive translation in
 * the same order: "Yearly plan, RM59.90 a year" becomes "Pelan Tahunan,
 * RM59.90 setahun", where the period word has grown a prefix and the plan
 * name has moved behind its noun. A sentence a translator can see whole is a
 * sentence they can get right.
 */
export function describeSubscription(
  state: SubscriptionState,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const plan = state.plan ? planText(state.plan, locale) : null;
  const when = state.currentPeriodEnd ? formatDay(state.currentPeriodEnd, locale) : null;
  switch (state.status) {
    case "active":
      if (!hasAccess(state, now)) return translate(locale, "billing.describe.renewing");
      if (state.cancelAtPeriodEnd) {
        return when
          ? translate(locale, "billing.describe.endingOn", { when })
          : translate(locale, "billing.describe.ending");
      }
      if (plan) {
        const vars = { plan: plan.name, price: plan.price, per: plan.per };
        return when
          ? translate(locale, "billing.describe.planRenews", { ...vars, when })
          : translate(locale, "billing.describe.plan", vars);
      }
      return when
        ? translate(locale, "billing.describe.activeRenews", { when })
        : translate(locale, "billing.describe.active");
    case "past_due":
      return translate(locale, "billing.describe.past_due");
    case "incomplete":
      return translate(locale, "billing.describe.incomplete");
    case "cancelled":
      return when
        ? translate(locale, "billing.describe.endedOn", { when })
        : translate(locale, "billing.describe.ended");
    case "expired":
      return translate(locale, "billing.describe.ended");
    case "none":
      return translate(locale, "billing.describe.none");
  }
}
