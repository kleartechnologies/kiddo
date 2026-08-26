"use client";

import { ArrowRight } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { planText, YEARLY_SAVING_PERCENT } from "@/lib/billing/subscription";
import { ButtonLink } from "@/components/ui/Button";
import { WorldScene } from "@/components/worlds/WorldScene";
import { cn } from "@/lib/cn";
import { worldNameKey } from "@/lib/i18n/names";
import { useT, useTranslation } from "@/lib/i18n/useLocale";
import { PRICING } from "@/lib/routes";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";

/**
 * The first screen a parent sees.
 *
 * One sentence that says what KIDDO believes, one that says what it is, and
 * two buttons. Next to them, the three worlds — drawn by the same
 * `WorldScene` the child's doors are drawn with, so the picture on the
 * landing page is literally the product — and KIDDO standing in front,
 * waving, the way it does on the child's home screen.
 *
 * Nothing here moves on its own. The fan of cards is a composition, not an
 * animation, and it reads the same under reduced motion because there is
 * nothing to reduce.
 */
export function LandingHero() {
  const { locale, t } = useTranslation();
  const monthly = planText("monthly", locale);
  const yearly = planText("yearly", locale);

  return (
    <section
      aria-labelledby="hero-heading"
      className="grid grid-cols-1 items-center gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:py-16"
    >
      <div className="flex flex-col gap-6 text-center lg:text-left">
        <p className="text-ink-500 font-display text-base font-semibold tracking-wide sm:text-lg">
          {t("landing.hero.eyebrow")}
        </p>
        <h1
          id="hero-heading"
          className="font-display text-[2.25rem] leading-[1.05] font-bold text-balance min-[380px]:text-[2.6rem] sm:text-5xl lg:text-6xl"
        >
          {t("landing.hero.title")}
        </h1>
        <p className="text-ink-700 mx-auto max-w-xl text-lg leading-relaxed text-pretty sm:text-xl lg:mx-0">
          {t("landing.hero.body")}
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
          <ButtonLink
            href={PRICING}
            size="lg"
            iconRight
            icon={<ArrowRight className="size-6" aria-hidden />}
            data-landing-cta
          >
            {t("landing.hero.cta")}
          </ButtonLink>
          <ButtonLink href="#how-it-works" variant="soft" size="md">
            {t("landing.hero.secondary")}
          </ButtonLink>
        </div>
        <p className="text-ink-500 text-sm">
          {t("landing.hero.terms", {
            monthly: monthly.price,
            monthlyPer: monthly.per,
            yearly: yearly.price,
            yearlyPer: yearly.per,
            saving: YEARLY_SAVING_PERCENT,
          })}
        </p>
      </div>

      <WorldFan />
    </section>
  );
}

/** The three worlds, fanned like cards on a table, with KIDDO in front. */
function WorldFan() {
  const t = useT();
  const tilt = ["-rotate-6 lg:-rotate-[7deg]", "rotate-0", "rotate-6 lg:rotate-[7deg]"];
  const lift = ["translate-y-4", "-translate-y-3", "translate-y-4"];

  return (
    <div
      className="relative mx-auto w-full max-w-[34rem] px-2 pt-6 pb-10 sm:pt-8 lg:max-w-none"
      aria-hidden
    >
      <ul className="grid list-none grid-cols-3 items-center gap-2 sm:gap-3">
        {PLAYABLE_WORLDS.map((id, index) => (
          <li
            key={id}
            className={cn(
              "bg-paper border-edge overflow-hidden rounded-tile border p-1.5 shadow-lift sm:rounded-card sm:p-2",
              tilt[index],
              lift[index],
            )}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-tile)-0.375rem)] sm:rounded-[calc(var(--radius-card)-0.5rem)]">
              <WorldScene world={id} />
            </div>
            <p className="font-display text-ink-900 truncate px-1 pt-2 pb-1 text-center text-xs font-semibold sm:text-sm">
              {t(worldNameKey(id))}
            </p>
          </li>
        ))}
      </ul>
      {/* KIDDO stands on the table in front of the cards, as on the home screen. */}
      <div className="absolute inset-x-0 -bottom-2 flex justify-center">
        <div className="relative">
          <div className="bg-honey-soft absolute inset-x-0 -bottom-1 mx-auto h-5 w-4/5 rounded-[50%] blur-[2px]" />
          <CharacterFigure id="kiddo" size="lg" pose="wave" className="relative" />
        </div>
      </div>
    </div>
  );
}
