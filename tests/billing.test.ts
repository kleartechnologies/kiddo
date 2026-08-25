import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";

import Stripe from "stripe";

import {
  AMOUNTS,
  MONTHS,
  NO_SUBSCRIPTION,
  PLANS,
  PLAN_ORDER,
  YEARLY_PER_MONTH,
  YEARLY_SAVING_PERCENT,
  describeSubscription,
  hasAccess,
  isNewer,
  isPlan,
  parseSubscription,
  money,
  stateFromStripe,
  statusFromStripe,
  statusLabel,
  type SubscriptionState,
} from "@/lib/billing/subscription";
import {
  __resetSessionForTests,
  checkResetLink,
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
  startCheckout,
} from "@/lib/cloud/session";
import { CloudError } from "@/lib/cloud/types";
import { currentJourney, __resetJourneyStoreForTests, recordCompleted } from "@/lib/journey/useJourney";
import { __resetChildNameStoreForTests } from "@/lib/profile/useChildName";
import { activitiesOf } from "@/lib/worlds/activities";

import { ACTIVE, FakeCloud, navigations, storage } from "./helpers/fakeCloud";

/**
 * Subscriptions, checked without Stripe or Firebase.
 *
 * Three layers: the pure model (`@/lib/billing/subscription`), the session
 * store driving the parent area through sign-in → gate → Checkout return →
 * onboarding, and the webhook route's signature check, which runs the real
 * Stripe SDK against a locally signed payload.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const PRICES = { monthly: "price_monthly_test", yearly: "price_yearly_test" };

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

/* ---- The model --------------------------------------------------------- */

test("there are exactly two plans at the locked prices, yearly first as best value", () => {
  assert.deepEqual(PLAN_ORDER, ["yearly", "monthly"]);
  assert.equal(PLANS.monthly.price, "RM9.90");
  assert.equal(PLANS.monthly.per, "month");
  assert.equal(PLANS.yearly.price, "RM59.90");
  assert.equal(PLANS.yearly.per, "year");
  assert.equal(PLANS.yearly.note, "Best value");
  assert.equal(PLANS.monthly.note, null);
  assert.ok(isPlan("monthly") && isPlan("yearly"));
  assert.ok(!isPlan("lifetime") && !isPlan("trial") && !isPlan("family") && !isPlan(""));
});

test("every price a parent sees is derived from the one amounts table", () => {
  /* Sen, the way Stripe holds them — so the two can be compared by eye. */
  assert.deepEqual(AMOUNTS, { monthly: 990, yearly: 5990 });
  assert.deepEqual(MONTHS, { monthly: 1, yearly: 12 });
  assert.equal(money(990), "RM9.90");
  assert.equal(money(5990), "RM59.90");
  for (const plan of PLAN_ORDER) {
    assert.equal(PLANS[plan].amount, AMOUNTS[plan]);
    assert.equal(PLANS[plan].price, money(AMOUNTS[plan]), `${plan} price is not the ${plan} amount`);
  }
  /* The two numbers the yearly card argues with, both computed. */
  assert.equal(YEARLY_PER_MONTH, "RM4.99");
  assert.equal(YEARLY_SAVING_PERCENT, 50);
  assert.ok(AMOUNTS.yearly < AMOUNTS.monthly * MONTHS.yearly, "yearly must actually save money");
});

test("changing a price means changing one file: nothing else writes an amount", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
    );
  const src = new URL("../src", import.meta.url).pathname;
  for (const file of walk(src)) {
    if (file.endsWith("/lib/billing/subscription.ts")) continue;
    /* Comments may name a price; a rendered string may not. */
    const visible = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(visible, /RM\s?\d/, `${file} hardcodes a price instead of reading PLANS`);
  }
});

test("the account area can say, in one word, what state the subscription is in", () => {
  assert.equal(statusLabel(ACTIVE, NOW), "Active");
  assert.equal(statusLabel({ ...ACTIVE, cancelAtPeriodEnd: true }, NOW), "Ending");
  assert.equal(statusLabel({ ...ACTIVE, currentPeriodEnd: NOW - 30 * DAY }, NOW), "Renewing", "an active row whose period ran out long ago is waiting on Stripe, not failing");
  assert.equal(statusLabel({ ...ACTIVE, status: "past_due" }, NOW), "Payment failed");
  assert.equal(statusLabel({ ...ACTIVE, status: "incomplete" }, NOW), "Confirming");
  assert.equal(statusLabel({ ...ACTIVE, status: "cancelled" }, NOW), "Cancelled");
  assert.equal(statusLabel({ ...ACTIVE, status: "expired" }, NOW), "Ended");
  assert.equal(statusLabel(NO_SUBSCRIPTION, NOW), "No subscription");
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

  const at = (status: SubscriptionState["status"]) => hasAccess({ ...ACTIVE, status }, NOW);
  assert.equal(at("active"), true);
  assert.equal(at("past_due"), false);
  assert.equal(at("cancelled"), false);
  assert.equal(at("expired"), false);
  assert.equal(at("incomplete"), false);
  assert.equal(at("none"), false);
  assert.equal(hasAccess(null, NOW), false);
  assert.equal(hasAccess(NO_SUBSCRIPTION, NOW), false);
});

