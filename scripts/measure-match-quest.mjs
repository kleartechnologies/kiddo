/**
 * Plays Match Quest in a real browser, on every screen a child might hold.
 *
 * Not the playground board this time but the shipped game — ten boards, an
 * intro, a celebration, sound — so the questions are the ones a phone
 * actually asks (does anything spill off the side, is every card big enough
 * for a four year old's finger) and then the ones a round asks (does a wrong
 * pair take anything away, does the ninth board still fit, does anything
 * actually play).
 *
 *   node scripts/measure-match-quest.mjs [url] [--behaviour-only]
 *
 * Expects a server already running (`npm run build && npm start`).
 * The browser driver is in `scripts/cdp.mjs`.
 */
import {
  VIEWPORTS,
  applyViewport,
  clickAt,
  dragFromTo,
  evaluate,
  openBrowser,
  pressEnter,
  rectOf,
  settle,
  visit,
} from "./cdp.mjs";

const ARGS = process.argv.slice(2);
const BEHAVIOUR_ONLY = ARGS.includes("--behaviour-only");
const URL_UNDER_TEST =
  ARGS.find((arg) => !arg.startsWith("--")) ??
  "http://127.0.0.1:4310/play/match-quest";

/** How long the game holds a finished board before dealing the next one. */
const SETTLE = 1400;

/**
 * Watch the audio engine from outside it.
 *
 * Installed before any of the page's own script runs, so nothing has to be
 * exported for a test's benefit. Clips are fetched and handed to
 * `decodeAudioData`, so the wrapper tags each decoded buffer with the file it
 * came from and then records the tag every time a source is started. The
 * `arrayBuffer` is awaited inside the fetch wrapper rather than after it, so
 * the tag is always in place before the engine can decode.
 */
const LISTEN = `(() => {
  window.__audio = { fetched: [], played: [] };
  const named = new WeakMap();
  const pending = new Map();

  const fetched = window.fetch;
  window.fetch = async function (...args) {
    const url = String(args[0]?.url ?? args[0]);
    const response = await fetched.apply(this, args);
    if (url.includes("/audio/")) {
      const copy = await response.clone().arrayBuffer();
      pending.set(copy.byteLength, url.split("/").pop());
      window.__audio.fetched.push(url.split("/").pop());
    }
    return response;
  };

  const Ctx = window.AudioContext || window.webkitAudioContext;
  const decode = Ctx.prototype.decodeAudioData;
  Ctx.prototype.decodeAudioData = function (buffer, ...rest) {
    const name = pending.get(buffer.byteLength);
    return decode.call(this, buffer, ...rest).then((decoded) => {
      if (name) named.set(decoded, name);
      return decoded;
    });
  };

  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.__audio.played.push(named.get(this.buffer) ?? "?");
    return start.apply(this, args);
  };
})()`;

