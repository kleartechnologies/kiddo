import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import { SAME_SOUND } from "./phonics";
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
 * Ending sounds — what a word finishes with.
 *
 * `beginning-sounds` teaches the front of a word and `rhyming-partners`
 * teaches that two words finish alike. This is the piece between them: not
 * *which words end the same*, but *what sound is at the end of this one*. It
 * is the harder half of hearing a word, because the front of a word is the
 * part a child says loudest, and it is what makes writing one possible —
 * spelling DOG needs the /g/ heard as its own thing.
 *
 * Authored vocabulary, generated questions, and asked in both directions —
 * the same shape as `phonics.ts`, which is deliberate: the two activities are
 * mirror images and reading like each other is a feature.
 *
 * ## What is deliberately not here
 *
 * - **Blends.** NEST ends in /st/ and TENT in /nt/. A child answering "st" has
 *   not made a mistake, and the brief rules out anything that arguable.
 * - **Digraphs.** FISH ends in /ʃ/, written with two letters, neither of which
 *   says it alone.
 * - **Silent letters.** CAKE ends in /k/ and the last letter is E.
 * - **X.** BOX ends in /ks/, which is two sounds.
 * - **Words ending in R.** CAR and DOOR end in a sound in some accents and a
 *   vowel in others. A question whose answer depends on where the child lives
 *   is not a question this app will ask.
 */

/** A word, and the single consonant sound it ends with. */
interface EndingWord {
  word: string;
  /** The letter the last sound is written with. Upper case, like the tiles. */
  sound: string;
  /**
   * Wrong letters worth offering: a consonant that sits near the answer, or a
   * letter that really is in the word somewhere else. Never one that could
   * also be a fair answer — `SAME_SOUND` is checked by a test.
   */
  wrong: readonly string[];
}

/** Three letters, one clear consonant at the end. */
const SHORT_WORDS: readonly EndingWord[] = [
  { word: "CAT", sound: "T", wrong: ["D", "P", "C"] },
  { word: "HAT", sound: "T", wrong: ["D", "P", "H"] },
  { word: "NET", sound: "T", wrong: ["D", "P", "N"] },
  { word: "POT", sound: "T", wrong: ["D", "B", "P"] },
  { word: "DOG", sound: "G", wrong: ["K", "D", "B"] },
  { word: "JUG", sound: "G", wrong: ["K", "D", "B"] },
  { word: "BAG", sound: "G", wrong: ["K", "B", "D"] },
  { word: "LEG", sound: "G", wrong: ["K", "L", "D"] },
  { word: "SUN", sound: "N", wrong: ["M", "S", "D"] },
  { word: "VAN", sound: "N", wrong: ["M", "V", "D"] },
  { word: "HEN", sound: "N", wrong: ["M", "H", "D"] },
  { word: "PEN", sound: "N", wrong: ["M", "P", "D"] },
  { word: "TEN", sound: "N", wrong: ["M", "T", "D"] },
  { word: "MAN", sound: "N", wrong: ["M", "D", "B"] },
  { word: "BUS", sound: "S", wrong: ["T", "B", "F"] },
  { word: "YES", sound: "S", wrong: ["T", "Y", "F"] },
  { word: "MAP", sound: "P", wrong: ["B", "M", "T"] },
  { word: "CUP", sound: "P", wrong: ["B", "C", "T"] },
  { word: "TOP", sound: "P", wrong: ["B", "T", "D"] },
  { word: "ZIP", sound: "P", wrong: ["B", "Z", "T"] },
  { word: "WEB", sound: "B", wrong: ["P", "W", "D"] },
  { word: "BED", sound: "D", wrong: ["T", "B", "P"] },
  { word: "MUD", sound: "D", wrong: ["T", "M", "B"] },
  { word: "RED", sound: "D", wrong: ["T", "R", "B"] },
  { word: "JAM", sound: "M", wrong: ["N", "J", "B"] },
];

