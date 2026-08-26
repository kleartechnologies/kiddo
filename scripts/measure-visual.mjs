/**
 * Measures the visual system in a real browser — every upgraded board, on
 * every screen a child might hold.
 *
 * The other measurement scripts ask whether a board *fits*. This one asks the
 * three questions the visual phase has to answer with something other than a
 * screenshot:
 *
 *   1. Is the picture actually there, and big enough to read?
 *   2. **Is it there wherever the library reaches?** A board whose every
 *      picture is in the library and which still renders the platform's emoji
 *      font is the failure this pass was opened to fix — it puts a KIDDO board
 *      and a system emoji on one screen. The level is not allowed to decide.
 *   3. Is a board ever *half* drawn? Two illustrations among four glyphs is a
 *      pattern a child can answer without learning anything.
 *
 * It also re-asks the questions every other script asks, because a picture
 * that pushed the answers off the bottom of a 640px phone would be a worse
 * board than the one it replaced.
 *
 *   node scripts/measure-visual.mjs [url] [--behaviour-only]
 *
 * `--behaviour-only` skips the viewport grid and runs just the reduced-motion,
 * settle and accessible-name checks.
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

const ARGS = process.argv.slice(2);
const BEHAVIOUR_ONLY = ARGS.includes("--behaviour-only");
const URL_UNDER_TEST =
  ARGS.find((arg) => !arg.startsWith("--")) ??
  "http://127.0.0.1:4310/playground/visual";

/** How many boards the round is made of. Read off the page, once. */
let STEPS = 13;

async function countSteps(cdp, sessionId) {
  const found = await evaluate(
    cdp,
    sessionId,
    `document.querySelectorAll('[data-round-strip] [data-round-step]').length`,
  );
  if (typeof found === "number" && found > 0) STEPS = found;
}

/** The floor every other script uses, kept here so a picture is no excuse. */
const MIN_TOUCH = 44;

/**
 * The smallest a drawing is allowed to be rendered.
 *
 * A picture below about this is a smudge: it is not carrying meaning, so it is
 * clutter that also costs layout. The smallest one the system draws on purpose
 * is the anchor above a word on a tile, which is `text-3xl` — 1.875rem at
 * 1.15em, or 34px — so 24 is a floor with room under it rather than a
 * restatement of a class name.
 */
const MIN_ART = 24;

/**
 * How much of the screen a real game keeps for itself, above and below the
 * board.
 *
 * The number matters because this page is not a game: it carries a title, a
 * subtitle, a deal-again button and a thirteen-chip round strip that wraps to
 * five rows on a 360px phone. None of that exists in front of a child, and all
 * of it eats the height a board is being judged on — so a board measured
 * against *this page* would be measured against the harness.
 *
 * So the board is measured against the shell it actually ships in. `GameShell`
 * leaves `main` 536px of a 640px viewport on the narrowest phone, which is 104
 * of chrome; 112 is that with a little room under it. The page's own scrolling
 * is still reported, and still fails the run when it exceeds what the strip
 * costs — a round that could not fit even without the reviewer's control is a
 * real problem.
 */
const SHELL_CHROME = 112;

/**
 * The largest share of the screen a subject prompt may take.
 *
 * `ChoiceStage` reserves a fixed slab of chrome above its tile grid, and a
 * 360x640 phone in portrait is where that budget runs out first. A third of
 * the viewport leaves the answers the room they were measured with.
 */
const MAX_SUBJECT_SHARE = 0.34;

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  const note = (kind) => (...args) => {
    const line = kind + ": " + args.map(String).join(" ");
    /* Motion warns, informationally, that reduced motion is on — which is the
       very thing the reduced-motion pass turned on. Advice to a developer,
       not a problem with the page; everything else is kept. */
    if (line.includes("motion.dev/troubleshooting/reduced-motion")) return;
    window.__trouble.push(line);
  };
  const realError = console.error, realWarn = console.warn;
  console.error = (...a) => { note("console.error")(...a); realError(...a); };
  console.warn = (...a) => { note("console.warn")(...a); realWarn(...a); };
  addEventListener("error", (e) => window.__trouble.push("uncaught: " + e.message));
  addEventListener("unhandledrejection", (e) =>
    window.__trouble.push("unhandled rejection: " + e.reason));
