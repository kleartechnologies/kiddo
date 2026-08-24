/**
 * Measures the three game worlds where a reviewer meets them: `/playground/worlds`.
 *
 * For each world — Counting Garden, Animal Adventure, Word World — on each of
 * the eight screens, with motion and again under `prefers-reduced-motion`:
 *
 *   frame        the page does not scroll sideways, the world fits the screen
 *                on its own, and nothing in it is clipped by an edge
 *   parts        no two things a child can press overlap, and nothing presses
 *                against the question
 *   touch        every control is at least 48px each way
 *   names        every control has a name a screen reader would read
 *   console      nothing was logged as an error or warning
 *   magic        the world's own Magic Motions are the ones that play — the
 *                objects to count arrive one at a time, the animal walks, the
 *                page grows — and under reduced motion everything is simply
 *                there, with no sparks
 *   done         the board can be played to the end and says so
 *   switch       moving to another world changes the environment, leaves one
 *                world on the table, and leaves nothing of the last one behind
 *
 *   node scripts/measure-worlds.mjs [--quick] [--shots=<dir>] [http://host:port]
 *
 * Expects a server already running (`npm run build && npm start -- -p 4310`).
 * The browser driver is in `scripts/cdp.mjs`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { VIEWPORTS, applyViewport, clickAt, evaluate, openBrowser, settle, visit } from "./cdp.mjs";

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes("--quick");
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";
const PAGE = `${ORIGIN}/playground/worlds`;

const MIN_TOUCH = 48;
const WORLDS = ["counting", "animals", "words"];
const screens = QUICK ? [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]] : VIEWPORTS;

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => {
      const line = args.join(" ");
      /* Motion warns, informationally, that reduced motion is on — which is
         the very thing the reduced pass turned on. Advice to a developer,
         not a problem with the page; everything else is kept. The same
         filter as \`measure-visual.mjs\`. */
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
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`    ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};

const reduce = (cdp, sessionId, on) =>
  cdp.send(
    "Emulation.setEmulatedMedia",
    { features: on ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [] },
    sessionId,
  );

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
async function shoot(cdp, sessionId, name) {
  if (!SHOTS) return;
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
}

/* ---- the page ------------------------------------------------------------ */

async function pick(cdp, sessionId, world) {
  await evaluate(cdp, sessionId, `document.querySelector('[data-world-pick="${world}"]').click()`);
  await settle(cdp, sessionId, 900);
}

/** Everything the frame checks, in one trip to the page. */
const FRAME = (viewport) => `(() => {
  const page = document.scrollingElement;
  const world = document.querySelector("[data-world]");
  if (!world) return { missing: true };
  const worlds = document.querySelectorAll("[data-world]").length;
  const w = world.getBoundingClientRect();
  const inside = (r) => r.left >= -0.5 && r.right <= innerWidth + 0.5;
  const name = (el) =>
    (el.getAttribute("aria-label") || el.textContent || "").trim();
  const buttons = [...world.querySelectorAll("button")];
  const rects = buttons.map((b) => b.getBoundingClientRect());
  const prompt = document.querySelector("[data-prompt]");
  const p = prompt ? prompt.getBoundingClientRect() : null;
  const meets = (a, b) =>
    a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const overlaps = [];
  rects.forEach((a, i) =>
    rects.slice(i + 1).forEach((b) => { if (meets(a, b)) overlaps.push(name(buttons[i])); }));
  if (p) rects.forEach((r, i) => { if (meets(r, p)) overlaps.push("prompt×" + name(buttons[i])); });
  const small = buttons
    .filter((b, i) => rects[i].width < ${MIN_TOUCH} - 0.5 || rects[i].height < ${MIN_TOUCH} - 0.5)
    .map((b, i) => name(b) + " " + Math.round(rects[buttons.indexOf(b)].width) + "×" + Math.round(rects[buttons.indexOf(b)].height));
  const unnamed = buttons.filter((b) => !name(b)).length;
  const subjects = [...world.querySelectorAll("[data-magic-subject]")];
  const clipped = [...buttons, ...subjects, ...(prompt ? [prompt] : [])]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && !inside(r)).length;
  /* Anything inside the world that an ancestor with overflow hidden cuts off. */
  let cut = 0;
  for (const el of [...buttons, ...subjects]) {
    const r = el.getBoundingClientRect();
    let a = el.parentElement;
    while (a && a !== document.body) {
      const s = getComputedStyle(a);
      if (s.overflow !== "visible" && s.overflowX !== "visible") {
        const c = a.getBoundingClientRect();
        if (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1) { cut++; break; }
      }
      a = a.parentElement;
    }
  }
  return {
    worlds,
    id: world.dataset.world,
    sideways: page.scrollWidth - page.clientWidth,
    pageHeight: page.scrollHeight,
    worldHeight: Math.round(w.height),
    fits: w.height <= ${viewport.height} + 0.5,
    overlaps, small, unnamed, clipped, cut,
    buttons: buttons.length,
    status: [...document.querySelectorAll('[role="status"]')].length,
    trouble: window.__trouble.splice(0),
  };
})()`;

/* ---- magic --------------------------------------------------------------- */

/** Which Magic Motions are on the table, and whether any spark is showing. */
const MAGIC = `(() => {
  const world = document.querySelector("[data-world]");
  const names = {};
  for (const el of world.querySelectorAll("[data-magic]")) names[el.dataset.magic] = (names[el.dataset.magic] ?? 0) + 1;
  const sparks = [...world.querySelectorAll("[data-magic-spark]")]
    .filter((s) => +getComputedStyle(s).opacity > 0.05).length;
  const hidden = [...world.querySelectorAll("[data-magic-subject]")]
    .filter((s) => +getComputedStyle(s).opacity < 0.95).length;
  return { names, sparks, hidden };
})()`;

/** Watch the things to count arrive: when each became visible. */
const WATCH_ARRIVALS = (ms) => `new Promise((done) => {
  const subjects = [...document.querySelectorAll("[data-world] [data-magic='pop'] [data-magic-subject]")];
  const arrived = subjects.map(() => null);
  const started = performance.now();
  const frame = () => {
    const now = performance.now() - started;
    subjects.forEach((el, i) => {
      if (arrived[i] === null && +getComputedStyle(el).opacity > 0.5) arrived[i] = now;
    });
    if (now < ${ms}) requestAnimationFrame(frame); else done(arrived);
  };
  requestAnimationFrame(frame);
})`;

/** Sparks that show within `ms` of now, in any frame. */
const WATCH_SPARKS = (ms, motion) => `new Promise((done) => {
  let seen = 0;
  const started = performance.now();
  const frame = () => {
    const els = document.querySelectorAll("[data-world] [data-magic='${motion}'] [data-magic-spark]");
    for (const s of els) if (+getComputedStyle(s).opacity > 0.05) seen++;
    if (performance.now() - started < ${ms}) requestAnimationFrame(frame); else done(seen);
  };
  requestAnimationFrame(frame);
})`;

/* ---- playing ------------------------------------------------------------- */

/** Tap the option whose name is the number of things on the stage. */
async function playCounting(cdp, sessionId, reduced) {
  const problems = [];
  const arrivals = await evaluate(cdp, sessionId, WATCH_ARRIVALS(reduced ? 200 : 1400));
  if (!arrivals.length) problems.push("no objects to count");
  const count = arrivals.length;
  if (!reduced && count > 1) {
    const gaps = arrivals.slice(1).map((t, i) => (t ?? 0) - (arrivals[i] ?? 0));
    if (!gaps.every((g) => g > 40)) problems.push(`objects did not arrive one at a time (${arrivals.map((t) => Math.round(t)).join(",")}ms)`);
  }
  await settle(cdp, sessionId, 400);
  const at = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const b = [...document.querySelectorAll("[data-world] button")]
        .find((el) => (el.getAttribute("aria-label") || "").trim() === "Choose ${count}");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`,
  );
  if (!at) { problems.push(`no sign says ${count}`); return { problems, count }; }
  await clickAt(cdp, sessionId, at);
  const sparks = await evaluate(cdp, sessionId, WATCH_SPARKS(700, "sparkle"));
  if (reduced ? sparks > 0 : sparks === 0) problems.push(reduced ? "sparks under reduced motion" : "no sparkle on the right sign");
  await settle(cdp, sessionId, 800);
  const said = await evaluate(cdp, sessionId, `[...document.querySelectorAll('[role="status"]')].map((s) => s.textContent).join("|")`);
  if (!/how many/i.test(said)) problems.push(`status after the right answer: "${said}"`);
  const done = await evaluate(cdp, sessionId, `document.querySelector('[data-world] [data-state="correct"], [data-world] button[aria-label*="that\\'s the one"]') !== null`);
  if (!done) problems.push("the right sign is not marked");
  return { problems, count };
}

