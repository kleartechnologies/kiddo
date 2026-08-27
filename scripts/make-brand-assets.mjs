/**
 * Photographs the brand assets out of the running product.
 *
 * Nothing here is drawn by hand. The app icon and the social card are the
 * internal `/playground/brand` sheet, clipped at exact pixel sizes; the
 * landing page's pictures are the real product — a round in each world, and
 * the parent dashboard part-way through a journey. Re-run it whenever the
 * character, a world or the dashboard changes, and the marketing cannot
 * drift from the app.
 *
 * Writes:
 *   public/icons/icon-192.png, icon-512.png, maskable-512.png
 *   src/app/icon.svg                               (favicon: the same head mark, as vector)
 *   src/app/apple-icon.png                         (180×180)
 *   src/app/opengraph-image.png                    (1200×630)
 *   public/illustrations/landing/round-*.webp      (390×560, phone crop)
 *   public/illustrations/landing/parent-dashboard.webp
 *
 * Expects a server already running (`npm run build && npm start -- -p 4310`).
 *
 *   node scripts/make-brand-assets.mjs [origin]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { applyViewport, clickAt, evaluate, openBrowser, settle, visit } from "./cdp.mjs";

/* Read from the product rather than repeated: the language the assets are
   photographed in is the language the landing page opens in. */
const DEFAULT_LOCALE = (
  await readFile(new URL("../src/lib/i18n/locale.ts", import.meta.url), "utf8")
).match(/DEFAULT_LOCALE: Locale = "(\w+)"/)?.[1];
if (!DEFAULT_LOCALE) throw new Error("could not read DEFAULT_LOCALE from lib/i18n/locale.ts");

const ORIGIN = process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";
const ROOT = new URL("..", import.meta.url).pathname;
const ICONS = join(ROOT, "public/icons");
const LANDING = join(ROOT, "public/illustrations/landing");
mkdirSync(ICONS, { recursive: true });
mkdirSync(LANDING, { recursive: true });

const { cdp, sessionId, close } = await openBrowser(9348);
const js = (expression) => evaluate(cdp, sessionId, expression);

