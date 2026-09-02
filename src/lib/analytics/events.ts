/**
 * The two conversions KIDDO reports, and the once-only rule for the second.
 *
 * A page view tells a campaign that an advertisement was opened. It cannot
 * tell it which advertisement was opened by someone who then bought KIDDO,
 * and that is the whole question an advertisement is bought to answer. So
 * two of Meta's standard events, on the two moments that matter:
 *
 *   InitiateCheckout  the parent is on their way to Billplz. Reported
 *                     before the redirect leaves, because a navigation
 *                     cancels a beacon still in flight — and because what
 *                     it records is the parent's decision, not Billplz's
 *                     answer.
 *   Purchase          the lifetime access the *server* wrote, after asking
 *                     Billplz what really happened, has opened KIDDO on
 *                     `/welcome`. Never the browser's own word for it: the
 *                     same `hasAccess` that decides whether a child may
 *                     play decides whether a purchase happened.
 *
 * Both carry KIDDO's one price, which is what an ad platform optimises on.
 * Neither carries anything about a person: no email address, no account id,
 * no child's name, no bill id. Meta's automatic collection is off (see
 * `MetaPixel`), so what is written here is exactly what is sent, and the
 * privacy page says so in those words.
 *
 * `Purchase` is the one event that must not be sent twice. `/welcome` is a
 * page a parent can reload, bookmark or come back to, and the entitlement is
 * still there each time. So it is reported once per bill per device,
 * remembered in `localStorage`, and given an `eventID` derived from that same
 * bill — so a second device, or a device whose storage was cleared, is
 * deduplicated by Meta rather than counted twice. A parent buys once, so in
 * practice that id never changes again.
 */

import { CURRENCY_CODE, LIFETIME_AMOUNT, type Entitlement } from "@/lib/billing/access";

import { isParentPage, META_PIXEL_ID } from "./meta";

/** What KIDDO sends. Meta's own names, because a campaign can only optimise
    for an event it already knows about. */
type Conversion = "InitiateCheckout" | "Purchase";

/** Which purchase this device has already reported. */
export const PURCHASE_KEY = "kiddo.meta.purchase.v1";

/**
 * The offer, as Meta reads one: a price, a currency and a name.
 *
 * `LIFETIME_AMOUNT` is in sen, the way a payment gateway holds money; Meta
 * wants the ordinary unit, so 2990 becomes 29.9 with MYR beside it. The
 * number is derived here rather than typed, so a price change stays one
 * integer in one file.
 */
function details(): Record<string, string | number> {
  return { value: LIFETIME_AMOUNT / 100, currency: CURRENCY_CODE, content_name: "lifetime" };
}

/**
 * Send one event, if this build and this page are allowed to send anything,
 * and say whether it actually went.
 *
 * The answer matters: a caller that remembers having reported something must
 * only remember it when it was reported.
 */
function send(event: Conversion, eventId?: string): boolean {
  if (META_PIXEL_ID === null || typeof window === "undefined") return false;
  /* Fail closed, for the reason the tag itself does: an event may only leave
     a page the pixel is allowed on. Should a conversion ever be reported
     from somewhere new, it stops here instead of following. */
  if (!isParentPage(window.location.pathname)) return false;
  /* Undefined until the loader has run, and missing for good if something in
     the browser blocked it. Neither is an error worth making noise about. */
  if (!window.fbq) return false;

  const args: unknown[] = ["trackSingle", META_PIXEL_ID, event, details()];
  if (eventId) args.push({ eventID: eventId });
  window.fbq(...args);
  return true;
}

/** The parent is on their way to Billplz. */
export function reportCheckoutStarted(): void {
  send("InitiateCheckout");
}

/**
 * A call-to-action on the landing page was pressed.
 *
 * A custom event rather than one of Meta's standard ones, because none of
 * theirs mean "scrolled the pricing into view": `Lead` and `AddToCart` would
 * lie to a campaign optimising on them. What the funnel needs from this is
 * the step between a page view and `InitiateCheckout` — which button carried
 * the parent towards the offer, and from which section. `source` names the
 * button ("hero", "showcase", "why", "closing", "sticky", "pricing"); a press
 * on the offer itself carries the price the way the conversions do.
 *
 * Same gates as `send`: no pixel, no parent page, no beacon.
 */
export function reportCta(source: string, priced = false): void {
  if (META_PIXEL_ID === null || typeof window === "undefined") return;
  if (!isParentPage(window.location.pathname)) return;
  if (!window.fbq) return;
  const data: Record<string, string | number> = priced ? { ...details(), source } : { source };
  window.fbq("trackSingleCustom", META_PIXEL_ID, "CTAClick", data);
}

/**
 * The payment landed: `entitlement` is what the server wrote from Billplz's
 * own answer, and what `hasAccess` has just said yes to.
 *
 * Silent unless there is a bill to name — an id is what makes the event
 * repeat-proof, and without one the honest thing is to say nothing. Silent,
 * too, on the second and every later reading of the same bill, which is what
 * a reload of `/welcome` is.
 */
export function reportPurchase(entitlement: Entitlement): void {
  const bill = entitlement.access.billId;
  if (!entitlement.access.lifetime || !bill) return;
  if (reportedPurchase() === bill) return;
  /* Remembered only if the beacon actually left. With the tag still loading,
     or blocked, the purchase is worth another try on the next visit. */
  if (send("Purchase", `purchase_${bill}`)) rememberPurchase(bill);
}

/** The purchase this device has already reported. */
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

function rememberPurchase(bill: string): void {
  try {
    window.localStorage.setItem(PURCHASE_KEY, bill);
  } catch {
    /* As above: the deduplication that matters is Meta's. */
  }
}
