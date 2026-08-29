/**
 * The two conversions KIDDO reports, and the once-only rule for the second.
 *
 * A page view tells a campaign that an advertisement was opened. It cannot
 * tell it which advertisement was opened by someone who then subscribed,
 * and that is the whole question an advertisement is bought to answer. So
 * two of Meta's standard events, on the two moments that matter:
 *
 *   InitiateCheckout  the parent has chosen a plan and is on their way to
 *                     Stripe. Reported before the redirect leaves, because
 *                     a navigation cancels a beacon still in flight — and
 *                     because what it records is the parent's decision, not
 *                     Stripe's answer.
 *   Purchase          the subscription the *server* wrote from Stripe's
 *                     webhook has opened KIDDO on `/welcome`. Never the
 *                     browser's own word for it: the same `hasAccess` that
 *                     decides whether a child may play decides whether a
 *                     purchase happened.
 *
 * Both carry the price of the plan and the plan's name, which is what an ad
 * platform optimises on. Neither carries anything about a person: no email
 * address, no account id, no child's name, no subscription id. Meta's
 * automatic collection is off (see `MetaPixel`), so what is written here is
 * exactly what is sent, and the privacy page says so in those words.
 *
 * `Purchase` is the one event that must not be sent twice. `/welcome` is a
 * page a parent can reload, bookmark or come back to, and the subscription
 * is still there each time. So it is reported once per Stripe subscription
 * per device, remembered in `localStorage`, and given an `eventID` derived
 * from that same subscription — so a second device, or a device whose
 * storage was cleared, is deduplicated by Meta rather than counted twice.
 */

import { AMOUNTS, CURRENCY_CODE, type Plan, type SubscriptionState } from "@/lib/billing/subscription";

import { isParentPage, META_PIXEL_ID } from "./meta";

/** What KIDDO sends. Meta's own names, because a campaign can only optimise
    for an event it already knows about. */
type Conversion = "InitiateCheckout" | "Purchase";

/** Which subscription's purchase this device has already reported. */
export const PURCHASE_KEY = "kiddo.meta.purchase.v1";

/**
 * The plan, as Meta reads a plan: a price, a currency and a name.
 *
 * `AMOUNTS` is in sen, the way Stripe holds money; Meta wants the ordinary
 * unit, so 990 becomes 9.9 with MYR beside it. The number is derived here
 * rather than typed, so a price change stays one integer in one file.
 */
function details(plan: Plan): Record<string, string | number> {
  return { value: AMOUNTS[plan] / 100, currency: CURRENCY_CODE, content_name: plan };
}

/**
 * Send one event, if this build and this page are allowed to send anything,
 * and say whether it actually went.
 *
 * The answer matters: a caller that remembers having reported something must
 * only remember it when it was reported.
 */
function send(event: Conversion, plan: Plan, eventId?: string): boolean {
  if (META_PIXEL_ID === null || typeof window === "undefined") return false;
  /* Fail closed, for the reason the tag itself does: an event may only leave
     a page the pixel is allowed on. Should a conversion ever be reported
     from somewhere new, it stops here instead of following. */
  if (!isParentPage(window.location.pathname)) return false;
  /* Undefined until the loader has run, and missing for good if something in
     the browser blocked it. Neither is an error worth making noise about. */
  if (!window.fbq) return false;

  const args: unknown[] = ["trackSingle", META_PIXEL_ID, event, details(plan)];
  if (eventId) args.push({ eventID: eventId });
  window.fbq(...args);
  return true;
}

/** The parent has chosen a plan and is on their way to Stripe. */
export function reportCheckoutStarted(plan: Plan): void {
  send("InitiateCheckout", plan);
}

/**
 * A call-to-action on the landing page was pressed.
 *
 * A custom event rather than one of Meta's standard ones, because none of
 * theirs mean "scrolled the pricing into view": `Lead` and `AddToCart` would
 * lie to a campaign optimising on them. What the funnel needs from this is
 * the step between a page view and `InitiateCheckout` — which button carried
 * the parent towards the plans, and from which section. `source` names the
 * button ("hero", "showcase", "why", "closing", "sticky", "pricing"); a press that
 * already chose a plan carries the plan's price the way the conversions do.
 *
 * Same gates as `send`: no pixel, no parent page, no beacon.
 */
export function reportCta(source: string, plan?: Plan): void {
  if (META_PIXEL_ID === null || typeof window === "undefined") return;
  if (!isParentPage(window.location.pathname)) return;
  if (!window.fbq) return;
  const data: Record<string, string | number> = plan
    ? { ...details(plan), source }
    : { source };
  window.fbq("trackSingleCustom", META_PIXEL_ID, "CTAClick", data);
}

/**
 * The payment landed: `state` is what the webhook wrote and what `hasAccess`
 * has just said yes to.
 *
 * Silent unless there is a subscription to name — an id is what makes the
 * event repeatable-proof, and without one the honest thing is to say
 * nothing. Silent, too, on the second and every later reading of the same
 * subscription, which is what a reload of `/welcome` is.
 */
export function reportPurchase(state: SubscriptionState): void {
  const plan = state.plan;
  const subscription = state.stripeSubscriptionId;
  if (!plan || !subscription) return;
  if (reportedPurchase() === subscription) return;
  /* Remembered only if the beacon actually left. With the tag still loading,
     or blocked, the purchase is worth another try on the next visit. */
  if (send("Purchase", plan, `purchase_${subscription}`)) rememberPurchase(subscription);
}

/** The subscription whose purchase has been reported from this device. */
function reportedPurchase(): string | null {
  try {
    return window.localStorage.getItem(PURCHASE_KEY);
  } catch {
    /* Storage turned off, or Safari in private mode. The `eventID` above is
       the other half of this guard and does not depend on the device, so the
       worst this costs is a second beacon that Meta throws away. */
    return null;
  }
}

function rememberPurchase(subscription: string): void {
  try {
    window.localStorage.setItem(PURCHASE_KEY, subscription);
  } catch {
    /* As above: the deduplication that matters is Meta's. */
  }
}
