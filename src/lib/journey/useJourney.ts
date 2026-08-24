"use client";

import { useSyncExternalStore } from "react";

import type { CloudBackend } from "@/lib/cloud/types";
import type { Tier, WorldActivityId } from "@/lib/worlds/activities";
import {
  EMPTY_JOURNEY,
  markCompletedAt,
  markOpened,
  parseJourney,
  tierCompleted,
  type Journey,
} from "./journey";

/**
 * The journey, as a thing React can render — the same store shape as
 * `useChildName`, for the same reasons: the value lives outside React, the
 * pages that show it are prerendered, and the screen that writes it (the end
 * of a round) is not the screen that reads it (home, the world map).
 *
 * ## One journey, two places it can live
 *
 * There is exactly one canonical journey in the app: `snapshot` below. Where
 * it is *persisted* depends on whether a parent has signed in on this device:
 *
 *  - **Device-only** (no account, or Firebase not configured): the journey is
 *    read from and written to `localStorage`, exactly as before accounts.
 *  - **Cloud-backed** (a parent is signed in and has a child profile): the
 *    journey is the Firestore document `journeys/{childId}`. `localStorage`
 *    is kept as a cache so a return visit renders instantly, but it is never
 *    read as truth while bound — every cloud snapshot overwrites it.
 *
 * The pure functions in `journey.ts` remain the only place transitions are
 * defined. This file only decides where the result is kept.
 *
 * ## Migration, once
 *
 * The first time a child profile is bound on a device that already has a
 * local journey, and the cloud has no journey for that child yet, the local
 * journey becomes the cloud one. If a cloud journey already exists it wins
 * outright and the local copy is replaced — nothing is merged, so a stale
 * device can never mark a door finished that the cloud says is not. See
 * `docs/kiddo-accounts.md`.
 *
 * On the server, and until the client has looked, the journey is empty —
 * a real answer on a first visit and a harmless one on a return.
 */

export const JOURNEY_KEY = "kiddo.journey.v1";

/**
 * Whether the last write reached where the journey lives.
 *
 * `local` — device-only mode. `synced` — the cloud has what the screen shows.
 * `saving` — a write is in flight. `error` — the last cloud write failed; the
 * screen still shows the round as finished (it was), but the cloud does not
 * know yet. Shown to parents only; a child never sees any of these words.
 */
export type JourneySaveStatus = "local" | "synced" | "saving" | "error";

const listeners = new Set<() => void>();
let snapshot: Journey = EMPTY_JOURNEY;
let loaded = false;

let saveStatus: JourneySaveStatus = "local";

interface CloudBinding {
  childId: string;
  backend: CloudBackend;
  /** True once the first cloud snapshot has arrived. */
  ready: boolean;
  unsubscribe: () => void;
}
let binding: CloudBinding | null = null;

function readLocal(): Journey {
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY);
    return raw ? parseJourney(JSON.parse(raw)) : EMPTY_JOURNEY;
  } catch {
    return EMPTY_JOURNEY;
  }
}

function writeLocal(journey: Journey): void {
  try {
    window.localStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
  } catch {
    /* Private mode, a full disk: the round still finished; only the memory
       of it is lost, and nothing in the product depends on keeping it. */
  }
}

function getSnapshot(): Journey {
  if (!loaded) {
    snapshot = readLocal();
    loaded = true;
  }
  return snapshot;
}

function getServerSnapshot(): Journey {
  return EMPTY_JOURNEY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== JOURNEY_KEY) return;
    /* Another tab wrote. In cloud mode the cloud watcher is the one that
       tells us about changes; the local key is only a cache then. */
    if (binding) return;
    snapshot = readLocal();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function setStatus(next: JourneySaveStatus): void {
  if (next === saveStatus) return;
  saveStatus = next;
  emit();
}

/** Adopt a journey as the canonical one, cache it, and tell every reader. */
function adopt(next: Journey): void {
  loaded = true;
  if (next !== snapshot) {
    snapshot = next;
    writeLocal(next);
  }
  emit();
}

let pending = 0;

function persist(next: Journey): void {
  if (!binding || !binding.ready) return;
  const { backend, childId } = binding;
  pending += 1;
  setStatus("saving");
  backend.writeJourney(childId, next).then(
    () => {
      pending -= 1;
      if (pending === 0 && binding?.childId === childId) setStatus("synced");
    },
    () => {
      pending -= 1;
      if (binding?.childId === childId) setStatus("error");
    },
  );
}

function update(next: Journey): void {
  if (next === snapshot) return;
  adopt(next);
  persist(next);
}

