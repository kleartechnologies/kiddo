"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { PARENTS, PRICING, PRIVACY } from "@/lib/routes";
import { SectionIntro } from "./SectionIntro";

/**
 * The calm half of the page: what a grown-up gets out of this.
 *
 * Four reasons, each one short enough to read while standing up, and each one
 * about how an evening feels rather than about what a child will become.
 * There is no claim here about attention, development, school results or
 * anything a doctor would have to sign — KIDDO has not measured any of that
 * and a landing page is not the place to imply it had.
 *
 * The picture is the real parents' space, photographed part-way through a
 * journey by `scripts/make-brand-assets.mjs`, and the details underneath name
 * only what that screen actually shows today. The privacy link is the last
 * word rather than a footnote, because "what does it keep about my child" is
 * the question a careful parent asks next.
 */
const REASONS: { id: string; title: MessageKey; detail: MessageKey }[] = [
  { id: "1", title: "landing.why.1.title", detail: "landing.why.1.detail" },
  { id: "2", title: "landing.why.2.title", detail: "landing.why.2.detail" },
  { id: "3", title: "landing.why.3.title", detail: "landing.why.3.detail" },
  { id: "4", title: "landing.why.4.title", detail: "landing.why.4.detail" },
];

export function WhyParents() {
  const t = useT();
  return (
    <section aria-labelledby="why-heading" id="for-parents" className="scroll-mt-24">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionIntro
            id="why-heading"
            eyebrow={t("landing.why.eyebrow")}
            title={t("landing.why.title")}
            align="left"
          >
            {t("landing.why.body")}
          </SectionIntro>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              href={PRICING}
              size="md"
              iconRight
              icon={<ArrowRight className="size-5" aria-hidden />}
              onClick={() => reportCta("why")}
            >
              {t("landing.hero.cta")}
            </ButtonLink>
            <ButtonLink href={PARENTS} variant="soft" size="md">
              {t("landing.why.cta")}
            </ButtonLink>
            <Link
              href={PRIVACY}
              className="text-ink-700 inline-flex min-h-12 items-center text-base font-semibold underline underline-offset-4"
            >
              {t("landing.why.privacyLink")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-xl leading-snug font-semibold text-pretty sm:text-2xl">
              {t("landing.why.dashTitle")}
            </h3>
            <p className="text-ink-700 text-base leading-relaxed text-pretty">
              {t("landing.why.dashBody")}
            </p>
          </div>
          <figure className="bg-sage-soft border-edge rounded-hero border p-3 shadow-soft sm:p-5">
            <Image
            src="/illustrations/landing/parent-dashboard.webp"
            alt={t("landing.why.shotAlt")}
            width={1040}
            height={760}
            sizes="(min-width: 1024px) 560px, 100vw"
            loading="lazy"
            className="bg-paper border-edge rounded-card block h-auto w-full border object-cover"
            />
            <figcaption className="text-ink-500 px-1 pt-3 text-center text-sm">
              {t("landing.why.shotCaption")}
            </figcaption>
          </figure>
        </div>
      </div>

      <ul className="mt-10 grid list-none grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-8">
        {REASONS.map((reason) => (
          <li key={reason.id} className="flex items-start gap-4">
            <span className="bg-sage-soft text-sage-ink mt-1 flex size-8 shrink-0 items-center justify-center rounded-full">
              <Check className="size-5" strokeWidth={3} aria-hidden />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-lg leading-snug font-semibold text-pretty sm:text-xl">
                {t(reason.title)}
              </h3>
              <p className="text-ink-700 text-base leading-relaxed text-pretty">
                {t(reason.detail)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
