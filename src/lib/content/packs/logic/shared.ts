import { TELLABLE_PAIRS } from "@/lib/accents";
import type { CharacterId } from "@/lib/games/types";
import { spokenOf } from "../../challenges";
import type { Rng } from "../../rng";
import type {
  ChoicePayload,
  ContentItem,
  PromptPart,
  ShapeName,
} from "../../types";

/**
 * The pieces every Logic activity is built from.
 *
 * Math's `shared.ts` says "a number, a symbol, a blank, some tiles". English's
 * says "a letter, a word, a gap, some tiles". This one says "a symbol, a rule,
 * a blank, some tiles" — the same four ideas again, because a pack is a
 * vocabulary and never an engine. Nothing below is a new kind of thing.
 *
 * The one word this pack adds is **symbol**: a thing a rule can be written in.
 * A circle, three dots, the letter B and FOXY are all symbols, and a pattern
 * does not care which — it cares that two symbols are the same or different.
 * That is the whole of what makes shapes, counts, letters and friends
 * interchangeable alphabets rather than four separate activities.
 */

/* --------------------------------------------------------------- symbols */

export interface Sym {
  /** Identity. Two symbols are the same thing exactly when these match. */
  key: string;
  item: ContentItem;
}

export const SHAPES: readonly ShapeName[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "diamond",
];

/**
 * Colours a child can tell apart by name, and therefore the only ones a
 * question about colour may use.
 *
 * `sage` is missing on purpose, exactly as it is in the Discovery colours
 * activity: it and `sprout` are both green, and "which one is different?"
 * cannot be asked with two greens on the board.
 */
export const COLOURS = ["tide", "blossom", "honey", "apricot", "sprout"] as const;

/**
 * The pairs a question about colour may actually be asked with.
 *
 * `COLOURS` says which colours have names a child can use; this says which
 * two of them can be told apart by a child who does not see colour the way the
 * palette assumed. It is a much shorter list, and it is a fact about the
 * palette rather than about logic puzzles, so it lives in `lib/accents.ts` and
 * is re-exported here under the name this pack has always called it.
 */
export const COLOUR_PAIRS = TELLABLE_PAIRS;

export const FRIENDS: readonly CharacterId[] = [
  "kiddo",
  "foxy",
  "bibi",
  "pip",
  "wally",
];

/** Letters used as pattern symbols. Four, and all unmistakable. */
export const PATTERN_LETTERS = ["A", "B", "C", "D"] as const;

export function shapeSym(shape: ShapeName): Sym {
  return { key: shape, item: { kind: "shape", shape } };
}

export function dotsSym(value: number): Sym {
  return { key: `dots-${value}`, item: { kind: "count", value } };
}

/** A numeral on a tile. `dotsSym` is the same number, drawn to be counted. */
export function numberSym(value: number): Sym {
  return { key: `number-${value}`, item: { kind: "number", value } };
}

/** "1 dot", "4 dots". The plural is decided once, for the whole pack. */
export function dotWords(value: number): string {
  return spokenOf(dotsSym(value).item);
}

export function letterSym(letter: string): Sym {
  return { key: `letter-${letter}`, item: { kind: "text", text: letter } };
}

export function friendSym(id: CharacterId): Sym {
  return { key: `friend-${id}`, item: { kind: "character", characterId: id } };
}

/** A word on a tile. Upper case, the way a child first meets one. */
export function wordSym(word: string): Sym {
  return { key: `word-${word}`, item: { kind: "text", text: word } };
}

/** The alphabets a pattern may be written in. One per call, never mixed. */
export const ALPHABETS = {
  shapes: SHAPES.map(shapeSym),
  dots: [1, 2, 3, 4, 5].map(dotsSym),
  letters: PATTERN_LETTERS.map(letterSym),
} as const;

export type AlphabetName = keyof typeof ALPHABETS;

/* ----------------------------------------------------------------- parts */

export function part(item: ContentItem): PromptPart {
  return { kind: "item", item };
}

/** The gap at the end of a pattern. The same one `C _ T` uses. */
export const BLANK: PromptPart = { kind: "blank" };

/** The step in `2 → 4 → 6 → ?`. What makes a sequence read as a journey. */
export const ARROW: PromptPart = { kind: "symbol", symbol: "arrow" };

/** A row of symbols with a gap at the end: `● ▲ ● ▲ ?`. */
export function row(symbols: readonly Sym[]): PromptPart[] {
  return [...symbols.map((symbol) => part(symbol.item)), BLANK];
}

/** The same row with arrows between: `1 → 2 → 3 → ?`. */
export function chain(symbols: readonly Sym[]): PromptPart[] {
  return [
    ...symbols.flatMap((symbol) => [part(symbol.item), ARROW]),
    BLANK,
  ];
}

/* --------------------------------------------------------------- choices */

/**
 * The answer and its distractors, shuffled onto tiles.
 *
 * Generated content shuffles its own board rather than leaning on the deal, so
 * a challenge is right the moment it is made — the same reason English's
 * `board` does. Ids come from the symbol, so a generator needs no counter and
 * two tiles can never collide.
 */
export function board(
  answer: Sym,
  distractors: readonly Sym[],
  rng: Rng,
): ChoicePayload {
  const symbols = rng.shuffle([answer, ...distractors]);
  return {
    kind: "choice",
    options: symbols.map((symbol) => ({ id: symbol.key, item: symbol.item })),
    answerId: answer.key,
  };
}

/**
 * Wrong answers, taken from the same alphabet as the right one.
 *
 * A board of four circles and a 7 is not a harder question, it is a sillier
 * one: every distractor here is a thing the child could plausibly have thought
 * came next.
 */
export function otherSymbols(
  pool: readonly Sym[],
  taken: readonly string[],
  count: number,
  rng: Rng,
): Sym[] {
  const used = new Set(taken);
  return rng.shuffle(pool.filter((symbol) => !used.has(symbol.key))).slice(0, count);
}

/* -------------------------------------------------------------- concepts */

/**
 * The name of the idea behind a challenge, as a `meta` tag.
 *
 * `conceptKey` in `challenges.ts` reads these back, and the pack's test counts
 * how many distinct ones the four activities between them can produce. The
 * rule this pack follows, everywhere:
 *
 * > A concept is the rule plus the things the rule is written in. It is *not*
 * > the board: two challenges that differ only by a rearrangement — a shuffled
 * > row of tiles, a pattern started one step later, an interchangeable
 * > distractor — are one concept, counted once.
 *
 * So `A B A B ?` and `B A B A ?` are one concept, because the second is the
 * first started a step later. `● ▲ ● ▲ ?` is a different one, because circles
 * and triangles are not squares and hearts rearranged.
 */
export function concept(...parts: readonly (string | number)[]): string {
  return `concept:${parts.join(":")}`;
}

/**
 * A repeating unit, named by the one of its rotations that sorts first.
 *
 * This is the whole of why rotations collapse: `AB` and `BA` describe the same
 * endless row, so they get the same name. `AAB`, `ABA` and `BAA` likewise.
 * Two units get different names exactly when they are genuinely different
 * repeats rather than the same repeat joined at a different point.
 */
export function canonicalUnit(keys: readonly string[]): string {
  const rotations = keys.map((_, index) =>
    [...keys.slice(index), ...keys.slice(0, index)].join("-"),
  );
  return rotations.sort()[0] ?? "";
}
