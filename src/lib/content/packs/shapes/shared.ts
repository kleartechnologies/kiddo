import { ACCENT_WORDS, tellableFrom } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import { labelOf } from "../../challenges";
import type { Rng } from "../../rng";
import type {
  ChoicePayload,
  ContentItem,
  PromptPart,
  ShapeItem,
  ShapeName,
  ShapeSize,
  SpatialRelation,
} from "../../types";

/**
 * The pieces every Shapes & Colours activity is built from.
 *
 * Math's `shared.ts` says "a number, a symbol, a blank, some tiles". Logic's
 * says "a symbol, a rule, a blank, some tiles". This one says "a shape, a
 * property, a place, some tiles" — the same handful of ideas again, because a
 * pack is a vocabulary and never an engine. There is no new interaction here:
 * every challenge this pack can produce is a `choice`, drawn by the same
 * `ChoiceStage` that draws a sum.
 *
 * The word this pack adds is **property**. A shape has an outline, a colour, a
 * size, a number of corners and a place relative to something else, and every
 * activity here is one question about one of those. That is what keeps eleven
 * activities from being eleven engines: they differ in which property they ask
 * about, not in how they are answered.
 */

/* ---------------------------------------------------------------- symbols */

/** A thing on a tile, with the identity that makes two tiles the same thing. */
export interface Sym {
  key: string;
  item: ContentItem;
}

/**
 * The five shapes a four year old already knows.
 *
 * No two of them can be confused at tile size, which is what makes them the
 * level-one alphabet: at level one the question is *can you find the star*,
 * and nothing else on the board should be able to get in the way of it.
 */
export const SIMPLE_SHAPES: readonly ShapeName[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
];

/** Every shape this pack draws. The last four are the ones worth confusing. */
export const ALL_SHAPES: readonly ShapeName[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "diamond",
  "rectangle",
  "oval",
  "hexagon",
];

/**
 * Shapes that can hold another shape inside them.
 *
 * `inside` is drawn by hollowing the anchor out and putting the subject in the
 * middle of it, so the anchor has to actually *have* a middle: a star or a
 * heart has an outline that wanders in and out, and a shape sitting in the
 * centre of one reads as sitting on top of it. A box, a ring or a window does
 * not have that problem.
 */
export const CONTAINER_SHAPES: readonly ShapeName[] = [
  "circle",
  "square",
  "rectangle",
  "oval",
];

/**
 * Which shapes are worth mistaking for which.
 *
 * The whole difficulty curve of shape recognition is in this table. A board
 * with none of these pairs on it asks "do you know what a triangle is"; a
 * board built *around* one asks "can you tell a square from a rectangle",
 * which is a different and later question. Symmetric by construction — every
 * pair is written once and read both ways by `lookalikesOf`.
 */
const LOOKALIKE_PAIRS: readonly (readonly [ShapeName, ShapeName])[] = [
  ["circle", "oval"],
  ["square", "rectangle"],
  ["square", "diamond"],
  ["diamond", "triangle"],
  ["circle", "hexagon"],
  ["hexagon", "diamond"],
  ["oval", "rectangle"],
];

/** Everything this shape could be mistaken for. */
export function lookalikesOf(shape: ShapeName): readonly ShapeName[] {
  return LOOKALIKE_PAIRS.flatMap(([left, right]) =>
    left === shape ? [right] : right === shape ? [left] : [],
  );
}

/** Could a child tapping quickly confuse these two? */
export function areLookalikes(a: ShapeName, b: ShapeName): boolean {
  return lookalikesOf(a).includes(b);
}

/**
 * What is true about each shape, in the terms a child is taught them in.
 *
 * `corners` is the number a child would count by putting a finger on each
 * point. A star has ten of them and nobody counts those, so the shapes whose
 * corners are not worth counting say `countable: false` and no question about
 * counting corners is ever built from them.
 */
export interface ShapeFacts {
  corners: number;
  sides: number;
  round: boolean;
  countable: boolean;
}

