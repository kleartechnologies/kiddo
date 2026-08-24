import { defineGeneratedActivity } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import {
  ALPHABET,
  bigLetter,
  board,
  littleLetter,
  namedLetter,
  part,
  pickDistractors,
} from "./shared";

/**
 * Knowing letters: which one is M, and which little m belongs to it.
 *
 * Two activities, because they are the same idea pointed in opposite
 * directions — a name to a shape, and a shape to its other shape — exactly as
 * counting and number recognition are in the Math pack.
 *
 * **On "What letter is this?"** A silent screen cannot ask that honestly: a
 * question that prints M above three tiles and puts M on one of them is
 * answered by matching shapes, without knowing a letter at all. So the letter
 * is named in KIDDO's speech — read aloud by a grown-up, or by a screen reader
 * — and the tiles are the shapes. That is the same bargain Find It and the
 * colours activity already make ("Which one is blue?"), and it is the version
 * a four year old actually learns something from.
 */

/* ------------------------------------------------------------- lookalikes */

/**
 * Letters a child really does mix up, authored rather than guessed.
 *
 * This is the whole distractor policy in one table. A board of M, W, N is a
 * question; a board of M, Z, Q is a spot-the-odd-shape exercise the child
 * passes without knowing anything, and the brief calls that out by name.
 */
const UPPER_LOOKALIKE: Record<string, readonly string[]> = {
  A: ["V", "R", "H"],
  B: ["P", "R", "D", "E"],
  C: ["G", "O", "U", "D"],
  D: ["O", "B", "P", "C"],
  E: ["F", "B", "L"],
  F: ["E", "T", "P"],
  G: ["C", "O", "Q", "S"],
  H: ["N", "M", "A", "K"],
  I: ["L", "T", "J", "H"],
  J: ["I", "L", "U"],
  K: ["X", "R", "H"],
  L: ["I", "J", "T", "E"],
  M: ["W", "N", "H"],
  N: ["M", "H", "W", "Z"],
  O: ["Q", "C", "D", "G"],
  P: ["R", "B", "D", "F"],
  Q: ["O", "G", "C", "D"],
  R: ["P", "B", "K"],
  S: ["Z", "G", "C"],
  T: ["I", "F", "L", "Y"],
  U: ["V", "J", "O", "Y"],
  V: ["W", "U", "Y", "A"],
  W: ["M", "V", "N"],
  X: ["K", "Y", "Z", "V"],
  Y: ["V", "X", "T", "U"],
  Z: ["S", "N", "X"],
};

const LOWER_LOOKALIKE: Record<string, readonly string[]> = {
  a: ["o", "e", "c", "s"],
  b: ["d", "p", "q", "h"],
  c: ["e", "o", "s", "a"],
  d: ["b", "p", "q", "a"],
  e: ["c", "o", "a", "s"],
  f: ["t", "l", "i", "r"],
  g: ["q", "p", "y", "j"],
  h: ["n", "b", "k", "r"],
  i: ["l", "j", "t", "r"],
  j: ["i", "g", "y", "l"],
  k: ["h", "x", "r", "b"],
  l: ["i", "j", "t", "f"],
  m: ["n", "w", "h", "r"],
  n: ["m", "h", "r", "u"],
  o: ["c", "e", "a", "q"],
  p: ["q", "b", "d", "g"],
  q: ["p", "g", "d", "b"],
  r: ["n", "h", "i", "f"],
  s: ["c", "e", "z", "o"],
  t: ["f", "l", "i", "r"],
  u: ["n", "v", "o", "w"],
  v: ["u", "w", "y", "x"],
  w: ["v", "m", "u", "n"],
  x: ["y", "k", "z", "v"],
  y: ["g", "v", "j", "x"],
  z: ["s", "x", "n", "e"],
};

const UPPERCASE = ALPHABET.map((letter) => letter);
const LOWERCASE = ALPHABET.map((letter) => letter.toLowerCase());

/** Everything that is not one of `letter`'s lookalikes: an easy board. */
function unlikeLetters(letter: string, pool: readonly string[]): string[] {
  const alike = new Set(UPPER_LOOKALIKE[letter] ?? []);
  return pool.filter((other) => other !== letter && !alike.has(other));
}

/* ----------------------------------------------- activity 1: recognition */

/**
 * The letters a child meets first — common, and none of them a near-twin of
 * another in this list, so a level 1 board can be built entirely from it.
 */
const EASY_LETTERS = ["A", "B", "C", "D", "E", "F", "H", "K", "M", "O", "P", "S", "T"];

