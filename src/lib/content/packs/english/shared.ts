import { illustratedAtLevel, type ArtId } from "../../art";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import { wordPicture } from "../../vocabulary";
import type {
  ChoicePayload,
  ContentItem,
  PromptPart,
  TextItem,
} from "../../types";

/**
 * The pieces every English activity is built from.
 *
 * The Math pack's `shared.ts` says "a number, a symbol, a blank, some tiles".
 * This one says "a letter, a word, a gap, some tiles" — the same four ideas in
 * a different vocabulary, which is exactly what a pack is: nothing here is a
 * new kind of thing, and nothing here is a new engine.
 *
 * Everything a child is shown is upper case unless the question is *about*
 * case, because upper case is the way a child first meets a letter.
 */

export const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
] as const;

export const VOWELS = ["A", "E", "I", "O", "U"] as const;

/* ------------------------------------------------------------------- ids */

/**
 * Ids are derived from what is on the tile, so a generator needs no counter —
 * and case is part of the id, so `A` and `a` can never collide.
 */
export function letterId(letter: string): string {
  return `letter-${letter}`;
}

export function wordId(word: string): string {
  return `word-${word.toLowerCase()}`;
}

/* ----------------------------------------------------------------- items */

/**
 * A letter, and what it is called out loud.
 *
 * The `label` is never printed — `ChoiceStage` knows a word is its own caption
 * — it is what a screen reader says. Without it "A" and "a" are the same
 * announcement, and a whole activity about case becomes unanswerable.
 */
export function bigLetter(letter: string, art?: ArtId): TextItem {
  const upper = letter.toUpperCase();
  return { kind: "text", text: upper, label: `big ${upper}`, art };
}

export function littleLetter(letter: string): TextItem {
  const lower = letter.toLowerCase();
  return { kind: "text", text: lower, label: `little ${lower}` };
}

/** A letter being named rather than compared: "Choose letter M". */
export function namedLetter(letter: string): TextItem {
  const upper = letter.toUpperCase();
  return { kind: "text", text: upper, label: `letter ${upper}` };
}

/**
 * A whole word on a tile or across the stage. Reads as itself.
 *
 * `art` hangs a picture above the word where the activity has asked for one.
 * The word stays the item and stays the bigger of the two — see `anchorSize` in
 * `ContentItemView` — because in this pack the word is nearly always the thing
 * being learned, and a picture that outweighed it would turn reading into
 * looking. Which activities ask, and at which level they stop, is each
 * activity's own decision; `illustratedAtLevel` in `art.ts` is when.
 */
export function wordItem(word: string, art?: ArtId): TextItem {
  return { kind: "text", text: word.toUpperCase(), art };
}

/* ----------------------------------------------------------------- parts */

export function part(item: ContentItem): PromptPart {
  return { kind: "item", item };
}

/** The gap in `C _ T`. Drawn by `PromptDisplay`, same as the one in `2 + _`. */
export const BLANK: PromptPart = { kind: "blank" };

/**
 * A word with one letter taken out: `C _ T`.
 *
 * The letters left standing are plain — no `label` — because the line is
 * transcribed as a sentence for a screen reader and "letter C, what?, letter
 * T" is a worse reading of it than "C what? T".
 */
export function wordWithGap(word: string, at: number): PromptPart[] {
  return [...word.toUpperCase()].map((letter, index) =>
    index === at ? BLANK : part({ kind: "text", text: letter }),
  );
}

/* --------------------------------------------------------------- choices */

/**
 * Wrong answers a child could plausibly have chosen.
 *
 * `preferred` is the authored list — the letters that really do look or sound
 * like the answer — and it is used up first. `pool` only tops up a board the
 * authored list could not fill, which keeps "A, Z, Q" from ever happening by
 * accident.
 */
export function pickDistractors(
  answer: string,
  count: number,
  rng: Rng,
  preferred: readonly string[],
  pool: readonly string[] = [],
): string[] {
  const picked: string[] = [];
  const taken = new Set([answer]);

  for (const source of [preferred, pool]) {
    for (const value of rng.shuffle(source)) {
      if (picked.length >= count) break;
      if (taken.has(value)) continue;
      taken.add(value);
      picked.push(value);
    }
  }

  return picked;
}

/**
 * The answer and its distractors, shuffled onto tiles.
 *
 * Generated content shuffles its own board rather than leaning on the deal, so
 * that a challenge is right the moment it is made — a test, a screenshot and a
 * server render all see the same board the child will.
 */
export function board(
  answer: string,
  distractors: readonly string[],
  rng: Rng,
  toItem: (value: string) => ContentItem,
  idOf: (value: string) => string = letterId,
): ChoicePayload {
  const values = rng.shuffle([answer, ...distractors]);
  return {
    kind: "choice",
    options: values.map((value) => ({ id: idOf(value), item: toItem(value) })),
    answerId: idOf(answer),
  };
}

/* --------------------------------------------------------------- anchors */

/**
 * The picture over a word question — the sun above `S _ N`.
 *
 * Every activity that shows a child a word and asks about its letters uses
 * this, so DOG is the same dog in spelling, beginning sounds and ending
 * sounds. The picture comes from the one vocabulary in
 * `lib/content/vocabulary.ts`; a word it does not know gets no anchor, which
 * is exactly what every word got before anchors existed.
 *
 * The anchor itself is context and appears at every level — the word is
 * already spoken aloud, so it never leaks an answer — but the *drawing*
 * inside it follows the same promotion ladder as every other picture:
 * a KIDDO illustration at the entry level, the emoji above that.
 */
export function wordAnchor(word: string, level: Level): ContentItem | undefined {
  const picture = wordPicture(word);
  if (!picture) return undefined;
  return {
    kind: "picture",
    glyph: picture.glyph,
    label: word.toLowerCase(),
    ...(illustratedAtLevel(level) && picture.art ? { art: picture.art } : {}),
  };
}
