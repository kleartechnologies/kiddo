import {
  activitiesOf,
  PLAYABLE_WORLDS,
  TIERS,
  WORLD_ACTIVITIES,
  type PlayableWorldId,
  type Tier,
  type WorldActivity,
  type WorldActivityId,
} from "@/lib/worlds/activities";
import type { GameWorldId } from "@/lib/worlds/worlds";

/**
 * How far a child has come. No JSX, no React, no browser.
 *
 * A journey is the smallest record that can answer the three questions the
 * home screen and a world map ask: *what have I finished*, *what should I do
 * next*, and *where was I*. It is a set of finished activity ids and the id
 * of the last one played. There are no points, no levels, no streaks and no
 * currency — a child is never scored, only shown what they have grown,
 * discovered or written. See `docs/kiddo-world-journey.md`.
 *
 * Finishing an activity twice is finishing it once. Nothing is ever taken
 * away, and no *door* is ever locked: every door is open from the first
 * visit. The only thing that unlocks is how big a challenge a finished door
 * offers — see the tier fields below — and even that only ever opens.
 */

export interface Journey {
  /**
   * Activities finished at least once, in the order they were first finished.
   * Finishing a door means finishing it at Easy — the tier every door opens
   * on — so this list kept its exact meaning when tiers arrived, and a
   * journey written before tiers existed reads back unchanged.
   */
  completed: readonly WorldActivityId[];
  /** Doors finished at Medium at least once. Always playable again. */
  medium: readonly WorldActivityId[];
  /** Doors finished at Hard at least once. Always playable again. */
  hard: readonly WorldActivityId[];
  /** The activity most recently played to the end, or opened. */
  last: WorldActivityId | null;
}

export const EMPTY_JOURNEY: Journey = { completed: [], medium: [], hard: [], last: null };

/**
 * What a door on the map says about itself.
 *
 * `done` — finished before. `next` — the one KIDDO would suggest: the first
 * unfinished door in the world. `new` — unfinished, and not the next one.
 * Every state is playable; the names only decide the sticker and the words.
 */
export type ActivityStatus = "done" | "next" | "new";

export function isCompleted(journey: Journey, id: WorldActivityId): boolean {
  return journey.completed.includes(id);
}

/* ---- Tiers ------------------------------------------------------------ */

/**
 * What one tier of one door says about itself.
 *
 * `done` — finished at this tier before. `ready` — playable now. `locked` —
 * the tier before it has not been finished yet. Deterministic, derived, and
 * monotonic: finishing things can only turn `locked` into `ready` and
 * `ready` into `done`, never the other way. Nothing is stored about locks —
 * a lock is only the absence of the previous tier's finish.
 */
export type TierState = "done" | "ready" | "locked";

export function tierCompleted(journey: Journey, id: WorldActivityId, tier: Tier): boolean {
  const list = tier === 1 ? journey.completed : tier === 2 ? journey.medium : journey.hard;
  return list.includes(id);
}

/** Easy is always open; each other tier opens when the one before is done. */
export function tierUnlocked(journey: Journey, id: WorldActivityId, tier: Tier): boolean {
  return tier === 1 || tierCompleted(journey, id, (tier - 1) as Tier);
}

export function tierStateOf(journey: Journey, id: WorldActivityId, tier: Tier): TierState {
  if (tierCompleted(journey, id, tier)) return "done";
  return tierUnlocked(journey, id, tier) ? "ready" : "locked";
}

/**
 * The tier a door would offer first: the lowest one not yet finished, which
 * under the chain rule is always unlocked. A door finished at every tier
 * offers Hard — the biggest challenge the child has earned — and the picker
 * is right there for choosing a gentler one.
 */
export function suggestedTier(journey: Journey, id: WorldActivityId): Tier {
  return TIERS.find((tier) => !tierCompleted(journey, id, tier)) ?? 3;
}

/** The first door in a world that has not been finished, or null when all have. */
export function nextActivityIn(
  journey: Journey,
  world: GameWorldId,
): WorldActivity | null {
  return (
    activitiesOf(world).find((activity) => !isCompleted(journey, activity.id)) ??
    null
  );
}

export function statusOf(journey: Journey, activity: WorldActivity): ActivityStatus {
  if (isCompleted(journey, activity.id)) return "done";
  return nextActivityIn(journey, activity.world)?.id === activity.id ? "next" : "new";
}

