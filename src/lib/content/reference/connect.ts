import { defineGeneratedActivity, type ChallengeSpec } from "../activity";
import type { Level } from "../difficulty";
import type { ConnectNode, ConnectPair, PictureItem } from "../types";

/**
 * Animals and their food — the reference **connect** activity.
 *
 * It exists to prove one thing: that a board of lines can be dealt, validated,
 * drawn, answered and marked without a single line of subject knowledge
 * anywhere near the engine. It is deliberately tiny, deliberately not a Quest,
 * and deliberately in Discovery beside `colours`, which is the reference
 * *static* activity for the same reason.
 *
 * `animal-diet` is General Knowledge's `ActivityType`, borrowed rather than
 * invented, and that is the whole architecture in one line: what is being
 * learned and how it is answered are two axes. General Knowledge asks the same
 * idea as a `choice` today. Nothing had to change for it to be a `connect`.
 *
 * The real Connect content — three dots to a 3, A to APPLE, a country to its
 * flag — is more entries in tables like the one below, in the packs that own
 * those subjects. None of it comes back through here.
 */

/** One thing, and the thing it eats. Both are pictures; neither is a rule. */
interface Feed {
  animal: PictureItem;
  food: PictureItem;
}

/** A picture and the word for it, in the brand voice. */
function picture(glyph: string, label: string): PictureItem {
  return { kind: "picture", glyph, label };
}

/**
 * Six unmistakable pairs.
 *
 * Every animal here eats one of these six and only one, because a board is
 * dealt from any three of them and a bear that might also want the fish would
 * be a question with two right answers.
 */
const FEEDS: readonly Feed[] = [
  { animal: picture("🐶", "DOG"), food: picture("🦴", "BONE") },
  { animal: picture("🐱", "CAT"), food: picture("🐟", "FISH") },
  { animal: picture("🐰", "RABBIT"), food: picture("🥕", "CARROT") },
  { animal: picture("🐵", "MONKEY"), food: picture("🍌", "BANANA") },
  { animal: picture("🐭", "MOUSE"), food: picture("🧀", "CHEESE") },
  { animal: picture("🐻", "BEAR"), food: picture("🍯", "HONEY") },
];

/**
 * How many lines a board asks for, by level.
 *
 * Two is the smallest board that is a board at all — one line would be a
 * question with no choice in it. Four is as many as a phone holds with the
 * nodes still comfortably bigger than a fingertip, and is therefore a ceiling
 * rather than a step: the activity offers levels 1 to 3, and anything above
 * that has already been snapped down to 3 by `resolveLevel` before it arrives.
 */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/** Ids come from the word, so a line reads as `dog>bone` in a failing test. */
const idOf = (item: PictureItem) => item.label.toLowerCase();

export const connectReferenceActivity = defineGeneratedActivity({
  id: "animal-food",
  packId: "discovery",
  title: "Animals and their food",
  category: "discovery",
  activityType: "animal-diet",
  kind: "connect",
  ageRange: { min: 4, max: 6 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const feeds = rng.some(FEEDS, pairsAtLevel(level));

    const left: ConnectNode[] = feeds.map((feed) => ({
      id: idOf(feed.animal),
      item: feed.animal,
    }));

    /* The right column is shuffled on its own. Dealt in step with the left it
       would be answerable by joining row to row without looking. */
    const right: ConnectNode[] = rng.shuffle(feeds).map((feed) => ({
      id: idOf(feed.food),
      item: feed.food,
    }));

    const pairs: ConnectPair[] = feeds.map((feed) => ({
      leftId: idOf(feed.animal),
      rightId: idOf(feed.food),
    }));

    return {
      level,
      prompt: { speech: "Can you join each animal to its favourite food?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: "You joined them all up!",
      hint: "Think about what each animal likes to eat.",
      meta: {
        objective: "joins an animal to the food it eats",
        tags: ["reference", "connect"],
      },
    };
  },
});
