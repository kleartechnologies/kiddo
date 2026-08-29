"use client";

import { Smartphone } from "lucide-react";
import { useEffect } from "react";

import { InstallButton } from "@/components/pwa/InstallButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/useLocale";
import { canOffer, dismissInstall, useInstall } from "@/lib/pwa/useInstall";

/** How long the offer stays on screen before it retires itself, for good. */
const ITS_CHANCE_MS = 20_000;

/**
 * The one time KIDDO asks to be installed without being asked.
 *
 * Almost all of §9 is about what this must not be, and every one of those
 * rules is kept by a decision rather than by a tuning knob:
 *
 *   **Never over the game.** It is rendered by the parent dashboard and
 *   nowhere else. A child's screen has never heard of it.
 *
 *   **Never over a button.** It is a strip in the page's own flow, not a
 *   floating bar — so there is no scroll position at which it covers a
 *   control, and nothing underneath it to be pressed by mistake. That is why
 *   this is not the bottom-anchored banner the pattern usually is.
 *
 *   **Never every time.** Twenty seconds after it appears it writes the
 *   dismissal itself and goes, whether or not anybody touched it. So the
 *   unsolicited ask happens on exactly one visit, and a parent who ignored it
 *   is not asked again on the next one. The timer is cleared on unmount, so
 *   leaving the page early means it was not really offered and the offer
 *   keeps.
 *
 *   **Never a dead end.** "Nanti dulu" is a real button of its own, the same
 *   size as the one beside it, and it settles the question permanently.
 *
 * What it is *not* is the way to install KIDDO. That is the card in Settings
 * (`InstallKiddo`), which is always there and never expires. This is only the
 * hint that the card exists, which is the honest amount of pushiness for a
 * product a parent has already paid for.
 */
export function InstallNudge() {
  const { route, dismissed } = useInstall();
  const t = useT();

  const showing = canOffer(route) && !dismissed;

  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(dismissInstall, ITS_CHANCE_MS);
    return () => window.clearTimeout(timer);
  }, [showing]);

  if (!showing) return null;

  return (
    <Card
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5"
      padding="md"
      data-install-nudge={route}
    >
      <span className="bg-tide-soft text-tide-ink flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <Smartphone className="size-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-ink-900 text-base font-semibold">
          {t("install.nudge.title")}
        </p>
        <p className="text-ink-700 mt-0.5 text-sm leading-snug">
          {t(route === "in-app" ? "install.browser.body" : "install.nudge.body")}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <InstallButton variant="soft" onDone={dismissInstall} />
        <Button
          variant="quiet"
          size="sm"
          className="min-h-12"
          onClick={dismissInstall}
          data-install-later
        >
          {t("install.nudge.later")}
        </Button>
      </div>
    </Card>
  );
}
