import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import { board, part, wordId, wordItem } from "./shared";

/**
 * Words that mean the opposite of each other.
 *
 * The first vocabulary activity in the pack. Everything else in English so far
 * is about how a word is *built* — its letters, its case, its first sound, its
 * ending. This one is about what a word *means*, and opposites are where that
 * starts: BIG and SMALL are the first pair of words a child holds against each
 * other, and once they can do it the whole apparatus of comparison —
 * more/less, before/after, same/different — has somewhere to stand.
 *
 * A `choice`, drawn by `ChoiceStage` with nothing new in it. The table is the
 * activity; `match/opposites.ts` deals the same table as cards, because a
 * child who can pick SMALL out of three tiles has not yet had to hold four
 * pairs in their head at once.
 *
 * ## Only one word on the board can be right
 *
 * The rule that makes this activity honest, and the reason `family` exists.
 * Ask for the opposite of TALL with SHORT, SMALL and HOT on the board and a
 * child who taps SMALL has not made a mistake — they have answered a question
 * that was asked badly. So every pair carries the dimension it lives on, and
 * a distractor may never come from the answer's dimension. TALL is asked
 * against HOT and CLEAN and LOUD, never against SMALL.
 *
 * The table also holds no synonyms — SMALL is here and LITTLE is not, SHUT is
 * here and CLOSED is not — for the same reason. Two words that mean the same
 * thing make two right answers.
 *
 * ## How a level gets harder
 *
 * | | tiles | drawn from |
 * |-|-------|------------|
 * |1| 3 | the pairs a three year old already uses: HOT/COLD, UP/DOWN |
 * |2| 3 | the above, plus pairs that need a bit more of the world |
 * |3| 4 | all of them, including the ones that are only opposite in one way |
 *
 * Vocabulary, and how many words have to be read. Not speed: there is no
 * clock here, a tap that was not the answer leaves the board exactly as it
 * was, and the child may try again straight away.
 */

/* ------------------------------------------------------------------ table */

/**
 * A pair of words that mean the opposite of each other.
 *
 * `family` is the dimension they disagree along — size, temperature, place.
 * Two pairs from the same family may never appear on one board, in either
 * form of this activity: as a distractor one would be arguable, and as a
 * second line on a cards board it would give some word two partners.
 */
export interface OppositePair {
  a: string;
  b: string;
  family: string;
  level: 1 | 2 | 3;
}

const pair = (
  a: string,
  b: string,
  family: string,
  level: 1 | 2 | 3,
): OppositePair => ({ a, b, family, level });

/**
 * Every opposite this activity knows, twenty-seven of them.
 *
 * Ordered by how much of the world the pair needs. Level one is the set a
 * child uses before they can read any of them — the words that come out of
 * bath time, the light switch and the door. Level two needs a little more
 * experience: NEW against OLD, QUIET against LOUD. Level three is the pairs
 * that are opposite along one dimension only, where a child has to hold the
 * dimension in mind as well as the words — THICK and THIN are about a thing's
 * body, FIRST and LAST are about a queue.
 *
 * Nothing regional and nothing seasonal. SUMMER and WINTER are not here,
 * because half the world does not have them; LEFT and RIGHT are not here,
 * because they are not opposites but a pair of directions and asking a four
 * year old to call them opposite teaches a wrong thing to unpick later.
 */
const PAIRS: readonly OppositePair[] = [
  /* Level one. Bath time, the light switch and the door. */
  pair("BIG", "SMALL", "size", 1),
  pair("HOT", "COLD", "temperature", 1),
  pair("WET", "DRY", "water", 1),
  pair("UP", "DOWN", "place", 1),
  pair("IN", "OUT", "place", 1),
  pair("ON", "OFF", "switch", 1),
  pair("OPEN", "SHUT", "door", 1),
  pair("DAY", "NIGHT", "time", 1),
  pair("FAST", "SLOW", "speed", 1),
  pair("STOP", "GO", "speed", 1),
  pair("HAPPY", "SAD", "feeling", 1),
  pair("FULL", "EMPTY", "amount", 1),

  /* Level two. A little more of the world. */
  pair("TALL", "SHORT", "size", 2),
  pair("OLD", "NEW", "age", 2),
  pair("HARD", "SOFT", "touch", 2),
  pair("LOUD", "QUIET", "sound", 2),
  pair("CLEAN", "DIRTY", "washing", 2),
  pair("PUSH", "PULL", "force", 2),
  pair("OVER", "UNDER", "place", 2),
  pair("MORE", "LESS", "amount", 2),
  pair("AWAKE", "ASLEEP", "sleep", 2),

  /* Level three. Opposite along one dimension, and you have to know which. */
  pair("THICK", "THIN", "size", 3),
  pair("ROUGH", "SMOOTH", "touch", 3),
  pair("FRONT", "BACK", "place", 3),
  pair("FIRST", "LAST", "order", 3),
  pair("NEAR", "FAR", "place", 3),
  pair("GIVE", "TAKE", "force", 3),
];

/**
 * The honest content count: how many opposites a child could learn here.
 *
 * Twenty-seven pairs. Each one is asked both ways round — BIG wanting SMALL
 * and SMALL wanting BIG — but that is one thing known, not two, and the pack's
 * test counts the pairs.
 */
export const OPPOSITE_PAIRS = PAIRS.length;

/** Every pair, for the cards form and for a test that wants the whole table. */
export const OPPOSITES: readonly OppositePair[] = PAIRS;

/**
 * Which opposites a level may deal from.
 *
 * Cumulative, like every other pool in the codebase: a child on level three
 * still meets HOT and COLD, they just meet them beside THICK and THIN.
 */
export function oppositesAtLevel(level: Level): readonly OppositePair[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return PAIRS.filter((entry) => entry.level <= ceiling);
}

/* --------------------------------------------------------------- activity */

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

export const oppositesActivity = defineGeneratedActivity({
  id: "opposites",
  packId: "english",
  title: "Opposites",
  category: "english",
  activityType: "opposites",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = oppositesAtLevel(level);
    const entry = rng.pick(pool) ?? PAIRS[0];
    const tiles = forLevel(TILES, level, 3);

    /* Asked both ways round, because knowing that SMALL answers BIG is not
       yet knowing that BIG answers SMALL. */
    const forward = rng.next() < 0.5;
    const asked = forward ? entry.a : entry.b;
    const answer = forward ? entry.b : entry.a;

    /* Never a word from the answer's own dimension: it would be arguable. */
    const others = pool.filter((other) => other.family !== entry.family);
    const distractors = rng
      .some(others, tiles - 1)
      .map((other) => (rng.next() < 0.5 ? other.a : other.b));

    return {
      level,
      prompt: {
        speech: `What is the opposite of ${asked}?`,
        display: [part(wordItem(asked))],
      },
      payload: board(answer, distractors, rng, wordItem, wordId),
      explanation: `${asked} and ${answer} are opposites.`,
      hint: `Think about what ${asked} means, then look for a word that means the other thing.`,
      meta: {
        objective: `knows the opposite of ${asked}`,
        tags: ["family:word", `concept:opposite:${entry.a.toLowerCase()}↔${entry.b.toLowerCase()}`],
      },
    };
  },
});
