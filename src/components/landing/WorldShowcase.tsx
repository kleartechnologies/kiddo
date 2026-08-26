"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { getCharacter } from "@/data/characters";
import { WorldScene } from "@/components/worlds/WorldScene";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { doorKey, worldBlurbKey, worldNameKey } from "@/lib/i18n/names";
import { useT } from "@/lib/i18n/useLocale";
import { activitiesOf, type PlayableWorldId } from "@/lib/worlds/activities";
import { WORLD_PLACES } from "@/lib/worlds/places";
import { SectionIntro } from "./SectionIntro";

/**
 * The thing that makes KIDDO different, shown rather than claimed.
 *
 * Three worlds, each as its own row: the door the child sees, what happens
 * inside in one sentence, the three real activities behind the door, and a
 * photograph of the product in the middle of a round. The screenshots are
 * taken from the running app by `scripts/make-brand-assets.mjs`, so the page
 * cannot drift from what a child actually gets — if the board changes, the
 * script is run again and the picture changes with it.
 *
 * The world's name, its blurb and the three door titles are read from the
 * catalogue by id rather than from `WORLD_PLACES` and `WORLD_ACTIVITIES`
 * directly, so this page says exactly what the child's home screen says in
 * whichever language the parent is reading — one set of words, one place.
 */

/** The screenshots, in the order the worlds stand on the map. The picture is
 *  the same in both languages; only its description is translated. */
const SHOTS: Record<PlayableWorldId, string> = {
  counting: "/illustrations/landing/round-counting.webp",
  animals: "/illustrations/landing/round-animals.webp",
  words: "/illustrations/landing/round-words.webp",
};

export function WorldShowcase({ worlds }: { worlds: readonly PlayableWorldId[] }) {
  const t = useT();
  return (
    <section aria-labelledby="worlds-heading" className="scroll-mt-24" id="worlds">
      <SectionIntro
        id="worlds-heading"
        eyebrow={t("landing.worlds.eyebrow")}
        title={t("landing.worlds.title")}
      >
        {t("landing.worlds.body")}
      </SectionIntro>

      <ol className="mt-10 flex list-none flex-col gap-8 sm:mt-12 sm:gap-12">
        {worlds.map((id, index) => (
          <li key={id}>
            <WorldRow id={id} flipped={index % 2 === 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function WorldRow({ id, flipped }: { id: PlayableWorldId; flipped: boolean }) {
  const t = useT();
  const place = WORLD_PLACES[id];
  const accent = ACCENTS[place.accent];
  const activities = activitiesOf(id);
  const name = t(worldNameKey(id));
  const alt = t(`landing.worlds.shot.${id}`);

  return (
    <article
      data-landing-world={id}
      className={cn(
        "bg-paper border-edge grid grid-cols-1 overflow-hidden rounded-hero border shadow-soft",
        "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
      )}
    >
      {/* The door: the same picture the child sees on the home screen. */}
      <div className={cn("flex flex-col", flipped && "lg:order-2")}>
        <div className="relative aspect-[9/5] w-full sm:aspect-[2/1] lg:aspect-[9/5]">
          <WorldScene world={id} />
          <span
            className={cn(
              "absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-semibold",
              "bg-paper/90 shadow-soft",
              accent.text,
            )}
          >
            {t(`landing.worlds.number.${id}`)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <CharacterFigure id={place.friend} size="sm" />
            <div>
              <h3 className="font-display text-2xl leading-tight font-semibold sm:text-3xl">
                {name}
              </h3>
              <p className={cn("text-sm font-semibold", accent.text)}>
                {t("landing.worlds.with", { name: getCharacter(place.friend).name })}
              </p>
            </div>
          </div>
          <p className="text-ink-900 text-lg leading-relaxed text-pretty sm:text-xl">
            {t(`landing.worlds.inside.${id}`)}
          </p>
          <p className="text-ink-500 text-base leading-snug">{t(worldBlurbKey(id))}</p>
          <ul
            className="mt-1 flex list-none flex-col gap-2"
            aria-label={t("landing.worlds.activitiesIn", { world: name })}
          >
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-2.5 text-base">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    accent.bgSoft,
                    accent.text,
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span>
                  <span className="text-ink-900 font-semibold">{t(doorKey(activity, "title"))}</span>
                  <span className="text-ink-500"> — {t(doorKey(activity, "blurb"))}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Inside: a real round, on a real phone. */}
      <figure
        className={cn(
          "border-edge flex items-end justify-center border-t px-6 pt-8 sm:px-10 lg:border-t-0 lg:border-l lg:px-8 lg:pt-10",
          accent.bgSoft,
          flipped && "lg:order-1",
        )}
      >
        <div className="bg-ink-900 w-full max-w-[16rem] rounded-t-[2.25rem] p-2 pb-0 shadow-lift sm:max-w-[17rem]">
          <Image
            src={SHOTS[id]}
            alt={alt}
            width={390}
            height={560}
            sizes="(min-width: 640px) 272px, 256px"
            className="bg-cream-100 block h-auto w-full rounded-t-[1.75rem] object-cover object-top"
          />
        </div>
        <figcaption className="sr-only">{alt}</figcaption>
      </figure>
    </article>
  );
}
