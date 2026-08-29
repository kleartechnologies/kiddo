"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { InstallGuide } from "@/components/pwa/InstallGuide";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useLocale";
import { promptInstall, useInstall } from "@/lib/pwa/useInstall";

/**
 * "Pasang KIDDO" — one button over two completely different browsers.
 *
 * On Chromium it hands back the event the store caught and the browser draws
 * its own install dialog. On iOS there is no such event, so the same press
 * opens the three-tap guide instead. The parent is not asked which kind of
 * phone they have; the button knows.
 *
 * It renders **nothing** on a browser that cannot install KIDDO — a desktop,
 * an in-app web view, a Chromium that has already decided the site is
 * installed. §4 asks for exactly that: no button that does nothing when
 * pressed. Which is also why it is a component rather than a prop on a card:
 * two different places offer the install, and neither of them should have to
 * know the browser matrix to decide whether to draw a button.
 */
export function InstallButton({
  variant = "primary",
  /** Called once the parent has finished with the prompt or the guide. */
  onDone,
}: {
  variant?: ButtonVariant;
  onDone?: () => void;
}) {
  const { route, safari } = useInstall();
  const [guide, setGuide] = useState(false);
  const t = useT();

  /* `installed`, `in-app` and `none` are all silences — the surrounding card
     says what there is to say about each. */
  if (route !== "prompt" && route !== "guide") return null;

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className="min-h-12 self-start"
        icon={<Download className="size-5" aria-hidden />}
        data-install-cta={route}
        onClick={() => {
          if (route === "guide") {
            setGuide(true);
            return;
          }
          /* Not awaited: the browser's dialog is modal and the answer arrives
             whenever the parent gives it. The store re-measures itself when
             it does, so there is nothing to hold this handler open for. */
          void promptInstall().then(() => onDone?.());
        }}
      >
        {t("install.cta")}
      </Button>

      <InstallGuide
        open={guide}
        safari={safari}
        onClose={() => {
          setGuide(false);
          onDone?.();
        }}
      />
    </>
  );
}
