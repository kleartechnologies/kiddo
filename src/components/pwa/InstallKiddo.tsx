"use client";

import { Check, Compass, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";

import { InstallButton } from "@/components/pwa/InstallButton";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { useInstall } from "@/lib/pwa/useInstall";

/**
 * Putting KIDDO on the home screen, as a settings card.
 *
 * This is the permanent home of the feature, and it is in the parent area
 * next to the child's name and the reset because that is where the person who
 * can install anything actually is. A four-year-old cannot add an app to a
 * home screen and should never be asked to; §9's "prefer the parent-facing
 * experience" is the whole placement argument.
 *
 * Five states, and the two silences matter as much as the three cards:
 *
 *   **prompt / guide** — there is something to press. See `InstallButton`.
 *   **installed**      — the icon is already there. Said once, quietly, so a
 *                        parent who is looking for the setting finds an
 *                        answer rather than an absence (§11).
 *   **in-app**         — a Facebook or Instagram web view, which can install
 *                        nothing. The parent is told how to leave it, because
 *                        a good share of KIDDO's parents arrive exactly this
 *                        way and the alternative is a button that lies (§4).
 *   **none**           — a desktop, or a browser with no such feature. The
 *                        card is not rendered at all; §10's "the site must
 *                        keep working" is best served by saying nothing about
 *                        a thing that cannot happen here.
 */
export function InstallKiddo() {
  const { route } = useInstall();
  /* Chromium's prompt can be answered once. Once it has been — accepted or
     not — the route falls back to `none`, and a card that vanished mid-press
     would read as a bug. So the browser's own menu is named instead, which
     is where the offer really does still live until the next page load. */
  const [spent, setSpent] = useState(false);
  const t = useT();

  if (route === "installed") {
    return (
      <Panel
        icon={<Check className="size-6" strokeWidth={3} aria-hidden />}
        tone="bg-sprout-soft text-sprout-ink"
        title={t("install.done.title")}
        body={t("install.done.body")}
        route={route}
      />
    );
  }

  if (route === "in-app") {
    return (
      <Panel
        icon={<Compass className="size-6" aria-hidden />}
        tone="bg-honey-soft text-honey-ink"
        title={t("install.browser.title")}
        body={t("install.browser.body")}
        route={route}
      />
    );
  }

  if (route === "none" && !spent) return null;

  return (
    <Panel
      icon={<Smartphone className="size-6" aria-hidden />}
      tone="bg-tide-soft text-tide-ink"
      title={t("install.title")}
      body={t("install.body")}
      route={route}
    >
      {route === "none" ? (
        <p className="text-ink-500 text-sm leading-snug" data-install-menu>
          {t("install.menu")}
        </p>
      ) : (
        <InstallButton onDone={() => setSpent(true)} />
      )}
    </Panel>
  );
}

/** The card itself: the same shape as the name box above it. */
function Panel({
  icon,
  tone,
  title,
  body,
  route,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
  route: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4" padding="lg" data-install-card={route}>
      <div className="flex items-start gap-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", tone)}>
          {icon}
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold sm:text-xl">{title}</h3>
          <p className="text-ink-500 mt-1 text-base leading-snug">{body}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}
