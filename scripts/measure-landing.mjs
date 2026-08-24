/**
 * Measures the public front of KIDDO (Phase 7): the landing page and the
 * privacy page, as a parent would meet them on a phone, a tablet or a laptop.
 *
 *    1 layout          no horizontal scroll, one h1, headings in order
 *    2 targets         every link and button is at least 48px tall
 *    3 honesty         the page is built from the real product, not claims
 *    4 navigation      landing → KIDDO home → parents → privacy → landing
 *    5 reduced motion  nothing keeps moving; the hero is readable at once
 *    6 console         nothing logged
 *
 * Needs a production server on http://127.0.0.1:4310 (`npm run build && npm
 * start -- -p 4310`). Exits 1 if any check fails.
 */
import { applyViewport, evaluate, openBrowser, settle, visit, VIEWPORTS } from "./cdp.mjs";

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
  const banned = ["AI", "%", "million", "thousands of", "guaranteed", "COPPA", "clinically"].filter((w) => new RegExp("\\\\b" + w + "\\\\b").test(text));
  return { worlds, doors, banned, cta: document.querySelector("[data-landing-cta]")?.getAttribute("href") };
})()`);
report(
  `worlds ${honest.worlds.join("/")} · ${honest.doors} real doors · CTA → ${honest.cta}`,
  [
    honest.worlds.length === 3 ? null : "not three worlds",
    honest.doors === 3 ? null : "doors are not the real WorldDoor list",
    honest.cta === "/play" ? null : "CTA does not open KIDDO",
    honest.banned.length ? `suspicious claims: ${honest.banned.join(", ")}` : null,
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
await hop("/", "[data-landing-cta]", "/play");
await hop("/play", 'a[href="/parents"]', "/parents");
await hop("/parents", "[data-parent-privacy]", "/privacy");
await hop("/privacy", 'a[aria-label="KIDDO home"]', "/");
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