/** Everything measurable about the page, gathered in one frame. */
const MEASURE = `(() => {
  const doc = document.scrollingElement;
  const cards = [...document.querySelectorAll("[data-match-card]")];

  const boxes = cards.map((card) => {
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
      label: card.getAttribute("aria-label"),
      group: card.dataset.group,
      nodeId: card.dataset.nodeId,
      state: card.dataset.state,
      pressed: card.getAttribute("aria-pressed"),
      ariaDisabled: card.getAttribute("aria-disabled"),
      disabled: card.disabled === true,
      tag: card.tagName,
      text: card.textContent.trim(),
      /* The letter is drawn by a child of the button, not by the button, so
         the size that matters is the biggest one inside it. */
      fontSize: Math.max(
        ...[card, ...card.querySelectorAll("*")].map((node) =>
          node.textContent.trim() ? parseFloat(getComputedStyle(node).fontSize) : 0,
        ),
      ),
      x: box.x, y: box.y, width: box.width, height: box.height,
      centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      lift: style.transform,
    };
  });

  /* Two interactive targets sharing a pixel is a mis-tap waiting to happen.
     A shared edge is not an overlap, so the comparison is strict. */
  let overlaps = 0;
  let closest = Infinity;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height) overlaps++;
      const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
      const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
      closest = Math.min(closest, Math.max(gapX, gapY));
    }
  }

  const clipped = boxes.filter((b) =>
    b.x < -0.5 || b.y < -0.5 ||
    b.x + b.width > window.innerWidth + 0.5 ||
    b.y + b.height > window.innerHeight + 0.5).length;

  const bar = document.querySelector('[role="progressbar"]');
  const said = [...document.querySelectorAll('[role="status"]')]
    .map((node) => node.textContent.trim()).filter(Boolean);

  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    cards: boxes,
    pairs: boxes.length / 2,
    minWidth: boxes.length ? Math.min(...boxes.map((b) => b.width)) : 0,
    minHeight: boxes.length ? Math.min(...boxes.map((b) => b.height)) : 0,
    minFont: boxes.length ? Math.min(...boxes.map((b) => b.fontSize)) : 0,
    spacing: Number.isFinite(closest) ? Math.round(closest) : null,
    overlaps,
    clipped,
    matched: boxes.filter((b) => /matched with/.test(b.label ?? "")).length,
    selected: boxes.filter((b) => b.state === "selected").length,
    realButtons: boxes.every((b) => b.tag === "BUTTON"),
    nativeDisabled: boxes.filter((b) => b.disabled).length,
    said,
    spoken: document.querySelector("main p.font-display")?.textContent?.trim() ?? "",
    step: bar?.getAttribute("aria-label") ?? null,
    stepNow: bar ? Number(bar.getAttribute("aria-valuenow")) : null,
    intro: Boolean([...document.querySelectorAll("button")]
      .find((b) => /Let's match/.test(b.textContent))),
    celebrating: Boolean([...document.querySelectorAll("button")]
      .find((b) => /Play again/i.test(b.textContent))),
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    soundToggle: (() => {
      const b = [...document.querySelectorAll("button")]
        .find((n) => /sound|music/i.test(n.getAttribute("aria-label") ?? ""));
      return b ? { label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed") } : null;
    })(),
    audio: window.__audio ?? { fetched: [], played: [] },
    /* Scoped to the board: a line drawn *between* two cards would be the
       stage inventing a connector, but KIDDO is made of shapes and is
       allowed to be. */
    boardLines: document.querySelector('[role="group"]')?.querySelectorAll("svg line").length ?? 0,
  };
})()`;

/** "big A, not matched yet. Choose it." -> "big A" */
const nameOf = (label) => (label ?? "").split(",")[0].trim();
/** "big A" -> "A" */
const letterOf = (label) => nameOf(label).split(" ")[1] ?? "";

/** Take the pointer off the board, so nothing is measured mid-hover. */
async function park(cdp, sessionId) {
  await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mouseMoved", x: 1, y: 1, button: "none" },
    sessionId,
  );
  await settle(cdp, sessionId, 260);
}

/** Press the front door, if it is still shut. */
async function begin(cdp, sessionId) {
  const button = await rectOf(cdp, sessionId, "main button");
  if (button) {
    await clickAt(cdp, sessionId, button);
    await settle(cdp, sessionId, 700);
  }
}

/** Load the game and get to the first board. */
async function open(cdp, sessionId) {
  await visit(cdp, sessionId, URL_UNDER_TEST);
  await begin(cdp, sessionId);
  await park(cdp, sessionId);
  return evaluate(cdp, sessionId, MEASURE);
}

/** An unmatched capital, and the little letter that goes with it. */
function rightPair(cards) {
  const open = cards.filter((card) => card.state !== "matched");
  const first = open.find((card) => card.group === "left");
  const wanted = letterOf(first?.label).toLowerCase();
  const partner = open.find(
    (card) => card.group === "right" && letterOf(card.label) === wanted,
  );
  return { first, partner, wanted };
}

/** A little letter that is not the one this capital is waiting for. */
function wrongPair(cards) {
  const { first, wanted } = rightPair(cards);
  const bad = cards.find(
    (card) =>
      card.group === "right" &&
      card.state !== "matched" &&
      letterOf(card.label) !== wanted,
  );
  return { first, bad };
}

