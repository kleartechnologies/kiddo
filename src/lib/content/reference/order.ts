import { defineGeneratedActivity, type ChallengeSpec } from "../activity";
import type { Level } from "../difficulty";
import type { Rng } from "../rng";
import type { NumberItem, OrderItem } from "../types";

/**
 * Counting on — the reference **order** activity.
 *
 * The twin of `reference/connect.ts`, and it exists for the same single
 * purpose: to prove that a board can be dealt, validated, arranged, answered
 * and marked without a line of subject knowledge anywhere near the engine.
 * `OrderStage` renders this and could not tell you it was about numbers.
 *
 * `number-sequence` is Math's `ActivityType`, borrowed rather than invented,
 * which is the two-axis architecture in one line: what is being learned and
 * how it is answered are separate. The real Order content — the letters of a
 * word, the days of the week, four pictures of a story — is more tables like
 * the one below, in the packs that own those subjects. None of it comes back
 * through here, and none of it needs a new engine.
 */

/**
 * How many tiles a board asks for, by level.
 *
 * Three is the smallest run that is an ordering at all — two tiles is a
 * question with one wrong answer, which is a `choice`. Five is a ceiling
 * rather than a step: five tiles is as wide as a 360px phone holds with each
 * one still comfortably bigger than a fingertip, and `resolveLevel` has
 * already snapped anything above level 3 down to 3 before it arrives here.
 */
function itemsAtLevel(level: Level): number {
  if (level <= 1) return 3;
  if (level === 2) return 4;
  return 5;
}

/** Ids come from the value, so an order reads as `n3,n4,n5` in a failing test. */
const idOf = (value: number) => `n${value}`;

const numberItem = (value: number): NumberItem => ({ kind: "number", value });

/**
 * The tray, shuffled — but never handed over already solved.
 *
 * A run that arrives in ascending order is a board the child finishes by
 * going left to right without reading it, so the one arrangement that is the
 * answer is the one arrangement the tray may not be. Rotating by one is
 * enough and, unlike re-rolling, it always terminates.
 */
function trayOrder(values: readonly number[], rng: Rng): number[] {
  const shuffled = rng.shuffle(values);
  const solved = shuffled.every((value, index) => value === values[index]);
  return solved ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}

export const orderReferenceActivity = defineGeneratedActivity({
  id: "count-order",
  packId: "discovery",
  title: "Counting on",
  category: "discovery",
  activityType: "number-sequence",
  kind: "order",
  ageRange: { min: 4, max: 6 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const count = itemsAtLevel(level);

    /* A run of consecutive numbers inside 1–10, so the answer is one order
       and not several: with a gap in it, "which is smaller" is still a fair
       question but "what comes next" quietly stops being one. */
    const start = rng.int(1, 10 - count + 1);
    const values = Array.from({ length: count }, (_, step) => start + step);

    const items: OrderItem[] = trayOrder(values, rng).map((value) => ({
      id: idOf(value),
      item: numberItem(value),
    }));

    return {
      level,
      prompt: { speech: "Can you put these in order? Start with the smallest." },
      payload: {
        kind: "order",
        items,
        answerOrder: values.map(idOf),
      },
      explanation: "You put them all in order!",
      hint: "Look for the smallest one that is still waiting.",
      meta: {
        objective: "arranges numbers from smallest to largest",
        tags: ["reference", "order"],
      },
    };
  },
});
