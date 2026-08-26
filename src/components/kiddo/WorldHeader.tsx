"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { useT } from "@/lib/i18n/useLocale";
import { KIDDO_HOME } from "@/lib/routes";
import { KiddoWordmark } from "./KiddoWordmark";
import { SoundToggle } from "./SoundToggle";

/**
 * The only navigation in the child experience: the brand, one round switch a
 * child owns, and one quiet door out to the parent side. No menus, no tabs,
 * nothing to get lost in.
 *
 * The sound switch sits on the child's side of the header rather than behind
 * the grown-up door because turning the music off is a thing a four-year-old
 * is allowed to decide, and because a child who cannot find it will simply
 * turn the tablet's volume down and lose the game's voice with it.
 *
 * ## Why the language switcher is not here
 *
 * Everything on this header is a thing a four-year-old is allowed to decide,
 * and which language the household reads is not one of them: a child who
 * flips it mid-round has changed a setting their grown-up chose, on a screen
 * with no way back to it. The switcher lives on the landing page and in the
 * parent area, where the person choosing is the person who reads it, and the
 * choice follows the child in from there — see `lib/i18n/useLocale`.
 */
export function WorldHeader() {
  const t = useT();

  return (
    <header className="flex items-center justify-between gap-3 sm:gap-4">
      {/* Both of these are things a hand has to land on, so both are given a
          hand's worth of room. The wordmark is drawn at its own size and the
          link is padded out around it rather than the mark being grown — the
          logo is fixed art, the target is not. */}
      <Link
        href={KIDDO_HOME}
        aria-label={t("chrome.home")}
        className="-mx-2 flex min-h-14 items-center rounded-2xl px-2"
      >
        <KiddoWordmark />
      </Link>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <SoundToggle />

        <Link
          href="/parents"
          className="bg-paper border-edge text-ink-700 hover:bg-cream-50 inline-flex min-h-12 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold shadow-soft transition-colors sm:min-h-14 sm:px-5 sm:text-base"
        >
          <ShieldCheck className="size-4 sm:size-5" aria-hidden />
          {t("chrome.forGrownUps")}
        </Link>
      </div>
    </header>
  );
}
