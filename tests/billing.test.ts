import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";

import Stripe from "stripe";

import {
  CURRENCY_CODE,
  LIFETIME_AMOUNT,
  LIFETIME_PRICE,
  NO_ACCESS,
  NO_ENTITLEMENT,
  ORIGINAL_AMOUNT,
  ORIGINAL_PRICE,
  accessKind,
  accessLabel,
  describeAccess,
  hasAccess,
  money,
  parseAccess,
  parseEntitlement,
  type Entitlement,
} from "@/lib/billing/access";
import {
  NO_SUBSCRIPTION,
  describeSubscription,
  isNewer,
  isPlan,
  parseSubscription,
  stateFromStripe,
  statusFromStripe,
  subscriptionLabel,
  type SubscriptionState,
} from "@/lib/billing/subscription";
import {
  __resetSessionForTests,
  checkResetLink,
  confirmPurchase,
  configureSession,
  createChildProfile,
  currentSession,
  deleteAccount,
  finishEmailVerification,
  finishPasswordReset,
  openBillingPortal,
  refreshUser,
  sendPasswordReset,
  sendVerification,
  sessionHasAccess,
  signIn,
  signUp,
  startPurchase,
} from "@/lib/cloud/session";
import { CloudError } from "@/lib/cloud/types";
import { LOCALES } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { currentJourney, __resetJourneyStoreForTests, recordCompleted } from "@/lib/journey/useJourney";
import { __resetChildNameStoreForTests } from "@/lib/profile/useChildName";
import { activitiesOf } from "@/lib/worlds/activities";

import { ACTIVE, FakeCloud, LEGACY, PAID, navigations, storage } from "./helpers/fakeCloud";

/**
 * The purchase, checked without Billplz, Stripe or Firebase.
 *
 * Four layers: the price and the entitlement (`@/lib/billing/access`), the
 * Billplz client's signature and settlement rules, the session store driving
 * the parent area through sign-in → gate → the trip to Billplz → the grant →
 * onboarding, and the legacy Stripe webhook, whose signature check runs the
 * real Stripe SDK against a locally signed payload.
 *
 * The property under all of it: a parent has access because a server asked
 * Billplz and was told the money arrived — never because a browser said so.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const PRICES = { monthly: "price_monthly_test", yearly: "price_yearly_test" };

/** An entitlement whose only claim is an old subscription in some state. */
const via = (state: SubscriptionState): Entitlement => ({ access: NO_ACCESS, subscription: state });

const stripeSub = (
  over: Partial<{ status: string; price: string; end: number; cancel: boolean; cancelAt: number | null }> = {},
) => ({
  id: "sub_1",
  status: over.status ?? "active",
  customer: "cus_1",
  cancel_at_period_end: over.cancel ?? false,
  cancel_at: over.cancelAt ?? null,
  items: { data: [{ price: { id: over.price ?? PRICES.yearly }, current_period_end: over.end ?? NOW / 1000 + 30 * 86400 }] },
});

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
  );
const SRC = new URL("../src", import.meta.url).pathname;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/* ---- The price --------------------------------------------------------- */

test("there is one thing to buy, at one price, and the price is an integer of sen", () => {
  assert.equal(LIFETIME_AMOUNT, 2990, "RM29.90 at launch, in the unit Billplz bills in");
  assert.ok(Number.isInteger(LIFETIME_AMOUNT), "sen, never ringgit with a fraction");
  assert.equal(money(2990), "RM29.90");
  assert.equal(LIFETIME_PRICE, "RM29.90");
  /* The pre-launch price is a label, not a charge: it is shown struck
     through, it must stay above the price actually billed, and nothing
     under src/server/ may ever read it. */
  assert.equal(ORIGINAL_AMOUNT, 3990, "RM39.90, the price the launch price is measured against");
  assert.equal(ORIGINAL_PRICE, "RM39.90");
  assert.ok(ORIGINAL_AMOUNT > LIFETIME_AMOUNT, "a launch price that saves nothing is not one");
  for (const file of walk(SRC)) {
    if (file.includes("/server/") || file.includes("/app/api/")) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /ORIGINAL_(AMOUNT|PRICE)/,
        `${file} reads the display-only price where money is handled`);
    }
  }
  assert.equal(CURRENCY_CODE, "MYR");
  assert.equal(money(0), "RM0.00");
  assert.equal(money(5), "RM0.05");
});