/** Four letters, still one consonant at the end. */
const LONGER_WORDS: readonly EndingWord[] = [
  { word: "BOAT", sound: "T", wrong: ["D", "B", "P"] },
  { word: "GOAT", sound: "T", wrong: ["D", "G", "P"] },
  { word: "FLAG", sound: "G", wrong: ["K", "F", "D"] },
  { word: "MOON", sound: "N", wrong: ["M", "D", "B"] },
  { word: "RAIN", sound: "N", wrong: ["M", "R", "D"] },
  { word: "SEED", sound: "D", wrong: ["T", "S", "B"] },
  { word: "DRUM", sound: "M", wrong: ["N", "D", "B"] },
  { word: "BOOK", sound: "K", wrong: ["T", "B", "P"] },
  { word: "DUCK", sound: "K", wrong: ["T", "D", "P"] },
  { word: "ROCK", sound: "K", wrong: ["T", "R", "P"] },
  { word: "SOCK", sound: "K", wrong: ["T", "S", "P"] },
  { word: "LEAF", sound: "F", wrong: ["V", "L", "P"] },
];

/** Five letters. Longer to hold, same single sound at the end. */
const LONGEST_WORDS: readonly EndingWord[] = [
  { word: "SHEEP", sound: "P", wrong: ["B", "T", "D"] },
  { word: "TRAIN", sound: "N", wrong: ["M", "T", "D"] },
  { word: "CLOUD", sound: "D", wrong: ["T", "C", "B"] },
  { word: "BREAD", sound: "D", wrong: ["T", "B", "P"] },
  { word: "BLOCK", sound: "K", wrong: ["T", "B", "P"] },
];

/**
 * Every word this activity knows: forty-two of them, and the honest count of
 * what it teaches. A board is a shuffle; a word and the sound it ends with is
 * the thing that was learned.
 */
export const ENDING_WORDS: readonly EndingWord[] = [
  ...SHORT_WORDS,
  ...LONGER_WORDS,
  ...LONGEST_WORDS,
];

const WORD_POOLS: LevelTable<readonly EndingWord[]> = {
  1: SHORT_WORDS,
  2: [...SHORT_WORDS, ...LONGER_WORDS],
  3: [...LONGER_WORDS, ...LONGEST_WORDS],
};

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/** Could this word be a fair answer to "which one ends with `sound`?" */
export function couldEnd(word: EndingWord, sound: string): boolean {
  return word.sound === sound || (SAME_SOUND[sound] ?? []).includes(word.sound);
}

/**
 * Direction one: the word is the question, letters are the answers.
 *
 * `What sound does DOG end with?` — G, K, D.
 */
function askForTheSound(entry: EndingWord, tiles: number, rng: Rng) {
  const distractors = pickDistractors(entry.sound, tiles - 1, rng, entry.wrong);

  return {
    prompt: {
      speech: `What sound does ${entry.word} end with?`,
      display: [part(wordItem(entry.word))],
      anchor: wordAnchor(entry.word),
    },
    payload: board(entry.sound, distractors, rng, namedLetter),
    explanation: `${entry.word} ends with ${entry.sound}.`,
  };
}

/**
 * Direction two: the letter is the question, words are the answers.
 *
 * `Which word ends with N?` — SUN, CAT, MAP. Every other word on the board is
 * checked against `SAME_SOUND`, so exactly one of them can be right.
 */
function askForTheWord(
  entry: EndingWord,
  tiles: number,
  rng: Rng,
  pool: readonly EndingWord[],
) {
  const others = pool.filter((word) => !couldEnd(word, entry.sound));
  const distractors = rng.some(others, tiles - 1).map((word) => word.word);

  return {
    prompt: { speech: `Which word ends with ${entry.sound}?` },
    payload: board(entry.word, distractors, rng, wordItem, wordId),
    explanation: `${entry.word} ends with ${entry.sound}.`,
  };
}

export const endingSoundsActivity = defineGeneratedActivity({
  id: "ending-sounds",
  packId: "english",
  title: "Ending sounds",
  category: "english",
  activityType: "ending-sounds",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = forLevel(WORD_POOLS, level, SHORT_WORDS);
    const entry = rng.pick(pool) ?? SHORT_WORDS[0];
    const tiles = forLevel(TILES, level, 3);

    /* Level 1 only ever shows the word and asks for its letter. Picking a word
       out of three means reading all three, which is a harder job, so it waits
       until the child has met the first shape of the question. */
    const asked =
      level === 1 || rng.next() < 0.5
        ? askForTheSound(entry, tiles, rng)
        : askForTheWord(entry, tiles, rng, pool);

    return {
      level,
      ...asked,
      hint: "Say the word slowly and stop at the very end.",
      meta: {
        objective: `hears the last sound in ${entry.word}`,
        tags: ["family:word", `concept:ends:${entry.word.toLowerCase()}`],
      },
    };
  },
});
