"use client";

import { Compass, ShieldCheck, Star } from "lucide-react";
import type { ReactNode } from "react";

import { WorldDoor } from "@/components/worlds/WorldDoor";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useLocale";
import type { WorldProgress } from "@/lib/journey/journey";
import type { PlayableWorldId } from "@/lib/worlds/activities";
import { doorsOf, WORLD_PLACES } from "@/lib/worlds/places";
import { SectionIntro } from "./SectionIntro";

/**
 * What happens after a round ends — shown with the product's own doors.
 *
 * The three cards below are the real `WorldDoor` the child's home screen is
 * built from, handed an example journey: one world untouched, one half
 * found, one finished. A parent sees exactly what their child will see after
 * a few visits, and the caption says it is an example so the page makes no
 * claim about any particular child.
 */
const EXAMPLE: Record<PlayableWorldId, number> = { counting: 3, animals: 1, words: 0 };

function exampleProgress(world: PlayableWorldId): WorldProgress {
  const total = doorsOf(world);
  const done = Math.min(EXAMPLE[world], total);
  return { done, total, complete: done === total };
}

const AFTER: { title: MessageKey; detail: MessageKey; icon: ReactNode; tone: string }[] = [
  {
    title: "landing.progress.keepsakes.title",
    detail: "landing.progress.keepsakes.detail",
    icon: <Star className="size-6 fill-honey-base" aria-hidden />,
    tone: "bg-honey-soft text-honey-ink",
  },
  {
    title: "landing.progress.continue.title",
    detail: "landing.progress.continue.detail",
    icon: <Compass className="size-6" aria-hidden />,
    tone: "bg-tide-soft text-tide-ink",
  },
  {
    title: "landing.progress.parents.title",
    detail: "landing.progress.parents.detail",
    icon: <ShieldCheck className="size-6" aria-hidden />,
    tone: "bg-sage-soft text-sage-ink",
  },
];

export function Progression() {
  const t = useT();
  return (
    <section aria-labelledby="progress-heading" className="scroll-mt-24">
      <SectionIntro
        id="progress-heading"
        eyebrow={t("landing.progress.eyebrow")}
        title={t("landing.progress.title")}
      >
        {t("landing.progress.body")}
      </SectionIntro>

      <div className="mt-10 sm:mt-12">
        <ul
          className="grid list-none grid-cols-1 gap-5 [grid-auto-rows:1fr] sm:gap-6 md:grid-cols-3"
          aria-label={t("landing.progress.doorsAria")}
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
        <p className="text-ink-500 mt-4 text-center text-sm">
          {t("landing.progress.caption")}
        </p>
      </div>

      <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-6">
        {AFTER.map((item) => (
          <li key={item.title} className="flex flex-col gap-3">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
              {item.icon}
            </span>
            <h3 className="font-display text-xl font-semibold">{t(item.title)}</h3>
            <p className="text-ink-700 text-base leading-relaxed">{t(item.detail)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
