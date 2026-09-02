/**
 * Where the Meta pixel actually fires, in a real browser.
 *
 * The privacy page makes a promise the code has to keep: the parent's pages
 * are counted, and a child's screens contact Facebook not at all. That is a
 * runtime fact — `MetaPixel` renders nothing outside the parent's routes —
 * and a unit test can only read the list it is written from. This drives a
 * real Chrome through the two halves of the site and reports what each one
 * asked the network for, plus every `securitypolicyviolation` raised on the
 * way, which is the other half of what `next.config.ts` claims.
 *
 * The second half checks the conversions. A purchase reported twice is a
 * campaign told it made twice the money, and `/welcome` is a page a parent
 * can reload; the rule that a purchase is counted once is checked by making
 * one — through the pretend cloud, the same one the measurements use, where
 * the "payment page" is a page on this site and the "callback" is a timer.
 * That half needs the account-free build; against a configured server it
 * says so and skips rather than failing.
 *
 * Run against a production build:
 *
 *   NEXT_PUBLIC_META_PIXEL_ID=1234567890123456 npm run measure:serve
 *   node scripts/check-meta-pixel.mjs
 *
 * (`npm run build && npx next start -p 4310` does the first half just as
 * well; `measure:serve` is the same build with Firebase unset, which is what
 * lets the pretend cloud load.)
 *
 * Use a made-up id, not the live one, unless you mean to put localhost's
 * page views — and a pretend purchase — into the real dataset. The id's only
 * job here is to be a number; everything being checked happens before Meta
 * looks at it.
 */
import { openBrowser, evaluate, clickAt, visit, settle } from "./cdp.mjs";
import { serverMode } from "./measure-mode.mjs";

const BASE = process.env.KIDDO_BASE ?? "http://localhost:4310";

/** Every request this document has made to Facebook, and every violation. */
const REPORT = `JSON.stringify({
  facebook: performance.getEntriesByType("resource")
    .map((r) => r.name)
    .filter((name) => /facebook\\.(net|com)/.test(name)),
  violations: [...new Set(window.__cspViolations ?? [])],
  fbq: typeof window.fbq,
  path: location.pathname,
})`;

const seen = async (cdp, sessionId) => JSON.parse(await evaluate(cdp, sessionId, REPORT));

/** `https://www.facebook.com/tr/?id=…&ev=PageView` counted once per view. */
const views = (report) => report.facebook.filter((name) => /facebook\.com\/tr/.test(name)).length;

/** Where the browser keeps the beacon log across navigations. */
const LOG = "kiddo.check.beacons";

/** One beacon, read the way Meta reads it. */
const parse = (url) => {
  const q = new URLSearchParams(url.split("?")[1] ?? "");
  const custom = {};
  for (const [key, value] of q) {
    const named = key.match(/^cd\[(.+)\]$/);
    if (named) custom[named[1]] = value;
  }
  return { event: q.get("ev"), page: decodeURIComponent(q.get("dl") ?? "?"), id: q.get("eid"), custom };
};