test("the offer names one price and never a plan, in both languages", () => {
  /* The words a parent buying KIDDO reads. Not a scan of source — a scan
     of the copy itself, in Malay first because that is the default. */
  const OFFER: MessageKey[] = [
    "offer.name", "offer.per", "offer.note", "offer.was", "offer.blurb", "offer.cta", "offer.ctaShort",
    "landing.pricing.eyebrow", "landing.pricing.title", "landing.pricing.body",
    "landing.pricing.included.1", "landing.pricing.included.2",
    "landing.pricing.included.3", "landing.pricing.included.4",
    "landing.pricing.footnote",
  ];
  const RECURRING = /monthly|yearly|annual|per month|per year|subscri|free trial|sebulan|setahun|langgan|percubaan/i;
  for (const locale of LOCALES) {
    for (const key of OFFER) {
      const copy = translate(locale, key, { price: LIFETIME_PRICE });
      assert.doesNotMatch(copy, RECURRING, `${locale} ${key}`);
      /* A renewal may be mentioned, and only ever to say there isn't one. */
      if (/renew|pembaharu/i.test(copy)) {
        assert.match(copy, /No renewal|Nothing renews|Tiada pembaharuan/i,
          `${locale} ${key} mentions renewal without denying it`);
      }
    }
  }

  /* Malay is the default, and it says the two things the offer must say. */
  assert.equal(translate("ms", "offer.cta", { price: LIFETIME_PRICE }), "Dapatkan KIDDO — RM29.90");
  assert.equal(translate("ms", "offer.ctaShort", { price: LIFETIME_PRICE }), "Dapatkan Akses — RM29.90");
  assert.equal(translate("en", "offer.cta", { price: LIFETIME_PRICE }), "Get KIDDO — RM29.90");
  assert.equal(translate("ms", "offer.note"), "Harga Pelancaran");
  assert.equal(translate("ms", "offer.was", { price: ORIGINAL_PRICE }), "Harga asal RM39.90.");
  assert.equal(translate("ms", "offer.name"), "Akses Seumur Hidup");
  assert.match(translate("ms", "offer.blurb"), /tiada pembaharuan/i, "no renewal, said out loud");
  assert.match(translate("en", "offer.blurb"), /no renewal, nothing to cancel/);

  /* And the card offers exactly one thing to press. */
  const pricing = read("../src/components/landing/Pricing.tsx");
  assert.deepEqual(pricing.match(/data-pricing-offer="[^"]*"/g), ['data-pricing-offer="lifetime"']);
  assert.deepEqual(pricing.match(/data-pricing-cta="[^"]*"/g), ['data-pricing-cta="lifetime"']);
  assert.match(pricing, /\{LIFETIME_PRICE\}/, "the price is read, not typed");
});

test("the browser names neither a plan nor an amount when it asks for a bill", () => {
  const create = read("../src/app/api/billing/billplz/create/route.ts");
  assert.doesNotMatch(create, /body\.plan|body\.amount|body\.price|isPlan/, "no plan and no price from the browser");
  assert.match(create, /amount: LIFETIME_AMOUNT/, "the amount comes from this server's own code");
  assert.match(create, /const DESCRIPTION = "KIDDO Lifetime Access";/);
  /* The only thing the body may carry is where to come back to. */
  assert.deepEqual([...new Set(create.match(/\bbody\.[A-Za-z_$][\w$]*/g) ?? [])], ["body.returnTo"]);

  /* The store asks for a bill without offering a choice either. */
  const session = read("../src/lib/cloud/session.ts");
  assert.match(session, /export async function startPurchase\(returnTo = "\/welcome"\)/);
  assert.doesNotMatch(session, /plan: |Plan\b/);
});

test("changing the price means changing one file: nothing else writes an amount", () => {
  for (const file of walk(SRC)) {
    if (file.endsWith("/lib/billing/access.ts")) continue;
    /* Comments may name a price; a rendered string may not. */
    const visible = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(visible, /RM\s?\d/, `${file} hardcodes a price instead of reading LIFETIME_PRICE`);
  }
});

/* ---- The entitlement --------------------------------------------------- */

test("an entitlement is read back from the cloud without trusting a field of it", () => {
  assert.deepEqual(parseAccess(undefined), NO_ACCESS);
  assert.deepEqual(parseAccess("lifetime"), NO_ACCESS);
  assert.deepEqual(parseAccess([]), NO_ACCESS);
  /* Strictly `true`. Anything else another writer might leave behind is not
     this field saying yes. */
  for (const truthy of ["true", 1, "yes", {}]) {
    assert.equal(parseAccess({ lifetime: truthy }).lifetime, false, `${JSON.stringify(truthy)} opened KIDDO`);
  }
  const ok = parseAccess({ lifetime: true, grantedAt: NOW, source: "billplz", billId: "bill_1", amount: 3990, extra: "x" });
  assert.deepEqual(ok, { lifetime: true, grantedAt: NOW, source: "billplz", billId: "bill_1", amount: 3990 });
  assert.equal(parseAccess({ lifetime: true, source: "wishful" }).source, null, "an unknown source is not honoured");
  assert.equal(parseAccess({ lifetime: true, grantedAt: "today" }).grantedAt, null);
  assert.equal(parseAccess({ lifetime: true, billId: "" }).billId, null);

  /* And the two halves of a user document travel together. */
  assert.deepEqual(parseEntitlement(undefined), NO_ENTITLEMENT);
  const both = parseEntitlement({ access: { lifetime: true }, subscription: ACTIVE });
  assert.equal(both.access.lifetime, true);
  assert.equal(both.subscription.status, "active");
});

test("a lifetime purchase opens KIDDO forever; no clock is consulted", () => {
  assert.equal(hasAccess(PAID, NOW), true);
  assert.equal(hasAccess(PAID, NOW + 100 * 365 * DAY), true, "there is no date on which it stops being true");
  assert.equal(hasAccess(PAID, 0), true);
  assert.equal(hasAccess(NO_ENTITLEMENT, NOW), false);
  assert.equal(hasAccess(null, NOW), false);
  assert.equal(hasAccess(undefined, NOW), false);
  assert.equal(accessKind(PAID, NOW), "lifetime");
  assert.equal(accessKind(NO_ENTITLEMENT, NOW), "none");
  /* Nothing on the interface can expire it, which is the point of it. */
  assert.deepEqual(Object.keys(PAID.access).sort(), ["amount", "billId", "grantedAt", "lifetime", "source"]);
});

test("a parent who subscribed before the change still gets in, and is described as such", () => {
  assert.equal(hasAccess(LEGACY, NOW), true);
  assert.equal(accessKind(LEGACY, NOW), "legacy-subscription");
  assert.equal(hasAccess(via({ ...ACTIVE, status: "past_due" }), NOW), false);
  assert.equal(hasAccess(via({ ...ACTIVE, status: "cancelled" }), NOW), false);
  assert.equal(hasAccess(via({ ...ACTIVE, status: "expired" }), NOW), false);
  assert.equal(hasAccess(via({ ...ACTIVE, status: "incomplete" }), NOW), false);
  assert.equal(hasAccess(via(NO_SUBSCRIPTION), NOW), false);

  /* A lapsed subscription plus a purchase is still open — the purchase
     answers first and the subscription is never consulted. */
  const bought = { access: PAID.access, subscription: { ...ACTIVE, status: "expired" as const } };
  assert.equal(hasAccess(bought, NOW), true);
  assert.equal(accessKind(bought, NOW), "lifetime");
});

test("a stale active subscription stops opening KIDDO a day after its period ended", () => {
  const ending = via({ ...ACTIVE, currentPeriodEnd: NOW });
  assert.equal(hasAccess(ending, NOW - 1), true);
  assert.equal(hasAccess(ending, NOW + DAY - 1), true, "a late renewal webhook gets a day");
  assert.equal(hasAccess(ending, NOW + DAY + 1), false);
  assert.equal(hasAccess(via({ ...ACTIVE, currentPeriodEnd: null }), NOW + 400 * DAY), true, "no period end: trust the status");
});

test("the account card says what was bought, in words, and never a renewal date", () => {
  assert.equal(accessLabel(PAID, NOW, "en"), "Lifetime access");
  assert.equal(accessLabel(LEGACY, NOW, "en"), "Subscription");
  assert.equal(accessLabel(NO_ENTITLEMENT, NOW, "en"), "Not bought yet");

  const bought = describeAccess(PAID, NOW, "en");
  assert.match(bought, /RM29\.90/);
  assert.match(bought, /no renewal date and nothing to cancel/);
  /* The receipt is the parent's, not today's: a purchase recorded at the
     old price keeps saying the old price, and a manual grant with no
     recorded amount falls back to the price on the card. */
  const early = { ...PAID, access: { ...PAID.access, amount: ORIGINAL_AMOUNT } };
  assert.match(describeAccess(early, NOW, "en"), /RM39\.90/);
  const manual = { ...PAID, access: { ...PAID.access, amount: null, source: "manual" as const, billId: null } };
  assert.match(describeAccess(manual, NOW, "en"), /RM29\.90/);
  assert.doesNotMatch(bought, /month|year|renew\w*\s+on|next payment/i);
  assert.match(describeAccess(LEGACY, NOW, "en"), /subscribed before KIDDO became a one-time purchase/);
  assert.equal(describeAccess(NO_ENTITLEMENT, NOW, "en"), "KIDDO isn’t open yet.");

  for (const locale of ["en", "ms"] as const) {
    for (const state of [PAID, LEGACY, NO_ENTITLEMENT]) {
      assert.doesNotMatch(describeAccess(state, NOW, locale), /[a-z]+_[a-z]+|null|undefined/, "never a code");
    }
  }
});

/* ---- The legacy subscription model ------------------------------------- */

test("the old subscription vocabulary still reads every state it ever wrote", () => {
  assert.equal(subscriptionLabel(ACTIVE, NOW, "en"), "Active");
  assert.equal(subscriptionLabel({ ...ACTIVE, cancelAtPeriodEnd: true }, NOW, "en"), "Ending");
  assert.equal(subscriptionLabel({ ...ACTIVE, currentPeriodEnd: NOW - 30 * DAY }, NOW, "en"), "Renewing", "an active row whose period ran out long ago is waiting on Stripe, not failing");
  assert.equal(subscriptionLabel({ ...ACTIVE, status: "past_due" }, NOW, "en"), "Payment failed");
  assert.equal(subscriptionLabel({ ...ACTIVE, status: "incomplete" }, NOW, "en"), "Confirming");
  assert.equal(subscriptionLabel({ ...ACTIVE, status: "cancelled" }, NOW, "en"), "Cancelled");
  assert.equal(subscriptionLabel({ ...ACTIVE, status: "expired" }, NOW, "en"), "Ended");
  assert.equal(subscriptionLabel(NO_SUBSCRIPTION, NOW, "en"), "No subscription");
  assert.ok(isPlan("monthly") && isPlan("yearly"));
  assert.ok(!isPlan("lifetime") && !isPlan(""), "nothing new is a plan");
});

test("every Stripe status maps to an explicit KIDDO state, and only active opens KIDDO", () => {
  assert.equal(statusFromStripe("active"), "active");
  assert.equal(statusFromStripe("trialing"), "active");
  assert.equal(statusFromStripe("past_due"), "past_due");
  assert.equal(statusFromStripe("canceled"), "cancelled");
  assert.equal(statusFromStripe("incomplete"), "incomplete");
  assert.equal(statusFromStripe("incomplete_expired"), "expired");
  assert.equal(statusFromStripe("unpaid"), "expired");
  assert.equal(statusFromStripe("paused"), "expired");
  assert.equal(statusFromStripe("something_new"), "expired", "unknown statuses never grant access");
  const at = (status: SubscriptionState["status"]) => hasAccess(via({ ...ACTIVE, status }), NOW);
  assert.equal(at("active"), true);
  for (const shut of ["past_due", "cancelled", "expired", "incomplete", "none"] as const) {
    assert.equal(at(shut), false, shut);
  }
});

test("a Stripe subscription becomes KIDDO state with the plan resolved from the price id", () => {
  const yearly = stateFromStripe(stripeSub(), PRICES, 1000);
  assert.equal(yearly.plan, "yearly");
  assert.equal(yearly.status, "active");
  assert.equal(yearly.stripeCustomerId, "cus_1");
  assert.equal(yearly.stripeSubscriptionId, "sub_1");
  assert.equal(yearly.currentPeriodEnd, (NOW / 1000 + 30 * 86400) * 1000);
  assert.equal(yearly.eventCreated, 1000);
  assert.equal(hasAccess(via(yearly), NOW), true);

  const monthly = stateFromStripe(stripeSub({ price: PRICES.monthly }), PRICES, 1000);
  assert.equal(monthly.plan, "monthly");

  const unknown = stateFromStripe(stripeSub({ price: "price_other" }), PRICES, 1000);
  assert.equal(unknown.plan, null, "an unknown price is not guessed into a plan");

  const cancelling = stateFromStripe(stripeSub({ cancel: true }), PRICES, 1000);
  assert.equal(cancelling.cancelAtPeriodEnd, true);
  assert.equal(hasAccess(via(cancelling), NOW), true, "cancelled-at-period-end stays open until then");

  const ended = stateFromStripe(stripeSub({ status: "canceled" }), PRICES, 1000);
  assert.equal(ended.status, "cancelled");
  assert.equal(hasAccess(via(ended), NOW), false);
});

test("a cancellation is read as cancel-at-period-end however Stripe words it", () => {
  const END = NOW / 1000 + 30 * 86400;

  /* Stripe API 2026-07-29.dahlia: cancelling in the Customer Portal leaves
     `cancel_at_period_end` false and records the scheduled end in
     `cancel_at`. Reading only the flag tells a parent who has just
     cancelled that their plan renews — which is the one thing it will not
     do. Verified against a real test-mode portal cancellation. */
  const portal = stateFromStripe(stripeSub({ cancelAt: END }), PRICES, 1000);
  assert.equal(portal.cancelAtPeriodEnd, true);
  assert.equal(portal.status, "active", "Stripe still calls it active until the period ends");
  assert.equal(subscriptionLabel(portal, NOW, "en"), "Ending");
  assert.match(describeSubscription(portal, NOW, "en"), /^Cancelled\. KIDDO stays open until /);

  /* The older shape means the same thing and still reads the same way. */
  assert.equal(stateFromStripe(stripeSub({ cancel: true }), PRICES, 1000).cancelAtPeriodEnd, true);
  assert.equal(
    stateFromStripe(stripeSub({ cancel: true, cancelAt: null }), PRICES, 1000).cancelAtPeriodEnd,
    true,
  );

  /* Neither set: a subscription that really is renewing is left alone. */
  const renewing = stateFromStripe(stripeSub(), PRICES, 1000);
  assert.equal(renewing.cancelAtPeriodEnd, false);
  assert.equal(subscriptionLabel(renewing, NOW, "en"), "Active");
  assert.match(describeSubscription(renewing, NOW, "en"), /Renews on /);
  assert.deepEqual(
    { ...portal, cancelAtPeriodEnd: false },
    renewing,
    "a scheduled cancellation changes that one field and nothing else",
  );

  /* One Stripe has already ended still maps by its status alone. */
  const ended = stateFromStripe(stripeSub({ status: "canceled", cancelAt: END }), PRICES, 1000);
  assert.equal(ended.status, "cancelled");
  assert.equal(subscriptionLabel(ended, NOW, "en"), "Cancelled");

  /* Access is decided by status and period end. This flag never moves it. */
  assert.equal(hasAccess(via(portal), NOW), true, "cancelling keeps KIDDO open until the period ends");
  assert.equal(hasAccess(via(portal), NOW + 32 * DAY), false, "and closed after it, grace included");
  assert.equal(hasAccess(via(ended), NOW), false);
});

test("out-of-order and duplicate events never roll the state backwards", () => {
  const older = stateFromStripe(stripeSub({ status: "active" }), PRICES, 1000);
  const newer = stateFromStripe(stripeSub({ status: "canceled" }), PRICES, 2000);
  assert.equal(isNewer(newer, older), true);
  assert.equal(isNewer(older, newer), false, "a late 'active' cannot undo a cancellation");
  assert.equal(isNewer(older, older), true, "the same event applied twice is harmless");
  assert.equal(isNewer(older, null), true);
});

test("a subscription read back from the cloud is parsed defensively", () => {
  assert.deepEqual(parseSubscription(undefined), NO_SUBSCRIPTION);
  assert.deepEqual(parseSubscription("active"), NO_SUBSCRIPTION);
  assert.equal(parseSubscription({ status: "vip" }).status, "none");
  assert.equal(parseSubscription({ status: "active", plan: "lifetime" }).plan, null);
  assert.equal(parseSubscription({ status: "active", currentPeriodEnd: "soon" }).currentPeriodEnd, null);
  const ok = parseSubscription({ ...ACTIVE, updatedAt: 5, extra: true });
  assert.equal(ok.status, "active");
  assert.equal(ok.plan, "yearly");
  assert.ok(!("extra" in ok));
});

/* ---- The Billplz client ------------------------------------------------ */

const billplz = await import("@/server/billplz");

const BILL = {
  id: "bill_1",
  collection_id: "coll_kiddo",
  paid: true,
  state: "paid",
  amount: LIFETIME_AMOUNT,
  paid_amount: LIFETIME_AMOUNT,
  email: "p@example.com",
  name: "p",
  url: "https://www.billplz-sandbox.com/bills/bill_1",
  paid_at: "2026-09-02 10:00:00 +0800",
  reference_1: "uid-1",
  reference_1_label: "KIDDO account",
};

test("sandbox is the default: only the exact word production sends a parent to real money", () => {
  const before = process.env.BILLPLZ_MODE;
  for (const mode of [undefined, "", "sandbox", "Production", "PRODUCTION", "prod", "live", "true"]) {
    if (mode === undefined) delete process.env.BILLPLZ_MODE;
    else process.env.BILLPLZ_MODE = mode;
    assert.equal(billplz.billplzMode(), "sandbox", `${String(mode)} must not mean live`);
    assert.equal(billplz.billplzBase(), "https://www.billplz-sandbox.com/api/");
  }
  process.env.BILLPLZ_MODE = "production";
  assert.equal(billplz.billplzMode(), "production");
  assert.equal(billplz.billplzBase(), "https://www.billplz.com/api/");
  if (before === undefined) delete process.env.BILLPLZ_MODE;
  else process.env.BILLPLZ_MODE = before;
});

test("a bill only settles when Billplz says paid, in KIDDO's collection, for the full amount", () => {
  const before = process.env.BILLPLZ_COLLECTION_ID;
  process.env.BILLPLZ_COLLECTION_ID = "coll_kiddo";

  assert.equal(billplz.billIsSettled(BILL, LIFETIME_AMOUNT), true);
  assert.equal(billplz.billIsSettled({ ...BILL, paid: false }, LIFETIME_AMOUNT), false);
  assert.equal(billplz.billIsSettled({ ...BILL, state: "due" }, LIFETIME_AMOUNT), false, "paid:true with a due state is not paid");
  assert.equal(billplz.billIsSettled({ ...BILL, paid_amount: LIFETIME_AMOUNT - 1 }, LIFETIME_AMOUNT), false, "one sen short is short");
  assert.equal(billplz.billIsSettled({ ...BILL, paid_amount: LIFETIME_AMOUNT + 10 }, LIFETIME_AMOUNT), true, "overpaying is not a reason to refuse");
  /* The secret key can read every bill on the account, so a bill belonging
     to some other product must not open KIDDO. */
  assert.equal(billplz.billIsSettled({ ...BILL, collection_id: "coll_other" }, LIFETIME_AMOUNT), false);

  if (before === undefined) delete process.env.BILLPLZ_COLLECTION_ID;
  else process.env.BILLPLZ_COLLECTION_ID = before;
});

test("the X-Signature is checked the way Billplz computes it, and every wrong answer is a no", () => {
  const key = "xsig_test_key";
  const fields = { id: "bill_1", paid: "true", paid_amount: "3990", state: "paid" };

  /* Every parameter but the signature, `key` immediately followed by
     `value`, sorted by key, joined with `|`. */
  assert.equal(billplz.sourceString(fields), "idbill_1|paidtrue|paid_amount3990|statepaid");
  assert.equal(
    billplz.sourceString({ ...fields, x_signature: "whatever" }),
    billplz.sourceString(fields),
    "the signature is never part of what it signs",
  );

  const signature = billplz.sign(fields, key);
  assert.match(signature, /^[0-9a-f]{64}$/, "HMAC-SHA256, hex");
  assert.equal(billplz.verifySignature(fields, signature, key), true);
  assert.equal(billplz.verifySignature(fields, signature, "another_key"), false);
  assert.equal(billplz.verifySignature({ ...fields, paid_amount: "1" }, signature, key), false, "a tampered field");
  assert.equal(billplz.verifySignature(fields, undefined, key), false);
  assert.equal(billplz.verifySignature(fields, "", key), false);
  assert.equal(billplz.verifySignature(fields, "deadbeef", key), false, "a short answer must not throw");
  assert.equal(billplz.verifySignature(fields, signature.toUpperCase(), key), false, "hex is compared as bytes");

  /* The redirect spells the same fields `billplz[id]`; one implementation
     covers both because the keys are flattened first. */
  const params = new URLSearchParams("billplz[id]=bill_1&billplz[paid]=true&other=ignored");
  assert.deepEqual(billplz.billplzRedirectFields(params), { billplzid: "bill_1", billplzpaid: "true" });
});

/* ---- The session ------------------------------------------------------- */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
let cloud: FakeCloud;
const [apples] = activitiesOf("counting");

async function boot() {
  configureSession(() => Promise.resolve(cloud));
  await settle();
}

beforeEach(() => {
  storage.clear();
  navigations.length = 0;
  __resetSessionForTests();
  __resetJourneyStoreForTests();
  __resetChildNameStoreForTests();
  cloud = new FakeCloud();
  cloud.autoGrant = false;
});

test("a new parent lands on the offer before onboarding, with no access", async () => {
  await boot();
  assert.equal(await signUp("p@example.com", "secret1"), null);
  await settle();
  const s = currentSession();
  assert.equal(s.status, "needs-purchase");
  assert.equal(s.entitlement?.access.lifetime, false);
  assert.equal(sessionHasAccess(), false);
  assert.equal(s.child, null, "the child is not asked for until KIDDO is paid for");
});

test("buying asks the server for a bill and goes there; nothing changes until the server is told the money arrived", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(await startPurchase("/welcome"), null);
  assert.deepEqual(cloud.bills, [{ id: "bill_1", uid: "uid-1", returnTo: "/welcome", paid: false }]);
  assert.deepEqual(navigations, ["https://www.billplz-sandbox.test/bills/bill_1"]);

  /* Being sent to Billplz grants nothing. */
  assert.equal(currentSession().status, "needs-purchase");
  assert.equal(sessionHasAccess(), false);

  /* Nor does coming back. The browser's return leg has no authority: the
     bill is unpaid, so the server's answer is no. */
  assert.equal(await confirmPurchase("bill_1"), false, "the redirect alone must never open KIDDO");
  await settle();
  assert.equal(sessionHasAccess(), false);

  /* The parent actually pays; the callback asks Billplz and writes. */
  cloud.payBill("bill_1");
  assert.equal(cloud.deliverCallback("bill_1"), true);
  await settle();
  assert.equal(currentSession().status, "needs-child");
  assert.equal(currentSession().entitlement?.access.lifetime, true);
  assert.equal(currentSession().entitlement?.access.billId, "bill_1");
  assert.equal(sessionHasAccess(), true);
  assert.equal(await createChildProfile("Mia"), "Mia");
  await settle();
  assert.equal(currentSession().status, "ready");
});

test("the browser's return leg grants access only on the same evidence the callback needs", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await startPurchase("/welcome");
  cloud.payBill("bill_1");

  /* No callback has arrived; the parent is back from Billplz first. The
     answer still comes from the server re-reading the bill. */
  assert.equal(await confirmPurchase("bill_1"), true);
  await settle();
  assert.equal(sessionHasAccess(), true);

  /* A bill id that is not this parent's is answered the same way as one
     that does not exist, so ids cannot be fished for. */
  assert.equal(await confirmPurchase("bill_nope"), false);
  cloud.bills.push({ id: "bill_other", uid: "uid-2", returnTo: "/welcome", paid: true });
  assert.equal(await confirmPurchase("bill_other"), false, "somebody else's paid bill is not yours");
});

