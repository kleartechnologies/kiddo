import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { concept, wordSym } from "./shared";
import { canMix, nameableGroups, type WordGroup } from "./words";

/**
 * Which group does each word belong to?
 *
 * The third way this pack asks one question. `oddOneOut` shows three words
 * from a group and one from outside it and asks which does not fit;
 * `sorting` names a group and asks which word is in it; this deals several
 * words *and* several group names at once and asks the child to run every
 * line at the same time. It is the same knowledge — a DOG is an animal — and
 * it is a genuinely harder thing to do, because no line can be checked
 * without looking at all of them.
 *
 * A `connect`, drawn by `ConnectStage`. **It teaches no new facts.** Every
 * membership on this board is one `words.ts` already holds and the two choice
 * activities already ask about, which is deliberate: the brief asks for more
 * than one way to play a concept where that is genuinely useful practice, not
 * for the same curriculum written down twice under new names. The pack's
 * count of what a child can learn is unchanged by this file.
 *
 * ## Why one group is missing
 *
 * `vehicles`. A connect board needs the group's name on a tile in the
 * right-hand column, and the only true name this pack has for that group is
 * "things that go" — a phrase, not a label. CARS would fit on a tile and would
 * be a lie, because a bus is not a car. So the board deals from the five
 * groups that have a `tile` name in `words.ts`, and `vehicles` stays a
 * `sorting` and an `oddOneOut` group only. It is written down in
 * `docs/content-universe.md` as something a wider tile would let in.
 *
 * ## How a level gets harder
 *
 * | | lines | groups it may deal from |
 * |-|-------|-------------------------|
 * |1| 2 | animals, fruit, toys — the three a child names first |
 * |2| 3 | and food and clothes |
 * |3| 4 | all five, so a board can hold every group that fits at once |
 *
 * `canMix` still holds: an apple is a fruit *and* something to eat, so those
 * two group names never appear on one board, whatever the level.
 */

/**
 * The groups this activity can deal, in the order a child meets them.
 *
 * Kept as ids rather than as a second table of words, so the two choice
 * activities and this one can never drift apart: the words themselves are
 * only ever written down once, in `words.ts`.
 */
const LEVEL_ONE = ["animals", "fruit", "toys"] as const;
const LEVEL_TWO = ["food", "clothes"] as const;

function poolAtLevel(level: Level): readonly WordGroup[] {
  const allowed: readonly string[] =
    level <= 1 ? LEVEL_ONE : [...LEVEL_ONE, ...LEVEL_TWO];
  /* `nameableGroups` is the authority on which groups can go on a tile at
     all; the lists above only say which of them a level has met. A group
     that loses its tile name disappears from here without a second edit. */
  return nameableGroups().filter((group) => allowed.includes(group.id));
}

/** Two lines, then three, then four. Content, never clock. */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/**
 * Choose the groups for one board.
 *
 * Greedy over a shuffled pool, refusing any group that may not sit beside one
 * already down. With five groups and one forbidden pair a four-line board is
 * always reachable, and the fallback is the best attempt rather than a relaxed
 * rule: a smaller board is merely easier, an ambiguous one is broken.
 */
function joinable(pool: readonly WordGroup[], count: number, rng: Rng): WordGroup[] {
  let best: WordGroup[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: WordGroup[] = [];
    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (picked.some((taken) => !canMix(taken, candidate))) continue;
      picked.push(candidate);
    }
    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/** One word from each chosen group. Words are unique across groups. */
function wordsFor(groups: readonly WordGroup[], rng: Rng): string[] {
  return groups.map((group) => rng.pick(group.words) ?? group.words[0]);
}

/**
 * The order the group names are laid out in.
 *
 * Deranged on three lines and up so nothing faces its own word; plainly
 * shuffled on two, where the only derangement is the swap and deranging would
 * make the crossed board the answer every time.
 */
function displace<T>(chosen: readonly T[], rng: Rng): T[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board: the set of memberships it practises,
 * sorted, so a reshuffle of the same lines is one concept.
 *
 * These are the same memberships `sorting` tags, which is the point — the
 * child is practising a thing they already have a name for in a way that is
 * harder to do.
 */
function conceptOf(words: readonly string[], groups: readonly WordGroup[]): string {
  const facts = words
    .map((word, index) => `${word.toLowerCase()}>${groups[index].id}`)
    .sort();
  return concept("group", facts.join("+"));
}

export const groupPartnersActivity = defineGeneratedActivity({
  id: "group-partners",
  packId: "logic",
  title: "Which group does it go in?",
  category: "logic",
  activityType: "sorting",
  kind: "connect",
  ageRange: { min: 5, max: 8 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const groups = joinable(poolAtLevel(level), pairsAtLevel(level), rng);
    const words = wordsFor(groups, rng);

    const left: ConnectNode[] = words.map((word) => ({
      id: `word-${word}`,
      item: wordSym(word).item,
    }));

    const right: ConnectNode[] = displace(groups, rng).map((group) => ({
      id: `group-${group.id}`,
      item: wordSym(group.tile ?? group.all.toUpperCase()).item,
    }));

    const pairs: ConnectPair[] = words.map((word, index) => ({
      leftId: `word-${word}`,
      rightId: `group-${groups[index].id}`,
    }));

    return {
      level,
      prompt: { speech: "Can you join each word to the group it belongs to?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: words
        .map((word, index) => `${word} is ${groups[index].one}.`)
        .join(" "),
      hint: "Take one word at a time. What kind of thing is it?",
      meta: {
        objective: "joins each thing to the group it belongs to",
        tags: ["sorting", conceptOf(words, groups)],
      },
    };
  },
});
