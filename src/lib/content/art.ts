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
 * Whether a board at this level deals from a *narrowed* pool.
 *
 * Read the name carefully: this says which levels may restrict themselves to
 * the facts the library has drawn, and it no longer says how anything is
 * **rendered**. Rendering is `boardIsDrawn` below, and the difference between
 * the two is the difference between content and paint.
 *
 * It is still level one and only level one, because narrowing a pool takes
 * facts away from a board and the entry level is the only place that is worth
 * doing: a level-one counting board deals from the fourteen things the library
 * knows, and level two deals from the whole table. Every level above the entry
 * one sees more of the world, which is the ladder.
 *
 * What this deliberately no longer decides is whether the picture is a KIDDO
 * drawing or a system emoji. That was never a difficulty lever — an emoji cow
 * and a drawn cow ask a child for exactly the same thing — and using it as one
 * meant every board above the entry level mixed the illustration system with
 * the platform's emoji font. See `boardIsDrawn`.
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
 * dealt from the drawn set, and the rest are dealt from the whole pool. Every
 * fact is still dealt at every level it was dealt at before.
 *
 * What comes out of the two halves is no longer "drawn" and "glyph", because
 * this function stopped being a rendering decision when `boardIsDrawn` became
 * one. A narrowed board is drawable by construction; an unnarrowed board is
 * drawn too whenever the facts it happened to deal are all in the library, and
 * is glyph as a whole when they are not. So the coin now only decides *which
 * facts*, which is the only thing it was ever entitled to decide.
 *
 * The share is a coin rather than a tuned number because it does not want
 * tuning: it wants to be obviously neither "never" nor "always". As the library
 * grows the drawn set widens, the two halves converge, and this function keeps
 * meaning the same thing.
 */
export function narrowToDrawn(level: Level, rng: Rng): boolean {
  return illustratedAtLevel(level) && rng.next() < 0.5;
}

/**
 * Whether a board showing these pictures is drawn.
 *
 * The rule that replaced "the drawing belongs to level one". A board is drawn
 * when the library can draw **every** picture on it, and is left as glyphs the
 * moment it cannot draw one of them — so the answer to "is this board
 * illustrated?" is a fact about the library rather than about the level.
 *
 * ## Why the level stopped deciding
 *
 * `illustratedAtLevel` still says which levels deal from a *narrowed pool*,
 * which is a content decision and stays exactly where it was. What it no
 * longer does is decide how a picture is **drawn**, because that was never a
 * decision about difficulty: an emoji cow and a drawn cow tell a child the
 * same thing and cost them the same effort. Fading the drawing at level two
 * did not remove a scaffold, it only put a KIDDO board and a system emoji on
 * the same screen — which is the one thing the visual system is for.
 *
 * The ladder that *is* pedagogy is untouched, because it was never this
 * function: `counting-objects` still drops to a block of pips at level three,
 * `alphabet-order` still widens its window, and every pool still widens with
 * the level. Those take something away. A drawing does not.
 *
 * ## Why all-or-nothing survived
 *
 * This is the rule that actually protects a board, and it is the whole reason
 * the predicate takes a list rather than one id. On a board where the pictures
 * are the content — an animal and its home, a word and the word it rhymes with
 * — two illustrations among four glyphs is a pattern, and a child who joins the
 * two drawn ones is right for entirely the wrong reason. So a caller passes the
 * art of *every picture the child will see*, including the ones that resolved
 * to nothing, and gets one answer for the whole board.
 *
 * An empty board is not drawn: `every` on an empty list is `true`, and a board
 * with no pictures on it has nothing to promote.
 */
export function boardIsDrawn(art: readonly (ArtId | undefined)[]): boolean {
  return art.length > 0 && art.every((id) => id !== undefined);
}