test("a callback delivered twice grants once, and a second bill cannot be paid for", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await startPurchase("/welcome");
  cloud.payBill("bill_1");

  const seen: boolean[] = [];
  const stop = cloud.watchEntitlement("uid-1", (state) => seen.push(state.access.lifetime));
  await settle();

  cloud.deliverCallback("bill_1");
  cloud.deliverCallback("bill_1");
  cloud.deliverCallback("bill_1");
  await confirmPurchase("bill_1");
  await settle();

  assert.deepEqual(seen, [false, true], "one write, however many times KIDDO is told");
  assert.equal(currentSession().entitlement?.access.billId, "bill_1");
  assert.equal(sessionHasAccess(), true);
  stop();
});

test("a failed request for a bill is a reason, not a crash, and the offer stays", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  cloud.purchaseAnswer = new CloudError("billing-unavailable", "503");
  assert.equal(await startPurchase(), "billing-unavailable");
  cloud.purchaseAnswer = new CloudError("offline");
  assert.equal(await startPurchase(), "offline");
  assert.equal(navigations.length, 0);
  assert.equal(currentSession().status, "needs-purchase");

  /* And giving up at the bank leaves them exactly where they were, with
     no error state and nothing to undo. */
  cloud.purchaseAnswer = null;
  assert.equal(await startPurchase("/welcome"), null);
  assert.equal(currentSession().status, "needs-purchase");
  assert.equal(sessionHasAccess(), false);
  assert.equal(await startPurchase("/welcome"), null, "they can simply try again");
  assert.equal(cloud.bills.length, 2, "two bills, and at most one of them will ever be paid");
});