export function useJourney(): Journey {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useJourneySaveStatus(): JourneySaveStatus {
  return useSyncExternalStore(subscribe, () => saveStatus, () => "local" as const);
}

/** The journey right now, for code that is not a component. */
export function currentJourney(): Journey {
  return getSnapshot();
}

/** The save status right now, for code that is not a component. */
export function currentSaveStatus(): JourneySaveStatus {
  return saveStatus;
}

/** The child opened a door. Remembered so "continue" knows which world. */
export function recordOpened(id: WorldActivityId): void {
  update(markOpened(getSnapshot(), id));
}

/** The child finished a round. Returns true if this was the first time. */
export function recordCompleted(id: WorldActivityId): boolean {
  return recordCompletedAt(id, 1);
}

/**
 * The child finished a round at a tier. Returns true the first time that
 * door is finished at that tier — the moment the celebration belongs to.
 */
export function recordCompletedAt(id: WorldActivityId, tier: Tier): boolean {
  const before = getSnapshot();
  const first = !tierCompleted(before, id, tier);
  update(markCompletedAt(before, id, tier));
  return first;
}

/** For grown-ups: start the adventure over. Clears the cloud too when bound. */
export function resetJourney(): void {
  update(EMPTY_JOURNEY);
}

/** Try the last failed write again — for a parent-side "retry" control. */
export function retrySave(): void {
  if (saveStatus === "error") persist(getSnapshot());
}

/* ---- Cloud binding ----------------------------------------------------- */

/**
 * Make `journeys/{childId}` the place this journey lives.
 *
 * Until the first cloud snapshot arrives the local journey keeps rendering,
 * so a return visit never flashes empty. Then one of two things happens,
 * decided once and deterministically:
 *
 *  - the cloud has a journey → it replaces whatever was local (cloud wins);
 *  - the cloud has none → the local journey, if it has anything in it, is
 *    written up as the child's first cloud journey (migration); an empty
 *    local journey writes nothing and the cloud stays empty.
 *
 * Returns a promise that settles after that first decision, for onboarding
 * screens that want to say "your progress has been carried over".
 */
export function bindJourneyToCloud(childId: string, backend: CloudBackend): Promise<"cloud" | "migrated" | "empty"> {
  unbindJourney();
  return new Promise((resolve) => {
    let first = true;
    const local = getSnapshot();
    const current: CloudBinding = {
      childId,
      backend,
      ready: false,
      unsubscribe: () => {},
    };
    binding = current;
    current.unsubscribe = backend.watchJourney(childId, (cloud) => {
      if (binding !== current) return;
      /* Decided before anything below runs: a write made here can echo
         back through this listener at once, and that echo is not "first". */
      const deciding = first;
      first = false;
      if (cloud) {
        current.ready = true;
        adopt(cloud);
        if (pending === 0) setStatus("synced");
        if (deciding) resolve("cloud");
      } else if (deciding) {
        current.ready = true;
        if (
          local.completed.length > 0 ||
          local.medium.length > 0 ||
          local.hard.length > 0 ||
          local.last !== null
        ) {
          /* Migration: the one time a device's memory becomes the truth. */
          adopt(local);
          resolve("migrated");
          persist(local);
        } else {
          adopt(EMPTY_JOURNEY);
          setStatus("synced");
          resolve("empty");
        }
      } else {
        /* The document was deleted under us (account deletion). Nothing to
           show but an empty journey. */
        adopt(EMPTY_JOURNEY);
      }
    });
  });
}

/** Back to device-only mode, e.g. after sign-out. The cache stays readable. */
export function unbindJourney(): void {
  if (!binding) return;
  binding.unsubscribe();
  binding = null;
  pending = 0;
  setStatus("local");
}

/** Whether a cloud journey is currently the source of truth. */
export function isJourneyCloudBound(): boolean {
  return binding !== null;
}

/** Test-only: forget everything and read the device again. */
export function __resetJourneyStoreForTests(): void {
  unbindJourney();
  snapshot = EMPTY_JOURNEY;
  loaded = false;
  saveStatus = "local";
}

/**
 * Forget the cached journey on this device. Used on sign-out so that the
 * cache of one child's cloud journey can never be mistaken for device-only
 * progress — and never migrated into a different account later.
 */
export function clearLocalJourney(): void {
  unbindJourney();
  snapshot = EMPTY_JOURNEY;
  loaded = true;
  try {
    window.localStorage.removeItem(JOURNEY_KEY);
  } catch {
    /* Nothing to clear, or storage refused: either way there is no cache. */
  }
  emit();
}
