import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  MAGIC_MOTIONS,
  MAGIC_SPARKS,
  MAGIC_TIMING,
  isMagicMotion,
  magicMotion,
  type MagicMotionName,
} from "@/lib/magicMotion";

/**
 * The Magic Motion foundation, checked as a set of promises.
 *
 * The vocabulary is pure data, so most of this suite simply calls it and
 * holds the numbers down: every motion settles where it says it will, no
 * amplitude is large enough to read as agitation, and nothing runs forever.
 * The component promises — reduced motion, no accessible surface, no
 * curriculum knowledge — are read off the source in the house style, and what
 * the motions *measure* in a browser is `scripts/measure-magic.mjs`.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
/** The same file with its comments taken out. */
const code = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const LIB = "src/lib/magicMotion.ts";
const COMPONENT = "src/components/kiddo/MagicMotion.tsx";
const PLAYGROUND = "src/components/dev/MagicPlayground.tsx";
const PAGE = "src/app/playground/magic/page.tsx";

/** The last value a target reaches for one property. */
function endOf(value: unknown): unknown {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

/* ---------------------------------------------------- the vocabulary ---- */

/* 1 ---------------------------------------------------------------------- */
test("the vocabulary is the eight behaviours, once each", () => {
  assert.deepEqual(
    [...MAGIC_MOTIONS].sort(),
    ["bounce", "celebrate", "float", "grow", "pop", "slide", "sparkle", "walk"],
  );
  assert.equal(new Set(MAGIC_MOTIONS).size, MAGIC_MOTIONS.length);

  /* The union and the runtime list cannot drift. */
  const union = [...code(LIB).matchAll(/^\s*\|\s*"([a-z]+)"[;]?$/gm)].map((m) => m[1]);
  assert.deepEqual([...union].sort(), [...MAGIC_MOTIONS].sort());
});

/* 2 ---------------------------------------------------------------------- */
test("every motion resolves, says something, and ends where it settles", () => {
  for (const name of MAGIC_MOTIONS) {
    const spec = magicMotion(name, { distance: 100 });

    assert.ok(spec.says.trim().length > 0, `${name} moves without communicating`);
    assert.ok(spec.idle, `${name} has no resting state`);
    assert.ok(spec.settled, `${name} has no settled state`);

    /* The animation's final frame is the settled state, property by
       property — a motion that ends somewhere it does not settle would jump
       under reduced motion. */
    for (const [key, value] of Object.entries(spec.settled)) {
      const animated = (spec.animate as Record<string, unknown>)[key];
      assert.deepEqual(
        endOf(animated ?? value),
        value,
        `${name} animates "${key}" somewhere other than its settled state`,
      );
    }
  }
});

/* 3 ---------------------------------------------------------------------- */
test("an unsupported motion is refused, never silently accepted", () => {
  assert.throws(() => magicMotion("wiggle" as MagicMotionName));
  assert.throws(() => magicMotion("shake" as MagicMotionName));
  assert.equal(isMagicMotion("pop"), true);
  assert.equal(isMagicMotion("confetti-storm"), false);
});

/* 4 ---------------------------------------------------------------------- */
test("reduced motion has a whole answer for every motion", () => {
  /* The settled state is the reduced-motion result. For travel it must carry
     the destination: the child sees the dog at the house, not a dog that
     never left. */
  assert.equal(magicMotion("walk", { distance: 144 }).settled.x, 144);
  assert.equal(magicMotion("slide", { distance: 32 }).settled.x, 0);

  for (const name of MAGIC_MOTIONS) {
    const { settled } = magicMotion(name);
    /* Nothing settles hidden or shrunken — no information lives in motion. */
    if ("opacity" in settled) assert.equal(settled.opacity, 1, name);
    if ("scale" in settled) assert.equal(settled.scale, 1, name);
  }

  /* And the component actually asks. */
  const source = code(COMPONENT);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /reduced/);
  assert.match(source, /\bfrom "framer-motion"/);
});

/* 5 ---------------------------------------------------------------------- */
test("nothing loops and nothing is random", () => {
  for (const path of [LIB, COMPONENT, PLAYGROUND]) {
    const source = code(path);
    assert.doesNotMatch(source, /repeat:/, `${path} repeats`);
    assert.doesNotMatch(source, /Infinity/, `${path} runs forever`);
    assert.doesNotMatch(source, /animate-pulse|animate-bounce|animate-ping/, path);
    assert.doesNotMatch(source, /Math\.random/, `${path} is unpredictable`);
  }
});

/* 6 ---------------------------------------------------------------------- */
test("every amplitude is gentle and every tween is short", () => {
  for (const name of MAGIC_MOTIONS) {
    const spec = magicMotion(name);
    const target = spec.animate as Record<string, unknown>;

    for (const key of ["y", "scale"] as const) {
      const value = target[key];
      const frames = Array.isArray(value) ? value : value === undefined ? [] : [value];
      for (const frame of frames) {
        if (typeof frame !== "number") continue;
        if (key === "y") {
          assert.ok(Math.abs(frame) <= 10, `${name} lifts ${frame}px`);
        } else {
          assert.ok(frame >= 0.4 && frame <= 1.08, `${name} scales to ${frame}`);
        }
      }
    }
  }

  /* Tween lengths, held down by name. Float is the one slow drifter, and
     even it ends. */
  assert.ok(MAGIC_TIMING.bounce <= 0.6);
  assert.ok(MAGIC_TIMING.walk <= 2);
  assert.ok(MAGIC_TIMING.sparkle <= 0.6);
  assert.ok(MAGIC_TIMING.celebrate <= 0.8);
  assert.ok(MAGIC_TIMING.spark <= 0.8);
  assert.ok(Number.isFinite(MAGIC_TIMING.float) && MAGIC_TIMING.float <= 12);
});

