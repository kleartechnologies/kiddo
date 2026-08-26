import type { Metadata } from "next";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/components/i18n/T";
import { WordmarkLink } from "@/components/kiddo/WordmarkLink";
import { WelcomeGate } from "@/components/account/WelcomeGate";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "meta.welcome.title"),
  robots: { index: false },
};

/**
 * Where Stripe returns a parent after Checkout. What they see depends on
 * what the server has written about their subscription, never on the fact
 * that they arrived here — see `WelcomeGate`.
 */
export default function WelcomePage() {
  return (
    <Screen width="narrow" detail="quiet">
      <header className="flex items-center justify-between gap-3">
        <WordmarkLink />
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
            <T k="page.step2" />
          </span>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 py-6 select-text sm:py-8">
        <WelcomeGate />
      </main>
    </Screen>
  );
}
