import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { ACCENT_WORDS, TELLABLE_PAIRS, tellableFrom } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";

/**
 * The palette, checked as colour science rather than as taste.
 *
 * `tests/visual.test.ts` guards how the palette is *used* — that a drawing
 * reaches for a token and not a hex, that a board is fully illustrated or not
 * at all. This file guards the palette itself: that the six accents are still
 * six colours a four year old can actually tell apart, including a four year
 * old who is colour blind.
 *
 * That distinction matters because the two fail differently. A misused token
 * is visible in a diff. A hue nudged four points towards its neighbour is
 * invisible in a diff, invisible on the designer's screen, and turns an
 * odd-one-out board into a coin flip for one child in twelve.
 *
 * The maths below is standard and deliberately unclever: sRGB to linear to
 * CIE XYZ under D65 to CIE Lab, distances as CIE76, and the Viénot, Brettel &
 * Mollon (1999) LMS reduction for the three dichromacies. CIE76 rather than
 * CIEDE2000 because the thresholds here are large — 25 units, not 2 — and at
 * that distance the two agree, while CIE76 can be read and re-derived by hand
 * from this file alone.
 */

const CSS_SOURCE = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Reads one `--color-*` token out of the stylesheet. */
function token(name: string): string {
  const found = CSS_SOURCE.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(found, `--color-${name} is missing from globals.css`);
  return found[1].toLowerCase();
}

/* --------------------------------------------------------------------------
   Colour space
   ----------------------------------------------------------------------- */

type Triple = [number, number, number];

