/**
 * Measures the Connect board in a real browser, at every screen a child might
 * hold.
 *
 * It answers the questions a phone actually asks — does anything spill off the
 * side, is every node big enough for a four year old's finger, do two nodes
 * overlap, is a line drawn outside the board — and then plays the board with a
 * mouse to prove the thing works and not just fits.
 *
 *   node scripts/measure-viewports.mjs [url]
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
  rectOf,
  settle,
  visit,
} from "./cdp.mjs";
import { requireDevPages } from "./measure-mode.mjs";

const URL_UNDER_TEST = process.argv[2] ?? "http://127.0.0.1:4310/playground/connect";

/**
 * Everything measurable about the page, gathered in one pass.
 *
 * In the page rather than over the wire because a layout has to be read in one
 * frame: asking for eight rectangles one at a time invites a re-layout in
 * between and measures a board that never existed.
 */
const MEASURE = `(() => {
  const doc = document.scrollingElement;
  const nodes = [...document.querySelectorAll("[data-connect-node]")];
  const board = document.querySelector("[data-connect-node]")?.closest(".relative.grid");
  const boardBox = board?.getBoundingClientRect();
  const lines = [...document.querySelectorAll("svg line")];

  const boxes = nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return {
      label: node.getAttribute("aria-label"),
      side: node.dataset.side,
      nodeId: node.dataset.nodeId,
      x: box.x, y: box.y, width: box.width, height: box.height,
      centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    };
  });

  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height) overlaps++;
    }
  }

  /* A line whose ends are outside the box the SVG is stretched over is a line
     the child will see cut off. */
  const clipped = lines.filter((line) => {
    const ends = [
      { x: +line.getAttribute("x1"), y: +line.getAttribute("y1") },
      { x: +line.getAttribute("x2"), y: +line.getAttribute("y2") },
    ];
    return ends.some((end) =>
      !Number.isFinite(end.x) || !Number.isFinite(end.y) ||
      end.x < -1 || end.y < -1 ||
      end.x > (boardBox?.width ?? 0) + 1 || end.y > (boardBox?.height ?? 0) + 1);
  }).length;

  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    verticalOverflow: doc.scrollHeight - doc.clientHeight,
    nodes: boxes,
    minWidth: Math.min(...boxes.map((b) => b.width)),
    minHeight: Math.min(...boxes.map((b) => b.height)),
    overlaps,
    lines: lines.length,
    clipped,
    joined: boxes.filter((b) => /joined to/.test(b.label ?? "")).length,
  };
})()`;

/** The reference activity's pairing, so the script can play a right line. */
const EATS = {
  DOG: "BONE", CAT: "FISH", RABBIT: "CARROT",
  MONKEY: "BANANA", MOUSE: "CHEESE", BEAR: "HONEY",
};

const nameOf = (label) => (label ?? "").split(",")[0].trim();

async function measureOne(cdp, sessionId, viewport, level) {
  await applyViewport(cdp, sessionId, viewport);
  await visit(cdp, sessionId, URL_UNDER_TEST);

  /* The board is dealt by level, and level 3 is the busiest one a phone has
     to hold, so both are measured rather than only the default. */
  const chip = await rectOf(cdp, sessionId, `[aria-label="Level ${level}"]`);
  if (chip) {
    await clickAt(cdp, sessionId, chip);
    await settle(cdp, sessionId, 300);
  }

  const before = await evaluate(cdp, sessionId, MEASURE);

  /* Play one right line, with the mouse, exactly as a child would. */
  const left = before.nodes.find((node) => node.side === "left");
  const wanted = EATS[nameOf(left?.label)];
  const right = before.nodes.find(
    (node) => node.side === "right" && nameOf(node.label) === wanted,
  );

  let after = before;
  if (left && right) {
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, right.centre);
    await settle(cdp, sessionId, 500);
    after = await evaluate(cdp, sessionId, MEASURE);
  }

  return { before, after, joinedPair: left && right ? `${nameOf(left.label)}>${wanted}` : null };
}

/* ---- run ---------------------------------------------------------------- */

let failures = 0;
let browser;

