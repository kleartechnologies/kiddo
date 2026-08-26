import type { Metadata } from "next";
import Link from "next/link";

import { JoinGate } from "@/components/account/JoinGate";
import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { Screen } from "@/components/ui/Screen";
import { isPlan, type Plan } from "@/lib/billing/subscription";
import { LANDING } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Start KIDDO",
  description: "Choose a plan and create your KIDDO parent account.",
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
        <Link href={LANDING} aria-label="KIDDO home" className="-mx-2 flex min-h-14 items-center rounded-2xl px-2">
          <KiddoWordmark size="sm" />
        </Link>
        <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
          Step 1 of 2
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:py-8">
        <JoinGate plan={chosen} />
      </main>
    </Screen>
  );
}