/** The box an element occupies, in CSS pixels of the current viewport. */
const boxOf = (selector) =>
  js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "start", behavior: "instant" });
    const b = el.getBoundingClientRect();
    return { x: b.x + window.scrollX, y: b.y + window.scrollY, width: b.width, height: b.height };
  })()`);

/** Photograph one element at a given output width (scale = width / css width). */
async function shoot(selector, { width, format = "png", quality } = {}) {
  const box = await boxOf(selector);
  if (!box) throw new Error(`nothing at ${selector}`);
  const scale = width ? width / box.width : 1;
  const { data } = await cdp.send(
    "Page.captureScreenshot",
    { format, quality, clip: { ...box, scale }, captureBeyondViewport: true },
    sessionId,
  );
  return Buffer.from(data, "base64");
}

const written = [];
const save = (path, buffer) => {
  writeFileSync(path, buffer);
  written.push(`${path.replace(ROOT, "")}  ${(buffer.length / 1024).toFixed(0)} KB`);
};

/* ---- Icons and the social card ----------------------------------------- */
await applyViewport(cdp, sessionId, { width: 1400, height: 900, mobile: false });
await visit(cdp, sessionId, `${ORIGIN}/playground/brand`, 1500);
/* Fonts are swapped in after first paint; wait for them before photographing text. */
await js("document.fonts.ready");
await settle(cdp, sessionId, 300);

for (const [name, size] of [["icon-512", 512], ["icon-192", 192]]) {
  save(join(ICONS, `${name}.png`), await shoot('[data-asset="icon"]', { width: size }));
}
save(join(ICONS, "maskable-512.png"), await shoot('[data-asset="maskable"]', { width: 512 }));
save(join(ROOT, "src/app/apple-icon.png"), await shoot('[data-asset="maskable"]', { width: 180 }));
save(join(ROOT, "src/app/opengraph-image.png"), await shoot('[data-asset="og"]', { width: 1200 }));

/* The favicon is the rig's own markup — every fill is a literal hex, so the
   SVG stands alone — centred on a rounded square of paper. */
{
  const inner = await js(`(() => {
    const svg = document.querySelector('[data-asset="icon"] svg');
    const clone = svg.cloneNode(true);
    for (const el of clone.querySelectorAll("[style]")) el.removeAttribute("style");
    return { viewBox: clone.getAttribute("viewBox"), body: clone.innerHTML };
  })()`);
  const favicon = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '  <rect width="64" height="64" rx="14" fill="#faf5ec"/>',
    `  <svg x="7" y="7" width="50" height="50" viewBox="${inner.viewBox}">${inner.body}</svg>`,
    "</svg>",
    "",
  ].join("\n");
  save(join(ROOT, "src/app/icon.svg"), Buffer.from(favicon));
}

/* ---- A round in each world, on a phone --------------------------------- */
const ROUNDS = [
  ["counting", "/worlds/counting/count-the-apples"],
  ["animals", "/worlds/animals/find-the-home"],
  ["words", "/worlds/words/rhyming-friends"],
];
await applyViewport(cdp, sessionId, { width: 390, height: 560, mobile: true });
/* The pictures go on a page that opens in KIDDO's default language, so they
   are photographed in it. Written before the first visit and left in place for
   the dashboard shot too, because a Malay landing page showing an English
   screenshot is the drift this whole script exists to prevent. */
await visit(cdp, sessionId, `${ORIGIN}/`, 400);
await js(`localStorage.setItem("kiddo.locale.v1", ${JSON.stringify(DEFAULT_LOCALE)})`);
for (const [world, path] of ROUNDS) {
  await visit(cdp, sessionId, `${ORIGIN}${path}`, 1200);
  await js("document.fonts.ready");
  const go = await js(`(() => {
    const b = document.querySelector("[data-round-start]");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!go) throw new Error(`${world}: no way into the round`);
  await clickAt(cdp, sessionId, go);
  /* Long enough for the things on the board to have popped in and settled. */
  await settle(cdp, sessionId, 2600);
  const { data } = await cdp.send(
    "Page.captureScreenshot",
    { format: "webp", quality: 88, clip: { x: 0, y: 0, width: 390, height: 560, scale: 2 } },
    sessionId,
  );
  save(join(LANDING, `round-${world}.webp`), Buffer.from(data, "base64"));
}

/* ---- The parent dashboard, part-way through ---------------------------- */
await applyViewport(cdp, sessionId, { width: 1040, height: 900, mobile: false });
await visit(cdp, sessionId, `${ORIGIN}/parents`, 400);
await js(`localStorage.setItem("kiddo.child.name.v1", "Noah")`);
await js(`localStorage.setItem("kiddo.journey.v1", ${JSON.stringify(JSON.stringify({
  completed: ["counting.count-the-apples", "counting.count-the-flowers", "animals.find-the-home"],
  last: "animals.find-the-home",
}))})`);
await visit(cdp, sessionId, `${ORIGIN}/parents`, 1200);
await js("document.fonts.ready");
{
  /* From the top of the overview card to the bottom of the world cards. */
  const top = await boxOf('[aria-labelledby="overview-heading"]');
  const worlds = await boxOf("[data-parent-worlds]");
  const topAgain = await boxOf('[aria-labelledby="overview-heading"]');
  const height = worlds.y + worlds.height - topAgain.y;
  const { data } = await cdp.send(
    "Page.captureScreenshot",
    {
      format: "webp",
      quality: 88,
      clip: { x: top.x - 8, y: topAgain.y - 8, width: top.width + 16, height: height + 16, scale: 1.5 },
      captureBeyondViewport: true,
    },
    sessionId,
  );
  save(join(LANDING, "parent-dashboard.webp"), Buffer.from(data, "base64"));
}
await js(`localStorage.clear()`);

await close();
console.log(written.join("\n"));
