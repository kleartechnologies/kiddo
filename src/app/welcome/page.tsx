import type { Metadata } from "next";
import Link from "next/link";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { WelcomeGate } from "@/components/account/WelcomeGate";
import { Screen } from "@/components/ui/Screen";
import { LANDING } from "@/lib/routes";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

/**
 * Where Stripe returns a parent after Checkout. What they see depends on
 * what the server has written about their subscription, never on the fact
 * that they arrived here — see `WelcomeGate`.
 */
export default function WelcomePage() {
  return (
    <Screen width="narrow" detail="quiet">
      <header className="flex items-center justify-between gap-3">
        <Link href={LANDING} aria-label="KIDDO home" className="-mx-2 flex min-h-14 items-center rounded-2xl px-2">
          <KiddoWordmark size="sm" />
        </Link>
        <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
          Step 2 of 2
        </span>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 py-6 select-text sm:py-8">
        <WelcomeGate />
      </main>
    </Screen>
  );
}
