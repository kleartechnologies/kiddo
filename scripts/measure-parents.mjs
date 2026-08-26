/**
 * Measures the Phase 6 parent experience, in a real browser.
 *
 * One grown-up, at the end of the day, opening the parent side of KIDDO:
 *
 *    1 empty            a fresh device: not started, every world untouched,
 *                       next up is the first door, nothing recent
 *    2 partial          a half-finished journey written to storage: the
 *                       numbers, the bars, the recent list and next up all
 *                       agree with the record
 *    3 full             every door finished: complete everywhere, no next
 *    4 reset · cancel   the dialog opens, Cancel takes focus, nothing changes
 *    5 reset · confirm  confirm empties the journey on disk and on screen,
 *                       and the child's home and world pages agree
 *    6 navigation       "Open KIDDO" lands on the child's home; the child's
 *                       "For grown-ups" lands back here
 *    7 eight viewports  no sideways scroll, nothing clipped, every target
 *                       48px, on the dashboard in each state
 *    8 reduced motion   the same dashboard, at once
 *    9 accessibility    one h1, labelled sections, progress bars with
 *                       values, the dialog is a dialog, keyboard reaches it
 *   10 console          nothing logged
 *
 * Expects the account-free measuring server on port 4310:
 *
 *     npm run measure:serve
 *
 * That is a production build with the NEXT_PUBLIC_FIREBASE_* variables
 * unset, which is a mode KIDDO ships rather than a rig — see
 * `scripts/measure-serve.mjs`. Pointed at a configured server this exits
 * 2 and says so, because the way past a real sign-in form is a different
 * server and never a weaker gate.
 *
 *   node scripts/measure-parents.mjs [--quick] [--shots=DIR] [origin]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  VIEWPORTS,
  applyViewport,
  clickAt,
  evaluate,
  openBrowser,
  settle,
  visit,
} from "./cdp.mjs";
import { announce, requireAccountFree } from "./measure-mode.mjs";

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes("--quick");
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const MIN_TOUCH = 48;
const screens = QUICK ? [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]] : VIEWPORTS;

const PARTIAL = {
  completed: ["counting.count-the-apples", "counting.count-the-flowers", "animals.find-the-home"],
  last: "animals.find-the-home",
};
const ALL_DOORS = [
  "counting.count-the-apples", "counting.count-the-flowers", "counting.find-the-number",
  "animals.find-the-home", "animals.who-lives-here", "animals.land-or-sea",
  "words.alphabet-adventure", "words.rhyming-friends", "words.word-discovery",
];
/* Every door finished at every size — with tiers, "full" means the child took
   every bigger challenge too, which is what ticks every concept. */
const FULL = { completed: ALL_DOORS, medium: ALL_DOORS, hard: ALL_DOORS, last: ALL_DOORS.at(-1) };

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => {
      const line = args.join(" ");
      /* Motion warns, informationally, that reduced motion is on — which is
         the very thing section 8 turns on. Advice to a developer, not a
         problem with the page; everything else is kept. The same filter as
         \`measure-visual.mjs\` and \`measure-journey.mjs\`. */
      if (!line.includes("motion.dev/troubleshooting/reduced-motion")) {
        window.__trouble.push(line);
      }
      real(...args);
    };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

let failures = 0;
const troubleSeen = [];
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`  ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};
const section = (title) => console.log(`\n${title}`);

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const { cdp, sessionId, close } = await openBrowser(9347);
const mode = await requireAccountFree(cdp, sessionId, ORIGIN);
announce(mode);
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);

const reduce = (on) =>
  cdp.send(
    "Emulation.setEmulatedMedia",
    { features: on ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [] },
    sessionId,
  );

async function shoot(name) {
  if (!SHOTS) return;
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
}

const js = (expression) => evaluate(cdp, sessionId, expression);
const trouble = async () => {
  const got = await js("window.__trouble ? window.__trouble.splice(0) : []");
  troubleSeen.push(...got);
  return got;
};
const go = async (path, ms = 800) => {
  await trouble();
  await visit(cdp, sessionId, `${ORIGIN}${path}`, ms);
};
const rect = (selector) =>
  js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
async function tap(selector) {
  const at = await rect(selector);
  if (!at) throw new Error(`nothing at ${selector}`);
  await clickAt(cdp, sessionId, at);
}
const text = (selector) =>
  js(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? null`);
