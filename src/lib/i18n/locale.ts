/**
 * Which language KIDDO is speaking.
 *
 * KIDDO's home is Malaysia, and a Malaysian household does not pick a
 * language once and live there — it moves between two all day. So the locale
 * is not a route, a subdomain or a build: it is one preference that follows a
 * parent and a child from the landing page, through signing up and paying,
 * into the games and all the way down into the questions themselves.
 *
 * Everything about the shape of this file follows from that.
 *
 * ## Two axes, kept apart
 *
 * `Locale` is the *code* — `ms`, `en` — and it is what every function, store
 * and dictionary in the product is keyed on. `LOCALE_LABELS` is what a person
 * is shown, and the two are deliberately not the same string: the switcher
 * says **BM** because that is what a Malaysian reads at a glance, while the
 * code stays `ms` because that is what BCP 47, `<html lang>`, `Intl` and every
 * dictionary KIDDO will ever add already agree on. Spelling it `bm` internally
 * would have bought one moment of familiarity and cost every standard we get
 * for free.
 *
 * ## Why the list is a `const` array and not an enum
 *
 * Adding Chinese should be adding `"zh"` here and a dictionary beside the two
 * that exist — nothing else. `LOCALES` is the single list every other module
 * derives from (`Locale` itself, the switcher's options, the coverage test's
 * sweep), so a third language cannot be half-added: the moment it is in here,
 * `Record<Locale, …>` stops compiling everywhere a translation is missing.
 * That is the whole enforcement mechanism, and it is a type error rather than
 * a runtime fallback on purpose.
 */

/**
 * Every language KIDDO speaks, in the order the switcher offers them.
 *
 * Bahasa Melayu first, because it is the default and because the switcher's
 * first row is the one a parent's thumb lands on.
 */
export const LOCALES = ["ms", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * What KIDDO speaks when nobody has said otherwise.
 *
 * Bahasa Melayu, and this is a decision about who KIDDO is for rather than a
 * technical default. The people it is written for are Malaysian parents, most
 * of whom meet it through an advert on a phone — and a Malaysian phone is
 * usually set to English even in a household that speaks Malay at the dinner
 * table. So a device's own language setting is exactly the wrong thing to
 * infer a household's language from, and KIDDO no longer tries: the landing
 * page opens in Bahasa Melayu for everybody, and the switcher in the header
 * is one tap from English for the parent who would rather read that.
 *
 * The landing page is prerendered as static HTML in this language (see
 * `next.config.ts`), so this is also the language of the file a CDN hands out
 * and of `<html lang>` in it — which is what a first paint, a screen reader
 * and a search engine all read before any JavaScript has run.
 */
export const DEFAULT_LOCALE: Locale = "ms";

/** The user-facing name of a language, written in that language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  ms: "Bahasa Melayu",
  en: "English",
};

/**
 * The two letters on the switcher itself.
 *
 * `BM` rather than `MS`, and this is the one place the product is allowed to
 * disagree with the standard: nobody in Malaysia calls it MS. The code stays
 * `ms` everywhere it is machine-read.
 */
export const LOCALE_SHORT: Record<Locale, string> = {
  ms: "BM",
  en: "EN",
};

/**
 * The `lang` attribute for a locale.
 *
 * Kept as its own map rather than assumed equal to the code, because the day
 * a locale is regional — `zh-Hans`, `ms-MY` — the switcher's code and the
 * document's language part company and every reader of this already goes
 * through one function.
 */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  ms: "ms",
  en: "en",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