try {
  browser = await openBrowser(9333);
  await requireDevPages(browser.cdp, browser.sessionId, URL_UNDER_TEST);
  const { cdp, sessionId } = browser;

  console.log(`\n  ${URL_UNDER_TEST}\n`);
  console.log(
    "  viewport                   lvl  h-overflow  v-overflow   min node   overlaps  clipped  joined",
  );
  console.log("  " + "-".repeat(96));

  for (const viewport of VIEWPORTS) {
    for (const level of [2, 3]) {
      const { before, after, joinedPair } = await measureOne(cdp, sessionId, viewport, level);

      const problems = [];
      if (before.horizontalOverflow > 0) problems.push("horizontal scroll");
      if (before.verticalOverflow > 0) problems.push("page scrolls");
      if (before.minHeight < 44) problems.push(`node only ${Math.round(before.minHeight)}px tall`);
      if (before.overlaps > 0) problems.push(`${before.overlaps} overlapping nodes`);
      if (after.clipped > 0) problems.push(`${after.clipped} clipped lines`);
      if (after.joined !== 2) problems.push(`joining ${joinedPair} drew ${after.joined / 2} lines`);

      failures += problems.length > 0 ? 1 : 0;

      console.log(
        "  " +
          viewport.name.padEnd(26) +
          String(level).padStart(4) +
          String(before.horizontalOverflow).padStart(11) +
          String(before.verticalOverflow).padStart(12) +
          `${Math.round(before.minWidth)}×${Math.round(before.minHeight)}`.padStart(11) +
          String(before.overlaps).padStart(11) +
          String(after.clipped).padStart(9) +
          String(after.joined / 2).padStart(8) +
          (problems.length ? `   ✗ ${problems.join(", ")}` : "   ✓"),
      );
    }
  }

  /* And once with no mouse at all: focus a node, press Enter, focus its
     partner, press Enter. §9 — the board has to be playable this way. */
  const keyboard = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const labels = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-connect-node]")].map((n) => ({
        side: n.dataset.side, id: n.dataset.nodeId, label: n.getAttribute("aria-label") }))`,
    );
    const left = labels.find((n) => n.side === "left");
    const wanted = EATS[nameOf(left?.label)];
    const right = labels.find((n) => n.side === "right" && nameOf(n.label) === wanted);
    if (!left || !right) return { ok: false, why: "no pair to play" };

    for (const node of [left, right]) {
      await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-node-id="${node.id}"][data-side="${node.side}"]').focus()`,
      );
      await pressEnter(cdp, sessionId);
      await settle(cdp, sessionId, 200);
    }
    await settle(cdp, sessionId, 500);

    const joined = await evaluate(
      cdp,
      sessionId,
      `[...document.querySelectorAll("[data-connect-node]")]
        .filter((n) => /joined to/.test(n.getAttribute("aria-label") ?? "")).length`,
    );
    const focusRing = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const node = document.querySelector("[data-connect-node]");
        node.focus();
        return getComputedStyle(node).outlineWidth;
      })()`,
    );
    return { ok: joined === 2, joined, focusRing };
  })();

  if (!keyboard.ok) failures += 1;
  console.log(
    `\n  keyboard: focus + Enter twice joined ${(keyboard.joined ?? 0) / 2} line(s)` +
      `, focus ring ${keyboard.focusRing ?? "?"}  ${keyboard.ok ? "✓" : "✗"}`,
  );

  /* A wrong line: drawn, then let go, with nothing taken away. §6. */
  const wrong = await (async () => {
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const nodes = (await evaluate(cdp, sessionId, MEASURE)).nodes;
    const left = nodes.find((n) => n.side === "left");
    const wantedName = EATS[nameOf(left?.label)];
    const badRight = nodes.find(
      (n) => n.side === "right" && nameOf(n.label) !== wantedName,
    );
    if (!left || !badRight) return { ok: false };

    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, badRight.centre);
    await settle(cdp, sessionId, 150);
    const shown = await evaluate(cdp, sessionId, MEASURE);
    await settle(cdp, sessionId, 1200);
    const later = await evaluate(cdp, sessionId, MEASURE);

    return {
      ok: shown.lines >= 1 && later.lines === 0 && later.joined === 0,
      drawn: shown.lines,
      afterwards: later.lines,
      joined: later.joined,
    };
  })();

  if (!wrong.ok) failures += 1;
  console.log(
    `  wrong line: drew ${wrong.drawn ?? 0}, then ${wrong.afterwards ?? "?"} left on the board` +
      `, ${wrong.joined ?? "?"} nodes joined  ${wrong.ok ? "✓" : "✗"}`,
  );

  /* Reduced motion: the connection is simply there, with nothing travelling. */
  const reduced = await (async () => {
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
    await visit(cdp, sessionId, URL_UNDER_TEST);
    const nodes = (await evaluate(cdp, sessionId, MEASURE)).nodes;
    const left = nodes.find((n) => n.side === "left");
    const right = nodes.find(
      (n) => n.side === "right" && nameOf(n.label) === EATS[nameOf(left?.label)],
    );
    if (!left || !right) return { ok: false };
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, right.centre);
    /* One frame, not a third of a second: it should already be whole. */
    await settle(cdp, sessionId, 60);
    const whole = await evaluate(
      cdp,
      sessionId,
      `(() => {
        /* A finished join is the path marked \`data-connect-line\`, not the
           \`<line>\` an attempt is drawn with: asking for \`svg line\` here
           finds the attempt that has already gone, reads nothing, and calls a
           whole line part-drawn. */
        const line = document.querySelector("[data-connect-line]");
        if (!line) return 0;
        /* A part-drawn line carries a dash offset; a finished one does not. */
        const style = getComputedStyle(line);
        return style.strokeDashoffset === "0px" || style.strokeDasharray === "none" ? 1 : 0;
      })()`,
    );
    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
    return { ok: whole === 1 };
  })();

  if (!reduced.ok) failures += 1;
  console.log(
    `  reduced motion: the line is whole on the first frame  ${reduced.ok ? "✓" : "✗"}`,
  );

  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
