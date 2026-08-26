import { defineGeneratedActivity } from "../../activity";
import {
  BLANK,
  dots,
  forLevel,
  glyph,
  numberChoices,
  numeral,
  type LevelTable,
} from "./shared";

/**
 * Adding and taking away.
 *
 * The two activities Math Quest leans on hardest, and the reason the pack is
 * generated rather than authored: nobody needs to write `2 + 3` down.
 *
 * Level 1 asks the question in dots, because a child who cannot yet read `+`
 * can still count two groups of things. Levels 2 and 3 are the same question
 * in numerals. The engine never notices the difference — a `count` item and a
 * `number` item are both just an item on the line.
 */

/** How big the numbers get. Level 1 stays inside a handful of dots. */
const ADD_MAX: LevelTable<number> = { 1: 5, 2: 10, 3: 20 };
const SUB_MAX: LevelTable<number> = { 1: 5, 2: 10, 3: 20 };

/** Three tiles while the numbers are small, four once they are not. */
const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/* --------------------------------------------------------------- the facts */

/**
 * A number bond: two numbers and what they make. `a` is never bigger than `b`,
 * so 2+3 and 3+2 are one entry — a child who knows one knows the other, and
 * counting them twice would be counting a board rather than a fact.
 */
export interface Bond {
  a: number;
  b: number;
}

/**
 * Every addition fact this pack can ask, enumerated.
 *
 * The honest content count of the addition objective: one hundred bonds
 * inside twenty, not the tens of thousands of boards they can be dealt onto. The
 * generator above draws from the same space by picking `a` and `b`; this list
 * exists so the count can be *read* rather than argued about, and so
 * `sum-partners` can deal whole boards from it without a second table.
 */
export const ADDITION_BONDS: readonly Bond[] = (() => {
  const bonds: Bond[] = [];
  for (let a = 1; a <= 19; a += 1) {
    for (let b = a; a + b <= 20; b += 1) bonds.push({ a, b });
  }
  return bonds;
})();

/**
 * Every take-away fact this pack can ask — one hundred and ninety of them: a
 * whole and how much is taken from it, both ends above zero, inside twenty.
 *
 * Counted separately from the bonds because taking away is not adding read
 * backwards for a child who is learning it — 7−3 and 3+4 are the same
 * arithmetic and a very different question.
 */
export const SUBTRACTION_FACTS: readonly Bond[] = (() => {
  const facts: Bond[] = [];
  for (let whole = 2; whole <= 20; whole += 1) {
    for (let taken = 1; taken < whole; taken += 1) facts.push({ a: whole, b: taken });
  }
  return facts;
})();

/** The name of one bond, however it was laid out. Shared with `sum-partners`. */
export function bondConcept(a: number, b: number): string {
  const [low, high] = a <= b ? [a, b] : [b, a];
  return `concept:add:${low}+${high}`;
}

export const additionActivity = defineGeneratedActivity({
  id: "addition",
  packId: "math",
  category: "math",
  activityType: "addition",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const max = forLevel(ADD_MAX, level, 10);
    const a = rng.int(1, max - 1);
    const b = rng.int(1, max - a);
    const sum = a + b;
    const visual = level === 1;

    return {
      level,
      prompt: {
        speech: visual ? "How many are there altogether?" : "What do these make?",
        display: [
          visual ? dots(a, "sprout") : numeral(a),
          glyph("plus"),
          visual ? dots(b, "apricot") : numeral(b),
          glyph("equals"),
          BLANK,
        ],
      },
      payload: numberChoices(sum, rng, {
        min: 1,
        /* Two above the level's ceiling, so the answer is not simply the
           biggest tile on the board whenever the sum lands on the ceiling. */
        max: max + 2,
        count: forLevel(TILES, level, 3),
      }),
      explanation: `${a} and ${b} make ${sum}.`,
      meta: {
        objective: `adds two numbers within ${max}`,
        /* The bond, not the board: 2+3 and 3+2 are one thing to know, so a
           session that has just taught one does not deal the other. */
        tags: ["family:number", bondConcept(a, b)],
      },
    };
  },
});

export const subtractionActivity = defineGeneratedActivity({
  id: "subtraction",
  packId: "math",
  category: "math",
  activityType: "subtraction",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const max = forLevel(SUB_MAX, level, 10);
    /* Both ends stay above zero: "none left" is a real idea, but it is not the
       one a child meets first, and an empty tile is a poor drawing of it. */
    const whole = rng.int(2, max);
    const taken = rng.int(1, whole - 1);
    const left = whole - taken;
    const visual = level === 1;

    return {
      level,
      prompt: {
        speech: visual ? "How many are left?" : "What is left?",
        display: [
          visual ? dots(whole, "tide") : numeral(whole),
          glyph("minus"),
          visual ? dots(taken, "blossom") : numeral(taken),
          glyph("equals"),
          BLANK,
        ],
      },
      payload: numberChoices(left, rng, {
        min: 1,
        max: max + 1,
        count: forLevel(TILES, level, 3),
      }),
      explanation: `Take ${taken} away from ${whole} and ${left} are left.`,
      meta: {
        objective: `subtracts within ${max}`,
        tags: ["family:number", `concept:take:${whole}-${taken}`],
      },
    };
  },
});