`;

/**
 * Everything measurable about whichever board is on screen, in one pass.
 *
 * One evaluation rather than several: a layout has to be read inside a single
 * frame or it is a layout that never existed.
 *
 * The addition over `measure-mixed.mjs` is `art` — every `[data-art]` on the
 * board, with the box it was actually drawn at and which column it is in. That
 * one list answers all three questions above.
 */
const MEASURE = `(() => {
  const doc = document.scrollingElement;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      right: r.right, bottom: r.bottom,
      centre: { x: r.x + r.width / 2, y: r.y + r.height / 2 },
    };
  };

  const strip = [...document.querySelectorAll("[data-round-step]")].map((li) => ({
    label: li.dataset.roundStep,
    current: li.getAttribute("aria-current") === "step",
  }));
  const step = strip.findIndex((entry) => entry.current);
  const label = strip[step]?.label ?? "";
  const levelMatch = /L(\\d)/.exec(label);

  const board = document.querySelector("[data-round-board]");
  /* The board is named by the round's own label for the step, and this round
     labels its steps "connect · L1" so that a reviewer can see the ladder in
     the strip. The interaction is the first word of it. */
  const kind = board ? (board.dataset.roundBoard ?? "").split(" ")[0] : null;
  const activity = board?.dataset.roundActivity ?? null;
  const over = !board && strip.every((entry) => !entry.current);

  /* What a screen reader would call this thing: the aria-label where there is
     one, and otherwise the sr-only text inside it. An order line's filled
     slots are not buttons and say their place in a hidden span, which is the
     right way round and would read as "no accessible name" to anything that
     only looked at the attribute. */
  const nameOf = (el) =>
    el.getAttribute("aria-label") ??
    el.querySelector(".sr-only")?.textContent?.trim() ??
    "";

  const read = (el, extra) => ({
    ...box(el),
    state: el.dataset.state ?? null,
    label: nameOf(el),
    /* Whether this particular thing a child can touch has a drawing in it.
       The all-or-nothing rule is asked of a column, and a column is these. */
    drawn: !!el.querySelector("[data-art]"),
    ...extra,
  });

  let targets = [];
  if (kind === "choice") {
    targets = [...(board?.querySelectorAll("li button") ?? [])].map((el, i) =>
      read(el, { id: "option-" + i, side: "options" }));
  } else if (kind === "connect") {
    targets = [...document.querySelectorAll("[data-connect-node]")].map((el) =>
      read(el, { id: el.dataset.nodeId, side: el.dataset.side }));
  } else if (kind === "match") {
    targets = [...document.querySelectorAll("[data-match-card]")].map((el) =>
      read(el, { id: el.dataset.nodeId, side: el.dataset.group }));
  } else if (kind === "order") {
    const line = document.querySelector("[data-order-line]");
    const slots = line ? [...line.querySelectorAll("li")].map((li, i) =>
      read(li.firstElementChild ?? li, { id: "slot-" + i, side: "line" })) : [];
    const tray = [...document.querySelectorAll("[data-order-tile]")].map((el) =>
      read(el, { id: el.dataset.itemId, side: "tray" }));
    targets = [...slots, ...tray];
  }

  let overlaps = 0;
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i], b = targets[j];
      if (a.x < b.right - 0.5 && b.x < a.right - 0.5 &&
          a.y < b.bottom - 0.5 && b.y < a.bottom - 0.5) overlaps++;
    }
  }

  const frame = board ? box(board) : null;
  const clipped = frame ? targets.filter((t) =>
    t.x < frame.x - 1 || t.right > frame.right + 1).length : 0;

  /* Every drawing on the board, at the size it was actually rendered. */
  const art = [...(board?.querySelectorAll("[data-art]") ?? [])].map((el) => ({
    id: el.dataset.art,
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    hidden: el.getAttribute("aria-hidden") === "true",
    /* A drawing must never be a tab stop of its own. */
    focusable: el.getAttribute("focusable") !== "false" ||
      el.hasAttribute("tabindex"),
  }));

  /* The prompt anchor, when there is one: the sun above S _ N. Context, not
     a target — so what is measured is that it is big enough to mean something,
     hidden from screen readers, and gone from nothing it should be on. */
  const anchorEl = board?.querySelector("[data-prompt-anchor]") ?? null;
  const anchor = anchorEl
    ? {
        height: box(anchorEl).height,
        hidden: anchorEl.getAttribute("aria-hidden") === "true",
      }
    : null;

  /* The subject prompt, when there is one: the question that is one thing to
     look at. Measured as a share of the window, because what it costs is the
     room the answers below it have left. */
  const promptRow = board?.querySelector("[data-prompt]") ?? null;
  const prompt = promptRow
    ? {
        layout: promptRow.dataset.prompt,
        height: box(promptRow.parentElement ?? promptRow).height,
        share: box(promptRow.parentElement ?? promptRow).height / innerHeight,
        item: Math.max(0, ...[...promptRow.children].map((c) => box(c).height)),
      }
    : null;

  /* Whether each column is wholly drawn or wholly plain, never half of each.
     Asked per column rather than per board on purpose: animal-babies draws
     its animals and spells its babies, and that is the design — a picture of
     a lamb would answer the question the word is asking. */
  const sides = {};
  for (const target of targets) {
    const side = target.side ?? "?";
    sides[side] ??= { drawn: 0, total: 0 };
    sides[side].total++;
    if (target.drawn) sides[side].drawn++;
  }
  const mixedColumns = Object.entries(sides)
    .filter(([, s]) => s.drawn > 0 && s.drawn < s.total)
    .map(([side, s]) => side + " " + s.drawn + "/" + s.total);

  return {
    step, kind, activity, over, label,
    /* The board on its own, and the reviewer's control above it. See the two
       constants at the top of this file for what each one is compared with. */
    board: frame ? Math.round(frame.height) : 0,
    strip: Math.round(
      document.querySelector("[data-round-strip]")?.getBoundingClientRect().height ?? 0,
    ),
    viewport: innerHeight,
    level: levelMatch ? Number(levelMatch[1]) : null,
    targets,
    count: targets.length,
    minTouch: targets.length
      ? Math.min(...targets.map((t) => Math.min(t.width, t.height))) : 0,
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    overlaps, clipped,
    /* Every join a connect board is currently holding, so a run can prove a
       fresh board holds none and a solved board holds one per pair. */
    lines: document.querySelectorAll("[data-connect-line]").length,
    art,
    minArt: art.length ? Math.min(...art.map((a) => Math.min(a.width, a.height))) : 0,
    exposedArt: art.filter((a) => !a.hidden || a.focusable).length,
    mixedColumns,
    prompt,
    anchor,
    /* Every accessible name on the board, so the run can prove the words a
       screen reader hears do not depend on whether anything was drawn. */
    names: targets.map((t) => t.label ?? ""),
    trouble: window.__trouble ?? [],
  };
})()`;

const look = (cdp, sessionId) => evaluate(cdp, sessionId, MEASURE);

/**
 * A tap that can reach below the fold.
 *
 * This page carries a reviewer's strip a real game does not have, and on the
 * narrowest phone the strip can push a board's bottom row past the viewport —
 * which the layout checks account for (see `SHELL_CHROME`), but a click at a
 * coordinate outside the window lands on nothing at all. So the harness does
 * what a finger does: scrolls the target into view, taps it where it now is,
 * and puts the page back.
 */
async function tapAt(cdp, sessionId, centre) {
  const height = await evaluate(cdp, sessionId, "innerHeight");
  if (centre.y >= 0 && centre.y <= height - 8) {
    await clickAt(cdp, sessionId, centre);
    return;
  }
  const moved = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const before = scrollY;
      scrollBy(0, ${Math.ceil(centre.y - height / 2)});
      return scrollY - before;
    })()`,
  );
  await clickAt(cdp, sessionId, { x: centre.x, y: centre.y - moved });
  await evaluate(cdp, sessionId, "scrollTo(0, 0)");
}

