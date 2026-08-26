import type { Metadata } from "next";

import { JoinGate } from "@/components/account/JoinGate";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/components/i18n/T";
import { WordmarkLink } from "@/components/kiddo/WordmarkLink";
import { Screen } from "@/components/ui/Screen";
import { isPlan, type Plan } from "@/lib/billing/subscription";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "meta.join.title"),
  description: translate(DEFAULT_LOCALE, "meta.join.description"),
  robots: { index: false },
};

/**
 * `/join?plan=yearly` — where the pricing section leads.
 *
 * The plan is read here, on the server, so the page renders already
 * knowing what was chosen; an absent or nonsense value falls back to the
 * annual plan, which is the one the pricing section recommends. Nothing
 * about money is decided from this parameter — it only picks which Stripe
 * price the server is later asked for.
 */
export default async function JoinPage(props: PageProps<"/join">) {
  const { plan } = await props.searchParams;
  const chosen: Plan = isPlan(plan) ? plan : "yearly";

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
        <JoinGate plan={chosen} />
      </main>
    </Screen>
  );
}
