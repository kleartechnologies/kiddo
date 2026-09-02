/**
 * Measures the public front of KIDDO (Phase 7): the landing page and the
 * privacy page, as a parent would meet them on a phone, a tablet or a laptop.
 *
 *    1 layout          no horizontal scroll, one h1, headings in order
 *    2 targets         every link and button is at least 48px tall
 *    3 honesty         the page is built from the real product, not claims,
 *                      and the one price it prints is the one price KIDDO
 *                      charges, with nothing recurring said anywhere
 *    4 navigation      landing → pricing → join → parents → privacy → landing
 *    5 reduced motion  nothing keeps moving; the hero is readable at once
 *    6 console         nothing logged
 *
 * Needs a production server on http://127.0.0.1:4310 (`npm run build && npm
 * start -- -p 4310`). Works against either build: with Firebase configured
 * the walk asserts that `/parents` stops a signed-out visitor at the sign-in
 * card, and without it the same walk goes on into the account-free dashboard.
 * Exits 1 if any check fails.
 */
import { applyViewport, evaluate, openBrowser, settle, visit, VIEWPORTS } from "./cdp.mjs";
import { announce, serverMode } from "./measure-mode.mjs";

const ORIGIN = "http://127.0.0.1:4310";
const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => { window.__trouble.push(args.join(" ")); real(...args); };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

