"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useLocale";
import { LANDING, PARENTS, PRICING, PRIVACY } from "@/lib/routes";

/**
 * The public header: the brand, three quiet links, the language, and one
 * door into KIDDO.
 *
 * Deliberately the same shape as the child's `WorldHeader` — wordmark on the
 * left, one round button on the right — so walking from the landing page
 * into the product does not feel like changing websites. The difference is
 * who it speaks to: the links are for a grown-up reading, and on a phone
 * they fold away so the two things left are the language and the way back in.
 *
 * That way in is "Sign in", not "Open KIDDO": a parent who arrives here
 * has either not paid yet — in which case the page below is what they came
 * for — or has an account, and the parent area is where it lives.
 *
 * The language switcher stays visible at every width, ahead of the links.
 * A parent who reads Malay has to be able to find it *before* they have read
 * enough English to know they want it, which rules out hiding it in the
 * fold-away group or putting it in the footer.
 */
const LINKS: { href: string; key: MessageKey }[] = [
  { href: "#how-it-works", key: "landing.nav.howItWorks" },
  { href: PRICING, key: "landing.nav.pricing" },
  { href: PARENTS, key: "landing.nav.parents" },
  { href: PRIVACY, key: "landing.nav.privacy" },
];

export function LandingHeader({ className }: { className?: string }) {
  const t = useT();

  return (
    <header className={cn("flex items-center justify-between gap-3 sm:gap-6", className)}>
      <Link
        href={LANDING}
        aria-label={t("landing.nav.home")}
        data-landing-home
        className="-mx-2 flex min-h-14 items-center rounded-2xl px-2"
      >
        <KiddoWordmark />
      </Link>

      <nav aria-label={t("landing.nav.aria")} className="flex items-center gap-1 sm:gap-2">
        <ul className="hidden list-none items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-ink-700 hover:bg-ink-900/5 inline-flex min-h-12 items-center rounded-full px-4 text-base font-semibold transition-colors"
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
        <LanguageSwitcher />
        <Link
          href={PARENTS}
          data-landing-signin
          className="bg-paper border-edge text-ink-900 hover:bg-cream-50 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-soft transition-colors sm:min-h-14 sm:px-5 sm:text-base"
        >
          {t("landing.nav.signIn")}
          <ArrowRight className="size-4 sm:size-5" aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
