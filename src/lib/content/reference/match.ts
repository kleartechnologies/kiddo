import { defineGeneratedActivity, type ChallengeSpec } from "../activity";
import type { Level } from "../difficulty";
import type { ConnectNode, ConnectPair, PictureItem } from "../types";

/**
 * Grown-ups and their babies — the reference **match** activity.
 *
 * ## Why a `match` board is a `connect` payload
 *
 * The `match` *kind* cannot hold this. Its answer is `pairIds` — the pairs the
 * child *found* — and there is no id for a pairing that was never authored, so
 * a match answer cannot say "the child put the dog with the kitten". An engine
 * built on it would have to work out that two cards belonged together before
 * it could report anything, which is the engine marking its own homework.
 * `types.ts` says exactly this where it explains why `connect` exists at all,
 * and `engine.ts` sets the test a kind has to pass: it must be able to say
 * what the child did *including saying it wrongly*.
 *
 * So `MatchStage` is a second renderer for `connect`, not a new kind and not a
 * second way of marking. Pairing two cards and joining two nodes are the same
 * *answer*; they are only a different picture, and a picture is not a kind.
 *
 * `matching` is Logic's `ActivityType`, borrowed rather than invented — what
 * is being learned and how it is answered are two axes, and only the second
 * one an engine ever reads.
 *
 * ## This is not the baby-animals activity
 *
 * `general-knowledge.animal-babies` teaches that lesson. It is the
 * authoritative one: thirteen animal-to-baby facts against the seven here, a
 * level ladder built on how familiar a baby's *name* is, and a place in a
 * subject a child picks from the home screen. If a baby-animals board is ever
 * to grow — another fact, another way to ask it — it grows there.
 *
 * This file stays because it is the `cards` renderer's sample, and a renderer
 * with no sample is a renderer nobody can point at. Seven families is the
 * smallest table that makes a five-pair board vary, which is all a reference
 * activity is for. It lives on the Discovery shelf beside the other three
 * references and is not offered by any game.
 *
 * The two are deliberately not merged. Pointing `MatchStage` at
 * `animal-babies` would make a subject pack own the reference for a renderer,
 * and deleting this one would leave `look: "cards"` with nothing minimal to
 * demonstrate. Duplicated *content* would be the problem; a duplicated
 * *sample* of an engine is the thing a reference shelf is.
 */

/** A grown-up animal and its baby. Both pictures; neither is a rule. */
interface Family {
  grown: PictureItem;
  baby: PictureItem;
}

function picture(glyph: string, label: string): PictureItem {
  return { kind: "picture", glyph, label };
}

/**
 * Seven unmistakable families.
 *
 * Enough that a five-pair board still varies from deal to deal, and every one
 * distinct enough that no board ever has two right answers in it.
 */
const FAMILIES: readonly Family[] = [
  { grown: picture("🐕", "DOG"), baby: picture("🐶", "PUPPY") },
  { grown: picture("🐈", "CAT"), baby: picture("🐱", "KITTEN") },
  { grown: picture("🐑", "SHEEP"), baby: picture("🐏", "LAMB") },
  { grown: picture("🐄", "COW"), baby: picture("🐮", "CALF") },
  { grown: picture("🐔", "HEN"), baby: picture("🐣", "CHICK") },
  { grown: picture("🦆", "DUCK"), baby: picture("🐤", "DUCKLING") },
  { grown: picture("🐎", "HORSE"), baby: picture("🐴", "FOAL") },
];

/**
 * How many pairs a board asks for, by level.
 *
 * Three is the smallest board worth pairing — two would leave the last pair
 * with no choice in it at all. Five is the ceiling a phone holds with the
 * cards still comfortably bigger than a fingertip, so the activity offers
 * levels 1 to 3 and `resolveLevel` snaps anything above that down to 3.
 */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 3;
  if (level === 2) return 4;
  return 5;
}

/** Ids come from the word, so a pair reads as `dog>puppy` in a failing test. */
const idOf = (item: PictureItem) => item.label.toLowerCase();

export const matchReferenceActivity = defineGeneratedActivity({
  id: "animal-babies",
  packId: "discovery",
  title: "Grown-ups and babies",
  category: "discovery",
  activityType: "matching",
  kind: "connect",
  ageRange: { min: 4, max: 6 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const families = rng.some(FAMILIES, pairsAtLevel(level));

    const left: ConnectNode[] = rng.shuffle(families).map((family) => ({
      id: idOf(family.grown),
      item: family.grown,
    }));

    /* Each group shuffled on its own. Dealt in step they would be pairable by
       position, without ever looking at what is on the cards. */
    const right: ConnectNode[] = rng.shuffle(families).map((family) => ({
      id: idOf(family.baby),
      item: family.baby,
    }));

    const pairs: ConnectPair[] = families.map((family) => ({
      leftId: idOf(family.grown),
      rightId: idOf(family.baby),
    }));

    return {
      level,
      prompt: { speech: "Can you find the friends that belong together?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: "You found every family!",
      hint: "Look for the little one that belongs to each grown-up.",
      meta: {
        objective: "pairs a grown-up animal with its baby",
        tags: ["reference", "match"],
      },
    };
  },
});
