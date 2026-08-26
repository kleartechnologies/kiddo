import { DEFAULT_LOCALE, isLocale, negotiate, type Locale } from "./locale";

/**
 * Where the language preference lives, and which answer wins.
 *
 * The same shape and the same promise as `profile/child.ts` and
 * `audio/settings.ts`: one key, on one device, holding one string that a
 * grown-up chose. There is no server in this file and nothing to leak — a
 * language preference is not data about a child.
 *
 * A signed-in parent's choice is *not* kept on their account, and deliberately
 * so: `users/{uid}` accepts exactly `email`, `createdAt` and `updatedAt`, and
 * widening a Firestore rule to carry a UI preference buys a second device the
 * same language at the price of a looser write. `resolveLocale` keeps the slot
 * where that answer would go — see step 2 of its priority order — so the day
 * it is filled it is filled by a server-owned field, not by this file.
 */

/**
 * Namespaced because `localStorage` is shared across an origin, versioned
 * because the day this shape changes old values have to be ignorable rather
 * than migrated.
 */
export const LOCALE_KEY = "kiddo.locale.v1";

/**
 * The stored choice, or null if nobody has made one.
 *
 * Null is the important return value, not an inconvenience: it is what tells
 * `resolveLocale` that the device's own language is still allowed to decide.
 * Once this returns a locale, the device never gets another vote.
 */
export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCALE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    /* Safari in private mode, an iframe with storage blocked, a parent who
       has turned site data off. None of that is an error worth showing: it
       means KIDDO opens in the device's language every visit instead of the
       remembered one, which is the mildest possible failure. */
    return null;
  }
}

/** Remember a choice. Returns what was kept, so a caller can apply that. */
export function writeStoredLocale(value: unknown): Locale | null {
  const locale = isLocale(value) ? value : null;
  if (typeof window === "undefined") return locale;

  try {
    if (locale) window.localStorage.setItem(LOCALE_KEY, locale);
    else window.localStorage.removeItem(LOCALE_KEY);
  } catch {
    /* Holds for this visit, forgotten by the next. */
  }

  return locale;
}

/** The languages this device would like, best first. */
function deviceLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  /* `languages` is the ordered list and `language` is the single best guess;
     older WebViews have only the second. */
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/**
 * Which language KIDDO should open in.
 *
 * The priority order, and the whole of it:
 *
 *   1. **what the parent chose**, if they ever chose — for ever, and this is
 *      the rule the other three exist to protect. A household that switched
 *      to Bahasa Melayu once must never be handed back to English by a device
 *      setting, a new phone or a browser update. An explicit choice is not a
 *      hint; it is the answer.
 *   2. **what the account remembers**, for a parent signing in on a second
 *      device who has not chosen anything on *this* one yet.
 *   3. **what the device asks for** — a phone set to Malay opens KIDDO in
 *      Bahasa Melayu the very first time, with nothing to configure. This is
 *      the whole reason step 1 has to be so firm: without it, this step would
 *      keep overruling the parent.
 *   4. **English**, because something has to be.
 *
 * Pure and total on purpose: it takes the two answers rather than fetching
 * them, so the priority order can be tested without a browser, an account or
 * a mocked `navigator`.
 */
export function resolveLocale(
  chosen: Locale | null,
  fromAccount: Locale | null = null,
  fromDevice: readonly string[] | undefined = undefined,
): Locale {
  if (chosen) return chosen;
  if (fromAccount) return fromAccount;
  return negotiate(fromDevice ?? deviceLanguages()) ?? DEFAULT_LOCALE;
}
