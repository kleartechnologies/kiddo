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
 * Where the page finally says what KIDDO is — after the parent has already
 * agreed with the problem and with the way out of it.
 *
 * It opens on the one sentence the whole product rests on, split across two
 * lines because the two halves are addressed to two different people in the
 * same room: the child is playing, and the parent knows they are learning.
 * Neither half is a claim the page has to argue for, because the rest of the
 * section shows it — three worlds, each as its own row: the door the child
 * taps, what happens inside in one sentence, the three real activities
 * behind it, and a photograph of the product mid-round.
 *
 * The screenshots are taken from the running app by
 * `scripts/make-brand-assets.mjs`, so the page cannot drift from what a child
 * actually gets — if a board changes, the script is run again and the picture
 * changes with it. Nothing in this section is a mock-up and nothing in it is
 * a feature KIDDO does not have.
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

export function MeetKiddo({ worlds }: { worlds: readonly PlayableWorldId[] }) {
  const t = useT();
  return (
    <section aria-labelledby="meet-heading" className="scroll-mt-24" id="worlds">
      <SectionIntro
        id="meet-heading"
        eyebrow={t("landing.meet.eyebrow")}
        title={t("landing.meet.title")}
      >
        {t("landing.meet.body")}
      </SectionIntro>

      {/* The positioning, said once, to both people in the room. */}
      <p className="font-display mx-auto mt-8 flex max-w-3xl flex-col gap-2 text-center text-2xl leading-snug font-semibold text-balance sm:mt-10 sm:flex-row sm:gap-4 sm:text-[1.75rem]">
        <span className="bg-honey-soft text-honey-ink rounded-card flex-1 px-5 py-4">
          {t("landing.meet.child")}
        </span>
        <span className="bg-sage-soft text-sage-ink rounded-card flex-1 px-5 py-4">
          {t("landing.meet.parent")}
        </span>
      </p>

      <p className="text-ink-700 mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-pretty sm:mt-10 sm:text-xl">
        {t("landing.meet.worldsLead")}
      </p>

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
                  <span className="text-ink-500">: {t(doorKey(activity, "blurb"))}</span>
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
