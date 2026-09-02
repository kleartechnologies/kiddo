"use client";

import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import { LIFETIME_PRICE, ORIGINAL_PRICE } from "@/lib/billing/access";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { JOIN } from "@/lib/routes";
import { SectionIntro } from "./SectionIntro";

/**
 * Pricing: one price, once, and nothing to choose between.
 *
 * The figure comes from `LIFETIME_AMOUNT` in `lib/billing/access` — the same
 * integer the server puts on the Billplz bill — so there is one number to
 * change and no way for a marketing string to drift away from what a parent
 * is actually charged.
 *
 * There is no second card, because there is no second plan: no monthly, no
 * yearly, no renewal, nothing to cancel. That is the whole of the
 * persuasion — no countdown, no crossed-out price, no "most popular" claim
 * KIDDO cannot prove. Pressing the button leads to `/join`, which asks for
 * an account and then hands over to Billplz.
 */
const INCLUDED: MessageKey[] = [
  "landing.pricing.included.1",
  "landing.pricing.included.2",
  "landing.pricing.included.3",
  "landing.pricing.included.4",
];

export function Pricing() {
  const t = useT();
  return (
    <section aria-labelledby="pricing-heading" id="pricing" className="scroll-mt-24">
      <SectionIntro
        id="pricing-heading"
        eyebrow={t("landing.pricing.eyebrow")}
        title={t("landing.pricing.title")}
      >
        {t("landing.pricing.body")}
      </SectionIntro>

      <div className="mx-auto mt-10 max-w-md sm:mt-12">
        <OfferCard />
      </div>

      <ul className="mx-auto mt-8 flex max-w-2xl list-none flex-col gap-2 sm:mt-10">
        {INCLUDED.map((line) => (
          <li key={line} className="text-ink-700 flex items-start gap-3 text-base">
            <span className="bg-sage-soft text-sage-ink mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
              <Check className="size-4" strokeWidth={3} aria-hidden />
            </span>
            {t(line)}
          </li>
        ))}
      </ul>

      <p className="text-ink-500 mx-auto mt-6 max-w-2xl text-center text-sm">
        {t("landing.pricing.footnote")}
      </p>
    </section>
  );
}

function OfferCard() {
  const t = useT();

  return (
    <div
      className="bg-paper rounded-hero border-ink-900 shadow-lift flex h-full flex-col gap-5 border-2 p-6 sm:p-8"
      data-pricing-offer="lifetime"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-semibold sm:text-2xl">{t("offer.name")}</h3>
        <span
          className="bg-honey-soft text-honey-ink rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase"
          data-pricing-note
        >
          ⭐ {t("offer.note")}
        </span>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2">
        {/* The old price is decoration to a screen reader; the sr-only
            sentence says the same thing in words. */}
        <s className="text-ink-500 text-xl line-through sm:text-2xl" data-pricing-was aria-hidden>
          {ORIGINAL_PRICE}
        </s>
        <span className="sr-only">{t("offer.was", { price: ORIGINAL_PRICE })}</span>
        <span className="font-display text-ink-900 text-4xl font-bold sm:text-5xl" data-pricing-price>
          {LIFETIME_PRICE}
        </span>
        <span className="text-ink-700 text-lg">/ {t("offer.per")}</span>
      </p>

      <p className="text-ink-700 text-base leading-snug">{t("offer.blurb")}</p>

      <ButtonLink
        href={JOIN}
        size="md"
        variant="primary"
        iconRight
        icon={<ArrowRight className="size-5" aria-hidden />}
        className="mt-auto self-start"
        data-pricing-cta="lifetime"
        onClick={() => reportCta("pricing", true)}
      >
        {t("offer.cta", { price: LIFETIME_PRICE })}
      </ButtonLink>
    </div>
  );
}
