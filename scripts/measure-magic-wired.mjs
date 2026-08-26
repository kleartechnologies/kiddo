/**
 * Measures the Magic Motion vocabulary where a child actually meets it.
 *
 * `measure-magic.mjs` proves the eight behaviours in a lab. This script asks
 * the three questions Phase 2 wired into real boards, on real boards:
 *
 *   counting   A group of things to count `pop`s in one after another, and
 *              the settled row is the row there was before — same parts, same
 *              height, same transcription, no sideways scroll.
 *   celebrate  The character at the end of a round lifts once, with at most
 *              three marks that end invisible, and the title and buttons say
 *              exactly what they said before.
 *   walk       A right join sends the animal to its home and nowhere else: it
 *              arrives at the home's edge *and on the home's row* — homes
 *              are stacked, so the one a child chose is often not the one
 *              level with the animal — the home does not move, a wrong join
 *              moves nothing, and nothing moves once it has settled.
 *
 * Every section is re-run under `prefers-reduced-motion: reduce`, where each
 * motion must be an instant finished state — the apples all there, the dog
 * already at the house.
 *
 *   node scripts/measure-magic-wired.mjs [--only=counting,celebrate,walk,round] [--quick]
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
const ONLY =
  ARGS.find((arg) => arg.startsWith("--only="))
    ?.slice(7)
    .split(",") ?? null;
const QUICK = ARGS.includes("--quick");
const ORIGIN =
  ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const VISUAL = `${ORIGIN}/playground/visual`;
const SYSTEM = `${ORIGIN}/playground`;

/** Boards in the visual round, by index. See `src/components/dev/visualRound.ts`. */
const BOARDS = { walk: [0, 1, 2], counting: [5, 6, 7] };

const MIN_TOUCH = 48;

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => { window.__trouble.push(args.join(" ")); real(...args); };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

const wants = (section) => ONLY === null || ONLY.includes(section);
const screens = QUICK ? [VIEWPORTS[0], VIEWPORTS[1], VIEWPORTS[7]] : VIEWPORTS;

let failures = 0;
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(
    `  ${line}${problems.length ? `  ✗ ${problems.join(", ")}` : "  ✓"}`,
  );
};

/* ---- the page ------------------------------------------------------------ */

const STEP = `(() => {
  const board = document.querySelector("[data-round-board]");
  return board ? Number(board.dataset.roundIndex) : null;
})()`;

async function jump(cdp, sessionId, index) {
  for (let attempt = 0; attempt < 16; attempt++) {
    await evaluate(
      cdp,
      sessionId,
      `document.querySelectorAll('[data-round-strip] [data-round-step]')[${index}]?.click()`,
    );
    /* One frame, so the new board's first paint is what gets read. */
    await settle(cdp, sessionId, 16);
    if ((await evaluate(cdp, sessionId, STEP)) === index) return true;
    await settle(cdp, sessionId, 200);
  }
  return false;
}

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

/* ---- counting ------------------------------------------------------------ */

/** Watch a freshly dealt group: what appeared, in what order, and what moved. */
const WATCH_GROUP = (ms) => `new Promise((done) => {
  const row = document.querySelector("[data-prompt]");
  if (!row) return done(null);
  const parts = [...row.children];
  const subjects = [...row.querySelectorAll("[data-magic='pop'] [data-magic-subject]")];
  /* Parts of the row that pop, counted as parts rather than as subjects.
     A row of six things is six parts holding one popping thing each; a
     block of pips is ONE part holding eight popping dots. Counting the
     dots against the parts calls the second one a half-animated row, which
     it is not — what "half" really means is that some parts of the line
     came in and others were simply there, and that is what this counts. */
  const popping = parts.filter((p) =>
    p.matches("[data-magic='pop']") || p.querySelector("[data-magic='pop']"),
  ).length;
  const said = row.parentElement.querySelector(".sr-only")?.textContent ?? "";
  const height = row.getBoundingClientRect().height;
  const page = document.scrollingElement;
  const startWidth = page.scrollWidth;
  const arrived = subjects.map(() => null);
  let minOpacity = 1, maxHeightDrift = 0, grewBy = 0;
  const started = performance.now();
  const frame = () => {
    const now = performance.now() - started;
    subjects.forEach((el, i) => {
      const o = +getComputedStyle(el).opacity;
      minOpacity = Math.min(minOpacity, o);
      if (arrived[i] === null && o > 0.5) arrived[i] = now;
    });
    maxHeightDrift = Math.max(maxHeightDrift, Math.abs(row.getBoundingClientRect().height - height));
    grewBy = Math.max(grewBy, page.scrollWidth - startWidth);
    if (now < ${ms}) return requestAnimationFrame(frame);
    done({
      parts: parts.length,
      popping,
      subjects: subjects.length,
      said,
      saidAfter: row.parentElement.querySelector(".sr-only")?.textContent ?? "",
      minOpacity,
      arrived,
      final: subjects.map((el) => {
        const t = getComputedStyle(el).transform;
        const m = t === "none" ? { a: 1 } : new DOMMatrixReadOnly(t);
        return { opacity: +getComputedStyle(el).opacity, scale: m.a };
      }),
      maxHeightDrift, grewBy,
      tiles: [...document.querySelectorAll("[data-round-board] li button")].map((b) => {
        const r = b.getBoundingClientRect();
        return Math.min(r.width, r.height);
      }),
    });
  };
  requestAnimationFrame(frame);
})`;

