import { defineGeneratedActivity } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import {
  board,
  namedLetter,
  part,
  pickDistractors,
  wordAnchor,
  wordId,
  wordItem,
} from "./shared";

/**
 * Beginning sounds — what a word starts with.
 *
 * The one activity in this pack where the content genuinely had to be written
 * by a person rather than derived, because English spelling does not tell you
 * how a word starts. So the words are authored, one line each, with the letter
 * their first sound is written with and the letters a child might reach for
 * instead; the *questions* are then generated from that list in both
 * directions. Authored vocabulary, generated configuration — which is the
 * split the brief asks for, and the same one `patterns.ts` makes in Math.
 *
 * What is deliberately not here:
 *
 * - **Digraphs.** SHIP, CHIN and THIS start with one sound written with two
 *   letters. Real, and not the first thing a four year old meets.
 * - **Blends.** TREE starts with /t/, but a child hearing "truh" can fairly
 *   answer either letter, and the brief rules out anything that arguable.
 * - **Soft C and soft G.** CITY and GIRAFFE contradict CAT and GOAT.
 * - **K, Q, X and vowel onsets.** K and C say the same thing, QU is never one
 *   sound, X does not begin words, and A is /æ/ in ANT and /eɪ/ in APRON.
 */

interface PhonicsWord {
  word: string;
  /** The letter the first sound is written with. Upper case, like the tiles. */
  sound: string;
  /**
   * Wrong letters worth offering: a letter elsewhere in the word, or one whose
   * sound sits right next to the answer's. Never a letter that could also be
   * a fair answer — see `SAME_SOUND` below.
   */
  wrong: readonly string[];
  /**
   * A picture of the thing, when one exists that a child would name with this
   * word and no other.
   *
   * Optional, and most words do not have one: RED is not a thing, JET is a
   * plane to a four year old, and 🍯 is honey however much it looks like JAM.
   * `sound-partners.ts` deals its boards from the words that do have one, so a
   * wrong picture here would become a board with no right answer.
   */
  glyph?: string;
}

/** The type the picture board reads. Exported for it and for the tests. */
export type { PhonicsWord };

/**
 * Letters that can say each other's sound, and so may never share a board.
 *
 * C and K both say /k/; C and S both say /s/; G and J both say /dʒ/; S and Z
 * both say /z/. Offering K against CAT is not a hard question, it is a
 * question with two right answers. A test asserts this table is respected by
 * every board the activity can deal, in both directions.
 */
export const SAME_SOUND: Record<string, readonly string[]> = {
  C: ["K", "S"],
  K: ["C"],
  S: ["C", "Z"],
  Z: ["S"],
  G: ["J"],
  J: ["G"],
};

