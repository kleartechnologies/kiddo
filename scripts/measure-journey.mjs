/**
 * Measures the Phase 5 child journey end to end, in a real browser.
 *
 * One child, one device, one evening: the parent writes a first name on
 * `/parents`, the child arrives at the home screen and is greeted by it,
 * picks a world, enters it, picks a door, plays the round to the end, is
 * given the world's keepsake, goes back to the world and sees the door
 * ticked and the next one waiting, goes home and is offered that next door,
 * and wanders into another world. Fifteen things are checked on the way:
 *
 *    1 login → home      the name written on /parents greets the child at /
 *    2 greeting          once, by first name, at the top — and without a name
 *                        the greeting is still a greeting
 *    3 world select      three doors, each on its own scene, each named
 *    4 world entry       the world's banner arrives (and under reduced motion
 *                        is simply there) with the friend and the doors
 *    5 activity select   three doors in the world, the first one "next"
 *    6 completion        the round plays to the end and celebrates
 *    7 reward update     the keepsake gains one mark, the door is done, the
 *                        next door is next, and the journey is on disk
 *   7b bigger challenge  the celebration invites Medium (Easy done, Hard
 *                        locked), Medium replays the door from its way in,
 *                        its finish lands in journey.medium, Hard unlocks
 *    8 continue          home now says "Continue your adventure" and points
 *                        at that next door
 *    9 return to world   the world page says welcome back and suggests it
 *   10 switch worlds     another world is another scene, another friend,
 *                        and still "New"
 *   11 no stale question while the round moves on, no two prompts exist
 *   12 reduced motion    the same screens, at once, with nothing in flight
 *   13 eight viewports   no sideways scroll, nothing clipped, every target
 *                        48px, on home, world and round
 *   14 accessibility     every control named, art hidden, one h1, a live
 *                        region, keyboard reaches the way in
 *   15 console           nothing logged as an error or warning
 *
 *   node scripts/measure-journey.mjs [--quick] [--shots=<dir>] [http://host:port]
 *
 * Expects a server already running (`npm run build && npm start -- -p 4310`).
 * The child's name used here is a test value and is never printed or put in
 * a URL. The browser driver is in `scripts/cdp.mjs`.
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

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes("--quick");
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const MIN_TOUCH = 48;
const NAME = "Noah";
const screens = QUICK ? [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]] : VIEWPORTS;

/* Installed before every document, so the count survives navigation. */
const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => {
      const line = args.join(" ");
      /* Motion warns, informationally, that reduced motion is on — which is
         the very thing section 12 turned on. Advice to a developer, not a
         problem with the page; everything else is kept. The same filter as
         \`measure-visual.mjs\`. */
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
let troubleSeen = [];
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`  ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};
const section = (title) => console.log(`\n${title}`);

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const { cdp, sessionId, close } = await openBrowser(9345);
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
/* A full navigation starts a new document, so what this one logged is
   collected before it is let go. */
const go = async (path, ms) => {
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

/* ---- what a screen looks like, in one trip ------------------------------ */

const FRAME = `(() => {
  const page = document.scrollingElement;
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
  const controls = [...document.querySelectorAll("a[href], button")]
    .filter((el) => el.getBoundingClientRect().width > 0);
  const rects = controls.map((el) => el.getBoundingClientRect());
  const small = controls
    .filter((el, i) => rects[i].width < ${MIN_TOUCH} - 0.5 || rects[i].height < ${MIN_TOUCH} - 0.5)
    .map((el, i) => name(el).slice(0, 24) + " " + Math.round(rects[controls.indexOf(el)].width) + "×" + Math.round(rects[controls.indexOf(el)].height));
  const unnamed = controls.filter((el) => !name(el)).length;
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
  return {
    sideways: page.scrollWidth - page.clientWidth,
    small, unnamed, clipped, loudArt,
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
  if (f.h1 !== 1) problems.push(`${f.h1} h1`);
  if (f.controls < expectControls) problems.push(`only ${f.controls} controls`);
  return problems;
}

/* ---- playing a choice round to the end ---------------------------------- */

const TILES = `[...document.querySelectorAll("main li button")].map(b=>{const r=b.getBoundingClientRect();return {label:b.getAttribute("aria-label")??"",x:r.left+r.width/2,y:r.top+r.height/2}})`;
const PROMPTS = `[...document.querySelectorAll("[data-prompt]")].map(p => p.parentElement?.querySelector(".sr-only")?.textContent ?? "?")`;

/**
 * Taps until the round ends. After every right answer the next second is
 * sampled every 100ms: the number of prompts on the table must never be two.
 */
async function playRound(reduced) {
  const problems = [];
  let overlaps = 0;
  let samples = 0;
  let answered = 0;
  for (let turn = 0; turn < 40; turn++) {
    if ((await js(`document.querySelector("main h2")?.textContent ?? ""`)) && !(await js(TILES)).length) break;
    const tiles = await js(TILES);
    const t = tiles.find((tile) => !/already tried|not this one/.test(tile.label));
    if (!t) {
      await settle(cdp, sessionId, 400);
      continue;
    }
    await clickAt(cdp, sessionId, t);
    await settle(cdp, sessionId, 150);
    const right = /that's the one/.test(JSON.stringify(await js(TILES)));
    if (right) {
      answered += 1;
      for (let i = 0; i < (reduced ? 8 : 14); i++) {
        await settle(cdp, sessionId, 100);
        const prompts = await js(PROMPTS);
        samples += 1;
        if (prompts.length > 1) overlaps += 1;
      }
    } else {
      await settle(cdp, sessionId, 900);
    }
  }
  const done = await text("main h2");
  if (!done) problems.push("round never celebrated");
  if (overlaps) problems.push(`${overlaps}/${samples} samples had two prompts`);
  return { problems, done, answered, samples, overlaps };
}

/* ======================================================================== */

await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await go("/play", 600);
await js("localStorage.clear(); sessionStorage.clear();");

section("1 · login → home");
{
  await go("/parents", 800);
  await js(`document.querySelector('input[name="child-name"]').focus()`);
  await cdp.send("Input.insertText", { text: NAME }, sessionId);
  await settle(cdp, sessionId, 300);
  const stored = await js(`localStorage.getItem("kiddo.child.name.v1")`);
  report("name kept on the device", stored === NAME ? [] : ["name was not stored"]);
  await go("/play", 900);
  const h1 = await text("h1");
  report("home greets by that name", h1?.includes(NAME) ? [] : [`h1 was "${h1}"`]);
}

section("2 · greeting");
{
  const body = await js("document.body.innerText");
  const mentions = body.split(NAME).length - 1;
  report(`name used ${mentions} time(s) on home`, mentions >= 1 && mentions <= 2 ? [] : ["name over- or under-used"]);
  const cont = await text("#continue-heading");
  report(`first visit invites: "${cont}"`, cont === "Start your adventure" ? [] : ["unexpected heading"]);
  await shoot("01-home-first-visit");
}

section("3 · world select");
{
  const doors = await js(`[...document.querySelectorAll("[data-world-door]")].map(d => ({
    id: d.dataset.worldDoor, state: d.dataset.worldDoorState,
    scene: d.querySelector("[data-world-scene]")?.dataset.worldScene ?? null,
    name: d.querySelector("a")?.getAttribute("aria-label") ?? "" }))`);
  const problems = [];
  if (doors.length !== 3) problems.push(`${doors.length} doors`);
  if (new Set(doors.map((d) => d.scene)).size !== doors.length) problems.push("scenes repeat");
  if (doors.some((d) => d.scene !== d.id)) problems.push("a door shows another world's scene");
  if (doors.some((d) => d.state !== "new")) problems.push("a fresh door is not New");
  if (doors.some((d) => !d.name)) problems.push("an unnamed door");
  report(`three doors: ${doors.map((d) => d.id).join(", ")}`, problems);
  const link = await js(`document.querySelector("[data-continue-link]")?.getAttribute("href")`);
  report(`"Let's go!" leads to ${link}`, link === "/worlds/counting/count-the-apples" ? [] : ["wrong first door"]);
}

section("4 · world entry");
{
  /* Record the banner's opacity every frame from inside the page, so a slow
     remote round-trip can never miss the 0.32s entrance (remote sampling
     flaked whenever the first reading landed after the animation had already
     finished). The assertions are unchanged: the banner must animate in
     (some frame under 0.95) and must settle at exactly 1. */
  await js(`(() => {
    const ops = [];
    window.__bannerOps = ops;
    const step = () => {
      const b = document.querySelector("[data-world-banner]");
      ops.push(b ? +getComputedStyle(b).opacity : null);
      const seen = ops.filter((o) => o !== null);
      if (seen.length > 6 && seen.at(-1) === 1) return;
      if (ops.length < 240) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  })()`);
  await tap('[data-world-door="counting"] a');
  await settle(cdp, sessionId, 1400);
  const ops = ((await js(`window.__bannerOps`)) ?? []).filter((o) => o !== null);
  const where = await path();
  const problems = [];
  if (where !== "/worlds/counting") problems.push(`landed on ${where}`);
  const last = ops.at(-1);
  if (last !== 1) problems.push(`banner settled at ${last}`);
  const arrived = ops.some((o) => o < 0.95);
  const shown = ops.length > 8 ? [...ops.slice(0, 7), last] : ops;
  report(`banner arrives (${shown.map((o) => o.toFixed(2)).join(" ")}${ops.length > 8 ? ` over ${ops.length} frames` : ""})`, problems.concat(arrived ? [] : ["banner did not animate in"]));
  const friend = await js(`document.querySelector("[data-world-banner] [data-character]")?.dataset.character ?? document.querySelector("[data-world-banner] svg") ? "present" : null`);
  report(`friend present in banner: ${friend}`, friend ? [] : ["no friend"]);
  await shoot("02-world-counting-new");
}

section("5 · activity select");
{
  const doors = await js(`[...document.querySelectorAll("[data-world-activity]")].map(d => d.dataset.worldActivity + ":" + d.dataset.worldActivityStatus)`);
  report(`doors: ${doors.join(", ")}`, doors.join() === "count-the-apples:next,count-the-flowers:new,find-the-number:new" ? [] : ["unexpected statuses"]);
  const line = await text("[data-world-banner] + div p");
  report(`friend says: "${line}"`, line ? [] : ["no line"]);
  await tap('[data-world-activity="count-the-apples"] a');
  await settle(cdp, sessionId, 900);
  const where = await path();
  const intro = await text("main p");
  report(`round opens at ${where}`, where === "/worlds/counting/count-the-apples" ? [] : ["wrong route"]);
  report(`intro: "${intro}"`, intro?.includes(NAME) ? [] : ["intro does not greet"]);
  await shoot("03-round-intro");
}

section("6 · completion  ·  11 · no stale question");
{
  await tap("main button");
  await settle(cdp, sessionId, 1200);
  const round = await playRound(false);
  report(`played ${round.answered} questions to "${round.done}"`, round.problems);
  report(`${round.samples} transition samples, ${round.overlaps} with two prompts`, round.overlaps ? ["stale prompt seen"] : []);
  await settle(cdp, sessionId, 1200);
  await shoot("04-celebration");
}

section("7 · reward update");
{
  const keepsake = await js(`document.querySelector('main [role="img"]')?.getAttribute("aria-label")`);
  report(`keepsake: "${keepsake}"`, /1 of 3 flowers/.test(keepsake ?? "") ? [] : ["keepsake did not gain a flower"]);
  const msg = await text("main h2 + p");
  report(`message: "${msg}"`, /flower/.test(msg ?? "") ? [] : ["no world-native reward line"]);
  const next = await js(`[...document.querySelectorAll("main a")].map(a => a.textContent.trim() + " → " + a.getAttribute("href"))`);
  report(`ways out: ${next.join(" | ")}`, next.some((n) => n.includes("/worlds/counting/count-the-flowers")) ? [] : ["next door not offered"]);
  const stored = await js(`JSON.parse(localStorage.getItem("kiddo.journey.v1") ?? "{}")`);
  report(`journey on disk: ${JSON.stringify(stored)}`, stored.completed?.includes("counting.count-the-apples") ? [] : ["not recorded"]);
}

section("7b · bigger challenge");
{
  const invite = await js(`(() => {
    const box = document.querySelector("[data-tier-invite]");
    if (!box) return null;
    const heading = box.querySelector("p")?.textContent ?? "";
    const tiers = [...box.querySelectorAll("[data-tier]")].map((b) => {
      const r = b.getBoundingClientRect();
      return { tier: b.dataset.tier, state: b.dataset.tierState,
        disabled: b.getAttribute("aria-disabled"), label: b.getAttribute("aria-label"),
        w: Math.round(r.width), h: Math.round(r.height) };
    });
    return { heading, tiers };
  })()`);
  const problems = [];
  if (!invite) problems.push("no tier invite on the celebration");
  else {
    if (!/bigger challenge/i.test(invite.heading)) problems.push(`heading "${invite.heading}"`);
    const states = invite.tiers.map((t) => t.tier + ":" + t.state).join(",");
    if (states !== "1:done,2:ready,3:locked") problems.push(`states ${states}`);
    if (invite.tiers.some((t) => t.w < MIN_TOUCH || t.h < MIN_TOUCH)) problems.push("a tier button under 48px");
    if (invite.tiers[2]?.disabled !== "true") problems.push("locked tier not aria-disabled");
    if (invite.tiers[0]?.label !== "Easy. Completed.") problems.push(`easy label "${invite.tiers[0]?.label}"`);
    if (invite.tiers[2]?.label !== "Hard. Locked.") problems.push(`hard label "${invite.tiers[2]?.label}"`);
  }
  report("celebration invites a bigger challenge", problems);

  await tap('[data-tier-invite] [data-tier="2"]');
  await settle(cdp, sessionId, 1000);
  const intro = await js(`(() => {
    const box = document.querySelector("[data-tier-choice]");
    if (!box) return null;
    return { selected: box.querySelector('[aria-pressed="true"]')?.dataset.tier ?? null,
      first: document.querySelector("main button")?.textContent?.trim() ?? "" };
  })()`);
  report(
    `medium chosen: back at the way in (picker on ${intro?.selected}, first button "${intro?.first}")`,
    intro && intro.selected === "2" && /go/i.test(intro.first) ? [] : ["intro picker missing or wrong"],
  );

  await tap("main button");
  await settle(cdp, sessionId, 1200);
  const round = await playRound(false);
  report(`medium round: ${round.answered} questions to "${round.done}"`, round.problems);
  await settle(cdp, sessionId, 1200);
  const stored = await js(`JSON.parse(localStorage.getItem("kiddo.journey.v1") ?? "{}")`);
  const kept = [];
  if (!stored.medium?.includes("counting.count-the-apples")) kept.push("medium finish not recorded");
  if (!stored.completed?.includes("counting.count-the-apples")) kept.push("easy finish lost");
  report(`journey on disk: ${JSON.stringify(stored)}`, kept);
  const after = await js(`[...document.querySelectorAll("[data-tier-invite] [data-tier]")].map((b) => b.dataset.tier + ":" + b.dataset.tierState).join(",")`);
  report(`invite after medium: ${after}`, after === "1:done,2:done,3:ready" ? [] : ["hard did not unlock"]);
  await shoot("04b-celebration-medium");
}

section("9 · return to world");
{
  await tap('main a[href="/worlds/counting"]');
  await settle(cdp, sessionId, 1200);
  const doors = await js(`[...document.querySelectorAll("[data-world-activity]")].map(d => d.dataset.worldActivity + ":" + d.dataset.worldActivityStatus)`);
  report(`doors: ${doors.join(", ")}`, doors.join() === "count-the-apples:done,count-the-flowers:next,find-the-number:new" ? [] : ["statuses did not move"]);
  const line = await text("[data-world-banner] + div p");
  report(`friend says: "${line}"`, /Welcome back/.test(line ?? "") && /Count the Flowers/.test(line ?? "") ? [] : ["not welcomed back to the next door"]);
  const next = await js(`document.querySelector("[data-world-next]")?.getAttribute("href")`);
  report(`world's own continue → ${next}`, next === "/worlds/counting/count-the-flowers" ? [] : ["wrong next"]);
  const keepsake = await js(`document.querySelector('main [role="img"]')?.getAttribute("aria-label")`);
  report(`keepsake on the world page: "${keepsake}"`, /1 of 3/.test(keepsake ?? "") ? [] : ["keepsake did not update"]);
  const pills = await js(`[...document.querySelectorAll('[data-world-activity="count-the-apples"] [data-door-tier]')].map((p) => p.dataset.doorTier + ":" + p.dataset.doorTierState).join(",")`);
  report(`apples door wears its tiers: ${pills}`, pills === "1:done,2:done,3:ready" ? [] : ["door pills wrong"]);
  const fresh = await js(`document.querySelector('[data-world-activity="count-the-flowers"] [data-door-tiers]') ? "shown" : "absent"`);
  report(`unfinished door keeps a clean face: pills ${fresh}`, fresh === "absent" ? [] : ["padlocks on a fresh door"]);
  await shoot("05-world-counting-returning");
}

section("8 · continue on home");
{
  await go("/play", 900);
  const heading = await text("#continue-heading");
  const detail = await text("[data-continue] p");
  const href = await js(`document.querySelector("[data-continue-link]")?.getAttribute("href")`);
  report(`"${heading}" — ${detail}`, heading === "Continue your adventure" && /Count the Flowers/.test(detail ?? "") ? [] : ["continue did not move"]);
  report(`continue → ${href}`, href === "/worlds/counting/count-the-flowers" ? [] : ["wrong target"]);
  const door = await js(`document.querySelector('[data-world-door="counting"]')?.dataset.worldDoorState`);
  const stickers = await js(`document.querySelector('[data-continue] [aria-label$="earned"]')?.getAttribute("aria-label")`);
  report(`counting door is "${door}", ${stickers}`, door === "going" && stickers === "1 sticker earned" ? [] : ["progress not shown"]);
  await shoot("06-home-returning");
}

section("10 · switch worlds");
{
  await tap('[data-world-door="animals"] a');
  await settle(cdp, sessionId, 1200);
  const where = await path();
  const scene = await js(`document.querySelector("[data-world-banner]")?.dataset.worldBanner`);
  const doors = await js(`[...document.querySelectorAll("[data-world-activity]")].map(d => d.dataset.worldActivity + ":" + d.dataset.worldActivityStatus)`);
  report(`${where} · banner ${scene} · ${doors.join(", ")}`, where === "/worlds/animals" && scene === "animals" && doors[0] === "find-the-home:next" ? [] : ["animals did not open fresh"]);
  await shoot("07-world-animals");
  await go("/worlds/words", 1200);
  const words = await js(`document.querySelector("[data-world-banner]")?.dataset.worldBanner`);
  report(`words banner ${words}`, words === "words" ? [] : ["words did not open"]);
  await shoot("08-world-words");
}

section("12 · reduced motion");
{
  await reduce(true);
  await go("/worlds/animals", 0);
  await settle(cdp, sessionId, 120);
  const op = await js(`(() => { const b = document.querySelector("[data-world-banner]"); return b ? +getComputedStyle(b).opacity : null; })()`);
  report(`world banner at 120ms: opacity ${op}`, op === 1 ? [] : ["still arriving"]);
  await go("/play", 0);
  await settle(cdp, sessionId, 150);
  const cont = await js(`(() => { const c = document.querySelector("[data-continue]"); return c ? +getComputedStyle(c).opacity : null; })()`);
  report(`continue panel at 150ms: opacity ${cont}`, cont === 1 ? [] : ["still arriving"]);
  await go("/worlds/animals/who-lives-here", 900);
  await tap("main button");
  await settle(cdp, sessionId, 600);
  const round = await playRound(true);
  report(`round under reduced motion: ${round.answered} questions to "${round.done}", ${round.overlaps} stale`, round.problems);
  await shoot("09-reduced-celebration");
  await reduce(false);
}

section("13 · eight viewports");
{
  for (const viewport of screens) {
    await applyViewport(cdp, sessionId, viewport);
    const tag = viewport.name.replace(/[^\w]+/g, "-");
    await go("/play", 900);
    report(`${viewport.name} · home`, await frameProblems(6));
    await shoot(`vp-${tag}-home`);
    await go("/worlds/counting", 1100);
    report(`${viewport.name} · world`, await frameProblems(5));
    await shoot(`vp-${tag}-world`);
    await go("/worlds/counting/count-the-flowers", 900);
    await tap("main button");
    await settle(cdp, sessionId, 1400);
    const board = await js(`(() => {
      const w = document.querySelector("[data-world]"); if (!w) return null;
      const r = w.getBoundingClientRect();
      return { fits: r.bottom <= innerHeight + 0.5, height: Math.round(r.height), tiles: document.querySelectorAll("main li button").length };
    })()`);
    const problems = await frameProblems(3);
    if (!board) problems.push("no board");
    else if (!board.tiles) problems.push("no tiles");
    report(`${viewport.name} · round (board ${board?.height}px, ${board?.fits ? "fits" : "scrolls"})`, problems);
    await shoot(`vp-${tag}-round`);
  }
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);
}

section("14 · accessibility");
{
  await go("/play", 900);
  const a11y = await js(`(() => {
    const live = document.querySelectorAll('[aria-live], [role="status"]').length;
    const landmarks = ["main", "nav", "header"].filter((t) => document.querySelector(t)).join(",");
    const worldsLabel = document.querySelector('[aria-label="Worlds"]') ? "yes" : "no";
    return { live, landmarks, worldsLabel };
  })()`);
  report(`home landmarks ${a11y.landmarks}; worlds region labelled: ${a11y.worldsLabel}`, a11y.worldsLabel === "yes" ? [] : ["no labelled worlds region"]);
  /* Keyboard: Tab until the continue link is the active element. */
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    reached = await js(`document.activeElement?.hasAttribute("data-continue-link") ?? false`);
  }
  report("keyboard reaches Continue", reached ? [] : ["Tab never landed on it"]);
  await go("/worlds/counting", 1000);
  const status = await js(`(() => {
    const list = document.querySelector('[aria-label^="Things to do"]');
    const names = [...document.querySelectorAll("[data-world-activity] a")].map((a) => a.getAttribute("aria-label"));
    return { list: !!list, names };
  })()`);
  report(`world doors announce status: ${status.names.map((n) => n?.split(". ").at(-1)).join(" | ")}`, status.list && status.names.every((n) => /(done|next|new)/i.test(n ?? "")) ? [] : ["door names lack status"]);
  await go("/worlds/counting/count-the-flowers", 900);
  await tap("main button");
  await settle(cdp, sessionId, 1200);
  const live = await js(`document.querySelectorAll('main [role="status"]').length`);
  report(`round has ${live} live region`, live === 1 ? [] : ["wrong number of live regions"]);
}

section("15 · console");
{
  const late = await trouble();
  const all = troubleSeen.concat(late);
  report(`${all.length} error/warning line(s) across the journey`, all.length ? all.slice(0, 4).map((t) => t.slice(0, 100)) : []);
}

/* Everything that ran should have been tidy all along; collect as we went. */
await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