test("a returning parent who owns KIDDO goes straight through", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.entitlements.set("uid-1", PAID);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(currentSession().status, "ready");
  assert.equal(sessionHasAccess(), true);
});

test("a legacy subscriber is let in, and their lapsing closes the gate without touching the child's data", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.entitlements.set("uid-1", LEGACY);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(currentSession().status, "ready");
  assert.equal(sessionHasAccess(), true);

  recordCompleted(apples.id);
  await settle();
  assert.ok(cloud.journeys.get("child-1")?.completed.includes(apples.id));

  cloud.setEntitlement("uid-1", via({ ...ACTIVE, status: "past_due", eventCreated: ACTIVE.eventCreated + 1 }));
  await settle();
  const s = currentSession();
  assert.equal(s.status, "ready", "the session keeps its child; the gate is a rendering decision");
  assert.equal(sessionHasAccess(s), false);
  assert.ok(currentJourney().completed.includes(apples.id), "the child's progress is still there");
  assert.equal(cloud.children.size, 1, "nothing is deleted because a payment failed");

  /* They buy KIDDO outright instead of fixing the card. */
  cloud.setEntitlement("uid-1", { ...PAID, subscription: { ...ACTIVE, status: "past_due" } });
  await settle();
  assert.equal(sessionHasAccess(), true);
  assert.equal(currentSession().status, "ready");
});

