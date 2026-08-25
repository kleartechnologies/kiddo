import type { Level } from "./difficulty";
import type { Rng } from "./rng";

/**
 * The KIDDO visual library, as a vocabulary.
 *
 * `types.ts` says what a challenge is made of. This says what the things in it
 * can be *pictures of* — and it is deliberately a closed union rather than a
 * string, because the two failure modes of an asset key are a typo that draws
 * nothing and a name nobody can find again, and a union closes both at the
 * compiler.
 *
 * Nothing here is React and nothing here is a drawing. An `ArtId` is a name; a
 * name resolves to a drawing exactly once, in
 * `components/kiddo/artwork/illustrations/`, the same way an `Accent` resolves
 * to Tailwind classes exactly once in `lib/accents.ts`. A pack that wants a cow
 * asks for `animal.cow` and never learns how one is drawn.
 *
 * ## Why a picture is optional, everywhere it appears
 *
 * `PictureItem.glyph` has drawn every thing in the product since General
 * Knowledge shipped, and it draws thousands of them: an emoji ships with every
 * device a child will hold, scales without pixelating, and is already
 * localised. Forty-odd hand-drawn illustrations will never catch that, and a
 * system that needed them to would be a system that breaks the day a pack
 * writes a fact about an octopus.
 *
 * So `art` is a *promotion*, never a requirement. An item that names one is
 * drawn as an illustration; an item that does not, or one whose name has no
 * drawing registered yet, is drawn exactly as it is drawn today. That is the
 * whole expansion story: adding a penguin is one `ArtId`, one drawing and one
 * `art:` on the fact that already existed.
 */

/**
 * What a picture is of.
 *
 * Deliberately about the *world* rather than about a subject: a cow belongs to
 * animals whether General Knowledge is asking where it lives or Math is
 * counting five of them, and a library filed by pack would have to hold the cow
 * twice. Five categories cover everything the five packs draw today.
 */
export type ArtCategory =
  | "animal"
  | "food"
  | "object"
  | "nature"
  | "place";

/**
 * Every illustration that exists, by name.
 *
 * `<category>.<thing>`, so the id sorts into its shelf and a missing drawing is
 * a compiler error rather than a blank tile. Forty-eight of them, chosen by
 * working backwards from the entry level of real activities rather than to be a
 * pretty spread — see `docs/kiddo-visual-system.md` for which activity each one
 * is earning its place in. The last four arrived together because they had to:
 * `land-and-water` offers seven places on one board, a board is wholly drawn or
 * wholly plain, and three of seven drawn was three too few to use any of them.
 * Anything not on this list still draws, as a glyph.
 *
 * The pig was in the first twenty-one and is gone on purpose: KIDDO's home
 * market is Malaysia and Southeast Asia, and a pig is not a picture to hand a
 * child there as a default example. `lib/content/vocabulary.ts` writes the
 * rule down; the sweep in `tests/safety.test.ts` enforces it.
 */
export type ArtId =
  /* Animals. The ones the level-one boards of four activities are built from. */
  | "animal.cow"
  | "animal.sheep"
  | "animal.dog"
  | "animal.cat"
  | "animal.fish"
  | "animal.shark"
  | "animal.frog"
  | "animal.mouse"
  | "animal.chicken"
  | "animal.duck"
  | "animal.rabbit"
  | "animal.bird"
  | "animal.snake"
  | "animal.monkey"
  | "animal.fox"
  | "animal.bee"
  | "animal.ladybird"
  /* Food. */
  | "food.apple"
  | "food.egg"
  | "food.cake"
  | "food.banana"
  | "food.strawberry"
  | "food.orange"
  | "food.biscuit"
  /* Things. */
  | "object.ball"
  | "object.hat"
  | "object.car"
  | "object.balloon"
  | "object.box"
  /* Growing things. */
  | "nature.tree"
  | "nature.flower"
  | "nature.star"
  | "nature.sun"
  /* Places. */
  | "place.house"
  | "place.farm"
  | "place.sea"
  | "place.pond"
  | "place.nest"
  | "place.burrow"
  | "place.jungle"
  | "place.forest"
  | "place.desert"
  | "place.snow"
  | "place.tree"
  /* The four that finish the world pack's set of seven. */
  | "place.mountain"
  | "place.beach"
  | "place.island"
  | "place.volcano";