const RECOGNITION_TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

function recognitionPool(level: Level): readonly string[] {
  return level === 1 ? EASY_LETTERS : UPPERCASE;
}

export const letterRecognitionActivity = defineGeneratedActivity({
  id: "letter-recognition",
  packId: "english",
  title: "Knowing letters",
  category: "english",
  activityType: "letter-recognition",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const answer = rng.pick(recognitionPool(level)) ?? "A";
    const tiles = forLevel(RECOGNITION_TILES, level, 3);

    /* The ramp is entirely in the company the answer keeps. Level 1 stands it
       beside letters that look nothing like it, level 3 beside the ones a
       child genuinely has to look twice at. */
    const distractors =
      level === 1
        ? pickDistractors(answer, tiles - 1, rng, unlikeLetters(answer, EASY_LETTERS))
        : level === 2
          ? pickDistractors(answer, tiles - 1, rng, unlikeLetters(answer, UPPERCASE), UPPERCASE)
          : pickDistractors(answer, tiles - 1, rng, UPPER_LOOKALIKE[answer] ?? [], UPPERCASE);

    return {
      level,
      /* No display: the letter is named in the question, and the tiles are the
         answers. `challengeKey` de-duplicates on the board when there is no
         display, which is what makes each different board a new question. */
      prompt: { speech: `Which one is the letter ${answer}?` },
      payload: board(answer, distractors, rng, namedLetter),
      explanation: `Yes, that one is ${answer}.`,
      meta: {
        objective: `picks the letter ${answer} out of ${tiles}`,
        /* The letter, not the board. Twenty-six of them, and finding A beside
           three different sets of wrong tiles is one thing known. */
        tags: ["letters", "alphabet", `concept:letter:${answer.toLowerCase()}`],
      },
    };
  },
});

/* ------------------------------------------------------ activity 2: case */

/**
 * Which letters go in which level, by how much the two cases look alike.
 *
 * `I` and `L` are in none of them. In this typeface — in most typefaces — a
 * lower case `l` and a capital `I` are the same vertical stroke, so a question
 * built on either has two defensible answers. That is one letter of content
 * given up to keep a promise the brief makes twice, and it is worth it.
 */
const CASE_ALIKE = ["C", "O", "S", "V", "W", "X", "Z", "K", "P", "U"];
const CASE_MIDDLE = ["J", "Y", "T", "F", "M", "N", "H"];
const CASE_DIFFERENT = ["A", "B", "D", "E", "G", "Q", "R"];

const CASE_POOLS: LevelTable<readonly string[]> = {
  1: CASE_ALIKE,
  2: [...CASE_ALIKE, ...CASE_MIDDLE],
  3: CASE_DIFFERENT,
};

/** A board of one case only, so nothing on it can be read as the other. */
function caseBoard(answer: string, rng: Rng, toLower: boolean) {
  const alike = toLower ? LOWER_LOOKALIKE[answer] : UPPER_LOOKALIKE[answer];
  const pool = toLower ? LOWERCASE : UPPERCASE;
  const distractors = pickDistractors(answer, 2, rng, alike ?? [], pool);
  return board(answer, distractors, rng, toLower ? littleLetter : bigLetter);
}

export const letterCaseActivity = defineGeneratedActivity({
  id: "letter-case",
  packId: "english",
  title: "Big and little letters",
  category: "english",
  activityType: "letter-case",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const letter = rng.pick(forLevel(CASE_POOLS, level, CASE_ALIKE)) ?? "C";
    const lower = letter.toLowerCase();

    /* Both directions, so the pair is learned rather than one half of it. The
       relationship is `toUpperCase`, so the right answer is never a judgement
       call — which is what "deterministic" means for this activity. */
    const toLower = rng.next() < 0.5;

    return {
      level,
      prompt: {
        speech: toLower
          ? `Big ${letter}. Which little letter matches?`
          : `Little ${lower}. Which big letter matches?`,
        display: [part(toLower ? bigLetter(letter) : littleLetter(lower))],
      },
      payload: caseBoard(toLower ? lower : letter, rng, toLower),
      explanation: `Big ${letter} and little ${lower} are the same letter.`,
      meta: {
        objective: `matches ${letter} to ${lower}`,
        /* The pair, either way round: being shown a big A and asked for the
           little one is the same thing to know as the reverse, so both name
           the same concept and a round asks it once. */
        tags: ["letters", "case", `concept:case:${lower}`],
      },
    };
  },
});
