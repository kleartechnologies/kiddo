import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import { board, namedLetter, pickDistractors, wordAnchor, wordWithGap } from "./shared";

/**
 * Spelling — one letter missing from a short, familiar word.
 *
 * `C _ T`, and three letters to finish it with.
 *
 * The whole activity turns on one authored field, `wrong`. Take the vowel out
 * of HAT and offer A, I, O and you have written a question with four right
 * answers: HAT, HIT, HOT and HUT are all words. So every entry below lists the
 * letters that leave the gap with *no* real word in it, checked by hand, and
 * words with no clean pair of them — HAT, BED, BALL, LEG — are simply not in
 * the list. Fewer words, every one of them fair. The brief asks for that
 * trade in as many words.
 *
 * KIDDO also says the word out loud before asking, which is the second half of
 * the same promise: a child who cannot yet read the two letters on the stage
 * is still being asked something answerable.
 */

interface SpellingWord {
  word: string;
  /** Which letter is taken out, 0-based. */
  at: number;
  /**
   * Letters that fit the gap and make nothing. Vowels, in the vowel gaps,
   * because a vowel is what a child is choosing between — swapping a
   * consonant out of a three letter word offers B, V, Z and teaches nothing.
   */
  wrong: readonly string[];
}

/** Three letters. Take the vowel out and the word is still recognisable. */
const SHORT_WORDS: readonly SpellingWord[] = [
  { word: "CAT", at: 1, wrong: ["E", "I"] },
  { word: "DOG", at: 1, wrong: ["A", "E"] },
  { word: "SUN", at: 1, wrong: ["A", "E"] },
  { word: "BUS", at: 1, wrong: ["A", "E", "O"] },
  { word: "CUP", at: 1, wrong: ["E", "I"] },
  { word: "JET", at: 1, wrong: ["A", "I"] },
  { word: "FOX", at: 1, wrong: ["E", "U"] },
  { word: "MAP", at: 1, wrong: ["E", "I", "U"] },
  { word: "JAM", at: 1, wrong: ["E", "O", "U"] },
  { word: "VAN", at: 1, wrong: ["E", "I", "U"] },
  { word: "WEB", at: 1, wrong: ["A", "I", "O", "U"] },
  { word: "ZIP", at: 1, wrong: ["E", "O", "U"] },
  { word: "BOX", at: 1, wrong: ["A", "E", "I", "U"] },
  { word: "HEN", at: 1, wrong: ["A", "I"] },
  { word: "YES", at: 1, wrong: ["A", "I", "O", "U"] },
  { word: "ANT", at: 0, wrong: ["E", "I", "O", "U"] },
  { word: "EGG", at: 0, wrong: ["A", "I", "O"] },
  { word: "INK", at: 0, wrong: ["A", "E", "O"] },
];

/** Four letters, and the first gaps that are not the second letter. */
const LONGER_WORDS: readonly SpellingWord[] = [
  { word: "FISH", at: 1, wrong: ["E", "O", "U"] },
  { word: "MILK", at: 1, wrong: ["A", "E", "O"] },
  { word: "NEST", at: 1, wrong: ["A", "I", "O"] },
  { word: "HAND", at: 1, wrong: ["E", "O", "U"] },
  { word: "MOON", at: 1, wrong: ["A", "E", "I"] },
  { word: "NOSE", at: 1, wrong: ["A", "E", "I"] },
  { word: "GOAT", at: 1, wrong: ["E", "I", "U"] },
  { word: "LEAF", at: 1, wrong: ["I", "U"] },
  { word: "CAKE", at: 1, wrong: ["E", "I"] },
  { word: "TENT", at: 1, wrong: ["A", "O", "U"] },
  { word: "WAVE", at: 1, wrong: ["E", "U"] },
  { word: "SEED", at: 1, wrong: ["A", "I", "O"] },
  { word: "BOOK", at: 2, wrong: ["A", "E", "I"] },
  { word: "STAR", at: 2, wrong: ["E", "O", "U"] },
  { word: "TREE", at: 2, wrong: ["A", "I", "O"] },
  { word: "STOP", at: 2, wrong: ["A", "I", "U"] },
  { word: "FLAG", at: 2, wrong: ["E", "I", "U"] },
  { word: "DRUM", at: 2, wrong: ["E", "I", "O"] },
  { word: "RAIN", at: 2, wrong: ["E", "O", "U"] },
];

/** Five letters. Longer words, and gaps further into them. */
const LONGEST_WORDS: readonly SpellingWord[] = [
  { word: "MOUSE", at: 2, wrong: ["A", "E", "I"] },
  { word: "HOUSE", at: 2, wrong: ["A", "E", "I"] },
  { word: "SNAKE", at: 2, wrong: ["E", "I", "O", "U"] },
  { word: "SMILE", at: 2, wrong: ["A", "E", "O", "U"] },
  { word: "STONE", at: 2, wrong: ["A", "I", "U"] },
  { word: "PLANE", at: 2, wrong: ["E", "I", "O", "U"] },
  { word: "SPOON", at: 2, wrong: ["A", "E", "I", "U"] },
  { word: "BLOCK", at: 2, wrong: ["E", "I", "U"] },
  { word: "GREEN", at: 2, wrong: ["A", "I", "O", "U"] },
  { word: "SHEEP", at: 2, wrong: ["A", "I", "O", "U"] },
  { word: "BREAD", at: 2, wrong: ["A", "I", "U"] },
  { word: "TRAIN", at: 3, wrong: ["E", "O", "U"] },
  { word: "CLOUD", at: 3, wrong: ["A", "E", "I"] },
  { word: "GRAPE", at: 4, wrong: ["A", "I", "O", "U"] },
  { word: "APPLE", at: 0, wrong: ["E", "I", "O", "U"] },
];

export const SPELLING_WORDS: readonly SpellingWord[] = [
  ...SHORT_WORDS,
  ...LONGER_WORDS,
  ...LONGEST_WORDS,
];

const WORD_POOLS: LevelTable<readonly SpellingWord[]> = {
  1: SHORT_WORDS,
  2: [...SHORT_WORDS, ...LONGER_WORDS],
  3: [...LONGER_WORDS, ...LONGEST_WORDS],
};

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

export const spellingActivity = defineGeneratedActivity({
  id: "spelling",
  packId: "english",
  title: "Finishing words",
  category: "english",
  activityType: "spelling",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const pool = forLevel(WORD_POOLS, level, SHORT_WORDS);
    const entry = rng.pick(pool) ?? SHORT_WORDS[0];
    const answer = entry.word[entry.at];
    const tiles = forLevel(TILES, level, 3);

    return {
      level,
      prompt: {
        /* The word is said before it is spelled, so the question is answerable
           without reading the stage — and so the gap has exactly one intended
           filling even for a child who guesses at the letters around it. */
        speech: `Let's spell ${entry.word}. Which letter is missing?`,
        display: wordWithGap(entry.word, entry.at),
        /* The word, as a thing rather than as letters — the sun over S _ N.
           This is what lets a child who cannot read yet know what they are
           spelling. */
        anchor: wordAnchor(entry.word, level),
      },
      payload: board(
        answer,
        pickDistractors(answer, tiles - 1, rng, entry.wrong),
        rng,
        namedLetter,
      ),
      explanation: `${entry.word} is spelled ${[...entry.word].join(", ")}.`,
      meta: {
        objective: `finishes ${entry.word}`,
        /* The word and the letter taken out of it. The same word with a
           different gap is a different thing to work out. */
        tags: ["spelling", "words", `concept:spell:${entry.word.toLowerCase()}@${entry.at}`],
      },
    };
  },
});
