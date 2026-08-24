import type { Accent } from "@/lib/games/types";
import type { Rng } from "../../rng";
import type { ChoicePayload, ContentItem, PromptPart, PromptSymbol } from "../../types";

/**
 * The pieces every Math activity is built from.
 *
 * Eight activities that all say "a number, a symbol, a blank, some tiles"
 * would otherwise be eight copies of the same twenty lines, drifting apart at
 * the third one. Nothing here is Math-specific in its shape — it is specific
 * in its vocabulary, which is what a pack is for.
 */

/* Level tables moved to `difficulty.ts` when English wanted them too, and are
   re-exported here so the Math activities keep importing them from one place. */
export { forLevel, type LevelTable } from "../../difficulty";

/** `1..max`, inclusive. Generators pick distinct numbers out of it. */
export function range(min: number, max: number): number[] {
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}

/* ------------------------------------------------------------------ parts */

/** Option ids are derived from the value, so a generator needs no counter. */
export function numberId(value: number): string {
  return `n${value}`;
}

export function numeral(value: number): PromptPart {
  return { kind: "item", item: { kind: "number", value } };
}

/** `value` pips of one hue: the same question a five-year-old can count. */
export function dots(value: number, accent: Accent): PromptPart {
  return { kind: "item", item: { kind: "count", value, accent } };
}

export function glyph(symbol: PromptSymbol): PromptPart {
  return { kind: "symbol", symbol };
}

export const BLANK: PromptPart = { kind: "blank" };

/* ---------------------------------------------------------------- choices */

export interface ChoiceRange {
  min: number;
  max: number;
  /** Tiles in total, the right answer included. */
  count: number;
  /**
   * Numbers that must not appear as a wrong answer. A sequence already shows
   * three of its terms; offering one of them back is a tile the child rules
   * out by looking rather than by thinking.
   */
  exclude?: readonly number[];
}

/**
 * Near misses, never wild ones.
 *
 * "5, 42, 1000" is not a question, it is a shape-spotting exercise: the child
 * gets it right without doing any adding. Distractors are drawn from one, two
 * and three either side of the answer, so every tile on the board is a number
 * the child could plausibly have landed on.
 */
const NEAR = [1, -1, 2, -2, 3, -3] as const;

function nearValues(
  answer: number,
  rng: Rng,
  { min, max, count, exclude = [] }: ChoiceRange,
): number[] {
  const allowed = (value: number) =>
    value >= min && value <= max && value !== answer && !exclude.includes(value);

  const wanted = Math.max(0, count - 1);
  const picked = rng.some(NEAR.map((offset) => answer + offset).filter(allowed), wanted);

  /* A tight range can run out of near misses. Widen outwards rather than
     repeat a tile or invent a silly number. */
  for (let step = 4; picked.length < wanted && step <= 9; step++) {
    for (const value of [answer + step, answer - step]) {
      if (allowed(value) && !picked.includes(value)) picked.push(value);
    }
  }

  return picked.slice(0, wanted);
}

/** Numerals on the tiles: the answer plus plausible neighbours, shuffled. */
export function numberChoices(answer: number, rng: Rng, choiceRange: ChoiceRange): ChoicePayload {
  return choicePayload(answer, nearValues(answer, rng, choiceRange), rng, (value) => ({
    kind: "number",
    value,
  }));
}

/** The same board drawn as quantities: "which one shows four?" */
export function quantityChoices(
  answer: number,
  rng: Rng,
  choiceRange: ChoiceRange,
  accent: Accent,
): ChoicePayload {
  return choicePayload(answer, nearValues(answer, rng, choiceRange), rng, (value) => ({
    kind: "count",
    value,
    accent,
  }));
}

/** Tiles built from a fixed set of numbers, in the order they were given. */
export function numberBoard(answer: number, values: readonly number[]): ChoicePayload {
  return {
    kind: "choice",
    options: values.map((value) => ({
      id: numberId(value),
      item: { kind: "number", value },
    })),
    answerId: numberId(answer),
  };
}

function choicePayload(
  answer: number,
  distractors: readonly number[],
  rng: Rng,
  toItem: (value: number) => ContentItem,
): ChoicePayload {
  const values = rng.shuffle([answer, ...distractors]);
  return {
    kind: "choice",
    options: values.map((value) => ({ id: numberId(value), item: toItem(value) })),
    answerId: numberId(answer),
  };
}
