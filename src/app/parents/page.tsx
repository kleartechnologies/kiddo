import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/components/i18n/T";
import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { ParentGate } from "@/components/account/ParentGate";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { KIDDO_HOME } from "@/lib/routes";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = { title: translate(DEFAULT_LOCALE, "meta.parents.title") };

/**
 * The parent side.
 *
 * Deliberately a different kind of screen from the child's: the same world
 * behind it, drawn quietly, and on it a report rather than a place. The
 * header says whose side this is, and the one way back to the child's
 * screen is labelled as exactly that.
 *
 * The account sits behind this door too: `ParentGate` decides whether a
 * parent sees sign-in, the one onboarding question, or the dashboard.
 */
export default function ParentsPage() {
  return (
    <Screen width="wide" detail="quiet">
      <header className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <KiddoWordmark size="sm" />
          <span className="bg-ink-900/5 text-ink-700 rounded-full px-3 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
            <T k="page.parentArea" />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href={KIDDO_HOME}
            data-open-kiddo
            className="bg-paper border-edge text-ink-900 hover:bg-cream-50 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-soft transition-colors sm:min-h-14 sm:px-5 sm:text-base"
          >
            <T k="page.openKiddo" />
            <ArrowRight className="size-4 sm:size-5" aria-hidden />
          </Link>
        </div>
      </header>

      <ParentGate />
    </Screen>
  );
}
