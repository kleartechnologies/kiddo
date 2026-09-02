import type { Metadata } from "next";

import { JoinGate } from "@/components/account/JoinGate";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/components/i18n/T";
import { WordmarkLink } from "@/components/kiddo/WordmarkLink";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "meta.join.title"),
  description: translate(DEFAULT_LOCALE, "meta.join.description"),
  robots: { index: false },
};

/**
 * `/join` — where the pricing section leads.
 *
 * There is no parameter to read: KIDDO is one thing at one price, so there
 * is nothing for a query string to carry and nothing about money that a
 * browser could suggest. The amount lives on the server, which puts it on
 * the bill.
 */
export default function JoinPage() {
  return (
    <Screen width="narrow" detail="quiet">
      <header className="flex items-center justify-between gap-3">
        <WordmarkLink />
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
            <T k="page.step1" />
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:py-8">
        <JoinGate />
      </main>
    </Screen>
  );
}
