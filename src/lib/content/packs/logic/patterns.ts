import { defineGeneratedActivity } from "../../activity";
import { spokenOf } from "../../challenges";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import {
  ALPHABETS,
  board,
  canonicalUnit,
  concept,
  otherSymbols,
  row,
  type AlphabetName,
  type Sym,
} from "./shared";

/**
 * Patterns — a unit that repeats, and the gap where it repeats again.
 *
 * `● ▲ ● ▲ ?`. Every pattern this activity can deal is built from a **rule
 * first** and drawn second: a form (`XY`, `XXY`, `XYZ`, `XXYY`, `XYXZ`), an
 * alphabet to write it in, and symbols taken from that alphabet without
 * repeating. Nothing is shuffled into existence and then checked afterwards,
 * which is what makes "exactly one logical answer" a property of the
 * generator rather than a hope about it.
 *
 * Two decisions worth stating, because both are about fairness:
 *
 * **The row is long enough to establish the rule.** A unit of two is shown
 * twice over before the gap; a unit of three or four is shown once over plus
 * the beginning of the next. That is the point at which the repeat is visible
 * rather than guessed at. Every finite row has infinitely many continuations —
 * that is true of every pattern question ever printed — so the promise here is
 * the honest one: exactly one *obvious* rule, and it is the one the generator
 * used.
 *
 * **The unit is rotated before it is laid out.** Without that, a unit of two
 * shown four times always ends with the gap wanting its first symbol, and a
 * child would learn to answer "the one on the left" without looking at the
 * pattern at all. Rotating costs nothing — a rotation of a repeat is the same
 * repeat — and it is why `canonicalUnit` exists.
 *
 * Math has a `patterns` activity too, and this is deliberately not it: that
 * one is a dozen authored rows of colours and friends, sitting at levels 2 and
 * 3 as the doorway to arithmetic. This one is a rule engine over shapes, dots
 * and letters, starting at level 1, and the two never meet — a round of Math
 * Quest deals only Math, and a round of Logic Quest deals only Logic.
 */

/**
 * A shape of repeat, written in as many distinct symbols as it needs.
 *
 * `XXYY` is two symbols; `XYZ` is three. The form knows how many it wants and
 * how to lay them out, and knows nothing about what they are.
 */
interface PatternForm {
  id: string;
  /** How many different symbols the form is written in. */
  distinct: number;
  build: (symbols: readonly Sym[]) => Sym[];
}

/* AB. The first pattern anyone meets, and the fallback for any level a
   caller invents. */
const AB_ONLY: readonly PatternForm[] = [
  { id: "xy", distinct: 2, build: ([x, y]) => [x, y] },
];

const FORMS: LevelTable<readonly PatternForm[]> = {
  1: AB_ONLY,
  /* AAB and ABB: the same two symbols, unevenly. */
  2: [
    { id: "xxy", distinct: 2, build: ([x, y]) => [x, x, y] },
    { id: "xyy", distinct: 2, build: ([x, y]) => [x, y, y] },
  ],
  /* Three symbols, or four slots. */
  3: [
    { id: "xyz", distinct: 3, build: ([x, y, z]) => [x, y, z] },
    { id: "xxyy", distinct: 2, build: ([x, y]) => [x, x, y, y] },
    { id: "xyxz", distinct: 3, build: ([x, y, z]) => [x, y, x, z] },
  ],
};

/**
 * How many symbols stand before the gap: the unit, plus two or three more.
 *
 * The "plus two" is what makes the question answerable. A unit shown once and
 * then broken off tells a child nothing — `● ▲ ▲ ●` could be a three-long
 * repeat or a four-long one, and those want different answers. Once two
 * symbols of the second turn are on the stage the repeat is visible and the
 * shortest rule that explains the row is the only rule, which is exactly the
 * "one logical answer" the pattern is promising.
 *
 * The "or three" is the second half of the rotation note above. A unit of two
 * shown exactly four times always wants its first symbol back, and a child who
 * noticed could answer every level-one pattern by copying the leftmost tile
 * without ever reading the row. Varying the run moves the answer around the
 * unit; rotating the unit moves it around the alphabet. Between them there is
 * no position worth learning.
 *
 * The longest unit does not get the extra one. `PromptDisplay` wraps rather
 * than overflows, so a long row is never cut off — but a row that takes a
 * second line on a 360px phone is a slightly harder read than the same row on
 * one, and a four-long unit is already the hardest thing here. It does not
 * need the extra symbol as well.
 */
