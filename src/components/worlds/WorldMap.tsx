"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { continueTarget, worldProgress } from "@/lib/journey/journey";
import { useJourney } from "@/lib/journey/useJourney";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";
import { WORLD_PLACES } from "@/lib/worlds/places";
import { staggerChildren } from "@/lib/motion";
import { WorldDoor } from "./WorldDoor";

/**
 * The three worlds, side by side.
 *
 * A row of doors rather than a drawn map with a winding road: a road says
 * "in this order", and there is no order — every world is open from the
 * first visit. The one "continue" would pick is ringed, so a child who wants
 * to be told where to go next is told, and one who does not is not.
 */
export function WorldMap({ className }: { className?: string }) {
  const t = useT();
  const journey = useJourney();
  const suggested = continueTarget(journey)?.world ?? null;

  return (
    <motion.ul
      variants={staggerChildren(0.08, 0.05)}
      initial="hidden"
      animate="show"
      aria-label={t("worlds.map")}
      className={cn(
        "grid list-none grid-cols-1 gap-5 [grid-auto-rows:1fr] sm:gap-6 md:grid-cols-3",
        className,
      )}
    >
      {PLAYABLE_WORLDS.map((id) => {
        const place = WORLD_PLACES[id];
        return (
          <li key={id} className="flex min-w-0">
            <WorldDoor
              place={place}
              progress={worldProgress(journey, id)}
              suggested={suggested === id}
            />
          </li>
        );
      })}
    </motion.ul>
  );
}
