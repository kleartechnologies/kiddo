import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import { board, chain, concept, dotsSym, dotWords, numberSym } from "./shared";

/**
 * Sequences — a run that changes by a rule, and the step after it.
 *
 * `2 → 4 → 6 → ?`. The arrows are the point: a pattern is a row that comes
 * round again, a sequence is a chain that keeps going, and drawing them
 * differently is what stops a round of Logic Quest asking the same question
 * twice in two costumes.
 *
 * Which is also why the repeating sequences the brief lists at level 1 —
 * `● ▲ ● ▲ ?` — live in `patterns.ts` rather than here. They are the same
 * question as a level 1 pattern, and a child who met both in one round would
 * be answering one thing twice. Here every rule is a *progression*: something
 * grows or shrinks by the same amount each step, in numbers or in dots.
 *
 * Three shown terms, never two. Two terms fix a difference but not a rule —
 * `2 → 4` is doubling as readily as it is adding two — and the brief asks for
 * exactly one obvious rule. Three terms of a constant difference have one.
 *
 * Math Quest has a number sequence activity of its own and this is not it:
 * that one runs to twenty in steps of one and two, sits at levels 2 and 3, and
 * draws a bare row. This one starts at level 1, steps by as much as five, and
 * counts in dots as readily as in numerals. The packs never share a round.
 */

/** A rule, and the numbers it is allowed to use. */
interface Step {
  delta: number;
  min: number;
  max: number;
}

const STEPS: LevelTable<readonly Step[]> = {
  /* One at a time, up and down. Counting, with a gap at the end. */
  1: [
    { delta: 1, min: 1, max: 20 },
    { delta: -1, min: 1, max: 20 },
  ],
  /* Twos: the first sequence that is not just counting. */
  2: [
    { delta: 2, min: 1, max: 20 },
    { delta: -2, min: 1, max: 20 },
  ],
  /* Threes and fives, up and down. No tens: a run of tens has one clean
     starting place and would be the same four numbers every time. */
  3: [
    { delta: 3, min: 1, max: 30 },
    { delta: -3, min: 1, max: 30 },
    { delta: 5, min: 1, max: 30 },
    { delta: -5, min: 1, max: 30 },
  ],
};

/** Dots only ever step by one, because there are only five of them. */
const DOT_STARTS: readonly { start: number; delta: number }[] = [
  { start: 1, delta: 1 },
  { start: 2, delta: 1 },
  { start: 4, delta: -1 },
  { start: 5, delta: -1 },
];

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/** How many terms stand before the gap. */
const SHOWN = 3;

/**
 * Wrong answers a child could have arrived at honestly.
 *
 * One step too far, one step short, two steps on, and one either side — the
 * mistakes that are actually made. A random number would be a wrong answer
 * nobody would ever pick, which makes a three-tile board a two-tile board.
 *
 * Several of these collapse onto each other when the step is one, which is
 * exactly why `pickWrong` below tops the board up rather than trusting a list.
 */
function nearMisses(answer: number, delta: number): number[] {
  return [
    answer + delta,
    answer - delta,
    answer + 2 * delta,
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
  ];
}

/**
 * `count` wrong answers, drawn from `candidates` and then, if that list ran
 * dry, from the numbers nearest the answer.
 *
 * The top-up is not decoration. Counting down from four gives an answer of
 * one, and every honest near miss to one is either zero or already taken — so
 * without this the board would quietly come out with two tiles on it, which is
 * a fifty-fifty guess rather than a question.
 */
function pickWrong(
  answer: number,
  candidates: readonly number[],
  count: number,
  rng: Rng,
  floor = 1,
  ceiling = Number.MAX_SAFE_INTEGER,
): number[] {
  const seen = new Set([answer]);
  const kept: number[] = [];

  const take = (value: number) => {
    if (kept.length >= count) return;
    if (value < floor || value > ceiling || seen.has(value)) return;
    seen.add(value);
    kept.push(value);
  };

  for (const value of rng.shuffle(candidates)) take(value);

  /* Outwards from the answer until the board is full. Bounded by the range
     itself: `ceiling - floor` steps reach every number there is. */
  for (let away = 1; kept.length < count && away <= ceiling - floor; away++) {
    take(answer + away);
    take(answer - away);
  }

  return kept;
}

export const sequencesActivity = defineGeneratedActivity({
  id: "sequences",
  packId: "logic",
  category: "logic",
  activityType: "sequences",
  kind: "choice",
  ageRange: { min: 4, max: 8 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(TILES, level, 3);

    /* Dots are the level 1 and 2 shape of the same idea: a sequence a child
       who does not read numerals yet can still answer. */
    if (level < 3 && rng.next() < 0.4) {
      const { start, delta } = rng.pick(DOT_STARTS) ?? DOT_STARTS[0];
      const run = Array.from({ length: SHOWN }, (_, i) => start + i * delta);
      const answer = start + SHOWN * delta;

      return {
        level,
        prompt: {
          speech: "What comes next?",
          display: chain(run.map(dotsSym)),
        },
        payload: board(
          dotsSym(answer),
          /* One and two either side. `nearMisses` would only ever offer one
             and one here, because a dot sequence only ever steps by one. */
          pickWrong(
            answer,
            [answer - 1, answer + 1, answer - 2, answer + 2],
            tiles - 1,
            rng,
            1,
            5,
          ).map(dotsSym),
          rng,
        ),
        explanation:
          delta > 0
            ? `They go up by one dot each time, so ${dotWords(answer)} comes next.`
            : `They go down by one dot each time, so ${dotWords(answer)} comes next.`,
        hint: "Count the dots in each one. How many more are there each time?",
        meta: {
          objective: "carries a growing or shrinking group of dots on one step",
          tags: ["sequence", concept("sequences", "dots", start, delta)],
        },
      };
    }

    const steps = forLevel(STEPS, level, STEPS[1] ?? []);
    const step = rng.pick(steps) ?? { delta: 1, min: 1, max: 20 };
    const span = SHOWN * Math.abs(step.delta);
    const start =
      step.delta > 0
        ? rng.int(step.min, step.max - span)
        : rng.int(step.min + span, step.max);

    const run = Array.from({ length: SHOWN }, (_, i) => start + i * step.delta);
    const answer = start + SHOWN * step.delta;
    const size = Math.abs(step.delta);

    return {
      level,
      prompt: {
        speech: "What comes next?",
        display: chain(run.map(numberSym)),
      },
      payload: board(
        numberSym(answer),
        pickWrong(answer, nearMisses(answer, step.delta), tiles - 1, rng).map(
          numberSym,
        ),
        rng,
      ),
      explanation:
        step.delta > 0
          ? `They go up by ${size} each time, so ${answer} comes next.`
          : `They go down by ${size} each time, so ${answer} comes next.`,
      hint:
        step.delta > 0
          ? "Look at how much bigger each one gets."
          : "Look at how much smaller each one gets.",
      meta: {
        objective: "carries a number sequence on one step",
        tags: ["sequence", concept("sequences", "number", start, step.delta)],
      },
    };
  },
});
