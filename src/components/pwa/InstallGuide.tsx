"use client";

import { Check, Plus, Share } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useLocale";

/**
 * How KIDDO gets onto an iPhone: three taps, drawn.
 *
 * WebKit has no install API and never has. There is no event to catch and no
 * dialog to ask for — the only way onto an iPhone's home screen is a person
 * finding Share and then "Add to Home Screen", which is two taps most parents
 * have never had a reason to make. So this is the whole of KIDDO's iOS
 * install story: a picture of where those taps are.
 *
 * A native `<dialog>` opened with `showModal()`, the same as the reset
 * confirmation — focus trapped, Escape closing it, the page behind it out of
 * the reader's way, none of it re-invented. It is a dialog rather than a
 * panel on the page because it is a set of instructions to *follow*: it has
 * to survive the parent tapping Share, and the sheet iOS raises would cover
 * anything drawn in the page.
 *
 * The words on the two iOS controls are left in English inside the Malay
 * sentences, and that is not an untranslated string. Apple ships Share and
 * "Add to Home Screen" in whatever language the *phone* is set to, which in
 * Malaysia is usually English even in a household that speaks Malay all day
 * — and a parent hunting for a button reads the label they can see. Naming it
 * in Malay would be a more faithful translation and a worse instruction.
 */
export function InstallGuide({
  open,
  safari,
  onClose,
}: {
  open: boolean;
  /** Safari itself. Everything else on iOS gets one extra line. */
  safari: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useT();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      data-install-dialog
      /* Escape and the backdrop both close it, and both arrive here rather
         than at the button, so the state that opened it is put back either
         way. Without this the dialog closes once and can never reopen. */
      onClose={onClose}
      className="bg-paper text-ink-900 m-auto w-[calc(100%-2.5rem)] max-w-md rounded-card border border-edge p-6 shadow-lift backdrop:bg-ink-900/40 sm:p-8"
    >
      <div className="flex flex-col gap-5">
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          {t("install.guide.title")}
        </h2>

        <ol className="flex list-none flex-col gap-4">
          <Step n={1} icon={<Share className="size-5" aria-hidden />}>
            {t("install.guide.step1")}
          </Step>
          <Step n={2} icon={<Plus className="size-5" strokeWidth={3} aria-hidden />}>
            {t("install.guide.step2")}
          </Step>
          <Step n={3} icon={<Check className="size-5" strokeWidth={3} aria-hidden />}>
            {t("install.guide.step3")}
          </Step>
        </ol>

        {/* Chrome, Firefox and Edge on iOS can all add to the home screen
            since iOS 16.4, but their Share button is in a different corner
            and their menu is worded differently. One line rather than four
            sets of instructions KIDDO would have to keep up to date. */}
        {safari ? null : (
          <p className="text-ink-500 text-sm leading-snug" data-install-guide-other>
            {t("install.guide.other")}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            variant="soft"
            size="sm"
            className="min-h-12"
            onClick={onClose}
            data-install-guide-close
          >
            {t("install.guide.close")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** One numbered tap: the glyph iOS draws, then the sentence. */
function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="bg-tide-soft text-tide-ink flex size-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="text-ink-700 pt-1.5 text-base leading-snug">
        <span className="text-ink-900 font-semibold">{n}. </span>
        {children}
      </span>
    </li>
  );
}