function shownFor(unit: number, rng: Rng): number {
  return unit + 2 + (unit < 4 ? rng.int(0, 1) : 0);
}

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/**
 * Shapes and letters, and deliberately not dots.
 *
 * A pattern is read by telling one symbol from the one beside it, and a row
 * has nothing between its symbols — that is what makes it a row rather than a
 * chain. Two groups of dots laid side by side in a row do not separate: the
 * space between the groups is the same space as the one between the dots, so
 * `●● ●● ● ●● ●● ●` arrives as thirteen dots in a line and the pattern in it
 * is invisible. A shape or a letter is one mark and cannot run into its
 * neighbour, so those are what a pattern is written in.
 *
 * Sequences count in dots and are right to: `chain` puts an arrow between
 * every term, which is exactly the separator a row does not have.
 */
const ALPHABET_NAMES: readonly AlphabetName[] = ["shapes", "letters"];

/** A nudge back to the thinking, in the words of the alphabet it is written in. */
const HINTS: Record<AlphabetName, string> = {
  shapes: "Look at the shapes again. Which ones keep coming back?",
  dots: "Count the dots in each one. Then look for the part that repeats.",
  letters: "Say the letters out loud. Which part keeps coming back?",
};

/** The same repeat, joined at a different point. See the note above. */
function rotate(unit: readonly Sym[], by: number): Sym[] {
  const at = by % unit.length;
  return [...unit.slice(at), ...unit.slice(0, at)];
}

export const patternsActivity = defineGeneratedActivity({
  id: "patterns",
  packId: "logic",
  title: "Repeating patterns",
  category: "logic",
  activityType: "patterns",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const alphabetName = rng.pick(ALPHABET_NAMES) ?? "shapes";
    const alphabet: readonly Sym[] = ALPHABETS[alphabetName];

    const forms = forLevel(FORMS, level, AB_ONLY);
    const form = rng.pick(forms) ?? AB_ONLY[0];

    const written = form.build(rng.some(alphabet, form.distinct));
    const unit = rotate(written, rng.int(0, written.length - 1));

    const shown = shownFor(unit.length, rng);
    const run = Array.from({ length: shown }, (_, index) => unit[index % unit.length]);
    const answer = unit[shown % unit.length];

    /* Every symbol the pattern uses is offered, so the child is choosing
       between the things actually in front of them, and the board is topped up
       from the same alphabet rather than from somewhere sillier. */
    const inUnit = [...new Set(unit.map((symbol) => symbol.key))];
    const tiles = forLevel(TILES, level, 3);
    const distractors = [
      ...unit.filter((symbol) => symbol.key !== answer.key),
      ...otherSymbols(alphabet, inUnit, Math.max(0, tiles - inUnit.length), rng),
    ];
    const uniqueDistractors = distractors.filter(
      (symbol, index, all) =>
        symbol.key !== answer.key &&
        all.findIndex((other) => other.key === symbol.key) === index,
    );

    return {
      level,
      prompt: {
        speech: "Which one comes next?",
        display: row(run),
      },
      payload: board(answer, uniqueDistractors.slice(0, tiles - 1), rng),
      explanation: `It goes ${unit.map((symbol) => spokenOf(symbol.item)).join(", ")}, again and again.`,
      hint: HINTS[alphabetName],
      meta: {
        objective: "continues a repeating pattern",
        tags: ["pattern", concept("pattern", canonicalUnit(unit.map((s) => s.key)))],
      },
    };
  },
});