function rgbOf(hex: string): Triple {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (channel: number) => {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (c: number) =>
  255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toXyz([r, g, b]: Triple): Triple {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  return [
    R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    R * 0.2126729 + G * 0.7151522 + B * 0.072175,
    R * 0.0193339 + G * 0.119192 + B * 0.9503041,
  ];
}

/** D65, the white point every browser assumes. */
const WHITE: Triple = [0.95047, 1.0, 1.08883];
const pivot = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);

function toLab([x, y, z]: Triple): Triple {
  const [fx, fy, fz] = [pivot(x / WHITE[0]), pivot(y / WHITE[1]), pivot(z / WHITE[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76. Straight-line distance in Lab, in Lab units. */
function distance(a: Triple, b: Triple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/* --------------------------------------------------------------------------
   Colour vision deficiency

   Viénot, Brettel & Mollon (1999): move into LMS, collapse the missing cone
   onto a plane spanned by the two that remain, move back. The three matrices
   are the paper's, for the sRGB primaries under D65.
   ----------------------------------------------------------------------- */

type Vision = "protanopia" | "deuteranopia" | "tritanopia";

const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
];

const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
];

const COLLAPSE: Record<Vision, number[][]> = {
  protanopia: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deuteranopia: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.86744736, 1.86727089, 0],
  ],
};

const apply = (m: number[][], v: Triple): Triple =>
  m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Triple;

/** What this colour looks like to someone with one missing cone type. */
function simulate(hex: string, vision: Vision): Triple {
  const linear = rgbOf(hex).map(toLinear) as Triple;
  const seen = apply(LMS_TO_RGB, apply(COLLAPSE[vision], apply(RGB_TO_LMS, linear)));
  const clipped = seen.map((c) => Math.min(255, Math.max(0, fromLinear(c)))) as Triple;
  return toLab(toXyz(clipped));
}

const VISIONS: Vision[] = ["protanopia", "deuteranopia", "tritanopia"];

/* --------------------------------------------------------------------------
   The palette under test
   ----------------------------------------------------------------------- */

const ACCENTS = Object.keys(ACCENT_WORDS) as Accent[];
const BASE = Object.fromEntries(
  ACCENTS.map((accent) => [accent, token(`${accent}-base`)]),
) as Record<Accent, string>;

/**
 * The distance a difference has to clear to be a fair question.
 *
 * 25 Lab units is roughly the gap between the palette's blue and its orange
 * under the worst of the three simulations. It is far above the 2.3 at which
 * two colours are merely distinguishable side by side, because a child is not
 * comparing swatches — they are looking at two tiles a few centimetres apart,
 * on a phone, in whatever light they happen to be in.
 */
const TELLABLE = 25;

test("every pair the content layer may ask about survives all three dichromacies", () => {
  for (const [a, b] of TELLABLE_PAIRS) {
    for (const vision of VISIONS) {
      const gap = distance(simulate(BASE[a], vision), simulate(BASE[b], vision));
      assert.ok(
        gap >= TELLABLE,
        `${a} and ${b} are ${gap.toFixed(1)} apart under ${vision}, below ${TELLABLE}. ` +
          `A colour question built on this pair is a coin flip for that child.`,
      );
    }
  }
});

test("no pair left off the list would have qualified", () => {
  /* The list is short on purpose. This is the half of the guarantee that a
     future palette tweak would otherwise break silently: if a hue moves far
     enough that a new pair becomes fair, the pair belongs on the list and the
     generators should be allowed to use it.

     Two exclusions are policy rather than perception, and both concern the
     brand green. Sage and sprout share the word GREEN, so no question can be
     asked with the two of them. And sage is kept off the list entirely, even
     where it is far enough away — a palette where the brand colour is also a
     quiz answer will eventually ship a board with two greens on it. */
  const excluded = (a: Accent, b: Accent) =>
    ACCENT_WORDS[a] === ACCENT_WORDS[b] || a === "sage" || b === "sage";

  for (let i = 0; i < ACCENTS.length; i += 1) {
    for (let j = i + 1; j < ACCENTS.length; j += 1) {
      const [a, b] = [ACCENTS[i], ACCENTS[j]];
      const worst = Math.min(
        ...VISIONS.map((vision) => distance(simulate(BASE[a], vision), simulate(BASE[b], vision))),
      );
      const listed = tellableFrom(a).includes(b);
      if (excluded(a, b)) {
        assert.ok(!listed, `${a}/${b} is excluded by name, so it may not be listed as tellable.`);
        continue;
      }
      assert.equal(
        listed,
        worst >= TELLABLE,
        listed
          ? `${a}/${b} is listed as tellable but falls to ${worst.toFixed(1)}.`
          : `${a}/${b} now holds ${worst.toFixed(1)} and should be added to TELLABLE_PAIRS.`,
      );
    }
  }
});

test("two accents that share a word are never offered as a pair", () => {
  for (const [a, b] of TELLABLE_PAIRS) {
    assert.notEqual(
      ACCENT_WORDS[a],
      ACCENT_WORDS[b],
      `${a} and ${b} are both ${ACCENT_WORDS[a]}, so "which one is ${ACCENT_WORDS[a]}?" has two answers.`,
    );
  }
});

test("ink on every accent tint clears WCAG AA for body text", () => {
  /* `textOnBase` is ink on every accent, and `text` is the accent's own ink
     on its soft tint. Both are read by four year olds at small sizes, so both
     are held to 4.5:1 rather than to the large-text 3:1. */
  const luminance = (hex: string) => {
    const [r, g, b] = rgbOf(hex).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const ink = token("ink-900");
  for (const accent of ACCENTS) {
    const onBase = ratio(ink, BASE[accent]);
    assert.ok(
      onBase >= 4.5,
      `ink on ${accent}-base is ${onBase.toFixed(2)}:1, below 4.5:1.`,
    );
    const onSoft = ratio(token(`${accent}-ink`), token(`${accent}-soft`));
    assert.ok(
      onSoft >= 4.5,
      `${accent}-ink on ${accent}-soft is ${onSoft.toFixed(2)}:1, below 4.5:1.`,
    );
  }
});

test("the scenery tokens stay scenery", () => {
  /* The scene palette paints hills, canopy, wood and soil. It is deliberately
     outside the accent system: nothing may carry text on it, and no accent may
     quietly become one of them, because a hill that matches a tile is a hill a
     child will try to tap. */
  const SCENE = ["scene-ridge", "scene-canopy", "scene-wood", "scene-soil"];
  for (const name of SCENE) {
    const hex = token(name);
    for (const accent of ACCENTS) {
      assert.notEqual(
        hex,
        BASE[accent],
        `--color-${name} is the same colour as ${accent}-base.`,
      );
    }
    assert.ok(
      !new RegExp(`text-${name}\\b`).test(CSS_SOURCE),
      `--color-${name} has a text utility, so something is writing on the scenery.`,
    );
  }
});
