"use client";

import { useSyncExternalStore } from "react";

import type { CloudBackend } from "@/lib/cloud/types";

import { CHILD_NAME_KEY, normalizeChildName, readChildName, writeChildName } from "./child";

/**
 * The child's name, as a thing React can render.
 *
 * A store rather than a `useEffect` in each component, for two reasons. The
 * name is a browser value and the pages that show it are prerendered, so the
 * server has no answer and every reader has to agree on what to show until
 * the client has one. And the grown-up who types the name is looking at a
 * different component from the one that says it, so a write has to reach the
 * hero without either of them knowing the other exists.
 *
 * `useSyncExternalStore` gives both: `getServerSnapshot` returns null, so the
 * prerendered HTML and the hydrating render both say "Hi!", and React swaps
 * in the real greeting once it is safe to. There is no flash of a wrong name
 * because there is no wrong name — only the fallback, and then the child's.
 */

const listeners = new Set<() => void>();

/**
 * The cached answer.
 *
 * `getSnapshot` is called on every render and must return the identical value
 * until something actually changes, so reading `localStorage` inside it would
 * loop. It is read once, lazily, and then only ever updated by a write or by
 * another tab.
 */
let snapshot: string | null = null;
let loaded = false;

/**
 * When a parent is signed in, the name lives on the child's cloud profile
 * (`children/{childId}.name`) and the local key is only a cache of it. The
 * hook and `setChildName` do not change shape: every screen keeps asking the
 * same question and gets the answer from wherever it currently lives.
 */
let cloud: { childId: string; backend: CloudBackend } | null = null;

function getSnapshot(): string | null {
  if (!loaded) {
    snapshot = readChildName();
    loaded = true;
  }
  return snapshot;
}

/** Nothing is known on the server, and that is a real answer, not a loading state. */
function getServerSnapshot(): null {
  return null;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  /* Another tab, or the parents screen open beside the child's. `storage`
     only fires in the *other* documents, which is exactly the half that the
     in-process listeners above do not cover. */
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CHILD_NAME_KEY) return;
    if (cloud) return;
    snapshot = normalizeChildName(event.newValue) ?? readChildName();
    emit();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The child's first name, or null when nobody has said who is playing.
 *
 * Null is the ordinary case and every caller has to handle it — which is the
 * point of returning null rather than a placeholder string.
 */
export function useChildName(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Set or clear the name, and tell everyone showing it.
 *
 * Returns the name that was actually kept — the first word, trimmed — so a
 * grown-up can be shown what KIDDO will really say rather than what they
 * typed. Clearing is `setChildName("")`; there is no separate call, because
 * "no name" is a name value and not a different operation.
 */
export function setChildName(raw: unknown): string | null {
  const name = writeChildName(raw);
  snapshot = name;
  loaded = true;
  emit();
  if (cloud && name) {
    /* The profile keeps the name; a failed write leaves the cached one,
       which is still the name the parent just typed. */
    cloud.backend.updateChildName(cloud.childId, name).catch(() => {});
  }
  return name;
}

/** The child's cloud profile is now where the name lives. */
export function bindChildNameToCloud(childId: string, name: string, backend: CloudBackend): void {
  cloud = { childId, backend };
  snapshot = writeChildName(name);
  loaded = true;
  emit();
}

/** Back to device-only mode; the cache is cleared so no other account inherits it. */
export function unbindChildName(): void {
  cloud = null;
  snapshot = writeChildName("");
  loaded = true;
  emit();
}

/** Test-only. */
export function __resetChildNameStoreForTests(): void {
  cloud = null;
  snapshot = null;
  loaded = false;
}