let failures = 0;
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`  ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};
const section = (title) => console.log(`\n${title}`);

const { cdp, sessionId, close } = await openBrowser(9361);
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);
const reducedMotion = (on) =>
  cdp.send(
    "Emulation.setEmulatedMedia",
    { features: on ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [] },
    sessionId,
  );
const go = (path, ms = 900) => visit(cdp, sessionId, `${ORIGIN}${path}`, ms);
const ev = (expr) => evaluate(cdp, sessionId, expr);

const PAGE_FACTS = `(() => {
  const hs = [...document.querySelectorAll("h1,h2,h3,h4")];
  let inOrder = true, last = 0;
  for (const h of hs) { const n = +h.tagName[1]; if (n > last + 1) inOrder = false; last = n; }
  const small = [...document.querySelectorAll("a[href],button")]
    .map((el) => ({ el, r: el.getBoundingClientRect(), name: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 28) }))
    .filter((t) => t.r.width > 0 && t.r.height > 0 && t.r.height < 48)
    .map((t) => t.name + " " + Math.round(t.r.width) + "×" + Math.round(t.r.height));
  const images = [...document.images].map((i) => ({ src: i.currentSrc.split("/").pop().split("?")[0], alt: i.alt, ok: i.complete && i.naturalWidth > 0 }));
  return {
    scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    h1: document.querySelectorAll("h1").length, inOrder, small, images,
    title: document.title, trouble: window.__trouble,
  };
})()`;

const PAGES = [
  { path: "/", name: "landing" },
  { path: "/privacy", name: "privacy" },
];

section("1 · layout & 2 · targets");
const LANDING_VIEWPORTS = [
  ...VIEWPORTS.filter((v) => ![820, 1180].includes(v.width)),
  { name: "laptop 1280×800", width: 1280, height: 800, mobile: false },
];
for (const viewport of LANDING_VIEWPORTS) {
  await applyViewport(cdp, sessionId, viewport);
  for (const page of PAGES) {
    await go(page.path);
    /* Walk the page the way a reader does, so lazy images get their turn. */
    const steps = await ev("Math.ceil(document.body.scrollHeight / innerHeight)");
    for (let i = 1; i <= steps; i += 1) {
      await ev(`window.scrollTo(0, ${i} * innerHeight)`);
      await settle(cdp, sessionId, 250);
    }
    await settle(cdp, sessionId, 900);
    const f = await ev(PAGE_FACTS);
    const problems = [];
    if (f.scrollW > f.innerW) problems.push(`horizontal scroll ${f.scrollW}>${f.innerW}`);
    if (f.h1 !== 1) problems.push(`${f.h1} h1s`);
    if (!f.inOrder) problems.push("headings skip a level");
    if (f.small.length) problems.push(`under 48px: ${f.small.join(", ")}`);
    const broken = f.images.filter((i) => !i.ok || !i.alt);
    if (broken.length) problems.push(`images: ${broken.map((i) => i.src).join(", ")}`);
    if (f.trouble.length) problems.push(`console: ${f.trouble[0]}`);
    report(`${viewport.name} · ${page.name} (${f.images.length} images)`, problems);
  }
}

section("3 · honesty");
await applyViewport(cdp, sessionId, VIEWPORTS.at(-1));
await go("/");
const honest = await ev(`(() => {
  const text = document.body.innerText;
  const worlds = [...document.querySelectorAll("[data-landing-world]")].map((w) => w.dataset.landingWorld);
  const doors = document.querySelectorAll("[data-landing-doors] > li").length;
  const banned = ["AI", "million", "thousands of", "guaranteed", "COPPA", "clinically"].filter((w) => new RegExp("\\\\b" + w + "\\\\b").test(text));
  /* The price as printed, so it can be checked against the one KIDDO charges. */
  const sen = (el) => Math.round(parseFloat((el?.textContent || "").replace(/[^0-9.]/g, "")) * 100);
  const card = (offer) => document.querySelector('[data-pricing-offer="' + offer + '"]');
  const price = sen(card("lifetime")?.querySelector("[data-pricing-price]"));
  const was = sen(card("lifetime")?.querySelector("[data-pricing-was]"));
  const plans = [...document.querySelectorAll("[data-pricing-offer]")].map((el) => el.dataset.pricingOffer);
  const noted = [...document.querySelectorAll("[data-pricing-offer]")].filter((el) => el.querySelector("[data-pricing-note]")).map((el) => el.dataset.pricingOffer);
  return {
    worlds, doors, banned, price, was, plans, noted,
    percents: [...text.matchAll(/(\\d+)%/g)].map((m) => +m[1]),
    recurring: ["monthly", "yearly", "per month", "per year", "subscribe", "free trial", "sebulan", "setahun", "langgan"]
      .filter((w) => new RegExp(w, "i").test(text)),
    cta: document.querySelector("[data-landing-cta]")?.getAttribute("href"),
    /* The gameplay reel: real footage, and polite about it — it must carry a
       poster (no blank rectangle before load), stay muted (autoplay rules and
       common decency) and play inline (iOS would otherwise go fullscreen). */
    video: (() => {
      const v = document.querySelector("[data-landing-video]");
      return v ? { poster: !!v.poster, muted: v.muted, inline: v.playsInline } : null;
    })(),
  };
})()`);
report(
  `worlds ${honest.worlds.join("/")} · ${honest.doors} real doors · CTA → ${honest.cta}`,
  [
    honest.worlds.length === 3 ? null : "not three worlds",
    honest.doors === 3 ? null : "doors are not the real WorldDoor list",
    honest.cta === "/#pricing" ? null : "CTA does not lead to pricing",
    honest.banned.length ? `suspicious claims: ${honest.banned.join(", ")}` : null,
    honest.video ? null : "no gameplay video on the page",
    honest.video && !(honest.video.poster && honest.video.muted && honest.video.inline)
      ? "gameplay video is missing poster, muted or playsinline"
      : null,
  ].filter(Boolean),
);
/* One thing to buy, at the price KIDDO actually charges, described as the
   one-time payment it is. The launch saving is said with the old price
   struck through, never as a percentage, so a percentage anywhere on the
   page is still a leftover. */
const PRICE_SEN = 2990;
const ORIGINAL_SEN = 3990;
report(
  `offer ${honest.plans.join("/") || "none"} · RM${(honest.price / 100).toFixed(2)} once`,
  [
    honest.plans.length === 1 && honest.plans[0] === "lifetime" ? null : `not one lifetime offer: ${honest.plans.join("/") || "nothing"}`,
    honest.price === PRICE_SEN ? null : `the page prints ${honest.price / 100}, not ${PRICE_SEN / 100}`,
    honest.was === ORIGINAL_SEN ? null : `the struck original is ${honest.was / 100}, not ${ORIGINAL_SEN / 100}`,
    honest.noted.join() === "lifetime" ? null : `the badge is on ${honest.noted.join("/") || "nothing"}`,
    honest.recurring.length ? `a recurring word on a one-time offer: ${honest.recurring.join(", ")}` : null,
    honest.percents.length ? `a percentage with nothing to be a percentage of: ${honest.percents.join(", ")}` : null,
  ].filter(Boolean),
);
await go("/privacy");
const privacy = await ev(`(() => {
  const text = document.body.innerText;
  return {
    keys: ["kiddo.child.name.v1", "kiddo.journey.v1", "kiddo.audio.v1"].filter((k) => text.includes(k)),
    todos: (text.match(/TODO\\(launch\\)/g) || []).length,
    overclaims: ["never collected", "fully COPPA", "COPPA compliant"].filter((s) => text.includes(s)),
    parents: !!document.querySelector('a[href="/parents"]'),
  };
})()`);
report(
  `privacy names ${privacy.keys.length} storage keys · ${privacy.todos} open TODO(s) · links to parents ${privacy.parents}`,
  [
    privacy.keys.length === 3 ? null : "storage keys missing",
    privacy.overclaims.length ? `overclaims: ${privacy.overclaims.join(", ")}` : null,
    privacy.parents ? null : "no link to the parent area",
  ].filter(Boolean),
);

section("4 · navigation");
await applyViewport(cdp, sessionId, VIEWPORTS[1]);
const hop = async (path, selector, expected) => {
  await go(path);
  await ev(`document.querySelector('${selector}').click()`);
  await settle(cdp, sessionId, 1200);
  const got = await ev("location.pathname");
  report(`${path} · ${selector} → ${got}`, got === expected ? [] : [`expected ${expected}`]);
};
/* "Start KIDDO" is an anchor now: it stays on the page and brings the offer
   into view. Only taking it leaves the landing page. */
await go("/");
await ev(`document.querySelector("[data-landing-cta]").click()`);
await settle(cdp, sessionId, 1200);
const toPricing = await ev(`(() => {
  const r = document.getElementById("pricing").getBoundingClientRect();
  return { path: location.pathname + location.hash, onScreen: r.top < innerHeight * 0.5 && r.bottom > 0 };
})()`);
report(`/ · [data-landing-cta] → ${toPricing.path}`, [
  toPricing.path === "/#pricing" ? null : "CTA left the landing page",
  toPricing.onScreen ? null : "pricing did not come into view",
].filter(Boolean));

/* And the offer's own button goes to the join page with nothing in the
   address bar: there is no plan to name, and the price is the server's. */
await go("/");
await ev(`document.querySelector('[data-pricing-cta="lifetime"]').click()`);
await settle(cdp, sessionId, 1200);
const toJoin = await ev("location.pathname + location.search");
report(`/ · lifetime offer → ${toJoin}`, toJoin === "/join" ? [] : ["expected /join, with no query"]);

await hop("/play", 'a[href="/parents"]', "/parents");

/* Where the walk stops depends on how KIDDO was built, and the point of this
   part is that it *does* stop.
   
   A configured build puts `/parents` behind `ParentGate`, so a visitor who has
   walked in off the landing page is signed out and meets the sign-in card —
   not the dashboard, not the child's journey, not the billing row. That is the
   authentication boundary working, and the measurement asserts it rather than
   clicking through it. An account-free build has no boundary to assert
   (`session.status` is `unavailable` for everybody), so there the dashboard is
   the correct answer and the original walk continues.

   The one thing neither mode may do is show a signed-out visitor the
   dashboard. */
const parents = await serverMode(cdp, sessionId, ORIGIN);
announce(parents);
if (parents.cloud) {
  report(`/parents · signed out → ${parents.gate}`, [
    parents.gate === "signed-out" ? null : `expected the sign-in card, got ${parents.gate}`,
    parents.auth ? null : "no sign-in card",
    parents.dashboard ? "the dashboard is readable without an account" : null,
  ].filter(Boolean));
  /* The dashboard's own link to the privacy page is behind the gate with the
     dashboard, so a signed-out parent reaches it the way they always could:
     from the public footer. */
  await hop("/", 'footer a[href="/privacy"]', "/privacy");
} else {
  report(`/parents · account-free build → dashboard`, [
    parents.dashboard ? null : "no dashboard on a build with no accounts",
  ].filter(Boolean));
  await hop("/parents", "[data-parent-privacy]", "/privacy");
}
/* Found by attribute rather than by its accessible name: the name is
   translated, and KIDDO's default language is not English. */
await hop("/privacy", "[data-landing-home]", "/");
/* The header's way back into KIDDO is outside the gate in both modes: it is
   the parent's own door, and it never depended on being signed in. */
await hop("/parents", "[data-open-kiddo]", "/play");

section("5 · reduced motion");
await reducedMotion(true);
await go("/", 300);
const atOnce = await ev(`(() => {
  const h = document.getElementById("hero-heading");
  const s = getComputedStyle(h);
  const moving = [...document.querySelectorAll("*")].filter((el) => {
    const a = getComputedStyle(el);
    return a.animationIterationCount === "infinite" && a.animationName !== "none";
  }).length;
  return { opacity: +s.opacity, transform: s.transform, moving };
})()`);
report(
  `hero opacity ${atOnce.opacity}, transform ${atOnce.transform}, ${atOnce.moving} looping animation(s)`,
  [
    atOnce.opacity === 1 ? null : "hero not visible at once",
    atOnce.moving === 0 ? null : "something loops forever",
  ].filter(Boolean),
);
await reducedMotion(false);
await go("/", 2500);
const loops = await ev(`[...document.querySelectorAll("*")].filter((el) => { const a = getComputedStyle(el); return a.animationIterationCount === "infinite" && a.animationName !== "none"; }).length`);
report(`${loops} looping decorative animation(s) with motion allowed`, loops === 0 ? [] : ["a decorative loop"]);

section("6 · console");
const trouble = await ev("window.__trouble");
report(`${trouble.length} error/warning line(s) on the landing page`, trouble.length ? trouble.slice(0, 3) : []);

await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