const path = () => js("location.pathname");
const setJourney = (journey) =>
  js(`localStorage.setItem("kiddo.journey.v1", ${JSON.stringify(JSON.stringify(journey))})`);
const storedJourney = () => js(`JSON.parse(localStorage.getItem("kiddo.journey.v1") ?? "null")`);

const FRAME = `(() => {
  const page = document.scrollingElement;
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
  const controls = [...document.querySelectorAll("a[href], button, input")]
    .filter((el) => el.getBoundingClientRect().width > 0 && !el.closest("dialog"));
  const rects = controls.map((el) => el.getBoundingClientRect());
  const small = controls
    .filter((el, i) => rects[i].width < ${MIN_TOUCH} - 0.5 || rects[i].height < ${MIN_TOUCH} - 0.5)
    .map((el) => name(el).slice(0, 24) + " " + Math.round(el.getBoundingClientRect().width) + "×" + Math.round(el.getBoundingClientRect().height));
  const unnamed = controls.filter((el) => !name(el) && !el.getAttribute("aria-label") && el.tagName !== "INPUT").length;
  const clipped = rects.filter((r) => r.left < -0.5 || r.right > innerWidth + 0.5).length;
  const art = [...document.querySelectorAll("svg")];
  const loudArt = art.filter((s) => {
    let a = s;
    while (a && a !== document.body) {
      if (a.getAttribute("aria-hidden") === "true" || a.getAttribute("role") === "img") return false;
      a = a.parentElement;
    }
    return true;
  }).length;
  /* Cards overlapping: any two world cards whose boxes intersect. */
  const cards = [...document.querySelectorAll("[data-parent-world]")].map((c) => c.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
  }
  /* Text clipped: any element with overflow hidden whose scrollWidth exceeds it, ignoring scenes/bars. */
  const clippedText = [...document.querySelectorAll("main p, main h1, main h2, main h3, main dd, main dt, main li")]
    .filter((el) => !el.closest("[data-world-scene]") && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible" && !el.classList.contains("truncate")).length;
  return {
    sideways: page.scrollWidth - page.clientWidth,
    small, unnamed, clipped, loudArt, overlaps, clippedText,
    h1: document.querySelectorAll("h1").length,
    controls: controls.length,
  };
})()`;

async function frameProblems(expectControls = 1) {
  const f = await js(FRAME);
  const problems = [];
  if (f.sideways > 0) problems.push(`scrolls sideways ${f.sideways}px`);
  if (f.clipped) problems.push(`${f.clipped} control(s) off the edge`);
  if (f.small.length) problems.push(`under 48px: ${f.small.join(", ")}`);
  if (f.unnamed) problems.push(`${f.unnamed} unnamed control(s)`);
  if (f.loudArt) problems.push(`${f.loudArt} svg(s) not hidden from readers`);
  if (f.overlaps) problems.push(`${f.overlaps} overlapping world card(s)`);
  if (f.clippedText) problems.push(`${f.clippedText} clipped text block(s)`);
  if (f.h1 !== 1) problems.push(`${f.h1} h1`);
  if (f.controls < expectControls) problems.push(`only ${f.controls} controls`);
  return problems;
}

