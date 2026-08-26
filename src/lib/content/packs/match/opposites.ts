import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { oppositesAtLevel, type OppositePair } from "../english/opposites";
import { wordId, wordItem } from "../english/shared";
import { canonical, concept, displace } from "./shared";

/**
 * Opposites, a whole board of them at once.
 *
 * The cards form of `english.opposites`, and the same table read a second
 * way. The quiz asks one word and offers three answers, so a child can get
 * there by ruling two of them out. A board of four words and four opposites
 * cannot be ruled through: every word has to be understood, and held, while
 * the next one is read.
 *
 * Both forms share an `activityType` — `opposites` — because they teach one
 * thing. That is the pack's whole argument, and it is the same argument
 * `letter-partners` makes about `english.letter-case`.
 *
 * ## Where the difficulty comes from
 *
 * | | pairs | drawn from |
 * |-|-------|------------|
 * |1| 3 | the pairs a three year old already uses |
 * |2| 4 | the above, plus pairs that need more of the world |
 * |3| 4 | all of them, including the one-dimension pairs |
 *
 * Level two and three ask for the same number of lines on purpose. Four is
 * as many as fits a phone shelf without shrinking a card below a thumb, so
 * the top level gets harder by what is *on* the cards rather than by how many
 * there are — which is the rule this batch is built on.
 *
 * ## One pair per dimension
 *
 * Non-negotiable here, and for a sharper reason than in the quiz. A board
 * holding BIG/SMALL and TALL/SHORT lets a child join BIG to SHORT, `checkStep`
 * refuse it, and the child be right anyway. `family` keeps the board to one
 * pair per dimension, so there is exactly one way to finish it.
 */

/** How many lines a board asks for. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 4 };

/**
 * Choose the pairs for one board.
 *
 * Greedy over a shuffled pool with retries, the same shape as
 * `english/rhyming.ts`: a greedy walk can run out of dimensions, and a short
 * board is merely easier where a repeated dimension is wrong.
 */
function chooseBoard(level: Level, rng: Rng): OppositePair[] {
  const pool = oppositesAtLevel(level);
  const count = forLevel(PAIRS, level, 4);

  let best: OppositePair[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: OppositePair[] = [];
    const families = new Set<string>();

    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (families.has(candidate.family)) continue;
      families.add(candidate.family);
      picked.push(candidate);
    }

    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

const INVITATIONS = [
  "Every word is looking for its opposite.",
  "Can you find the word that means the opposite of each one?",
  "Which word means the opposite? Join them up.",
  "Put every word together with its opposite.",
] as const;

const CHEERS = [
  "You found every opposite!",
  "Wonderful thinking!",
  "Every word found its opposite!",
] as const;

const HINTS = [
  "Say a word out loud, then think what the other thing would be.",
  "Pick one word and try each card until it feels right.",
  "Opposites are two ends of the same idea: hot and cold, up and down.",
] as const;

export const oppositePartnersActivity = defineGeneratedActivity({
  id: "opposite-partners",
  packId: "match",
  category: "english",
  activityType: "opposites",
  kind: "connect",
  ageRange: { min: 5, max: 8 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = chooseBoard(level, rng);

    /* Each pair laid down a random way round, so a shelf is not quietly the
       "first word" shelf and a child cannot learn the table's order. */
    const laid = chosen.map((entry) =>
      rng.next() < 0.5 ? entry : { ...entry, a: entry.b, b: entry.a },
    );

    /* The right shelf displaced, or the board is answerable straight across. */
    const partners = displace(rng, laid);

    const left: ConnectNode[] = laid.map((entry) => ({
      id: wordId(entry.a),
      item: wordItem(entry.a),
    }));

    const right: ConnectNode[] = partners.map((entry) => ({
      id: wordId(entry.b),
      item: wordItem(entry.b),
    }));

    const pairs: ConnectPair[] = laid.map((entry) => ({
      leftId: wordId(entry.a),
      rightId: wordId(entry.b),
    }));

    const example = laid[0];

    return {
      level,
      prompt: { speech: rng.pick(INVITATIONS) ?? INVITATIONS[0] },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `${rng.pick(CHEERS) ?? CHEERS[0]} ${example.a} and ${example.b} are opposites.`
        : (rng.pick(CHEERS) ?? CHEERS[0]),
      hint: rng.pick(HINTS) ?? HINTS[0],
      meta: {
        objective: "joins each word to the word that means its opposite",
        tags: [
          "match",
          "opposites",
          concept(
            "opposite",
            canonical(chosen.map((entry) => `${entry.a.toLowerCase()}↔${entry.b.toLowerCase()}`)),
          ),
        ],
      },
    };
  },
});
