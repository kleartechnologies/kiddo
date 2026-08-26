"use client";

import { useEffect } from "react";

import { LOCALE_HTML_LANG } from "@/lib/i18n/locale";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * Keeps `<html lang>` telling the truth.
 *
 * The attribute is written into the static HTML as `en` — that file really is
 * English, and a prerendered page cannot know whose device is about to open
 * it — so something has to correct it once the stored preference is known.
 * This is that something: no markup, no wrapper, one attribute.
 *
 * It matters more than it looks. `lang` is what a screen reader picks a voice
 * from, what a browser's built-in translator offers to translate *from*, and
 * what hyphenation and quotation rules follow. A page of Bahasa Melayu
 * labelled English is read aloud in an English voice, which is worse than no
 * label at all.
 *
 * `setLocale` also sets the attribute directly, so a switch mid-page is
 * applied in the same tick as the strings rather than one commit later. This
 * covers the two cases that never go through `setLocale`: the first load, and
 * a change made in another tab.
 */
export function HtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  return null;
}
