/**
 * Measures the Magic Motion lab in a real browser, at every screen a child
 * might hold.
 *
 * The layout questions are the usual ones — nothing spills, nothing under
 * 48px — and then the motion questions this page exists to answer: does each
 * behaviour stay inside its card, move only on the axis it promised, settle
 * where the vocabulary says it settles, and become an instant finished state
 * under reduced motion.
 *
 *   node scripts/measure-magic.mjs [url]
 *
 * Expects a measuring server: the specimen pages this drives are `.dev.tsx`
 * and only exist when the build asked for them.
 *
 *     KIDDO_DEV_PAGES=1 npm run build && npm start -- -p 4310
 *
 * A deployed KIDDO does not serve `/playground/*` at all, and must not be
 * changed so that it does — see `next.config.ts` and docs/SECURITY.md.
 * The browser driver is in `scripts/cdp.mjs`.
 */
import {
  VIEWPORTS,
  applyViewport,
  clickAt,
  evaluate,
  openBrowser,
  settle,
  visit,
} from "./cdp.mjs";
import { requireDevPages } from "./measure-mode.mjs";

const URL_UNDER_TEST = process.argv[2] ?? "http://127.0.0.1:4310/playground/magic";

/** Play controls are the only interactive things; the brief's floor is 48. */
const MIN_TOUCH = 48;

const MOTIONS = ["pop", "bounce", "float", "slide", "walk", "grow", "sparkle", "celebrate"];

/** How long to let each behaviour finish before reading its final state. */
const RUN_MS = {
  pop: 900, bounce: 900, float: 2600, slide: 900,
  walk: 2100, grow: 900, sparkle: 1400, celebrate: 1400,
};

/** Where each lab subject's translateX must end up. */
const ENDS_AT_X = { walk: 48 };
/** The animal-home dog travels the track. */
const HOME_WALK = 144;

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => { window.__trouble.push(args.join(" ")); real(...args); };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

/** One layout pass: overflow, control sizes, and how many subjects exist. */
const MEASURE = `(() => {
  const doc = document.scrollingElement;
  const controls = [...document.querySelectorAll("[data-magic-play]")].map((c) => {
    const b = c.getBoundingClientRect();
    return { id: c.dataset.magicPlay, width: b.width, height: b.height };
  });
  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    controls: controls.length,
    minControl: Math.min(...controls.map((c) => Math.min(c.width, c.height))),
    subjects: document.querySelectorAll("[data-magic]").length,
    sparks: document.querySelectorAll("[data-magic-spark]").length,
    trouble: window.__trouble ?? [],
  };
})()`;

/** The current transform of one lab card's subject, as plain numbers. */
const matrixOf = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  const t = getComputedStyle(el).transform;
  const m = t === "none" ? { m41: 0, m42: 0, a: 1, d: 1 } : new DOMMatrixReadOnly(t);
  return { x: m.m41, y: m.m42, sx: m.a, sy: m.d, opacity: +getComputedStyle(el).opacity };
})()`;

async function pressPlay(cdp, sessionId, id) {
  const centre = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('[data-magic-play="${id}"]');
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })()`,
  );
  if (!centre) return false;
  await clickAt(cdp, sessionId, centre);
  return true;
}

/**
 * Press play on one lab motion and watch every frame: how far the subject
 * strayed on each axis, whether it left its card, whether the page grew, and
 * where it came to rest.
 */
