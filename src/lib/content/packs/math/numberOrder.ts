import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";
import { numberId } from "./shared";

/**
 * Numbers, in order — Math's first **order** activity.
 *
 * Every other activity in this pack is a `choice`: here is a sum, here are
 * three tiles, one of them is right. `number-sequence` already asks *what
 * comes next* that way, and a child can answer it by recognising a pattern in
 * a row that somebody else laid out. This one hands the run over in pieces and
 * asks the child to lay it out, which is a different thing to be good at:
 * knowing that 6 comes after 5 is not the same as *building* 4, 5, 6, 7 from a
 * heap of tiles, and the second is what counting is for.
 *
 * No new engine. `OrderStage` draws this exactly as it draws the alphabet, and
 * could not tell you it was about numbers; the `ChallengeKind` is `order` and
 * the `ActivityType` is `number-sequence` — borrowed from the choice activity
 * that already teaches it rather than invented, because what is being learned
 * and how it is answered are two different axes. Nothing in the union grew.
 *
 * ## How a level gets harder
 *
 * Three ways, and none of them is a clock.
 *
 * | | tiles | steps | tray |
 * |-|-------|-------|------|
 * |1| 3 | ones, inside 1–10 | at least two tiles moved |
 * |2| 4 | ones inside 1–10, and tens | at least three moved |
 * |3| 5 | twos, fives and tens | every tile moved |
 *
 * The run gets **longer**, the **step** grows from the ones a child counts on
 * their fingers to the twos, fives and tens they will meet as skip-counting,
 * and the tray is **more scrambled** — at level three it is a derangement, so
 * there is no tile that can be left where it was found.
 *
 * Nothing here gets faster, nothing is taken away for a tile that goes back,
 * and a child who takes a minute over one board sees exactly the board a child
 * who takes four seconds sees.
 *
 * ## What it deliberately does not do
 *
 * No negative numbers, no decimals, no fractions, and no arithmetic. Every
 * board asks one question — *which order do these go in?* — and every board
 * has exactly one answer to it, because the values in a run are distinct and
 * ascending. A run with a gap in it would still be sortable, but "what comes
 * next" quietly stops being a question a child can count their way to, so
 * every run steps evenly.
 */

/** A run of numbers: the whole of what there is to learn on one board. */
interface Run {
  /** In the order that is right. Ascending, evenly stepped, always. */
  values: readonly number[];
  /** 1, 2, 5 or 10. Said out loud in the explanation. */
  step: number;
  level: Level;
}

function run(start: number, step: number, length: number, level: Level): Run {
  return {
    values: Array.from({ length }, (_, index) => start + index * step),
    step,
    level,
  };
}

/** Every run this activity can ever deal, one entry per run. */
function runs(
  starts: readonly number[],
  step: number,
  length: number,
  level: Level,
): Run[] {
  return starts.map((start) => run(start, step, length, level));
}

/**
 * The whole content of the activity, written out.
 *
 * Enumerated rather than sampled from a rule, for two reasons. A run is the
 * thing a child learns — 4, 5, 6 is one idea however its tray was shuffled —
 * so the list below *is* the honest content count, and a test can read it. And
 * a written list is a list a grown-up can check: every value on it is a whole
 * number a five year old has met, and no run reaches past 90.
 */
const RUNS: readonly Run[] = [
  /* Level 1 — three tiles, counting on in ones inside the first ten. The
     numbers a child can already say in order without being asked to think. */
  ...runs([1, 2, 3, 4, 5, 6, 7, 8], 1, 3, 1),

  /* Level 2 — four tiles. Still ones, and then the tens, which are the first
     run a child meets that is not counting on: 10, 20, 30 is a rhythm before
     it is arithmetic. */
  ...runs([1, 2, 3, 4, 5, 6, 7], 1, 4, 2),
  ...runs([10, 20, 30, 40], 10, 4, 2),

  /* Level 3 — five tiles, and the three skip-counting steps in the order they
     are usually taught: twos, then fives, then tens. Bigger numbers arrive
     with them rather than on their own, so what makes the board harder is the
     step rather than the size of the numerals. */
  ...runs([2, 4, 6, 8, 10], 2, 5, 3),
  ...runs([5, 10, 15, 20], 5, 5, 3),
  ...runs([10, 20, 30, 40, 50], 10, 5, 3),
];

/** The honest content count: how many runs there are to learn here. */
export const NUMBER_RUNS: readonly string[] = RUNS.map((entry) =>
  entry.values.join("-"),
);

/** Which runs a level may deal from. Exactly the ones authored for it. */
function poolAtLevel(level: Level): readonly Run[] {
  const wanted = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return RUNS.filter((entry) => entry.level === wanted);
}

/**
 * The fewest tiles that may still be sitting where the child found them.
 *
 * A shuffle that leaves most of the run already in place is a board the child
 * finishes by moving one tile. So the floor rises with the level, and at level
 * three it is the whole board: every number somewhere it does not belong.
 * The same rule `english.alphabet-order` uses, for the same reason.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/**
 * The tray.
 *
 * Shuffled until enough tiles have moved. When the shuffle runs out of
 * attempts it falls back to rotating the run by one — an arrangement that
 * displaces *every* position whatever the length, so it satisfies any floor
 * this file can ask for, and unlike re-rolling it always terminates.
 */
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

/** How the run goes, in the words a grown-up would use out loud. */
function howTheyGo(step: number): string {
  if (step === 1) return "They go up one at a time.";
  if (step === 2) return "They go up in twos.";
  if (step === 5) return "They go up in fives.";
  return "They go up in tens.";
}

export const numberOrderActivity = defineGeneratedActivity({
  id: "number-order",
  packId: "math",
  category: "math",
  activityType: "number-sequence",
  kind: "order",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const chosen = pool[rng.int(0, pool.length - 1)];
    const { values, step } = chosen;

    const items: OrderItem[] = trayOrder(
      values,
      rng,
      displacedAtLevel(level, values.length),
    ).map((value) => ({ id: numberId(value), item: { kind: "number", value } }));

    return {
      level,
      /* No display: the tiles are the question, the same way they are on a
         "which number is bigger?" board. */
      prompt: { speech: "Can you put these numbers in order? Start with the smallest." },
      payload: {
        kind: "order",
        items,
        answerOrder: values.map(numberId),
      },
      explanation: `That's the right order! ${howTheyGo(step)}`,
      hint: "Look for the smallest number that is still waiting.",
      meta: {
        objective: `puts ${values.length} numbers in order, stepping by ${step}`,
        tags: ["family:number", `concept:run:${values.join("-")}`],
      },
    };
  },
});
