import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";
import { bigLetter, letterId } from "./shared";
import { SPELLING_WORDS } from "./spelling";

/**
 * Building a word out of its letters.
 *
 * `spelling` takes one letter out of a word and asks which one is missing;
 * this hands over every letter, in the wrong order, and asks for the word.
 * Both teach spelling and they are not the same job. Choosing A over E in
 * `C _ T` can be done by sound alone. Laying C, A, T out in that order means
 * holding the whole word while deciding where each letter goes, which is what
 * writing a word actually is.
 *
 * So it borrows the `spelling` activity type from the quiz that already
 * teaches it, and it is an `order` — `OrderStage` draws it exactly as it draws
 * the alphabet, and could not tell you it was about a word.
 *
 * ## Every letter on the board is different, on purpose
 *
 * The rule that decides which words are here. Build MOON from M, O, O, N and
 * the child has two identical tiles: whichever O they put in the third slot,
 * one arrangement is marked and the other is not, and the two are impossible
 * to tell apart by looking. That is a board that can be got wrong by being
 * right. So words with a repeated letter — MOON, TREE, BOOK, EGG, APPLE — are
 * filtered out of the pool, and what is left is every word in the pack's
 * spelling table whose letters are all different.
 *
 * ## How a level gets harder
 *
 * | | letters | tray |
 * |-|---------|------|
 * |1| 3 | at least two tiles moved |
 * |2| 4 | at least three moved |
 * |3| 5 | every tile moved |
 *
 * Longer words, and a tray with less of the answer left lying in it. Nothing
 * gets faster, nothing is taken away for a tile that goes back, and the word
 * is said out loud before the board is dealt so a child who cannot yet read
 * the tray is still being asked something answerable.
 */

/** Could this word be built from tiles a child can tell apart? */
function buildable(word: string): boolean {
  return new Set(word).size === word.length;
}

/**
 * The words this activity can deal, taken from the pack's spelling table.
 *
 * Read out of `SPELLING_WORDS` rather than written again: they are already the
 * right words — short, familiar, checked by hand — and one table that two
 * activities read cannot drift the way two tables would.
 */
const WORDS: readonly string[] = SPELLING_WORDS.map((entry) => entry.word).filter(
  buildable,
);

/** The honest content count: how many words there are to build here. */
export const BUILDABLE_WORDS: readonly string[] = WORDS;

/** Which words a level deals. Exactly the ones of its length. */
function poolAtLevel(level: Level): readonly string[] {
  const length = level <= 1 ? 3 : level === 2 ? 4 : 5;
  return WORDS.filter((word) => word.length === length);
}

/**
 * The fewest tiles that may still be sitting where the child found them.
 *
 * The same rule `english.alphabet-order` and `math.number-order` use: a tray
 * that is mostly already spelled is a board finished by moving one tile.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/** The tray. Shuffled until enough has moved, then rotated as a fallback. */
function trayOrder(letters: readonly string[], rng: Rng, displaced: number): string[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(letters);
    const moved = shuffled.filter((letter, index) => letter !== letters[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...letters.slice(1), letters[0]];
}

export const wordBuildActivity = defineGeneratedActivity({
  id: "word-build",
  packId: "english",
  category: "english",
  activityType: "spelling",
  kind: "order",
  ageRange: { min: 5, max: 8 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const word = pool[rng.int(0, pool.length - 1)];
    const letters = [...word];

    const items: OrderItem[] = trayOrder(
      letters,
      rng,
      displacedAtLevel(level, letters.length),
    ).map((letter) => ({ id: letterId(letter), item: bigLetter(letter) }));

    return {
      level,
      /* The word is said, not shown: showing it would make the board a copying
         exercise. Said, it is a spelling one. */
      prompt: { speech: `Can you build the word ${word}?` },
      payload: { kind: "order", items, answerOrder: letters.map(letterId) },
      explanation: `${word} is spelled ${letters.join(", ")}.`,
      hint: "Say the word slowly. Which sound comes first?",
      meta: {
        objective: `builds ${word} from its letters`,
        tags: ["family:letter", `concept:build:${word.toLowerCase()}`],
      },
    };
  },
});
