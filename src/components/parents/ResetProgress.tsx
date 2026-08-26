"use client";

import { RotateCcw } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useLocale";
import { resetJourney } from "@/lib/journey/useJourney";

/**
 * The one destructive thing a grown-up can do, behind the one dialog.
 *
 * A native `<dialog>` opened with `showModal()`: the browser traps focus,
 * closes on Escape, and puts everything behind it out of reach of the
 * reader, none of which has to be re-invented. The confirming button is the
 * only one with the action on it, and it is not the one that gets focus
 * first — Cancel does — so a stray Enter does nothing.
 *
 * After the reset, a sentence in a live region says so. The dashboard above
 * re-renders from the emptied journey on the same tick, which is the real
 * confirmation; the sentence is for whoever cannot see it.
 */
export function ResetProgress({ childName }: { childName: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const t = useT();

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="soft"
        size="sm"
        icon={<RotateCcw className="size-5" aria-hidden />}
        onClick={() => {
          setDone(false);
          dialog.current?.showModal();
        }}
        data-reset-open
        className="min-h-12 self-start"
      >
        {t("parents.reset.open")}
      </Button>

      <p aria-live="polite" className="text-ink-500 text-sm" data-reset-status>
        {done
          ? childName
            ? t("parents.reset.doneNamed", { name: childName })
            : t("parents.reset.done")
          : ""}
      </p>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-reset-dialog
        className="bg-paper text-ink-900 m-auto w-[calc(100%-2.5rem)] max-w-md rounded-card border border-edge p-6 shadow-lift backdrop:bg-ink-900/40 sm:p-8"
      >
        <form
          method="dialog"
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            /* Only the confirm button carries a value; Cancel and Escape
               close the dialog through the same form without it. */
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            if (submitter?.getAttribute("value") === "reset") {
              resetJourney();
              setDone(true);
            }
          }}
        >
          <div className="space-y-2">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {childName
                ? t("parents.reset.confirmNamed", { name: childName })
                : t("parents.reset.confirm")}
            </h2>
            <p id={bodyId} className="text-ink-700 text-base leading-snug">
              {t("parents.reset.body")}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="quiet" size="sm" type="submit" value="cancel" autoFocus className="min-h-12" data-reset-cancel>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              value="reset"
              className="min-h-12 bg-apricot-base text-apricot-ink shadow-[0_5px_0_0_var(--color-apricot-deep)] hover:bg-apricot-base/95"
              data-reset-confirm
            >
              {t("parents.reset.open")}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
