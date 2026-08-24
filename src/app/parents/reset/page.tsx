import type { Metadata } from "next";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { ResetPassword } from "@/components/account/ResetPassword";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

/** Where password-reset and verify-email links from Firebase land. */
export default function ResetPage() {
  return (
    <Screen width="wide" detail="quiet">
      <header className="flex items-center gap-3">
        <KiddoWordmark size="sm" />
        <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
          Parent area
        </span>
      </header>
      <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:py-8">
        <ResetPassword />
      </main>
    </Screen>
  );
}
