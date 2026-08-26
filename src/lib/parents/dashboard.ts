import { getActivity } from "@/lib/content/registry";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import { tierKey } from "@/lib/i18n/names";
import type { ActivityId } from "@/lib/content/types";
import {
  continueTarget,
  everythingDone,
  isCompleted,
  stickersOf,
  tierCompleted,
  worldProgress,
  type Journey,
  type WorldProgress,
} from "@/lib/journey/journey";
import {
  activitiesOf,
  PLAYABLE_WORLDS,
  TIERS,
  WORLD_ACTIVITIES,
  type PlayableWorldId,
  type WorldActivity,
  type WorldActivityId,
} from "@/lib/worlds/activities";
import { WORLD_PLACES, type WorldPlace } from "@/lib/worlds/places";

/**
 * The child's journey, read the way a grown-up reads it. No JSX, no React.
 *
 * Everything on the parent dashboard is a *view* of the same two fields the
 * child's home screen reads — `Journey.completed` and `Journey.last` — and
 * the same world and door definitions the maps are drawn from. Nothing here
 * is stored, counted or remembered separately: a number on the parent side
 * is always the same number the child's keepsake row is showing, because it
 * is computed from the same record by the same functions.
 *
 * That is also why there is so little here. A journey knows which doors
 * were finished and which was opened last. It does not know when, how long,
 * how many tries or how well, and this file does not pretend it does.
 *
 * The sentences take a `locale` and default to English, the same way
 * `lib/billing/subscription` does. The default is not for convenience: it
 * keeps every existing test calling these functions with one argument and
 * reading the same English back, so translation cannot quietly change what
 * a number means.
 */

/* ---- What time it is, said warmly -------------------------------------- */

/** "Good morning" until noon, "Good afternoon" until six, then evening. */
export function daypartGreeting(hour: number, locale: Locale = DEFAULT_LOCALE): string {
  const h = Number.isFinite(hour) ? ((Math.trunc(hour) % 24) + 24) % 24 : 12;
  if (h < 12) return translate(locale, "parents.greeting.morning");
  if (h < 18) return translate(locale, "parents.greeting.afternoon");
  return translate(locale, "parents.greeting.evening");
}

/* ---- Worlds ------------------------------------------------------------ */

export interface WorldSummary {
  place: WorldPlace;
  progress: WorldProgress;
  /** `untouched` — nothing finished; `started` — some; `complete` — every door. */
  state: "untouched" | "started" | "complete";
  /** The door KIDDO would offer next in this world, or null when it is done. */
  next: WorldActivity | null;
}

export function worldSummaries(journey: Journey): WorldSummary[] {
  return PLAYABLE_WORLDS.map((id) => {
    const progress = worldProgress(journey, id);
    const next = activitiesOf(id).find((a) => !isCompleted(journey, a.id)) ?? null;
    return {
      place: WORLD_PLACES[id],
      progress,
      state: progress.complete ? "complete" : progress.done > 0 ? "started" : "untouched",
      next,
    };
  });
}

/** "2 of 3 activities explored", never a bar alone. */
export function progressLabel(
  progress: WorldProgress,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const total = progress.total;
  if (progress.complete) return translate(locale, "parents.progress.all", { total });
  if (progress.done === 0) return translate(locale, "parents.progress.none", { total });
  return translate(locale, "parents.progress.some", { done: progress.done, total });
}

/* ---- Recent ------------------------------------------------------------ */

/**
 * The doors most recently finished, newest first.
 *
 * A journey keeps no clock. What it does keep is the order doors were
 * *first* finished in, and the door that was touched last — so "recent" is
 * that last door if it is finished, followed by the rest in reverse order of
 * first completion. Honest about what it is: a replay of an old door moves
 * it to the top, because that is the most recent thing the child did.
 */
export function recentActivities(journey: Journey, limit = 3): WorldActivity[] {
  const ids: string[] = [];
  if (journey.last && isCompleted(journey, journey.last)) ids.push(journey.last);
  for (const id of [...journey.completed].reverse()) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids
    .slice(0, limit)
    .map((id) => WORLD_ACTIVITIES.find((a) => a.id === id))
    .filter((a): a is WorldActivity => a !== undefined);
}

/* ---- Next ------------------------------------------------------------- */

export interface NextUp {
  activity: WorldActivity;
  place: WorldPlace;
  /** `start` on a fresh journey, `continue` once anything has been opened. */
  mode: "start" | "continue";
}

/**
 * What the child can do next — the same answer the child's own "Continue
 * your adventure" button gives, so the parent never sees a suggestion the
 * child is not also being offered. Null once every door is finished.
 */
