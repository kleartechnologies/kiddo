/**
 * Measures the Match board in a real browser, at every screen a child might
 * hold.
 *
 * It answers the questions a phone actually asks — does anything spill off the
 * side, is every card big enough for a four year old's finger, do two cards
 * overlap — and then plays the board with a mouse, with a drag and with a
 * keyboard, to prove the thing works and not just fits.
 *
 *   node scripts/measure-match.mjs [url] [--behaviour-only]
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
  dragFromTo,
  evaluate,
  openBrowser,
  pressEnter,
  rectOf,
  settle,
  visit,
} from "./cdp.mjs";
import { requireDevPages } from "./measure-mode.mjs";

const ARGS = process.argv.slice(2);
const BEHAVIOUR_ONLY = ARGS.includes("--behaviour-only");
const URL_UNDER_TEST =
  ARGS.find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:4310/playground/match";

/**
 * Everything measurable about the board, gathered in one pass.
 *
 * In the page rather than over the wire because a layout has to be read in one
 * frame: asking for ten rectangles one at a time invites a re-layout in
 * between and measures a board that never existed.
 */
const MEASURE = `(() => {
  const doc = document.scrollingElement;
  const cards = [...document.querySelectorAll("[data-match-card]")];

  const boxes = cards.map((card) => {
    const box = card.getBoundingClientRect();
    return {
      label: card.getAttribute("aria-label"),
      group: card.dataset.group,
      nodeId: card.dataset.nodeId,
      state: card.dataset.state,
      pressed: card.getAttribute("aria-pressed"),
      x: box.x, y: box.y, width: box.width, height: box.height,
      centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      lift: getComputedStyle(card).transform,
    };
  });

  /* Two interactive targets sharing a pixel is a mis-tap waiting to happen.
     A shared edge is not an overlap, so the comparison is strict. */
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height) overlaps++;
    }
  }

  /* A card the child cannot see all of. There are no lines on this board, so
     the only thing that can be cut off is a card that has left the screen,
     which is the question a phone actually asks. */
  const group = document.querySelector('[role="group"]');
  const clipped = boxes.filter((b) =>
    b.x < -0.5 ||
    b.y < -0.5 ||
    b.x + b.width > window.innerWidth + 0.5 ||
    b.y + b.height > window.innerHeight + 0.5).length;

  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    cards: boxes,
    minWidth: Math.min(...boxes.map((b) => b.width)),
    minHeight: Math.min(...boxes.map((b) => b.height)),
    overlaps,
    clipped,
    matched: boxes.filter((b) => /matched with/.test(b.label ?? "")).length,
    selected: boxes.filter((b) => b.state === "selected").length,
    said: document.querySelector('[role="status"]')?.textContent ?? "",
    groups: [...document.querySelectorAll('ul[aria-label]')].map((u) => u.getAttribute("aria-label")),
    boardLabel: group?.getAttribute("aria-label") ?? null,
    svgs: document.querySelectorAll("svg line").length,
  };
})()`;

/** The reference activity's pairing, so the script can play a right pair. */
const FAMILIES = {
  DOG: "PUPPY", CAT: "KITTEN", SHEEP: "LAMB", COW: "CALF",
  HEN: "CHICK", DUCK: "DUCKLING", PIG: "PIGLET",
};

const nameOf = (label) => (label ?? "").split(",")[0].trim();

/** Take the pointer off the board, so nothing is measured mid-hover. */
async function park(cdp, sessionId) {
  await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mouseMoved", x: 1, y: 1, button: "none" },
    sessionId,
  );
  await settle(cdp, sessionId, 260);
}

/** The first card of the first group, and the card that goes with it. */
function rightPair(cards) {
  const first = cards.find((card) => card.group === "left");
  const wanted = FAMILIES[nameOf(first?.label)];
  const partner = cards.find(
    (card) => card.group === "right" && nameOf(card.label) === wanted,
  );
  return { first, partner, wanted };
}