async function counting(cdp, sessionId) {
  console.log("\n  counting → pop\n");
  for (const viewport of screens) {
    await applyViewport(cdp, sessionId, viewport);
    await visit(cdp, sessionId, VISUAL);
    for (const index of BOARDS.counting) {
      const problems = [];
      if (!(await jump(cdp, sessionId, index))) {
        report(`${viewport.name.padEnd(27)} board ${index}`, ["never reached"]);
        continue;
      }
      const seen = await evaluate(cdp, sessionId, WATCH_GROUP(1500));
      if (!seen) {
        report(`${viewport.name.padEnd(27)} board ${index}`, [
          "no prompt line",
        ]);
        continue;
      }
      /* Every part pops, or none does. Never a half-animated row. */
      if (seen.popping !== 0 && seen.popping !== seen.parts) {
        problems.push(`${seen.popping} of ${seen.parts} parts pop`);
      }
      if (seen.subjects > 0) {
        if (seen.minOpacity > 0.99) problems.push("never popped");
        /* One after another: each arrives no earlier than the one before. */
        const order = seen.arrived;
        if (order.some((t) => t === null))
          problems.push("a thing never arrived");
        else if (order.some((t, i) => i > 0 && t < order[i - 1] - 8)) {
          problems.push("arrived out of order");
        }
      }
      if (
        seen.final.some((f) => f.opacity < 0.99 || Math.abs(f.scale - 1) > 0.01)
      ) {
        problems.push("did not settle");
      }
      if (seen.maxHeightDrift > 0.5)
        problems.push(`row height moved ${seen.maxHeightDrift.toFixed(1)}px`);
      if (seen.grewBy > 0) problems.push(`grew the page ${seen.grewBy}px`);
      if (seen.said !== seen.saidAfter || !seen.said.trim())
        problems.push("transcription changed");
      if ((await overflow(cdp, sessionId)) > 0)
        problems.push("horizontal scroll");
      if (seen.tiles.length && Math.min(...seen.tiles) < MIN_TOUCH) {
        problems.push(`tile only ${Math.round(Math.min(...seen.tiles))}px`);
      }
      report(
        `${viewport.name.padEnd(27)} board ${index}  ${String(seen.parts).padStart(2)} parts, ` +
          `${String(seen.popping).padStart(2)} pop` +
          (seen.subjects === seen.popping
            ? ""
            : ` (${String(seen.subjects)} pips)`) +
          `, row ±${seen.maxHeightDrift.toFixed(1)}px`,
        problems,
      );
    }
  }

  /* Reduced motion: the whole group is simply there, one frame in. */
  await applyViewport(cdp, sessionId, VIEWPORTS[0]);
  await reduce(cdp, sessionId, true);
  await visit(cdp, sessionId, VISUAL);
  const problems = [];
  for (const index of BOARDS.counting) {
    await jump(cdp, sessionId, index);
    const seen = await evaluate(cdp, sessionId, WATCH_GROUP(60));
    if (!seen) {
      problems.push(`board ${index} missing`);
      continue;
    }
    /* "Instantly whole" is about the group, not about the very first frame.
       Every motion here starts from the style the server wrote — `initial`
       is never gated on `useReducedMotion`, because an `initial` that
       differed on a reduced client is a hydration mismatch, which the
       reduced passes of these scripts catch as a console error (see the
       note in `MagicMotion.tsx`). So a reduced client is briefly at the
       starting style, for the one frame before it is told to be settled.
       What must not happen is a *stagger*: things arriving one after
       another with the animation merely turned off. So: everything arrives
       on the same frame, and everything is fully there when the window
       closes. */
    if (seen.arrived.some((t) => t === null)) {
      problems.push(`board ${index} never arrived`);
    } else if (seen.arrived.length) {
      const spread = Math.max(...seen.arrived) - Math.min(...seen.arrived);
      if (spread > 20)
        problems.push(`board ${index} came in over ${spread.toFixed(0)}ms`);
    }
    if (
      seen.final.some((f) => f.opacity < 0.99 || Math.abs(f.scale - 1) > 0.01)
    ) {
      problems.push(`board ${index} still arriving`);
    }
    if (seen.popping !== 0 && seen.popping !== seen.parts)
      problems.push(`board ${index} half`);
  }
  await reduce(cdp, sessionId, false);
  report("reduced motion: every group is instantly whole", problems);
}

