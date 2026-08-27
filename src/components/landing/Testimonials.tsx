"use client";

import { TESTIMONIALS, initialsOf } from "@/data/testimonials";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { SectionIntro } from "./SectionIntro";

/**
 * Nine parents, in their own words.
 *
 * The quotations live in `data/testimonials` rather than in the message
 * catalogue, because they are not interface copy: a Malay parent's sentence
 * stays Malay for an English-reading visitor and the other way round.
 * Translating a quotation would make it something the person did not say, and
 * a Malaysian household reads both languages anyway — the mixture is the
 * point, not a gap in the localisation. Each `blockquote` carries its own
 * `lang`, so a screen reader pronounces "seronok" instead of spelling it.
 *
 * The cards deliberately do not match. Every other one is filled in its
 * parent's own accent colour while the rest sit on paper, the quotes are
 * different lengths and the layout is a masonry rather than a grid, so the
 * section reads as nine separate people rather than nine slots in a
 * template.
 *
 * There are no photographs. KIDDO has no picture of these families and will
 * not buy one: a stock portrait next to a real quotation is the fastest way
 * to make a real quotation look invented. Initials on a coloured disc say
 * exactly as much as the page can honestly say.
 *
 * One DOM, two layouts. On a phone it is a snap-scrolling row, because that
 * is a gesture a parent already makes all day and it keeps eight of the nine
 * quotes out of the way of the price. From `sm` up it becomes CSS columns and
 * the whole wall is visible at once. The horizontal scroller is safe inside
 * `Screen`, whose wrapper is `overflow-x-clip`, so it never turns into
 * page-level horizontal scroll.
 */
export function Testimonials() {
  const t = useT();
  return (
    <section aria-labelledby="voices-heading" id="voices" className="scroll-mt-24">
      <SectionIntro
        id="voices-heading"
        eyebrow={t("landing.voices.eyebrow")}
        title={t("landing.voices.title")}
      >
        {t("landing.voices.body")}
      </SectionIntro>

      <ul
        className={cn(
          "mt-10 flex snap-x snap-mandatory list-none gap-4 overflow-x-auto pb-2 sm:mt-12",
          "sm:block sm:columns-2 sm:gap-6 sm:overflow-visible sm:pb-0 lg:columns-3",
        )}
        aria-label={t("landing.voices.aria")}
        /* A scrollable region needs to be reachable by keyboard on the phone
           layout; from `sm` up it stops scrolling and this does nothing. */
        tabIndex={0}
      >
        {TESTIMONIALS.map((voice, index) => {
          const accent = ACCENTS[voice.accent];
          /* Every other card is filled in its parent's own accent. Alternating
             rather than every third: consecutive quotes land in the same
             masonry column, so a stride of three would put a filled card at
             the top of all three columns and draw a stripe across the page. */
          const filled = index % 2 === 0;
          return (
            <li
              key={voice.id}
              className={cn(
                "w-[78vw] max-w-[21rem] shrink-0 snap-start",
                "sm:mb-6 sm:w-auto sm:max-w-none sm:break-inside-avoid",
              )}
            >
              <figure
                className={cn(
                  "rounded-hero flex h-full flex-col gap-4 border p-6 sm:h-auto sm:p-7",
                  filled
                    ? cn(accent.bgSoft, accent.border)
                    : "bg-paper border-edge shadow-soft",
                )}
              >
                <blockquote
                  lang={voice.voice}
                  className={cn(
                    "text-ink-900 leading-relaxed text-pretty",
                    voice.quote.length < 180 ? "text-lg" : "text-base sm:text-lg",
                  )}
                >
                  {voice.quote}
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <span
                    className={cn(
                      "font-display flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      filled ? cn("bg-paper", accent.text) : cn(accent.bgSoft, accent.text),
                    )}
                    aria-hidden
                  >
                    {initialsOf(voice.name)}
                  </span>
                  <span className="text-ink-700 font-display text-base font-semibold">
                    {voice.name}
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>

      <p className="text-ink-500 mt-3 text-center text-sm sm:hidden" aria-hidden>
        {t("landing.voices.swipe")}
      </p>
    </section>
  );
}
