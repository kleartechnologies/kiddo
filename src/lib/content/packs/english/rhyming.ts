import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { boardIsDrawn, narrowToDrawn, type ArtId } from "../../art";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { wordId, wordItem } from "./shared";

/**
 * Words that end with the same sound.
 *
 * Rhyme is the first piece of phonological awareness a child gets for free —
 * long before they can segment CAT into three sounds, they can hear that CAT
 * and HAT finish the same way — and it is the thing that makes the rest of
 * `phonics.ts` learnable. So it is here, and it is a `connect`: two columns of
 * words, join the ones that sound alike. The gesture is the objective. A quiz
 * would ask "which word rhymes with CAT?" and give the game away by having
 * only one plausible tile on the board; joining a whole set means every word
 * has to be *heard* against every other one.
 *
 * No engine came out of this. `ConnectStage` has drawn two columns of text
 * tiles since `match.letter-partners`, and every rule below is a table.
 *
 * ## Rhyme is a sound, not a spelling
 *
 * The one thing this file must not get wrong. English writes the same ending
 * a dozen ways and the same spelling a dozen sounds, so a table keyed on how a
 * word *looks* would teach a child something false: that EIGHT and PLATE are
 * unrelated, and that TREE and FREE are the same kind of thing as SHOE and
 * HOE. `FAMILIES` is therefore keyed on the ending you can *hear* — HEAD is
 * filed with BED, KEY with BEE, ONE with SUN, TWO with SHOE — and spelling is
 * used for exactly one thing, which is deciding what a level-three board is
 * made of.
 *
 * That key is also the correctness rule. Two words rhyme when they are in the
 * same family and never otherwise, so a board is built by taking **one pair
 * from each of several different families**: every wrong line a child can draw
 * joins two families, and `checkStep` — in the content layer, where marking
 * lives — refuses it. There is exactly one way to finish a board.
 *
 * ## How a level gets harder
 *
 * | | pairs | drawn from |
 * |-|-------|------------|
 * |1| 2 | endings spelled the way they sound, in words a three year old owns |
 * |2| 3 | the above, plus longer and less-obvious words |
 * |3| 4 | the above, and always at least one pair that *only* rhymes by sound |
 *
 * Three levers, none of them a clock. More lines means more words held in the
 * head at once. A bigger pool means the near-misses on the board are closer
 * together — CAP and MAP sitting on the same stage as CAT and HAT is a real
 * question rather than a pattern-match. And level three's guarantee is the
 * point of the whole activity: a board where BEAR must find CHAIR, or EIGHT
 * must find PLATE, cannot be solved by looking at the last two letters, and a
 * child who solves it has heard the rhyme.
 *
 * Wrong lines are drawable, refused, and cost nothing — there is no timer, no
 * life, and no way to fail a board, only to keep going until it is joined.
 */

/* ---------------------------------------------------------------- families */

/**
 * A pair of words that rhyme, and the ending they share.
 *
 * `family` is the sound. Two pairs with the same family may never share a
 * board — the second one would make both answerable two ways.
 *
 * `sound` marks the pairs whose ending is spelled differently on each side.
 * They are the hard ones, they are level three's job, and they are why a
 * `looks like` heuristic was never an option.
 */
interface RhymePair {
  left: string;
  right: string;
  family: string;
  level: 1 | 2 | 3;
  /** True when the two words do not share the spelling of their ending. */
  sound?: true;
}

const pair = (
  left: string,
  right: string,
  family: string,
  level: 1 | 2 | 3,
  sound?: true,
): RhymePair => ({ left, right, family, level, sound });

/**
 * Every rhyme this activity knows, forty-one of them.
 *
 * Ordered by level, which here means *how much of a child's ear it asks for*
 * rather than how long the words are. Level one is the set of rhymes a nursery
 * rhyme has already taught: short words, familiar things, and an ending you
 * could also have spotted with your eyes. Level two keeps the spelling honest
 * and widens the vocabulary. Level three is the sound alone.
 *
 * Nothing here is obscure, nothing is regional — no LORRY, no FAUCET — and
 * nothing depends on knowing a story, a brand or a season. Every word is a
 * thing, an animal or a number a four year old can already say.
 */