test("a stale active subscription stops opening KIDDO a day after its period ended", () => {
  const ending = { ...ACTIVE, currentPeriodEnd: NOW };
  assert.equal(hasAccess(ending, NOW - 1), true);
  assert.equal(hasAccess(ending, NOW + DAY - 1), true, "a late renewal webhook gets a day");
  assert.equal(hasAccess(ending, NOW + DAY + 1), false);
  assert.equal(hasAccess({ ...ACTIVE, currentPeriodEnd: null }, NOW + 400 * DAY), true, "no period end: trust the status");
});

test("a Stripe subscription becomes KIDDO state with the plan resolved from the price id", () => {
  const yearly = stateFromStripe(stripeSub(), PRICES, 1000);
  assert.equal(yearly.plan, "yearly");
  assert.equal(yearly.status, "active");
  assert.equal(yearly.stripeCustomerId, "cus_1");
  assert.equal(yearly.stripeSubscriptionId, "sub_1");
  assert.equal(yearly.currentPeriodEnd, (NOW / 1000 + 30 * 86400) * 1000);
  assert.equal(yearly.eventCreated, 1000);
  assert.equal(hasAccess(yearly, NOW), true);

  const monthly = stateFromStripe(stripeSub({ price: PRICES.monthly }), PRICES, 1000);
  assert.equal(monthly.plan, "monthly");

  const unknown = stateFromStripe(stripeSub({ price: "price_other" }), PRICES, 1000);
  assert.equal(unknown.plan, null, "an unknown price is not guessed into a plan");

  const cancelling = stateFromStripe(stripeSub({ cancel: true }), PRICES, 1000);
  assert.equal(cancelling.cancelAtPeriodEnd, true);
  assert.equal(hasAccess(cancelling, NOW), true, "cancelled-at-period-end stays open until then");

  const ended = stateFromStripe(stripeSub({ status: "canceled" }), PRICES, 1000);
  assert.equal(ended.status, "cancelled");
  assert.equal(hasAccess(ended, NOW), false);
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
  assert.equal(statusLabel(portal, NOW), "Ending");
  assert.match(describeSubscription(portal, NOW), /^Cancelled\. KIDDO stays open until /);

  /* The older shape means the same thing and still reads the same way. */
  assert.equal(stateFromStripe(stripeSub({ cancel: true }), PRICES, 1000).cancelAtPeriodEnd, true);
  assert.equal(
    stateFromStripe(stripeSub({ cancel: true, cancelAt: null }), PRICES, 1000).cancelAtPeriodEnd,
    true,
  );

  /* Neither set: a subscription that really is renewing is left alone. */
  const renewing = stateFromStripe(stripeSub(), PRICES, 1000);
  assert.equal(renewing.cancelAtPeriodEnd, false);
  assert.equal(statusLabel(renewing, NOW), "Active");
  assert.match(describeSubscription(renewing, NOW), /Renews on /);
  assert.deepEqual(
    { ...portal, cancelAtPeriodEnd: false },
    renewing,
    "a scheduled cancellation changes that one field and nothing else",
  );

  /* One Stripe has already ended still maps by its status alone. */
  const ended = stateFromStripe(stripeSub({ status: "canceled", cancelAt: END }), PRICES, 1000);
  assert.equal(ended.status, "cancelled");
  assert.equal(statusLabel(ended, NOW), "Cancelled");

  /* Access is decided by status and period end. This flag never moves it. */
  assert.equal(hasAccess(portal, NOW), true, "cancelling keeps KIDDO open until the period ends");
  assert.equal(hasAccess(portal, NOW + 32 * DAY), false, "and closed after it, grace included");
  assert.equal(hasAccess(renewing, NOW), true);
  assert.equal(hasAccess(ended, NOW), false);
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

test("the billing line is a sentence a parent can act on, never a code", () => {
  assert.match(describeSubscription(ACTIVE, NOW), /Yearly plan, RM59\.90 a year\. Renews on/);
  assert.match(describeSubscription({ ...ACTIVE, plan: "monthly" }, NOW), /Monthly plan, RM9\.90 a month/);
  assert.match(describeSubscription({ ...ACTIVE, cancelAtPeriodEnd: true }, NOW), /Cancelled\. KIDDO stays open until/);
  assert.match(describeSubscription({ ...ACTIVE, status: "past_due" }, NOW), /payment didn’t go through/);
  assert.match(describeSubscription({ ...ACTIVE, status: "cancelled" }, NOW), /ended on/);
  assert.match(describeSubscription({ ...ACTIVE, status: "expired" }, NOW), /has ended/);
  assert.match(describeSubscription({ ...ACTIVE, status: "incomplete" }, NOW), /still being confirmed/);
  assert.equal(describeSubscription(NO_SUBSCRIPTION, NOW), "No subscription yet.");
  for (const status of ["active", "past_due", "cancelled", "expired", "incomplete", "none"] as const) {
    assert.doesNotMatch(describeSubscription({ ...ACTIVE, status }, NOW), /past_due|incomplete_expired|stripe_|[a-z]+_[a-z]+/);
  }
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
  cloud.autoSubscribe = false;
});

test("a new parent lands on the subscription gate before onboarding, with no access", async () => {
  await boot();
  assert.equal(await signUp("p@example.com", "secret1"), null);
  await settle();
  const s = currentSession();
  assert.equal(s.status, "needs-subscription");
  assert.equal(s.subscription?.status, "none");
  assert.equal(sessionHasAccess(), false);
  assert.equal(s.child, null, "the child is not asked for until KIDDO is paid for");
});

test("choosing a plan asks the server for Checkout and goes there; nothing changes until the webhook", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(await startCheckout("monthly", "/parents"), null);
  assert.deepEqual(cloud.checkouts, [{ uid: "uid-1", plan: "monthly", returnTo: "/parents" }]);
  assert.deepEqual(navigations, ["https://checkout.stripe.test/session"]);
  /* Being sent to Stripe — or coming back — grants nothing by itself. */
  assert.equal(currentSession().status, "needs-subscription");
  assert.equal(sessionHasAccess(), false);

  /* The webhook writes the subscription; the watch hears it; on we go. */
  cloud.setSubscription("uid-1", { ...ACTIVE, plan: "monthly" });
  await settle();
  assert.equal(currentSession().status, "needs-child");
  assert.equal(currentSession().subscription?.plan, "monthly");
  assert.equal(sessionHasAccess(), true);
  assert.equal(await createChildProfile("Mia"), "Mia");
  await settle();
  assert.equal(currentSession().status, "ready");
});

test("the yearly plan goes through the same door", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(await startCheckout("yearly", "/parents"), null);
  assert.equal(cloud.checkouts[0]?.plan, "yearly");
  cloud.setSubscription("uid-1", ACTIVE);
  await settle();
  assert.equal(currentSession().subscription?.plan, "yearly");
  assert.equal(currentSession().status, "needs-child");
});

