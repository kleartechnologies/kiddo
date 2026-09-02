"use client";

import { ArrowRight } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { LaunchOffer } from "@/components/landing/LaunchOffer";
import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import { LIFETIME_PRICE, ORIGINAL_PRICE } from "@/lib/billing/access";
import { followHashLink } from "@/lib/hashLink";
import { useT } from "@/lib/i18n/useLocale";
import { PRICING } from "@/lib/routes";

/** The last thing on the page says the first thing again, with KIDDO next to
    it — and the launch offer beside the button, so the final decision is made
    with the figure in view rather than remembered from four screens up. */
export function ClosingCall() {
  const t = useT();
  return (
    <section
      aria-labelledby="closing-heading"
      className="bg-paper border-edge flex flex-col items-center gap-6 rounded-hero border p-8 text-center shadow-soft sm:flex-row sm:p-10 sm:text-left"
    >
      <CharacterFigure id="kiddo" size="lg" pose="point" />
      <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
        <h2 id="closing-heading" className="font-display text-3xl font-bold text-balance sm:text-4xl">
          {t("landing.closing.title")}
        </h2>
        <p className="text-ink-700 max-w-xl text-lg leading-relaxed text-pretty">
          {t("landing.closing.body")}
        </p>
        <LaunchOffer
          scale="compact"
          price={LIFETIME_PRICE}
          was={ORIGINAL_PRICE}
          className="w-full max-w-xs"
        />
        <ButtonLink
          href={PRICING}
          data-landing-closing-cta
          size="lg"
          iconRight
          icon={<ArrowRight className="size-6" aria-hidden />}
          onClick={(event) => {
            reportCta("closing");
            followHashLink(event, "pricing");
          }}
        >
          {t("offer.ctaNow")}
        </ButtonLink>
      </div>
    </section>
  );
}