const PAIRS: readonly RhymePair[] = [
  /* Level one. The rhymes a child arrives already knowing. */
  pair("CAT", "HAT", "at", 1),
  pair("DOG", "FROG", "og", 1),
  pair("SUN", "FUN", "un", 1),
  pair("BALL", "TALL", "all", 1),
  pair("FISH", "DISH", "ish", 1),
  pair("CAR", "STAR", "ar", 1),
  pair("BOX", "FOX", "ox", 1),
  pair("DIG", "BIG", "ig", 1),
  pair("BUG", "RUG", "ug", 1),
  pair("CAKE", "SNAKE", "ake", 1),
  pair("MOUSE", "HOUSE", "ouse", 1),
  pair("BED", "RED", "ed", 1),

  /* Level two. Same rule, wider world. */
  pair("BOAT", "COAT", "oat", 2),
  pair("MOON", "SPOON", "oon", 2),
  pair("BEE", "TREE", "ee", 2),
  pair("KING", "RING", "ing", 2),
  pair("SOCK", "CLOCK", "ock", 2),
  pair("TRAIN", "RAIN", "ain", 2),
  pair("MICE", "RICE", "ice", 2),
  pair("SHEEP", "SLEEP", "eep", 2),
  pair("CAP", "MAP", "ap", 2),
  pair("PIN", "BIN", "in", 2),
  pair("BAG", "FLAG", "ag", 2),
  pair("BOY", "TOY", "oy", 2),
  pair("VAN", "MAN", "an", 2),
  pair("MOP", "TOP", "op", 2),
  pair("NOSE", "ROSE", "ose", 2),
  pair("DUCK", "TRUCK", "uck", 2),
  pair("CORN", "HORN", "orn", 2),

  /* Level three. The ending is spelled two ways, so only the ear can do it. */
  pair("BEAR", "CHAIR", "air", 3, true),
  pair("EYE", "PIE", "eye", 3, true),
  pair("WHALE", "SNAIL", "ale", 3, true),
  pair("PLATE", "EIGHT", "ate", 3, true),
  pair("DOOR", "FOUR", "oor", 3, true),
  pair("WHEEL", "SEAL", "eel", 3, true),
  pair("SHOE", "TWO", "oo", 3, true),
  pair("FEET", "MEAT", "eat", 3, true),
  pair("KITE", "LIGHT", "ite", 3, true),
  pair("TREE", "KEY", "ee", 3, true),
  pair("ONE", "SUN", "un", 3, true),
  pair("HEAD", "BED", "ed", 3, true),
];

/**
 * The honest content count: how many rhymes a child could learn here.
 *
 * Forty-one pairs, not the tens of thousands of boards they can be dealt into.
 * A board is a shuffle; the pair is the thing that was learned, and the pack's
 * test counts these.
 */
export const RHYME_PAIRS = PAIRS.length;

/** Every family, for a test that wants to prove a word lives in only one. */
export const RHYME_FAMILIES: readonly (readonly [string, string, string])[] =
  PAIRS.map((entry) => [entry.left, entry.right, entry.family]);

/* -------------------------------------------------------------- pictures */

/**
 * The picture for a rhyming word, where the library has drawn one.
 *
 * MODE 2 again, and the most careful use of a picture in the phase — because
 * rhyme is a *sound*, and a picture is the one thing that can never carry it.
 * A cat and a hat look nothing alike. So the drawing is doing exactly one job:
 * telling a child who cannot yet read what the word on the tile *says*, so they
 * can say it out loud and hear the ending. It cannot become the answer, because
 * there is no visual relationship on the board to find.
 *
 * Keyed on the word rather than on the pair, so both columns read the same
 * table and a word that appears in two pairs is drawn the same way in both.
 */
const WORD_ART: Readonly<Record<string, ArtId>> = {
  CAT: "animal.cat",
  SUN: "nature.sun",
  CAKE: "food.cake",
  SNAKE: "animal.snake",
  HAT: "object.hat",
  DOG: "animal.dog",
  FROG: "animal.frog",
  CAR: "object.car",
  STAR: "nature.star",
  MOUSE: "animal.mouse",
  HOUSE: "place.house",
  BOX: "object.box",
  FOX: "animal.fox",
};

/**
 * The pairs that can be shown with a picture on **both** words.
 *
 * Half a drawn board is worse than none here: two tiles carrying pictures among
 * four that do not is a pattern, and a child who joins the two drawn ones is
 * right half the time for entirely the wrong reason. So a level-one board is
 * dealt from these four or it is dealt plain — see `narrowToDrawn`, which is
 * why it is *some* level-one boards and not all of them. All twelve level-one
 * rhymes are still dealt at level one, which `tests/english.test.ts` checks.
 *
 * All four are level-one pairs and all four are in different families, so a
 * two-line board can always be made from them. Drawing a dish, a bug or a
 * snake widens this set with no other edit here.
 */
const DRAWN_PAIRS: readonly RhymePair[] = PAIRS.filter(
  (entry) => WORD_ART[entry.left] && WORD_ART[entry.right],
);

/* ------------------------------------------------------------------ rules */

/** How many lines a board asks for. The only lever that is a number. */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/**
 * Which rhymes a level may deal from.
 *
 * Cumulative, like every other pool in the codebase: a child who reached level
 * three still meets CAT and HAT, they just meet them next to BEAR and CHAIR.
 */