test("the Customer Portal is opened through the server for the signed-in parent only", async () => {
  await boot();
  assert.equal(await openBillingPortal(), "unknown", "nobody signed in");
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(await openBillingPortal("/parents"), null);
  assert.equal(navigations[0], "https://billing.stripe.test/portal?return=%2Fparents");
  cloud.portalAnswer = new CloudError("offline");
  assert.equal(await openBillingPortal(), "offline");
});

/* ---- Password reset and email verification ---------------------------- */

test("forgot password sends a reset email; an unknown address is not distinguishable", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  await boot();
  assert.equal(await sendPasswordReset("p@example.com"), null);
  assert.deepEqual(cloud.resetEmails, ["p@example.com"]);
  assert.equal(await sendPasswordReset("nobody@example.com"), "no-account", "the store reports it; AuthCard hides it");
  assert.match(read("../src/components/account/AuthCard.tsx"), /failure !== "no-account"/, "AuthCard shows the same sentence whether or not the account exists");
});

test("a reset link is checked, then the new password is set, and the link is spent", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  await boot();
  await sendPasswordReset("p@example.com");
  assert.deepEqual(await checkResetLink("code-1"), { email: "p@example.com" });
  assert.deepEqual(await checkResetLink("code-nope"), { failure: "bad-link" });
  assert.equal(await finishPasswordReset("code-1", "123"), "weak-password");
  assert.equal(await finishPasswordReset("code-1", "newpass1"), null);
  assert.equal(await finishPasswordReset("code-1", "newpass2"), "bad-link", "a used link does not work twice");
  assert.equal(await signIn("p@example.com", "secret1"), "wrong-password");
  assert.equal(await signIn("p@example.com", "newpass1"), null);
});