const DASH = `(() => ({
  overview: document.querySelector("[data-parent-overview]")?.textContent.trim(),
  stats: [...document.querySelectorAll("[data-parent-summary] dd")].map((d) => d.textContent.replace(/\\s+/g, " ").trim()),
  worlds: [...document.querySelectorAll("[data-parent-world]")].map((w) => ({
    id: w.dataset.parentWorld, state: w.dataset.parentWorldState,
    label: w.querySelector("[data-parent-world-label]")?.textContent.trim(),
    bar: w.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    width: w.querySelector('[role="progressbar"] > div')?.style.width,
  })),
  recent: [...document.querySelectorAll("[data-parent-recent] li p:first-child")].map((p) => p.textContent.trim()),
  recentEmpty: !!document.querySelector("[data-parent-recent-empty]"),
  next: document.querySelector("[data-parent-next] p")?.textContent.trim() ?? null,
  nextHref: document.querySelector("[data-parent-next-link]")?.getAttribute("href") ?? null,
  nextDone: !!document.querySelector("[data-parent-next-done]"),
  practised: [...document.querySelectorAll("[data-concept-practised='yes']")].map((c) => c.dataset.concept),
  tiers: [...document.querySelectorAll("[data-parent-tiers]")].map((t) => t.textContent.trim()),
  concepts: document.querySelectorAll("[data-concept]").length,
  greeting: document.querySelector("h1")?.textContent.trim(),
}))()`;

/* ======================================================================== */

await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await go("/play", 600);
await js("localStorage.clear(); sessionStorage.clear();");
await js(`localStorage.setItem("kiddo.child.name.v1", "Noah")`);

section("1 · empty journey");
{
  await go("/parents", 900);
  const d = await js(DASH);
  const problems = [];
  if (!/^Good (morning|afternoon|evening)$/.test(d.greeting ?? "")) problems.push(`greeting "${d.greeting}"`);
  if (d.overview !== "The adventure has not started yet.") problems.push(`overview "${d.overview}"`);
  if (d.stats.join("|") !== "0 / 9|0 / 9|0 / 3") problems.push(`stats ${d.stats.join("|")}`);
  if (!d.worlds.every((w) => w.state === "untouched" && w.bar === "0")) problems.push("worlds not untouched");
  if (!d.recentEmpty) problems.push("recent not empty");
  if (d.next !== "Count the Apples") problems.push(`next "${d.next}"`);
  if (d.nextHref !== "/worlds/counting/count-the-apples") problems.push(`next href ${d.nextHref}`);
  if (d.practised.length) problems.push("concepts ticked on empty");
  if (d.concepts < 6) problems.push(`only ${d.concepts} concepts`);
  const child = await text("[data-parent-child]");
  if (!/Noah/.test(child ?? "")) problems.push("child name missing");
  report(`empty: "${d.overview}" · ${d.stats.join(" · ")} · next ${d.next} · ${d.concepts} concepts`, problems);
  await shoot("01-empty");
}

section("2 · partial journey");
{
  await setJourney(PARTIAL);
  await go("/parents", 900);
  const d = await js(DASH);
  const problems = [];
  if (d.overview !== "3 activities completed across 2 worlds.") problems.push(`overview "${d.overview}"`);
  if (d.stats.join("|") !== "3 / 9|3 / 9|2 / 3") problems.push(`stats ${d.stats.join("|")}`);
  const byId = Object.fromEntries(d.worlds.map((w) => [w.id, w]));
  if (byId.counting?.label !== "2 of 3 activities explored" || byId.counting.bar !== "2") problems.push(`counting ${JSON.stringify(byId.counting)}`);
  if (byId.animals?.label !== "1 of 3 activities explored" || byId.animals.state !== "started") problems.push(`animals ${JSON.stringify(byId.animals)}`);
  if (byId.words?.state !== "untouched") problems.push(`words ${JSON.stringify(byId.words)}`);
  if (byId.counting?.width !== "67%") problems.push(`counting bar width ${byId.counting?.width}`);
  if (d.recent.join("|") !== "Find the Home|Count the Flowers|Count the Apples") problems.push(`recent ${d.recent.join("|")}`);
  if (d.next !== "Who Lives Here?") problems.push(`next "${d.next}"`);
  if (!d.practised.includes("math.counting") || d.practised.includes("math.number-recognition")) problems.push(`practised ${d.practised.join(",")}`);
  /* An old two-field journey migrates as Easy done — the tier line says so. */
  if (d.tiers.length !== 3 || !d.tiers.every((t) => t === "Completed Easy.")) problems.push(`tier lines ${d.tiers.join("|")}`);
  report(`partial: "${d.overview}" · recent ${d.recent.join(", ")} · next ${d.next}`, problems);
  await shoot("02-partial");

  /* And the child's home agrees about what is next. */
  await go("/play", 900);
  const home = await js(`document.querySelector("[data-continue-link]")?.getAttribute("href")`);
  report(`child home Continue → ${home}`, home === "/worlds/animals/who-lives-here" ? [] : ["home and dashboard disagree"]);
}

