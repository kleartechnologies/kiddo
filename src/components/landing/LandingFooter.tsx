"use client";

import Link from "next/link";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { PARENTS, PRICING, PRIVACY } from "@/lib/routes";

/**
 * The bottom of the public pages: the brand again, the three places a
 * grown-up can go, the one line about data that the privacy page expands
 * on, and — last of all — whose copyright the whole thing is. Nothing here
 * is a form or a feed.
 */
const LINKS: { href: string; key: MessageKey }[] = [
  { href: PRICING, key: "landing.nav.pricing" },
  { href: PARENTS, key: "landing.nav.parents" },
  { href: PRIVACY, key: "landing.nav.privacy" },
];

export function LandingFooter() {
  const t = useT();
  return (
    <footer className="border-edge mt-16 flex flex-col gap-6 border-t pt-8 sm:mt-24">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <KiddoWordmark size="sm" />
          <p className="text-ink-500 max-w-sm text-sm leading-snug">
            {t("landing.footer.blurb")}
          </p>
        </div>
        <nav aria-label={t("landing.footer.aria")}>
          <ul className="flex list-none flex-wrap gap-x-2 gap-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-ink-700 hover:bg-ink-900/5 -mx-1 inline-flex min-h-12 items-center rounded-full px-3 text-base font-semibold transition-colors"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-edge text-ink-500 border-t pt-5 pb-6 text-center text-sm">
        {t("landing.footer.copyright")}
      </p>
    </footer>
  );
}
