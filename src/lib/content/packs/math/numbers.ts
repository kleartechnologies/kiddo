import { defineGeneratedActivity } from "../../activity";
import type { Rng } from "../../rng";
import {
  dots,
  forLevel,
  numberBoard,
  numberChoices,
  numeral,
  quantityChoices,
  range,
  type LevelTable,
} from "./shared";

/**
 * The three things that come before arithmetic: counting a group, knowing what
 * a numeral means, and telling two numbers apart.
 *
 * Counting and recognition are the same idea pointed in opposite directions —
 * dots to a numeral, and a numeral to dots — which is why they are two
 * activities and not one with a flag.
 */

const COUNT_MAX: LevelTable<number> = { 1: 5, 2: 10 };
const RECOGNISE_MAX: LevelTable<number> = { 1: 5, 2: 10 };
const COMPARE_MAX: LevelTable<number> = { 1: 5, 2: 10, 3: 20 };

export const countingActivity = defineGeneratedActivity({
  id: "counting",
  packId: "math",
  title: "Counting",
  category: "math",
  activityType: "counting",
  kind: "choice",
  ageRange: { min: 4, max: 6 },
  levels: [1, 2],
  generate: ({ level, rng }) => {
    const max = forLevel(COUNT_MAX, level, 5);
    const value = rng.int(1, max);

    return {
      level,
      prompt: {
        speech: "How many can you count?",
        display: [dots(value, "tide")],
      },
      payload: numberChoices(value, rng, { min: 1, max: max + 2, count: 3 }),
      explanation: `There are ${value}.`,
      meta: {
        objective: `counts a group of up to ${max}`,
        /* The quantity, not the board: counting five dots and counting five
           apples are one thing to be able to do, so `counting-objects` names
           its concept the same way and a round offers one of them. */
        tags: ["family:number", `concept:count:${value}`],
      },
    };
  },
});

export const numberRecognitionActivity = defineGeneratedActivity({
  id: "number-recognition",
  packId: "math",
  title: "Knowing numbers",
  category: "math",
  activityType: "number-recognition",
  kind: "choice",
  ageRange: { min: 4, max: 6 },
  levels: [1, 2],
  generate: ({ level, rng }) => {
    const max = forLevel(RECOGNISE_MAX, level, 5);
    const value = rng.int(1, max);

    return {
      level,
      /* The numeral is the question and the groups are the answers, which is
         the opposite way round from counting. Asking it as "find the number
         seven" with seven printed in the question would be a matching game. */
      prompt: {
        speech: `Which one shows ${value}?`,
        display: [numeral(value)],
      },
      payload: quantityChoices(value, rng, { min: 1, max, count: 3 }, "sprout"),
      explanation: `${value} means ${value} of them.`,
      meta: {
        objective: `matches a numeral up to ${max} to a quantity`,
        /* Read the other way round from counting — numeral first, groups as
           the answers — so it is its own concept and not `count:5` again. */
        tags: ["family:number", `concept:quantity:${value}`],
      },
    };
  },
});

/** Two far-apart numbers, so the first comparison a child meets is obvious. */
function twoWithGap(rng: Rng, max: number): number[] {
  const low = rng.int(1, max - 2);
  return [low, rng.int(low + 2, max)];
}

export const comparisonActivity = defineGeneratedActivity({
  id: "comparison",
  packId: "math",
  title: "Bigger or smaller",
  category: "math",
  activityType: "comparison",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const max = forLevel(COMPARE_MAX, level, 10);
    const values = level === 1 ? twoWithGap(rng, max) : rng.some(range(1, max), 3);
    const bigger = rng.next() < 0.5;
    const answer = bigger ? Math.max(...values) : Math.min(...values);
    const superlative = values.length > 2;

    return {
      level,
      /* No display: the tiles are the question. `challengeKey` knows that and
         de-duplicates on the board instead. */
      prompt: {
        speech: bigger
          ? superlative
            ? "Which number is the biggest?"
            : "Which number is bigger?"
          : superlative
            ? "Which number is the smallest?"
            : "Which number is smaller?",
      },
      payload: numberBoard(answer, rng.shuffle(values)),
      explanation: bigger
        ? `${answer} is the ${superlative ? "biggest" : "bigger"} one.`
        : `${answer} is the ${superlative ? "smallest" : "smaller"} one.`,
      meta: {
        objective: `compares ${values.length} numbers within ${max}`,
        /* The numbers being compared and which end was asked for. Shuffling
           the same three tiles is one comparison; asking for the smallest of
           them instead of the biggest is another. */
        tags: [
          "family:number",
          `concept:compare:${[...values].sort((a, b) => a - b).join("-")}:${bigger ? "biggest" : "smallest"}`,
        ],
      },
    };
  },
});
