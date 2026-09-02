/**
 * What a parent bought, as one small state the whole product agrees on.
 *
 * KIDDO is a one-time purchase: RM29.90 at launch, once, forever. There is no plan to
 * choose, no period to renew, no date on which anything lapses. So this
 * module is deliberately smaller than the subscription vocabulary it
 * replaces — an entitlement is a boolean and the receipt that produced it.
 *
 * Billplz is the payment authority; this module is the vocabulary. The
 * server (the Billplz callback) writes `users/{uid}.access`; the client
 * reads it back and asks one question — `hasAccess` — to decide whether
 * KIDDO is open. Nothing here talks to the network, so every transition is
 * unit-tested.
 *
 * The second half of `hasAccess` is history. Parents who joined while KIDDO
 * sold a monthly and a yearly plan still have a live Stripe subscription,
 * and their access must not blink out because the shop changed. So an
 * entitlement is the lifetime purchase *or* a still-paid-up legacy
 * subscription, and `src/lib/billing/subscription.ts` is kept alive for
 * exactly that one job.
 */

import {
  NO_SUBSCRIPTION,
  parseSubscription,
  subscriptionActive,
  type SubscriptionState,
} from "./subscription";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

/** The price, in one place. Nothing else in `src/` may write a ringgit sum. */
export const CURRENCY_SYMBOL = "RM";

/** The same currency as the three letters an ad platform wants. */
export const CURRENCY_CODE = "MYR";

/**
 * The one amount that is charged, in sen — the smallest unit of the
 * Malaysian ringgit, and the unit Billplz bills in. RM29.90 is 2990, and
 * 2990 is the integer that goes over the wire in `src/server/billplz.ts`.
 */
export const LIFETIME_AMOUNT = 2990;

/** An amount in sen as a parent reads it: 2990 → "RM29.90". */
export function money(sen: number): string {
  return `${CURRENCY_SYMBOL}${(sen / 100).toFixed(2)}`;
}

/** The price on every card, button and bill. Derived, never typed. */
export const LIFETIME_PRICE = money(LIFETIME_AMOUNT);

/**
 * What KIDDO cost before the launch price, in sen. It exists to be shown
 * struck through beside `LIFETIME_PRICE`, so the launch discount reads as
 * a discount; it is never sent to Billplz and never charged. When the
 * launch price ends, fold it away rather than swapping the two numbers.
 */
export const ORIGINAL_AMOUNT = 3990;

/** The pre-launch price as a parent reads it, for the crossed-out label. */
export const ORIGINAL_PRICE = money(ORIGINAL_AMOUNT);

/**
 * Where an entitlement came from.
 *
 *  - `billplz`  a completed one-time purchase, the only way to get one now
 *  - `manual`   granted by hand in the console — a refund case, a gift, a
 *               parent whose payment landed somewhere the callback did not
 */
export type AccessSource = "billplz" | "manual";

export interface AccessState {
  /**
   * Whether KIDDO is bought. Permanent: there is no expiry field on this
   * interface on purpose, because there is no date on which it stops being
   * true.
   */
  lifetime: boolean;
  /** Unix ms, when the payment was confirmed. For the receipt line only. */
  grantedAt: number | null;
  source: AccessSource | null;
  /** The Billplz bill that paid for it. Never written by the client. */
  billId: string | null;
  /** What was actually paid, in sen, as Billplz reported it. */
  amount: number | null;
}

export const NO_ACCESS: AccessState = {
  lifetime: false,
  grantedAt: null,
  source: null,
  billId: null,
  amount: null,
};

/** Read an access record back from Firestore (or anywhere) without trusting it. */
export function parseAccess(raw: unknown): AccessState {
  if (!raw || typeof raw !== "object") return NO_ACCESS;
  const r = raw as Record<string, unknown>;
  const source = r.source;
  return {
    /* Strictly `true`. A truthy string or a 1 left by some other writer is
       not this field saying yes. */
    lifetime: r.lifetime === true,
    grantedAt: typeof r.grantedAt === "number" && Number.isFinite(r.grantedAt) ? r.grantedAt : null,
    source: source === "billplz" || source === "manual" ? source : null,
    billId: typeof r.billId === "string" && r.billId ? r.billId : null,
    amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : null,
  };
}

/**
 * Everything the server knows about whether KIDDO is open for one parent:
 * the lifetime purchase, and the Stripe subscription some parents still
 * have from before there was one.
 *
 * Both live on the same user document and arrive on the same snapshot, so
 * they travel together rather than as two watches racing each other.
 */
export interface Entitlement {
  access: AccessState;
  /** Legacy. Nothing new ever writes this; see `subscription.ts`. */
  subscription: SubscriptionState;
}

export const NO_ENTITLEMENT: Entitlement = {
  access: NO_ACCESS,
  subscription: NO_SUBSCRIPTION,
};

/** Read a whole user document's billing half without trusting any of it. */
export function parseEntitlement(raw: unknown): Entitlement {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { access: parseAccess(r.access), subscription: parseSubscription(r.subscription) };
}

/**
 * Whether KIDDO is open, right now.
 *
 * The lifetime purchase answers first and answers forever — no clock is
 * consulted, because nothing about it can go stale. Only when there is no
 * purchase does the legacy Stripe subscription get a say, and there the
 * old rules still apply in full: active, and not a stale active whose paid
 * period ran out days ago.
 */
export function hasAccess(entitlement: Entitlement | null | undefined, now: number): boolean {
  if (!entitlement) return false;
  if (entitlement.access.lifetime) return true;
  return subscriptionActive(entitlement.subscription, now);
}

/** Which of the two answers opened KIDDO, for the account area's wording. */
export function accessKind(
  entitlement: Entitlement | null | undefined,
  now: number,
): "lifetime" | "legacy-subscription" | "none" {
  if (!entitlement) return "none";
  if (entitlement.access.lifetime) return "lifetime";
  return subscriptionActive(entitlement.subscription, now) ? "legacy-subscription" : "none";
}

/**
 * The one word the account area puts in a chip. "Lifetime", never a status
 * that implies something could change.
 */
export function accessLabel(
  entitlement: Entitlement,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  switch (accessKind(entitlement, now)) {
    case "lifetime":
      return translate(locale, "access.label.lifetime");
    case "legacy-subscription":
      return translate(locale, "access.label.legacy");
    case "none":
      return translate(locale, "access.label.none");
  }
}

/**
 * The sentence a parent reads on the access card. Plain, never a code, and
 * for a lifetime purchase it says the thing that matters most about it: it
 * does not run out.
 */
export function describeAccess(
  entitlement: Entitlement,
  now: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  switch (accessKind(entitlement, now)) {
    case "lifetime": {
      /* The receipt says what this parent actually paid — a purchase made
         at the old price keeps saying the old price — and only falls back
         to today's price when no amount was recorded (a manual grant). */
      const paid = entitlement.access.amount;
      return translate(locale, "access.describe.lifetime", {
        price: typeof paid === "number" && paid > 0 ? money(paid) : LIFETIME_PRICE,
      });
    }
    case "legacy-subscription":
      return translate(locale, "access.describe.legacy");
    case "none":
      return translate(locale, "access.describe.none");
  }
}
