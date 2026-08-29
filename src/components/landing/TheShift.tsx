"use client";

import { Check, X } from "lucide-react";

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
 * Two columns, not a feature grid: the feed as a parent already knows it on
 * the left, KIDDO on the right, each line something either product visibly
 * does. Nothing on the KIDDO side is a promise the app cannot keep — a round
 * ends, there are no adverts, nothing is sold to the child — and nothing on
 * the video side is a claim about children, only about the feed itself. No
 * doctors, no studies, no percentages: the comparison stands on what a
 * parent has personally watched happen.
 */

/** The feed's side of the evening, line by line. */
const FEED: MessageKey[] = [
  "landing.shift.yt.1",
  "landing.shift.yt.2",
  "landing.shift.yt.3",
  "landing.shift.yt.4",
  "landing.shift.yt.5",
];

/** KIDDO's side of the same evening. */
const KIDDO: MessageKey[] = [
  "landing.shift.k.1",
  "landing.shift.k.2",
  "landing.shift.k.3",
  "landing.shift.k.4",
  "landing.shift.k.5",
  "landing.shift.k.6",
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

        <div
          className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6"
          role="group"
          aria-label={t("landing.shift.listAria")}
        >
          {/* The feed, dimmed: present but not the point. */}
          <div className="rounded-card border border-cream-50/15 p-5 sm:p-6">
            <h3 className="font-display text-cream-50/70 text-lg font-semibold sm:text-xl">
              {t("landing.shift.ytLabel")}
            </h3>
            <ul className="mt-4 flex list-none flex-col gap-3">
              {FEED.map((line) => (
                <li key={line} className="text-cream-50/60 flex items-start gap-3 text-base leading-snug sm:text-lg">
                  <X className="mt-1 size-4 shrink-0 text-cream-50/40" strokeWidth={3} aria-hidden />
                  {t(line)}
                </li>
              ))}
            </ul>
          </div>

          {/* KIDDO, lit: the same surface the rest of the page argues for. */}
          <div className="bg-cream-50/10 rounded-card border border-cream-50/25 p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold sm:text-xl">
              {t("landing.shift.kiddoLabel")}
            </h3>
            <ul className="mt-4 flex list-none flex-col gap-3">
              {KIDDO.map((line) => (
                <li key={line} className="flex items-start gap-3 text-base leading-snug font-medium sm:text-lg">
                  <Check className="text-sage-base mt-1 size-4 shrink-0" strokeWidth={3} aria-hidden />
                  {t(line)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="font-display mx-auto mt-10 max-w-2xl text-center text-xl leading-snug font-semibold text-balance sm:mt-14 sm:text-2xl">
          {t("landing.shift.transition")}
        </p>
      </div>
    </section>
  );
}
