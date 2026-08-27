"use client";

import { ArrowRight, Check } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { planText } from "@/lib/billing/subscription";
import { ButtonLink } from "@/components/ui/Button";
import { WorldScene } from "@/components/worlds/WorldScene";
import { cn } from "@/lib/cn";
import { worldNameKey } from "@/lib/i18n/names";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT, useTranslation } from "@/lib/i18n/useLocale";
import { PRICING } from "@/lib/routes";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";

/**
 * The first screen a parent sees, usually on a phone, usually one tap after
 * an advert.
 *
 * It says three things and stops: that screen time need not be wasted time,
 * what KIDDO turns it into, and where to start. The brief for this page was
 * blunt about not overcrowding the hero and it is right — a parent standing
 * in a kitchen gives this maybe five seconds, and a fourth idea here costs
 * the first three.
 *
 * The three lines under the buttons are the objections that would otherwise
 * be raised silently: no advertising, nothing sold to the child, and the
 * price in the open before anyone has to hunt for it. The price comes from
 * `planText`, so it is the same figure Stripe will charge.
 *
 * Next to the words are the three worlds, drawn by the same `WorldScene` the
 * child's own doors are drawn with, with KIDDO waving in front the way it
 * does on the home screen. The picture on the landing page is literally the
 * product.
 *
 * Nothing here moves on its own. The fan of cards is a composition, not an
 * animation, and it reads the same under reduced motion because there is
 * nothing to reduce.
 */
/** The quiet objections, answered before they are asked. */
const TRUST: MessageKey[] = [
  "landing.hero.trust.1",
  "landing.hero.trust.2",
  "landing.hero.trust.3",
];

export function LandingHero() {
  const { locale, t } = useTranslation();
  const monthly = planText("monthly", locale);

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
        <ul
          className="text-ink-500 mx-auto flex list-none flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 lg:mx-0 lg:justify-start"
          aria-label={t("landing.hero.trustAria")}
        >
          {TRUST.map((line) => (
            <li key={line} className="flex items-center justify-center gap-2 sm:justify-start">
              <Check className="text-sage-ink size-4 shrink-0" strokeWidth={3} aria-hidden />
              {t(line, { monthly: monthly.price })}
            </li>
          ))}
        </ul>
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
