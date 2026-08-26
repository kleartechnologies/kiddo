import { DEFAULT_LOCALE, type Locale } from "../locale";
import { fill, type Vars } from "../format";
import { en, type MessageKey } from "./en";
import { ms } from "./ms";

/**
 * Looking a message up.
 *
 * One function, one table, no loading and no async. Both catalogues are
 * ordinary modules, so they are in the bundle the moment anything imports
 * them and a language switch is a re-render rather than a fetch — which is
 * the whole reason switching mid-game can be instant and lossless (§14).
 * Two languages of chrome are a few tens of kilobytes; splitting them would
 * buy that back and pay for it with a spinner in the middle of a sentence.
 *
 * The English fallback below is a *runtime* backstop for a case the types
 * already rule out — a catalogue can only be short of a key by being cast
 * past `Record<MessageKey, string>` — and it exists to make an empty string
 * behave sensibly: a translator clearing a line to come back to it gets the
 * English sentence, not a blank button.
 */

export type { MessageKey };
export type { Vars };

const CATALOGUES: Record<Locale, Record<MessageKey, string>> = { en, ms };

/** What KIDDO says, in one language, with the holes filled. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
  const message = catalogue[key] || CATALOGUES[DEFAULT_LOCALE][key];
  return fill(message, vars);
}

/**
 * The `t` a screen actually holds.
 *
 * Bound to a locale once, so a component says `t("landing.hero.title")` and
 * never has to have an opinion about which language it is in. That is the
 * property §13 turns on: a component that cannot name a language cannot get
 * one half of a screen wrong.
 */
export type Translate = (key: MessageKey, vars?: Vars) => string;

export function translator(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}

/** Every catalogue, for the coverage tests. Not for rendering. */
export const ALL_CATALOGUES = CATALOGUES;