/* ---- celebrate ----------------------------------------------------------- */

const WATCH_CELEBRATE = (ms) => `new Promise((done) => {
  const wrap = document.querySelector("[data-magic='celebrate']");
  const el = wrap?.querySelector("[data-magic-subject]");
  if (!el) return done(null);
  const card = wrap.closest("section") ?? document.body;
  const cardBox = card.getBoundingClientRect();
  const title = document.querySelector("h2")?.textContent;
  const buttons = [...document.querySelectorAll("a, button")].map((b) => b.textContent.trim());
  let maxY = 0, maxX = 0, maxScale = 1, escaped = 0, sparksSeen = 0, moved = false;
  const read = () => {
    const t = getComputedStyle(el).transform;
    return t === "none" ? { x: 0, y: 0, s: 1 } : (() => { const m = new DOMMatrixReadOnly(t); return { x: m.m41, y: m.m42, s: m.a }; })();
  };
  const started = performance.now();
  const frame = () => {
    const now = read();
    if (Math.abs(now.y) > 0.5) moved = true;
    maxY = Math.max(maxY, Math.abs(now.y)); maxX = Math.max(maxX, Math.abs(now.x));
    maxScale = Math.max(maxScale, now.s);
    const b = el.getBoundingClientRect();
    if (b.left < cardBox.left - 1 || b.right > cardBox.right + 1) escaped++;
    sparksSeen = Math.max(sparksSeen, document.querySelectorAll("[data-magic-spark]").length);
    if (performance.now() - started < ${ms}) return requestAnimationFrame(frame);
    done({
      moved, maxY, maxX, maxScale, escaped, sparksSeen,
      final: read(),
      sparksVisible: [...document.querySelectorAll("[data-magic-spark]")]
        .filter((s) => +getComputedStyle(s).opacity > 0.05).length,
      title, titleAfter: document.querySelector("h2")?.textContent,
      buttons, buttonsAfter: [...document.querySelectorAll("a, button")].map((b) => b.textContent.trim()),
      exposed: [...wrap.querySelectorAll("svg")].filter((s) => s.getAttribute("aria-hidden") !== "true").length,
      figureLabel: wrap.querySelector("[aria-label], [role='img']")?.getAttribute("aria-label") ?? null,
    });
  };
  requestAnimationFrame(frame);
})`;

