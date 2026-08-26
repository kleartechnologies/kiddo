"use client";

import Link from "next/link";
import { ArrowRight, Check, Compass, Play, Sparkles, Star } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

import { ChildNameField } from "@/components/parents/ChildNameField";
import { ResetProgress } from "@/components/parents/ResetProgress";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WorldScene } from "@/components/worlds/WorldScene";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { around } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import { doorKey, rewardKey, worldNameKey } from "@/lib/i18n/names";
import { useT, useTranslation } from "@/lib/i18n/useLocale";
import type { Journey } from "@/lib/journey/journey";
import { useJourney } from "@/lib/journey/useJourney";
import {
  conceptsByWorld,
  daypartGreeting,
  journeySummary,
  nextUp,
  overviewLine,
  progressLabel,
  recentActivities,
  tiersLabel,
  worldSummaries,
  type WorldSummary,
} from "@/lib/parents/dashboard";
import { useChildName } from "@/lib/profile/useChildName";
import { PRIVACY } from "@/lib/routes";
import { activityRoute, WORLD_PLACES } from "@/lib/worlds/places";

/**
 * The parent side of KIDDO: the child's journey, read plainly.
 *
 * One page, read top to bottom the way a grown-up reads it at the end of
 * the day: hello; how far the child has come, in one sentence and three
 * numbers; the three worlds and what is finished in each; what was done
 * recently and what is waiting next; what all of that was actually
 * practising; and, at the bottom where it belongs, the name box and the
 * reset.
 *
 * Everything on it is computed from the same journey the child's home
 * screen reads (`lib/parents/dashboard`). Nothing moves except in response
 * to a press: this is a report, not a place, and the child's world is one
 * deliberate link away.
 *
 * Worlds, doors and keepsakes are named through the catalogue by id — the
 * same keys the child's own map reads — so a parent switching to Malay sees
 * the world their child is looking at, called what their child hears it
 * called, rather than an English name inside a Malay sentence.
 */
