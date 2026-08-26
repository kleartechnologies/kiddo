import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { ConnectNode, ConnectPair } from "../../types";
import { canonical, concept, displace, pickWithout } from "./shared";

/**
 * Numerals and the quantities they mean.
 *
 * The pack's second activity, and the one `shared.ts` has been predicting
 * since the day it was written: "the day it grows a second activity — numerals
 * to quantities, animals to homes — that activity belongs here beside this
 * one". A `connect` challenge drawn as cards: numerals on one shelf, groups of
 * pips on the other, and every numeral has exactly one group that means it.
 *
 * ## Why it is here and not in Math
 *
 * Math already teaches this one at a time and in both directions —
 * `countingActivity` shows a group and asks for the numeral,
 * `numberRecognitionActivity` shows the numeral and asks for the group. Both
 * are a `choice`: one question, three answers, and the child works through
 * them one tap at a time.
 *
 * A board of five numerals and five groups is a different job. Nothing tells
 * the child where to start, no group is ruled out by being obviously wrong for
 * *this* numeral, and holding "that one is the six" in mind while counting the
 * next group is the thing a child does when they actually own the numbers
 * rather than recognise them. Same objective, different verb — which is the
 * split this pack exists to make, and it is why the `activityType` stays
 * `counting` and only the `ChallengeKind` differs.
 *
 * ## Where the difficulty comes from
 *
 * | | pairs | numbers | groups one apart | one planted |
 * |-|-------|---------|------------------|-------------|
 * |1| 3 | 1–5 | at most one | no |
 * |2| 4 | 1–8 | at most one | no |
 * |3| 5 | 1–10 | at most two | yes |
 *
 * Two groups one apart — six pips beside seven — is this activity's version of
 * a `b` next to a `d`: the board can no longer be finished by eyeing how big
 * each pile looks, and the child has to actually count. Level 3 plants one,
 * which is the difference between a hard board and a lucky one.
 *
 * ## Why level one allows one, rather than none
 *
 * It was written as none, and none turns out to mean *one board*. Three
 * numbers drawn from one to five with no two of them touching is 1, 3 and 5
 * and nothing else, so a level that forbade neighbours would deal the same
 * board every time a child played it — and `challengeKey` would then refuse to
 * deal a second one in the same round.
 *
 * Allowing one costs less than it sounds. Below five a child sees two pips
 * against three without counting them; the pair that actually has to be
 * counted is seven beside eight, and no level-one board can hold either. So
 * the ceiling does level one's work, and the allowance does level three's.
 *
 * Nothing here is a clock. A bigger number, a bigger board and closer
 * neighbours are the only three levers, and a child who takes a minute over a
 * board sees the board a child who takes four seconds sees.
 */

/** How many pairs a board asks for. Three to search, five to fill a phone. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 5 };

/** How far the numbers go. The same ladder Math's counting activities climb. */
const CEILING: LevelTable<number> = { 1: 5, 2: 8, 3: 10 };

/** How many pairs of neighbouring quantities a board may contain. */
const ALLOWANCE: LevelTable<number> = { 1: 1, 2: 1, 3: 2 };

/** Whether one neighbouring pair is put there on purpose. */
const PLANTED: LevelTable<boolean> = { 1: false, 2: false, 3: true };

/**
 * Every correspondence this activity can ever teach. The honest count.
 *
 * Ten: the numerals one to ten and what each of them means. Not the thousands
 * of five-number sets they can be dealt into — a set is a board, and the
 * pack's test counts these.
 */
export const QUANTITY_FACTS = 10;

/** Two quantities a child could confuse by looking rather than counting. */
const neighbours = (a: number, b: number) => Math.abs(a - b) === 1;

/**
 * The pips are all one colour, on purpose.
 *
 * Colouring each group differently would let a child pair the shelves by hue
 * without ever counting, and would put a second thing on a card that means
 * nothing. One accent everywhere, and the only difference between two cards is
 * how many pips are on them.
 */
const PIPS = "tide" as const;

const numeralId = (value: number) => `n${value}`;
const groupId = (value: number) => `dots-${value}`;

const INVITATIONS = [
  "Every number is looking for its own group.",
  "Can you find the group that goes with each number?",
  "Which group of dots belongs with each number?",
  "Put every number together with the right group.",
  "Each number has a group hiding here. Count them and find it!",
] as const;

const CHEERS = [
  "You found every one!",
  "Wonderful counting!",
  "Every number found its group!",
] as const;

const HINTS = [
  "Pick one group and touch each dot as you count it.",
  "Say the number out loud, then count a group to see if it matches.",
  "Two groups can look nearly the same. Count them both.",
] as const;

export const quantityPartnersActivity = defineGeneratedActivity({
  id: "quantity-partners",
  packId: "match",
  category: "math",
  activityType: "counting",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const count = forLevel(PAIRS, level, 5);
    const ceiling = forLevel(CEILING, level, 10);
    const pool = Array.from({ length: ceiling }, (_, index) => index + 1);

    /* The planted pair of neighbours, on the level that plants one. Drawn from
       the pool so it can never smuggle in a number the level does not teach. */
    const start = forLevel(PLANTED, level, false)
      ? rng.int(1, ceiling - 1)
      : 0;
    const planted = start > 0 ? [start, start + 1] : [];

    const numbers = pickWithout(
      rng,
      pool,
      count,
      forLevel(ALLOWANCE, level, 2),
      neighbours,
      planted,
    );

    /* Both shelves shuffled, and then the groups displaced: a board whose
       partners face each other can be finished without counting anything. */
    const numerals = rng.shuffle(numbers);
    const groups = displace(rng, numerals);

    const left: ConnectNode[] = numerals.map((value) => ({
      id: numeralId(value),
      item: { kind: "number", value },
    }));

    const right: ConnectNode[] = groups.map((value) => ({
      id: groupId(value),
      item: { kind: "count", value, accent: PIPS },
    }));

    const pairs: ConnectPair[] = numbers.map((value) => ({
      leftId: numeralId(value),
      rightId: groupId(value),
    }));

    return {
      level,
      prompt: { speech: rng.pick(INVITATIONS) ?? INVITATIONS[0] },
      payload: { kind: "connect", left, right, pairs },
      explanation: rng.pick(CHEERS) ?? CHEERS[0],
      hint: rng.pick(HINTS) ?? HINTS[0],
      meta: {
        objective: "pairs each numeral with the quantity it means",
        tags: ["match", "counting", concept("quantity", canonical(numbers))],
      },
    };
  },
});
