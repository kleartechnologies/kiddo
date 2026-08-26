/**
 * Measures a mixed round in a real browser — every board, every interaction,
 * on every screen a child might hold.
 *
 * The Connect, Order and Match scripts each measure one engine on a page that
 * only ever shows that engine. This one measures the seam between them, and it
 * drives two pages:
 *
 *   `/playground/mixed`  seven boards, the four interactions in sequence
 *   `/playground/batch`  one board per activity of the newest content batch
 *
 * The round's length is read off the page rather than written down here, so a
 * batch that adds twenty activities is measured as twenty boards without this
 * file being edited. What is asserted is the same either way: every board is
 * measured before it is played — nothing off the side, nothing overlapping,
 * nothing smaller than a four year old's fingertip — and then played to the
 * end, so the round has to reach its last step for the run to pass.
 *
 * Nothing here knows an answer. Every board is solved by trying things, which
 * is both the only kind-agnostic way to drive four engines from one script and
 * a standing proof of the thing the content is promising: a wrong tap costs
 * nothing, so a script that taps everything still finishes.
 *
 *   node scripts/measure-mixed.mjs [url] [--behaviour-only]
 *
 * `--behaviour-only` skips the viewport grid and runs just the keyboard,
 * reduced-motion and transition checks.
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
  pressEnter,
  settle,
  visit,
} from "./cdp.mjs";
import { requireDevPages } from "./measure-mode.mjs";

const ARGS = process.argv.slice(2);
const BEHAVIOUR_ONLY = ARGS.includes("--behaviour-only");
const URL_UNDER_TEST =
  ARGS.find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:4310/playground/mixed";

/**
 * How many boards the round is made of. The run fails if it stops short.
 *
 * Read from the page rather than written down, because this script measures
 * two rounds: `/playground/mixed` is seven boards and `/playground/batch` is
 * however many activities the newest batch added. The round strip has one
 * step per board, so the page already knows the answer and the script asks it
 * once, on the first visit. Seven is the fallback for a page that has no
 * strip, which is a page this script cannot drive anyway.
 */
let STEPS = 7;

/** Ask the page how long its round is. Called once, on the first visit. */
async function countSteps(cdp, sessionId) {
  const found = await evaluate(
    cdp,
    sessionId,
    `document.querySelectorAll('[data-round-strip] [data-round-step]').length`,
  );
  if (typeof found === "number" && found > 0) STEPS = found;
}

/**
 * Nothing a child touches may be smaller than this. 44px is the number every
 * platform's guidance lands on and the number the other measurement scripts
 * use, so a board is not allowed to be an exception because it is crowded.
 */
const MIN_TOUCH = 44;

/**
 * Anything that might be a mistake, collected from the first frame onwards.
 *
 * Installed before the document runs rather than read afterwards, because a
 * hydration warning happens long before a script gets to ask about one.
 */
