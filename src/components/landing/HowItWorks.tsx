import { Compass, DoorOpen, Flower2, Footprints, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { SectionIntro } from "./SectionIntro";

/**
 * The shape of one visit, in five steps.
 *
 * This is the page's one explanation, and it is kept to what the product
 * actually does: a child picks a world, opens a door, plays a short round
 * drawn in that world's own scenery, the world gives something back, and
 * KIDDO points at the next door. No claims about outcomes — just the loop.
 */
const STEPS: { title: string; detail: string; icon: ReactNode; tone: string }[] = [
  {
    title: "World",
    detail: "Pick a place to go: a garden, a meadow of animals, a storybook.",
    icon: <Compass className="size-6" aria-hidden />,
    tone: "bg-tide-soft text-tide-ink",
  },
  {
    title: "Activity",
    detail: "Open a door. Every activity is a short round of five questions.",
    icon: <DoorOpen className="size-6" aria-hidden />,
    tone: "bg-sprout-soft text-sprout-ink",
  },
  {
    title: "Discovery",
    detail: "Count, match and connect, inside scenery that belongs to that world.",
    icon: <Sparkles className="size-6" aria-hidden />,
    tone: "bg-blossom-soft text-blossom-ink",
  },
  {
    title: "Reward",
    detail: "The world gives something back: a flower grows, an animal is met, a page is written.",
    icon: <Flower2 className="size-6" aria-hidden />,
    tone: "bg-honey-soft text-honey-ink",
  },
  {
    title: "Next adventure",
    detail: "KIDDO points at the next door. Nothing is locked, and nothing is taken away.",
    icon: <Footprints className="size-6" aria-hidden />,
    tone: "bg-apricot-soft text-apricot-ink",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" id="how-it-works" className="scroll-mt-24">
      <SectionIntro id="how-heading" eyebrow="How KIDDO works" title="Every activity has a place.">
        Instead of forcing every lesson into the same screen, KIDDO gives each one its own
        scenery and its own way of playing. Here is what one visit looks like.
      </SectionIntro>

      <ol className="mt-10 grid list-none grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
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
            <h3 className="font-display text-xl font-semibold">{step.title}</h3>
            <p className="text-ink-700 text-base leading-snug">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
