import { ENGLISH_PACK } from "./packs/english";
import { GENERAL_KNOWLEDGE_PACK } from "./packs/general-knowledge";
import { LOGIC_PACK } from "./packs/logic";
import { MATCH_PACK } from "./packs/match";
import { MATH_PACK } from "./packs/math";
import { SHAPES_PACK } from "./packs/shapes";
import { coloursActivity } from "./reference/colours";
import { connectReferenceActivity } from "./reference/connect";
import { matchReferenceActivity } from "./reference/match";
import { orderReferenceActivity } from "./reference/order";
import type { Level } from "./difficulty";
import type {
  Activity,
  ActivityId,
  ChallengeKind,
  ContentCategory,
  ContentPack,
  PackId,
} from "./types";

/**
 * Everything KIDDO can teach.
 *
 * A list and four lookups. Deliberately not a framework: no loader, no plugin
 * interface, no lazy anything. A pack is an entry in this array, an activity
 * is an entry in a pack, and both are ordinary imports the bundler can see.
 *
 * Math, English, Logic, Shapes & Colours, General Knowledge and Matching are
 * each a folder under `packs/` and one line here, which is the shape every
 * pack after them takes. Discovery stays written out below because it is the
 * reference shelf — the smallest real activity of each
 * kind, kept so a seam has something to point at. `colours` is the authored
 * side of the static/generated seam; `animal-food` is the `connect` engine's
 * and `count-order` is the `order` engine's, each the whole of that engine's
 * content until a pack asks for its own. None of them is a game: the home
 * screen reads `data/games.ts`, not this.
 *
 * One reference now overlaps a real pack: `matchReferenceActivity` and
 * `general-knowledge.animal-babies` both pair grown-ups with babies. General
 * Knowledge is the authoritative one and is where that lesson grows; the
 * reference stays as the `cards` renderer's sample and is never offered by a
 * game. `reference/match.ts` carries the reasoning.
 */
export const CONTENT_REGISTRY: readonly ContentPack[] = [
  MATH_PACK,
  ENGLISH_PACK,
  LOGIC_PACK,
  SHAPES_PACK,
  GENERAL_KNOWLEDGE_PACK,
  MATCH_PACK,
  {
    id: "discovery",
    title: "Discovery",
    blurb: "Colours, shapes, animals and the names of things in the world.",
    accent: "apricot",
    activities: [
      coloursActivity,
      connectReferenceActivity,
      matchReferenceActivity,
      orderReferenceActivity,
    ],
  },
];

export function getPack(id: PackId): ContentPack | undefined {
  return CONTENT_REGISTRY.find((pack) => pack.id === id);
}

/** Every activity in the registry, flattened. The list most callers want. */
export const ACTIVITIES: readonly Activity[] = CONTENT_REGISTRY.flatMap(
  (pack) => pack.activities,
);

export function getActivity(id: ActivityId): Activity | undefined {
  return ACTIVITIES.find((activity) => activity.id === id);
}

export interface ActivityFilter {
  packId?: PackId;
  category?: ContentCategory;
  /** "what can my engine render?" — the question a game actually asks. */
  kind?: ChallengeKind;
  level?: Level;
  /** Activities suitable for a child of this age. */
  age?: number;
}

/** Narrow the registry. Every field is optional; those given must all match. */
export function findActivities(filter: ActivityFilter = {}): Activity[] {
  return ACTIVITIES.filter((activity) => {
    if (filter.packId && activity.packId !== filter.packId) return false;
    if (filter.category && activity.category !== filter.category) return false;
    if (filter.kind && activity.kind !== filter.kind) return false;
    if (filter.level !== undefined && !activity.levels.includes(filter.level)) {
      return false;
    }
    if (
      filter.age !== undefined &&
      (filter.age < activity.ageRange.min || filter.age > activity.ageRange.max)
    ) {
      return false;
    }
    return true;
  });
}