async function celebrate(cdp, sessionId) {
  console.log("\n  round complete → celebrate\n");
  for (const viewport of screens) {
    await applyViewport(cdp, sessionId, viewport);
    await visit(cdp, sessionId, SYSTEM);
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector("[data-magic='celebrate']")?.scrollIntoView({ block: "center" })`,
    );
    const seen = await evaluate(cdp, sessionId, WATCH_CELEBRATE(1800));
    const problems = [];
    if (!seen) {
      report(viewport.name, ["no celebration on the page"]);
      continue;
    }
    if (!seen.moved) problems.push("never lifted");
    if (seen.maxY > 10) problems.push(`lifted ${seen.maxY.toFixed(1)}px`);
    if (seen.maxX > 1) problems.push("moved sideways");
    if (seen.maxScale > 1.08)
      problems.push(`scaled to ${seen.maxScale.toFixed(2)}`);
    if (Math.abs(seen.final.y) > 0.5 || Math.abs(seen.final.s - 1) > 0.01)
      problems.push("did not settle");
    if (seen.sparksSeen === 0 || seen.sparksSeen > 3)
      problems.push(`${seen.sparksSeen} marks`);
    if (seen.sparksVisible > 0)
      problems.push(`${seen.sparksVisible} marks left visible`);
    if (seen.title !== seen.titleAfter || !seen.title)
      problems.push("title changed");
    if (JSON.stringify(seen.buttons) !== JSON.stringify(seen.buttonsAfter))
      problems.push("controls changed");
    if (seen.exposed > 0) problems.push(`${seen.exposed} drawings exposed`);
    if ((await overflow(cdp, sessionId)) > 0)
      problems.push("horizontal scroll");
    report(
      `${viewport.name.padEnd(27)} lift ${seen.maxY.toFixed(1)}px, scale ${seen.maxScale.toFixed(2)}, ` +
        `${seen.sparksSeen} marks`,
      problems,
    );
  }

  await applyViewport(cdp, sessionId, VIEWPORTS[0]);
  await reduce(cdp, sessionId, true);
  await visit(cdp, sessionId, SYSTEM);
  const seen = await evaluate(cdp, sessionId, WATCH_CELEBRATE(400));
  const problems = [];
  if (!seen) problems.push("missing");
  else {
    if (seen.moved || seen.maxY > 0.5) problems.push("lifted under reduce");
    if (seen.sparksSeen > 0)
      problems.push(`${seen.sparksSeen} marks under reduce`);
    if (Math.abs(seen.final.s - 1) > 0.01) problems.push("not at rest");
  }
  await reduce(cdp, sessionId, false);
  report("reduced motion: the character is simply there, no marks", problems);
}

/* ---- walk ---------------------------------------------------------------- */

const NODES = `(() => {
  const board = document.querySelector("[data-round-board]");
  const frame = board?.getBoundingClientRect();
  return {
    activity: board?.dataset.roundActivity ?? null,
    frame: frame ? { left: frame.left, right: frame.right } : null,
    nodes: [...document.querySelectorAll("[data-connect-node]")].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        id: el.dataset.nodeId, side: el.dataset.side, state: el.dataset.state,
        label: el.getAttribute("aria-label"),
        left: b.left, right: b.right, top: b.top, bottom: b.bottom,
        inner: b.left + parseFloat(getComputedStyle(el).paddingLeft),
        centre: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        min: Math.min(b.width, b.height),
        walker: !!el.querySelector("[data-magic='walk']"),
      };
    }),
  };
})()`;

/** The subject inside one left node: where it is, as a box and a transform. */
const SUBJECT = (id) => `(() => {
  const node = document.querySelector('[data-connect-node][data-side="left"][data-node-id="${id}"]');
  const el = node?.querySelector("[data-magic='walk'] [data-magic-subject]");
  if (!el) return null;
  const t = getComputedStyle(el).transform;
  const m = t === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(t);
  const b = el.getBoundingClientRect();
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return {
    x: m.m41, y: m.m42, left: b.left, right: b.right, top: b.top, bottom: b.bottom,
    onTop: Boolean(hit && node.querySelector("[data-magic='walk']").contains(hit)),
  };
})()`;

/** Frame by frame: how the animal travelled, where it stopped, what else moved. */
const WATCH_WALK = (id, homeId, ms) => `new Promise((done) => {
  const node = document.querySelector('[data-connect-node][data-side="left"][data-node-id="${id}"]');
  const home = document.querySelector('[data-connect-node][data-side="right"][data-node-id="${homeId}"]');
  const el = node?.querySelector("[data-magic='walk'] [data-magic-subject]");
  if (!el || !home) return done(null);
  /* The walk is judged inside the connect grid itself: the playground's
     board also holds the prompt line, which changes height for a beat. */
  const board = home.closest("ul")?.parentElement ?? document.querySelector("[data-round-board]");
  const frame = board.getBoundingClientRect();
  const homeBox = home.getBoundingClientRect();
  /* Where this join is going, vertically. The engine places its lines from
     the two data-port dots and sends the walker to the partner's row —
     the Phase 12 fix, without which an animal could only ever travel level,
     into whichever home happened to share its row rather than the one the
     child chose. So the vertical is read from the same two dots, in the
     same board pixels (a world may zoom the board), once, before anything
     moves. A walk that climbs exactly this far is right; the wandering is
     what would be wrong. */
  const zoom = board.offsetWidth ? frame.width / board.offsetWidth : 1;
  const portY = (key) => {
    const dot = board.querySelector('[data-port="' + key + '"]');
    if (!dot) return null;
    const b = dot.getBoundingClientRect();
    return (b.top + b.height / 2 - frame.top) / zoom;
  };
  const riseNow = () => {
    const from = portY("left:${id}"), to = portY("right:${homeId}");
    return from === null || to === null ? null : to - from;
  };
  const rise = riseNow();
  const page = document.scrollingElement;
  const startWidth = page.scrollWidth;
  const read = () => {
    const t = getComputedStyle(el).transform;
    const m = t === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(t);
    return { x: m.m41, y: m.m42 };
  };
  let strayY = 0, reversedY = 0, peakY = 0, minX = 0, escaped = 0, homeMoved = 0, grewBy = 0, backwards = 0, boardShift = 0;
  /* Frames in which the thing under the animal's centre is outside its own
     node: painted over by a neighbour, or gone. Its own card's port dot, at
     the edge it crosses, is the same node and does not count; on arrival
     the animal itself must be what is there. */
  let hiddenFrames = 0;
  const wrap = node.querySelector("[data-magic='walk']");
  const onTop = (strict) => {
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return Boolean(hit && (strict ? wrap : node).contains(hit));
  };
  let last = read(), trail = [];
  const started = performance.now();
  const frameFn = () => {
    const now = read();
    minX = Math.min(minX, now.x);
    if (now.x < last.x - 0.5) backwards++;
    /* Vertical, judged against the climb the join asked for rather than
       against zero: how far it ever strays outside the straight line from
       where it stood to the row it was sent to, and how far it ever slides
       back down that line. A decorative bob shows up as both; a real climb
       as neither. The 3px band is the same slack the horizontal gets. */
    const lo = (rise === null ? 0 : Math.min(0, rise)) - 3;
    const hi = (rise === null ? 0 : Math.max(0, rise)) + 3;
    if (now.y < lo) strayY = Math.max(strayY, lo - now.y);
    if (now.y > hi) strayY = Math.max(strayY, now.y - hi);
    peakY = (rise ?? 0) >= 0 ? Math.max(peakY, now.y) : Math.min(peakY, now.y);
    if (Math.abs(now.y - peakY) > 3) reversedY++;
    const b = el.getBoundingClientRect();
    if (b.left < frame.left - 1 || b.right > frame.right + 1) escaped++;
    /* The home is judged against the board it sits in: the walk must not
       move it. The board itself may still move on the page — the prompt
       line above it swaps to a shorter sentence for the correct beat and
       back on narrow screens, which predates the walk — so that is read
       separately and told, not failed. */
    const h = home.getBoundingClientRect();
    const f = board.getBoundingClientRect();
    homeMoved = Math.max(
      homeMoved,
      Math.abs(h.left - f.left - (homeBox.left - frame.left)),
      Math.abs(h.top - f.top - (homeBox.top - frame.top)),
    );
    boardShift = Math.max(boardShift, Math.abs(f.top - frame.top), Math.abs(f.left - frame.left));
    grewBy = Math.max(grewBy, page.scrollWidth - startWidth);
    if (!onTop(false)) hiddenFrames++;
    trail.push(now.x); last = now;
    if (performance.now() - started < ${ms}) return requestAnimationFrame(frameFn);
    const b2 = el.getBoundingClientRect();
    const hb = home.getBoundingClientRect();
    const homeArt = home.querySelector("[data-art]");
    const badge = home.querySelector("[data-port]")?.previousElementSibling;
    const overlaps = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    done({
      rise, arrived: riseNow(), strayY, reversedY, minX, escaped, homeMoved, grewBy, backwards, boardShift, hiddenFrames,
      visibleAtEnd: onTop(true),
      final: now, finalBox: { left: b2.left, right: b2.right },
      homeLeft: hb.left,
      homeInner: hb.left + parseFloat(getComputedStyle(home).paddingLeft),
      homeArtLeft: homeArt ? homeArt.getBoundingClientRect().left : null,
      coversHomeArt: homeArt ? overlaps(b2, homeArt.getBoundingClientRect()) : false,
      coversCheck: [...document.querySelectorAll("[data-connect-node] svg")]
        .filter((s) => s.closest("[data-magic]") === null && !s.closest("[data-art]") && s.getBoundingClientRect().width <= 20)
        .some((s) => overlaps(b2, s.getBoundingClientRect())),
      still: trail.length > 3 && Math.abs(trail.at(-1) - trail.at(-4)) < 0.1,
      label: node.getAttribute("aria-label"),
      homeLabel: home.getAttribute("aria-label"),
    });
  };
  requestAnimationFrame(frameFn);
})`;

/**
 * Join the first unmatched animal to its home by offering homes in turn, and
 * watch what the board does on each answer. Returns what was seen.
 */
async function walkOne(cdp, sessionId) {
  let page = await evaluate(cdp, sessionId, NODES);
  const left = page.nodes.find(
    (n) => n.side === "left" && n.state !== "matched",
  );
  const rights = page.nodes.filter(
    (n) => n.side === "right" && n.state !== "matched",
  );
  if (!left || !rights.length) return { error: "no board" };

  const wrongMoves = [];
  for (const right of rights) {
    const before = await evaluate(cdp, sessionId, SUBJECT(left.id));
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, right.centre);
    /* Read straight away: the answer has been judged, the walk has begun. */
    await settle(cdp, sessionId, 30);
    page = await evaluate(cdp, sessionId, NODES);
    const now = page.nodes.find((n) => n.side === "left" && n.id === left.id);

    if (now?.state === "matched") {
      const watched = await evaluate(
        cdp,
        sessionId,
        WATCH_WALK(left.id, right.id, 2100),
      );
      /* Two more samples, well after settling: nothing may still be moving. */
      await settle(cdp, sessionId, 300);
      const later = await evaluate(cdp, sessionId, SUBJECT(left.id));
      return {
        left,
        right,
        before,
        watched,
        later,
        wrongMoves,
        nodes: page.nodes,
        frame: page.frame,
      };
    }

    /* A wrong join. Let the board let go, then confirm nothing travelled. */
    await settle(cdp, sessionId, 700);
    const after = await evaluate(cdp, sessionId, SUBJECT(left.id));
    wrongMoves.push(after ? Math.abs(after.x - (before?.x ?? 0)) : 0);
    await settle(cdp, sessionId, 500);
  }
  return { error: "no home took the animal", wrongMoves };
}

function judgeWalk(seen, problems) {
  const { watched, later, before } = seen;
  if (!watched) {
    problems.push("no walker on the matched animal");
    return;
  }
  if (seen.wrongMoves.some((d) => d > 0.5))
    problems.push("a wrong join moved the animal");
  if (watched.final.x <= 1) problems.push("never walked");
  if (watched.minX < -0.5 || watched.backwards > 0)
    problems.push("walked backwards");
  /* Three rules where there was one, because there is more to be right
     about than "did not move up". The animal must end on its home's row,
     never wander off the way there, and never slide back down it. Together
     these say what the old single rule could only say for a home that
     happened to sit level: it went to the row the child chose. */
  if (watched.arrived === null) problems.push("could not read the two ports");
  else if (Math.abs(watched.final.y - watched.arrived) > 1.5) {
    problems.push(
      `stopped ${(watched.final.y - watched.arrived).toFixed(1)}px off its home's row`,
    );
  }
  if (watched.strayY > 0.5)
    problems.push(`wandered ${watched.strayY.toFixed(1)}px off the climb`);
  if (watched.reversedY > 0)
    problems.push(`bobbed on ${watched.reversedY} frames`);
  if (!watched.still) problems.push("never settled");
  /* The destination: the animal stands where the home's content begins. */
  const gap = watched.finalBox.left - watched.homeInner;
  if (Math.abs(gap) > 1.5)
    problems.push(`stopped ${gap.toFixed(1)}px from its place in the home`);
  if (watched.finalBox.left <= watched.homeLeft) problems.push("never went in");
  if (watched.coversHomeArt) problems.push("covers what is in the home");
  if (
    watched.homeArtLeft !== null &&
    watched.finalBox.right > watched.homeArtLeft - 2
  ) {
    problems.push("touches what is in the home");
  }
  if (watched.coversCheck) problems.push("covers a check mark");
  if (!watched.visibleAtEnd) problems.push("painted over on arrival");
  if (watched.hiddenFrames > 0)
    problems.push(`painted over for ${watched.hiddenFrames} frames`);
  if (watched.homeMoved > 0.5)
    problems.push(`home moved ${watched.homeMoved.toFixed(1)}px`);
  if (watched.escaped > 0)
    problems.push(`left the board on ${watched.escaped} frames`);
  if (watched.grewBy > 0) problems.push(`grew the page ${watched.grewBy}px`);
  if (
    !later ||
    Math.abs(later.x - watched.final.x) > 0.1 ||
    Math.abs(later.y - watched.final.y) > 0.1
  ) {
    problems.push("moved after settling");
  }
  if (!/joined to/.test(watched.label ?? ""))
    problems.push("animal's name lost its state");
  if (!/joined to/.test(watched.homeLabel ?? ""))
    problems.push("home's name lost its state");
  if (before && Math.abs(before.x) > 0.5)
    problems.push("animal started displaced");
}

