"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, Star } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  continueTarget,
  everythingDone,
  lastWorldOf,
  stickersOf,
} from "@/lib/journey/journey";
import { useJourney } from "@/lib/journey/useJourney";
import { instantly, riseIn } from "@/lib/motion";
import { activityRoute, WORLD_PLACES } from "@/lib/worlds/places";

/**
 * Where to go next, said once, in one big button.
 *
 * A first visit starts the adventure at the first door of the first world.
 * A return goes to the next unfinished door in the world the child was last
 * in, so "continue" means continue. Once every door in every world has been
 * opened there is nothing to continue, and the panel says so warmly and
 * points back at the worlds rather than inventing something to chase.
 *
 * The stickers are the only tally on the home screen: one star per finished
 * door, shown as stars and a count, never as a score against anything.
 */
export function ContinueAdventure({ className }: { className?: string }) {
  const journey = useJourney();
  /* Under reduced motion the panel is simply there, like everything else. */
  const reduced = useReducedMotion();
  const target = continueTarget(journey);
  const done = everythingDone(journey);
  const stickers = stickersOf(journey);
  const returning = journey.last !== null;

  const heading = done
    ? "You explored every world!"
    : returning
      ? "Continue your adventure"
      : "Start your adventure";

  const detail = target
    ? `${returning ? "Next up" : "First stop"}: ${target.title} in ${WORLD_PLACES[target.world].name}`
    : "Every door is open. Play any of them again, any time.";

  const href = target
    ? activityRoute(target)
    : WORLD_PLACES[lastWorldOf(journey) ?? "counting"].route;

  return (
    <motion.section
      variants={reduced ? instantly(riseIn) : riseIn}
      initial="hidden"
      animate="show"
      aria-labelledby="continue-heading"
      data-continue={done ? "done" : returning ? "continue" : "start"}
      className={cn(
        "bg-paper border-edge shadow-soft flex flex-col gap-4 rounded-hero border p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 id="continue-heading" className="font-display text-2xl font-semibold sm:text-3xl">
          {heading}
        </h2>
        <p className="text-ink-500 text-base sm:text-lg">{detail}</p>
        {stickers > 0 ? (
          <p
            className="text-honey-ink inline-flex items-center gap-1.5 pt-1 text-base font-semibold"
            aria-label={`${stickers} ${stickers === 1 ? "sticker" : "stickers"} earned`}
          >
            <span aria-hidden className="inline-flex">
              {Array.from({ length: Math.min(stickers, 5) }, (_, index) => (
                <Star key={index} className="size-5 fill-honey-base text-honey-deep" />
              ))}
            </span>
            <span aria-hidden>
              {stickers} {stickers === 1 ? "sticker" : "stickers"}
            </span>
          </p>
        ) : null}
      </div>

      <ButtonLink
        href={href}
        size="lg"
        icon={<Compass className="size-6" aria-hidden />}
        className="shrink-0"
        data-continue-link
      >
        {done ? "Visit the worlds" : returning ? "Continue" : "Let's go!"}
      </ButtonLink>
    </motion.section>
  );
}