test("email verification: unverified after sign-up, resend, verify by link, refresh", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(currentSession().user?.emailVerified, false);
  assert.equal(await sendVerification(), null);
  assert.deepEqual(cloud.verificationEmails, ["p@example.com"]);
  assert.equal(await refreshUser(), false, "not verified until the link is used");
  assert.equal(await finishEmailVerification("verify-nope"), "bad-link");
  assert.equal(await finishEmailVerification("verify-1"), null);
  assert.equal(currentSession().user?.emailVerified, true);
  assert.equal(await refreshUser(), true);
});

/* ---- Deletion ---------------------------------------------------------- */

test("deleting the account removes the entitlement along with everything else, and says so first", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.entitlements.set("uid-1", PAID);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(await deleteAccount(), null);
  assert.deepEqual(cloud.deleted, ["uid-1"]);
  assert.equal(cloud.entitlements.has("uid-1"), false);
  assert.equal(cloud.children.size, 0);
  assert.equal(currentSession().status, "signed-out");
  assert.equal(currentSession().entitlement, null);

  /* `access` lives on the user document, so deletion ends a purchase that
     cannot be bought back. A parent must read that before they press it. */
  const en = read("../src/lib/i18n/messages/en.ts");
  const ms = read("../src/lib/i18n/messages/ms.ts");
  assert.match(en, /the access you paid for — it cannot be given back, and there is no refund/);
  assert.match(ms, /akses yang anda telah bayar — ia tidak boleh dikembalikan dan tiada bayaran balik/);
  assert.match(en, /"account\.delete\.body"/);
  assert.match(ms, /"account\.delete\.body"/);
});

