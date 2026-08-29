"use client";

import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import {
  planText,
  PLAN_ORDER,
  YEARLY_SAVING_AMOUNT,
  YEARLY_SAVING_PERCENT,
  type Plan,
} from "@/lib/billing/subscription";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT, useTranslation } from "@/lib/i18n/useLocale";
import { joinWithPlan } from "@/lib/routes";
import { SectionIntro } from "./SectionIntro";

/**
 * Pricing: the two plans, and the choice a parent makes before anything
 * else happens.
 *
 * Every figure on this section is derived from `AMOUNTS` in
 * `lib/billing/subscription` — the prices, the per-month equivalent and the
 * saving on the annual plan — so there is one number to change and no way
 * for a marketing string to drift away from what Stripe charges.
 *
 * Yearly is first, marked "Best value", and carries the saving. That is the
 * whole of the persuasion: no countdown, no crossed-out price, no "most
 * popular" claim KIDDO cannot prove. Choosing a plan leads to `/join`,
 * which asks for an account and then hands over to Stripe.
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

      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 items-start gap-4 sm:mt-12 md:grid-cols-2 md:gap-6">
        {PLAN_ORDER.map((key) => (
          <PlanCard key={key} plan={key} />
        ))}
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

function PlanCard({ plan }: { plan: Plan }) {
  const { locale, t } = useTranslation();
  const detail = planText(plan, locale);
  const best = plan === "yearly";

  return (
    <div
      className={cn(
        "bg-paper flex h-full flex-col gap-5 rounded-hero border p-6 sm:p-8",
        best ? "border-ink-900 border-2 shadow-lift" : "border-edge shadow-soft",
      )}
      data-pricing-plan={plan}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-semibold sm:text-2xl">{detail.name}</h3>
        {detail.note && (
          <span
            className="bg-honey-soft text-honey-ink rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase"
            data-pricing-note
          >
            ⭐ {detail.note}
          </span>
        )}
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-ink-900 text-4xl font-bold sm:text-5xl" data-pricing-price>
          {detail.price}
        </span>
        <span className="text-ink-700 text-lg">/ {detail.per}</span>
      </p>

      <div className="space-y-1">
        <p className="text-ink-700 text-base leading-snug">{detail.blurb}</p>
        {best && (
          <p className="text-sage-ink text-base font-semibold" data-pricing-saving>
            {t("landing.pricing.saving", {
              amount: YEARLY_SAVING_AMOUNT,
              saving: YEARLY_SAVING_PERCENT,
            })}
          </p>
        )}
      </div>

      <ButtonLink
        href={joinWithPlan(plan)}
        size="md"
        variant={best ? "primary" : "soft"}
        iconRight
        icon={<ArrowRight className="size-5" aria-hidden />}
        className="mt-auto self-start"
        data-pricing-cta={plan}
        onClick={() => reportCta("pricing", plan)}
      >
        {detail.cta}
      </ButtonLink>
    </div>
  );
}
