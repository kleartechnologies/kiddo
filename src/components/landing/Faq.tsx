"use client";

import { ChevronDown } from "lucide-react";

import { planText, YEARLY_PER_MONTH } from "@/lib/billing/subscription";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useTranslation } from "@/lib/i18n/useLocale";
import { SectionIntro } from "./SectionIntro";

/**
 * The nine questions a parent asks before they will type a card number.
 *
 * Every answer is checked against the running product rather than written to
 * sound reassuring. KIDDO is for four- to eight-year-olds because that is the
 * range its content is built for; it does not replace school because it does
 * not follow a syllabus and does not pretend to; it runs in a browser on
 * whatever the family already owns because there is no app to install; and
 * the prices are read from `AMOUNTS` through `planText`, so the answer here
 * cannot drift away from what the pricing section says or from what Stripe
 * charges.
 *
 * Built on `<details>` rather than on state, so the questions work before
 * JavaScript arrives, open with a keyboard, and are findable with the
 * browser's own find-in-page — which is more than a hand-rolled accordion
 * usually manages. Each `summary` carries the heading, so the questions
 * appear in a screen reader's heading list the way they appear on the page.
 */
const QUESTIONS: { id: string; q: MessageKey; a: MessageKey }[] = [
  { id: "age", q: "landing.faq.q1", a: "landing.faq.a1" },
  { id: "school", q: "landing.faq.q2", a: "landing.faq.a2" },
  { id: "device", q: "landing.faq.q3", a: "landing.faq.a3" },
  { id: "positive", q: "landing.faq.q4", a: "landing.faq.a4" },
  { id: "price", q: "landing.faq.q5", a: "landing.faq.a5" },
  { id: "ads", q: "landing.faq.q6", a: "landing.faq.a6" },
  { id: "plans", q: "landing.faq.q7", a: "landing.faq.a7" },
  { id: "cancel", q: "landing.faq.q8", a: "landing.faq.a8" },
  { id: "cando", q: "landing.faq.q9", a: "landing.faq.a9" },
];

export function Faq() {
  const { locale, t } = useTranslation();
  /* The answers with numbers in them take them from the same place the
     pricing cards do, so there is nothing to keep in sync by hand. */
  const prices = {
    monthly: planText("monthly", locale).price,
    yearly: planText("yearly", locale).price,
    perMonth: YEARLY_PER_MONTH,
  };

  return (
    <section aria-labelledby="faq-heading" id="faq" className="scroll-mt-24">
      <SectionIntro
        id="faq-heading"
        eyebrow={t("landing.faq.eyebrow")}
        title={t("landing.faq.title")}
      />

      <ul className="mx-auto mt-10 flex max-w-3xl list-none flex-col gap-3 sm:mt-12">
        {QUESTIONS.map((item) => (
          <li key={item.id}>
            <details className="bg-paper border-edge rounded-card shadow-soft group border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <h3 className="font-display text-lg leading-snug font-semibold text-pretty sm:text-xl">
                  {t(item.q)}
                </h3>
                <ChevronDown
                  className="text-ink-500 size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden
                />
              </summary>
              <p className="text-ink-700 px-5 pb-5 text-base leading-relaxed text-pretty sm:px-6 sm:pb-6 sm:text-lg">
                {t(item.a, prices)}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