/**
 * The library as a list, for a test that wants to prove every name is drawn and
 * for the reference sheet on `/playground`.
 *
 * Written out rather than derived, because a union cannot be enumerated at
 * runtime — and the test that the two agree is one line, which is cheaper than
 * the machinery that would make it unnecessary.
 */
export const ART_IDS: readonly ArtId[] = [
  "animal.cow",
  "animal.sheep",
  "animal.dog",
  "animal.cat",
  "animal.fish",
  "animal.shark",
  "animal.frog",
  "animal.mouse",
  "animal.chicken",
  "animal.duck",
  "animal.rabbit",
  "animal.bird",
  "animal.snake",
  "animal.monkey",
  "animal.fox",
  "animal.bee",
  "animal.ladybird",
  "food.apple",
  "food.egg",
  "food.cake",
  "food.banana",
  "food.strawberry",
  "food.orange",
  "food.biscuit",
  "object.ball",
  "object.hat",
  "object.car",
  "object.balloon",
  "object.box",
  "nature.tree",
  "nature.flower",
  "nature.star",
  "nature.sun",
  "place.house",
  "place.farm",
  "place.sea",
  "place.pond",
  "place.nest",
  "place.burrow",
  "place.jungle",
  "place.forest",
  "place.desert",
  "place.snow",
  "place.tree",
  "place.mountain",
  "place.beach",
  "place.island",
  "place.volcano",
] as const;

/** Which shelf a name sits on. The prefix, and never anything cleverer. */
export function artCategoryOf(id: ArtId): ArtCategory {
  return id.slice(0, id.indexOf(".")) as ArtCategory;
}

/**
 * Whether a board at this level is drawn with illustrations.
 *
 * The scaffolding rule, written down once so five activities cannot disagree
 * about it. A picture is help, and help that never goes away is not help — it
 * is a crutch a child learns to lean on instead of learning the thing. So the
 * illustration belongs to the *entry* level and leaves as the board gets
 * harder, which is the ladder `docs/kiddo-visual-system.md` §L calls
 * PICTURE -> PICTURE + WORD -> SYMBOL.
 *
 * What each activity falls back *to* is its own decision and is not the same
 * decision twice: a counting board falls back from drawn apples to emoji apples
 * to a block of pips, and an alphabet tray falls back from a letter with a
 * picture over it to the letter alone. This only says *when*.
 *
 * Level one and only level one, on purpose. Every activity that uses this
 * offers three levels, level two is where the pool widens and the board grows,
 * and a scaffold that survived the first widening would be carried to the top.
 */
export function illustratedAtLevel(level: Level): boolean {
  return level <= 1;
}

/**
 * Whether *this* board narrows itself to what the library can draw.
 *
 * The rule the two `connect` activities need, and the one place the phase had
 * to choose between two things it wanted.
 *
 * On a board where **both** columns are content — an animal and its home, a
 * word and the word it rhymes with — a half-drawn board is not a cosmetic
 * problem. Two illustrations among four glyphs is a pattern, and a child who
 * joins the two drawn ones is right for entirely the wrong reason. So such a
 * board has to be all drawing or all glyph.
 *
 * But narrowing an entry level to what the library can draw takes facts away
 * from it. `home-partners` would stop dealing the monkey at level one;
 * `rhyming-partners` would stop dealing eight of its twelve first rhymes, and
 * `tests/english.test.ts` says in as many words that level one deals all
 * twelve. Both are real losses, and neither is worth a picture.
 *
 * So the entry level does both, board by board: about half its boards are
 * dealt from the drawn set and are wholly illustrated, and the rest are dealt
 * from the whole pool and are wholly glyph. Every fact is still dealt at every
 * level it was dealt at before, no board is ever half-drawn, and a child at the
 * entry level meets pictures often rather than always — which is what a
 * scaffold is.
 *
 * The share is a coin rather than a tuned number because it does not want
 * tuning: it wants to be obviously neither "never" nor "always". As the library
 * grows the drawn set widens, the two halves converge, and this function keeps
 * meaning the same thing.
 */
export function narrowToDrawn(level: Level, rng: Rng): boolean {
  return illustratedAtLevel(level) && rng.next() < 0.5;
}
