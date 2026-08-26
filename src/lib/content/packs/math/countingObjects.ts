import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { illustratedAtLevel, type ArtId } from "../../art";
import type { PictureItem, PromptPart } from "../../types";
import { forLevel, numberChoices, type LevelTable } from "./shared";

/**
 * Counting real things.
 *
 * `math.counting` asks the same question about a group of pips: a tidy grid of
 * identical dots, which is quantity with everything else taken away. This one
 * puts the things back. Five apples, seven fish, three balloons — the child
 * counts what is in front of them and taps the numeral, which is the first
 * piece of mathematics anybody does and the one that has to survive being
 * about *something*.
 *
 * A `choice`, deliberately, and the only choice activity in its batch. The
 * gesture matches the objective: a quantity is recognised and named, and
 * naming is what tapping one tile out of three is. Arranging or joining would
 * be a worse fit dressed up as variety.
 *
 * `ChoiceStage` draws it with no idea what an apple is. Nothing here is new
 * machinery: `PictureItem` and `CountItem` both already existed, and a row of
 * pictures across the stage is `PromptDisplay` doing exactly what it does for
 * `2 + 3 = ?`.
 *
 * ## How a level gets harder
 *
 * | | how many | tiles | how they are shown |
 * |-|----------|-------|--------------------|
 * |1| 1–5 | 3 | a row of things |
 * |2| 4–10 | 3 | a row of things |
 * |3| 6–10 | 4 | a row of things, or a block of pips |
 *
 * The **count** grows past the handful a child can see without counting, the
 * board offers **one more tile** to choose between, and at level three the
 * group is sometimes a *block* rather than a line — because a child who can
 * only count along a row is a child who has learned a row, not a number.
 *
 * Nothing here is a clock, nothing is taken away for a wrong tap, and no
 * question is a trick: every distractor is a number the child could plausibly
 * have landed on by miscounting, and the group is always one kind of thing so
 * that "how many?" can never mean "how many of which?".
 */

/** A thing worth counting, and the word for a pile of them. */
interface Countable {
  glyph: string;
  /** Singular, for the picture's own name: "apple". */
  one: string;
  /** Plural, for the question: "How many apples can you count?" */
  many: string;
  /**
   * The drawing, for the six of these the library knows.
   *
   * A countable is the hardest thing in the library to draw well, because it is
   * the one that appears *nine times in a row* on a 360px phone. Anything with
   * a face, a scene, or a part a child might count separately fails at that
   * size, which is why the six that exist are all compact single objects and
   * why a bee, a ladybird and a biscuit are still emoji.
   */
  art?: ArtId;
}

/**
 * Things a four year old can name on sight.
 *
 * Written out with their plurals rather than guessed at, because English does
 * not make them the same way twice — strawberries, not strawberrys, and fish,
 * not fishes. Every one of them is a single compact glyph that reads at tile
 * size and stays one object when there are nine of it on the stage; nothing
 * here is a scene, a face or a thing with parts a child might count twice.
 */
const THINGS: readonly Countable[] = [
  { glyph: "🍎", one: "apple", many: "apples", art: "food.apple" },
  { glyph: "🍌", one: "banana", many: "bananas", art: "food.banana" },
  { glyph: "🍓", one: "strawberry", many: "strawberries", art: "food.strawberry" },
  { glyph: "🍊", one: "orange", many: "oranges", art: "food.orange" },
  { glyph: "⭐", one: "star", many: "stars", art: "nature.star" },
  { glyph: "🌼", one: "flower", many: "flowers", art: "nature.flower" },
  { glyph: "🐟", one: "fish", many: "fish", art: "animal.fish" },
  { glyph: "🐝", one: "bee", many: "bees", art: "animal.bee" },
  { glyph: "🐞", one: "ladybird", many: "ladybirds", art: "animal.ladybird" },
  { glyph: "🎈", one: "balloon", many: "balloons", art: "object.balloon" },
  { glyph: "⚽", one: "ball", many: "balls", art: "object.ball" },
  { glyph: "🚗", one: "car", many: "cars", art: "object.car" },
  { glyph: "🍪", one: "biscuit", many: "biscuits", art: "food.biscuit" },
  { glyph: "🌳", one: "tree", many: "trees", art: "nature.tree" },
];