async function measureOne(cdp, sessionId, viewport, level) {
  await applyViewport(cdp, sessionId, viewport);
  await visit(cdp, sessionId, URL_UNDER_TEST);

  /* Level 1 is the smallest board and level 3 the busiest one a phone has to
     hold, so both are measured rather than only the default. */
  const chip = await rectOf(cdp, sessionId, `[aria-label="Level ${level}"]`);
  if (chip) {
    await clickAt(cdp, sessionId, chip);
    await settle(cdp, sessionId, 300);
  }

  /* Out of the way first: a mouse resting on a card is hovering it, and a
     hovered card sits 3px higher than a card at rest. */
  await park(cdp, sessionId);
  const before = await evaluate(cdp, sessionId, MEASURE);

  /* Play one right pair, with the mouse, exactly as a child would. */
  const { first, partner, wanted } = rightPair(before.cards);
  let after = before;
  if (first && partner) {
    await clickAt(cdp, sessionId, first.centre);
    await settle(cdp, sessionId, 150);
    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 900);
    await park(cdp, sessionId);
    after = await evaluate(cdp, sessionId, MEASURE);
  }

  return {
    before,
    after,
    played: first && partner ? `${nameOf(first.label)}>${wanted}` : null,
  };
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

try {
  browser = await openBrowser(9335);
  await requireDevPages(browser.cdp, browser.sessionId, URL_UNDER_TEST);
  const { cdp, sessionId } = browser;

  /* Load it once before anything is measured, and say so if the board never
     arrived — every check below would otherwise fail for the same reason. */
  await visit(cdp, sessionId, URL_UNDER_TEST);
  const found = await evaluate(
    cdp,
    sessionId,
    `document.querySelectorAll("[data-match-card]").length`,
  );
  console.log(`\n  ${URL_UNDER_TEST}  —  ${found} cards on the board\n`);
  if (found === 0) throw new Error("no board at that URL; is the server running?");

  if (!BEHAVIOUR_ONLY) {
    console.log(
      "  viewport                   lvl  cards  h-over  v-over   min card   overlaps  clipped  found",
    );
    console.log("  " + "-".repeat(104));

    for (const viewport of VIEWPORTS) {
      for (const level of [1, 3]) {
        const { before, after, played } = await measureOne(cdp, sessionId, viewport, level);

        const problems = [];
        if (before.horizontalOverflow > 0) problems.push("horizontal scroll");
        if (before.verticalOverflow > 0) problems.push("page scrolls");
        if (before.minHeight < 48) problems.push(`card only ${Math.round(before.minHeight)}px tall`);
        if (before.minWidth < 48) problems.push(`card only ${Math.round(before.minWidth)}px wide`);
        if (before.overlaps > 0) problems.push(`${before.overlaps} overlapping cards`);
        if (after.overlaps > 0) problems.push(`${after.overlaps} overlapping after a pair`);
        if (after.clipped > 0) problems.push(`${after.clipped} clipped cards`);
        if (after.matched !== 2) problems.push(`pairing ${played} settled ${after.matched} cards`);
        if (after.verticalOverflow > 0) problems.push("the board grew off the screen");

        failures += problems.length > 0 ? 1 : 0;

        console.log(
          "  " +
            viewport.name.padEnd(26) +
            String(level).padStart(4) +
            String(before.cards.length).padStart(7) +
            String(before.horizontalOverflow).padStart(8) +
            String(before.verticalOverflow).padStart(8) +
            `${Math.round(before.minWidth)}×${Math.round(before.minHeight)}`.padStart(11) +
            String(before.overlaps).padStart(11) +
            String(after.clipped).padStart(9) +
            `${after.matched / 2}`.padStart(7) +
            (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
        );
      }
    }
    console.log("");
  }

  /* Back to a phone for the behaviour checks: if it works there it works. */
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);

  /* A whole pair in one gesture: press one card, let go over its partner. */
  const dragged = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const { cards } = await evaluate(cdp, sessionId, MEASURE);
    const { first, partner, wanted } = rightPair(cards);
    if (!first || !partner) return { ok: false, why: "no pair to play" };
    await dragFromTo(cdp, sessionId, first.centre, partner.centre);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);
    return {
      ok: after.matched === 2,
      pair: `${nameOf(first.label)}>${wanted}`,
      matched: after.matched,
      said: after.said,
    };
  })();

  if (!dragged.ok) failures += 1;
  console.log(
    `  drag: ${dragged.pair ?? "?"} carried across settled ${(dragged.matched ?? 0) / 2} pair` +
      `  ${dragged.ok ? "✓" : "✗"}`,
  );

  /* And once with no mouse at all: focus a card, press Enter, focus its
     partner, press Enter. The board has to be playable this way. */
  const keyboard = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const { cards } = await evaluate(cdp, sessionId, MEASURE);
    const { first, partner } = rightPair(cards);
    if (!first || !partner) return { ok: false, why: "no pair to play" };

    const focus = (card) =>
      evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-node-id="${card.nodeId}"][data-group="${card.group}"]').focus()`,
      );

    await focus(first);
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 200);
    const armed = await evaluate(cdp, sessionId, MEASURE);

    await focus(partner);
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);

    /* And the focus ring, which is the whole point of not using `disabled`. */
    const focused = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const card = document.querySelector("[data-match-card]");
        card.focus();
        const style = getComputedStyle(card);
        return {
          outline: style.outlineWidth,
          onSelf: document.activeElement === card,
          stillFocusable: document.activeElement?.hasAttribute("data-match-card") ?? false,
        };
      })()`,
    );

    /* A card that has been paired must still be reachable — `aria-disabled`,
       never `disabled`. */
    const pairedIsFocusable = await evaluate(
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
        parseFloat(focused.outline) >= 3 &&
        pairedIsFocusable,
      armed: armed.selected,
      pressed: armed.cards.find((c) => c.state === "selected")?.pressed,
      matched: after.matched,
      outline: focused.outline,
      pairedIsFocusable,
      said: after.said,
    };
  })();

  if (!keyboard.ok) failures += 1;
  console.log(
    `  keyboard: Enter selects (aria-pressed ${keyboard.pressed}), Enter on the partner` +
      ` settles ${(keyboard.matched ?? 0) / 2} pair, focus ring ${keyboard.outline ?? "?"},` +
      ` a settled card still takes focus: ${keyboard.pairedIsFocusable}  ${keyboard.ok ? "✓" : "✗"}`,
  );
  console.log(`      it said: "${(keyboard.said ?? "").trim()}"`);

  /* A wrong pair: shown, then let go, with nothing taken away. */
  const wrong = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const { cards } = await evaluate(cdp, sessionId, MEASURE);
    const { first, wanted } = rightPair(cards);
    const bad = cards.find(
      (card) => card.group === "right" && nameOf(card.label) !== wanted,
    );
    if (!first || !bad) return { ok: false };

    await clickAt(cdp, sessionId, first.centre);
    await settle(cdp, sessionId, 150);
    await clickAt(cdp, sessionId, bad.centre);
    await settle(cdp, sessionId, 150);
    const shown = await evaluate(cdp, sessionId, MEASURE);
    await settle(cdp, sessionId, 1200);
    const later = await evaluate(cdp, sessionId, MEASURE);

    return {
      ok:
        shown.matched === 0 &&
        later.matched === 0 &&
        later.cards.length === shown.cards.length &&
        /do not go together/.test(shown.said),
      cardsBefore: shown.cards.length,
      cardsAfter: later.cards.length,
      said: shown.said,
    };
  })();

  if (!wrong.ok) failures += 1;
  console.log(
    `  wrong pair: nothing settled, ${wrong.cardsBefore ?? "?"} cards before and` +
      ` ${wrong.cardsAfter ?? "?"} after — nothing lost  ${wrong.ok ? "✓" : "✗"}`,
  );
  console.log(`      it said: "${(wrong.said ?? "").trim()}"`);

  /* The whole board, finished, on the smallest screen there is. */
  const finished = await (async () => {
    await applyViewport(cdp, sessionId, VIEWPORTS[0]);
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const chip = await rectOf(cdp, sessionId, `[aria-label="Level 3"]`);
    if (chip) {
      await clickAt(cdp, sessionId, chip);
      await settle(cdp, sessionId, 300);
    }

    let state = await evaluate(cdp, sessionId, MEASURE);
    const total = state.cards.length / 2;
    for (let round = 0; round < total; round++) {
      const open = state.cards.filter((card) => card.state !== "matched");
      const first = open.find((card) => card.group === "left");
      const wanted = FAMILIES[nameOf(first?.label)];
      const partner = open.find(
        (card) => card.group === "right" && nameOf(card.label) === wanted,
      );
      if (!first || !partner) break;
      await clickAt(cdp, sessionId, first.centre);
      await settle(cdp, sessionId, 150);
      await clickAt(cdp, sessionId, partner.centre);
      await settle(cdp, sessionId, 1000);
      state = await evaluate(cdp, sessionId, MEASURE);
    }

    return {
      ok:
        state.matched === total * 2 &&
        state.overlaps === 0 &&
        state.horizontalOverflow === 0 &&
        state.verticalOverflow === 0,
      found: state.matched / 2,
      total,
      overlaps: state.overlaps,
      overflow: `${state.horizontalOverflow}/${state.verticalOverflow}`,
      said: state.said,
    };
  })();

  if (!finished.ok) failures += 1;
  console.log(
    `  finished: ${finished.found ?? 0}/${finished.total ?? "?"} pairs on a 360px phone,` +
      ` ${finished.overlaps} overlaps, overflow ${finished.overflow}  ${finished.ok ? "✓" : "✗"}`,
  );
  console.log(`      it said: "${(finished.said ?? "").trim()}"`);

  /* Reduced motion: a chosen card does not lift and a found pair is settled
     on the first frame, with nothing sliding across the board. */
  const reduced = await (async () => {
    await applyViewport(cdp, sessionId, VIEWPORTS[1]);
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const { cards } = await evaluate(cdp, sessionId, MEASURE);
    const { first, partner } = rightPair(cards);
    if (!first || !partner) return { ok: false };

    await clickAt(cdp, sessionId, first.centre);
    /* One frame, not a third of a second: nothing should have moved at all. */
    await settle(cdp, sessionId, 60);
    const armed = await evaluate(cdp, sessionId, MEASURE);
    const chosen = armed.cards.find((card) => card.state === "selected");

    await clickAt(cdp, sessionId, partner.centre);
    await settle(cdp, sessionId, 60);
    const settledNow = await evaluate(cdp, sessionId, MEASURE);

    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);

    /* The whole page, in case anything else grew a transition. */
    const still = chosen?.lift === "none";
    return {
      ok: still && settledNow.matched === 2,
      lift: chosen?.lift,
      matched: settledNow.matched,
    };
  })();

  if (!reduced.ok) failures += 1;
  console.log(
    `  reduced motion: choosing a card moves nothing (${reduced.lift}), the pair is` +
      ` settled on the first frame (${(reduced.matched ?? 0) / 2} pair)  ${reduced.ok ? "✓" : "✗"}`,
  );

  /* And the labels, which are the board for anyone not looking at it. */
  const labels = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const unmatched = state.cards.every((card) => /not matched yet\. Choose it\./.test(card.label));
    return {
      ok: Boolean(state.boardLabel) && state.groups.length === 2 && unmatched && state.svgs === 0,
      boardLabel: state.boardLabel,
      groups: state.groups,
      svgs: state.svgs,
    };
  })();

  if (!labels.ok) failures += 1;
  console.log(
    `  labels: board "${labels.boardLabel}", groups ${JSON.stringify(labels.groups)},` +
      ` ${labels.svgs} lines drawn  ${labels.ok ? "✓" : "✗"}`,
  );

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
