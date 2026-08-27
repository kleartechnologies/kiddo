"use client";

import { useMemo, useSyncExternalStore } from "react";

import { DEFAULT_LOCALE, LOCALE_HTML_LANG, type Locale } from "./locale";
import { LOCALE_KEY, readStoredLocale, resolveLocale, writeStoredLocale } from "./storage";
import { translator, type Translate } from "./messages";

/**
 * The language, as a thing React can render.
 *
 * The same store shape as `profile/useChildName`, for the same two reasons.
 * The preference is a browser value and most of KIDDO's pages are prerendered,
 * so the server has no answer and every reader has to agree on what to show
 * until the client has one. And the person who changes it is looking at the
 * header while the change has to reach a heading, a button and a question at
 * the bottom of the page, none of which know the switcher exists.
 *
 * `getServerSnapshot` returns Bahasa Melayu, so the prerendered HTML and the
 * hydrating render agree exactly — there is no hydration mismatch to warn
 * about, and `<html lang="ms">` in the static file is *true* for that file.
 * A parent who once chose English gets it in the same commit as hydration,
 * before paint, so nobody watches one language fade out into the other.
 *
 * ## Why there is no provider and no context
 *
 * A context would mean a client boundary wrapped around the whole app, and
 * KIDDO's landing page is static HTML on purpose (see the CSP note in
 * `next.config.ts`). A module-level store costs nothing on the server, lets a
 * single leaf component become interactive without dragging its parents with
 * it, and is already the house pattern for the child's name and the audio
 * settings.
 *
 * ## Why the preference is not on the account
 *
 * §3 allows an account-backed preference "if this fits the existing Firebase
 * schema safely", and it does not. `users/{uid}` accepts exactly `email`,
 * `createdAt` and `updatedAt` — an update may only ever touch `email` and
 * `updatedAt` — so a `locale` field could not be written without widening
 * that rule, and widening a rule to carry a UI preference is precisely what
 * §3 and §20 forbid. `resolveLocale` keeps its `fromAccount` slot so the
 * priority order is written down and tested; nothing fills it today, and the
 * day something does, it will be a server-owned field rather than a looser
 * client write.
 */

const listeners = new Set<() => void>();

/**
 * The cached answer. `getSnapshot` runs on every render and must return the
 * identical value until something really changes, so storage is read once.
 */
let snapshot: Locale = DEFAULT_LOCALE;
let loaded = false;

function getSnapshot(): Locale {
  if (!loaded) {
    snapshot = resolveLocale(readStoredLocale());
    loaded = true;
  }
  return snapshot;
}

/** The server has no storage and nobody to ask, so it has the default. */
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  /* The parent area open in one tab and the child playing in another. A
     language is a household decision, so both should follow it. */
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== LOCALE_KEY) return;
    snapshot = resolveLocale(readStoredLocale());
    emit();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Which language KIDDO is speaking. Never null: something is always chosen. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Choose a language, for good.
 *
 * This is the only writer, and what it writes is the first and strongest
 * answer in `resolveLocale`'s priority order: once a grown-up has chosen,
 * no later visit and no new device may overrule it.
 *
 * The `<html lang>` attribute is updated here rather than in an effect
 * somewhere, so the document's language changes in the same tick as the
 * strings on it — a screen reader that is part-way down the page hears the
 * switch, and never reads Malay in an English voice.
 */
export function setLocale(next: Locale): Locale {
  snapshot = writeStoredLocale(next) ?? DEFAULT_LOCALE;
  loaded = true;
  if (typeof document !== "undefined") {
    document.documentElement.lang = LOCALE_HTML_LANG[snapshot];
  }
  emit();
  return snapshot;
}

/**
 * `t`, bound to the language this render is in.
 *
 * Memoised on the locale so a component that passes `t` to a child does not
 * re-render it on every keystroke elsewhere.
 */
export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}

/** Both at once, for the many components that need the locale as well. */
export function useTranslation(): { locale: Locale; t: Translate } {
  const locale = useLocale();
  const t = useMemo(() => translator(locale), [locale]);
  return { locale, t };
}

/** Test-only. */
export function __resetLocaleStoreForTests(): void {
  snapshot = DEFAULT_LOCALE;
  loaded = false;
}
