import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import {
  board,
  concept,
  letterSym,
  numberSym,
  SHAPES,
  shapeSym,
  wordSym,
  type Sym,
} from "./shared";
import { groupsBeside, WORD_GROUPS, type WordGroup } from "./words";

/**
 * Sorting — putting a thing in the group it belongs to.
 *
 * The same knowledge as odd one out, asked from the other end. There, three
 * things share a group and the child finds the one that does not; here, the
 * group is named and the child finds the one that does. Both are
 * classification, and a child who can do one cannot always do the other, which
 * is why they are two activities and not one asked twice.
 *
 * **This is a `choice` challenge, and there is no drag and drop.** Sorting is
 * usually drawn as dragging tiles into buckets, and dragging is a genuinely
 * different gesture — it would be a fourth `ChallengeKind` and an engine of its
 * own. It would also be the wrong gesture: a four year old on a phone drops
 * things. "Which one is an animal?" is the same classification, answered by
 * the tap the whole product is built on, so that is what this is. The day
 * dragging earns its place it arrives as `order`, which already exists.
 *
 * Two shapes of question:
 *
 * - **Level 1 sorts by kind** — a letter, a number and a shape on the board,
 *   and one of the first two named. No reading, and nothing to know beyond
 *   what a letter is, which is the very first sort a child is ever asked for.
 * - **Levels 2 and 3 sort by meaning** — the groups in `words.ts`, with every
 *   distractor drawn from a group that is allowed to sit beside the one being
 *   asked for. `canMix` is what stops "which one is something to eat?" being
 *   asked with an apple on the board.
 */

/* ------------------------------------------------------------- by kind */

/**
 * Letters that cannot be mistaken for something else on the board.
 *
 * No `I` or `L` — in Fredoka they are the same stroke. No `O`, which beside a
 * circle is a question about handwriting rather than about letters.
 */
const LETTERS = ["A", "B", "C", "D", "E", "K", "M", "P", "S", "T"] as const;

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface Sorted {
  answer: Sym;
  distractors: Sym[];
  speech: string;
  explanation: string;
  hint: string;
  idea: readonly (string | number)[];
}

/**
 * A letter, a number and a shape, with one of them named.
 *
 * The shape is always on the board and never the answer: it is what makes the
 * question a sort rather than a straight pick between two things.
 */
function byKind(rng: Rng): Sorted {
  const letter = rng.pick(LETTERS) ?? "A";
  const number = rng.pick(NUMBERS) ?? 1;
  const shape = rng.pick(SHAPES) ?? "circle";

  const wantsLetter = rng.next() < 0.5;
  const letterTile = letterSym(letter);
  const numberTile = numberSym(number);
  const answer = wantsLetter ? letterTile : numberTile;
  const other = wantsLetter ? numberTile : letterTile;

  return {
    answer,
    distractors: [other, shapeSym(shape)],
    speech: wantsLetter ? "Which one is a letter?" : "Which one is a number?",
    explanation: wantsLetter
      ? `${letter} is a letter.`
      : `${number} is a number.`,
    hint: wantsLetter
      ? "Letters are the things words are made of."
      : "Numbers are the things you count with.",
    idea: [
      "sorting",
      "kind",
      wantsLetter ? "letter" : "number",
      wantsLetter ? letter : number,
    ],
  };
}

/* ---------------------------------------------------------- by meaning */

function byGroup(rng: Rng, tiles: number): Sorted {
  const group = rng.pick(WORD_GROUPS) ?? WORD_GROUPS[0];
  const word = rng.pick(group.words) ?? group.words[0];

  /* One distractor per other group where there are enough groups to go round,
     so a board never quietly grows a second majority. */
  const beside = rng.shuffle(groupsBeside(group));
  const distractors = distinctWords(word, tiles - 1, (index) => {
    const from: WordGroup = beside[index % beside.length] ?? beside[0];
    return rng.pick(from.words) ?? from.words[0];
  });

  return {
    answer: wordSym(word),
    distractors: distractors.map(wordSym),
    speech: `Which one is ${group.asks}?`,
    explanation: `${word} is ${group.one}.`,
    hint: `Think about what each one is. One of them is ${group.asks}.`,
    idea: ["sorting", "words", group.id, word],
  };
}

/**
 * `count` words, all different from each other and from the answer.
 *
 * Two tiles reading the same word would be two right answers, or none, so a
 * repeat is drawn again rather than dropped: dropping it would quietly shrink
 * the board, and a three tile question is meant to have three tiles.
 */
function distinctWords(
  answer: string,
  count: number,
  draw: (index: number) => string,
): string[] {
  const seen = new Set([answer]);
  const words: string[] = [];

  for (let index = 0; words.length < count && index < count * ATTEMPTS; index++) {
    const word = draw(index);
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words;
}

/** Draws per tile before giving up. The groups are far bigger than a board. */
const ATTEMPTS = 8;

/* ----------------------------------------------------------- activity */

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

export const sortingActivity = defineGeneratedActivity({
  id: "sorting",
  packId: "logic",
  title: "Sorting things into groups",
  category: "logic",
  activityType: "sorting",
  kind: "choice",
  ageRange: { min: 4, max: 8 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const sorted = level === 1 ? byKind(rng) : byGroup(rng, forLevel(TILES, level, 3));

    return {
      level,
      prompt: { speech: sorted.speech },
      payload: board(sorted.answer, sorted.distractors, rng),
      explanation: sorted.explanation,
      hint: sorted.hint,
      meta: {
        objective: "puts a thing in the group it belongs to",
        tags: ["sorting", concept(...sorted.idea)],
      },
    };
  },
});