async function walk(cdp, sessionId) {
  console.log("\n  animal homes → walk\n");
  for (const viewport of screens) {
    await applyViewport(cdp, sessionId, viewport);
    await visit(cdp, sessionId, VISUAL);
    for (const index of BOARDS.walk) {
      const problems = [];
      if (!(await jump(cdp, sessionId, index))) {
        report(`${viewport.name.padEnd(27)} board ${index}`, ["never reached"]);
        continue;
      }
      const page = await evaluate(cdp, sessionId, NODES);
      if (
        page.activity &&
        !page.activity.startsWith("general-knowledge.home-partners")
      ) {
        problems.push(`board is ${page.activity}`);
      }
      const lefts = page.nodes.filter((n) => n.side === "left");
      if (!lefts.every((n) => n.walker)) problems.push("an animal cannot walk");
      if (page.nodes.some((n) => n.side === "right" && n.walker))
        problems.push("a home can walk");
      if (
        page.nodes.length &&
        Math.min(...page.nodes.map((n) => n.min)) < MIN_TOUCH
      ) {
        problems.push(
          `node only ${Math.round(Math.min(...page.nodes.map((n) => n.min)))}px`,
        );
      }

      const seen = await walkOne(cdp, sessionId);
      if (seen.error) problems.push(seen.error);
      else judgeWalk(seen, problems);
      if ((await overflow(cdp, sessionId)) > 0)
        problems.push("horizontal scroll");

      const travelled = seen.watched
        ? `${seen.watched.final.x.toFixed(0)}px` +
          (Math.abs(seen.watched.rise ?? 0) > 0.5
            ? ` and ${Math.abs(seen.watched.final.y).toFixed(0)}px ${(seen.watched.rise ?? 0) > 0 ? "down" : "up"} to its row`
            : "")
        : "—";
      const shifted =
        seen.watched && seen.watched.boardShift > 0.5
          ? `, board shifted ${seen.watched.boardShift.toFixed(0)}px under the prompt line`
          : "";
      report(
        `${viewport.name.padEnd(27)} board ${index}  ${String(lefts.length)} pairs, ` +
          `${(seen.wrongMoves ?? []).length} wrong first, walked ${travelled}${shifted}`,
        problems,
      );
    }
  }

  /* Reduced motion: a right join and the animal is at the house, one frame in. */
  await applyViewport(cdp, sessionId, VIEWPORTS[0]);
  await reduce(cdp, sessionId, true);
  await visit(cdp, sessionId, VISUAL);
  const problems = [];
  await jump(cdp, sessionId, BOARDS.walk[0]);
  let page = await evaluate(cdp, sessionId, NODES);
  const left = page.nodes.find((n) => n.side === "left");
  const rights = page.nodes.filter((n) => n.side === "right");
  let placed = null;
  for (const right of rights) {
    await clickAt(cdp, sessionId, left.centre);
    await settle(cdp, sessionId, 120);
    await clickAt(cdp, sessionId, right.centre);
    await settle(cdp, sessionId, 80);
    page = await evaluate(cdp, sessionId, NODES);
    const now = page.nodes.find((n) => n.side === "left" && n.id === left.id);
    if (now?.state === "matched") {
      const subject = await evaluate(cdp, sessionId, SUBJECT(left.id));
      const home = page.nodes.find(
        (n) => n.side === "right" && n.id === right.id,
      );
      placed = subject && home ? subject.left - home.inner : null;
      if (subject && !subject.onTop) problems.push("painted over");
      break;
    }
    await settle(cdp, sessionId, 1300);
  }
  if (placed === null) problems.push("no join landed");
  else if (Math.abs(placed) > 1.5)
    problems.push(`animal ${placed.toFixed(1)}px from its place in the home`);
  await reduce(cdp, sessionId, false);
  report("reduced motion: the animal is instantly at the home", problems);
}

