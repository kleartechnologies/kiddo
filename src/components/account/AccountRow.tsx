"use client";

import { Cloud, CloudOff, LogOut, MailWarning, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteAccount, refreshUser, sendVerification, signOut, useSession } from "@/lib/cloud/session";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { retrySave, useJourneySaveStatus } from "@/lib/journey/useJourney";

/**
 * The account, in one quiet card at the bottom of the parent area: the
 * email it is under, whether the cloud has the latest progress, sign out,
 * and — behind the same kind of dialog as Reset — delete everything.
 *
 * The status line never claims more than is true: "saving" while a write
 * is in flight, "not saved" with a retry if the last one failed.
 */
export function AccountRow() {
  const session = useSession();
  const status = useJourneySaveStatus();
  const dialog = useRef<HTMLDialogElement>(null);
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const [verify, setVerify] = useState<"idle" | "sending" | "sent" | "checking" | "still" | "failed">("idle");

  if (!session.user) return null;

  async function resend() {
    setVerify("sending");
    const failure = await sendVerification();
    setVerify(failure ? "failed" : "sent");
  }

  async function checkVerified() {
    setVerify("checking");
    const verified = await refreshUser();
    setVerify(verified ? "idle" : "still");
  }

  const line: MessageKey =
    status === "error"
      ? "account.sync.error"
      : status === "saving"
        ? "account.sync.saving"
        : status === "synced"
          ? "account.sync.synced"
          : "account.sync.device";

  async function confirmDelete() {
    setBusy(true);
    const failure = await deleteAccount();
    setBusy(false);
    if (!failure) return;
    setProblem(
      failure === "recent-login"
        ? "account.delete.error.recent-login"
        : failure === "offline"
          ? "auth.error.offline"
          : "account.delete.error.unknown",
    );
  }

  return (
    <Card as="section" aria-labelledby={`${titleId}-account`} className="flex flex-col gap-4" data-account-row>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={`${titleId}-account`} className="font-display text-lg font-semibold sm:text-xl">
            {t("account.title")}
          </h2>
          <p className="text-ink-700 truncate text-base" data-account-email>
            {session.user.email}
          </p>
          <p className="text-ink-500 flex items-center gap-2 text-sm" aria-live="polite" data-account-sync={status}>
            {status === "error" ? <CloudOff className="size-4" aria-hidden /> : <Cloud className="size-4" aria-hidden />}
            {t(line)}
            {status === "error" && (
              <button type="button" onClick={retrySave} className="text-ink-900 -my-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4" data-account-retry>
                {t("common.tryAgain")}
              </button>
            )}
          </p>
          {!session.user.emailVerified && (
            <p className="text-ink-700 flex flex-wrap items-center gap-x-2 text-sm" aria-live="polite" data-account-verify={verify}>
              <MailWarning className="text-honey-ink size-4" aria-hidden />
              {t(
                verify === "sent"
                  ? "account.verify.sent"
                  : verify === "still"
                    ? "account.verify.still"
                    : verify === "failed"
                      ? "account.verify.failed"
                      : "account.verify.unverified",
              )}
              <button type="button" onClick={() => void resend()} disabled={verify === "sending"} className="text-ink-900 -my-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4" data-account-verify-send>
                {t(
                  verify === "sending"
                    ? "account.verify.sending"
                    : verify === "sent" || verify === "still"
                      ? "account.verify.sendAgain"
                      : "account.verify.send",
                )}
              </button>
              <button type="button" onClick={() => void checkVerified()} disabled={verify === "checking"} className="text-ink-900 -my-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4" data-account-verify-check>
                {t(verify === "checking" ? "account.verify.checking" : "account.verify.check")}
              </button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" icon={<LogOut className="size-5" aria-hidden />} onClick={() => void signOut()} className="min-h-12" data-account-signout>
            {t("common.signOut")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon={<Trash2 className="size-5" aria-hidden />}
            onClick={() => {
              setProblem(null);
              dialog.current?.showModal();
            }}
            className="min-h-12"
            data-account-delete-open
          >
            {t("account.delete.open")}
          </Button>
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-account-delete-dialog
        className="bg-paper text-ink-900 m-auto w-[calc(100%-2.5rem)] max-w-md rounded-card border border-edge p-6 shadow-lift backdrop:bg-ink-900/40 sm:p-8"
      >
        <form
          method="dialog"
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            if (submitter?.getAttribute("value") === "delete") {
              /* Stay open: on success the account is gone and this card
                 unmounts with it; on failure the reason appears below. */
              event.preventDefault();
              void confirmDelete();
            }
          }}
        >
          <div className="space-y-2">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {t("account.delete.title")}
            </h2>
            <p id={bodyId} className="text-ink-700 text-base leading-snug">
              {t("account.delete.body")}
            </p>
            <p aria-live="polite" className="text-apricot-ink min-h-5 text-sm font-semibold" data-account-delete-error>
              {problem ? t(problem) : ""}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="quiet" size="sm" type="submit" value="cancel" autoFocus className="min-h-12">
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              value="delete"
              aria-busy={busy}
              className="min-h-12 bg-apricot-base text-apricot-ink shadow-[0_5px_0_0_var(--color-apricot-deep)] hover:bg-apricot-base/95"
              data-account-delete-confirm
            >
              {t(busy ? "account.delete.busy" : "account.delete.open")}
            </Button>
          </div>
        </form>
      </dialog>
    </Card>
  );
}