export interface WorldProgress {
  done: number;
  total: number;
  /** Every door finished. */
  complete: boolean;
}

export function worldProgress(journey: Journey, world: GameWorldId): WorldProgress {
  const all = activitiesOf(world);
  const done = all.filter((activity) => isCompleted(journey, activity.id)).length;
  return { done, total: all.length, complete: all.length > 0 && done === all.length };
}

/** Stickers earned: one per finished activity, across every world. */
export function stickersOf(journey: Journey): number {
  return journey.completed.filter((id) =>
    WORLD_ACTIVITIES.some((activity) => activity.id === id),
  ).length;
}

/** The world the child was last in, or null on a first visit. */
export function lastWorldOf(journey: Journey): PlayableWorldId | null {
  const activity = WORLD_ACTIVITIES.find((entry) => entry.id === journey.last);
  return activity?.world ?? null;
}

/**
 * Where "Continue your adventure" leads.
 *
 * The next unfinished door in the world the child was last in; failing that,
 * the next unfinished door in the first world that still has one; and null
 * once every door in every world is finished — at which point the home
 * screen says so instead of pointing anywhere.
 */
export function continueTarget(journey: Journey): WorldActivity | null {
  const last = lastWorldOf(journey);
  const worlds = last
    ? [last, ...PLAYABLE_WORLDS.filter((world) => world !== last)]
    : [...PLAYABLE_WORLDS];
  for (const world of worlds) {
    const next = nextActivityIn(journey, world);
    if (next) return next;
  }
  return null;
}

/** Another world with something left to find, for when this one is finished. */
export function suggestWorldAfter(
  journey: Journey,
  world: GameWorldId,
): PlayableWorldId | null {
  const order = [...PLAYABLE_WORLDS.filter((id) => id !== world)];
  return order.find((id) => !worldProgress(journey, id).complete) ?? order[0] ?? null;
}

export function everythingDone(journey: Journey): boolean {
  return PLAYABLE_WORLDS.every((world) => worldProgress(journey, world).complete);
}

/* ---- Transitions ----------------------------------------------------- */

export function markOpened(journey: Journey, id: WorldActivityId): Journey {
  return journey.last === id ? journey : { ...journey, last: id };
}

/**
 * The child finished a round at a tier. Tier one grows `completed` — the
 * same list, with the same meaning, it has always grown — and the other two
 * grow their own lists. Finishing never removes anything from any list, and
 * finishing a tier twice is finishing it once.
 */
export function markCompletedAt(journey: Journey, id: WorldActivityId, tier: Tier): Journey {
  const key = tier === 1 ? "completed" : tier === 2 ? "medium" : "hard";
  const list = journey[key];
  const grown = list.includes(id) ? list : [...list, id];
  return grown === list && journey.last === id
    ? journey
    : { ...journey, [key]: grown, last: id };
}

export function markCompleted(journey: Journey, id: WorldActivityId): Journey {
  return markCompletedAt(journey, id, 1);
}

/* ---- Serialising ----------------------------------------------------- */

const KNOWN = new Set<string>(WORLD_ACTIVITIES.map((activity) => activity.id));

function parseIds(value: unknown): readonly WorldActivityId[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter(
    (id): id is WorldActivityId => typeof id === "string" && KNOWN.has(id),
  );
  return [...new Set(ids)];
}

/**
 * Read a journey back from whatever was stored. Anything unrecognisable —
 * an old shape, an activity that no longer exists, a hand-edited value —
 * is dropped quietly rather than trusted. A journey is never worth an error.
 *
 * A journey stored before tiers existed has no `medium` or `hard` at all;
 * those read back as empty, which is exactly what was true of it — the whole
 * migration, by construction.
 */
export function parseJourney(raw: unknown): Journey {
  if (typeof raw !== "object" || raw === null) return EMPTY_JOURNEY;
  const record = raw as { completed?: unknown; medium?: unknown; hard?: unknown; last?: unknown };
  const last =
    typeof record.last === "string" && KNOWN.has(record.last)
      ? (record.last as WorldActivityId)
      : null;
  return {
    completed: parseIds(record.completed),
    medium: parseIds(record.medium),
    hard: parseIds(record.hard),
    last,
  };
}