function poolAtLevel(level: Level): readonly RhymePair[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return PAIRS.filter((entry) => entry.level <= ceiling);
}

/**
 * Choose the pairs for one board.
 *
 * One per family, because a second pair from the same family would give some
 * word on the board two right answers. `required` is level three's guarantee:
 * the board starts from a sound-only rhyme and fills up around it, so the top
 * level can never deal four boards' worth of matching spellings and call
 * itself hard.
 *
 * Greedy over a shuffled pool with retries, the same shape as
 * `general-knowledge/habitats.ts`, and for the same reason — a greedy walk can
 * run out of families, and a short board is merely easier where a repeated
 * family is broken.
 */
function chooseBoard(
  level: Level,
  rng: Rng,
  pool: readonly RhymePair[] = poolAtLevel(level),
): RhymePair[] {
  const count = pairsAtLevel(level);
  const hard = level >= 3 ? pool.filter((entry) => entry.sound) : [];

  let best: RhymePair[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: RhymePair[] = [];
    const families = new Set<string>();
    const words = new Set<string>();

    const start = hard.length > 0 ? [hard[rng.int(0, hard.length - 1)]] : [];

    for (const candidate of [...start, ...rng.shuffle(pool)]) {
      if (picked.length >= count) break;
      if (families.has(candidate.family)) continue;
      if (words.has(candidate.left) || words.has(candidate.right)) continue;
      families.add(candidate.family);
      words.add(candidate.left);
      words.add(candidate.right);
      picked.push(candidate);
    }

    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/**
 * The order the right-hand column is laid out in.
 *
 * Shuffled apart from the left column, or the board would be answerable by
 * joining row to row. On three lines and up the shuffle is *deranged* too, so
 * no word ever sits opposite its own rhyme and a child who joins straight
 * across is never accidentally right. Two are left to an even shuffle: the
 * only derangement of two is the swap, and a board that is always crossed is a
 * pattern to learn instead of a rhyme to hear.
 */
function displace(chosen: readonly RhymePair[], rng: Rng): RhymePair[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board.
 *
 * The *set* of rhymes it practises, sorted — so the same four pairs dealt down
 * the columns in a different order is one concept and not four, and a session
 * that has already taught `cat↔hat+dog↔frog` will not teach it again wearing a
 * different shuffle. Which is also why this is not a way of counting: the
 * number that means something to a child is `RHYME_PAIRS`.
 */
function conceptOf(chosen: readonly RhymePair[]): string {
  const rhymes = chosen
    .map((entry) => `${entry.left.toLowerCase()}↔${entry.right.toLowerCase()}`)
    .sort();
  return `concept:rhyme:${rhymes.join("+")}`;
}

export const rhymingPartnersActivity = defineGeneratedActivity({
  id: "rhyming-partners",
  packId: "english",
  title: "Words That Rhyme",
  category: "english",
  activityType: "rhyming",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const narrowed =
      narrowToDrawn(level, rng) && DRAWN_PAIRS.length >= pairsAtLevel(level);

    const chosen = chooseBoard(level, rng, narrowed ? DRAWN_PAIRS : undefined);

    /* The strictest board in the product, and the reason `boardIsDrawn` takes
       every picture rather than one. Both columns are words the child has to
       *hear*, so two drawings among four glyphs would be a way to finish the
       board without ever saying a word out loud. The coin above still decides
       which rhymes are dealt — all twelve level-one rhymes are still dealt at
       level one, which `tests/english.test.ts` insists on — and this decides
       whether what came out can be drawn end to end. A board dealt from the
       whole pool that happens to be all drawable is drawn too, at any level;
       one that is not stays wholly on glyphs. */
    const illustrated = boardIsDrawn(
      chosen.flatMap((entry) => [WORD_ART[entry.left], WORD_ART[entry.right]]),
    );

    const art = (word: string) =>
      illustrated ? WORD_ART[word] : undefined;

    const left: ConnectNode[] = chosen.map((entry) => ({
      id: wordId(entry.left),
      item: wordItem(entry.left, art(entry.left)),
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((entry) => ({
      id: wordId(entry.right),
      item: wordItem(entry.right, art(entry.right)),
    }));

    const pairs: ConnectPair[] = chosen.map((entry) => ({
      leftId: wordId(entry.left),
      rightId: wordId(entry.right),
    }));

    const example = chosen[0];

    return {
      level,
      prompt: { speech: "Can you join the words that rhyme?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `They all rhyme. Listen: ${example.left}, ${example.right}.`
        : "They all rhyme.",
      hint: "Say two words out loud. Do they finish with the same sound?",
      meta: {
        objective: "joins words that end with the same sound",
        tags: ["family:word", conceptOf(chosen)],
      },
    };
  },
});
