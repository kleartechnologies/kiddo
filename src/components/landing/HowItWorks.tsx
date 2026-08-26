"use client";

import { Compass, DoorOpen, Flower2, Footprints, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { SectionIntro } from "./SectionIntro";

/**
 * The shape of one visit, in five steps.
 *
 * This is the page's one explanation, and it is kept to what the product
 * actually does: a child picks a world, opens a door, plays a short round
 * drawn in that world's own scenery, the world gives something back, and
 * KIDDO points at the next door. No claims about outcomes — just the loop.
 */
const STEPS: { id: string; title: MessageKey; detail: MessageKey; icon: ReactNode; tone: string }[] = [
  {
    id: "world",
    title: "landing.how.world.title",
    detail: "landing.how.world.detail",
    icon: <Compass className="size-6" aria-hidden />,
    tone: "bg-tide-soft text-tide-ink",
  },
  {
    id: "activity",
    title: "landing.how.activity.title",
    detail: "landing.how.activity.detail",
    icon: <DoorOpen className="size-6" aria-hidden />,
    tone: "bg-sprout-soft text-sprout-ink",
  },
  {
    id: "discovery",
    title: "landing.how.discovery.title",
    detail: "landing.how.discovery.detail",
    icon: <Sparkles className="size-6" aria-hidden />,
    tone: "bg-blossom-soft text-blossom-ink",
  },
  {
    id: "reward",
    title: "landing.how.reward.title",
    detail: "landing.how.reward.detail",
    icon: <Flower2 className="size-6" aria-hidden />,
    tone: "bg-honey-soft text-honey-ink",
  },
  {
    id: "next",
    title: "landing.how.next.title",
    detail: "landing.how.next.detail",
    icon: <Footprints className="size-6" aria-hidden />,
    tone: "bg-apricot-soft text-apricot-ink",
  },
];

export function HowItWorks() {
  const t = useT();
  return (
    <section aria-labelledby="how-heading" id="how-it-works" className="scroll-mt-24">
      <SectionIntro
        id="how-heading"
        eyebrow={t("landing.how.eyebrow")}
        title={t("landing.how.title")}
      >
        {t("landing.how.body")}
      </SectionIntro>

      <ol className="mt-10 grid list-none grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "bg-paper border-edge relative flex flex-col gap-3 rounded-card border p-5 shadow-soft",
              index === STEPS.length - 1 && "sm:col-span-2 lg:col-span-1",
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", step.tone)}>
                {step.icon}
              </span>
              <span className="text-ink-300 font-display text-sm font-semibold">{index + 1}</span>
            </div>
            <h3 className="font-display text-xl font-semibold">{t(step.title)}</h3>
            <p className="text-ink-700 text-base leading-snug">{t(step.detail)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