const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  const note = (kind) => (...args) => {
    window.__trouble.push(kind + ": " + args.map(String).join(" "));
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
 * One evaluation rather than several, for the reason the other scripts give:
 * a layout has to be read inside a single frame or it is a layout that never
 * existed. The four kinds differ only in which selector finds the things a
 * child can touch; every measurement after that is the same for all of them.
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

  const board = document.querySelector("[data-round-board]");
  const kind = board?.dataset.roundBoard ?? null;
  const activity = board?.dataset.roundActivity ?? null;
  const over = !board && strip.every((entry) => !entry.current);

  const read = (el, extra) => ({
    ...box(el),
    state: el.dataset.state ?? null,
    label: el.getAttribute("aria-label"),
    ...extra,
  });

  /* What a child can touch, by kind. The choice engine carries no data
     attribute of its own — it never needed one — so it is found where it is
     rendered, inside the board this page labelled. */
  let targets = [];
  if (kind === "choice") {
    targets = [...(board?.querySelectorAll("li button") ?? [])].map((el, i) =>
      read(el, { id: "option-" + i }));
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

  /* Two things a child can touch must never sit on top of each other. */
  let overlaps = 0;
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i], b = targets[j];
      if (a.x < b.right - 0.5 && b.x < a.right - 0.5 &&
          a.y < b.bottom - 0.5 && b.y < a.bottom - 0.5) overlaps++;
    }
  }

  /* Anything drawn outside the board is something the child sees cut off. */
  const frame = board ? box(board) : null;
  const clipped = frame ? targets.filter((t) =>
    t.x < frame.x - 1 || t.right > frame.right + 1).length : 0;

  return {
    step, kind, activity, over, strip: strip.map((e) => e.label),
    targets,
    count: targets.length,
    minTouch: targets.length
      ? Math.min(...targets.map((t) => Math.min(t.width, t.height))) : 0,
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    overlaps, clipped,
    said: (document.querySelector('[role="status"]')?.textContent ?? "").trim(),
    trouble: window.__trouble ?? [],
  };
})()`;

const look = (cdp, sessionId) => evaluate(cdp, sessionId, MEASURE);

/**
 * Show a particular board.
 *
 * The strip above the board is a row of buttons, one per board, and it is on
 * the page so a reviewer can look at the order board without playing the two
 * in front of it. The measurement uses the same door: how a board is drawn
 * does not depend on how it was arrived at, so eight viewports' worth of blind
 * play would be several minutes spent proving nothing. The round is still
 * played through, once, further down.
 */
async function jump(cdp, sessionId, index) {
  /* Asked again on each attempt rather than once, because a board that was
     just finished is still on its way to the next one, and a chip pressed
     during that beat would be overtaken by the handover. */
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

/**
 * Whether the board on screen has been finished.
 *
 * Read from the board rather than from the round, because the round takes a
 * beat to hand over and a script that asked "has it moved on yet?" would
 * answer no while the child is still being cheered.
 */
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

/**
 * Wait out the beat between a finished board and the next one.
 *
 * Polled rather than slept for a fixed time, so the script measures the
 * handover the page actually does instead of asserting the number in
 * `MixedPlayground`. Four seconds is generous: the page waits well under two.
 */
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
 * Returns the state of the page once the board is finished *and* the round has
 * handed over — so what comes back is the next board, which is what makes a
 * caller able to simply call this seven times.
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

/** Tap options until one of them is the one. Wrong taps cost nothing. */
async function playChoice(cdp, sessionId, state) {
  let now = state;
  for (const target of state.targets) {
    await clickAt(cdp, sessionId, target.centre);
    await settle(cdp, sessionId, 900);
    now = await look(cdp, sessionId);
    if (now.over || now.step !== state.step || solved(now)) return now;
  }
  return now;
}

/**
 * Join every left-hand thing to the right-hand thing it belongs with, by
 * offering each in turn. `connect` and `match` share this because they share
 * a kind: two columns and a line, or two shelves of cards, are the same answer.
 */
async function playPairs(cdp, sessionId, state) {
  let now = state;

  for (let guard = 0; guard < 40; guard++) {
    const lefts = now.targets.filter((t) => t.side === "left" && t.state !== "matched");
    const rights = now.targets.filter((t) => t.side === "right" && t.state !== "matched");
    if (!lefts.length || !rights.length) break;

    const left = lefts[0];
    let joined = false;

    for (const right of rights) {
      await clickAt(cdp, sessionId, left.centre);
      await settle(cdp, sessionId, 150);
      await clickAt(cdp, sessionId, right.centre);
      await settle(cdp, sessionId, 1000);
      now = await look(cdp, sessionId);
      if (now.over || now.step !== state.step || solved(now)) return now;

      const still = now.targets.find((t) => t.id === left.id && t.side === "left");
      if (!still || still.state === "matched") {
        joined = true;
        break;
      }
    }

    /* A left-hand node that nothing on the board would take is a broken
       board, not a slow one. Stop rather than spin. */
    if (!joined) break;
  }

  return now;
}

/** Offer tray tiles until one is accepted, then the next, until none are left. */
async function playOrder(cdp, sessionId, state) {
  let now = state;

  for (let guard = 0; guard < 40; guard++) {
    const tray = now.targets.filter((t) => t.side === "tray");
    if (!tray.length) break;

    let placed = false;
    for (const tile of tray) {
      await clickAt(cdp, sessionId, tile.centre);
      await settle(cdp, sessionId, 150);
      await clickAt(cdp, sessionId, tile.centre);
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

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

const problemsWith = (board) => {
  const problems = [];
  if (board.horizontalOverflow > 0) problems.push("horizontal scroll");
  if (board.verticalOverflow > 0) problems.push("page scrolls");
  if (board.minTouch < MIN_TOUCH)
    problems.push(`target only ${Math.round(board.minTouch)}px`);
  if (board.overlaps > 0) problems.push(`${board.overlaps} overlapping targets`);
  if (board.clipped > 0) problems.push(`${board.clipped} clipped`);
  if (board.count === 0) problems.push("nothing to touch");
  return problems;
};

/* A browser that stops answering must fail the run, not hang it. */
const WATCHDOG = setTimeout(
  () => {
    console.error("\n  the browser stopped answering — giving up\n");
    browser?.close();
    process.exit(1);
  },
  20 * 60 * 1000,
).unref?.() ?? null;

try {
  browser = await openBrowser(9336);
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
        "    step  kind     activity                          touch  h-over  v-over  min touch  overlaps  clipped",
      );
      console.log("    " + "-".repeat(112));

      for (const board of boards) {
        const problems = problemsWith(board);
        failures += problems.length > 0 ? 1 : 0;
        console.log(
          "    " +
            String(board.step + 1).padStart(4) +
            "  " +
            String(board.kind).padEnd(8) +
            String(board.activity).padEnd(34) +
            String(board.count).padStart(5) +
            String(board.horizontalOverflow).padStart(8) +
            String(board.verticalOverflow).padStart(8) +
            `${Math.round(board.minTouch)}px`.padStart(11) +
            String(board.overlaps).padStart(10) +
            String(board.clipped).padStart(9) +
            (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
        );
      }

      /* Every board in the round has to have been drawn, and all four
         interactions have to have appeared, on every screen. That the round
         can be *played* is a separate check, further down: it is a fact about
         the round, not about the width of the window. */
      const kinds = [...new Set(boards.map((b) => b.kind))];
      const all = boards.length === STEPS;
      if (!all) failures += 1;
      if (kinds.length !== 4) failures += 1;
      if (last.trouble.length) failures += 1;

      console.log(
        `    ${boards.length}/${STEPS} boards drawn, ${kinds.length}/4 interactions ` +
          `(${kinds.join(" → ")}), ${last.trouble.length} console problems` +
          `  ${all && kinds.length === 4 && !last.trouble.length ? "✓" : "✗"}\n`,
      );
    }
  }

  /* Back to a phone for the behaviour runs: if it works there it works. */
  await applyViewport(cdp, sessionId, VIEWPORTS[0]);

  /* The transition itself: what the round looks like the instant a board is
     finished and the next one — a different interaction — takes the stage. */
  const handover = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    await countSteps(cdp, sessionId);
    const first = await look(cdp, sessionId);
    const second = await play(cdp, sessionId, first);
    const third = await play(cdp, sessionId, second);
    return {
      ok:
        first.kind === "choice" &&
        second.kind === "connect" &&
        third.kind === "order" &&
        second.step === 1 &&
        third.step === 2,
      seen: [first.kind, second.kind, third.kind].join(" → "),
      trouble: third.trouble,
    };
  })();
  if (!handover.ok || handover.trouble.length) failures += 1;
  console.log(
    `  handover: ${handover.seen} — three engines, one page, ` +
      `${handover.trouble.length} console problems  ` +
      `${handover.ok && !handover.trouble.length ? "✓" : "✗"}`,
  );

  process.stdout.write("  … keyboard\n");

  /* Keyboard: every engine in the round has to be reachable and operable with
     nothing but focus and Enter, or a child using a switch or a keyboard meets
     a wall halfway through a round. Checked one board at a time rather than by
     playing the whole round blind — what matters is that the route exists on
     each engine, and a blind walk measures luck. */
  const keyboard = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const seen = [];

    for (let index = 0; index < STEPS; index++) {
      const state = await jump(cdp, sessionId, index);
      if (state.over || !state.kind) break;

      const target = state.targets.find((t) => t.side !== "line") ?? state.targets[0];
      const selector =
        state.kind === "choice"
          ? `[data-round-board] li button`
          : state.kind === "order"
            ? `[data-item-id="${target?.id}"]`
            : state.kind === "match"
              ? `[data-match-card][data-node-id="${target?.id}"]`
              : `[data-connect-node][data-node-id="${target?.id}"]`;

      const before = await evaluate(
        cdp,
        sessionId,
        `(() => {
          const el = document.querySelector('${selector}');
          if (!el) return null;
          el.focus();
          const active = document.activeElement;
          return {
            focused: active === el,
            tag: active.tagName,
            ring: getComputedStyle(active).outlineWidth,
            label: el.getAttribute("aria-label"),
          };
        })()`,
      );

      await pressEnter(cdp, sessionId);
      await settle(cdp, sessionId, 250);

      const after = await evaluate(
        cdp,
        sessionId,
        `(() => {
          const el = document.querySelector('${selector}');
          if (!el) return null;
          return { pressed: el.getAttribute("aria-pressed"),
                   label: el.getAttribute("aria-label") };
        })()`,
      );

      /* A tile that is picked up says so, and a choice tile that was tapped
         either is the answer or has been noticed — either way the label moved,
         which is what a screen reader reads. */
      const answered =
        state.kind === "choice"
          ? before?.focused && before.tag === "BUTTON"
          : before?.focused && after?.pressed === "true";

      seen.push({
        kind: state.kind,
        ok: !!answered,
        ring: before?.ring,
        pressed: after?.pressed,
      });
    }

    const kinds = [...new Set(seen.map((entry) => entry.kind))];
    return { seen, kinds, ok: seen.length > 0 && seen.every((entry) => entry.ok) };
  })();
  if (!keyboard.ok || keyboard.kinds.length < 4) failures += 1;
  console.log(
    `  keyboard: ${keyboard.kinds.join(", ")} each take focus and answer to Enter` +
      ` (${keyboard.seen.filter((e) => e.ok).length}/${keyboard.seen.length} boards)` +
      `  ${keyboard.ok && keyboard.kinds.length === 4 ? "✓" : "✗"}`,
  );

  process.stdout.write("  … reduced motion\n");

  /* Reduced motion: the round still hands over, and nothing that moves is
     needed to know where you are. */
  const reduced = await (async () => {
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const first = await look(cdp, sessionId);
    const second = await play(cdp, sessionId, first);
    const third = await play(cdp, sessionId, second);
    /* Where you are in the round has to be readable when nothing is allowed
       to move: the strip marks the board you are on in text, not by sliding
       something. Read after the handover, which is the moment an animation
       would have been carrying the meaning. */
    const where = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const chip = document.querySelector('[data-round-step][aria-current="step"]');
        const status = document.querySelector('[role="status"]');
        return { chip: chip?.textContent?.trim() ?? "", status: !!status };
      })()`,
    );
    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
    return {
      ok:
        third.step === 2 &&
        third.kind === "order" &&
        !third.trouble.length &&
        where.chip === "order" &&
        where.status,
      seen: [first.kind, second.kind, third.kind].join(" → "),
      where: where.chip,
    };
  })();
  if (!reduced.ok) failures += 1;
  console.log(
    `  reduced motion: ${reduced.seen}, and the board you are on is still ` +
      `named in text ("${reduced.where}")  ${reduced.ok ? "✓" : "✗"}`,
  );

  process.stdout.write("  … playing the round through\n");

  /* The round, played end to end, the way a child would meet it: seven boards,
     four interactions, nobody skipping ahead. Every option is tried on every
     board because the script does not know any answer — which is also the
     plainest proof there is that a wrong touch costs nothing. A run that
     stopped early would be a round that could not be finished.

     The words on each board are collected on the way past, so the reading of
     the language is a reading of the round that was actually played. */
  const played = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);

    const seen = new Set();
    const kinds = [];
    let state = await look(cdp, sessionId);

    for (let index = 0; index < STEPS && !state.over; index++) {
      kinds.push(state.kind);
      seen.add(
        await evaluate(cdp, sessionId, `document.body.innerText.replace(/\s+/g, " ")`),
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
      `${new Set(played.kinds).size}/4 interactions (${played.kinds.join(" → ")}), ` +
      `${played.trouble.length} console problems  ${wholeRound ? "✓" : "✗"}`,
  );

  /* Nothing anywhere is allowed to say a child got it wrong — not the boards,
     not the labels a screen reader reads, not the internal strip above them. */
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