section("3 · full journey");
{
  await setJourney(FULL);
  await go("/parents", 900);
  const d = await js(DASH);
  const problems = [];
  if (d.overview !== "Every activity completed across all 3 worlds.") problems.push(`overview "${d.overview}"`);
  if (d.stats.join("|") !== "9 / 9|9 / 9|3 / 3") problems.push(`stats ${d.stats.join("|")}`);
  if (!d.worlds.every((w) => w.state === "complete" && w.width === "100%")) problems.push("worlds not complete");
  if (!d.nextDone || d.next) problems.push("next up not closed");
  if (d.practised.length !== d.concepts) problems.push(`${d.practised.length}/${d.concepts} ticked`);
  if (d.recent.length !== 3) problems.push(`recent ${d.recent.length}`);
  if (!d.tiers.length || !d.tiers.every((t) => t === "Completed Easy, Medium and Hard.")) problems.push(`tier lines ${d.tiers.join("|")}`);
  report(`full: "${d.overview}" · all ${d.concepts} concepts ticked`, problems);
  await shoot("03-full");
}

section("4 · reset, cancelled");
{
  await setJourney(PARTIAL);
  await go("/parents", 900);
  await tap("[data-reset-open]");
  await settle(cdp, sessionId, 300);
  const open = await js(`(() => { const d = document.querySelector("[data-reset-dialog]"); return { open: d?.open, focus: document.activeElement?.dataset.resetCancel !== undefined, title: d?.querySelector("h2")?.textContent, modal: d?.matches(":modal") }; })()`);
  const problems = [];
  if (!open.open) problems.push("dialog did not open");
  if (!open.modal) problems.push("dialog not modal");
  if (!open.focus) problems.push("Cancel not focused");
  if (!/Reset Noah’s journey\?/.test(open.title ?? "")) problems.push(`title "${open.title}"`);
  await shoot("04-reset-dialog");
  await tap("[data-reset-cancel]");
  await settle(cdp, sessionId, 300);
  const after = await js(`document.querySelector("[data-reset-dialog]")?.open`);
  const stored = await storedJourney();
  if (after) problems.push("dialog still open after cancel");
  if (stored?.completed?.length !== 3) problems.push("cancel changed the journey");
  /* Escape also closes and changes nothing. */
  await tap("[data-reset-open]");
  await settle(cdp, sessionId, 200);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await settle(cdp, sessionId, 200);
  if (await js(`document.querySelector("[data-reset-dialog]")?.open`)) problems.push("Escape did not close");
  if ((await storedJourney())?.completed?.length !== 3) problems.push("Escape changed the journey");
  report(`dialog "${open.title}" · cancel and Escape leave 3 doors finished`, problems);
}