/* ---- a real round -------------------------------------------------------- */

const QUEST = `${ORIGIN}/play/math-quest`;

/** The answer tiles on a quest board, by accessible name. */
const TILES = `[...document.querySelectorAll("main li button")].map((b) => ({
  label: b.getAttribute("aria-label") ?? b.textContent.trim(),
  disabled: b.disabled,
  centre: (() => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })(),
}))`;

/**
 * Plays Math Quest to the end the slow way — every tile on every question
 * until the board moves on — so the celebration measured is the one the
 * child reaches, inside the real `GameShell`, not the playground's sample.
 */
async function finishQuest(cdp, sessionId) {
  await visit(cdp, sessionId, QUEST);
  const intro = await evaluate(
    cdp,
    sessionId,
    `(() => { const b = document.querySelector("main button"); if (!b) return null;
       const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
  );
  if (!intro) return false;
  await clickAt(cdp, sessionId, intro);
  await settle(cdp, sessionId, 900);
  /* Tiles are tried left to right; a board whose names changed is a new
     question, so the count starts again. */
  let tried = 0;
  let names = "";
  for (let taps = 0; taps < 80; taps++) {
    if (
      await evaluate(
        cdp,
        sessionId,
        `Boolean(document.querySelector("[data-magic='celebrate']"))`,
      )
    ) {
      return true;
    }
    const tiles = await evaluate(cdp, sessionId, TILES);
    /* A tried tile says so in its name; that is the same question, not a new one. */
    const now = tiles
      .map((t) => t.label.replace(/, already tried$/, ""))
      .join("|");
    if (now !== names) {
      names = now;
      tried = 0;
    }
    const next = tiles[tried];
    if (!next) {
      await settle(cdp, sessionId, 600);
      continue;
    }
    tried += 1;
    if (/already tried/.test(next.label)) continue;
    /* A tall question can put its tiles below the fold of a short phone. */
    const centre = await evaluate(
      cdp,
      sessionId,
      `(() => { const b = document.querySelectorAll("main li button")[${tried - 1}];
         b.scrollIntoView({ block: "center" });
         const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
    );
    await clickAt(cdp, sessionId, centre);
    await settle(cdp, sessionId, 1500);
  }
  return Boolean(
    await evaluate(
      cdp,
      sessionId,
      `document.querySelector("[data-magic='celebrate']")`,
    ),
  );
}

async function round(cdp, sessionId) {
  console.log("\n  a real round, played to the end → celebrate\n");
  for (const reducedMotion of [false, true]) {
    await applyViewport(cdp, sessionId, VIEWPORTS[0]);
    await reduce(cdp, sessionId, reducedMotion);
    const problems = [];
    const reached = await finishQuest(cdp, sessionId);
    if (!reached) {
      report(reducedMotion ? "reduced motion: math quest" : "math quest", [
        "never reached the end",
      ]);
      continue;
    }
    /* The lift waits for the card to fade in, so the watch is long enough
       to see it happen and then see it stop. */
    const seen = await evaluate(
      cdp,
      sessionId,
      WATCH_CELEBRATE(reducedMotion ? 500 : 2400),
    );
    if (!seen) {
      report("math quest", ["no celebration figure"]);
      continue;
    }
    if (reducedMotion) {
      if (seen.moved || seen.maxScale > 1.001)
        problems.push("moved under reduced motion");
      if (seen.sparksSeen > 0)
        problems.push(`${seen.sparksSeen} marks under reduced motion`);
    } else {
      if (!seen.moved) problems.push("never lifted");
      if (seen.maxY > 10) problems.push(`lifted ${seen.maxY.toFixed(1)}px`);
      if (seen.maxScale > 1.08)
        problems.push(`scaled to ${seen.maxScale.toFixed(2)}`);
      if (Math.abs(seen.final.y) > 0.5 || Math.abs(seen.final.s - 1) > 0.01)
        problems.push("did not settle");
      if (seen.sparksSeen === 0 || seen.sparksSeen > 3)
        problems.push(`${seen.sparksSeen} marks`);
      if (seen.sparksVisible > 0)
        problems.push(`${seen.sparksVisible} marks left visible`);
    }
    if (!seen.title) problems.push("no title");
    if (!seen.buttons.some((b) => /play again/i.test(b)))
      problems.push("no play again");
    if (JSON.stringify(seen.buttons) !== JSON.stringify(seen.buttonsAfter))
      problems.push("controls changed");
    if (seen.exposed > 0) problems.push(`${seen.exposed} drawings exposed`);
    const fits = await evaluate(
      cdp,
      sessionId,
      `document.scrollingElement.scrollHeight - window.innerHeight`,
    );
    if ((await overflow(cdp, sessionId)) > 0)
      problems.push("horizontal scroll");
    report(
      `${reducedMotion ? "reduced motion: " : ""}math quest at 360×640: "${seen.title}", ` +
        `lift ${seen.maxY.toFixed(1)}px, ${seen.sparksSeen} marks, ${fits <= 0 ? "fits the screen" : `${fits}px below the fold`}`,
      problems,
    );
  }
  await reduce(cdp, sessionId, false);
}

/* ---- run ----------------------------------------------------------------- */

let browser;
try {
  browser = await openBrowser(9341);
  await requireDevPages(browser.cdp, browser.sessionId, VISUAL);
  const { cdp, sessionId } = browser;
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: WATCH_FOR_TROUBLE },
    sessionId,
  );
  console.log(`\n  ${ORIGIN}  (${screens.length} screens)`);

  if (wants("counting")) await counting(cdp, sessionId);
  if (wants("celebrate")) await celebrate(cdp, sessionId);
  if (wants("walk")) await walk(cdp, sessionId);
  if (wants("round")) await round(cdp, sessionId);

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