test("a cancelled Checkout leaves the parent exactly where they were, with no error state", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await startCheckout("yearly", "/parents");
  /* Stripe sends them back to /parents?checkout=cancelled. The session
     has not moved and no subscription exists. */
  assert.equal(currentSession().status, "needs-subscription");
  assert.equal(currentSession().subscription?.status, "none");
  assert.equal(cloud.subscriptions.has("uid-1"), false);
  /* And they can simply try again — a second Checkout, not a second subscription. */
  assert.equal(await startCheckout("monthly", "/parents"), null);
  assert.equal(cloud.checkouts.length, 2);
});

test("a failed Checkout request is a reason, not a crash, and the gate stays", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  cloud.checkoutAnswer = new CloudError("billing-unavailable", "503");
  assert.equal(await startCheckout("yearly"), "billing-unavailable");
  cloud.checkoutAnswer = new CloudError("offline");
  assert.equal(await startCheckout("yearly"), "offline");
  assert.equal(navigations.length, 0);
  assert.equal(currentSession().status, "needs-subscription");
});

test("a returning parent with an active subscription goes straight through", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.subscriptions.set("uid-1", ACTIVE);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(currentSession().status, "ready");
  assert.equal(sessionHasAccess(), true);
});

test("past_due, cancelled and expired each close KIDDO for the parent area, keeping the child's data", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  for (const status of ["past_due", "cancelled", "expired", "incomplete"] as const) {
    __resetSessionForTests();
    cloud.subscriptions.set("uid-1", { ...ACTIVE, status });
    await boot();
    await signIn("p@example.com", "secret1");
    await settle();
    assert.equal(currentSession().status, "needs-subscription", status);
    assert.equal(currentSession().subscription?.status, status);
    assert.equal(sessionHasAccess(), false, status);
    assert.equal(cloud.children.size, 1, "nothing is deleted because a payment failed");
    await cloud.signOut();
    await settle();
  }
});

