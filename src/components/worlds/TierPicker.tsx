"use client";

import { ArrowRight, Check, Lock } from "lucide-react";

import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages";
import { tierKey } from "@/lib/i18n/names";
import { useT } from "@/lib/i18n/useLocale";
import type { TierState } from "@/lib/journey/journey";
import { TIERS, type Tier } from "@/lib/worlds/activities";

/**
 * Three buttons: Easy, Medium, Hard.
 *
 * The one piece of UI the difficulty system owns. It renders *state*, never
 * decides it — what is done, ready or locked comes from the journey via
 * `tierStateOf`, and what happens on a tap is the caller's. A locked tier is
 * still a real button a screen reader can land on and hear "Hard. Locked." —
 * it just does nothing when pressed, the way a locked door still has a
 * handle. Nothing here says "wrong", "score" or "level": a tier is only how
 * big a challenge the same friendly round deals.
 *
 * State is never colour alone: done wears a check, ready an arrow, locked a
 * padlock, each beside its word.
 *
 * ## How big is drawn, not written
 *
 * A four-year-old cannot read "Easy", "Medium", "Hard", and the words are the
 * only thing here that says how big a round is. So the buttons themselves
 * step up: three stones standing on one line, each a little taller than the
 * last. Height only — the widths stay as they were, because three pills that
 * also grew sideways wrap onto two rows on a 360px phone, and a staircase
 * broken across two lines is not a staircase. Nothing is counted, nothing is
 * rated, and the smallest is still comfortably bigger than a thumb.
 */

/** Three stones on one line. The floor is the smallest comfortable target. */
const TIER_HEIGHT: Readonly<Record<Tier, string>> = {
  1: "min-h-12",
  2: "min-h-13",
  3: "min-h-14",
};

const STATE_WORDS: Record<TierState, MessageKey> = {
  done: "worlds.tier.done",
  ready: "worlds.tier.ready",
  locked: "worlds.tier.locked",
};

export function TierPicker({
  states,
  selected,
  onSelect,
}: {
  states: Readonly<Record<Tier, TierState>>;
  selected: Tier | null;
  onSelect: (tier: Tier) => void;
}) {
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t("worlds.tier.group")}
      /* Standing on one line, so the three grow *upward*: centred, the same
         three heights read as a hill rather than a staircase. */
      className="flex flex-wrap items-end justify-center gap-2"
    >
      {TIERS.map((tier) => {
        const state = states[tier];
        const locked = state === "locked";
        const active = selected === tier;
        return (
          <button
            key={tier}
            type="button"
            data-tier={tier}
            data-tier-state={state}
            aria-pressed={active}
            aria-disabled={locked || undefined}
            aria-label={t("worlds.tier.sr", {
              tier: t(tierKey(tier)),
              state: t(STATE_WORDS[state]),
            })}
            onClick={() => {
              if (!locked) onSelect(tier);
            }}
            className={cn(
              "inline-flex min-w-12 items-center justify-center gap-1.5 rounded-full border-2 px-4 text-base font-semibold transition-colors",
              TIER_HEIGHT[tier],
              active
                ? "bg-tide-soft border-tide-base text-tide-ink"
                : "bg-paper border-edge text-ink-700",
              locked && "opacity-60",
            )}
          >
            {state === "done" ? (
              <Check className="size-4" strokeWidth={3} aria-hidden />
            ) : locked ? (
              <Lock className="size-4" aria-hidden />
            ) : (
              <ArrowRight className="size-4" aria-hidden />
            )}
            {t(tierKey(tier))}
          </button>
        );
      })}
    </div>
  );
}