const { cdp, sessionId, close } = await openBrowser(9342);
try {
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (e) => {
          window.__cspViolations.push(e.effectiveDirective + " <- " + e.blockedURI);
        });

        /* A log of every beacon, kept in localStorage so that it survives the
           redirect to "Stripe" and back. The requests are recorded as they
           are *made* rather than as they complete: a beacon sent immediately
           before a navigation is often cancelled by it, and a cancelled
           request never becomes a resource timing entry — it would look like
           an event that was never sent. Every transport fbevents.js has is
           wrapped, and each hands the call straight on. */
        const keep = (url) => {
          const name = String(url);
          if (!/facebook\\.com\\/tr/.test(name)) return;
          try {
            const log = JSON.parse(localStorage.getItem("${LOG}") || "[]");
            log.push(name);
            localStorage.setItem("${LOG}", JSON.stringify(log));
          } catch {}
        };
        const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
        Object.defineProperty(HTMLImageElement.prototype, "src", {
          ...src,
          set(value) { keep(value); src.set.call(this, value); },
        });
        const beacon = navigator.sendBeacon?.bind(navigator);
        if (beacon) navigator.sendBeacon = (url, data) => { keep(url); return beacon(url, data); };
        const fetched = window.fetch;
        window.fetch = (input, init) => { keep(input && input.url ? input.url : input); return fetched(input, init); };
        const opened = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) { keep(url); return opened.call(this, method, url, ...rest); };
      `,
    },
    sessionId,
  );

  const step = async (title, expectation) => {
    await settle(cdp, sessionId, 1500);
    const report = await seen(cdp, sessionId);
    console.log(`\n${title}  (${report.path})`);
    console.log(`  page views reported : ${views(report)}`);
    console.log(`  fbq                 : ${report.fbq}`);
    console.log(`  CSP violations      : ${report.violations.length ? report.violations.join(", ") : "none"}`);
    const beacons = report.facebook
      .filter((name) => /facebook\.com\/tr/.test(name))
      .map((name) => {
        const q = new URLSearchParams(name.split("?")[1] ?? "");
        return `${q.get("ev")} for ${decodeURIComponent(q.get("dl") ?? "?")}`;
      });
    console.log(`  reported            : ${beacons.length ? beacons.join("\n                        ") : "(nothing)"}`);
    console.log(`  scripts             : ${report.facebook.filter((n) => /connect\.facebook\.net/.test(n)).length} from connect.facebook.net`);
    console.log(`  expected            : ${expectation}`);
    return report;
  };

  /* A link can appear twice — once in the header nav, once in the footer —
     and the header's copy is `display:none` on a narrow screen, where it has
     no box to press. Take the first one that is actually on the page, put it
     in the middle of the screen, and press that. */
  const follow = async (selector, expected) => {
    const box = JSON.parse(
      await evaluate(
        cdp,
        sessionId,
        `(() => {
           const link = [...document.querySelectorAll(${JSON.stringify(selector)})]
             .find((el) => el.getBoundingClientRect().width > 0);
           if (!link) return "null";
           link.scrollIntoView({ block: "center" });
           const b = link.getBoundingClientRect();
           return JSON.stringify({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
         })()`,
      ),
    );
    if (!box) throw new Error(`no visible ${selector} to click`);
    await clickAt(cdp, sessionId, box);
    await settle(cdp, sessionId, 800);
    const at = await evaluate(cdp, sessionId, "location.pathname");
    if (at !== expected) throw new Error(`clicking ${selector} led to ${at}, not ${expected}`);
  };

  /* 1. The landing page: the tag loads and one view is reported. */
  await visit(cdp, sessionId, `${BASE}/`, 1500);
  const landing = await step("1 · landing, freshly opened", "fbevents.js + 1 page view, no violations");

  /* 2. A second parent page, reached the way a parent reaches it — Next
        navigates in the client, so this is the view Meta's own snippet
        would have missed. */
  await follow('a[href="/privacy"]', "/privacy");
  const privacy = await step("2 · client navigation to /privacy", `${views(landing) + 1} page views in total`);

  /* 3. Out to the child's side, without reloading. The tag is unmounted and
        nothing further may be reported. */
  await follow('a[href="/play"]', "/play");
  const play = await step("3 · client navigation to /play", `still ${views(privacy)} page views — a child is not counted`);

  /* 4. And a child's screen opened cold, which is how a child opens it. */
  await visit(cdp, sessionId, `${BASE}/play`, 1500);
  const cold = await step("4 · /play opened directly", "no requests to Facebook at all, fbq undefined");

  /* ---- the conversions ------------------------------------------------- */

  const js = (expression) => evaluate(cdp, sessionId, expression);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (expression, ms = 12000) => {
    for (const start = Date.now(); Date.now() - start < ms; ) {
      if (await js(`!!(${expression})`)) return true;
      await wait(150);
    }
    return false;
  };
  const at = async (selector) => {
    const box = await js(`JSON.stringify((() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })())`);
    const parsed = JSON.parse(box);
    if (!parsed) throw new Error(`nothing at ${selector}`);
    return parsed;
  };
  const tap = async (selector) => clickAt(cdp, sessionId, await at(selector));
  const type = async (selector, value) => {
    await tap(selector);
    await js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.(); })()`);
    await cdp.send("Input.insertText", { text: value }, sessionId);
  };
  /** Everything the browser has been asked to send, across every page. */
  const logged = async () => JSON.parse(await js(`localStorage.getItem(${JSON.stringify(LOG)}) || "[]"`)).map(parse);
  const count = (log, event) => log.filter((b) => b.event === event).length;

  /* The pretend cloud only exists in a build with no Firebase, which is the
     one `measure:serve` stands up. Against a configured server there is a
     real sign-in form in the way, and the answer to that is a different
     server rather than a weaker check — so this half says what it needs and
     leaves the first half's verdict alone. */
  const mode = await serverMode(cdp, sessionId, BASE);
  const conversions = [];
  if (mode.cloud) {
    console.log("\n5 · conversions  (skipped)");
    console.log("  this server has Firebase configured, so the pretend cloud is not in the build.");
    console.log("  NEXT_PUBLIC_META_PIXEL_ID=1234567890123456 npm run measure:serve");
  } else {
    await visit(cdp, sessionId, `${BASE}/`, 900);
    await js(`(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("kiddo.preview.cloud", "1");
      localStorage.setItem(${JSON.stringify(LOG)}, "[]");
      return true;
    })()`);

    /* Landing → the offer → account → "Billplz" → /welcome, which is the
       road a parent takes and the only road either event is sent from. */
    await visit(cdp, sessionId, `${BASE}/join`, 1200);
    await until(`document.querySelector("[data-auth-card]")`);
    if ((await js(`document.querySelector("[data-auth-card]")?.dataset.authCard`)) !== "signup") await tap("[data-auth-switch]");
    await type("[data-auth-email]", "parent@example.com");
    await type("[data-auth-password]", "secret1");
    await type("[data-auth-confirm]", "secret1");
    await tap("[data-auth-submit]");

    const arrived = await until(`location.pathname === "/welcome"`, 15000);
    const started = (await logged()).filter((b) => b.event === "InitiateCheckout");
    console.log("\n5 · the offer → account → Billplz");
    console.log(`  reached /welcome    : ${arrived}`);
    console.log(`  reported            : ${started.map((b) => `${b.event} ${JSON.stringify(b.custom)} from ${new URL(b.page).pathname}`).join("\n                        ") || "(nothing)"}`);
    console.log("  expected            : 1 InitiateCheckout, RM29.90 as MYR 29.9, sent from /join");

    /* The callback is a timer here; the page says "confirming" until it
       lands, and nothing may be reported as bought before it does. */
    const early = count(await logged(), "Purchase");
    const opened = await until(`document.querySelector("[data-welcome='open']")`, 15000);
    await settle(cdp, sessionId, 1200);
    const afterOpen = (await logged()).filter((b) => b.event === "Purchase");
    console.log("\n6 · the callback lands");
    console.log(`  /welcome opened     : ${opened}`);
    console.log(`  before it landed    : ${early} purchases`);
    console.log(`  reported            : ${afterOpen.map((b) => `${b.event} ${JSON.stringify(b.custom)} id=${b.id}`).join("\n                        ") || "(nothing)"}`);
    console.log("  expected            : 1 Purchase, MYR 29.9, deduplicated by the bill");

    /* And the thing the whole design is for: a parent who reloads the page,
       or comes back to it, has not bought KIDDO twice. */
    await visit(cdp, sessionId, `${BASE}/welcome`, 2000);
    await until(`document.querySelector("[data-welcome='open']")`, 10000);
    await visit(cdp, sessionId, `${BASE}/welcome`, 2000);
    await until(`document.querySelector("[data-welcome='open']")`, 10000);
    await settle(cdp, sessionId, 1200);
    const reloaded = await logged();
    console.log("\n7 · /welcome opened twice more");
    console.log(`  purchases in total  : ${count(reloaded, "Purchase")}`);
    console.log(`  page views in total : ${count(reloaded, "PageView")}`);
    console.log("  expected            : still 1 purchase, and a page view for each visit");

    const one = afterOpen[0];
    conversions.push(
      arrived ? null : "the parent never reached /welcome",
      started.length === 1 ? null : `${started.length} InitiateCheckout events, expected 1`,
      started[0] && new URL(started[0].page).pathname === "/join" ? null : "InitiateCheckout was not sent from /join",
      started[0] && started[0].custom.value === "29.9" && started[0].custom.currency === "MYR"
        ? null
        : `InitiateCheckout carried ${JSON.stringify(started[0]?.custom)}, expected the one price in MYR`,
      opened ? null : "/welcome never opened",
      early === 0 ? null : "a purchase was reported before the callback wrote the access",
      afterOpen.length === 1 ? null : `${afterOpen.length} Purchase events, expected 1`,
      one && one.custom.value === "29.9" && one.custom.currency === "MYR" && one.custom.content_name === "lifetime"
        ? null
        : `Purchase carried ${JSON.stringify(one?.custom)}, expected the one price in MYR`,
      one && one.id ? null : "Purchase carried no eventID, so Meta cannot deduplicate it",
      count(reloaded, "Purchase") === 1 ? null : `reloading /welcome reported ${count(reloaded, "Purchase")} purchases`,
      reloaded.some((b) => b.custom.email || b.custom.uid) ? "a conversion carried something about the parent" : null,
    );
  }

  const problems = [
    ...conversions.filter(Boolean),
    views(landing) === 1 ? null : `landing reported ${views(landing)} page views, expected 1`,
    views(privacy) === views(landing) + 1 ? null : `a client navigation reported ${views(privacy) - views(landing)} page views, expected 1`,
    views(play) === views(privacy) ? null : "a child's screen reported a page view",
    cold.facebook.length === 0 ? null : "a child's screen loaded something from Facebook",
    cold.fbq === "undefined" ? null : "a child's screen defined fbq",
    [landing, privacy, play, cold].flatMap((r) => r.violations).length === 0 ? null : "the CSP blocked something",
  ].filter(Boolean);

  const verdict = mode.cloud
    ? "PASS — counted on the parent's pages, silent on the child's. (Conversions not checked.)"
    : "PASS — counted on the parent's pages, silent on the child's, and one purchase counted once.";
  console.log(problems.length ? `\nFAIL\n  ${problems.join("\n  ")}` : `\n${verdict}`);
} finally {
  close();
}