/** Pair every card on the current board, and let the next one arrive. */
async function solveBoard(cdp, sessionId, state) {
  let current = state;
  for (let round = 0; round < 8; round++) {
    const { first, partner } = rightPair(current.cards);
    if (!first || !partner) break;
    await clickAt(cdp, sessionId, first.centre);
    await settle(cdp, sessionId, 140);
    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 950);
    current = await evaluate(cdp, sessionId, MEASURE);
    if (current.matched === 0 && current.cards.length) break; /* board turned over */
  }
  await settle(cdp, sessionId, SETTLE);
  await park(cdp, sessionId);
  return evaluate(cdp, sessionId, MEASURE);
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;
const fail = () => {
  failures += 1;
};

try {
  browser = await openBrowser(9336);
  const { cdp, sessionId } = browser;
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: LISTEN }, sessionId);

  const first = await open(cdp, sessionId);
  console.log(`\n  ${URL_UNDER_TEST}  —  "${first.heading}", ${first.pairs} pairs on the first board\n`);
  if (!first.cards.length) throw new Error("no board at that URL; is the server running?");

  if (!BEHAVIOUR_ONLY) {
    console.log(
      "    viewport                 pairs  h-over  v-over    min card  font  gap  overlaps  clipped",
    );
    console.log("    " + "-".repeat(96));

    /* Two boards are measured at every size: the first, which is three
       pairs and the smallest thing the layout ever has to hold, and the
       ninth, which is five and the largest. The round is played to the ninth
       board once and the window is then resized underneath it — reloading
       would deal a different session, and there would be nothing to compare
       across sizes. Measuring is done at rest so every screen sees the same
       untouched board; a pair is played at the end of each sweep, once, to
       prove the board still behaves at that size. */
    for (const wanted of [3, 5]) {
      await applyViewport(cdp, sessionId, VIEWPORTS[0]);
      let state = await open(cdp, sessionId);
      while (state.pairs < wanted && !state.celebrating) {
        state = await solveBoard(cdp, sessionId, state);
      }
      if (state.pairs !== wanted) {
        fail();
        console.log(`    ✗ could not reach a ${wanted}-pair board`);
        continue;
      }
      console.log(`  ${wanted}-pair board — "${state.step}"`);

      for (const viewport of VIEWPORTS) {
        await applyViewport(cdp, sessionId, viewport);
        await settle(cdp, sessionId, 340);
        await park(cdp, sessionId);
        const before = await evaluate(cdp, sessionId, MEASURE);

        const problems = [];
        if (before.pairs !== wanted) problems.push(`the board changed to ${before.pairs} pairs`);
        if (before.horizontalOverflow > 0) problems.push("horizontal scroll");
        if (before.verticalOverflow > 0) problems.push("page scrolls");
        if (before.minHeight < 48) problems.push(`card only ${Math.round(before.minHeight)}px tall`);
        if (before.minWidth < 48) problems.push(`card only ${Math.round(before.minWidth)}px wide`);
        if (before.minFont < 20) problems.push(`letters only ${Math.round(before.minFont)}px`);
        if (before.spacing !== null && before.spacing < 6) problems.push(`cards ${before.spacing}px apart`);
        if (before.overlaps > 0) problems.push(`${before.overlaps} overlapping cards`);
        if (before.clipped > 0) problems.push(`${before.clipped} clipped cards`);
        if (!before.realButtons) problems.push("a card is not a button");
        if (before.nativeDisabled > 0) problems.push("a card was made unfocusable");

        if (problems.length) failures += 1;

        console.log(
          "    " +
            viewport.name.padEnd(24) +
            String(before.pairs).padStart(6) +
            String(before.horizontalOverflow).padStart(8) +
            String(before.verticalOverflow).padStart(8) +
            `${Math.round(before.minWidth)}×${Math.round(before.minHeight)}`.padStart(12) +
            `${Math.round(before.minFont)}`.padStart(6) +
            `${before.spacing}`.padStart(5) +
            String(before.overlaps).padStart(10) +
            String(before.clipped).padStart(9) +
            (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
        );
      }

      /* And once, at the last size measured, a real pair — so the sweep ends
         having played the board rather than only having looked at it. */
      const resting = await evaluate(cdp, sessionId, MEASURE);
      const { first: left, partner } = rightPair(resting.cards);
      await clickAt(cdp, sessionId, left.centre);
      await settle(cdp, sessionId, 140);
      await clickAt(cdp, sessionId, partner.centre);
      await settle(cdp, sessionId, 900);
      await park(cdp, sessionId);
      const played = await evaluate(cdp, sessionId, MEASURE);
      const ok = played.matched === 2 && played.overlaps === 0 && played.clipped === 0;
      if (!ok) failures += 1;
      console.log(
        `    played ${letterOf(left.label)}>${letterOf(partner.label)} at ${VIEWPORTS[VIEWPORTS.length - 1].name}:` +
          ` ${played.matched / 2} pair settled, ${played.overlaps} overlaps, ${played.clipped} clipped  ${ok ? "✓" : "✗"}`,
      );
      console.log("");
    }
  }

  /* Back to a phone for everything that is about behaviour rather than fit. */
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);

  /* 1 — the front door. */
  const intro = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const shut = await evaluate(cdp, sessionId, MEASURE);
    await begin(cdp, sessionId);
    const opened = await evaluate(cdp, sessionId, MEASURE);
    return {
      ok: shut.intro && shut.cards.length === 0 && !shut.step && opened.pairs === 3 && Boolean(opened.step),
      greeting: shut.spoken.slice(0, 60),
      dots: opened.step,
      pairs: opened.pairs,
    };
  })();
  if (!intro.ok) fail();
  console.log(
    `  start: no board until the child presses one thing, then ${intro.pairs} pairs and "${intro.dots}"  ${intro.ok ? "✓" : "✗"}`,
  );

  /* 2, 3 — right pairs, and what is said about them. */
  const right = await (async () => {
    let state = await open(cdp, sessionId);
    const said = [];
    for (let i = 0; i < 2; i++) {
      const { first: left, partner } = rightPair(state.cards);
      await clickAt(cdp, sessionId, left.centre);
      await settle(cdp, sessionId, 140);
      const armed = await evaluate(cdp, sessionId, MEASURE);
      await clickAt(cdp, sessionId, partner.centre);
      await settle(cdp, sessionId, 400);
      state = await evaluate(cdp, sessionId, MEASURE);
      said.push({
        pair: `${letterOf(left.label)}>${letterOf(partner.label)}`,
        pressed: armed.cards.find((c) => c.state === "selected")?.pressed,
        spoken: state.spoken,
        matched: state.matched / 2,
      });
      await settle(cdp, sessionId, 700);
      state = await evaluate(cdp, sessionId, MEASURE);
    }
    return {
      ok: said.every((s) => s.pressed === "true") && state.matched === 4,
      said,
      audio: state.audio.played.slice(),
    };
  })();
  if (!right.ok) fail();
  for (const s of right.said) {
    console.log(`  match ${s.pair}: aria-pressed ${s.pressed} while chosen, KIDDO says "${s.spoken}"`);
  }
  console.log(`      two pairs settle and stay settled  ${right.ok ? "✓" : "✗"}`);

  /* 4, 5 — a pair that does not hold, and the retry straight after it. */
  const wrong = await (async () => {
    let state = await open(cdp, sessionId);
    const before = state.cards.length;
    const { first: left, bad } = wrongPair(state.cards);
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 140);
    await clickAt(cdp, sessionId, bad.centre);
    await settle(cdp, sessionId, 200);
    const shown = await evaluate(cdp, sessionId, MEASURE);
    await settle(cdp, sessionId, 1000);
    const later = await evaluate(cdp, sessionId, MEASURE);

    /* And immediately the right one, with nothing in the way. */
    const { first: again, partner } = rightPair(later.cards);
    await clickAt(cdp, sessionId, again.centre);
    await settle(cdp, sessionId, 140);
    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 700);
    const retried = await evaluate(cdp, sessionId, MEASURE);

    const shaming = /wrong|incorrect|failed|oops|no,/i.test(shown.spoken + shown.said.join(" "));
    /* And it is heard as well as read: the gentle one, not the cheer. */
    const heard = shown.audio.played.filter((n) => /retry/.test(n)).length;
    return {
      ok:
        shown.matched === 0 &&
        later.cards.length === before &&
        retried.matched === 2 &&
        heard === 1 &&
        !shaming,
      heard,
      tried: `${letterOf(left.label)}>${letterOf(bad.label)}`,
      spoken: shown.spoken,
      before,
      after: later.cards.length,
      retried: retried.matched / 2,
      shaming,
    };
  })();
  if (!wrong.ok) fail();
  console.log(
    `  wrong pair ${wrong.tried}: KIDDO says "${wrong.spoken}", ${wrong.before} cards before and` +
      ` ${wrong.after} after — nothing lost, ${wrong.heard} retry sound, and the next try settles` +
      ` ${wrong.retried} pair  ${wrong.ok ? "✓" : "✗"}`,
  );

  /* 6 — a whole board in one gesture, dragged rather than tapped. */
  const dragged = await (async () => {
    const state = await open(cdp, sessionId);
    const { first: left, partner } = rightPair(state.cards);
    await dragFromTo(cdp, sessionId, left.centre, partner.centre);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);
    return { ok: after.matched === 2, pair: `${letterOf(left.label)}>${letterOf(partner.label)}`, matched: after.matched / 2 };
  })();
  if (!dragged.ok) fail();
  console.log(`  drag: ${dragged.pair} carried across settled ${dragged.matched} pair  ${dragged.ok ? "✓" : "✗"}`);

  /* 7 — with no mouse at all. */
  const keyboard = await (async () => {
    const state = await open(cdp, sessionId);
    const { first: left, partner } = rightPair(state.cards);
    const focus = (card) =>
      evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-node-id="${card.nodeId}"][data-group="${card.group}"]').focus()`,
      );

    await focus(left);
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 200);
    const armed = await evaluate(cdp, sessionId, MEASURE);
    await focus(partner);
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);

    const ring = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const card = document.querySelector("[data-match-card]");
        card.focus();
        return { outline: getComputedStyle(card).outlineWidth, onSelf: document.activeElement === card };
      })()`,
    );
    const settledTakesFocus = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const card = document.querySelector('[data-match-card][data-state="matched"]');
        if (!card) return false;
        card.focus();
        return document.activeElement === card && !card.disabled;
      })()`,
    );

    return {
      ok:
        armed.selected === 1 &&
        after.matched === 2 &&
        parseFloat(ring.outline) >= 3 &&
        ring.onSelf &&
        settledTakesFocus,
      armed: armed.selected,
      matched: after.matched / 2,
      outline: ring.outline,
      settledTakesFocus,
      said: after.said,
    };
  })();
  if (!keyboard.ok) fail();
  console.log(
    `  keyboard: Enter chooses (${keyboard.armed} card), Enter on the partner settles ${keyboard.matched} pair,` +
      ` focus ring ${keyboard.outline}, a settled card still takes focus: ${keyboard.settledTakesFocus}  ${keyboard.ok ? "✓" : "✗"}`,
  );
  console.log(`      it said: ${JSON.stringify(keyboard.said)}`);

  /* 8 — a whole board, and the round moving on to the next one. */
  const progression = await (async () => {
    const state = await open(cdp, sessionId);
    const before = state.step;
    const next = await solveBoard(cdp, sessionId, state);
    return {
      ok:
        next.stepNow === (state.stepNow ?? 0) + 1 &&
        next.matched === 0 &&
        next.cards.length > 0 &&
        !next.celebrating,
      before,
      after: next.step,
      pairs: next.pairs,
      said: next.said,
    };
  })();
  if (!progression.ok) fail();
  console.log(
    `  progression: "${progression.before}" → "${progression.after}", a fresh ${progression.pairs}-pair board  ${progression.ok ? "✓" : "✗"}`,
  );
  console.log(`      it said: ${JSON.stringify(progression.said)}`);

  /* 9 — all ten boards, on the smallest screen there is. */
  const finished = await (async () => {
    await applyViewport(cdp, sessionId, VIEWPORTS[0]);
    let state = await open(cdp, sessionId);
    let boards = 0;
    const sizes = [];
    while (!state.celebrating && boards < 12) {
      sizes.push(state.pairs);
      state = await solveBoard(cdp, sessionId, state);
      boards += 1;
      if (state.overlaps || state.horizontalOverflow > 0) break;
    }
    const playAgain = await rectOf(cdp, sessionId, "main button");
    return {
      ok:
        state.celebrating &&
        boards === 10 &&
        state.horizontalOverflow === 0 &&
        /* Nothing below the fold at the one moment a child is looking for a
           button: "Play again" has to be on the screen the celebration
           arrives on, not one scroll down it. */
        state.verticalOverflow === 0 &&
        Boolean(playAgain),
      boards,
      sizes: sizes.join(""),
      overflow: `${state.horizontalOverflow}/${state.verticalOverflow}`,
      audio: state.audio.played.slice(),
      celebrating: state.celebrating,
    };
  })();
  if (!finished.ok) fail();
  console.log(
    `  a whole round on a 360px phone: ${finished.boards} boards (pairs ${finished.sizes}), overflow ${finished.overflow},` +
      ` celebration ${finished.celebrating}  ${finished.ok ? "✓" : "✗"}`,
  );

  /* 10 — sound. Which files were played, and in what order. */
  const heard = finished.audio;
  const tally = heard.reduce((all, name) => ({ ...all, [name]: (all[name] ?? 0) + 1 }), {});
  /* Thirty-nine pairs make a round — 3×3 + 5×4 + 2×5 — so thirty-nine
     cheers, one bed, and one chime at the end. A short count here is how the
     board that was dealt and skipped was found. */
  const soundOk =
    tally["correct.wav"] === 39 &&
    tally["complete.wav"] === 1 &&
    tally["kiddo-world.wav"] === 1;
  if (!soundOk) fail();
  console.log(`  sound over a whole round: ${JSON.stringify(tally)}  ${soundOk ? "✓" : "✗"}`);

  /* 11 — the toggle, which has to silence all of it. */
  const muted = await (async () => {
    await applyViewport(cdp, sessionId, VIEWPORTS[1]);
    let state = await open(cdp, sessionId);
    const toggle = await rectOf(cdp, sessionId, `[aria-label="${state.soundToggle?.label}"]`);
    await clickAt(cdp, sessionId, toggle);
    await settle(cdp, sessionId, 300);
    const off = await evaluate(cdp, sessionId, MEASURE);
    const beforeCount = off.audio.played.length;

    state = await evaluate(cdp, sessionId, MEASURE);
    const { first: left, partner } = rightPair(state.cards);
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 140);
    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);

    return {
      ok:
        off.soundToggle?.pressed === "false" &&
        after.audio.played.length === beforeCount &&
        after.matched === 2,
      label: state.soundToggle?.label,
      pressed: off.soundToggle?.pressed,
      extra: after.audio.played.length - beforeCount,
      matched: after.matched / 2,
    };
  })();
  if (!muted.ok) fail();
  console.log(
    `  sound off ("${muted.label}", aria-pressed ${muted.pressed}): ${muted.extra} sounds played,` +
      ` and the pair still settles (${muted.matched})  ${muted.ok ? "✓" : "✗"}`,
  );

  /* 12 — reduced motion: nothing lifts, nothing slides, no music. */
  const reduced = await (async () => {
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
    const state = await open(cdp, sessionId);
    const { first: left, partner } = rightPair(state.cards);
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 60);
    const armed = await evaluate(cdp, sessionId, MEASURE);
    const chosen = armed.cards.find((card) => card.state === "selected");
    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 60);
    const now = await evaluate(cdp, sessionId, MEASURE);
    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
    return {
      ok: chosen?.lift === "none" && now.matched === 2 && !now.audio.played.some((n) => /world/.test(n)),
      lift: chosen?.lift,
      matched: now.matched / 2,
      music: now.audio.played.filter((n) => /world/.test(n)).length,
    };
  })();
  if (!reduced.ok) fail();
  console.log(
    `  reduced motion: choosing moves nothing (${reduced.lift}), the pair settles on the first frame` +
      ` (${reduced.matched}), ${reduced.music} music started  ${reduced.ok ? "✓" : "✗"}`,
  );

  /* 13 — what the board says to someone who cannot see it. */
  const labels = await (async () => {
    const state = await open(cdp, sessionId);
    const fresh = state.cards.every((card) => /not matched yet\. Choose it\./.test(card.label));
    const named = state.cards.every((card) => /^(big|little) [A-Za-z]$/.test(nameOf(card.label)));
    return {
      ok: fresh && named && state.realButtons && state.boardLines === 0,
      sample: state.cards.slice(0, 2).map((c) => c.label),
      buttons: state.realButtons,
    };
  })();
  if (!labels.ok) fail();
  console.log(`  labels: ${JSON.stringify(labels.sample)}, every card a real button: ${labels.buttons}  ${labels.ok ? "✓" : "✗"}`);

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