/** The ones with a drawing behind them — since Phase 10, all of them. */
const DRAWN: readonly Countable[] = THINGS.filter((thing) => thing.art);

/** How many things there are to count, by level. */
const HOW_MANY: LevelTable<{ min: number; max: number }> = {
  1: { min: 1, max: 5 },
  2: { min: 4, max: 10 },
  3: { min: 6, max: 10 },
};

/** How many tiles the board offers. Three, then four at the top level. */
const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/**
 * Whether the group is drawn as a line of things or as a block of pips.
 *
 * The only two arrangements the content layer can describe today, and the
 * second one is why it matters. A row is counted by sweeping along it; a block
 * has to be counted by *keeping track*, which is the skill that comes next.
 * So the block arrives at level three and only there, on the counts where a
 * row would be long enough to lose your place in.
 *
 * Nothing is drawn differently for it: a row is `count` picture parts and a
 * block is one `count` item, both of which `PromptDisplay` has drawn since the
 * day it existed. A genuinely scattered arrangement would need a renderer that
 * does not exist, and inventing one is not what a content phase is for.
 */
type Arrangement = "row" | "block";

function picture(thing: Countable): PictureItem {
  return {
    kind: "picture",
    glyph: thing.glyph,
    label: thing.one,
    /* The whole row is one thing repeated, so it is drawn or it is not — a
       half-drawn row would be two kinds of apple and a child would count two
       groups. That is free here rather than arranged: every countable in the
       table has a drawing, so a row is all of one or all of the other whatever
       the level dealt, and a countable added without one falls back to its
       glyph for the whole row. */
    ...(thing.art ? { art: thing.art } : {}),
  };
}

/** A line of things across the stage. Wraps rather than overflows. */
function rowOf(thing: Countable, count: number): PromptPart[] {
  return Array.from({ length: count }, () => ({
    kind: "item" as const,
    item: picture(thing),
  }));
}

export const countingObjectsActivity = defineGeneratedActivity({
  id: "counting-objects",
  packId: "math",
  category: "math",
  activityType: "counting",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const span = forLevel(HOW_MANY, level, { min: 1, max: 5 });
    const value = rng.int(span.min, span.max);
    const tiles = forLevel(TILES, level, 3);

    const arrangement: Arrangement =
      level >= 3 && rng.next() < 0.5 ? "block" : "row";

    /* The ladder that is actually pedagogy, in two lines. Level one counts a
       thing out of the narrowed pool; every level counts a thing out of the
       table; and level three sometimes counts *pips*, which is quantity with
       the thing taken away entirely. That last step is the PICTURE -> SYMBOL
       rung, and it is a step because something is genuinely gone.

       What is not a rung is emoji-instead-of-illustration. A drawn apple and
       an emoji apple are the same apple to a child counting them, so the row
       is drawn at every level; `picture` says so.

       Note what does not change: the question, the gesture, the tiles and the
       marking. */
    const pool = illustratedAtLevel(level) ? DRAWN : THINGS;
    const thing = pool[rng.int(0, pool.length - 1)];

    const display: PromptPart[] =
      arrangement === "block"
        ? [{ kind: "item", item: { kind: "count", value, accent: "tide" } }]
        : rowOf(thing, value);

    const what = arrangement === "block" ? "dots" : thing.many;

    return {
      level,
      prompt: { speech: `How many ${what} can you count?`, display },
      /* Near misses only, and never below one: a child who miscounts lands
         one either side, and a tile nobody would ever pick is a tile that
         makes the board smaller than it looks. */
      payload: numberChoices(value, rng, {
        min: 1,
        max: span.max + 2,
        count: tiles,
      }),
      explanation: `There are ${value}.`,
      hint: "Touch each one as you count it, so you know where you got to.",
      meta: {
        objective: `counts a group of ${span.min} to ${span.max}`,
        /* The quantity is the concept. Which thing was drawn, and whether it
           was drawn in a line or a block, is the board — a child who counts
           six apples has not learned something a child who counts six stars
           has not, and counting the two as two ideas would be counting the
           shuffle. */
        tags: ["family:number", `concept:count:${value}`],
      },
    };
  },
});