/** Join every left node to a right node, trying until each lands. */
async function playConnect(cdp, sessionId, reduced, partnerMotion, joinedMotion) {
  const problems = [];
  const nodes = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const at = (el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.nodeId, x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
      return {
        left: [...document.querySelectorAll('[data-world] [data-connect-node][data-side="left"]')].map(at),
        right: [...document.querySelectorAll('[data-world] [data-connect-node][data-side="right"]')].map(at),
      };
    })()`,
  );
  if (!nodes.left.length) { problems.push("no board"); return { problems }; }
  const taken = new Set();
  let sparksSeen = 0;
  let sparksWhileReduced = 0;
  for (const left of nodes.left) {
    let landed = false;
    for (const right of nodes.right) {
      if (taken.has(right.id)) continue;
      await clickAt(cdp, sessionId, left);
      await settle(cdp, sessionId, 120);
      await clickAt(cdp, sessionId, right);
      const sparks = await evaluate(cdp, sessionId, WATCH_SPARKS(700, partnerMotion));
      const state = await evaluate(cdp, sessionId, `document.querySelector('[data-world] [data-node-id="${left.id}"]').dataset.state`);
      if (state === "matched") {
        landed = true;
        taken.add(right.id);
        if (reduced) sparksWhileReduced += sparks; else sparksSeen += sparks;
        /* The animal needs the whole walk before the next join is accepted. */
        await settle(cdp, sessionId, reduced ? 500 : 1300);
        break;
      }
      await settle(cdp, sessionId, 900);
    }
    if (!landed) problems.push(`${left.id} never joined`);
  }
  if (!reduced && sparksSeen === 0) problems.push(`no ${partnerMotion} on a right join`);
  if (reduced && sparksWhileReduced > 0) problems.push("sparks under reduced motion");
  const after = await evaluate(cdp, sessionId, MAGIC);
  if (joinedMotion && !after.names[joinedMotion]) problems.push(`no ${joinedMotion} on the joined side`);
  const said = await evaluate(cdp, sessionId, `[...document.querySelectorAll('[role="status"]')].map((s) => s.textContent).join("|")`);
  if (!/all joined up/i.test(said)) problems.push(`status at the end: "${said}"`);
  if (after.hidden) problems.push(`${after.hidden} parts not fully visible at the end`);
  return { problems };
}

/* ---- run ----------------------------------------------------------------- */

const { cdp, sessionId, close } = await openBrowser(9340);
try {
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);

  for (const viewport of screens) {
    console.log(`\n${viewport.name}`);
    await applyViewport(cdp, sessionId, viewport);

    for (const reduced of [false, true]) {
      await reduce(cdp, sessionId, reduced);
      await visit(cdp, sessionId, PAGE, 900);
      const mode = reduced ? "reduced" : "motion";

      for (const world of WORLDS) {
        await pick(cdp, sessionId, world);
        await settle(cdp, sessionId, 1400);
        const frame = await evaluate(cdp, sessionId, FRAME(viewport));
        const problems = [];
        if (frame.missing) problems.push("no world on the table");
        else {
          if (frame.id !== world) problems.push(`world is ${frame.id}`);
          if (frame.worlds !== 1) problems.push(`${frame.worlds} worlds on the table`);
          if (frame.sideways > 0) problems.push(`scrolls sideways by ${frame.sideways}px`);
          if (!frame.fits) problems.push(`world is ${frame.worldHeight}px tall on a ${viewport.height}px screen`);
          if (frame.clipped) problems.push(`${frame.clipped} parts past the edge`);
          if (frame.cut) problems.push(`${frame.cut} parts cut off by overflow`);
          if (frame.overlaps.length) problems.push(`overlap: ${frame.overlaps.join(", ")}`);
          if (frame.small.length) problems.push(`under ${MIN_TOUCH}px: ${frame.small.join(", ")}`);
          if (frame.unnamed) problems.push(`${frame.unnamed} unnamed controls`);
          if (frame.status < 1) problems.push("no live region");
          if (frame.trouble.length) problems.push(`console: ${frame.trouble.join(" / ").slice(0, 160)}`);
        }
        const magic = await evaluate(cdp, sessionId, MAGIC);
        const want = { counting: ["pop"], animals: ["walk", "pop"], words: ["grow"] }[world];
        for (const name of want) if (!magic.names[name]) problems.push(`no ${name} on the table`);
        if (magic.sparks) problems.push("sparks before anything happened");
        if (magic.hidden) problems.push(`${magic.hidden} parts still hidden after settling`);
        report(
          `${world.padEnd(9)} ${mode.padEnd(8)} frame  page ${frame.pageHeight}px · world ${frame.worldHeight}px · ${frame.buttons} controls · ${Object.entries(magic.names).map(([k, v]) => `${k}×${v}`).join(" ")}`,
          problems,
        );
        await shoot(cdp, sessionId, `${world}-${mode}-${viewport.width}x${viewport.height}`);

        /* Play it through, on a fresh deal so the arrivals can be watched. */
        await evaluate(cdp, sessionId, `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Deal another").click()`);
        const play =
          world === "counting"
            ? await playCounting(cdp, sessionId, reduced)
            : await playConnect(cdp, sessionId, reduced, "sparkle", world === "words" ? "bounce" : null);
        const trouble = await evaluate(cdp, sessionId, "window.__trouble.splice(0)");
        if (trouble.length) play.problems.push(`console: ${trouble.join(" / ").slice(0, 160)}`);
        report(`${world.padEnd(9)} ${mode.padEnd(8)} play ${play.count ? ` count ${play.count}` : ""}`, play.problems);
        await shoot(cdp, sessionId, `${world}-${mode}-${viewport.width}x${viewport.height}-done`);
      }

      /* Switching: from the last world back to the first, mid-transition and after. */
      await evaluate(cdp, sessionId, `document.querySelector('[data-world-pick="counting"]').click()`);
      await settle(cdp, sessionId, 120);
      const mid = await evaluate(cdp, sessionId, `document.querySelectorAll("[data-world]").length`);
      await settle(cdp, sessionId, 1200);
      const after = await evaluate(cdp, sessionId, FRAME(viewport));
      const problems = [];
      if (after.id !== "counting") problems.push(`landed on ${after.id}`);
      if (after.worlds !== 1) problems.push(`${after.worlds} worlds after the switch`);
      if (mid > 2) problems.push(`${mid} worlds mid-switch`);
      const left = await evaluate(cdp, sessionId, `document.querySelectorAll("[data-connect-node]").length`);
      if (left) problems.push(`${left} nodes of the last world still on the table`);
      if (after.trouble.length) problems.push(`console: ${after.trouble.join(" / ").slice(0, 160)}`);
      report(`switch    ${mode.padEnd(8)} words → counting  (${mid} on the table mid-switch)`, problems);
    }
  }
} finally {
  await close();
}

console.log(failures ? `\n${failures} measurement(s) failed` : "\nAll world measurements pass");
process.exit(failures ? 1 : 0);
