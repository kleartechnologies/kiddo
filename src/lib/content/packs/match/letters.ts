import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { ConnectPair } from "../../types";
import { letterId } from "../english/shared";
import {
  bigCards,
  canonical,
  concept,
  confusablePairsWithin,
  displace,
  LETTER_POOLS,
  littleCards,
  pickLetters,
} from "./shared";

/**
 * Big letters and their little friends.
 *
 * The pack's first activity, and a `connect` challenge: two shelves of cards,
 * capitals on one and lower case on the other, and every capital has exactly
 * one partner hiding among them. `MatchStage` draws it; nothing in this file
 * knows that, and nothing in this file knows a game exists.
 *
 * ## Where the difficulty comes from
 *
 * Three things move between levels, and only one of them is the number of
 * pairs. A board of five easy letters is not harder than a board of three —
 * it is longer. So:
 *
 * | | pairs | pool | collisions allowed | one planted |
 * |-|-------|------|--------------------|-------------|
 * |1| 3 | the ten most familiar | none | no |
 * |2| 4 | eighteen | one | no |
 * |3| 5 | all twenty-four | two | yes |
 *
 * A collision is two letters on the same board that are hard to tell apart —
 * `b` and `d`, `m` and `w`. Level 1 forbids them outright, so a child who has
 * only just met letters is never asked to split hairs. Level 3 *plants* one,
 * which is the difference between a hard board and a lucky one.
 *
 * Levels 4 and 5 are not authored, which is the house convention: an activity
 * offers what its rule actually knows how to make and `resolveLevel` snaps a
 * request above that down to the top of the range.
 */

const POOLS: LevelTable<readonly string[]> = {
  1: LETTER_POOLS.FAMILIAR,
  2: LETTER_POOLS.WIDER,
  3: LETTER_POOLS.FULL,
};

/** Three is the smallest board worth searching; five is what a phone holds. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 5 };

/** How many hard-to-split pairs a board may contain. */
const ALLOWANCE: LevelTable<number> = { 1: 0, 2: 1, 3: 2 };

/** Whether one collision is put there on purpose rather than left to chance. */
const PLANTED: LevelTable<boolean> = { 1: false, 2: false, 3: true };

/**
 * The same instruction, said several ways.
 *
 * Not decoration. A child who plays ten boards in a row hears the host ten
 * times, and a sentence repeated ten times stops being speech and becomes a
 * label. Seeded like everything else, so a given board always says its own
 * line.
 */
const INVITATIONS = [
  "Every big letter is looking for its little friend.",
  "Can you find the little letter that goes with each big one?",
  "Which little letter belongs with each big letter?",
  "Put every big letter together with its little friend.",
  "Each big letter has a little friend hiding here. Find them!",
] as const;

/** Said when the last pair settles. Never a score, never a grade. */
const CHEERS = [
  "You found all the friends!",
  "Wonderful matching!",
  "Everyone found a friend!",
] as const;

/** Where to look next. Never which card to tap. */
const HINTS = [
  "Say the big letter out loud, then look for its little friend.",
  "Who could be its friend? Look along the little letters one at a time.",
  "Some little letters look just like the big one, only smaller.",
] as const;

export const letterPartnersActivity = defineGeneratedActivity({
  id: "letter-partners",
  packId: "match",
  title: "Big letters and little letters",
  category: "english",
  activityType: "letter-case",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = forLevel(POOLS, level, LETTER_POOLS.FULL);
    const count = forLevel(PAIRS, level, 5);
    const allowance = forLevel(ALLOWANCE, level, 2);

    /* The planted collision, on the levels that plant one. Drawn from the
       pool so it can never smuggle a letter the level does not teach. */
    const planted = forLevel(PLANTED, level, false)
      ? (rng.pick(confusablePairsWithin(pool)) ?? [])
      : [];

    const letters = pickLetters(rng, pool, count, allowance, planted);

    /* Both shelves shuffled, and then the little ones displaced: a board
       whose partners face each other can be finished without reading it. */
    const bigs = rng.shuffle(letters);
    const littles = displace(rng, bigs);

    const pairs: ConnectPair[] = letters.map((letter) => ({
      leftId: letterId(letter.toUpperCase()),
      rightId: letterId(letter.toLowerCase()),
    }));

    return {
      level,
      prompt: { speech: rng.pick(INVITATIONS) ?? INVITATIONS[0] },
      payload: {
        kind: "connect",
        left: bigCards(bigs),
        right: littleCards(littles),
        pairs,
      },
      explanation: rng.pick(CHEERS) ?? CHEERS[0],
      hint: rng.pick(HINTS) ?? HINTS[0],
      meta: {
        objective: "pairs each capital letter with its lower case form",
        tags: ["match", "letter-case", concept("letter-case", canonical(letters))],
      },
    };
  },
});
