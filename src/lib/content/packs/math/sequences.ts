import { defineGeneratedActivity } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import { BLANK, numberChoices, numeral } from "./shared";

/**
 * Counting on, and counting on with a hole in it.
 *
 * `1 2 3 _` and `1 _ 3` are the same underlying run of numbers asked from two
 * directions, so both are built from one description of the run.
 */

interface Run {
  /** The whole run, answer included, in the order it is shown. */
  terms: number[];
  step: number;
  down: boolean;
}

/**
 * A run of `length` numbers stepping evenly, chosen so every term — including
 * the one that is missing — lands inside 1 to `max`.
 */
function makeRun(rng: Rng, level: Level, length: number): Run {
  const hard = level >= 3;
  const max = hard ? 20 : 10;
  const step = hard && rng.next() < 0.5 ? 2 : 1;
  const down = hard && rng.next() < 0.5;
  const span = step * (length - 1);
  const start = down ? rng.int(1 + span, max) : rng.int(1, max - span);
  const delta = down ? -step : step;

  return {
    terms: Array.from({ length }, (_, i) => start + delta * i),
    step,
    down,
  };
}

function howTheyGo(run: Run): string {
  const direction = run.down ? "down" : "up";
  return run.step === 1
    ? `They go ${direction} one at a time.`
    : `They go ${direction} in twos.`;
}

export const numberSequenceActivity = defineGeneratedActivity({
  id: "number-sequence",
  packId: "math",
  category: "math",
  activityType: "number-sequence",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  levels: [2, 3],
  generate: ({ level, rng }) => {
    const run = makeRun(rng, level, 4);
    const shown = run.terms.slice(0, 3);
    const answer = run.terms[3];

    return {
      level,
      prompt: {
        speech: "What comes next?",
        display: [...shown.map(numeral), BLANK],
      },
      /* Never offer a number already standing in the row. */
      payload: numberChoices(answer, rng, { min: 1, max: 24, count: 3, exclude: shown }),
      explanation: `${answer} comes next. ${howTheyGo(run)}`,
      meta: {
        objective: `continues a sequence stepping by ${run.step}`,
        /* The run itself, so the same three numbers asked again — however the
           wrong tiles fall — is one thing to work out and not twenty. */
        tags: ["family:number", `concept:next:${run.terms.join("-")}`],
      },
    };
  },
});

export const missingNumberActivity = defineGeneratedActivity({
  id: "missing-number",
  packId: "math",
  category: "math",
  activityType: "missing-number",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  levels: [2, 3],
  generate: ({ level, rng }) => {
    const length = level >= 3 ? 4 : 3;
    const run = makeRun(rng, level, length);
    /* Always an inner term. A hole on the end is "what comes next?", which is
       the activity above, and two activities asking the same question in one
       round is the thing a child notices first. */
    const gap = length === 3 ? 1 : rng.int(1, 2);
    const answer = run.terms[gap];

    return {
      level,
      prompt: {
        speech: "Which number is missing?",
        display: run.terms.map((value, index) =>
          index === gap ? BLANK : numeral(value),
        ),
      },
      payload: numberChoices(answer, rng, {
        min: 1,
        max: 24,
        count: 3,
        exclude: run.terms,
      }),
      explanation: `${answer} goes in the gap. ${howTheyGo(run)}`,
      meta: {
        objective: `finds a missing term in a sequence stepping by ${run.step}`,
        /* The run and where the hole is: 2, _, 6 and 2, 4, _ are the same
           three numbers and two different questions. */
        tags: ["family:number", `concept:missing:${run.terms.join("-")}@${gap}`],
      },
    };
  },
});