export const SHAPE_FACTS: Record<ShapeName, ShapeFacts> = {
  circle: { corners: 0, sides: 0, round: true, countable: false },
  oval: { corners: 0, sides: 0, round: true, countable: false },
  triangle: { corners: 3, sides: 3, round: false, countable: true },
  square: { corners: 4, sides: 4, round: false, countable: true },
  rectangle: { corners: 4, sides: 4, round: false, countable: true },
  diamond: { corners: 4, sides: 4, round: false, countable: true },
  hexagon: { corners: 6, sides: 6, round: false, countable: true },
  star: { corners: 10, sides: 10, round: false, countable: false },
  /* One corner — the point a finger lands on at the bottom — and *no*
     straight sides: the heart KIDDO draws is made entirely of curves, so a
     question about straight sides must never hold it up as the answer. Not
     `round` either; round is "no corners anywhere", and it has one. */
  heart: { corners: 1, sides: 0, round: false, countable: false },
};

/**
 * Colours with names a child can use.
 *
 * `sage` is missing for the same reason it is missing from Logic and from the
 * Discovery colours activity: it and `sprout` are both GREEN, and no question
 * about colour can be asked with two greens on the board.
 */
export const COLOURS: readonly Accent[] = [
  "tide",
  "blossom",
  "honey",
  "apricot",
  "sprout",
];

/**
 * Colours that can safely stand together when *every* tile must be tellable
 * from every other one.
 *
 * `tellableFrom` in `lib/accents.ts` answers "can this colour stand beside
 * that one"; a board where all the tiles are the same shape needs the stronger
 * thing — no two tiles anywhere on it that look alike, or the board appears to
 * contain the same tile twice. Blue, pink and green is the only trio in the
 * palette that manages it, which is why it is written out rather than searched
 * for.
 */
export const MUTUAL_TRIO: readonly Accent[] = ["tide", "blossom", "sprout"];

/** "blue", "yellow" — the word, not the brand name. */
export function colourWord(accent: Accent): string {
  return ACCENT_WORDS[accent].toLowerCase();
}

/**
 * Colours a board may offer against this one.
 *
 * Every distractor on a board whose answer is a colour has to be a colour the
 * child can see is not the answer. Blue has four such partners and yellow has
 * exactly one, so a generator asks rather than assumes — and a board that
 * cannot be built fairly is built smaller instead.
 */
export function safeAgainst(
  accent: Accent,
  count: number,
  rng: Rng,
): Accent[] {
  return rng.some(tellableFrom(accent), count);
}

/* ------------------------------------------------------------------ tiles */

export interface ShapeOptions {
  accent?: Accent;
  size?: ShapeSize;
  /** Overrides the words. Only for tiles whose plain name reads badly. */
  label?: string;
}

/** A shape on a tile. Its key is everything about it that can be seen. */
export function shapeSym(shape: ShapeName, options: ShapeOptions = {}): Sym {
  const item: ShapeItem = {
    kind: "shape",
    shape,
    ...(options.accent ? { accent: options.accent } : {}),
    ...(options.size ? { size: options.size } : {}),
    ...(options.label ? { label: options.label } : {}),
  };
  return {
    key: ["shape", shape, options.accent ?? "house", options.size ?? "full"].join("-"),
    item,
  };
}

/** A numeral on a tile. What every counting question is answered with. */
export function numberSym(value: number): Sym {
  return { key: `number-${value}`, item: { kind: "number", value } };
}

/**
 * Two shapes and the word between them.
 *
 * The label is written here rather than derived, because "a circle beside the
 * circle" is not how anybody describes two circles. A screen reader gets "two
 * blue circles" and "a blue circle and a big blue circle", which is what a
 * child looking at the tile sees.
 */
export function sceneSym(
  subject: Sym & { item: ShapeItem },
  anchor: Sym & { item: ShapeItem },
  relation: SpatialRelation,
  label?: string,
): Sym {
  return {
    key: `scene-${relation}-${subject.key}-${anchor.key}`,
    item: {
      kind: "scene",
      subject: subject.item,
      anchor: anchor.item,
      relation,
      ...(label ? { label } : {}),
    },
  };
}

/** A shape tile, narrowed so a scene can be built from it. */
export function shapeItemOf(sym: Sym): Sym & { item: ShapeItem } {
  return sym as Sym & { item: ShapeItem };
}

/** "two blue circles", "a red star and a blue circle". */
export function pairWords(a: ShapeItem, b: ShapeItem): string {
  const first = labelOf(a);
  const second = labelOf(b);
  return first === second
    ? `two ${first}s`
    : `${aOrAn(first)} and ${aOrAn(second)}`;
}

/* ------------------------------------------------------------------ parts */

export function part(item: ContentItem): PromptPart {
  return { kind: "item", item };
}

/** The gap at the end of a pattern. The same one `C _ T` uses. */
export const BLANK: PromptPart = { kind: "blank" };

