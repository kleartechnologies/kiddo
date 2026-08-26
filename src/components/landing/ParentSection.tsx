"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { PARENTS, PRIVACY } from "@/lib/routes";
import { SectionIntro } from "./SectionIntro";

/**
 * The calm half of the page: what a grown-up gets.
 *
 * The picture is the real parent dashboard, photographed part-way through a
 * journey by `scripts/make-brand-assets.mjs`. The list next to it names only
 * what that dashboard actually shows today. The last line is the promise the
 * privacy page spells out, worded to match the code: the journey and the
 * name live in this browser and are not sent to a server, because there is
 * no server to send them to.
 */
const SHOWS: MessageKey[] = [
  "landing.parents.shows.1",
  "landing.parents.shows.2",
  "landing.parents.shows.3",
  "landing.parents.shows.4",
  "landing.parents.shows.5",
];

export function ParentSection() {
  const t = useT();
  return (
    <section aria-labelledby="parents-heading" id="for-parents" className="scroll-mt-24">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionIntro
            id="parents-heading"
            eyebrow={t("landing.parents.eyebrow")}
            title={t("landing.parents.title")}
            align="left"
          >
            {t("landing.parents.body")}
          </SectionIntro>
          <ul className="flex list-none flex-col gap-3">
            {SHOWS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-lg">
                <span className="bg-sage-soft text-sage-ink mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-ink-900">{t(line)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              href={PARENTS}
              variant="soft"
              size="md"
              iconRight
              icon={<ArrowRight className="size-5" aria-hidden />}
            >
              {t("landing.parents.cta")}
            </ButtonLink>
            <Link
              href={PRIVACY}
              className="text-ink-700 inline-flex min-h-12 items-center text-base font-semibold underline underline-offset-4"
            >
              {t("landing.parents.privacyLink")}
            </Link>
          </div>
        </div>

        <figure className="bg-sage-soft border-edge rounded-hero border p-3 shadow-soft sm:p-5">
          <Image
            src="/illustrations/landing/parent-dashboard.webp"
            alt={t("landing.parents.shotAlt")}
            width={1040}
            height={760}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="bg-paper border-edge block h-auto w-full rounded-card border object-cover"
          />
          <figcaption className="text-ink-500 px-1 pt-3 text-center text-sm">
            {t("landing.parents.shotCaption")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
