import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import {
  ANIMALS,
  soundLevelOf,
  SOUND_FACTS,
  type Animal,
} from "../general-knowledge/animals";
import { word } from "../general-knowledge/shared";
import { displace } from "./shared";

/**
 * Animals and the sounds they make, a whole farmyard at once.
 *
 * The cards form of `general-knowledge.animal-sounds`, dealt from the same
 * table. The quiz says a sound and offers three animals; this lays five
 * animals and five sounds down together, and the child has to hold "the pig
 * is still waiting" in mind while working out what the owl says.
 *
 * Both forms carry the `animal-sounds` activity type, because they teach one
 * thing. The `ChallengeKind` is what differs — which is the split this pack
 * exists to make, and the same argument `letter-partners` makes about
 * `english.letter-case`.
 *
 * ## Why every board has exactly one solution
 *
 * A property of the table rather than a rule in this file: no two animals in
 * `animals.ts` are given the same sound. The rooster is not there beside the
 * chicken, the kitten is not there beside the cat, and nothing in the table
 * both barks and howls. So any set of animals drawn from it makes a board a
 * child can finish one way and no other, and `checkStep` refuses every other
 * line. The pack's test asserts the uniqueness rather than trusting it.
 *
 * ## Where the difficulty comes from
 *
 * | | pairs | drawn from |
 * |-|-------|------------|
 * |1| 3 | the six a farmyard book teaches first: MOO, WOOF, BAA |
 * |2| 4 | the above, plus ROAR and BUZZ |
 * |3| 5 | all fifteen, and always at least one of the newer ones |
 *
 * Vocabulary and board size. Not speed — there is no clock on any board here,
 * a line that is not right simply does not stay, and the child may try again
 * immediately.
 */

/** How many lines a board asks for. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 5 };

/**
 * Which animals a level may deal from.
 *
 * Cumulative: a child on level three still meets the cow, they just meet it
 * beside the owl.
 */
function poolAtLevel(level: Level): readonly Animal[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return SOUND_FACTS.filter((animal) => soundLevelOf(animal) <= ceiling);
}

/**
 * Choose the animals for one board.
 *
 * Level three starts from a sound it alone teaches and fills up around it, so
 * the top level can never deal five farmyard animals and call itself hard.
 */
function chooseBoard(level: Level, rng: Rng): Animal[] {
  const pool = poolAtLevel(level);
  const count = forLevel(PAIRS, level, 5);
  const newer = level >= 3 ? pool.filter((animal) => soundLevelOf(animal) === 3) : [];

  const start = newer.length > 0 ? [newer[rng.int(0, newer.length - 1)]] : [];
  const picked: Animal[] = [];

  for (const candidate of [...start, ...rng.shuffle(pool)]) {
    if (picked.length >= count) break;
    if (picked.includes(candidate)) continue;
    picked.push(candidate);
  }

  return picked;
}

const INVITATIONS = [
  "Every animal is looking for its sound.",
  "Can you find the sound each animal makes?",
  "Which sound belongs to each animal? Join them up.",
  "Put every animal together with the sound it makes.",
] as const;

const CHEERS = [
  "You found every sound!",
  "Wonderful listening!",
  "Every animal found its sound!",
] as const;

const HINTS = [
  "Look at one animal and say its sound out loud.",
  "Pick one animal and read the sounds one at a time.",
  "Picture the animal in a story. What does it say?",
] as const;

const animalNodeId = (animal: Animal) => `animal-${animal.name}`;
const soundNodeId = (animal: Animal) => `sound-${animal.sound}`;

/**
 * The name of the idea behind a board: the *set* of facts it practises,
 * sorted, so the same five animals dealt down the columns another way is one
 * concept and not a hundred. `SOUND_FACTS.length` is the number that means
 * something to a child; the boards are shuffles of it.
 */
function conceptOf(chosen: readonly Animal[]): string {
  const facts = chosen.map((animal) => `${animal.name}>${animal.sound}`).sort();
  return `concept:sound:${facts.join("+")}`;
}

export const soundPartnersActivity = defineGeneratedActivity({
  id: "sound-partners",
  packId: "match",
  category: "general-knowledge",
  activityType: "animal-sounds",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = chooseBoard(level, rng);

    const animals = rng.shuffle(chosen);
    const sounds = displace(rng, animals);

    const left: ConnectNode[] = animals.map((animal) => ({
      id: animalNodeId(animal),
      item: ANIMALS[animal.name].item,
    }));

    const right: ConnectNode[] = sounds.map((animal) => {
      const sound = animal.sound as string;
      return { id: soundNodeId(animal), item: word(sound.toUpperCase(), sound).item };
    });

    const pairs: ConnectPair[] = chosen.map((animal) => ({
      leftId: animalNodeId(animal),
      rightId: soundNodeId(animal),
    }));

    const example = chosen[0];

    return {
      level,
      prompt: { speech: rng.pick(INVITATIONS) ?? INVITATIONS[0] },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `${rng.pick(CHEERS) ?? CHEERS[0]} A ${example.name} says ${example.sound}.`
        : (rng.pick(CHEERS) ?? CHEERS[0]),
      hint: rng.pick(HINTS) ?? HINTS[0],
      meta: {
        objective: "joins each animal to the sound it makes",
        tags: ["match", "animal-sounds", conceptOf(chosen)],
      },
    };
  },
});