test("a subscription that lapses while the parent is on the dashboard is noticed; the journey is untouched", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.subscriptions.set("uid-1", ACTIVE);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  recordCompleted(apples.id);
  await settle();
  assert.ok(cloud.journeys.get("child-1")?.completed.includes(apples.id));

  cloud.setSubscription("uid-1", { ...ACTIVE, status: "past_due", eventCreated: ACTIVE.eventCreated + 1 });
  await settle();
  const s = currentSession();
  assert.equal(s.status, "ready", "the session keeps its child; the gate is a rendering decision");
  assert.equal(sessionHasAccess(s), false);
  assert.ok(currentJourney().completed.includes(apples.id), "the child's progress is still there");
  assert.ok(cloud.journeys.get("child-1")?.completed.includes(apples.id));

  /* The card is fixed in Stripe; the webhook says active again. */
  cloud.setSubscription("uid-1", { ...ACTIVE, eventCreated: ACTIVE.eventCreated + 2 });
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
  const source = readFileSync(new URL("../src/components/account/AuthCard.tsx", import.meta.url), "utf8");
  assert.match(source, /failure !== "no-account"/, "AuthCard shows the same sentence whether or not the account exists");
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

test("deleting the account removes the subscription record along with everything else", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.subscriptions.set("uid-1", ACTIVE);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  await boot();
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(await deleteAccount(), null);
  assert.deepEqual(cloud.deleted, ["uid-1"]);
  assert.equal(cloud.subscriptions.has("uid-1"), false);
  assert.equal(cloud.children.size, 0);
  assert.equal(currentSession().status, "signed-out");
  assert.equal(currentSession().subscription, null);
});

test("the delete route cancels live Stripe subscriptions and deletes the customer before Firestore and Auth", () => {
  const source = readFileSync(new URL("../src/app/api/account/delete/route.ts", import.meta.url), "utf8");
  const cancel = source.indexOf("subscriptions.cancel(");
  const customer = source.indexOf("customers.del(");
  const docs = source.indexOf("batch.commit()");
  const auth = source.indexOf("deleteUser(uid)");
  assert.ok(cancel > 0 && customer > cancel && docs > customer && auth > docs, "Stripe → Firestore → Auth");
  assert.match(source, /recent-login-required/);
});

/* ---- The webhook ------------------------------------------------------- */

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
  const source = readFileSync(new URL("../src/app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  assert.match(source, /claimEvent\(event\.id/);
  assert.match(source, /duplicate: true/);
  assert.match(source, /releaseEvent\(event\.id\)/, "a failed write releases the claim so Stripe's retry is processed");
  const billing = readFileSync(new URL("../src/server/billing.ts", import.meta.url), "utf8");
  assert.match(billing, /\.create\(\{ type, receivedAt/, "create(), not set(): a second claim fails");
  assert.match(billing, /isNewer\(incoming, existing\)/, "older events never overwrite newer state");
  assert.match(billing, /runTransaction/);
});

test("billing routes are unavailable, not broken, without credentials, and never expose a secret", async () => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.STRIPE_SECRET_KEY;
  const { POST } = await import("@/app/api/billing/checkout/route");
  const response = await POST(new Request("https://kiddo.test/api/billing/checkout", { method: "POST", body: "{}" }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "billing-not-configured" });

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
    );
  const src = new URL("../src", import.meta.url).pathname;
  for (const file of walk(src)) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /NEXT_PUBLIC_STRIPE_SECRET|NEXT_PUBLIC_.*(SECRET|SERVICE_ACCOUNT|WEBHOOK)/, file);
    assert.doesNotMatch(text, /sk_(live|test)_[A-Za-z0-9]{8,}/, file);
    assert.doesNotMatch(text, /whsec_[A-Za-z0-9]{8,}/, file);
    if (file.includes("/server/")) assert.match(text, /^import "server-only";/m, `${file} must be server-only`);
    if (!file.includes("/server/") && !file.includes("/app/api/")) {
      assert.doesNotMatch(text, /STRIPE_SECRET_KEY|FIREBASE_SERVICE_ACCOUNT|firebase-admin|from "stripe"/, `${file} must not touch server secrets`);
    }
  }
});

test("the child's pages carry no prices, plans or billing words", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  for (const file of [
    "components/account/PlayGate.tsx",
    "components/worlds/ContinueAdventure.tsx",
    "components/worlds/WorldActivityGame.tsx",
    "app/play/page.tsx",
    "app/play/layout.tsx",
    "app/worlds/layout.tsx",
  ]) {
    /* Strings and JSX text only — a code comment is not something a child sees. */
    const visible = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(visible, /RM\d|\bprice|subscri|upgrade|billing|payment|Stripe|checkout|trial|premium/i, file);
  }
  assert.match(read("components/account/PlayGate.tsx"), /setOpened\(true\)/, "once open, stays open for the layout's life");
});

import { readdirSync } from "node:fs";
