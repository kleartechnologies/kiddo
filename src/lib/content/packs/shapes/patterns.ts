import { TELLABLE_PAIRS } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ShapeSize } from "../../types";
import {
  ALL_SHAPES,
  BLANK,
  board,
  canonicalUnit,
  colourWord,
  concept,
  MUTUAL_TRIO,
  strip,
  shapeSym,
  type Sym,
} from "./shared";

/**
 * Patterns made of a property, not of a thing.
 *
 * Blue circle, pink circle, blue circle, pink circle, **?** — one shape the
 * whole way along, and a single property taking turns. Big, small, big, small.
 * That is the entire rule, and it is what keeps this activity out of Logic
 * Quest's territory.
 *
 * The split is worth stating plainly, because on paper the two look alike.
 * Logic's `patterns` is written in *alphabets*: a circle, then a triangle,
 * then a letter, then three dots — symbols that are different **things**, and
 * the reasoning is about the sequence rather than about the symbols. Nothing
 * in it can express "the same star, and now it is smaller", because a smaller
 * star is not a different symbol.
 *
 * This one can express nothing else. The object never changes; only what it
 * looks like does. A child answering it is reading a property off a picture,
 * which is what this whole pack is for — and a child answering Logic's is
 * reasoning about a sequence, which is what that one is for. Neither could be
 * written in the other's terms, which is the test of whether two activities
 * are really two.
 */

/** A shape of repeat, written in as many distinct values as it needs. */
interface PatternForm {
  id: string;
  distinct: number;
  build: (values: readonly number[]) => number[];
}

const AB_ONLY: readonly PatternForm[] = [
  { id: "xy", distinct: 2, build: ([x, y]) => [x, y] },
];

const FORMS: LevelTable<readonly PatternForm[]> = {
  1: AB_ONLY,
  2: [
    ...AB_ONLY,
    { id: "xxy", distinct: 2, build: ([x, y]) => [x, x, y] },
    { id: "xyy", distinct: 2, build: ([x, y]) => [x, y, y] },
  ],
  3: [
    { id: "xxy", distinct: 2, build: ([x, y]) => [x, x, y] },
    { id: "xyy", distinct: 2, build: ([x, y]) => [x, y, y] },
    { id: "xyz", distinct: 3, build: ([x, y, z]) => [x, y, z] },
  ],
};

const SIZES: readonly ShapeSize[] = ["small", "medium", "large"];

/** How a size is said in a sentence a child hears read out. */
const SIZE_WORDS: Record<ShapeSize, string> = {
  small: "small",
  medium: "middle-sized",
  large: "big",
};

/** The same repeat, joined at a different point. */
function rotate(unit: readonly number[], by: number): number[] {
  const at = by % unit.length;
  return [...unit.slice(at), ...unit.slice(0, at)];
}

/**
 * How many terms stand before the gap.
 *
 * The unit plus two, so the repeat has visibly happened rather than been
 * guessed at — and sometimes plus three, because a unit of two shown exactly
 * twice always wants its first term back, and a child who noticed could answer
 * every one of these by copying the leftmost tile. Rotating the unit moves the
 * answer around it; varying the run moves it again. Between them there is no
 * position worth learning. Logic's `patterns` says the same thing at greater
 * length, and for the same reason.
 */
function shownFor(unit: number, rng: Rng): number {
  return unit + 2 + (unit < 3 ? rng.int(0, 1) : 0);
}

export const patternsActivity = defineGeneratedActivity({
  id: "patterns",
  packId: "shapes",
  category: "shapes",
  activityType: "patterns",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const forms = forLevel(FORMS, level, AB_ONLY);
    const form = rng.pick(forms) ?? AB_ONLY[0];

    /* Colour or size — the two properties a shape can hold while staying the
       same shape. Sizes only stretch to three values, so a three-value form
       written in sizes uses all of them. */
    const inColour = rng.next() < 0.5;
    const shape = rng.pick(ALL_SHAPES) ?? "circle";

    /* Every colour in a pattern has to be tellable from every other one: a
       child who cannot see the difference cannot see the pattern. */
    const palette: readonly Accent[] =
      form.distinct >= 3 || level >= 2
        ? rng.shuffle(MUTUAL_TRIO)
        : rng.shuffle(rng.pick(TELLABLE_PAIRS) ?? TELLABLE_PAIRS[0]);
    const sizes = rng.shuffle(SIZES);

    const symbolAt = (index: number): Sym =>
      inColour
        ? shapeSym(shape, { accent: palette[index % palette.length] })
        : shapeSym(shape, { size: sizes[index % sizes.length] });

    const wordAt = (index: number): string =>
      inColour
        ? colourWord(palette[index % palette.length] ?? "tide")
        : SIZE_WORDS[sizes[index % sizes.length] ?? "large"];

    const written = form.build([0, 1, 2].slice(0, form.distinct));
    const unit = rotate(written, rng.int(0, written.length - 1));

    const shown = shownFor(unit.length, rng);
    const run = Array.from({ length: shown }, (_, index) => unit[index % unit.length]);
    const answer = unit[shown % unit.length];

    /* Every value the pattern uses is offered, so the child chooses between
       the things actually in front of them. */
    const offered = [...new Set(unit)];
    /* One value from outside the pattern as well, once the board is big
       enough for it: a two-tile board where both tiles are already in the row
       can be answered by elimination rather than by reading the pattern. */
    const spare = [0, 1, 2].find((value) => !offered.includes(value));
    const distractors = [
      ...offered.filter((value) => value !== answer),
      ...(level >= 2 && spare !== undefined ? [spare] : []),
    ].map((value) => symbolAt(value));

    return {
      level,
      prompt: {
        speech: "Which one comes next?",
        display: [...strip(run.map(symbolAt)), BLANK],
      },
      payload: board(symbolAt(answer), distractors, rng),
      explanation: `It goes ${unit.map(wordAt).join(", ")}, again and again.`,
      hint: inColour
        ? "Look at the colours. Which one keeps coming back?"
        : "Look at the sizes. Say them out loud as you point.",
      meta: {
        objective: "continues a pattern made of one changing property",
        tags: [
          "patterns",
          concept(
            "vpattern",
            inColour ? "colour" : "size",
            canonicalUnit(unit.map((value) => (inColour ? String(palette[value % palette.length]) : String(sizes[value % sizes.length])))),
          ),
        ],
      },
    };
  },
});