/** Three letters, one clear consonant at the front. Where phonics starts. */
const SHORT_WORDS: readonly PhonicsWord[] = [
  { word: "BUS", sound: "B", wrong: ["D", "P", "S"], glyph: "🚌" },
  { word: "BED", sound: "B", wrong: ["D", "P", "N"], glyph: "🛏️" },
  { word: "BAG", sound: "B", wrong: ["G", "D", "P"], glyph: "👜" },
  { word: "BEE", sound: "B", wrong: ["D", "P", "T"], glyph: "🐝" },
  { word: "CAT", sound: "C", wrong: ["T", "G", "M"], glyph: "🐱" },
  { word: "CUP", sound: "C", wrong: ["P", "T", "G"] },
  { word: "CAR", sound: "C", wrong: ["R", "T", "M"], glyph: "🚗" },
  { word: "DOG", sound: "D", wrong: ["G", "B", "P"], glyph: "🐶" },
  { word: "FOX", sound: "F", wrong: ["X", "V", "T"], glyph: "🦊" },
  { word: "FAN", sound: "F", wrong: ["N", "V", "T"] },
  { word: "HAT", sound: "H", wrong: ["T", "N", "B"], glyph: "🎩" },
  { word: "HEN", sound: "H", wrong: ["N", "B", "M"], glyph: "🐔" },
  { word: "JAM", sound: "J", wrong: ["M", "D", "N"] },
  { word: "JET", sound: "J", wrong: ["T", "D", "N"] },
  { word: "LEG", sound: "L", wrong: ["G", "N", "D"], glyph: "🦵" },
  { word: "MAP", sound: "M", wrong: ["P", "N", "B"], glyph: "🗺️" },
  { word: "MUD", sound: "M", wrong: ["D", "N", "B"] },
  { word: "NET", sound: "N", wrong: ["T", "M", "D"] },
  { word: "PAN", sound: "P", wrong: ["N", "B", "D"], glyph: "🍳" },
  { word: "PEN", sound: "P", wrong: ["N", "B", "T"], glyph: "🖊️" },
  { word: "POT", sound: "P", wrong: ["T", "B", "D"] },
  { word: "RED", sound: "R", wrong: ["D", "N", "B"] },
  { word: "SUN", sound: "S", wrong: ["N", "M", "T"], glyph: "☀️" },
  { word: "SIX", sound: "S", wrong: ["X", "T", "N"] },
  { word: "TOP", sound: "T", wrong: ["P", "D", "B"] },
  { word: "TEN", sound: "T", wrong: ["N", "D", "P"] },
  { word: "VAN", sound: "V", wrong: ["N", "F", "B"], glyph: "🚐" },
  { word: "WEB", sound: "W", wrong: ["B", "M", "N"], glyph: "🕸️" },
  { word: "ZIP", sound: "Z", wrong: ["P", "N", "T"] },
];

/** Four letters, still one consonant at the front. */
const LONGER_WORDS: readonly PhonicsWord[] = [
  { word: "BOAT", sound: "B", wrong: ["T", "P", "D"], glyph: "⛵" },
  { word: "BALL", sound: "B", wrong: ["L", "D", "P"] },
  { word: "CAKE", sound: "C", wrong: ["G", "T", "D"], glyph: "🎂" },
  { word: "DUCK", sound: "D", wrong: ["C", "K", "B"], glyph: "🦆" },
  { word: "DOOR", sound: "D", wrong: ["R", "B", "T"], glyph: "🚪" },
  { word: "FISH", sound: "F", wrong: ["S", "H", "V"], glyph: "🐟" },
  { word: "GOAT", sound: "G", wrong: ["T", "D", "C"], glyph: "🐐" },
  { word: "GATE", sound: "G", wrong: ["T", "D", "C"] },
  { word: "HAND", sound: "H", wrong: ["N", "D", "B"], glyph: "✋" },
  { word: "JUMP", sound: "J", wrong: ["M", "P", "D"] },
  { word: "LEAF", sound: "L", wrong: ["F", "N", "D"], glyph: "🍃" },
  { word: "MOON", sound: "M", wrong: ["N", "B", "W"], glyph: "🌙" },
  { word: "MILK", sound: "M", wrong: ["L", "K", "N"], glyph: "🥛" },
  { word: "NEST", sound: "N", wrong: ["S", "T", "M"] },
  { word: "NOSE", sound: "N", wrong: ["S", "M", "D"], glyph: "👃" },
  { word: "RAIN", sound: "R", wrong: ["N", "D", "W"], glyph: "🌧️" },
  { word: "ROCK", sound: "R", wrong: ["C", "K", "N"], glyph: "🪨" },
  { word: "SOCK", sound: "S", wrong: ["K", "T", "N"], glyph: "🧦" },
  { word: "SEED", sound: "S", wrong: ["D", "T", "N"] },
  { word: "TENT", sound: "T", wrong: ["N", "D", "P"], glyph: "⛺" },
  { word: "VEST", sound: "V", wrong: ["S", "T", "F"] },
  { word: "WAVE", sound: "W", wrong: ["V", "M", "B"], glyph: "🌊" },
];