test("the delete route cancels live Stripe subscriptions and deletes the customer before Firestore and Auth", () => {
  const source = read("../src/app/api/account/delete/route.ts");
  const cancel = source.indexOf("subscriptions.cancel(");
  const customer = source.indexOf("customers.del(");
  const docs = source.indexOf("batch.commit()");
  const auth = source.indexOf("deleteUser(uid)");
  assert.ok(cancel > 0 && customer > cancel && docs > customer && auth > docs, "Stripe → Firestore → Auth");
  assert.match(source, /recent-login-required/);
  /* The ledger is not deleted: it is the record of which payments were
     made, and a refund conversation has to start somewhere. */
  assert.doesNotMatch(source, /billplzBills/);
});

/* ---- The legacy Stripe webhook ----------------------------------------- */

const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";

function signed(payload: string, secret = WEBHOOK_SECRET, timestamp?: number) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
}

test("the webhook rejects a missing, forged or replayed signature before reading anything", async () => {
  process.env.FIREBASE_SERVICE_ACCOUNT = "{}";
  process.env.STRIPE_SECRET_KEY = "sk_test_unit";
  process.env.STRIPE_PRICE_MONTHLY = PRICES.monthly;
  process.env.STRIPE_PRICE_YEARLY = PRICES.yearly;
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const { POST, HANDLED_EVENTS } = await import("@/app/api/billing/webhook/route");
  const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", created: 1, data: { object: {} } });
  const post = (headers: Record<string, string>, body = payload) =>
    POST(new Request("https://kiddo.test/api/billing/webhook", { method: "POST", headers, body }));

  assert.equal((await post({})).status, 400, "no signature");
  assert.equal((await post({ "stripe-signature": "t=1,v1=deadbeef" })).status, 400, "forged");
  assert.equal((await post({ "stripe-signature": signed(payload, "whsec_other") })).status, 400, "wrong secret");
  assert.equal((await post({ "stripe-signature": signed(payload) }, payload + " ")).status, 400, "tampered body");
  const stale = signed(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 60 * 60);
  assert.equal((await post({ "stripe-signature": stale })).status, 400, "outside Stripe's replay window");

  /* A valid signature on an event type KIDDO ignores is acknowledged
     without touching Firestore (which this test has not configured). */
  const other = JSON.stringify({ id: "evt_2", type: "invoice.paid", created: 1, data: { object: {} } });
  const ignored = await post({ "stripe-signature": signed(other) }, other);
  assert.equal(ignored.status, 200);
  assert.deepEqual(await ignored.json(), { received: true, ignored: "invoice.paid" });
  assert.deepEqual(
    [...HANDLED_EVENTS].sort(),
    ["checkout.session.completed", "customer.subscription.created", "customer.subscription.deleted", "customer.subscription.updated"],
  );
});

