"use client";

import { Compass, DoorOpen, LineChart, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { WorldDoor } from "@/components/worlds/WorldDoor";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import type { WorldProgress } from "@/lib/journey/journey";
import type { PlayableWorldId } from "@/lib/worlds/activities";
import { doorsOf, WORLD_PLACES } from "@/lib/worlds/places";
import { SectionIntro } from "./SectionIntro";

/**
 * The shape of one visit, in four steps — and then the same thing shown
 * rather than described.
 *
 * The steps are kept to what the product actually does: a child picks a
 * world, opens a door and plays a short round drawn in that world's own
 * scenery, the round teaches something small, and a grown-up can see
 * afterwards what was explored. No claims about outcomes; just the loop.
 *
 * Underneath them are three real `WorldDoor`s — the same component the
 * child's home screen is built from — handed an example journey: one world
 * untouched, one half found, one finished. A parent sees exactly what their
 * child will see after a few visits, and the caption says it is an example so
 * the page makes no claim about any particular child.
 */
const STEPS: { id: string; title: MessageKey; detail: MessageKey; icon: ReactNode; tone: string }[] = [
  {
    id: "choose",
    title: "landing.how.step1.title",
    detail: "landing.how.step1.detail",
    icon: <Compass className="size-6" aria-hidden />,
    tone: "bg-tide-soft text-tide-ink",
  },
  {
    id: "explore",
    title: "landing.how.step2.title",
    detail: "landing.how.step2.detail",
    icon: <DoorOpen className="size-6" aria-hidden />,
    tone: "bg-sprout-soft text-sprout-ink",
  },
  {
    id: "learn",
    title: "landing.how.step3.title",
    detail: "landing.how.step3.detail",
    icon: <Sparkles className="size-6" aria-hidden />,
    tone: "bg-blossom-soft text-blossom-ink",
  },
  {
    id: "see",
    title: "landing.how.step4.title",
    detail: "landing.how.step4.detail",
    icon: <LineChart className="size-6" aria-hidden />,
    tone: "bg-honey-soft text-honey-ink",
  },
];

/** One world untouched, one part-way, one finished — a few visits in. */
const EXAMPLE: Record<PlayableWorldId, number> = { counting: 3, animals: 1, words: 0 };

function exampleProgress(world: PlayableWorldId): WorldProgress {
  const total = doorsOf(world);
  const done = Math.min(EXAMPLE[world], total);
  return { done, total, complete: done === total };
}

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

      <ol className="mt-10 grid list-none grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "bg-paper border-edge rounded-card shadow-soft flex flex-col gap-3 border p-5",
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", step.tone)}>
                {step.icon}
              </span>
              <span className="text-ink-300 font-display text-sm font-semibold">{index + 1}</span>
            </div>
            <h3 className="font-display text-xl leading-snug font-semibold">{t(step.title)}</h3>
            <p className="text-ink-700 text-base leading-snug">{t(step.detail)}</p>
          </li>
        ))}
      </ol>

      {/* The same four steps, as the child's own home screen would show them. */}
      <div className="mt-10 sm:mt-14">
        <ul
          className="grid list-none grid-cols-1 gap-5 [grid-auto-rows:1fr] sm:gap-6 md:grid-cols-3"
          aria-label={t("landing.how.doorsAria")}
          data-landing-doors
        >
          {(Object.keys(EXAMPLE) as PlayableWorldId[]).map((id) => (
            <li key={id} className="flex min-w-0">
              <WorldDoor
                place={WORLD_PLACES[id]}
                progress={exampleProgress(id)}
                suggested={id === "animals"}
              />
            </li>
          ))}
        </ul>
        <p className="text-ink-500 mt-4 text-center text-sm">{t("landing.how.doorsCaption")}</p>
      </div>
    </section>
  );
}