/** Five letters. Two syllables, and still nothing arguable at the front. */
const LONGEST_WORDS: readonly PhonicsWord[] = [
  { word: "MOUSE", sound: "M", wrong: ["S", "N", "W"], glyph: "🐭" },
  { word: "HOUSE", sound: "H", wrong: ["S", "N", "B"], glyph: "🏠" },
  { word: "LEMON", sound: "L", wrong: ["M", "N", "D"], glyph: "🍋" },
  { word: "MELON", sound: "M", wrong: ["L", "N", "B"], glyph: "🍈" },
  { word: "ROBOT", sound: "R", wrong: ["B", "T", "D"], glyph: "🤖" },
  { word: "TIGER", sound: "T", wrong: ["G", "R", "D"], glyph: "🐯" },
  { word: "WAGON", sound: "W", wrong: ["G", "N", "M"] },
];

export const PHONICS_WORDS: readonly PhonicsWord[] = [
  ...SHORT_WORDS,
  ...LONGER_WORDS,
  ...LONGEST_WORDS,
];

const WORD_POOLS: LevelTable<readonly PhonicsWord[]> = {
  1: SHORT_WORDS,
  2: [...SHORT_WORDS, ...LONGER_WORDS],
  3: [...LONGER_WORDS, ...LONGEST_WORDS],
};

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/** Could this word be a fair answer to "which one starts with `sound`?" */
function couldAnswer(word: PhonicsWord, sound: string): boolean {
  return word.sound === sound || (SAME_SOUND[sound] ?? []).includes(word.sound);
}

/**
 * Direction one: the word is the question, letters are the answers.
 *
 * `What sound does DOG start with?` — D, B, G.
 */
function askForTheSound(
  entry: PhonicsWord,
  tiles: number,
  rng: Rng,
  level: Level,
) {
  const distractors = pickDistractors(entry.sound, tiles - 1, rng, entry.wrong);

  return {
    prompt: {
      speech: `What sound does ${entry.word} start with?`,
      display: [part(wordItem(entry.word))],
      anchor: wordAnchor(entry.word, level),
    },
    payload: board(entry.sound, distractors, rng, namedLetter),
    explanation: `${entry.word} starts with ${entry.sound}.`,
  };
}

/**
 * Direction two: the letter is the question, words are the answers.
 *
 * `Which word starts with B?` — BALL, SUN, CAT. Every other word on the board
 * is checked against `SAME_SOUND`, so exactly one of them can be right.
 */
function askForTheWord(
  entry: PhonicsWord,
  tiles: number,
  rng: Rng,
  pool: readonly PhonicsWord[],
) {
  const others = pool.filter((word) => !couldAnswer(word, entry.sound));
  const distractors = rng.some(others, tiles - 1).map((word) => word.word);

  return {
    prompt: { speech: `Which word starts with ${entry.sound}?` },
    payload: board(entry.word, distractors, rng, wordItem, wordId),
    explanation: `${entry.word} starts with ${entry.sound}.`,
  };
}

export const beginningSoundsActivity = defineGeneratedActivity({
  id: "beginning-sounds",
  packId: "english",
  title: "Beginning sounds",
  category: "english",
  activityType: "phonics",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const pool = forLevel(WORD_POOLS, level, SHORT_WORDS);
    const entry = rng.pick(pool) ?? SHORT_WORDS[0];
    const tiles = forLevel(TILES, level, 3);

    /* Level 1 only ever shows the word and asks for its letter. Picking a word
       out of three is a harder job — it means reading all three — so it waits
       until the child has met the first shape of the question. */
    const asked =
      level === 1 || rng.next() < 0.5
        ? askForTheSound(entry, tiles, rng, level)
        : askForTheWord(entry, tiles, rng, pool);

    return {
      level,
      ...asked,
      meta: {
        objective: `hears the first sound in ${entry.word}`,
        /* The word, whichever direction it was asked in: "what does DOG start
           with" and "which word starts with D" are one fact used twice. */
        tags: ["phonics", "sounds", `concept:begins:${entry.word.toLowerCase()}`],
      },
    };
  },
});
