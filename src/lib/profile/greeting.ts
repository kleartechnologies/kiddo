import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate, type MessageKey } from "@/lib/i18n/messages";

import { isLongChildName } from "./child";

/**
 * What KIDDO says when the child arrives.
 *
 * Four hellos and four invitations, and that is the entire range. The brief
 * for this was "alive, but not random or annoying", and those pull in
 * opposite directions: a line that never changes stops being noticed, and one
 * that changes while you are reading it is a toy rather than a welcome.
 *
 * The settlement is a greeting that is fixed for a visit. A child sees one
 * hello for as long as they are here, and a different one tomorrow — so the
 * screen is warm rather than jittery, and nothing on it moves under a reader
 * who is four and sounding the words out.
 *
 * Pure and seeded, with no clock and no randomness of its own, so a test can
 * walk every greeting this component is capable of producing.
 *
 * The lines themselves live in the catalogue, and only their *keys* are
 * chosen here. That is what lets a child who is greeted "Selamat kembali,
 * Adam!" be greeted the same way, at the same seed, in English — the visit
 * picks a greeting, not a sentence, so changing the language changes the
 * words and nothing else about the screen.
 */

export interface Greeting {
  /** The hello. Carries the child's name, when there is one. */
  hello: string;
  /** The question underneath it. */
  invitation: string;
}

/**
 * Every hello, warmest last.
 *
 * `{name}` is the only placeholder. No emoji: the hero is set in the display
 * face at up to 60px and a picture at that size is a decoration competing
 * with the child's own name.
 */
const HELLOS = [
  "greeting.hello.1",
  "greeting.hello.2",
  "greeting.hello.3",
  "greeting.hello.4",
] as const satisfies readonly MessageKey[];

/**
 * The two that still fit around a long name at the hero's size.
 *
 * A prefix of `HELLOS`, so a long name gets a quieter greeting rather than a
 * different kind of greeting.
 */
const SHORT_HELLOS = 2;

const INVITATIONS = [
  "greeting.invite.1",
  "greeting.invite.2",
  "greeting.invite.3",
  "greeting.invite.4",
] as const satisfies readonly MessageKey[];

/**
 * What a child who has never had a name typed in for them sees.
 *
 * Exactly the words that were on this screen before it could greet anyone,
 * and not a variation: the fallback is the product's normal state, so it is
 * the one line that should feel written rather than chosen.
 */
export function fallbackGreeting(locale: Locale): Greeting {
  return {
    hello: translate(locale, "greeting.fallback.hello"),
    invitation: translate(locale, "greeting.fallback.invite"),
  };
}

/** The same greeting in KIDDO's default language, for anything unlocalized. */
export const FALLBACK_GREETING: Greeting = fallbackGreeting(DEFAULT_LOCALE);

/**
 * The greeting for this child, on this visit.
 *
 * `seed` is any non-negative integer held steady for the length of a visit —
 * see `useVisitSeed`. The hello and the invitation are picked from different
 * parts of it so the two lines vary independently, rather than there being
 * four possible screens.
 */
export function greetingFor(
  name: string | null,
  seed: number,
  locale: Locale = DEFAULT_LOCALE,
): Greeting {
  if (!name) return fallbackGreeting(locale);

  /* Guard the arithmetic rather than trusting the caller: a NaN or a negative
     seed would index out of the array and put "undefined" on a child's
     screen, which is the one outcome this whole module exists to prevent. */
  const safe = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;

  const hellos = isLongChildName(name) ? SHORT_HELLOS : HELLOS.length;
  const hello = HELLOS[safe % hellos] ?? HELLOS[0];
  const invitation =
    INVITATIONS[Math.floor(safe / HELLOS.length) % INVITATIONS.length] ??
    INVITATIONS[0];

  return {
    hello: translate(locale, hello, { name }),
    invitation: translate(locale, invitation),
  };
}

/** How many distinct greetings exist. Exported for the test that walks them. */
export const GREETING_COUNT = HELLOS.length * INVITATIONS.length;
