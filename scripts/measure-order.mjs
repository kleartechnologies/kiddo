/**
 * Measures the Order board in a real browser, at every screen a child might
 * hold.
 *
 * The same questions the Connect script asks — does anything spill off the
 * side, is every tile big enough for a four year old's finger, does anything
 * overlap or get cut off — and then plays the board through to the end with a
 * mouse, with a drag, and with nothing but the keyboard, because a board that
 * fits and cannot be played has not been measured.
 *
 *   node scripts/measure-order.mjs [url] [--behaviour-only]
 *
 * `--behaviour-only` skips the viewport grid and runs just the drag, keyboard,
 * wrong-tile, finished and reduced-motion checks — the ones worth re-running
 * while an interaction is being fixed.
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
  ARGS.find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:4310/playground/order";

/**
 * Everything measurable about the board, gathered in one pass.
 *
 * One evaluation rather than eight, for the same reason as the Connect
 * script: a layout has to be read inside a single frame or it is a layout that
 * never existed.
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

  const line = document.querySelector("[data-order-line]");
  const lineBox = line ? box(line) : null;
  const slots = line ? [...line.querySelectorAll("li")].map((li, index) => ({
    index,
    /* Green means the content layer accepted it; dashed means it is waiting. */
    filled: !!li.querySelector(".bg-yes-soft"),
    next: !!li.querySelector("[data-order-slot]"),
    said: (li.querySelector(".sr-only")?.textContent ?? "").trim(),
    ...box(li.firstElementChild ?? li),
  })) : [];

  const tiles = [...document.querySelectorAll("[data-order-tile]")].map((tile) => ({
    id: tile.dataset.itemId,
    state: tile.dataset.state,
    label: tile.getAttribute("aria-label"),
    pressed: tile.getAttribute("aria-pressed"),
    ...box(tile),
  }));

  /* Two things a child can touch must never sit on top of each other. */
  const touchable = [...slots, ...tiles];
  let overlaps = 0;
  for (let i = 0; i < touchable.length; i++) {
    for (let j = i + 1; j < touchable.length; j++) {
      const a = touchable[i], b = touchable[j];
      if (a.x < b.right - 0.5 && b.x < a.right - 0.5 &&
          a.y < b.bottom - 0.5 && b.y < a.bottom - 0.5) overlaps++;
    }
  }

  /* A tile drawn outside the board is a tile the child sees cut off. */
  const boardEl = line?.parentElement;
  const board = boardEl ? box(boardEl) : null;
  const clipped = board ? touchable.filter((t) =>
    t.x < board.x - 1 || t.right > board.right + 1).length : 0;

  /* Every place in the line should sit on one row, the same size as the next.
     A row that has drifted is the first thing that looks wrong to an adult and
     the first thing that confuses a child. */
  const tops = slots.map((s) => Math.round(s.y));
  const widths = slots.map((s) => Math.round(s.width));
  const rows = new Set(tops).size;
  const widthSpread = widths.length ? Math.max(...widths) - Math.min(...widths) : 0;

  const filledCount = slots.filter((s) => s.filled).length;

  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    slots, tiles, lineBox,
    places: slots.length,
    trayCount: tiles.length,
    minTile: tiles.length ? Math.min(...tiles.map((t) => Math.min(t.width, t.height))) : 0,
    minTileHeight: tiles.length ? Math.min(...tiles.map((t) => t.height)) : 0,
    minSlot: slots.length ? Math.min(...slots.map((s) => Math.min(s.width, s.height))) : 0,
    overlaps, clipped, rows, widthSpread, filledCount,
    complete: /All in order|in order\\./.test(
      document.querySelector('[role="status"]')?.textContent ?? "") ||
      document.querySelectorAll("[data-order-tile]").length === 0,
  };
})()`;

/** The number a tray tile is showing. The reference activity counts. */
const valueOf = (tile) => Number.parseInt(String(tile.label ?? "").trim(), 10);

/** The tile the content layer is waiting for: smallest still in the tray. */
const nextRight = (tiles) =>
  [...tiles].sort((a, b) => valueOf(a) - valueOf(b))[0];

const statusOf = (cdp, sessionId) =>
  evaluate(
    cdp,
    sessionId,
    `document.querySelector('[role="status"]')?.textContent ?? ""`,
  );

/** Play the whole board through with the mouse, tap-tap, one tile at a time. */
async function playThrough(cdp, sessionId) {
  for (let guard = 0; guard < 8; guard++) {
    const state = await evaluate(cdp, sessionId, MEASURE);
    if (state.tiles.length === 0) return state;
    const tile = nextRight(state.tiles);
    await clickAt(cdp, sessionId, tile.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, tile.centre);
    await settle(cdp, sessionId, 850);
  }
  return evaluate(cdp, sessionId, MEASURE);
}

async function measureOne(cdp, sessionId, viewport, level) {
  await applyViewport(cdp, sessionId, viewport);
  await visit(cdp, sessionId, URL_UNDER_TEST);

  const chip = await rectOf(cdp, sessionId, `[aria-label="Level ${level}"]`);
  if (chip) {
    await clickAt(cdp, sessionId, chip);
    await settle(cdp, sessionId, 300);
  }

  const before = await evaluate(cdp, sessionId, MEASURE);
  const after = await playThrough(cdp, sessionId);
  return { before, after };
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

try {
  browser = await openBrowser(9334);
  const { cdp, sessionId } = browser;

  console.log(`\n  ${URL_UNDER_TEST}\n`);
  if (!BEHAVIOUR_ONLY) {
    console.log(
      "  viewport                   lvl  tiles  h-over  v-over   min tile   min slot  rows  spread  overlaps  clipped  played",
    );
    console.log("  " + "-".repeat(120));
  }

  for (const viewport of BEHAVIOUR_ONLY ? [] : VIEWPORTS) {
    /* Level 1 is three tiles — the smallest order the content layer deals.
       Level 3 is five — the largest it deals at all. */
    for (const level of [1, 3]) {
      const { before, after } = await measureOne(cdp, sessionId, viewport, level);

      const problems = [];
      if (before.horizontalOverflow > 0) problems.push("horizontal scroll");
      if (before.verticalOverflow > 0) problems.push("page scrolls");
      if (after.horizontalOverflow > 0) problems.push("horizontal scroll while playing");
      if (before.minTile < 44) problems.push(`tile only ${Math.round(before.minTile)}px`);
      if (before.minSlot < 44) problems.push(`place only ${Math.round(before.minSlot)}px`);
      if (before.overlaps > 0) problems.push(`${before.overlaps} overlapping targets`);
      if (before.clipped > 0) problems.push(`${before.clipped} clipped`);
      if (before.rows !== 1) problems.push(`line wrapped onto ${before.rows} rows`);
      if (before.widthSpread > 1) problems.push(`places differ by ${before.widthSpread}px`);
      if (after.trayCount !== 0) problems.push(`${after.trayCount} tiles left unplayed`);

      failures += problems.length > 0 ? 1 : 0;

      console.log(
        "  " +
          viewport.name.padEnd(26) +
          String(level).padStart(4) +
          String(before.trayCount).padStart(7) +
          String(before.horizontalOverflow).padStart(8) +
          String(before.verticalOverflow).padStart(8) +
          `${Math.round(before.minTile)}px`.padStart(11) +
          `${Math.round(before.minSlot)}px`.padStart(11) +
          String(before.rows).padStart(6) +
          `${before.widthSpread}px`.padStart(8) +
          String(before.overlaps).padStart(10) +
          String(before.clipped).padStart(9) +
          `${before.trayCount - after.trayCount}/${before.trayCount}`.padStart(8) +
          (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
      );
    }
  }

  /* Back to a phone for the behaviour runs: if it works there it works. */
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);

  /* Dragging. The same tile, carried to the line instead of tapped twice. */
  const dragged = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const tile = nextRight(state.tiles);
    const slot = state.slots.find((s) => s.next) ?? state.slots[0];
    if (!tile || !slot) return { ok: false };
    await dragFromTo(cdp, sessionId, tile.centre, slot.centre);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);
    return {
      ok: after.trayCount === state.trayCount - 1,
      before: state.trayCount,
      after: after.trayCount,
    };
  })();
  if (!dragged.ok) failures += 1;
  console.log(
    `\n  drag to the line: tray ${dragged.before ?? "?"} → ${dragged.after ?? "?"}` +
      `  ${dragged.ok ? "✓" : "✗"}`,
  );

  /* Keyboard: focus a tile, Enter to pick it up, Enter to put it down. */
  const keyboard = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const tile = nextRight(state.tiles);
    if (!tile) return { ok: false };

    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('[data-item-id="${tile.id}"]').focus()`,
    );
    const ring = await evaluate(
      cdp,
      sessionId,
      `getComputedStyle(document.activeElement).outlineWidth`,
    );
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 200);
    const held = await evaluate(
      cdp,
      sessionId,
      `document.querySelector('[data-item-id="${tile.id}"]')?.getAttribute("aria-pressed")`,
    );
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 900);
    const after = await evaluate(cdp, sessionId, MEASURE);

    /* And once more through the slot button, which is the other keyboard
       route: pick a tile up, then walk to the gap and press Enter there. */
    const next = nextRight(after.tiles);
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector('[data-item-id="${next.id}"]').focus()`,
    );
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 150);
    await evaluate(cdp, sessionId, `document.querySelector("[data-order-slot]").focus()`);
    await pressEnter(cdp, sessionId);
    await settle(cdp, sessionId, 900);
    const end = await evaluate(cdp, sessionId, MEASURE);

    return {
      ok: held === "true" && after.trayCount === state.trayCount - 1 &&
          end.trayCount === state.trayCount - 2,
      ring,
      held,
      tray: `${state.trayCount} → ${after.trayCount} → ${end.trayCount}`,
      said: await statusOf(cdp, sessionId),
    };
  })();
  if (!keyboard.ok) failures += 1;
  console.log(
    `  keyboard: Enter picks up (aria-pressed ${keyboard.held ?? "?"}), Enter on the tile ` +
      `and on the gap both place — tray ${keyboard.tray ?? "?"}, focus ring ` +
      `${keyboard.ring ?? "?"}  ${keyboard.ok ? "✓" : "✗"}`,
  );

  /* A wrong arrangement: offered, refused, and given straight back. Nothing
     is taken away, and the same tile can be tried again immediately. */
  const wrong = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const right = nextRight(state.tiles);
    const bad = [...state.tiles].sort((a, b) => valueOf(b) - valueOf(a))[0];
    if (!right || !bad || bad.id === right.id) return { ok: false };

    await clickAt(cdp, sessionId, bad.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, bad.centre);
    await settle(cdp, sessionId, 150);
    const shown = await evaluate(cdp, sessionId, MEASURE);
    const said = await statusOf(cdp, sessionId);
    await settle(cdp, sessionId, 1000);
    const later = await evaluate(cdp, sessionId, MEASURE);

    /* And then the right one, to prove nothing was lost by being wrong. */
    const again = later.tiles.find((t) => t.id === right.id);
    await clickAt(cdp, sessionId, again.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, again.centre);
    await settle(cdp, sessionId, 900);
    const recovered = await evaluate(cdp, sessionId, MEASURE);

    return {
      ok:
        shown.tiles.some((t) => t.id === bad.id && t.state === "refused") &&
        later.trayCount === state.trayCount &&
        later.tiles.every((t) => t.state === "idle") &&
        recovered.trayCount === state.trayCount - 1,
      refused: shown.tiles.find((t) => t.id === bad.id)?.state,
      said: said.trim(),
      tray: `${state.trayCount} → ${later.trayCount} → ${recovered.trayCount}`,
    };
  })();
  if (!wrong.ok) failures += 1;
  console.log(
    `  wrong tile: shown "${wrong.refused ?? "?"}", KIDDO says "${wrong.said ?? ""}", ` +
      `tray ${wrong.tray ?? "?"} — nothing lost  ${wrong.ok ? "✓" : "✗"}`,
  );

  /* A finished board: every place filled, the tray gone, KIDDO saying so. */
  const finished = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const after = await playThrough(cdp, sessionId);
    const said = (await statusOf(cdp, sessionId)).trim();
    /* And it stops listening: a click on a filled place changes nothing. */
    const slot = after.slots[0];
    if (slot) await clickAt(cdp, sessionId, slot.centre);
    await settle(cdp, sessionId, 300);
    const settled = await evaluate(cdp, sessionId, MEASURE);
    return {
      ok: after.trayCount === 0 && after.places === state.trayCount &&
          settled.trayCount === 0 && /order/i.test(said),
      places: after.places,
      said,
    };
  })();
  if (!finished.ok) failures += 1;
  console.log(
    `  finished: ${finished.places ?? "?"} places filled, tray empty, KIDDO says ` +
      `"${finished.said ?? ""}"  ${finished.ok ? "✓" : "✗"}`,
  );

  /* Reduced motion: the tile is simply in place, at full size, on the first
     frame — no arrival to sit through, and the state still reads. */
  const reduced = await (async () => {
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const state = await evaluate(cdp, sessionId, MEASURE);
    const tile = nextRight(state.tiles);

    /* Picked up: no lift, because the lift is the animation. */
    await clickAt(cdp, sessionId, tile.centre);
    await settle(cdp, sessionId, 200);
    const lifted = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const el = document.querySelector('[data-item-id="${tile.id}"]');
        return { pressed: el?.getAttribute("aria-pressed"),
                 transform: getComputedStyle(el).transform };
      })()`,
    );

    await clickAt(cdp, sessionId, tile.centre);
    /* One frame, not most of a second: it should already be whole. */
    await settle(cdp, sessionId, 60);
    const whole = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const face = document.querySelector("[data-order-line] li .bg-yes-soft") ??
                     document.querySelector("[data-order-line] li div");
        const inner = face?.querySelector("span");
        if (!inner) return null;
        const style = getComputedStyle(inner);
        return { opacity: style.opacity, transform: style.transform };
      })()`,
    );
    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);

    const still = lifted.transform === "none" || lifted.transform === "matrix(1, 0, 0, 1, 0, 0)";
    const solid = whole ? Number(whole.opacity) === 1 : false;
    return { ok: still && solid && lifted.pressed === "true", lifted, whole };
  })();
  if (!reduced.ok) failures += 1;
  console.log(
    `  reduced motion: picking up moves nothing (${reduced.lifted?.transform ?? "?"}), ` +
      `the placed tile is whole on the first frame (opacity ${reduced.whole?.opacity ?? "?"})` +
      `  ${reduced.ok ? "✓" : "✗"}`,
  );

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