export function ParentDashboard({ children }: { children?: ReactNode }) {
  const journey = useJourney();
  const name = useChildName();
  const { locale, t } = useTranslation();
  const greeting = useGreeting(locale);

  const summary = journeySummary(journey);
  const worlds = worldSummaries(journey);
  const recent = recentActivities(journey);
  const next = nextUp(journey);

  return (
    <main className="flex flex-1 flex-col gap-8 py-6 select-text sm:gap-10 sm:py-8">
      {/* ---- Hello ------------------------------------------------------ */}
      <section aria-labelledby="parent-heading" className="space-y-2">
        <h1 id="parent-heading" className="font-display text-3xl font-semibold sm:text-4xl">
          {greeting}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" data-parent-child>
          <p className="text-ink-700 text-base sm:text-lg">
            {name ? <Showing locale={locale} name={name} /> : t("parents.child.none")}
          </p>
          <a
            href="#child-name"
            className="text-ink-700 inline-flex min-h-12 items-center text-base font-semibold underline underline-offset-4"
          >
            {t(name ? "parents.child.change" : "parents.child.add")}
          </a>
        </div>
      </section>

      {/* ---- Overview --------------------------------------------------- */}
      <Card as="section" aria-labelledby="overview-heading" padding="lg" radius="hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="space-y-2 lg:max-w-md">
            <h2 id="overview-heading" className="font-display text-2xl font-semibold sm:text-3xl">
              {name
                ? t("parents.journey.titleNamed", { name })
                : t("parents.journey.title")}
            </h2>
            <p className="text-ink-700 text-lg" data-parent-overview>
              {overviewLine(journey, locale)}
            </p>
            <p className="text-ink-500 text-sm leading-snug">{t("parents.journey.note")}</p>
          </div>

          <dl className="grid grid-cols-3 gap-3 sm:gap-4 lg:w-[26rem] lg:shrink-0" data-parent-summary>
            <Stat
              icon={<Check className="size-5" strokeWidth={3} aria-hidden />}
              tone="sprout"
              value={summary.activitiesDone}
              of={summary.activitiesTotal}
              label="parents.stat.activities"
            />
            <Stat
              icon={<Star className="size-5 fill-honey-base" aria-hidden />}
              tone="honey"
              value={summary.keepsakes}
              of={summary.activitiesTotal}
              label="parents.stat.keepsakes"
            />
            <Stat
              icon={<Compass className="size-5" aria-hidden />}
              tone="tide"
              value={summary.worldsVisited}
              of={summary.worldsTotal}
              label="parents.stat.worlds"
            />
          </dl>
        </div>
      </Card>

      {/* ---- Worlds ----------------------------------------------------- */}
      <section aria-labelledby="worlds-heading" className="space-y-4">
        <SectionHeading id="worlds-heading">{t("parents.section.worlds")}</SectionHeading>
        <ul className="grid list-none grid-cols-1 gap-4 md:grid-cols-3" data-parent-worlds>
          {worlds.map((world) => (
            <li key={world.place.id} className="flex min-w-0">
              <WorldProgressCard world={world} />
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Recent + next ---------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card as="section" aria-labelledby="recent-heading" className="flex flex-col gap-4">
          <SectionHeading id="recent-heading">{t("parents.section.recent")}</SectionHeading>
          {recent.length ? (
            <ol className="flex list-none flex-col divide-y divide-edge" data-parent-recent>
              {recent.map((activity) => {
                const place = WORLD_PLACES[activity.world];
                return (
                  <li key={activity.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        ACCENTS[place.accent].bgSoft,
                        ACCENTS[place.accent].text,
                      )}
                    >
                      <Check className="size-5" strokeWidth={3} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink-900 truncate text-base font-semibold">
                        {t(doorKey(activity, "title"))}
                      </p>
                      <p className="text-ink-500 text-sm">
                        {t("parents.recent.line", {
                          world: t(worldNameKey(place.id)),
                          reward: t(rewardKey(activity.world, "one")),
                        })}
                      </p>
                      <p className="text-ink-500 text-sm" data-parent-tiers>
                        {tiersLabel(journey, activity.id, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-ink-500 text-base" data-parent-recent-empty>
              {t("parents.recent.empty")}
            </p>
          )}
        </Card>

        <Card as="section" aria-labelledby="next-heading" className="flex flex-col gap-4">
          <SectionHeading id="next-heading">{t("parents.section.next")}</SectionHeading>
          {next ? (
            <div className="flex flex-1 flex-col gap-4" data-parent-next>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    ACCENTS[next.place.accent].bgSoft,
                    ACCENTS[next.place.accent].text,
                  )}
                >
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-ink-900 text-lg font-semibold">
                    {t(doorKey(next.activity, "title"))}
                  </p>
                  <p className="text-ink-500 text-sm">
                    {t("parents.next.line", {
                      world: t(worldNameKey(next.place.id)),
                      mode: t(next.mode === "start" ? "parents.next.first" : "parents.next.new"),
                    })}
                  </p>
                  <p className="text-ink-700 mt-1 text-base leading-snug">
                    {t(doorKey(next.activity, "blurb"))}
                  </p>
                </div>
              </div>
              <p className="text-ink-500 text-sm leading-snug">
                {name
                  ? t("parents.next.noteNamed", { name })
                  : t("parents.next.note")}
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                <ButtonLink
                  href={activityRoute(next.activity)}
                  size="sm"
                  variant="soft"
                  className="min-h-12"
                  icon={<Play className="size-4" aria-hidden />}
                  data-parent-next-link
                >
                  {t("parents.next.open")}
                </ButtonLink>
                <ButtonLink href={next.place.route} size="sm" variant="quiet" className="min-h-12" iconRight icon={<ArrowRight className="size-4" aria-hidden />}>
                  {t("parents.viewWorld", { world: t(worldNameKey(next.place.id)) })}
                </ButtonLink>
              </div>
            </div>
          ) : (
            <p className="text-ink-700 text-base" data-parent-next-done>
              {t("parents.next.done")}
            </p>
          )}
        </Card>
      </div>

      {/* ---- Learning value --------------------------------------------- */}
      <Card as="section" aria-labelledby="practising-heading" className="flex flex-col gap-5">
        <div className="space-y-1">
          <SectionHeading id="practising-heading">{t("parents.section.practising")}</SectionHeading>
          <p className="text-ink-500 text-sm leading-snug">{t("parents.practising.note")}</p>
        </div>
        <ConceptList journey={journey} />
      </Card>

      {/* ---- Settings --------------------------------------------------- */}
      <section aria-labelledby="settings-heading" className="space-y-4">
        <SectionHeading id="settings-heading">{t("parents.section.settings")}</SectionHeading>
        <div id="child-name" className="scroll-mt-6">
          <ChildNameField />
        </div>
        <Card className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold sm:text-xl">
              {t("parents.settings.resetTitle")}
            </h3>
            <p className="text-ink-500 mt-1 text-base leading-snug">
              {t("parents.settings.resetBody")}
            </p>
          </div>
          <ResetProgress childName={name} />
        </Card>
      </section>

      {children}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-ink-700 text-xs leading-snug">
          {t(children ? "parents.storage.account" : "parents.storage.device")}
        </p>
        <Link
          href={PRIVACY}
          className="text-ink-900 hover:bg-ink-900/5 -mx-3 inline-flex min-h-12 items-center rounded-full px-3 text-xs font-semibold underline underline-offset-2"
          data-parent-privacy
        >
          {t("parents.privacyLink")}
        </Link>
      </div>
    </main>
  );
}

/* ---- Pieces -------------------------------------------------------------- */

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-xl font-semibold sm:text-2xl">
      {children}
    </h2>
  );
}

const TONES = {
  sprout: "bg-sprout-soft text-sprout-ink",
  honey: "bg-honey-soft text-honey-ink",
  tide: "bg-tide-soft text-tide-ink",
} as const;

function Stat({
  icon,
  tone,
  value,
  of,
  label,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  value: number;
  of: number;
  label: MessageKey;
}) {
  const t = useT();
  return (
    <div className="bg-cream-100 flex min-w-0 flex-col gap-2 rounded-tile p-3 sm:p-4">
      <span className={cn("flex size-9 items-center justify-center rounded-xl", TONES[tone])}>{icon}</span>
      <dd className="font-display text-ink-900 text-2xl leading-none font-semibold sm:text-3xl">
        {value}
        <span className="text-ink-700 text-base font-medium sm:text-lg"> / {of}</span>
      </dd>
      <dt className="text-ink-700 text-xs leading-tight sm:text-sm">{t(label)}</dt>
    </div>
  );
}

function WorldProgressCard({ world }: { world: WorldSummary }) {
  const { place, progress, state } = world;
  const { locale, t } = useTranslation();
  const accent = ACCENTS[place.accent];
  const label = progressLabel(progress, locale);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const name = t(worldNameKey(place.id));

  return (
    <Card
      as="article"
      padding="none"
      className="flex w-full flex-col overflow-hidden"
      data-parent-world={place.id}
      data-parent-world-state={state}
    >
      {/* The same scene the child's door shows, at a quarter of the height. */}
      <div className="relative h-20 w-full sm:h-24">
        <WorldScene world={place.id} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight font-semibold sm:text-xl">{name}</h3>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              state === "complete"
                ? "bg-sprout-soft text-sprout-ink"
                : state === "started"
                  ? cn(accent.bgSoft, accent.text)
                  : "bg-ink-900/5 text-ink-700",
            )}
          >
            {state === "complete" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
            {t(`parents.world.${state}`)}
          </span>
        </div>

        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-valuetext={label}
            aria-label={t("parents.world.progressAria", { world: name })}
            className="bg-ink-900/8 h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className={cn("h-full rounded-full", accent.bgDeep)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-ink-700 text-sm font-semibold" data-parent-world-label>
            {label}
          </p>
        </div>

        <p className="text-ink-500 text-sm leading-snug">
          {progress.done === 0
            ? t("parents.world.firstReward", { reward: t(rewardKey(place.id, "one")) })
            : t("parents.world.collected", {
                done: progress.done,
                reward: t(rewardKey(place.id, progress.done === 1 ? "one" : "many")),
              })}
        </p>

        <Link
          href={place.route}
          className="text-ink-700 mt-auto inline-flex min-h-12 items-center gap-1 pt-1 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t("parents.viewWorld", { world: name })}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function ConceptList({ journey }: { journey: Journey }) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3" data-parent-concepts>
      {conceptsByWorld(journey).map(({ place, concepts }) => {
        const accent = ACCENTS[place.accent];
        return (
          <div key={place.id} className="min-w-0">
            <h3 className={cn("font-display mb-2 text-base font-semibold", accent.text)}>
              {t(worldNameKey(place.id))}
            </h3>
            <ul className="flex list-none flex-col gap-1.5">
              {concepts.map((concept) => (
                <li
                  key={concept.id}
                  className="text-ink-700 flex items-center gap-2 text-sm"
                  data-concept={concept.id}
                  data-concept-practised={concept.practised ? "yes" : "no"}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      concept.practised ? "bg-sprout-soft text-sprout-ink" : "bg-ink-900/5 text-ink-300",
                    )}
                  >
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{t(concept.title)}</span>
                  <span className="sr-only">
                    {t(concept.practised ? "parents.practising.yes" : "parents.practising.no")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Good evening" once the clock is known. The server has no clock worth
 * trusting for a reader it cannot see, so the first paint says hello and the
 * daypart arrives with the client — the same shape as the child's name.
 */
function useGreeting(locale: Locale): string {
  return useSyncExternalStore(
    subscribeNever,
    () => daypartGreeting(new Date().getHours(), locale),
    () => translate(DEFAULT_LOCALE, "parents.greeting.hello"),
  );
}

/* The daypart cannot change under a reader in a way worth re-rendering for. */
function subscribeNever(): () => void {
  return () => undefined;
}

/**
 * "Showing **Adam**’s progress." — the name emphasised wherever the sentence
 * puts it, which in Malay is the end rather than the middle.
 */
function Showing({ locale, name }: { locale: Locale; name: string }) {
  const { before, after } = around(translate(locale, "parents.child.showing"), "name");
  return (
    <>
      {before}
      <span className="text-ink-900 font-semibold">{name}</span>
      {after}
    </>
  );
}