async function playAndWatch(cdp, sessionId, name, ms) {
  const pressed = await pressPlay(cdp, sessionId, name);
  if (!pressed) return null;

  return evaluate(
    cdp,
    sessionId,
    `new Promise((done) => {
      const card = document.querySelector('[data-magic-lab="${name}"]');
      const el = card?.querySelector("[data-magic-subject]");
      if (!el) return done(null);
      const cardBox = card.getBoundingClientRect();
      const page = document.scrollingElement;
      const startScrollWidth = page.scrollWidth;
      let maxX = 0, maxY = 0, escaped = 0, grewBy = 0;
      let last = null, secondLast = null;

      const read = () => {
        const t = getComputedStyle(el).transform;
        const m = t === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(t);
        return { x: m.m41, y: m.m42 };
      };
      const tick = () => {
        const now = read();
        maxX = Math.max(maxX, Math.abs(now.x));
        maxY = Math.max(maxY, Math.abs(now.y));
        const b = el.getBoundingClientRect();
        if (b.left < cardBox.left - 1 || b.right > cardBox.right + 1 ||
            b.top < cardBox.top - 1 || b.bottom > cardBox.bottom + 1) escaped++;
        grewBy = Math.max(grewBy, page.scrollWidth - startScrollWidth);
        secondLast = last; last = now;
      };
      const started = performance.now();
      const frame = () => {
        tick();
        if (performance.now() - started < ${ms}) requestAnimationFrame(frame);
        else done({
          maxX, maxY, escaped, grewBy,
          final: last,
          still: secondLast !== null &&
            Math.abs(last.x - secondLast.x) < 0.1 && Math.abs(last.y - secondLast.y) < 0.1,
        });
      };
      requestAnimationFrame(frame);
    })`,
  );
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

try {
  browser = await openBrowser(9339);
  await requireDevPages(browser.cdp, browser.sessionId, URL_UNDER_TEST);
  const { cdp, sessionId } = browser;
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: WATCH_FOR_TROUBLE },
    sessionId,
  );

  console.log(`\n  ${URL_UNDER_TEST}\n`);

  /* -- the layout grid: every viewport, plus a settled final state -------- */
  console.log(
    "  viewport                    h-overflow   controls  min-control  subjects" +
      "   walk-ends   problems",
  );
  console.log("  " + "-".repeat(104));

  for (const viewport of VIEWPORTS) {
    await applyViewport(cdp, sessionId, viewport);
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const before = await evaluate(cdp, sessionId, MEASURE);

    /* Play everything, cheaply: press each control, then let it all end. */
    for (const name of MOTIONS) await pressPlay(cdp, sessionId, name);
    for (const id of ["counting", "home", "alphabet", "magic"]) {
      await pressPlay(cdp, sessionId, id);
    }
    await settle(cdp, sessionId, 2600);

    const after = await evaluate(cdp, sessionId, MEASURE);
    const walk = await evaluate(
      cdp,
      sessionId,
      matrixOf('[data-magic-lab="walk"] [data-magic-subject]'),
    );
    const dog = await evaluate(
      cdp,
      sessionId,
      matrixOf('[data-magic-demo="home"] [data-magic="walk"] [data-magic-subject]'),
    );
    const apples = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll('[data-magic-demo="counting"] [data-magic-subject]')]
        .map((el) => +getComputedStyle(el).opacity)`,
    );

    const problems = [];
    if (before.horizontalOverflow > 0) problems.push("horizontal scroll");
    if (after.horizontalOverflow > 0) problems.push("animated into horizontal scroll");
    if (before.minControl < MIN_TOUCH) {
      problems.push(`control only ${Math.round(before.minControl)}px`);
    }
    if (before.subjects < MOTIONS.length) problems.push("a lab card is missing");
    if (!walk || Math.abs(walk.x - ENDS_AT_X.walk) > 1) {
      problems.push(`lab walk ended at ${walk ? walk.x.toFixed(1) : "?"}px`);
    }
    if (!dog || Math.abs(dog.x - HOME_WALK) > 1) {
      problems.push(`dog ended at ${dog ? dog.x.toFixed(1) : "?"}px of ${HOME_WALK}`);
    }
    if (apples.length !== 3 || apples.some((o) => o < 0.99)) {
      problems.push(`${apples.filter((o) => o >= 0.99).length}/3 apples appeared`);
    }
    if (after.trouble.length) problems.push(`console: ${after.trouble[0]}`);

    failures += problems.length > 0 ? 1 : 0;
    console.log(
      "  " +
        viewport.name.padEnd(27) +
        String(before.horizontalOverflow).padStart(10) +
        String(before.controls).padStart(11) +
        `${Math.round(before.minControl)}px`.padStart(13) +
        String(before.subjects).padStart(10) +
        `${Math.round(walk?.x ?? -1)}px`.padStart(12) +
        (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
    );
  }

  /* -- the behaviour pass: one phone, every frame ------------------------- */
  console.log("\n  behaviour, watched frame by frame at 390×844:\n");
  const phone = VIEWPORTS[1];
  await applyViewport(cdp, sessionId, phone);
  await visit(cdp, sessionId, URL_UNDER_TEST);

  for (const name of MOTIONS) {
    const watched = await playAndWatch(cdp, sessionId, name, RUN_MS[name]);
    if (!watched) {
      failures += 1;
      console.log(`  ${name.padEnd(11)} ✗ never played`);
      continue;
    }

    const problems = [];
    /* Only the travellers may move sideways; everything else holds its x. */
    const xAllowed = name === "walk" ? 49 : name === "slide" ? 25 : 1;
    if (watched.maxX > xAllowed) {
      problems.push(`moved ${watched.maxX.toFixed(1)}px sideways`);
    }
    if (watched.maxY > 12) problems.push(`lifted ${watched.maxY.toFixed(1)}px`);
    if (watched.escaped > 0) problems.push(`left its card on ${watched.escaped} frames`);
    if (watched.grewBy > 0) problems.push(`grew the page ${watched.grewBy}px`);
    /* Float is still mid-drift when sampling stops; everything else rests. */
    if (name !== "float" && !watched.still) problems.push("never settled");
    const endX = ENDS_AT_X[name] ?? 0;
    if (name !== "float" && Math.abs(watched.final.x - endX) > 1) {
      problems.push(`rested at x=${watched.final.x.toFixed(1)}`);
    }

    failures += problems.length > 0 ? 1 : 0;
    console.log(
      `  ${name.padEnd(11)} peak ${watched.maxX.toFixed(1)}×${watched.maxY.toFixed(1)}px` +
        `, rest x=${watched.final.x.toFixed(1)}` +
        (problems.length ? `  ✗ ${problems.join(", ")}` : "  ✓"),
    );
  }

  /* Sparkle marks end invisible and there are never more than three. */
  const sparks = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    await pressPlay(cdp, sessionId, "sparkle");
    await settle(cdp, sessionId, 120);
    const during = await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll("[data-magic-spark]").length`,
    );
    await settle(cdp, sessionId, 1400);
    const visible = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-magic-spark]")]
        .filter((el) => +getComputedStyle(el).opacity > 0.05).length`,
    );
    return { ok: during > 0 && during <= 3 && visible === 0, during, visible };
  })();
  if (!sparks.ok) failures += 1;
  console.log(
    `\n  sparkle marks: ${sparks.during} while playing, ${sparks.visible} visible after` +
      `  ${sparks.ok ? "✓" : "✗"}`,
  );

  /* -- reduced motion: every behaviour is an instant finished state ------- */
  await cdp.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
    sessionId,
  );
  await visit(cdp, sessionId, URL_UNDER_TEST);

  const reducedProblems = [];
  for (const name of MOTIONS) {
    await pressPlay(cdp, sessionId, name);
    /* One frame, not half a second: it should already be finished. */
    await settle(cdp, sessionId, 80);
    const state = await evaluate(
      cdp,
      sessionId,
      matrixOf(`[data-magic-lab="${name}"] [data-magic-subject]`),
    );
    const endX = ENDS_AT_X[name] ?? 0;
    if (!state) reducedProblems.push(`${name} missing`);
    else if (
      Math.abs(state.x - endX) > 1 || Math.abs(state.y) > 1 ||
      Math.abs(state.sx - 1) > 0.01 || state.opacity < 0.99
    ) {
      reducedProblems.push(
        `${name} at x=${state.x.toFixed(1)} y=${state.y.toFixed(1)} scale=${state.sx.toFixed(2)}`,
      );
    }
  }

  await pressPlay(cdp, sessionId, "home");
  await pressPlay(cdp, sessionId, "counting");
  await settle(cdp, sessionId, 80);
  const reducedDog = await evaluate(
    cdp,
    sessionId,
    matrixOf('[data-magic-demo="home"] [data-magic="walk"] [data-magic-subject]'),
  );
  if (!reducedDog || Math.abs(reducedDog.x - HOME_WALK) > 1) {
    reducedProblems.push(
      `dog at ${reducedDog ? reducedDog.x.toFixed(1) : "?"}px, not at the house`,
    );
  }
  const reducedApples = await evaluate(
    cdp,
    sessionId,
    `[...document.querySelectorAll('[data-magic-demo="counting"] [data-magic-subject]')]
      .map((el) => +getComputedStyle(el).opacity)`,
  );
  if (reducedApples.length !== 3 || reducedApples.some((o) => o < 0.99)) {
    reducedProblems.push(`${reducedApples.filter((o) => o >= 0.99).length}/3 apples appeared`);
  }
  const reducedSparks = await evaluate(
    cdp,
    sessionId,
    `document.querySelectorAll("[data-magic-spark]").length`,
  );
  if (reducedSparks > 0) reducedProblems.push(`${reducedSparks} sparks under reduce`);
  await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);

  if (reducedProblems.length) failures += 1;
  console.log(
    `  reduced motion: every play is instantly its finished state` +
      `  ${reducedProblems.length ? `✗ ${reducedProblems.join(", ")}` : "✓"}`,
  );

  /* -- accessibility: names unchanged by motion --------------------------- */
  const names = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const before = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-magic-play]")].map((el) => el.textContent.trim())`,
    );
    for (const name of MOTIONS) await pressPlay(cdp, sessionId, name);
    await settle(cdp, sessionId, 1600);
    const after = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-magic-play]")].map((el) => el.textContent.trim())`,
    );
    const exposed = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-magic] svg")]
        .filter((el) => el.getAttribute("aria-hidden") !== "true").length`,
    );
    return {
      ok:
        JSON.stringify(before) === JSON.stringify(after) &&
        before.every((n) => n.length > 0) &&
        exposed === 0,
      exposed,
    };
  })();
  if (!names.ok) failures += 1;
  console.log(
    `  accessibility: names unchanged by motion, ${names.exposed} drawings exposed` +
      `  ${names.ok ? "✓" : "✗"}`,
  );

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
