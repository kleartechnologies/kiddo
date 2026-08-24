import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { illustratedAtLevel, type ArtId } from "../../art";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";
import { ALPHABET, bigLetter, letterId } from "./shared";

/**
 * The alphabet, in order — English's first **order** activity.
 *
 * Every other activity in this pack is a `choice`: here is a question, here
 * are four tiles, one of them is right. This one hands the child a short run
 * of letters in the wrong order and asks them to put it right, which is a
 * different thing to be good at. Knowing that `N` comes after `M` is not the
 * same as recognising an `N`, and a child who can sing the alphabet often
 * cannot yet *use* it — this is the activity where singing it becomes doing
 * something with it.
 *
 * No new engine. `OrderStage` draws this exactly as it draws the reference
 * counting activity, and could not tell you it was about letters; the
 * `ChallengeKind` is `order` and the `ActivityType` is `letter-sequence`,
 * which is one new word in a union and nothing else anywhere.
 *
 * ## How a level gets harder
 *
 * Three ways, and none of them is a clock. The run gets **longer** (three
 * tiles, then four, then five). The run comes from **further into the
 * alphabet** — a child knows where `B` goes long before they know where `V`
 * goes, so early levels stay in the letters that get sung the loudest. And
 * the tray is **more scrambled**: at level one two tiles are out of place, at
 * level three every single one is, so there is no letter that can be left
 * where it was found.
 *
 * Nothing here gets faster, nothing is taken away for a tile that goes back,
 * and a child who takes a minute over one board sees exactly the board a
 * child who takes four seconds sees.
 */

/**
 * The picture a letter is for, where the library has drawn one.
 *
 * MODE 2 — the middle rung of the ladder. The letter is the item and the
 * picture hangs above it, smaller, the way it does on every alphabet frieze
 * ever pinned above a classroom door: a child who does not yet recognise a `D`
 * recognises a dog, and hears the sound in it.
 *
 * `A` to `F` and then a hole at `G`, which is deliberate rather than lazy. This
 * activity deals runs of *consecutive* letters, so what a picture is worth here
 * is entirely a question of whether a whole run is covered — `A B C` with two
 * pictures and a gap is worse than `A B C` with none. Six consecutive letters
 * cover four of the eight runs level one can deal; a seventh drawing would be
 * worth one more run, and `G` is genuinely hard to draw for a four year old
 * (goat, grapes and giraffe are all the wrong shape at 48px).
 *
 * There is no `H is for hat` here even though the hat exists, and that is the
 * same rule: an `H` with a picture on it can only ever appear in `F G H`,
 * `G H I` or `H I J`, and `G` has no drawing, so it would never once be shown.
 */
const LETTER_ART: Readonly<Record<string, ArtId>> = {
  A: "food.apple",
  B: "object.ball",
  C: "animal.cat",
  D: "animal.dog",
  E: "food.egg",
  F: "animal.fish",
};

/**
 * How many tiles a board asks for, by level.
 *
 * Three is the smallest run that is an ordering at all — two tiles is a
 * question with one wrong answer, which is a `choice`. Five is a ceiling
 * rather than a step: five tiles is as wide as a 360px phone holds with each
 * one still comfortably bigger than a fingertip, and `resolveLevel` has
 * already snapped anything above level 3 down to 3 before it arrives here.
 */
function lettersAtLevel(level: Level): number {
  if (level <= 1) return 3;
  if (level === 2) return 4;
  return 5;
}

/**
 * How far into the alphabet a level is allowed to reach.
 *
 * `A` to `J` first, because those are the letters a four year old has heard
 * most and the part of the song nobody garbles. Then out to `S`. Then the
 * whole thing, including the run at the end that even the song rushes.
 */
function windowAtLevel(level: Level): readonly string[] {
  if (level <= 1) return ALPHABET.slice(0, 10);
  if (level === 2) return ALPHABET.slice(0, 19);
  return ALPHABET;
}

/**
 * The fewest tiles that may still be sitting where the child found them.
 *
 * A shuffle that leaves most of the run already in place is a board the child
 * finishes by moving one tile, and at level three a tile left alone would be
 * a tile that never had to be thought about. So the floor rises with the
 * level, and at level three it is the whole board: a *derangement*, every
 * letter somewhere it does not belong.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/**
 * The tray.
 *
 * Shuffled until enough tiles have moved, which on three letters is five
 * arrangements in six and on five letters is nearly all of them, so the loop
 * almost never runs twice. When it does run out of attempts it falls back to
 * rotating the run by one — an arrangement that displaces *every* position
 * whatever the length, so it satisfies any floor this file can ask for, and
 * unlike re-rolling it always terminates.
 */
function trayOrder(
  values: readonly string[],
  rng: Rng,
  displaced: number,
): string[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(values);
    const moved = shuffled.filter((v, index) => v !== values[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...values.slice(1), values[0]];
}

/**
 * Every run this activity can ever deal. The honest content count.
 *
 * Three levels of runs, not the tens of thousands of trays they can be handed
 * over in: a child who has done `M N O P` scrambled one way has learned the
 * same thing as a child who did it scrambled another, and `conceptKey` is
 * told so by the tag below.
 */
export const ALPHABET_RUNS: readonly string[] = ([1, 2, 3] as const).flatMap(
  (level) => {
    const count = lettersAtLevel(level);
    const window = windowAtLevel(level);
    return window
      .slice(0, window.length - count + 1)
      .map((_, start) => window.slice(start, start + count).join("-"));
  },
);

export const alphabetOrderActivity = defineGeneratedActivity({
  id: "alphabet-order",
  packId: "english",
  title: "Alphabet Order",
  category: "english",
  activityType: "letter-sequence",
  kind: "order",
  ageRange: { min: 5, max: 8 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const count = lettersAtLevel(level);
    const window = windowAtLevel(level);

    /* A run of *consecutive* letters, so the answer is one order and not
       several. With a gap in it the board is still solvable, but "what comes
       next" quietly stops being the question a child can sing their way to. */
    const start = rng.int(0, window.length - count);
    const values = window.slice(start, start + count);

    /* All of the run or none of it.
     *
     * Not because a picture would give the order away — it could not; nothing
     * about an apple says it comes before a ball — but because a tray with a
     * picture on two tiles and nothing on the third is a tray with two tiles
     * that look important. In an activity whose whole question is "which of
     * these comes first", that is the one distraction worth refusing.
     *
     * The run is still chosen from the full window, which matters more than it
     * looks: `ALPHABET_RUNS` counts three-letter runs and level one is the only
     * level that deals them, so narrowing the *choice* to the drawn letters
     * would delete `E F G` through `H I J` from the product entirely. This way
     * a child meets every run and four of the eight arrive with pictures. */
    const anchored =
      illustratedAtLevel(level) &&
      values.every((letter) => LETTER_ART[letter] !== undefined);

    const items: OrderItem[] = trayOrder(
      values,
      rng,
      displacedAtLevel(level, count),
    ).map((letter) => ({
      id: letterId(letter),
      item: bigLetter(letter, anchored ? LETTER_ART[letter] : undefined),
    }));

    return {
      level,
      prompt: { speech: "Can you put these letters in alphabet order?" },
      payload: {
        kind: "order",
        items,
        answerOrder: values.map(letterId),
      },
      explanation: "That's the alphabet order!",
      hint: "Sing the alphabet. Which of these do you hear first?",
      meta: {
        objective: "puts letters into alphabetical order",
        tags: ["family:letter", `concept:alphabet:${values.join("-")}`],
      },
    };
  },
});
