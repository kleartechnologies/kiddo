"use client";

import { useSyncExternalStore } from "react";

import {
  canOffer,
  installRoute,
  isAppleSafari,
  readDismissed,
  writeDismissed,
  type Browser,
  type InstallRoute,
} from "./install";

/**
 * Installing KIDDO, as a thing React can render.
 *
 * The same store shape as `profile/useChildName` and `i18n/useLocale`, and
 * for the same two reasons: the answer is a browser fact that a prerendered
 * page cannot know, and the button that spends the install prompt is nowhere
 * near the banner that also has to disappear when it is spent.
 *
 * ## Why the listeners are attached when this module loads
 *
 * `beforeinstallprompt` is fired once, early, and never again for that page
 * load: Chromium decides KIDDO is installable as soon as it has read the
 * manifest and the service worker, which is comfortably before React has
 * hydrated the parent area. A listener attached in `subscribe` — the tidy
 * place, and where every other store in KIDDO puts its listeners — would
 * therefore miss it on the one page load that matters, and the parent would
 * be shown the iOS-shaped silence on an Android phone that could have
 * installed with one tap.
 *
 * So the listeners go on at import, and this module is imported by
 * `components/pwa/PwaRuntime`, which the root layout renders on every page.
 * That is as early as any KIDDO code runs.
 *
 * ## What is not here
 *
 * No push notifications, and no `PushManager`. KIDDO sends a child nothing
 * and re-engages nobody; the only reason this feature exists is so that a
 * four-year-old can reach their games without being handed a browser.
 */

/**
 * The event Chromium fires and lets a page keep.
 *
 * Not in `lib.dom.d.ts` — it is a Chromium extension rather than a standard —
 * so the shape KIDDO actually uses is written out rather than cast to `any`.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** Which road this browser offers, if any. */
  route: InstallRoute;
  /** Safari itself, whose Share button the guide's steps describe. */
  safari: boolean;
  /** A grown-up has waved the nudge away on this device, for good. */
  dismissed: boolean;
}

/** The server has no browser to ask, and "nothing to offer" is a real answer. */
const NOTHING: InstallState = { route: "none", safari: false, dismissed: false };

const listeners = new Set<() => void>();

/** The kept event, waiting for a press. Spent once, then gone. */
let deferred: InstallPromptEvent | null = null;

/**
 * KIDDO was installed while this tab was open.
 *
 * `appinstalled` is fired in the tab the parent installed *from*, and that
 * tab is still an ordinary browser tab — its display mode never becomes
 * standalone. So without this flag the moment of success would read as "there
 * is nothing to offer here", and the settings card would answer a parent who
 * has just watched the icon appear with a blank. It is deliberately sticky
 * and deliberately not stored: it is true for this tab, and the next page
 * load asks the display mode instead, which is the real answer.
 */
let installedHere = false;

/**
 * The cached answer. `getSnapshot` runs on every render and must return the
 * identical object until something really changes, so it is recomputed only
 * by the handlers below and never by a read.
 */
let snapshot: InstallState = NOTHING;

function emit(): void {
  for (const listener of listeners) listener();
}

/** What the browser looks like right now, read fresh. */
function look(): Browser {
  const media = (query: string) => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };

  return {
    userAgent: window.navigator.userAgent,
    maxTouchPoints: window.navigator.maxTouchPoints ?? 0,
    /* Three display modes count as installed, because all three mean the
       browser's own chrome is gone. The last term is Safari's own flag,
       which is the only signal iOS gives for a home-screen launch. */
    standalone:
      installedHere ||
      media("(display-mode: standalone)") ||
      media("(display-mode: fullscreen)") ||
      media("(display-mode: minimal-ui)") ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    prompt: deferred !== null,
  };
}

function measure(): void {
  const browser = look();
  const next: InstallState = {
    route: installRoute(browser),
    safari: isAppleSafari(browser),
    dismissed: readDismissed(),
  };

  /* Same answer, same object: a re-render nobody asked for is a re-render of
     the whole parent dashboard. */
  if (
    next.route === snapshot.route &&
    next.safari === snapshot.safari &&
    next.dismissed === snapshot.dismissed
  ) {
    return;
  }

  snapshot = next;
  emit();
}

let watching = false;

function watch(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    /* Chromium would otherwise show its own bar at the bottom of the page,
       which is exactly the thing §9 says must not sit over the interface.
       KIDDO keeps the event and asks in its own words instead. */
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    measure();
  });

  /* Fired whichever way it happened — KIDDO's button, the browser's own
     menu, or a second tab. The offer has to go away in all three. */
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedHere = true;
    measure();
  });

  /* A window can *become* the installed app without reloading, and on iOS
     nothing is fired at all — so the display mode is watched rather than
     read once. */
  try {
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", measure);
  } catch {
    /* An older browser without `addEventListener` on a media query list.
       The state is still read on every mount, which is enough. */
  }

  measure();
}

/* As early as any KIDDO code runs. See the note above. */
watch();

function subscribe(listener: () => void): () => void {
  watch();
  listeners.add(listener);
  /* A client navigation can arrive after the display mode changed. */
  measure();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): InstallState {
  return snapshot;
}

function getServerSnapshot(): InstallState {
  return NOTHING;
}

/** How — and whether — KIDDO can be put on this device's home screen. */
export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hand the kept event back to the browser.
 *
 * Returns whether the browser took it, so a caller can fall back to the
 * guide rather than leaving a press with no consequence. The event is spent
 * either way: Chromium refuses a second `prompt()` on the same event, so
 * keeping it would mean a button that works once and then silently stops.
 */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;

  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    /* The browser refused — already installed in another window, or the
       gesture was too old. Nothing to report; the state below tells the
       truth about what is left to offer. */
  }

  measure();
  return true;
}

/** "Not now", remembered for good. */
export function dismissInstall(): void {
  writeDismissed();
  measure();
}

/** Whether this route has anything to put on a screen. Re-exported for JSX. */
export { canOffer };

/** Test-only. */
export function __resetInstallStoreForTests(): void {
  deferred = null;
  installedHere = false;
  snapshot = NOTHING;
}