test("the webhook is idempotent: the event id is claimed once, and a repeat is acknowledged and ignored", () => {
  const source = read("../src/app/api/billing/webhook/route.ts");
  assert.match(source, /claimEvent\(event\.id/);
  assert.match(source, /duplicate: true/);
  assert.match(source, /releaseEvent\(event\.id\)/, "a failed write releases the claim so Stripe's retry is processed");
  const billing = read("../src/server/billing.ts");
  assert.match(billing, /\.create\(\{ type, receivedAt/, "create(), not set(): a second claim fails");
  assert.match(billing, /isNewer\(incoming, existing\)/, "older events never overwrite newer state");
  assert.match(billing, /runTransaction/);
});

test("nothing can start a new Stripe subscription any more", () => {
  const routes = walk(`${SRC}/app/api`);
  assert.deepEqual(
    routes.filter((f) => /checkout/.test(f)),
    [],
    "the Stripe Checkout route is gone",
  );
  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /checkout\.sessions\.create|customerFor\(|liveSubscriptions\(/, `${file} can still create a subscription`);
  }
  /* What remains of Stripe is the portal and the webhook, so the parents
     who already subscribed keep both their access and their way out. */
  const portal = read("../src/app/api/billing/portal/route.ts");
  assert.match(portal, /billingPortal\.sessions\.create/);
  assert.match(portal, /legacyBillingUnavailable\(\)/, "a deployment with no Stripe answers 503 rather than breaking");
});

/* ---- Secrets and unavailability ---------------------------------------- */

test("billing routes are unavailable, not broken, without credentials", async () => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.BILLPLZ_SECRET_KEY;
  delete process.env.BILLPLZ_COLLECTION_ID;
  const { POST } = await import("@/app/api/billing/billplz/create/route");
  const response = await POST(
    new Request("https://kiddo.test/api/billing/billplz/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "billing-not-configured" });
});

test("the Billplz secret cannot reach a browser, and neither can any other", () => {
  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    /* No secret is ever published under a name the bundler inlines. */
    assert.doesNotMatch(text, /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ACCOUNT|WEBHOOK|SIGNATURE|BILLPLZ)/, file);
    /* No literal key of any kind is committed. */
    assert.doesNotMatch(text, /sk_(live|test)_[A-Za-z0-9]{8,}/, file);
    assert.doesNotMatch(text, /whsec_[A-Za-z0-9]{8,}/, file);
    if (file.includes("/server/")) assert.match(text, /^import "server-only";/m, `${file} must be server-only`);
    if (!file.includes("/server/") && !file.includes("/app/api/")) {
      assert.doesNotMatch(
        text,
        /BILLPLZ_SECRET_KEY|BILLPLZ_XSIGNATURE_KEY|BILLPLZ_COLLECTION_ID|STRIPE_SECRET_KEY|FIREBASE_SERVICE_ACCOUNT|firebase-admin|from "stripe"/,
        `${file} must not touch server secrets`,
      );
    }
  }
  /* And the one module that does hold the key is a build error to import
     from a client component, rather than a leak nobody notices. */
  const client = read("../src/server/billplz.ts");
  assert.match(client, /^import "server-only";/m);
  assert.match(client, /process\.env\.BILLPLZ_SECRET_KEY/);
  assert.doesNotMatch(client, /console\.(log|info|warn|error)\([^)]*secretKey/, "the key is never logged");
});

test("the child's pages carry no prices, plans or billing words", () => {
  for (const file of [
    "components/account/PlayGate.tsx",
    "components/worlds/ContinueAdventure.tsx",
    "components/worlds/WorldActivityGame.tsx",
    "app/play/page.tsx",
    "app/play/layout.tsx",
    "app/worlds/layout.tsx",
  ]) {
    /* Strings and JSX text only — a code comment is not something a child sees. */
    const visible = read(`../src/${file}`).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(visible, /RM\d|\bprice|subscri|upgrade|billing|payment|Stripe|Billplz|checkout|trial|premium/i, file);
  }
  assert.match(read("../src/components/account/PlayGate.tsx"), /setOpened\(true\)/, "once open, stays open for the layout's life");
});
