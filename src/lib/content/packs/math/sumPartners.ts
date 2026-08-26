import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { ADDITION_BONDS, bondConcept, type Bond } from "./arithmetic";
import { numberId } from "./shared";

/**
 * Sums and their answers, a whole board at once.
 *
 * `addition` asks one sum and offers three numbers, and a child can often get
 * there without adding: the near-miss tiles are one and two away, so the
 * biggest or the middle one is a decent guess. Four sums and four answers on
 * one board removes that. Every answer belongs to exactly one sum, so a number
 * taken by the wrong sum is a number the right sum then cannot have, and the
 * board only closes when all four have actually been worked out.
 *
 * The same `addition` activity type as the quiz, because it is the same thing
 * to know. `ConnectStage` draws it; nothing new was added to any engine.
 *
 * ## Where the difficulty comes from
 *
 * | | pairs | totals inside | and |
 * |-|-------|---------------|-----|
 * |1| 3 | 5 | both numbers small enough to count on fingers |
 * |2| 4 | 10 | |
 * |3| 4 | 20 | at least one sum that crosses ten |
 *
 * Level two and three ask for the same number of lines on purpose: four cards
 * a side is as many as a phone shelf holds without shrinking one below a
 * thumb, so the top level gets harder by what is written on the cards rather
 * than by how many there are.
 *
 * Nothing here is timed and nothing is lost. A line to the wrong number does
 * not stay, and the child may try the next one straight away.
 */

/** How many lines a board asks for. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 4 };

/** How big the totals get. The same ladder `addition` climbs. */
const CEILING: LevelTable<number> = { 1: 5, 2: 10, 3: 20 };

/**
 * The bonds a level may deal from.
 *
 * Read out of `ADDITION_BONDS` rather than written again, so the two ways of
 * playing addition can never drift apart, and so the honest count of what this
 * teaches is the one number both of them point at.
 */
function poolAtLevel(level: Level): readonly Bond[] {
  const ceiling = forLevel(CEILING, level, 20);
  return ADDITION_BONDS.filter((bond) => bond.a + bond.b <= ceiling);
}

/**
 * Choose the sums for one board.
 *
 * One bond per total, which is the whole correctness rule: two sums that make
 * the same number would leave one answer card wanted by both, and the board
 * would have no single way to finish. Level three starts from a sum that
 * crosses ten, so the top level can never deal four small sums and call itself
 * hard.
 */
function chooseBoard(level: Level, rng: Rng): Bond[] {
  const pool = poolAtLevel(level);
  const count = forLevel(PAIRS, level, 4);
  const crossing = level >= 3 ? pool.filter((bond) => bond.a + bond.b > 10) : [];

  const start = crossing.length > 0 ? [crossing[rng.int(0, crossing.length - 1)]] : [];
  const picked: Bond[] = [];
  const totals = new Set<number>();

  for (const candidate of [...start, ...rng.shuffle(pool)]) {
    if (picked.length >= count) break;
    const total = candidate.a + candidate.b;
    if (totals.has(total)) continue;
    totals.add(total);
    picked.push(candidate);
  }

  return picked;
}

/**
 * The order the answers are laid out in.
 *
 * Shuffled apart from the sums and *deranged*, so no total ever sits opposite
 * its own sum: a board answerable by joining straight across is a board that
 * teaches a child to look at the shelf rather than at the card.
 */
function displace(chosen: readonly Bond[], rng: Rng): Bond[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * A sum on a card.
 *
 * Written the way a child meets it in a book — `2 + 3` — and labelled in
 * words, because "two plus three" is what a screen reader should say and
 * "2 + 3" read character by character is not.
 */
function sumCard(bond: Bond, rng: Rng): ConnectNode {
  /* Laid down either way round, so a child cannot learn that the smaller
     number is always written first. */
  const [first, second] = rng.next() < 0.5 ? [bond.a, bond.b] : [bond.b, bond.a];
  return {
    id: `sum-${first}-${second}`,
    item: {
      kind: "text",
      text: `${first} + ${second}`,
      label: `${first} plus ${second}`,
    },
  };
}

/**
 * The name of the idea behind a board: the *set* of bonds it practises,
 * sorted, so the same four sums dealt down the shelves another way is one
 * concept and not twenty-four. `ADDITION_BONDS` is the number that means
 * something to a child; a board is a handful of it.
 */
function conceptOf(chosen: readonly Bond[]): string {
  const bonds = chosen
    .map((bond) => bondConcept(bond.a, bond.b).replace("concept:add:", ""))
    .sort();
  return `concept:add-board:${bonds.join(",")}`;
}

export const sumPartnersActivity = defineGeneratedActivity({
  id: "sum-partners",
  packId: "math",
  category: "math",
  activityType: "addition",
  kind: "connect",
  ageRange: { min: 5, max: 8 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = chooseBoard(level, rng);

    /* The sum cards are built once, because each carries the order its two
       numbers were laid down in and the pairs must point at that same card. */
    const cards = chosen.map((bond) => sumCard(bond, rng));

    const left: ConnectNode[] = cards;

    const answers = displace(chosen, rng);
    const right: ConnectNode[] = answers.map((bond) => ({
      id: numberId(bond.a + bond.b),
      item: { kind: "number", value: bond.a + bond.b },
    }));

    const pairs: ConnectPair[] = chosen.map((bond, index) => ({
      leftId: cards[index].id,
      rightId: numberId(bond.a + bond.b),
    }));

    const example = chosen[0];

    return {
      level,
      prompt: { speech: "Can you join each sum to the number it makes?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `Every sum found its number. ${example.a} and ${example.b} make ${example.a + example.b}.`
        : "Every sum found its number.",
      hint: "Pick one sum and count on from the first number.",
      meta: {
        objective: "joins each sum to the number it makes",
        tags: ["family:number", conceptOf(chosen)],
      },
    };
  },
});
