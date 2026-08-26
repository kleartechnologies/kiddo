"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";

import { BackLink } from "@/components/kiddo/BackLink";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { SoundToggle } from "@/components/kiddo/SoundToggle";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { WorldMusic } from "@/components/kiddo/WorldMusic";
import { ButtonLink } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import {
  isCompleted,
  nextActivityIn,
  statusOf,
  suggestWorldAfter,
  tierStateOf,
  worldProgress,
  type ActivityStatus,
  type TierState,
} from "@/lib/journey/journey";
import type { MessageKey, Translate } from "@/lib/i18n/messages";
import { doorKey, tierKey, worldNameKey } from "@/lib/i18n/names";
import { useT } from "@/lib/i18n/useLocale";
import { useJourney } from "@/lib/journey/useJourney";
import { instantly, popIn, riseIn, springSoft, staggerChildren, tappableCard } from "@/lib/motion";
import { useChildName } from "@/lib/profile/useChildName";
import { activitiesOf, TIERS, type Tier, type WorldActivity } from "@/lib/worlds/activities";
import { activityRoute, WORLD_PLACES, type WorldPlace } from "@/lib/worlds/places";
import { WorldKeepsake } from "./WorldKeepsake";
import { WorldScene } from "./WorldScene";

/**
 * Inside a world: the map of its doors.
 *
 * ## Arriving
 *
 * The door on the home screen showed a picture of the place; this page opens
 * with that same picture, a size up, growing to fill the top of the screen
 * (`grow`), then the world's friend and its name settling in under it
 * (`riseIn`), then the doors popping into place one after another
 * (`popIn`, staggered). Three beats, under a second, all from the motion
 * vocabulary the rest of KIDDO already uses. Under reduced motion every one
 * of those is already in place on the first frame: the same information, at
 * once.
 *
 * ## What a door says
 *
 * Its name, what happens behind it, and one of three words: *done*, with the
 * world's own keepsake; *next*, the one KIDDO would pick; or *new*. Every
 * door is open — the words are an invitation, never a lock.
 */
export function WorldPage({ place }: { place: WorldPlace }) {
  const t = useT();
  const journey = useJourney();
  const name = useChildName();
  const reduced = useReducedMotion();
  const activities = activitiesOf(place.id);
  const progress = worldProgress(journey, place.id);
  const next = nextActivityIn(journey, place.id);
  const elsewhere = progress.complete ? suggestWorldAfter(journey, place.id) : null;
  const accent = ACCENTS[place.accent];

  /* Named and unnamed are two whole sentences rather than one with a comma
     spliced into it: where a name goes in a greeting is not the same in every
     language, and neither is whether it takes a comma. */
  const line = progress.complete
    ? name
      ? t("worlds.page.allDoneNamed", { name })
      : t("worlds.page.allDone")
    : progress.done === 0
      ? t(place.line)
      : (() => {
          const rest = next
            ? t("worlds.page.try", { door: t(doorKey(next, "title")) })
            : t(place.line);
          return name
            ? t("worlds.page.backNamed", { name, rest })
            : t("worlds.page.back", { rest });
        })();

  return (
    <Screen theme={place.theme} detail="quiet">
      <WorldMusic />

      <header className="flex items-center gap-3 sm:gap-4">
        <BackLink />
        <div className="min-w-0 flex-1">
          <h1 className={cn("font-display truncate text-xl font-semibold sm:text-2xl", accent.text)}>
            {t(place.name)}
          </h1>
        </div>
        <SoundToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 py-5 sm:gap-8 sm:py-8 [@media(max-height:44rem)]:gap-4 [@media(max-height:44rem)]:py-3">
        {/* The place itself, first and largest. */}
        <motion.div
          data-world-banner={place.id}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.32, ease: "easeOut" }}
          className="relative aspect-[9/4] w-full overflow-hidden rounded-hero border border-edge shadow-soft sm:aspect-[9/3] [@media(max-height:44rem)]:aspect-[9/2.5]"
        >
          <WorldScene world={place.id} />
        </motion.div>

        {/* Who lives here, and what they say. */}
        <motion.div
          variants={reduced ? instantly(riseIn) : riseIn}
          initial="hidden"
          animate="show"
          transition={{ ...springSoft, delay: reduced ? 0 : 0.22 }}
          className="flex items-start gap-3 sm:gap-4"
        >
          <CharacterFigure id={place.friend} size="md" pose="wave" />
          <SpeechBubble className="max-w-2xl flex-1" tail="left">
            <p className="font-display text-xl leading-snug font-semibold sm:text-2xl">{line}</p>
          </SpeechBubble>
        </motion.div>

        {/* What has been found here so far. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorldKeepsake place={place} done={progress.done} total={progress.total} />
          {next ? (
            <ButtonLink
              href={activityRoute(next)}
              size="md"
              icon={<Sparkles className="size-5" aria-hidden />}
              data-world-next
            >
              {progress.done === 0
                ? t("worlds.page.startHere")
                : t("worlds.page.continue")}
            </ButtonLink>
          ) : elsewhere ? (
            <ButtonLink
              href={WORLD_PLACES[elsewhere].route}
              size="md"
              iconRight
              icon={<ArrowRight className="size-5" aria-hidden />}
              data-world-next
            >
              {t("worlds.page.visit", {
                world: t(worldNameKey(elsewhere)),
              })}
            </ButtonLink>
          ) : null}
        </div>

        {/* The doors. */}
        <motion.ul
          variants={
            reduced
              ? instantly(staggerChildren(0.08, 0.4))
              : staggerChildren(0.08, 0.4)
          }
          initial="hidden"
          animate="show"
          aria-label={t("worlds.page.doors", { world: t(place.name) })}
          className="grid list-none grid-cols-1 gap-4 [grid-auto-rows:1fr] sm:grid-cols-3 sm:gap-5"
        >
          {activities.map((activity) => (
            <li key={activity.id} className="flex min-w-0">
              <Door
                activity={activity}
                place={place}
                status={statusOf(journey, activity)}
                tiers={
                  isCompleted(journey, activity.id)
                    ? {
                        1: tierStateOf(journey, activity.id, 1),
                        2: tierStateOf(journey, activity.id, 2),
                        3: tierStateOf(journey, activity.id, 3),
                      }
                    : null
                }
              />
            </li>
          ))}
        </motion.ul>
      </main>
    </Screen>
  );
}