section("5 · reset, confirmed");
{
  await tap("[data-reset-open]");
  await settle(cdp, sessionId, 200);
  await tap("[data-reset-confirm]");
  await settle(cdp, sessionId, 400);
  const d = await js(DASH);
  const stored = await storedJourney();
  const status = await text("[data-reset-status]");
  const problems = [];
  if (stored?.completed?.length !== 0 || stored?.last !== null) problems.push(`storage ${JSON.stringify(stored)}`);
  if (d.overview !== "The adventure has not started yet.") problems.push(`overview "${d.overview}"`);
  if (!d.worlds.every((w) => w.state === "untouched")) problems.push("worlds not reset on screen");
  if (d.next !== "Count the Apples") problems.push(`next "${d.next}"`);
  if (!d.recentEmpty) problems.push("recent not emptied");
  if (d.practised.length) problems.push("concepts still ticked");
  if (!/has been reset/.test(status ?? "")) problems.push(`status "${status}"`);
  if (await js(`document.querySelector("[data-reset-dialog]")?.open`)) problems.push("dialog still open");
  const name = await js(`localStorage.getItem("kiddo.child.name.v1")`);
  if (name !== "Noah") problems.push("reset lost the child's name");
  report(`confirmed: storage ${JSON.stringify(stored)} · "${status}"`, problems);
  await shoot("05-reset-done");

  await go("/play", 900);
  const home = await js(`(() => ({ mode: document.querySelector("[data-continue]")?.dataset.continue, href: document.querySelector("[data-continue-link]")?.getAttribute("href"), stickers: document.querySelector('[aria-label$="earned"]') ? "yes" : "no" }))()`);
  report(`child home after reset: ${home.mode} → ${home.href}, stickers ${home.stickers}`, home.mode === "start" && home.href === "/worlds/counting/count-the-apples" && home.stickers === "no" ? [] : ["home did not reset"]);
  await go("/worlds/counting", 1100);
  const doors = await js(`[...document.querySelectorAll("[data-world-activity]")].map((d) => d.dataset.worldActivityStatus)`);
  report(`counting doors after reset: ${doors.join(", ")}`, doors.join(",") === "next,new,new" ? [] : ["world doors not reset"]);
}

section("6 · navigation");
{
  await go("/parents", 800);
  await tap("[data-open-kiddo]");
  await settle(cdp, sessionId, 900);
  const p1 = await path();
  report(`"Open KIDDO" → ${p1}`, p1 === "/play" ? [] : ["did not land on the child's home"]);
  await tap('a[href="/parents"]');
  await settle(cdp, sessionId, 900);
  const p2 = await path();
  report(`"For grown-ups" → ${p2}`, p2 === "/parents" ? [] : ["did not land on the parent side"]);
  const distinct = await js(`(() => ({ hero: !!document.querySelector("[data-continue]"), music: !!document.querySelector('[aria-label*="sound" i]'), badge: /Parent area/.test(document.querySelector("header")?.textContent ?? "") }))()`);
  report(`parent page has no child hero (${distinct.hero}), no sound toggle (${distinct.music}), says Parent area (${distinct.badge})`, !distinct.hero && !distinct.music && distinct.badge ? [] : ["parent page looks like the child's"]);
  const nextLink = await js(`document.querySelector("[data-parent-next-link]")?.textContent.trim()`);
  report(`next-up action is explicit: "${nextLink}"`, nextLink === "Open activity" ? [] : ["next-up action unclear"]);
}

section("7 · eight viewports");
{
  for (const viewport of screens) {
    await applyViewport(cdp, sessionId, viewport);
    const tag = viewport.name.replace(/[^\w]+/g, "-");
    for (const [state, journey] of [["empty", { completed: [], last: null }], ["partial", PARTIAL], ["full", FULL]]) {
      await setJourney(journey);
      await go("/parents", 900);
      const wide = await js(`(() => { const m = document.querySelector("main"); return Math.round(m.getBoundingClientRect().width); })()`);
      report(`${viewport.name} · ${state} (main ${wide}px)`, await frameProblems(6));
      if (state === "partial") await shoot(`vp-${tag}`);
    }
  }
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);
}

section("8 · reduced motion");
{
  await reduce(true);
  await setJourney(PARTIAL);
  await go("/parents", 300);
  const d = await js(DASH);
  const visible = await js(`(() => { const el = document.querySelector("[data-parent-overview]"); const s = getComputedStyle(el); return s.opacity === "1" && s.visibility === "visible"; })()`);
  report(`dashboard at once: "${d.overview}", bars ${d.worlds.map((w) => w.width).join("/")}`, d.overview === "3 activities completed across 2 worlds." && visible ? [] : ["not visible immediately"]);
  await shoot("08-reduced");
  await reduce(false);
}

