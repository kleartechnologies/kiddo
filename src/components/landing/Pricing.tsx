"use client";

import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import { LIFETIME_PRICE, ORIGINAL_PRICE } from "@/lib/billing/access";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { JOIN } from "@/lib/routes";
import { LaunchOffer } from "./LaunchOffer";
import { SectionIntro } from "./SectionIntro";

/**
 * Pricing: one price, once, and nothing to choose between.
 *
 * The figures come from `lib/billing/access` — the same integers the server
 * puts on the Billplz bill — so there is one number to change and no way for
 * a marketing string to drift away from what a parent is actually charged.
 *
 * There is no second card, because there is no second plan: no renewal,
 * nothing to cancel. The card is the launch offer told at full size — the
 * shared `LaunchOffer` treatment as the focal point, what the one payment
 * opens listed under it, and the one button. Pressing the button leads to
 * `/join`, which asks for an account and then hands over to Billplz.
 */
const INCLUDED: MessageKey[] = [
  "landing.pricing.included.1",
  "landing.pricing.included.2",
  "landing.pricing.included.3",
  "landing.pricing.included.4",
  "landing.pricing.included.5",
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

      <div className="mx-auto mt-10 max-w-lg sm:mt-12">
        <OfferCard />
      </div>

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
      className="bg-paper rounded-hero border-ink-900 shadow-lift overflow-hidden border-2"
      data-pricing-offer="lifetime"
    >
      {/* The offer itself, on its honey ground: the focal point of the card. */}
      <div className="from-honey-soft to-paper bg-gradient-to-b px-6 pt-8 pb-6 sm:px-10 sm:pt-10">
        <LaunchOffer scale="focal" framed={false} price={LIFETIME_PRICE} was={ORIGINAL_PRICE} />
      </div>

      <div className="flex flex-col gap-6 px-6 pb-7 sm:px-10 sm:pb-9">
        <ul className="flex list-none flex-col gap-2.5">
          {INCLUDED.map((line) => (
            <li key={line} className="text-ink-700 flex items-start gap-3 text-base">
              <span className="bg-sage-soft text-sage-ink mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
              {t(line)}
            </li>
          ))}
        </ul>

        <ButtonLink
          href={JOIN}
          size="md"
          variant="primary"
          block
          iconRight
          icon={<ArrowRight className="size-5" aria-hidden />}
          data-pricing-cta="lifetime"
          onClick={() => reportCta("pricing", true)}
        >
          {t("offer.cta", { price: LIFETIME_PRICE })}
        </ButtonLink>
      </div>
    </div>
  );
}
