/**
 * Measures the Magic Motion vocabulary in the two real, child-facing Quests
 * Phase 3 wired it into — not the playground, the pages in the catalogue.
 *
 *   counting   In Math Quest, a counting question's pips `pop` in one after
 *              another; the board does not grow, shift or scroll sideways
 *              while they do; a tile can be tapped while they are still
 *              arriving; and the round still ends in a celebration.
 *   homes      In General Knowledge Quest, the habitats slot can deal the
 *              "find its home" board. A right join walks the animal to the
 *              home it was joined to; the home and the grid stay where they
 *              are; KIDDO's bubble is the same height before, during and
 *              after every beat, on every supported screen; the round goes
 *              on to the end.
 *
 * Both are re-run under `prefers-reduced-motion: reduce`, where each motion
 * must be an instant finished state.
 *
 *   node scripts/measure-quest-magic.mjs [--only=counting,homes] [--quick]
 *
 * Expects a server already running (`npm run build && npm start -- -p 4310`).
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

const ARGS = process.argv.slice(2);
const ONLY =
  ARGS.find((arg) => arg.startsWith("--only="))
    ?.slice(7)
    .split(",") ?? null;
const QUICK = ARGS.includes("--quick");
const ORIGIN =
  ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const MATH = `${ORIGIN}/play/math-quest`;
const WORLD = `${ORIGIN}/play/general-knowledge-quest`;
const MIN_TOUCH = 48;

const wants = (section) => ONLY === null || ONLY.includes(section);
/* `--screens=0,1,2` picks viewports by index so a long run can be split. */
const PICKED =
  ARGS.find((arg) => arg.startsWith("--screens="))
    ?.slice(10)
    .split(",")
    .map(Number) ?? null;
const screens = PICKED
  ? PICKED.map((i) => VIEWPORTS[i])
  : QUICK
    ? [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]]
    : VIEWPORTS;

let failures = 0;
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(
    `  ${line}${problems.length ? `  ✗ ${problems.join(", ")}` : "  ✓"}`,
  );
};

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  window.addEventListener("error", (e) => window.__trouble.push("error: " + e.message));
  const warn = console.error.bind(console);
  console.error = (...args) => { window.__trouble.push("console: " + args.map(String).join(" ").slice(0, 160)); warn(...args); };
