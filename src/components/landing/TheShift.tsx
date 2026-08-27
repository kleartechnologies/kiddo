"use client";

import { ArrowRight } from "lucide-react";

import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";

/**
 * The turning point.
 *
 * Everything above this is the evening a parent already knows. Everything
 * below is KIDDO. This is the sentence in between, and it earns its own
 * surface: the one dark panel on a cream page, so that scrolling past it
 * feels like the argument changing direction rather than another section
 * arriving.
 *
 * Dark ink and cream rather than a gradient or a glow. The contrast does the
 * work — #fefcf5 on #2c2620 is a warm brown-and-paper pairing that reads as
 * considered rather than loud, and it survives being screenshotted into a
 * Facebook advert, which is where a good deal of this page will end up.
 *
 * The three rows are the argument in miniature: what an endless feed gives a
 * child, and what a short round gives them instead. Both halves are things
 * KIDDO actually does — a round ends, an activity finishes, the parents'
 * space shows what was explored — so nothing here is a promise the product
 * cannot keep.
 */

/** Left is the evening as it is; right is the same evening with KIDDO in it. */
const PAIRS: { id: string; from: MessageKey; to: MessageKey }[] = [
  { id: "1", from: "landing.shift.from.1", to: "landing.shift.to.1" },
  { id: "2", from: "landing.shift.from.2", to: "landing.shift.to.2" },
  { id: "3", from: "landing.shift.from.3", to: "landing.shift.to.3" },
];

export function TheShift() {
  const t = useT();
  return (
    <section aria-labelledby="shift-heading">
      <div className="bg-ink-900 text-cream-50 rounded-hero px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 text-center">
          <p className="text-cream-50/60 font-display text-sm font-semibold tracking-wide uppercase">
            {t("landing.shift.eyebrow")}
          </p>
          <h2
            id="shift-heading"
            className="font-display text-3xl leading-tight font-bold text-balance sm:text-4xl lg:text-[2.75rem]"
          >
            {t("landing.shift.title")}
          </h2>
          <p className="text-cream-50/80 text-lg leading-relaxed text-pretty sm:text-xl">
            {t("landing.shift.body")}
          </p>
        </div>

        <ul
          className="mx-auto mt-10 flex max-w-3xl list-none flex-col gap-3 sm:mt-14 sm:gap-4"
          aria-label={t("landing.shift.listAria")}
        >
          {PAIRS.map((pair) => (
            <li
              key={pair.id}
              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4"
            >
              <p className="text-cream-50/55 rounded-card border border-cream-50/15 px-4 py-3 text-base leading-snug sm:px-5 sm:text-lg">
                <span className="sr-only">{t("landing.shift.fromLabel")}: </span>
                {t(pair.from)}
              </p>
              {/* Points down the page on a phone, across it on a desktop. */}
              <ArrowRight
                className="text-cream-50/40 mx-auto size-5 shrink-0 rotate-90 sm:rotate-0"
                aria-hidden
              />
              <p className="bg-cream-50/10 rounded-card text-cream-50 px-4 py-3 text-base leading-snug font-semibold sm:px-5 sm:text-lg">
                <span className="sr-only">{t("landing.shift.toLabel")}: </span>
                {t(pair.to)}
              </p>
            </li>
          ))}
        </ul>

        <p className="font-display mx-auto mt-10 max-w-2xl text-center text-xl leading-snug font-semibold text-balance sm:mt-14 sm:text-2xl">
          {t("landing.shift.transition")}
        </p>
      </div>
    </section>
  );
}
