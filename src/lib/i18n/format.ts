/**
 * Putting a value into a sentence.
 *
 * The whole of KIDDO's interpolation, and it is deliberately this small.
 * A message names its holes — `"{count} of {total}"` — and a caller fills
 * them. There is no pluralisation engine, no gender, no date library and no
 * ICU parser, because the product has no message that needs one: KIDDO says
 * "Question 3 of 10", not "you have 3 messages", and the handful of places
 * where English and Malay really do count differently are written as two
 * separate messages rather than as one message with a rule inside it.
 *
 * That last point is the important one. A translator can see a whole
 * sentence and know whether it reads; nobody can see a plural rule and know
 * that. When a language needs a different shape, it gets a different string.
 */

import { DEFAULT_LOCALE, type Locale } from "./locale";

export type Vars = Readonly<Record<string, string | number>>;

/** `{name}` in the message, the value from `vars`, everything else as-is. */
export function fill(message: string, vars?: Vars): string {
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name];
    /* A hole nobody filled stays visible rather than becoming "undefined".
       A message showing `{count}` is an obvious bug in a screenshot; a
       message showing "undefined" looks like a data problem and gets
       debugged in the wrong place. */
    return value === undefined ? whole : String(value);
  });
}

/**
 * The same message, split either side of one of its holes.
 *
 * For the few sentences that need markup around a value — an email in bold
 * inside "If there is a KIDDO account for {email}, …" — where gluing two
 * half-sentences together would be exactly the mixed-language bug this whole
 * system exists to prevent. The translator still writes one whole sentence
 * and still decides where the value goes; only the rendering is in two
 * pieces, and a language that puts the value first gets that for free.
 *
 * If the message has no such hole, all of it comes back as `before`, so a
 * translation that drops the value degrades to a plain sentence rather than
 * to nothing.
 */
export function around(
  message: string,
  name: string,
  vars?: Vars,
): { before: string; after: string } {
  const at = message.indexOf(`{${name}}`);
  if (at < 0) return { before: fill(message, vars), after: "" };
  return {
    before: fill(message.slice(0, at), vars),
    after: fill(message.slice(at + name.length + 2), vars),
  };
}

/**
 * A date, written the way the reader's language writes dates.
 *
 * Malaysia either way — `en-MY` and `ms-MY` — so the day, the month and the
 * year stay in the order a Malaysian expects and only the month's name
 * changes. `Intl` is in every browser and in Node, and it is a great deal
 * more reliable than a table of month names would be; it also means a date
 * is never written out twice in the two catalogues, where the two copies
 * could drift apart and only one of them be right.
 */
export function formatDay(ms: number, locale: Locale = DEFAULT_LOCALE): string {
  const tag = locale === "ms" ? "ms-MY" : "en-MY";
  return new Date(ms).toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" });
}
