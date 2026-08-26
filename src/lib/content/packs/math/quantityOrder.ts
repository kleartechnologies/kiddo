import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";

/**
 * Groups of things, smallest first.
 *
 * `number-order` puts numerals in order; this puts *quantities* in order, with
 * no numeral anywhere on the board. They look like the same activity and they
 * are not. A child can sort 4, 5, 6 by reciting the counting rhyme without
 * ever thinking about how many things four is; sorting four dots, five dots
 * and six dots cannot be done that way. Something has to be counted, and then
 * held while the next group is counted.
 *
 * That is the bridge between saying numbers and having them, so it is here as
 * its own activity, and it borrows the `comparison` activity type from the
 * quiz that already asks which of two groups is bigger. Nothing in any union
 * grew and no engine was touched: `OrderStage` draws this exactly as it draws
 * the alphabet.
 *
 * ## Every group is the same colour, on purpose
 *
 * Five green dots beside three blue ones invites a child to sort by hue, and
 * teaches them that colour is part of the question. It is not. Every group on
 * every board here is drawn in one accent, so the only thing that differs
 * between two cards is how many pips are on them — which is also why this
 * board never needs colour vision to answer.
 *
 * ## How a level gets harder
 *
 * | | groups | inside | how close together |
 * |-|--------|--------|--------------------|
 * |1| 3 | 1–7 | never closer than two, so the piles look different |
 * |2| 4 | 1–8 | one pair that differs by a single pip |
 * |3| 5 | 1–10 | several touching pairs, and bigger piles |
 *
 * The lever is how far apart the quantities are. Two piles that differ by two
 * can be told apart by eye; two that differ by one cannot, and a board full of
 * them has to be counted. Nothing gets faster, and a board a child takes a
 * minute over is the board a child who takes four seconds sees.
 */

/**
 * Every board this activity can deal, written out.
 *
 * Enumerated rather than sampled, for the reason `number-order` enumerates its
 * runs: a set of quantities is the thing being practised — 1, 3, 5 is one idea
 * however the tray was shuffled — so the list below is the honest content
 * count, and a grown-up can read every board a child will ever be given.
 */
interface Spread {
  values: readonly number[];
  level: Level;
}

const SPREADS: readonly Spread[] = [
  /* Level 1 — three groups, never closer than two pips apart. A child who
     cannot yet count reliably can still get these right by looking, which is
     the point: the idea comes first, the counting comes next. */
  { values: [1, 3, 5], level: 1 },
  { values: [1, 3, 6], level: 1 },
  { values: [1, 3, 7], level: 1 },
  { values: [1, 4, 6], level: 1 },
  { values: [1, 4, 7], level: 1 },
  { values: [1, 5, 7], level: 1 },
  { values: [2, 4, 6], level: 1 },
  { values: [2, 4, 7], level: 1 },
  { values: [2, 5, 7], level: 1 },
  { values: [3, 5, 7], level: 1 },

  /* Level 2 — four groups, and exactly one pair that differs by a single pip.
     One place on the board where looking is not enough. */
  { values: [1, 2, 4, 6], level: 2 },
  { values: [1, 3, 4, 6], level: 2 },
  { values: [1, 3, 5, 6], level: 2 },
  { values: [2, 3, 5, 7], level: 2 },
  { values: [2, 4, 5, 7], level: 2 },
  { values: [2, 4, 6, 7], level: 2 },
  { values: [1, 2, 5, 8], level: 2 },
  { values: [3, 4, 6, 8], level: 2 },
  { values: [1, 4, 5, 8], level: 2 },
  { values: [2, 5, 6, 8], level: 2 },

  /* Level 3 — five groups, up to ten pips, and runs of touching quantities.
     These have to be counted, all of them, and the count has to be kept. */
  { values: [1, 2, 3, 5, 7], level: 3 },
  { values: [2, 3, 4, 6, 8], level: 3 },
  { values: [4, 5, 6, 8, 10], level: 3 },
  { values: [1, 3, 4, 5, 7], level: 3 },
  { values: [3, 5, 6, 7, 9], level: 3 },
  { values: [2, 4, 5, 6, 8], level: 3 },
  { values: [5, 6, 7, 9, 10], level: 3 },
  { values: [1, 2, 4, 5, 7], level: 3 },
  { values: [3, 4, 5, 7, 9], level: 3 },
  { values: [6, 7, 8, 9, 10], level: 3 },
];

/** The honest content count: how many spreads there are to work through. */
export const QUANTITY_SPREADS: readonly string[] = SPREADS.map((entry) =>
  entry.values.join("-"),
);

/** One accent for every group on every board. Colour says nothing here. */
const PIPS = "tide" as const;

const groupId = (value: number) => `dots-${value}`;

/** Which spreads a level may deal. Exactly the ones authored for it. */
function poolAtLevel(level: Level): readonly Spread[] {
  const wanted = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return SPREADS.filter((entry) => entry.level === wanted);
}

/**
 * The fewest cards that may still be sitting where the child found them.
 *
 * The same rule `number-order` and `english.alphabet-order` use: a tray that
 * is mostly already sorted is a board finished by moving one card.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/** The tray. Shuffled until enough has moved, then rotated as a fallback. */
function trayOrder(
  values: readonly number[],
  rng: Rng,
  displaced: number,
): number[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(values);
    const moved = shuffled.filter((value, index) => value !== values[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...values.slice(1), values[0]];
}

export const quantityOrderActivity = defineGeneratedActivity({
  id: "quantity-order",
  packId: "math",
  category: "math",
  activityType: "comparison",
  kind: "order",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const chosen = pool[rng.int(0, pool.length - 1)];
    const { values } = chosen;

    const items: OrderItem[] = trayOrder(
      values,
      rng,
      displacedAtLevel(level, values.length),
    ).map((value) => ({
      id: groupId(value),
      item: { kind: "count", value, accent: PIPS },
    }));

    const smallest = values[0];
    const biggest = values[values.length - 1];

    return {
      level,
      /* No display: the cards are the question, the same way they are on a
         "put these numbers in order" board. */
      prompt: {
        speech: "Can you put these groups in order? Start with the smallest.",
      },
      payload: { kind: "order", items, answerOrder: values.map(groupId) },
      explanation: `That's the right order! The smallest group has ${smallest}, and the biggest has ${biggest}.`,
      hint: "Pick one group and touch each dot as you count it.",
      meta: {
        objective: `puts ${values.length} groups of things in order by how many`,
        tags: ["family:number", `concept:quantities:${values.join("-")}`],
      },
    };
  },
});
