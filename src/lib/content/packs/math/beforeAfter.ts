import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import { BLANK, forLevel, numberChoices, numeral, type LevelTable } from "./shared";

/**
 * The number before, the number after, and the one in between.
 *
 * `number-order` asks a child to *build* a run out of tiles; this asks them
 * one link of a run at a time. The two are the same knowledge from opposite
 * ends, and a child usually has this one first: they can say what comes after
 * six long before they can lay out 4, 5, 6, 7 from a heap.
 *
 * It matters more than it looks. Every piece of mental arithmetic a child
 * meets next — counting on to add, counting back to take away — is this fact
 * used twice, and a child who has to start at one and count up to find the
 * number after seven has no working memory left over for the sum.
 *
 * A `choice`, drawn by `ChoiceStage` with nothing new in it.
 *
 * ## The three questions
 *
 * | | asked | inside |
 * |-|-------|--------|
 * |1| what comes **after** | 1–10 |
 * |2| **after** and **before** | 1–20 |
 * |3| after, before, and what goes **between** two numbers | 1–20 |
 *
 * Counting on comes first because it is the direction a child already counts
 * in. Counting back is a genuinely separate skill and waits for level two.
 * *Between* waits for level three because it holds two facts at once — the
 * answer has to come after one number and before another — and it is drawn as
 * `4 _ 6`, which is the same gap `2 + _` uses, so nothing new appears on the
 * stage.
 *
 * No clock, no streak. A tile that was not the answer leaves the board exactly
 * as it was and the child may try again straight away.
 */

/** How far the numbers go. */
const CEILING: LevelTable<number> = { 1: 10, 2: 20, 3: 20 };

/** Three tiles while the numbers are small, four once they are not. */
const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/** Which questions a level may ask. Cumulative, like every pool here. */
type Ask = "after" | "before" | "between";

function asksAtLevel(level: Level): readonly Ask[] {
  if (level <= 1) return ["after"];
  if (level === 2) return ["after", "before"];
  return ["after", "before", "between"];
}

/**
 * The honest content counts.
 *
 * `NEIGHBOUR_FACTS` is how many pairs of touching numbers there are inside
 * twenty: nineteen. Asking "what comes after 6?" and "what comes before 7?"
 * are two ways of using **one** fact — that 6 and 7 touch — so they are
 * counted once, and the concept tag says `neighbour:6-7` either way round.
 *
 * `BETWEEN_FACTS` is counted separately because it is not the same fact used
 * again: holding both ends at once is its own thing to be able to do.
 */
export const NEIGHBOUR_FACTS = 19;
export const BETWEEN_FACTS = 18;

/** The question, in the words a grown-up would use out loud. */
function askedFor(ask: Ask, value: number, level: Level) {
  const ceiling = forLevel(CEILING, level, 20);

  if (ask === "after") {
    return {
      /* Never the ceiling itself: "what comes after 20?" has an answer this
         activity does not teach and cannot put on a tile. */
      answer: value + 1,
      speech: `What number comes after ${value}?`,
      display: [numeral(value), BLANK],
      explanation: `${value + 1} comes after ${value}.`,
      hint: `Start at ${value} and count on one more.`,
      concept: `concept:neighbour:${value}-${value + 1}`,
      objective: `knows the number after ${value}`,
      exclude: [value],
      max: ceiling,
    };
  }

  if (ask === "before") {
    return {
      answer: value - 1,
      speech: `What number comes before ${value}?`,
      display: [BLANK, numeral(value)],
      explanation: `${value - 1} comes before ${value}.`,
      hint: `Start at ${value} and count back one.`,
      concept: `concept:neighbour:${value - 1}-${value}`,
      objective: `knows the number before ${value}`,
      exclude: [value],
      max: ceiling,
    };
  }

  return {
    answer: value,
    speech: `What number goes between ${value - 1} and ${value + 1}?`,
    display: [numeral(value - 1), BLANK, numeral(value + 1)],
    explanation: `${value} goes between ${value - 1} and ${value + 1}.`,
    hint: `Count: ${value - 1}, then what, then ${value + 1}?`,
    concept: `concept:between:${value - 1}-${value + 1}`,
    objective: `knows the number between ${value - 1} and ${value + 1}`,
    /* Neither end may appear as a wrong answer: both are already on the
       stage, so a child rules them out by looking rather than by counting. */
    exclude: [value - 1, value + 1],
    max: ceiling,
  };
}

/** The number the question is asked about, kept inside what the level teaches. */
function subject(ask: Ask, level: Level, rng: Rng): number {
  const ceiling = forLevel(CEILING, level, 20);
  if (ask === "after") return rng.int(1, ceiling - 1);
  if (ask === "before") return rng.int(2, ceiling);
  return rng.int(2, ceiling - 1);
}

export const beforeAndAfterActivity = defineGeneratedActivity({
  id: "before-and-after",
  packId: "math",
  title: "Before and after",
  category: "math",
  activityType: "before-and-after",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const asks = asksAtLevel(level);
    const ask = rng.pick(asks) ?? "after";
    const value = subject(ask, level, rng);
    const asked = askedFor(ask, value, level);

    return {
      level,
      prompt: { speech: asked.speech, display: asked.display },
      payload: numberChoices(asked.answer, rng, {
        min: 1,
        max: asked.max,
        count: forLevel(TILES, level, 3),
        exclude: asked.exclude,
      }),
      explanation: asked.explanation,
      hint: asked.hint,
      meta: {
        objective: asked.objective,
        tags: ["family:number", asked.concept],
      },
    };
  },
});
