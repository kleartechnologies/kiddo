"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { popIn, tappableCard } from "@/lib/motion";
import type { WorldProgress } from "@/lib/journey/journey";
import type { WorldPlace } from "@/lib/worlds/places";
import { WorldKeepsake } from "./WorldKeepsake";
import { WorldScene } from "./WorldScene";

/**
 * The way into a world, on the home screen.
 *
 * A picture of the place, its name, one line about it, and what the child
 * has found there so far. The whole door is one link — as `GameCard` is —
 * and the same container-query geometry keeps three doors level in a row.
 *
 * What it says about progress is said in the world's own things: flowers
 * grown, animals met, pages written. A door that has been finished says
 * "all found"; one never opened says "new"; the rest say how many. Never a
 * percentage, never a bar.
 */
export function WorldDoor({
  place,
  progress,
  suggested,
}: {
  place: WorldPlace;
  progress: WorldProgress;
  /** The world "continue" would take the child to. Marked, not moved. */
  suggested?: boolean;
}) {
  const t = useT();
  const accent = ACCENTS[place.accent];
  const state =
    progress.complete ? "done" : progress.done === 0 ? "new" : "going";

  return (
    <motion.div
      variants={popIn}
      {...tappableCard}
      data-world-door={place.id}
      data-world-door-state={state}
      tabIndex={-1}
      className="@container h-full w-full"
    >
      <Link
        href={place.route}
        aria-label={t("worlds.door.sr", {
          name: t(place.name),
          line: t(place.line),
          state:
            state === "done"
              ? t("worlds.door.state.done")
              : state === "new"
                ? t("worlds.door.state.new")
                : t("worlds.door.state.going", {
                    done: progress.done,
                    total: progress.total,
                  }),
        })}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-card",
          "bg-paper border border-edge shadow-soft",
          "transition-shadow hover:shadow-lift",
          suggested && "ring-honey-base ring-4 ring-offset-2 ring-offset-cream-50",
        )}
      >
        <div className="relative aspect-[9/5] shrink-0">
          <WorldScene world={place.id} />
          <span
            className={cn(
              "absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-semibold",
              "bg-paper/90 shadow-soft",
              state === "done" ? "text-sprout-ink" : accent.text,
            )}
          >
            {state === "done" ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-4" strokeWidth={3} aria-hidden />{" "}
                {t("worlds.door.allFound")}
              </span>
            ) : state === "new" ? (
              t("worlds.door.new")
            ) : (
              t("worlds.door.progress", {
                done: progress.done,
                total: progress.total,
              })
            )}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-5 @min-[19.5rem]:p-6">
          <h3
            className={cn(
              "font-display text-2xl leading-tight font-semibold @min-[19.5rem]:text-[1.75rem]",
            )}
          >
            {t(place.name)}
          </h3>
          <p className="text-ink-500 text-base leading-snug @min-[19.5rem]:text-lg line-clamp-2 min-h-[2lh]">
            {t(place.line)}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <WorldKeepsake place={place} done={progress.done} total={progress.total} size="sm" />
            <span
              aria-hidden
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-full",
                "transition-transform group-hover:scale-105",
                accent.bgBase,
                accent.textOnBase,
              )}
            >
              <ArrowRight className="size-7" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