`;

const reduce = (cdp, sessionId, on) =>
  cdp.send(
    "Emulation.setEmulatedMedia",
    {
      features: on ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [],
    },
    sessionId,
  );

const overflow = (cdp, sessionId) =>
  evaluate(
    cdp,
    sessionId,
    `document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth`,
  );

/** Centre of the first button in <main> whose name matches. */
const BUTTON = (pattern) => `(() => {
  const b = [...document.querySelectorAll("main button")].find((b) => ${pattern}.test(b.getAttribute("aria-label") ?? b.textContent));
  if (!b) return null;
  b.scrollIntoView({ block: "center" });
  const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

const TILES = `[...document.querySelectorAll("main li button:not([data-connect-node])")].map((b) => ({
  label: b.getAttribute("aria-label") ?? b.textContent.trim(),
}))`;

const TILE_CENTRE = (
  index,
) => `(() => { const b = document.querySelectorAll("main li button:not([data-connect-node])")[${index}];
  if (!b) return null; b.scrollIntoView({ block: "center" });
  const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`;

/**
 * The first tile not yet ruled out, as an index. A tap that lands while the
 * board is still arriving is dropped by the game, so the same tile is simply
 * offered again next time round rather than skipped.
 */
const untried = (tiles) =>
  tiles.findIndex((t) => !/already tried/.test(t.label));

const CELEBRATED = `Boolean(document.querySelector("[data-magic='celebrate']"))`;
const ON_BOARD = `document.querySelectorAll("[data-connect-node]").length > 0`;
const STATUS = `document.querySelector('[role="status"]')?.textContent ?? ""`;

/** KIDDO's bubble: its height, what it says, and how tall each reserved line is. */
const BUBBLE = `(() => {
  const bubble = document.querySelector("main .rounded-card.relative");
  if (!bubble) return null;
  const b = bubble.getBoundingClientRect();
  const said = bubble.querySelector(".grid > div:not([aria-hidden])")?.textContent.trim() ?? "";
  const reserved = [...bubble.querySelectorAll(".grid > div[aria-hidden]")].map((el) => el.getBoundingClientRect().height);
  return { top: b.top, height: b.height, said, reserved };
})()`;

/* ---- counting, in Math Quest --------------------------------------------- */

/**
 * Armed before a tap: resolves once a *new* prompt row has been painted,
 * having then watched it for `ms`. Null if no new row came.
 */
const ARM_GROUP = (ms) => `void (window.__group = new Promise((done) => {
  const was = document.querySelector("[data-prompt]");
  const tile = document.querySelector("main li button");
  const tileTop = tile ? tile.getBoundingClientRect().top : null;
  const deadline = performance.now() + 3500;
  const poll = () => {
    const row = document.querySelector("[data-prompt]");
    if (!row || row === was) {
      if (performance.now() > deadline) return done(null);
      return requestAnimationFrame(poll);
    }
    const subjects = [...row.querySelectorAll("[data-magic='pop'] [data-magic-subject]")];
    const rowBox = row.getBoundingClientRect();
    const page = document.scrollingElement;
    const startWidth = page.scrollWidth, startHeight = page.scrollHeight;
    const firstTile = document.querySelector("main li button");
    /* Layout position, not the drawn box: a tile's own pop-in is a transform
       and is not the drift this watches for. */
    const layoutTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
    const firstTileTop = firstTile ? layoutTop(firstTile) : null;
    const arrived = subjects.map(() => null);
    let minOpacity = 1, maxHeightDrift = 0, maxTopDrift = 0, grewBy = 0, grewTall = 0, tileDrift = 0;
    const started = performance.now();
    const frame = () => {
      const now = performance.now() - started;
      subjects.forEach((el, i) => {
        const o = +getComputedStyle(el).opacity;
        minOpacity = Math.min(minOpacity, o);
        if (arrived[i] === null && o > 0.5) arrived[i] = now;
      });
      const r = row.getBoundingClientRect();
      maxHeightDrift = Math.max(maxHeightDrift, Math.abs(r.height - rowBox.height));
      maxTopDrift = Math.max(maxTopDrift, Math.abs(r.top - rowBox.top));
      grewBy = Math.max(grewBy, page.scrollWidth - startWidth);
      grewTall = Math.max(grewTall, page.scrollHeight - startHeight);
      const t = document.querySelector("main li button");
      if (t && firstTileTop !== null) tileDrift = Math.max(tileDrift, Math.abs(layoutTop(t) - firstTileTop));
      if (now < ${ms}) return requestAnimationFrame(frame);
      const r2 = row.getBoundingClientRect();
      done({
        subjects: subjects.length,
        counting: subjects.length > 0 && subjects.every((el) => el.parentElement.closest("[data-magic='pop']")),
        said: row.parentElement.querySelector(".sr-only")?.textContent ?? "",
        minOpacity, arrived, maxHeightDrift, maxTopDrift, grewBy, grewTall, tileDrift,
        clipped: subjects.filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width === 0 || b.left < r2.left - 1 || b.right > r2.right + 1 || b.top < r2.top - 1 || b.bottom > r2.bottom + 1 || b.right > window.innerWidth;
        }).length,
        final: subjects.map((el) => {
          const t = getComputedStyle(el).transform;
          const m = t === "none" ? { a: 1 } : new DOMMatrixReadOnly(t);
          return { opacity: +getComputedStyle(el).opacity, scale: m.a };
        }),
        hidden: subjects.every((el) => el.closest("[aria-hidden='true']") !== null),
        tiles: [...document.querySelectorAll("main li button")].map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }),
        tileLabels: [...document.querySelectorAll("main li button")].map((b) => b.getAttribute("aria-label") ?? b.textContent.trim()),
      });
    };
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(poll);
}))`;

function judgeGroup(seen, reducedMotion, problems) {
  const n = seen.subjects;
  if (seen.final.some((f) => f.opacity < 0.99 || Math.abs(f.scale - 1) > 0.01))
    problems.push("did not settle");
  if (seen.maxHeightDrift > 1)
    problems.push(`row height drifted ${seen.maxHeightDrift.toFixed(1)}px`);
  if (seen.maxTopDrift > 1)
    problems.push(`row moved ${seen.maxTopDrift.toFixed(1)}px`);
  if (seen.tileDrift > 1)
    problems.push(`tiles moved ${seen.tileDrift.toFixed(1)}px`);
  if (seen.grewBy > 0) problems.push(`page grew ${seen.grewBy}px wide`);
  if (seen.grewTall > 0) problems.push(`page grew ${seen.grewTall}px tall`);
  if (seen.clipped > 0) problems.push(`${seen.clipped} pips clipped`);
  if (!seen.hidden) problems.push("pips exposed to assistive tech");
  if (!seen.said) problems.push("no transcription");
  if (seen.tiles.some((t) => t < MIN_TOUCH))
    problems.push(`tile under ${MIN_TOUCH}px`);
  if (reducedMotion) {
    if (seen.minOpacity < 0.99) problems.push("faded under reduced motion");
    if (seen.arrived.some((t) => t === null || t > 40))
      problems.push("arrived late under reduced motion");
    return;
  }
  if (seen.arrived.some((t) => t === null)) {
    problems.push("a pip never arrived");
    return;
  }
  for (let i = 1; i < n; i++)
    if (seen.arrived[i] < seen.arrived[i - 1]) problems.push("out of order");
  if (n > 1 && seen.arrived[n - 1] - seen.arrived[0] < 40)
    problems.push("all at once");
  if (seen.arrived[n - 1] > n * 120 + 500)
    problems.push(`last pip at ${seen.arrived[n - 1].toFixed(0)}ms`);
}

/**
 * Plays one Math Quest round to the end, tiles left to right, watching every
 * new board as it lands. Returns the counting boards seen, and whether a tap
 * landed while pips were still arriving.
 */
async function mathRound(cdp, sessionId, reducedMotion) {
  await visit(cdp, sessionId, MATH);
  const intro = await evaluate(cdp, sessionId, BUTTON("/./"));
  if (!intro) return { groups: [], celebrated: false, tappedEarly: null };
  const groups = [];
  let tappedEarly = null;
  /* The first question lands after the intro tap, so arm before it. */
  await evaluate(cdp, sessionId, ARM_GROUP(1600));
  await clickAt(cdp, sessionId, intro);
  let seen = await evaluate(cdp, sessionId, `window.__group`);
  for (let taps = 0; taps < 80; taps++) {
    if (seen?.counting) {
      groups.push(seen);
      /* Tap while the pips are still arriving: the board must already be
         listening. (Tried once, on the first counting board.) */
      if (tappedEarly === null && !reducedMotion) {
        await evaluate(cdp, sessionId, ARM_GROUP(0));
        /* nothing new arrives: arm is moot; use the current board */
        const before = await evaluate(cdp, sessionId, TILES);
        const centre = await evaluate(cdp, sessionId, TILE_CENTRE(0));
        await clickAt(cdp, sessionId, centre);
        await settle(cdp, sessionId, 250);
        const after = await evaluate(cdp, sessionId, TILES);
        tappedEarly =
          JSON.stringify(before) !== JSON.stringify(after) ||
          (await evaluate(cdp, sessionId, CELEBRATED));
        seen = null;
        await settle(cdp, sessionId, 1300);
      }
    }
    if (await evaluate(cdp, sessionId, CELEBRATED))
      return { groups, celebrated: true, tappedEarly };
    const next = untried(await evaluate(cdp, sessionId, TILES));
    if (next < 0) {
      await settle(cdp, sessionId, 600);
      seen = null;
      continue;
    }
    const centre = await evaluate(cdp, sessionId, TILE_CENTRE(next));
    await evaluate(cdp, sessionId, ARM_GROUP(1600));
    await clickAt(cdp, sessionId, centre);
    seen = await evaluate(cdp, sessionId, `window.__group`);
    if (!seen) await settle(cdp, sessionId, 200);
  }
  return {
    groups,
    celebrated: await evaluate(cdp, sessionId, CELEBRATED),
    tappedEarly,
  };
}

async function counting(cdp, sessionId) {
  console.log("\n  counting, in Math Quest → pop\n");
  for (const reducedMotion of [false, true]) {
    for (const viewport of reducedMotion ? [VIEWPORTS[0]] : screens) {
      await applyViewport(cdp, sessionId, viewport);
      await reduce(cdp, sessionId, reducedMotion);
      const problems = [];
      let played = null;
      /* A round with no counting question is possible (one in eight); deal again. */
      for (let deal = 0; deal < 4; deal++) {
        played = await mathRound(cdp, sessionId, reducedMotion);
        if (played.groups.length) break;
      }
      if (!played?.groups.length) {
        report(`${viewport.name}: math quest`, [
          "no counting question in four rounds",
        ]);
        continue;
      }
      for (const seen of played.groups)
        judgeGroup(seen, reducedMotion, problems);
      if (!played.celebrated) problems.push("round never reached the end");
      if (played.tappedEarly === false)
        problems.push("a tap during the pop was ignored");
      if ((await overflow(cdp, sessionId)) > 0)
        problems.push("horizontal scroll");
      const sizes = played.groups.map((g) => g.subjects).join(",");
      const last = played.groups[0];
      report(
        `${reducedMotion ? "reduced motion: " : ""}${viewport.name}: ${played.groups.length} counting boards (${sizes} pips), ` +
          `first board ${last.arrived[0]?.toFixed(0)}→${last.arrived.at(-1)?.toFixed(0)}ms, ` +
          `${played.tappedEarly === null ? "" : played.tappedEarly ? "tap during pop landed, " : ""}round finished ${played.celebrated ? "→ celebrate" : "✗"}`,
        problems,
      );
    }
  }
  await reduce(cdp, sessionId, false);
}

/* ---- homes, in General Knowledge Quest ----------------------------------- */

const NODES = `(() => {
  const grid = document.querySelector("[data-connect-node]")?.closest("[role='group']");
  const frame = grid?.getBoundingClientRect();
  return {
    frame: frame ? { left: frame.left, right: frame.right, top: frame.top } : null,
    nodes: [...document.querySelectorAll("[data-connect-node]")].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        id: el.dataset.nodeId, side: el.dataset.side, state: el.dataset.state,
        tag: el.tagName, label: el.getAttribute("aria-label"),
        centre: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        min: Math.min(b.width, b.height),
        walker: !!el.querySelector("[data-magic='walk']"),
        exposed: [...el.querySelectorAll("svg, [data-art]")].filter((x) => x.closest("[aria-hidden='true']") === null && x.getAttribute("aria-hidden") !== "true").length,
      };
    }),
  };
})()`;

const SUBJECT = (id) => `(() => {
  const node = document.querySelector('[data-connect-node][data-side="left"][data-node-id="${id}"]');
  const el = node?.querySelector("[data-magic='walk'] [data-magic-subject]");
  if (!el) return null;
  const t = getComputedStyle(el).transform;
  const m = t === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(t);
  return { x: m.m41, y: m.m42 };
})()`;

/**
 * Frame by frame for `ms`: how the animal travelled, whether the home, the
 * grid and the bubble stayed put, and what the page did.
 */
const WATCH = (id, homeId, ms) => `new Promise((done) => {
  const node = document.querySelector('[data-connect-node][data-side="left"][data-node-id="${id}"]');
  const home = document.querySelector('[data-connect-node][data-side="right"][data-node-id="${homeId}"]');
  const el = node?.querySelector("[data-magic='walk'] [data-magic-subject]");
  const grid = document.querySelector("[data-connect-node]")?.closest("[role='group']");
  const bubble = document.querySelector("main .rounded-card.relative");
  if (!home || !grid || !bubble) return done(null);
  const frame = grid.getBoundingClientRect();
  const homeBox = home.getBoundingClientRect();
  const bubbleBox = bubble.getBoundingClientRect();
  /* The joined home can sit in a different row, and the walk goes there:
     the vertical gap between the two ports is the rise the walk owes. */
  const nodePortEl = node?.querySelector("[data-port]");
  const homePortEl = home.querySelector("[data-port]");
  const rise = nodePortEl && homePortEl
    ? homePortEl.getBoundingClientRect().top - nodePortEl.getBoundingClientRect().top
    : 0;
  const page = document.scrollingElement;
  const startWidth = page.scrollWidth, startHeight = page.scrollHeight;
  const read = () => {
    if (!el) return { x: 0, y: 0 };
    const t = getComputedStyle(el).transform;
    const m = t === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(t);
    return { x: m.m41, y: m.m42 };
  };
  const first = read();
  let maxY = 0, minX = 0, escaped = 0, homeMoved = 0, gridShift = 0, bubbleDrift = 0, grewBy = 0, grewTall = 0, backwards = 0, hiddenFrames = 0;
  let last = first, trail = [];
  const sayings = new Set();
  const started = performance.now();
  const frameFn = () => {
    const now = read();
    maxY = Math.max(maxY, Math.abs(now.y)); minX = Math.min(minX, now.x);
    if (now.x < last.x - 0.5) backwards++;
    if (el) {
      const b = el.getBoundingClientRect();
      if (b.left < frame.left - 1 || b.right > frame.right + 1) escaped++;
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (!(hit && node.contains(hit))) hiddenFrames++;
    }
    const h = home.getBoundingClientRect(), f = grid.getBoundingClientRect(), bb = bubble.getBoundingClientRect();
    homeMoved = Math.max(homeMoved, Math.abs(h.left - homeBox.left), Math.abs(h.top - homeBox.top));
    gridShift = Math.max(gridShift, Math.abs(f.top - frame.top), Math.abs(f.left - frame.left));
    bubbleDrift = Math.max(bubbleDrift, Math.abs(bb.height - bubbleBox.height));
    sayings.add(bubble.querySelector(".grid > div:not([aria-hidden])")?.textContent.trim() ?? "");
    grewBy = Math.max(grewBy, page.scrollWidth - startWidth);
    grewTall = Math.max(grewTall, page.scrollHeight - startHeight);
    trail.push(now.x); last = now;
    if (performance.now() - started < ${ms}) return requestAnimationFrame(frameFn);
    const b2 = el ? el.getBoundingClientRect() : null;
    const hb = home.getBoundingClientRect();
    const port = home.querySelector("[data-port]");
    const homeInner = hb.left + parseFloat(getComputedStyle(home).paddingLeft);
    done({
      first, maxY, minX, escaped, homeMoved, gridShift, bubbleDrift, grewBy, grewTall, backwards, hiddenFrames, rise,
      final: now,
      arrived: b2 ? b2.right >= (port ? port.getBoundingClientRect().right : hb.left) - 1 && b2.left <= hb.right : null,
      nearly: b2 ? b2.right >= (port ? port.getBoundingClientRect().right : hb.left) - 14 : null,
      inside: b2 ? b2.right <= hb.right + 1 : null,
      still: trail.length > 3 && Math.abs(trail.at(-1) - trail.at(-4)) < 0.1,
      sayings: [...sayings],
      bubbleHeight: bubbleBox.height, bubbleAfter: bubble.getBoundingClientRect().height,
      gridTop: frame.top, gridAfter: grid.getBoundingClientRect().top,
      homeLabel: home.getAttribute("aria-label"), label: node?.getAttribute("aria-label"),
    });
  };
  requestAnimationFrame(frameFn);
})`;

/** Load the Quest fresh and answer questions until the joined-up board is out. */
async function reachBoard(cdp, sessionId) {
  for (let deal = 0; deal < 40; deal++) {
    await visit(cdp, sessionId, WORLD);
    const intro = await evaluate(cdp, sessionId, BUTTON("/find out/i"));
    if (!intro) return false;
    await clickAt(cdp, sessionId, intro);
    await settle(cdp, sessionId, 900);
    process.stdout.write(`    deal ${deal + 1}…\r`);
    for (let taps = 0; taps < 40; taps++) {
      if (await evaluate(cdp, sessionId, ON_BOARD)) return true;
      if (await evaluate(cdp, sessionId, CELEBRATED)) break;
      if (
        /Question [6-9]|Question 10/.test(
          await evaluate(cdp, sessionId, STATUS),
        )
      )
        break;
      const next = untried(await evaluate(cdp, sessionId, TILES));
      if (next < 0) {
        await settle(cdp, sessionId, 500);
        continue;
      }
      await clickAt(
        cdp,
        sessionId,
        await evaluate(cdp, sessionId, TILE_CENTRE(next)),
      );
      await settle(cdp, sessionId, 1650);
    }
  }
  return false;
}

/** Join the first unmatched animal to its home, trying homes in turn. */
async function joinOne(cdp, sessionId, watchMs) {
  let page = await evaluate(cdp, sessionId, NODES);
  const left = page.nodes.find(
    (n) => n.side === "left" && n.state !== "matched",
  );
  const rights = page.nodes.filter(
    (n) => n.side === "right" && n.state !== "matched",
  );
  if (!left || !rights.length) return { error: "no board" };
  const misses = [];
  for (const right of rights) {
    const before = await evaluate(cdp, sessionId, SUBJECT(left.id));
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, right.centre);
    await settle(cdp, sessionId, 30);
    page = await evaluate(cdp, sessionId, NODES);
    const now = page.nodes.find((n) => n.side === "left" && n.id === left.id);
    if (now?.state === "matched") {
      /* The last pair finishes the board, and the round moves on 1500ms
         later — before a 1600ms walk has quite ended. Watch what there is. */
      const lastPair =
        page.nodes.filter((n) => n.side === "left" && n.state !== "matched")
          .length === 0;
      const watched = await evaluate(
        cdp,
        sessionId,
        WATCH(left.id, right.id, lastPair ? Math.min(watchMs, 1350) : watchMs),
      );
      watched.lastPair = lastPair;
      await settle(cdp, sessionId, 300);
      const later = await evaluate(cdp, sessionId, SUBJECT(left.id));
      return { left, right, before, watched, later, misses, nodes: page.nodes };
    }
    /* A wrong join: KIDDO says so for a beat, the line lets go. The bubble
       and the grid must hold still through it, and the animal must not move. */
    const miss = await evaluate(cdp, sessionId, WATCH(left.id, right.id, 1000));
    const after = await evaluate(cdp, sessionId, SUBJECT(left.id));
    misses.push({
      moved: after && before ? Math.abs(after.x - before.x) : 0,
      ...miss,
    });
    await settle(cdp, sessionId, 200);
  }
  return { error: "no home took the animal", misses };
}

function judgeJoin(seen, reducedMotion, problems) {
  const { watched } = seen;
  if (seen.error) {
    problems.push(seen.error);
    return;
  }
  for (const miss of seen.misses) {
    if (miss.moved > 0.5) problems.push("a wrong join moved the animal");
    if (miss.bubbleDrift > 1)
      problems.push(`bubble grew ${miss.bubbleDrift.toFixed(1)}px on a miss`);
    if (miss.gridShift > 1)
      problems.push(`grid moved ${miss.gridShift.toFixed(1)}px on a miss`);
    if (!miss.sayings.some((s) => /not that one/i.test(s)))
      problems.push(
        `a miss was not answered (heard: ${miss.sayings.map((x) => JSON.stringify(x.slice(0, 30))).join(" ")})`,
      );
  }
  if (!watched) {
    problems.push("nothing to watch");
    return;
  }
  if (!seen.left.walker) problems.push("no walker on the animal");
  if (watched.homeMoved > 0.5)
    problems.push(`home moved ${watched.homeMoved.toFixed(1)}px`);
  if (watched.gridShift > 1)
    problems.push(`grid moved ${watched.gridShift.toFixed(1)}px`);
  if (watched.bubbleDrift > 1)
    problems.push(`bubble grew ${watched.bubbleDrift.toFixed(1)}px`);
  if (Math.abs(watched.gridAfter - watched.gridTop) > 1)
    problems.push("grid not back where it was");
  if (watched.grewBy > 0) problems.push(`page grew ${watched.grewBy}px wide`);
  if (watched.escaped > 0)
    problems.push(`left the grid in ${watched.escaped} frames`);
  if (!watched.sayings.some((s) => /That's the one|Everybody is home/i.test(s)))
    problems.push(
      `the join was not cheered (heard: ${watched.sayings.map((x) => JSON.stringify(x.slice(0, 30))).join(" ")})`,
    );
  /* Same exemption below: the last pair is sampled while its step is still
     finishing, and the board it stood on lingers for its 200ms crossfade. */
  if (
    seen.later &&
    !watched.lastPair &&
    Math.abs(seen.later.x - watched.final.x) > 0.5
  )
    problems.push("still moving after settling");
  /* The round moves on 1500ms after the last join and the walk is 1600ms,
     so the last pair is watched while it is still finishing its step. */
  if (!watched.still && !watched.lastPair)
    problems.push("not still at the end");
  if (watched.final.x <= 1) problems.push("never walked");
  if (watched.minX < -0.5 || watched.backwards > 0)
    problems.push("walked backwards");
  /* walk's own step is a 2px bob (y: 0 → -2 → 0) — and the walk rises to
     the joined home's *row*, which is the camel's lesson: the allowance is
     the measured gap between the two ports, plus the bob. Anything beyond
     that is drift; and a walk that stops short of the joined row arrived at
     a home it was not joined to. */
  if (watched.maxY > Math.abs(watched.rise) + 2.5)
    problems.push(
      `drifted ${watched.maxY.toFixed(1)}px vertically (the joined home is ${watched.rise.toFixed(1)}px away)`,
    );
  if (
    !reducedMotion &&
    !watched.lastPair &&
    Math.abs(watched.rise) > 2.5 &&
    Math.abs(watched.final.y - watched.rise) > 6
  )
    problems.push(
      `stopped ${(watched.final.y - watched.rise).toFixed(1)}px off the joined home's row`,
    );
  if (!watched.arrived && !(watched.lastPair && watched.nearly))
    problems.push("did not reach the home");
  if (!watched.inside) problems.push("overshot the home");
  if (watched.hiddenFrames > 2)
    problems.push(`painted over in ${watched.hiddenFrames} frames`);
  if (reducedMotion && Math.abs(watched.first.x - watched.final.x) > 0.5)
    problems.push("travelled under reduced motion");
  if (!reducedMotion && watched.first.x > watched.final.x * 0.5)
    problems.push(
      `jumped rather than walked (first frame at ${watched.first.x.toFixed(0)}px)`,
    );
}

async function homes(cdp, sessionId) {
  console.log("\n  animal homes, in General Knowledge Quest → walk\n");
  for (const reducedMotion of [false, true]) {
    await applyViewport(cdp, sessionId, VIEWPORTS[0]);
    await reduce(cdp, sessionId, reducedMotion);
    const reached = await reachBoard(cdp, sessionId);
    if (!reached) {
      report(
        `${reducedMotion ? "reduced motion: " : ""}general knowledge quest`,
        ["the homes board never came up"],
      );
      continue;
    }
    await settle(cdp, sessionId, 600);
    const status = await evaluate(cdp, sessionId, STATUS);
    const page = await evaluate(cdp, sessionId, NODES);
    const problems = [];
    if (page.nodes.some((n) => n.tag !== "BUTTON"))
      problems.push("a node is not a button");
    if (page.nodes.some((n) => !n.label)) problems.push("a node has no name");
    if (page.nodes.some((n) => n.exposed > 0))
      problems.push("drawings exposed to assistive tech");
    if (!page.nodes.filter((n) => n.side === "left").every((n) => n.walker))
      problems.push("an animal has no walker");
    if (page.nodes.filter((n) => n.side === "right").some((n) => n.walker))
      problems.push("a home can walk");
    report(
      `${reducedMotion ? "reduced motion: " : ""}board reached: ${page.nodes.length} nodes, "${status.slice(0, 60)}"`,
      problems,
    );

    if (!reducedMotion) {
      /* KIDDO's bubble, on every screen: as tall as the tallest thing it
         could say about this board, so nothing under it can move. */
      for (const viewport of screens) {
        await applyViewport(cdp, sessionId, viewport);
        await settle(cdp, sessionId, 200);
        const bubble = await evaluate(cdp, sessionId, BUBBLE);
        const nodes = await evaluate(cdp, sessionId, NODES);
        const p = [];
        if (!bubble) {
          report(viewport.name, ["no bubble"]);
          continue;
        }
        const tallest = Math.max(...bubble.reserved);
        if (bubble.reserved.length < 4)
          p.push(`only ${bubble.reserved.length} lines reserved`);
        if (bubble.height < tallest)
          p.push("bubble shorter than its tallest line");
        if (nodes.nodes.some((n) => n.min < MIN_TOUCH))
          p.push(`node under ${MIN_TOUCH}px`);
        if ((await overflow(cdp, sessionId)) > 0) p.push("horizontal scroll");
        const fits = await evaluate(
          cdp,
          sessionId,
          `document.scrollingElement.scrollHeight - window.innerHeight`,
        );
        report(
          `${viewport.name}: bubble ${bubble.height.toFixed(0)}px, lines ${bubble.reserved.map((h) => h.toFixed(0)).join("/")}px, ` +
            `nodes ≥${Math.min(...nodes.nodes.map((n) => n.min)).toFixed(0)}px, ${fits <= 0 ? "fits" : `${fits}px below the fold`}`,
          p,
        );
      }
    }

    /* The joins, each on a different screen, the walk judged frame by frame. */
    const walkOn = reducedMotion
      ? [VIEWPORTS[0]]
      : [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]];
    let joins = 0;
    for (let turn = 0; turn < 6; turn++) {
      if (!(await evaluate(cdp, sessionId, ON_BOARD))) break;
      const viewport = walkOn[Math.min(turn, walkOn.length - 1)];
      await applyViewport(cdp, sessionId, viewport);
      await settle(cdp, sessionId, 150);
      const seen = await joinOne(cdp, sessionId, reducedMotion ? 500 : 2100);
      if (seen.error === "no board") break;
      const p = [];
      judgeJoin(seen, reducedMotion, p);
      joins += 1;
      const w = seen.watched;
      report(
        `${reducedMotion ? "reduced motion: " : ""}${viewport.name}: ${seen.left?.id ?? "?"} → ${seen.right?.id ?? "?"} ` +
          (w
            ? `walked ${w.final.x.toFixed(0)}px${w.arrived ? " to the home" : ""}, home ${w.homeMoved.toFixed(1)}px, grid ${w.gridShift.toFixed(1)}px, bubble ${w.bubbleDrift.toFixed(1)}px`
            : "") +
          `, ${seen.misses.length} misses (bubble ${Math.max(0, ...seen.misses.map((m) => m.bubbleDrift)).toFixed(1)}px, grid ${Math.max(0, ...seen.misses.map((m) => m.gridShift)).toFixed(1)}px)`,
        p,
      );
      /* After the last join the round says so and moves on. */
      await settle(cdp, sessionId, 1700);
    }
    const after = await evaluate(cdp, sessionId, STATUS);
    const p = [];
    if (joins === 0) p.push("no joins made");
    if (await evaluate(cdp, sessionId, ON_BOARD))
      p.push("the board did not finish");
    if (!/done/.test(after) && !/Question/.test(after))
      p.push(`round did not move on: "${after}"`);
    report(
      `${reducedMotion ? "reduced motion: " : ""}board finished after ${joins} joins → "${after.slice(0, 70)}"`,
      p,
    );

    /* And on to the end of the round, through ordinary tiles. */
    if (!reducedMotion) {
      let celebrated = false;
      for (let taps = 0; taps < 60; taps++) {
        if (await evaluate(cdp, sessionId, CELEBRATED)) {
          celebrated = true;
          break;
        }
        const next = untried(await evaluate(cdp, sessionId, TILES));
        if (next < 0) {
          await settle(cdp, sessionId, 500);
          continue;
        }
        await clickAt(
          cdp,
          sessionId,
          await evaluate(cdp, sessionId, TILE_CENTRE(next)),
        );
        await settle(cdp, sessionId, 1650);
      }
      const again = await evaluate(cdp, sessionId, BUTTON("/play again/i"));
      const where = await evaluate(cdp, sessionId, STATUS);
      report(
        `round played to the end → celebrate${again ? ", play again offered" : ""}`,
        celebrated && again
          ? []
          : [
              `never reached the end (at "${where.slice(0, 60)}", tiles ${JSON.stringify(await evaluate(cdp, sessionId, TILES)).slice(0, 200)})`,
            ],
      );
    }
  }
  await reduce(cdp, sessionId, false);
}

/* ---- run ----------------------------------------------------------------- */

let browser;
try {
  browser = await openBrowser(Number(process.env.KIDDO_CDP_PORT ?? 9343));
  const { cdp, sessionId } = browser;
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: WATCH_FOR_TROUBLE },
    sessionId,
  );
  console.log(`\n  ${ORIGIN}  (${screens.length} screens)`);
  if (wants("counting")) await counting(cdp, sessionId);
  if (wants("homes")) await homes(cdp, sessionId);
  const trouble = await evaluate(cdp, sessionId, `window.__trouble ?? []`);
  report(
    `console: ${trouble.length} problems`,
    trouble.length ? [trouble[0]] : [],
  );
  console.log("");
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  browser?.close();
}

process.exit(failures > 0 ? 1 : 0);