const STATUS_WORDS: Record<ActivityStatus, MessageKey> = {
  done: "worlds.status.done",
  next: "worlds.status.next",
  new: "worlds.status.new",
};

/* How a door's aria-label says each tier state. */
const TIER_STATE_WORDS: Record<TierState, MessageKey> = {
  done: "worlds.tierState.done",
  ready: "worlds.tierState.ready",
  locked: "worlds.tierState.locked",
};

/** A door's tiers, as the sentence that follows its name. */
function tiersSaid(tiers: Readonly<Record<Tier, TierState>>, t: Translate): string {
  return TIERS.map((tier) =>
    t("worlds.doorCard.tier", {
      tier: t(tierKey(tier)),
      state: t(TIER_STATE_WORDS[tiers[tier]]),
    }),
  ).join(" ");
}

function Door({
  activity,
  place,
  status,
  tiers,
}: {
  activity: WorldActivity;
  place: WorldPlace;
  status: ActivityStatus;
  /* Easy/Medium/Hard states, shown only once the door has been finished —
     a fresh world stays an invitation, not a wall of padlocks. */
  tiers: Readonly<Record<Tier, TierState>> | null;
}) {
  const t = useT();
  const accent = ACCENTS[place.accent];
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? instantly(popIn) : popIn}
      {...tappableCard}
      tabIndex={-1}
      data-world-activity={activity.slug}
      data-world-activity-status={status}
      className="h-full w-full"
    >
      <Link
        href={activityRoute(activity)}
        aria-label={
          t("worlds.doorCard.sr", {
            title: t(doorKey(activity, "title")),
            blurb: t(doorKey(activity, "blurb")),
            status: t(STATUS_WORDS[status]),
          }) + (tiers ? ` ${tiersSaid(tiers, t)}` : "")
        }
        className={cn(
          "group flex h-full min-h-[7.5rem] flex-col gap-2 rounded-card border p-5",
          "bg-paper border-edge shadow-soft transition-shadow hover:shadow-lift",
          status === "next" && "ring-honey-base ring-4 ring-offset-2 ring-offset-cream-50",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl leading-tight font-semibold sm:text-2xl">
            {t(doorKey(activity, "title"))}
          </h2>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
              status === "done"
                ? "bg-sprout-soft text-sprout-ink"
                : status === "next"
                  ? "bg-honey-soft text-honey-ink"
                  : cn(accent.bgSoft, accent.text),
            )}
          >
            {status === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : null}
            {t(STATUS_WORDS[status])}
          </span>
        </div>
        <p className="text-ink-500 text-base leading-snug">
          {t(doorKey(activity, "blurb"))}
        </p>
        {tiers ? (
          <span className="flex flex-wrap items-center gap-1.5" data-door-tiers>
            {TIERS.map((tier) => {
              const state = tiers[tier];
              return (
                <span
                  key={tier}
                  data-door-tier={tier}
                  data-door-tier-state={state}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    state === "done"
                      ? "bg-sprout-soft text-sprout-ink"
                      : state === "ready"
                        ? "bg-honey-soft text-honey-ink"
                        : "bg-ink-900/5 text-ink-500",
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  ) : state === "ready" ? (
                    <ArrowRight className="size-3" aria-hidden />
                  ) : (
                    <Lock className="size-3" aria-hidden />
                  )}
                  {t(tierKey(tier))}
                </span>
              );
            })}
          </span>
        ) : null}
        <span className="text-ink-700 mt-auto inline-flex items-center gap-1 pt-2 text-base font-semibold">
          {status === "done"
            ? t("worlds.doorCard.playAgain")
            : t("worlds.doorCard.play")}
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </motion.div>
  );
}