/** A row of things to look at: a group to count, a pattern to continue. */
export function strip(symbols: readonly Sym[]): PromptPart[] {
  return symbols.map((symbol) => part(symbol.item));
}

/** The same row with a gap where the answer goes. */
export function gapAt(symbols: readonly Sym[], index: number): PromptPart[] {
  return symbols.map((symbol, at) => (at === index ? BLANK : part(symbol.item)));
}

/* ---------------------------------------------------------------- choices */

/**
 * The answer and its distractors, shuffled onto tiles.
 *
 * The same function Logic's `shared.ts` has, for the same reason: generated
 * content shuffles its own board so a challenge is right the moment it is
 * made, and ids come from the tile so two tiles can never collide.
 */
export function board(
  answer: Sym,
  distractors: readonly Sym[],
  rng: Rng,
): ChoicePayload {
  const unique = distractors.filter(
    (symbol, index, all) =>
      symbol.key !== answer.key &&
      all.findIndex((other) => other.key === symbol.key) === index,
  );
  const symbols = rng.shuffle([answer, ...unique]);
  return {
    kind: "choice",
    options: symbols.map((symbol) => ({ id: symbol.key, item: symbol.item })),
    answerId: answer.key,
  };
}

/* --------------------------------------------------------------- concepts */

/**
 * The name of the idea behind a challenge, as a `meta` tag.
 *
 * `conceptKey` reads these back and the pack's test counts how many distinct
 * ones the eleven activities can produce between them. The rule, everywhere:
 *
 * > A concept is the question plus whatever the child has to know to answer
 * > it. It is *not* the board: two challenges that differ only by which tile
 * > the answer landed on, or by which interchangeable distractor stood beside
 * > it, are one concept and are counted once.
 *
 * Where the *things* are the learning, they are part of the name: finding a
 * hexagon and finding a heart are two things to know, so they are two
 * concepts. Where the **structure** is the learning they are not: a mirrored
 * row of circles and stars teaches exactly what a mirrored row of hearts and
 * squares teaches, so both are the one symmetry concept. That is a deliberate
 * undercount — it would be easy and dishonest to multiply this pack's total by
 * naming every symbol in every row.
 */
export function concept(...parts: readonly (string | number)[]): string {
  return `concept:${parts.join(":")}`;
}

/** A set of things, named the same way however it was shuffled. */
export function canonical(values: readonly (string | number)[]): string {
  return [...values].map(String).sort().join("+");
}

/**
 * A repeating unit, named by the rotation of it that sorts first.
 *
 * The same idea as Logic's `canonicalUnit`, and here for the same reason: a
 * pattern started one step later is the same pattern, so `blue pink blue pink`
 * and `pink blue pink blue` are one concept rather than two.
 */
export function canonicalUnit(keys: readonly string[]): string {
  const rotations = keys.map((_, index) =>
    [...keys.slice(index), ...keys.slice(0, index)].join("-"),
  );
  return rotations.sort()[0] ?? "";
}

/* ------------------------------------------------------------------ words */

/** "a circle", "an oval". Said wrong, a question stops sounding like KIDDO. */
export function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

/** "a circle" -> "A circle". Explanations are sentences, not fragments. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * What each shape is, in one sentence a child can act on.
 *
 * These are hints, and a hint in KIDDO is a nudge back to the looking — never
 * "it's the second one". Told that a hexagon has six straight sides, a child
 * still has to go and count them.
 */
export const SHAPE_HINTS: Record<ShapeName, string> = {
  circle: "A circle is round the whole way around.",
  square: "A square has four sides, all the same length.",
  triangle: "A triangle has three corners.",
  star: "A star has points sticking out all around it.",
  heart: "A heart has two round bumps at the top.",
  diamond: "A diamond has a point at the top and one at the bottom.",
  rectangle: "A rectangle has two long sides and two short ones.",
  oval: "An oval is round, like a circle someone sat on.",
  hexagon: "A hexagon has six straight sides.",
};

/** Something the world is this colour, for a child who is stuck. */
export const COLOUR_HINTS: Record<Accent, string> = {
  tide: "Blue is the colour of the sky.",
  blossom: "Pink is the colour of a flower.",
  honey: "Yellow is the colour of the sun.",
  apricot: "Orange is the colour of an orange.",
  sprout: "Green is the colour of grass.",
  sage: "Green is the colour of grass.",
};
