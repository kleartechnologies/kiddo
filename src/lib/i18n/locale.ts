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
 * `Locale` is the *code* — `en`, `ms` — and it is what every function, store
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
 * English is first because it is the default (see `DEFAULT_LOCALE`), not
 * because it is more important.
 */
export const LOCALES = ["en", "ms"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * What KIDDO speaks when nobody has said otherwise.
 *
 * English, deliberately — see `docs/kiddo-localization.md`. Malaysian parents
 * read English product copy comfortably, the landing page is prerendered as
 * static HTML in one language (so *some* language has to be the one in the
 * file), and a device set to Malay still lands in Bahasa Melayu on its first
 * paint because `negotiate` runs before anything is drawn.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** The user-facing name of a language, written in that language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ms: "Bahasa Melayu",
};

/**
 * The two letters on the switcher itself.
 *
 * `BM` rather than `MS`, and this is the one place the product is allowed to
 * disagree with the standard: nobody in Malaysia calls it MS. The code stays
 * `ms` everywhere it is machine-read.
 */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  ms: "BM",
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
  en: "en",
  ms: "ms",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The best locale for a device, or null when none of them fit.
 *
 * Takes the browser's whole preference list, in order, and matches on the
 * *language subtag* only: a device set to `ms-MY`, `ms-SG` or plain `ms` all
 * mean Bahasa Melayu, and a switcher that only understood exact codes would
 * have missed every real Malaysian device.
 *
 * Returns null rather than the default so the caller can tell "the device
 * asked for Malay" apart from "the device asked for nothing we have" — the
 * difference between a preference and a fallback, which is exactly what
 * `resolveLocale` needs to get the priority order right.
 */
export function negotiate(tags: readonly string[] | undefined): Locale | null {
  for (const tag of tags ?? []) {
    if (typeof tag !== "string") continue;
    const [base = ""] = tag.toLowerCase().split("-");
    /* Indonesian is deliberately *not* matched to `ms`. The two are close
       enough that a machine would happily fold them together and far enough
       apart that a Malaysian child would hear the difference in the first
       sentence. A device set to `id` gets English until KIDDO has real
       Bahasa Indonesia to give it. */
    if (isLocale(base)) return base;
  }
  return null;
}