export function nextUp(journey: Journey): NextUp | null {
  const activity = continueTarget(journey);
  if (!activity) return null;
  return {
    activity,
    place: WORLD_PLACES[activity.world],
    mode: journey.last === null ? "start" : "continue",
  };
}

/* ---- What is being practised ------------------------------------------ */

export interface Concept {
  id: ActivityId;
  /**
   * What the lesson is called, as a key — "Counting", "Mengira". The words
   * are in the catalogues; the activity only carries the key. See
   * `conceptKey`.
   */
  title: MessageKey;
  /** True once a door that draws from this activity has been finished. */
  practised: boolean;
}

export interface WorldConcepts {
  place: WorldPlace;
  concepts: Concept[];
}

/**
 * The lessons behind a world's doors, read straight off the session plans.
 *
 * Every door deals its questions from named content activities, and each
 * of those has a title written for a grown-up. Listing those titles — and no
 * others — is the whole of the educational claim: KIDDO can say a child has
 * practised counting because a counting activity was the one dealt. There
 * is no mapping table to go stale and nothing here a door does not draw.
 */
export function conceptsOf(journey: Journey, world: PlayableWorldId): Concept[] {
  const seen = new Map<ActivityId, Concept>();
  for (const door of activitiesOf(world)) {
    for (const tier of TIERS) {
      /* Practised means *dealt*: a lesson only a harder tier draws — comparing
         quantities, joining sounds — is not claimed until that tier was
         actually finished. */
      const done = tierCompleted(journey, door.id, tier);
      for (const slot of door.plans[tier].slots) {
        for (const id of slot.from) {
          const content = getActivity(id);
          if (!content) continue;
          const existing = seen.get(id);
          if (existing) existing.practised ||= done;
          else seen.set(id, { id, title: content.title, practised: done });
        }
      }
    }
  }
  return [...seen.values()];
}

/**
 * "Completed Easy and Medium." — one factual line about how far a door has
 * been taken. Never a score, never a claim about mastery: only which sizes
 * of the challenge have been finished at least once.
 */
export function tiersLabel(
  journey: Journey,
  id: WorldActivityId,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const words = TIERS.filter((tier) => tierCompleted(journey, id, tier)).map((tier) =>
    translate(locale, tierKey(tier)),
  );
  if (words.length === 0) return translate(locale, "parents.tiers.none");
  return translate(locale, "parents.tiers.done", {
    tiers: listOf(words, translate(locale, "common.and")),
  });
}

/** "Easy", "Easy and Medium", "Easy, Medium and Hard" — in either language. */
function listOf(words: string[], and: string): string {
  if (words.length < 2) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} ${and} ${words[words.length - 1]}`;
}

export function conceptsByWorld(journey: Journey): WorldConcepts[] {
  return PLAYABLE_WORLDS.map((id) => ({
    place: WORLD_PLACES[id],
    concepts: conceptsOf(journey, id),
  }));
}

/* ---- Adventure so far -------------------------------------------------- */

export interface JourneySummary {
  activitiesDone: number;
  activitiesTotal: number;
  /** One keepsake per finished door — the same count, said the world's way. */
  keepsakes: number;
  worldsVisited: number;
  worldsTotal: number;
  everything: boolean;
}

export function journeySummary(journey: Journey): JourneySummary {
  const done = stickersOf(journey);
  return {
    activitiesDone: done,
    activitiesTotal: WORLD_ACTIVITIES.length,
    keepsakes: done,
    worldsVisited: PLAYABLE_WORLDS.filter((w) => worldProgress(journey, w).done > 0).length,
    worldsTotal: PLAYABLE_WORLDS.length,
    everything: everythingDone(journey),
  };
}

/** "3 activities completed across 2 worlds." — the one-line overview. */
export function overviewLine(journey: Journey, locale: Locale = DEFAULT_LOCALE): string {
  const s = journeySummary(journey);
  if (s.activitiesDone === 0) return translate(locale, "parents.overview.none");
  if (s.everything) {
    return translate(locale, "parents.overview.all", { worlds: s.worldsTotal });
  }
  /* Counted phrases rather than a number and a noun glued together: English
     inflects the noun and Malay does not, and only the catalogue knows. */
  const activities =
    s.activitiesDone === 1
      ? translate(locale, "parents.count.activity")
      : translate(locale, "parents.count.activities", { n: s.activitiesDone });
  const worlds =
    s.worldsVisited === 1
      ? translate(locale, "parents.count.world")
      : translate(locale, "parents.count.worlds", { n: s.worldsVisited });
  return translate(locale, "parents.overview.line", { activities, worlds });
}