/** Show a particular board, through the strip the page already has. */
async function jump(cdp, sessionId, index) {
  for (let attempt = 0; attempt < 16; attempt++) {
    await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('[data-round-strip] [data-round-step]')[${index}]?.click()`,
    );
    const state = await look(cdp, sessionId);
    if (state.step === index) return state;
    await settle(cdp, sessionId, 200);
  }
  return look(cdp, sessionId);
}

/** Measure every board in the round, a jump at a time. */
async function tour(cdp, sessionId) {
  const boards = [];
  for (let index = 0; index < STEPS; index++) {
    const state = await jump(cdp, sessionId, index);
    if (state.over || state.kind === null) break;
    boards.push(state);
  }
  return boards;
}

function solved(state) {
  if (state.kind === "choice") {
    return state.targets.some((t) => /that's the one/i.test(t.label ?? ""));
  }
  if (state.kind === "connect" || state.kind === "match") {
    return state.targets.length > 0 && state.targets.every((t) => t.state === "matched");
  }
  if (state.kind === "order") {
    return state.targets.length > 0 && !state.targets.some((t) => t.side === "tray");
  }
  return false;
}

async function waitForHandover(cdp, sessionId, fromStep) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const state = await look(cdp, sessionId);
    if (state.over || state.step !== fromStep) return state;
    await settle(cdp, sessionId, 250);
  }
  return look(cdp, sessionId);
}

/**
 * Play whichever board is on screen, by trying things until it gives way.
 *
 * Nothing here knows an answer, which is both the only kind-agnostic way to
 * drive four engines from one script and a standing proof of the thing the
 * content promises: a wrong tap costs nothing, so a script that taps
 * everything still finishes.
 */
async function play(cdp, sessionId, state) {
  const after =
    state.kind === "choice"
      ? await playChoice(cdp, sessionId, state)
      : state.kind === "connect" || state.kind === "match"
        ? await playPairs(cdp, sessionId, state)
        : state.kind === "order"
          ? await playOrder(cdp, sessionId, state)
          : state;

  if (after.over || after.step !== state.step) return after;
  return waitForHandover(cdp, sessionId, state.step);
}

async function playChoice(cdp, sessionId, state) {
  let now = state;
  for (const target of state.targets) {
    await tapAt(cdp, sessionId, target.centre);
    await settle(cdp, sessionId, 900);
    now = await look(cdp, sessionId);
    if (now.over || now.step !== state.step || solved(now)) return now;
  }
  return now;
}

async function playPairs(cdp, sessionId, state) {
  let now = state;

  for (let guard = 0; guard < 40; guard++) {
    const lefts = now.targets.filter((t) => t.side === "left" && t.state !== "matched");
    const rights = now.targets.filter((t) => t.side === "right" && t.state !== "matched");
    if (!lefts.length || !rights.length) break;

    const left = lefts[0];
    let joined = false;

    for (const right of rights) {
      await tapAt(cdp, sessionId, left.centre);
      await settle(cdp, sessionId, 150);
      await tapAt(cdp, sessionId, right.centre);
      await settle(cdp, sessionId, 1000);
      now = await look(cdp, sessionId);
      if (now.over || now.step !== state.step || solved(now)) return now;

      const still = now.targets.find((t) => t.id === left.id && t.side === "left");
      if (!still || still.state === "matched") {
        joined = true;
        break;
      }
    }

    if (!joined) break;
  }

  return now;
}

async function playOrder(cdp, sessionId, state) {
  let now = state;

  for (let guard = 0; guard < 40; guard++) {
    const tray = now.targets.filter((t) => t.side === "tray");
    if (!tray.length) break;

    let placed = false;
    for (const tile of tray) {
      await tapAt(cdp, sessionId, tile.centre);
      await settle(cdp, sessionId, 150);
      await tapAt(cdp, sessionId, tile.centre);
      await settle(cdp, sessionId, 900);
      now = await look(cdp, sessionId);
      if (now.over || now.step !== state.step || solved(now)) return now;

      if (now.targets.filter((t) => t.side === "tray").length < tray.length) {
        placed = true;
        break;
      }
    }

    if (!placed) break;
  }

  return now;
}

/**
 * Tap this board's options until one of them is not the answer, watching the
 * tiles move while it happens.
 *
 * The transform is sampled every frame across the whole animation and the
 * horizontal component of all of them has to be zero. Sampling rather than
 * reading the source is the point: a `x: [...]` keyframe is what
 * `tests/visual.test.ts` guards, and this guards the thing itself — any route
 * back to a shake, through a variant or a spring or a stylesheet, moves a tile
 * sideways and this sees it.
 *
 * Returns null when the board was finished without a wrong tap ever landing.
 */
async function tryToMiss(cdp, sessionId, state) {
  for (const target of state.targets) {
    await evaluate(
      cdp,
      sessionId,
      `(() => {
        window.__x = [];
        const tiles = [...document.querySelectorAll('[data-round-board] li button')];
        const sample = () => {
          for (const tile of tiles) {
            const m = new DOMMatrixReadOnly(getComputedStyle(tile).transform);
            window.__x.push(Math.abs(m.m41));
          }
          if (window.__x.length < 600) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      })()`,
    );

    await tapAt(cdp, sessionId, target.centre);
    await settle(cdp, sessionId, 800);

    const after = await look(cdp, sessionId);
    /* "not this one" while the tile is being nudged, "already tried" once it is
       only a memory — and by the time the animation has finished playing out,
       the board has usually moved on to the second of those. Either word means
       the tap was wrong, which is the only thing this needs to know. */
    const missed = after.targets.some((t) =>
      /not this one|already tried/i.test(t.label ?? ""),
    );
    const moved = await evaluate(cdp, sessionId, `Math.max(0, ...(window.__x ?? [0]))`);

    if (missed) return { measured: true, moved };
    if (after.over || after.step !== state.step) return null;
  }

  return null;
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

/**
 * The boards the library can draw every picture of, and which therefore have
 * to arrive drawn — every time, on every screen.
 *
 * This is the check that replaced "does the picture go away at level two". It
 * used to be a failure for a board above the entry level to carry a drawing,
 * on the theory that the drawing was a scaffold; it was not one. An emoji cow
 * and a drawn cow ask a child for exactly the same thing, so withholding the
 * drawing removed no help and only mixed two art styles on one board. What the
 * rungs of the real ladder take away — a counting board dropping to a block of
 * pips at level three, a pool widening — is asserted in `tests/visual.test.ts`,
 * where it can be sampled hundreds of times instead of twice.
 *
 * Only boards whose *whole* pool is in the library are listed. `rhyming` and
 * `sound-partners` above level one are not, and are correctly plain there.
 */
const COVERED = [
  { activity: "general-knowledge.home-partners", level: 1 },
  { activity: "general-knowledge.animal-babies", level: 1 },
  { activity: "general-knowledge.animal-homes", level: 1 },
  { activity: "math.counting-objects", level: 1 },
  /* Every countable in the table is drawn, so level two is covered too. Level
     three is not listed: it may deal a block of pips, which has no picture. */
  { activity: "math.counting-objects", level: 2 },
];

/** A board is that entry's if the challenge came from that activity at it. */
const coversBoard = (entry, board) =>
  board.level === entry.level &&
  String(board.activity ?? "").split("#")[0] === entry.activity;

/** Everything that would be wrong with this board, in words. */
const problemsWith = (board) => {
  const problems = [];
  if (board.horizontalOverflow > 0) problems.push("horizontal scroll");
  /* The reviewer's strip is discounted; see SHELL_CHROME. */
  if (board.verticalOverflow > board.strip)
    problems.push(`page scrolls ${board.verticalOverflow}px past the strip`);
  if (board.board + SHELL_CHROME > board.viewport)
    problems.push(`board is ${board.board}px of a ${board.viewport}px screen`);
  if (board.minTouch < MIN_TOUCH)
    problems.push(`target only ${Math.round(board.minTouch)}px`);
  if (board.overlaps > 0) problems.push(`${board.overlaps} overlapping targets`);
  if (board.clipped > 0) problems.push(`${board.clipped} clipped`);
  if (board.count === 0) problems.push("nothing to touch");

  /* The visual rules. */
  if (board.art.length && board.minArt < MIN_ART)
    problems.push(`drawing only ${Math.round(board.minArt)}px`);
  if (board.exposedArt > 0)
    problems.push(`${board.exposedArt} drawings not aria-hidden`);
  if (board.mixedColumns.length)
    problems.push(`half-drawn column (${board.mixedColumns.join(", ")})`);
  if (COVERED.some((entry) => coversBoard(entry, board)) && board.art.length === 0)
    problems.push("no drawing, on a board the library covers end to end");
  if (board.prompt?.layout === "subject" && board.prompt.share > MAX_SUBJECT_SHARE)
    problems.push(`subject takes ${Math.round(board.prompt.share * 100)}% of the screen`);
  if (board.anchor && board.anchor.height < MIN_ART)
    problems.push(`anchor only ${Math.round(board.anchor.height)}px`);
  if (board.anchor && !board.anchor.hidden)
    problems.push("anchor not aria-hidden");
  if (board.anchor && board.prompt?.layout === "subject")
    problems.push("a subject also has an anchor");
  if (board.names.some((name) => !name.trim()))
    problems.push("a target has no accessible name");
  /* Every tour reaches a board fresh, so a line already on it is one that
     survived from a board before it. */
  if (board.kind === "connect" && board.lines > 0)
    problems.push(`${board.lines} lines on an untouched board`);

  return problems;
};

const WATCHDOG = setTimeout(
  () => {
    console.error("\n  the browser stopped answering — giving up\n");
    browser?.close();
    process.exit(1);
  },
  20 * 60 * 1000,
).unref?.() ?? null;

try {
  browser = await openBrowser(9338);
  await requireDevPages(browser.cdp, browser.sessionId, URL_UNDER_TEST);
  const { cdp, sessionId } = browser;
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: WATCH_FOR_TROUBLE },
    sessionId,
  );

  console.log(`\n  ${URL_UNDER_TEST}\n`);

  if (!BEHAVIOUR_ONLY) {
    for (const viewport of VIEWPORTS) {
      await applyViewport(cdp, sessionId, viewport);
      await visit(cdp, sessionId, URL_UNDER_TEST);
      await countSteps(cdp, sessionId);

      const boards = await tour(cdp, sessionId);
      const last = boards[boards.length - 1] ?? (await look(cdp, sessionId));

      console.log(`  ${viewport.name}`);
      console.log(
        "    step  activity                          lvl  draw  min art  subject  touch   board  fits in  min touch  overlaps  clipped",
      );
      console.log("    " + "-".repeat(126));

      for (const board of boards) {
        const problems = problemsWith(board);
        failures += problems.length > 0 ? 1 : 0;
        console.log(
          "    " +
            String(board.step + 1).padStart(4) +
            "  " +
            String(board.activity).padEnd(34) +
            String(board.level ?? "-").padStart(3) +
            String(board.art.length).padStart(6) +
            (board.art.length ? `${Math.round(board.minArt)}px` : "—").padStart(9) +
            (board.prompt?.layout === "subject"
              ? `${Math.round(board.prompt.share * 100)}%`
              : "—"
            ).padStart(9) +
            String(board.count).padStart(7) +
            `${board.board}px`.padStart(8) +
            `${board.viewport - SHELL_CHROME}px`.padStart(9) +
            `${Math.round(board.minTouch)}px`.padStart(11) +
            String(board.overlaps).padStart(10) +
            String(board.clipped).padStart(9) +
            (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
        );
      }

      /* The reach, read off the round itself. Boards have to be drawn at the
         entry level — a library nothing reaches is a library nobody has to
         maintain — and they have to be drawn *above* it too, because a zero
         there means something started gating the drawing on the level again.
         The second half is the one that changed. */
      const entry = boards.filter((b) => b.level === 1);
      const above = boards.filter((b) => b.level !== null && b.level > 1);
      const drawnEntry = entry.filter((b) => b.art.length).length;
      const drawnAbove = above.filter((b) => b.art.length).length;
      const ladder = drawnEntry > 0 && drawnAbove > 0;
      if (!ladder) failures += 1;

      const all = boards.length === STEPS;
      if (!all) failures += 1;
      if (last.trouble.length) failures += 1;

      const anchored = boards.filter((b) => b.anchor).length;

      console.log(
        `    ${boards.length}/${STEPS} boards drawn, ` +
          `pictures on ${drawnEntry}/${entry.length} entry-level boards and ` +
          `${drawnAbove}/${above.length} above it, ` +
          `anchors on ${anchored}, ` +
          `${last.trouble.length} console problems` +
          `  ${all && ladder && !last.trouble.length ? "✓" : "✗"}\n`,
      );
    }
  }

  /* Back to a phone for the behaviour runs: if it works there it works. */
  await applyViewport(cdp, sessionId, VIEWPORTS[0]);

  process.stdout.write("  … accessible names\n");

  /* The claim the whole promotion rests on: a screen reader hears the same
     board whether it was drawn or glyphed, because the word for a thing lives
     in the item's accessible name and never in the picture. So no accessible
     name anywhere in the round may contain a pictograph — if one did, that
     board's words would be coming from the fallback rather than from the
     content, and promoting a fact would quietly change what is spoken. */
  const names = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    await countSteps(cdp, sessionId);

    const seen = [];
    for (let index = 0; index < STEPS; index++) {
      const state = await jump(cdp, sessionId, index);
      if (state.over || !state.kind) break;
      seen.push(...state.names);
      /* The hidden text as well as the labels — an order line says a slot's
         place in an `sr-only` span rather than in an attribute. Live regions
         are left out: a `role="status"` is *meant* to be empty until there is
         something to announce, and counting it as a nameless thing would be
         counting the one element whose emptiness is the point. */
      const sr = await evaluate(
        cdp,
        sessionId,
        `[...document.querySelectorAll('[data-round-board] .sr-only')]
           .filter((el) => !el.closest('[role="status"],[aria-live]'))
           .map((el) => el.textContent.trim())`,
      );
      seen.push(...(Array.isArray(sr) ? sr : []));
    }

    const pictographs = /\p{Extended_Pictographic}/u;
    return {
      total: seen.length,
      empty: seen.filter((name) => !name.trim()).length,
      withGlyphs: seen.filter((name) => pictographs.test(name)),
    };
  })();
  const namesOk =
    names.total > 0 && names.empty === 0 && names.withGlyphs.length === 0;
  if (!namesOk) failures += 1;
  console.log(
    `  accessible names: ${names.total} read, ${names.empty} empty, ` +
      `${names.withGlyphs.length} containing a picture instead of a word` +
      `  ${namesOk ? "✓" : "✗"}` +
      (names.withGlyphs.length ? `\n    ${names.withGlyphs[0]}` : ""),
  );

  process.stdout.write("  … the settle\n");

  /* Nothing shakes. A tile that is not the answer eases down a hair and comes
     back — it never moves sideways, because a sharp repeated movement is the
     hardest kind for a motion-sensitive child to sit through and because it
     was the one piece of motion in the product that existed to say a child got
     something wrong.
     Measured rather than asserted from the source: the tile's transform is
     sampled every frame across the whole animation, and the horizontal
     component of all of them has to be zero. */
  const nudge = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);

    /* A choice board is the only kind that can be answered wrongly by a single
       tap, and the round has four of them. Each is tried in turn until one
       actually produces a miss — a board whose first tap happens to be right
       hands over before it can be measured, and one lucky deal should not be
       able to skip the check. */
    const choices = (await tour(cdp, sessionId))
      .filter((entry) => entry.kind === "choice")
      .map((entry) => entry.step);

    for (const index of choices) {
      const state = await jump(cdp, sessionId, index);
      const result = await tryToMiss(cdp, sessionId, state);
      if (result) return result;
    }

    /* A round whose every first tap happened to be right is not a failure —
       it is a run that could not ask the question. Say so rather than pass. */
    return { measured: false, moved: 0 };
  })();

  const nudgeOk = !nudge.measured || nudge.moved < 1;
  if (!nudgeOk) failures += 1;
  console.log(
    nudge.measured
      ? `  the settle: a tile that is not the answer moves ` +
          `${Math.round(nudge.moved * 100) / 100}px sideways — nothing shakes` +
          `  ${nudgeOk ? "✓" : "✗"}`
      : `  the settle: not exercised (no wrong tap landed this run)  —`,
  );

  process.stdout.write("  … the connect affordance\n");

  /* The invited state, measured on the thing itself rather than read from the
     source: the moment one side of a connect board is chosen, every open node
     on the other side has to say so (`data-state="invited"`) — that is the
     whole answer to "now what?" on a board with no instructions. And the
     lines are counted at both ends of the game: a fresh board holds none, and
     a solved board holds exactly one per pair. */
  const affordance = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    await countSteps(cdp, sessionId);
    const steps = (await tour(cdp, sessionId)).filter(
      (entry) => entry.kind === "connect",
    );

    const boards = [];
    for (const entry of steps) {
      let state = await jump(cdp, sessionId, entry.step);
      const fresh = state.lines ?? 0;
      const pairs = state.targets.filter((t) => t.side === "left").length;

      /* Choose one, and count who answers. */
      const first = state.targets.find(
        (t) => t.side === "left" && t.state !== "matched",
      );
      let invited = 0;
      let open = 0;
      if (first) {
        await tapAt(cdp, sessionId, first.centre);
        await settle(cdp, sessionId, 250);
        state = await look(cdp, sessionId);
        invited = state.targets.filter(
          (t) => t.side === "right" && t.state === "invited",
        ).length;
        open = state.targets.filter(
          (t) => t.side === "right" && t.state !== "matched",
        ).length;
      }

      /* Solve it, then count the joins it is holding. A board that handed
         over before it could be looked at is unmeasured, not wrong. */
      const done = await playPairs(cdp, sessionId, state);
      const counted = !done.over && done.step === entry.step && solved(done);
      boards.push({
        activity: entry.activity,
        ok:
          fresh === 0 &&
          open > 0 &&
          invited === open &&
          (!counted || done.lines === pairs),
        fresh,
        invited,
        open,
        lines: counted ? done.lines : null,
        pairs,
      });
    }
    return boards;
  })();

  const affordanceOk =
    affordance.length > 0 && affordance.every((board) => board.ok);
  if (!affordanceOk) failures += 1;
  console.log(
    `  the connect affordance: ${affordance.length} boards — ` +
      `every open destination invited on ${
        affordance.filter((b) => b.open > 0 && b.invited === b.open).length
      }, ` +
      `no lines before play on ${affordance.filter((b) => b.fresh === 0).length}, ` +
      `one line per pair on ${
        affordance.filter((b) => b.lines !== null && b.lines === b.pairs).length
      }/${affordance.filter((b) => b.lines !== null).length} solved` +
      `  ${affordanceOk ? "✓" : "✗"}` +
      (affordanceOk
        ? ""
        : `\n    ${JSON.stringify(affordance.find((b) => !b.ok))}`),
  );

  process.stdout.write("  … reduced motion\n");

  /* Reduced motion loses no picture and no state. Every board is toured again
     with the media feature on, and the drawings are counted board by board:
     what a child who cannot sit through movement sees has to be the same
     board, not a plainer one. Then the round is played through, so a state
     that was only ever communicated by an animation would strand the run. */
  const reduced = await (async () => {
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );

    await visit(cdp, sessionId, URL_UNDER_TEST);
    await countSteps(cdp, sessionId);
    const boards = await tour(cdp, sessionId);
    const problems = boards.flatMap((board) => problemsWith(board));

    await visit(cdp, sessionId, URL_UNDER_TEST);
    let state = await look(cdp, sessionId);
    const kinds = [];
    for (let index = 0; index < STEPS && !state.over; index++) {
      kinds.push(state.kind);
      state = await play(cdp, sessionId, state);
    }

    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
    return {
      boards: boards.length,
      art: boards.reduce((total, board) => total + board.art.length, 0),
      problems,
      played: kinds.length,
      over: state.over,
      trouble: state.trouble ?? [],
    };
  })();
  const reducedOk =
    reduced.boards === STEPS &&
    reduced.problems.length === 0 &&
    reduced.over &&
    reduced.played === STEPS &&
    reduced.trouble.length === 0;
  if (!reducedOk) failures += 1;
  console.log(
    `  reduced motion: ${reduced.boards}/${STEPS} boards, ${reduced.art} drawings still ` +
      `on them, ${reduced.problems.length} layout problems, played ` +
      `${reduced.played}/${STEPS} through` +
      `${reduced.over ? "" : ", never reached the end"}` +
      `${reduced.trouble.length ? `, ${reduced.trouble.length} console problems` : ""}` +
      `  ${reducedOk ? "✓" : "✗"}` +
      (reduced.problems.length ? `\n    ${reduced.problems[0]}` : "") +
      (reduced.trouble.length ? `\n    ${reduced.trouble[0]}` : ""),
  );

  process.stdout.write("  … playing the round through\n");

  /* The round end to end, the way a child would meet it. Every option is
     tried on every board because the script does not know any answer — which
     is also the plainest proof there is that a wrong touch costs nothing. */
  const played = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const seen = new Set();
    const kinds = [];
    let state = await look(cdp, sessionId);

    for (let index = 0; index < STEPS && !state.over; index++) {
      kinds.push(state.kind);
      seen.add(
        await evaluate(cdp, sessionId, `document.body.innerText.replace(/\\s+/g, " ")`),
      );
      state.targets.forEach((target) => target.label && seen.add(target.label));
      state = await play(cdp, sessionId, state);
    }

    const banned = /\b(wrong|incorrect|failed|you lost|game over|score|lives)\b/i;
    return {
      kinds,
      over: state.over,
      trouble: state.trouble ?? [],
      bad: [...seen].filter((text) => banned.test(text)),
    };
  })();

  const wholeRound =
    played.over && played.kinds.length === STEPS && !played.trouble.length;
  if (!wholeRound) failures += 1;
  console.log(
    `  plays through: ${played.kinds.length}/${STEPS} boards, ` +
      `${new Set(played.kinds).size} interactions (${[...new Set(played.kinds)].join(", ")}), ` +
      `${played.trouble.length} console problems  ${wholeRound ? "✓" : "✗"}`,
  );

  if (played.bad.length) failures += 1;
  console.log(
    `  language: nothing in a whole round says wrong, failed, score or lives` +
      `  ${played.bad.length === 0 ? "✓" : "✗"}` +
      (played.bad.length ? `\n    ${played.bad[0].slice(0, 160)}` : ""),
  );

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  if (WATCHDOG) clearTimeout(WATCHDOG);
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
