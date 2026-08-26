"use client";

import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { SectionIntro } from "./SectionIntro";

/**
 * The problem, and the alternative — the one section on the page that says
 * what KIDDO is *instead of*.
 *
 * Kept to things a parent has seen for themselves. No statistics, no study,
 * no claim about attention spans or outcomes: two columns of plain
 * observations, one about an endless feed and one about KIDDO, each of
 * which is either obviously true or is something the product actually does
 * and the rest of this page shows.
 *
 * The lists are keys rather than sentences now, so the observations are the
 * same four in either language and the catalogue is the only place the
 * wording lives.
 */
const FEED: MessageKey[] = [
  "landing.screenTime.feed.1",
  "landing.screenTime.feed.2",
  "landing.screenTime.feed.3",
  "landing.screenTime.feed.4",
];

const KIDDO: MessageKey[] = [
  "landing.screenTime.kiddo.1",
  "landing.screenTime.kiddo.2",
  "landing.screenTime.kiddo.3",
  "landing.screenTime.kiddo.4",
];

export function ScreenTime() {
  const t = useT();
  return (
    <section aria-labelledby="screen-time-heading" id="why-kiddo" className="scroll-mt-24">
      <SectionIntro
        id="screen-time-heading"
        eyebrow={t("landing.screenTime.eyebrow")}
        title={t("landing.screenTime.title")}
      >
        {t("landing.screenTime.body")}
      </SectionIntro>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-2 md:gap-6">
        <Column
          title={t("landing.screenTime.feed.title")}
          items={FEED}
          tone="bg-ink-900/5 text-ink-500"
          icon={<Minus className="size-4" strokeWidth={3} aria-hidden />}
          muted
        />
        <Column
          title={t("landing.screenTime.kiddo.title")}
          items={KIDDO}
          tone="bg-sage-soft text-sage-ink"
          icon={<Check className="size-4" strokeWidth={3} aria-hidden />}
        />
      </div>
    </section>
  );
}

function Column({
  title,
  items,
  tone,
  icon,
  muted,
}: {
  title: string;
  items: MessageKey[];
  tone: string;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "rounded-card border p-5 sm:p-6",
        muted ? "border-edge bg-cream-50/60" : "bg-paper border-edge shadow-soft",
      )}
    >
      <h3 className={cn("font-display text-xl font-semibold", muted && "text-ink-700")}>{title}</h3>
      <ul className="mt-4 flex list-none flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tone)}>
              {icon}
            </span>
            <span className={cn("text-base leading-snug", muted ? "text-ink-700" : "text-ink-900")}>
              {t(item)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