/* 7 ---------------------------------------------------------------------- */
test("sparkle is marks, never a particle system", () => {
  assert.ok(MAGIC_SPARKS.length <= 3, "more than three marks is a storm");
  for (const spark of MAGIC_SPARKS) assert.ok(spark.size <= 12);

  const source = read(COMPONENT);
  assert.match(source, /data-magic-spark[\s\S]{0,80}aria-hidden="true"/);
  assert.match(source, /pointer-events-none/);
});

/* ---------------------------------------------------- the boundaries ---- */

/* 8 ---------------------------------------------------------------------- */
test("the motion system knows how to move, not what anything means", () => {
  for (const path of [LIB, COMPONENT]) {
    const source = code(path);
    assert.doesNotMatch(source, /@\/lib\/content/, `${path} reached into content`);
    assert.doesNotMatch(source, /checkAnswer|Challenge|Activity|correct/, path);
  }
});

/* 9 ---------------------------------------------------------------------- */
test("the wrapper adds no accessible surface", () => {
  const source = code(COMPONENT);
  assert.doesNotMatch(source, /aria-label/, "a motion must not name anything");
  assert.doesNotMatch(source, /\brole=/, "a motion has no role to announce");
  assert.doesNotMatch(source, /tabIndex/, "a motion is not focusable");
  assert.doesNotMatch(source, /<button|onClick/, "a motion is not a control");
});

/* 10 --------------------------------------------------------------------- */
test("the playground is internal: not indexed, not in the catalogue", () => {
  assert.match(read(PAGE), /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);

  const catalogue = read("src/data/games.ts");
  assert.doesNotMatch(catalogue, /playground/i, "the catalogue heard about the lab");
  assert.doesNotMatch(read(PLAYGROUND), /score|coins|streak|\bxp\b/i);
});

/* 11 --------------------------------------------------------------------- */
test("the existing system was left alone", () => {
  /* Phase 2 wired the vocabulary into three callsites — the prompt line, the
     celebration and the connect board (`tests/magicCallsites.test.ts`). Every
     other engine, and the drawings themselves, still know nothing about it:
     a motion is something a callsite chooses, never something an item or an
     illustration carries. */
  const untouched = [
    "src/components/games/GameShell.tsx",
    "src/components/games/engines/OrderStage.tsx",
    "src/components/games/engines/MatchStage.tsx",
    "src/components/games/engines/ContentItemView.tsx",
    "src/components/kiddo/artwork/illustrations/index.tsx",
  ];
  for (const path of untouched) {
    assert.doesNotMatch(read(path), /magicMotion|MagicMotion/, path);
  }

  /* And a drawing is still a still drawing. */
  assert.doesNotMatch(
    read("src/components/kiddo/artwork/illustrations/index.tsx"),
    /framer-motion/,
  );
});

/* 12 --------------------------------------------------------------------- */
test("performance: transforms and opacity only, nothing measured", () => {
  /* The vocabulary may only speak in compositor-friendly properties. */
  const allowed = new Set(["x", "y", "scale", "opacity", "originY", "transition"]);
  for (const name of MAGIC_MOTIONS) {
    const spec = magicMotion(name);
    for (const target of [spec.idle, spec.initial, spec.animate, spec.settled]) {
      for (const key of Object.keys(target)) {
        assert.ok(allowed.has(key), `${name} animates "${key}", a layout property`);
      }
    }
  }

  for (const path of [LIB, COMPONENT]) {
    assert.doesNotMatch(code(path), /getBoundingClientRect|ResizeObserver/, path);
  }
});

/* 13 --------------------------------------------------------------------- */
test("walk travels vertically too, and settles exactly at its destination", () => {
  /* Regression: a walk that only moved along x could only ever arrive at
     whatever sat level with its start — an animal joined to a home in a
     different row was seen walking into the wrong one. The journey's end,
     played or reduced, must be the (distance, rise) it was asked for. */
  const down = magicMotion("walk", { distance: 144, rise: 60 });
  assert.deepEqual(down.settled, { x: 144, y: 60 });
  assert.equal(endOf((down.animate as Record<string, unknown>).x), 144);
  assert.equal(endOf((down.animate as Record<string, unknown>).y), 60);

  /* A home above the walker is a climb: the rise may be negative. */
  const up = magicMotion("walk", { distance: 100, rise: -80 });
  assert.deepEqual(up.settled, { x: 100, y: -80 });
  assert.equal(endOf((up.animate as Record<string, unknown>).y), -80);

  /* No rise asked for: the level walk it always was, bob and all. */
  const level = magicMotion("walk", { distance: 100 });
  assert.deepEqual(level.settled, { x: 100, y: 0 });
  assert.deepEqual((level.animate as Record<string, unknown>).y, [0, -2, 0, -2, 0, -2, 0]);

  /* The bob stays a bob whatever the rise: every frame keeps within a
     couple of pixels of the straight line from start to destination. */
  const frames = (down.animate as Record<string, number[]>).y;
  for (const [index, frame] of frames.entries()) {
    const along = (60 * index) / (frames.length - 1);
    assert.ok(Math.abs(frame - along) <= 2, `frame ${index} strays ${frame - along}px`);
  }
});