section("9 · accessibility");
{
  await setJourney(PARTIAL);
  await go("/parents", 900);
  const a = await js(`(() => {
    const sections = [...document.querySelectorAll("main section")];
    const labelled = sections.filter((s) => s.getAttribute("aria-labelledby") && document.getElementById(s.getAttribute("aria-labelledby"))).length;
    const bars = [...document.querySelectorAll('[role="progressbar"]')].map((b) => ({ now: b.getAttribute("aria-valuenow"), max: b.getAttribute("aria-valuemax"), text: b.getAttribute("aria-valuetext"), label: b.getAttribute("aria-label") }));
    const dialog = document.querySelector("[data-reset-dialog]");
    const headings = [...document.querySelectorAll("h1, h2, h3")].map((h) => h.tagName);
    let order = true;
    let level = 0;
    for (const h of headings) { const n = +h[1]; if (n > level + 1) order = false; level = n; }
    return {
      sections: sections.length, labelled, bars,
      dialogLabelled: !!dialog?.getAttribute("aria-labelledby") && !!document.getElementById(dialog.getAttribute("aria-labelledby")),
      live: document.querySelectorAll("[aria-live]").length,
      order, h1: document.querySelectorAll("h1").length,
      lang: document.documentElement.lang,
      input: !!document.querySelector("input[id]") && !!document.querySelector("label[for]"),
    };
  })()`);
  const problems = [];
  if (a.labelled !== a.sections) problems.push(`${a.labelled}/${a.sections} sections labelled`);
  if (a.bars.length !== 3 || !a.bars.every((b) => b.now && b.max && b.text && b.label)) problems.push("progress bars unlabelled");
  if (!a.dialogLabelled) problems.push("dialog unlabelled");
  if (a.live < 1) problems.push("no live region");
  if (!a.order) problems.push("heading levels skip");
  if (a.h1 !== 1) problems.push(`${a.h1} h1`);
  if (!a.input) problems.push("name input unlabelled");
  report(`${a.sections} labelled sections · bars ${a.bars.map((b) => b.text).join(" | ")} · headings in order ${a.order}`, problems);

  /* Keyboard: Tab reaches the reset button and Enter opens the dialog. */
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    reached = await js(`document.activeElement?.hasAttribute("data-reset-open") ?? false`);
  }
  const ring = reached ? await js(`(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; })()`) : false;
  report(`keyboard reaches Reset progress (${reached}) with a visible focus ring (${ring})`, reached && ring ? [] : ["reset not reachable or ring invisible"]);
  const contrast = await js(`(() => {
    const lum = (c) => { const [r,g,b] = c.match(/\\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126*r + 0.7152*g + 0.0722*b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const bg = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !c.endsWith(", 0)") && c !== "transparent") return c; e = e.parentElement; } return "rgb(251, 248, 243)"; };
    const els = [...document.querySelectorAll("main p, main h2, main h3, main dt, main dd, main span, main a, main button")].filter((e) => e.textContent.trim() && e.getBoundingClientRect().height > 0 && !e.closest("dialog") && !e.classList.contains("sr-only"));
    const worst = els.map((e) => ({ t: e.textContent.trim().slice(0, 20), r: ratio(getComputedStyle(e).color, bg(e)) })).sort((a, b) => a.r - b.r)[0];
    return worst;
  })()`);
  report(`lowest text contrast ${contrast.r.toFixed(2)}:1 ("${contrast.t}")`, contrast.r >= 4.5 ? [] : ["below AA"]);
}

section("10 · console");
{
  const late = await trouble();
  const all = troubleSeen.concat(late);
  report(`${all.length} error/warning line(s) across the parent journey`, all.length ? all.slice(0, 4).map((t) => t.slice(0, 120)) : []);
}

await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
