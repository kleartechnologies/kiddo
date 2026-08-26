"use client";

import { ArrowRight, KeyRound, MailCheck } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { previewEnabled } from "@/lib/cloud/preview";
import { checkResetLink, finishEmailVerification, finishPasswordReset } from "@/lib/cloud/session";
import { CLOUD_CONFIGURED } from "@/lib/firebase/config";
import type { AuthFailure } from "@/lib/cloud/types";
import { around } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useTranslation } from "@/lib/i18n/useLocale";
import { PARENTS } from "@/lib/routes";

/**
 * Where Firebase's emails land: `/parents/reset?mode=…&oobCode=…`.
 *
 *  - `resetPassword`: check the link, ask for a new password, confirm.
 *  - `verifyEmail`: apply the code, confirm.
 *
 * A link that is wrong, already used or too old gets one plain state with
 * a way back to sign-in, where "Forgot password?" makes a fresh one. No
 * Firebase code ever reaches the page.
 *
 * Set this as the action URL in Firebase: Authentication → Templates →
 * customise action URL → https://<site>/parents/reset.
 */

type Stage =
  | { kind: "checking" }
  | { kind: "reset"; email: string }
  | { kind: "done-reset" }
  | { kind: "done-verify" }
  | { kind: "bad-link" }
  | { kind: "offline" }
  | { kind: "unavailable" };

const WORDS: Partial<Record<AuthFailure, MessageKey>> = {
  "weak-password": "auth.error.weak-password",
  "bad-link": "reset.error.badLink",
  offline: "auth.error.offline",
};

export function ResetPassword() {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const { locale, t } = useTranslation();
  const id = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      /* Let the first paint happen before the link is judged. */
      await Promise.resolve();
      if (cancelled) return;
      if (!CLOUD_CONFIGURED && !previewEnabled()) {
        setStage({ kind: "unavailable" });
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const oob = params.get("oobCode") ?? "";
      setCode(oob);
      if (!oob || (mode !== "resetPassword" && mode !== "verifyEmail")) {
        setStage({ kind: "bad-link" });
        return;
      }
      if (mode === "verifyEmail") {
        const failure = await finishEmailVerification(oob);
        if (cancelled) return;
        setStage(failure === "offline" ? { kind: "offline" } : failure ? { kind: "bad-link" } : { kind: "done-verify" });
        return;
      }
      const result = await checkResetLink(oob);
      if (cancelled) return;
      if ("email" in result) setStage({ kind: "reset", email: result.email });
      else setStage(result.failure === "offline" ? { kind: "offline" } : { kind: "bad-link" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await finishPasswordReset(code, password);
    setBusy(false);
    if (failure === "bad-link") setStage({ kind: "bad-link" });
    else if (failure) setError(WORDS[failure] ?? "common.somethingWentWrong");
    else setStage({ kind: "done-reset" });
  }

  const back = (
    <ButtonLink href={PARENTS} size="md" icon={<ArrowRight className="size-5" aria-hidden />} iconRight className="self-start" data-reset-back>
      {t("reset.back")}
    </ButtonLink>
  );

  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-reset-stage={stage.kind}>
      <div className="flex items-start gap-4">
        <span className="bg-sage-soft text-sage-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          {stage.kind === "done-verify" ? <MailCheck className="size-6" aria-hidden /> : <KeyRound className="size-6" aria-hidden />}
        </span>
        <div className="space-y-1">
          <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
            {stage.kind === "checking" && t("common.oneMoment")}
            {stage.kind === "reset" && t("reset.title.reset")}
            {stage.kind === "done-reset" && t("reset.title.doneReset")}
            {stage.kind === "done-verify" && t("reset.title.doneVerify")}
            {stage.kind === "bad-link" && t("reset.title.badLink")}
            {stage.kind === "offline" && t("reset.title.offline")}
            {stage.kind === "unavailable" && t("reset.title.unavailable")}
          </h1>
          <p className="text-ink-700 text-base leading-snug" role="status">
            {stage.kind === "checking" && t("reset.body.checking")}
            {stage.kind === "reset" && t("reset.body.reset", { email: stage.email })}
            {stage.kind === "done-reset" && t("reset.body.doneReset")}
            {stage.kind === "done-verify" && t("reset.body.doneVerify")}
            {stage.kind === "bad-link" && t("reset.body.badLink")}
            {stage.kind === "offline" && t("reset.body.offline")}
            {stage.kind === "unavailable" && t("reset.body.unavailable")}
          </p>
        </div>
      </div>

      {stage.kind === "reset" && (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-password`} className="text-ink-700 text-base font-semibold">
              {t("reset.field")}
            </label>
            <input
              id={`${id}-password`}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-paper border-edge text-ink-900 min-h-14 rounded-tile border-2 px-4 text-lg"
              data-reset-password
            />
          </div>
          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-reset-error>
            {error ? t(error) : ""}
          </p>
          <Button type="submit" size="md" icon={<ArrowRight className="size-5" aria-hidden />} iconRight className="self-start" aria-busy={busy} data-reset-submit>
            {t(busy ? "common.oneMoment" : "reset.submit")}
          </Button>
        </form>
      )}

      {(stage.kind === "done-reset" || stage.kind === "done-verify" || stage.kind === "bad-link" || stage.kind === "unavailable") && back}
      {stage.kind === "offline" && (
        <p className="text-ink-700 text-base">
          <OrSignIn locale={locale} />
        </p>
      )}
    </Card>
  );
}

/**
 * "Or go to sign in." — one sentence with a link inside it, split at its
 * `{link}` hole so the words either side stay the translator's, not KIDDO's.
 */
function OrSignIn({ locale }: { locale: Locale }) {
  const { before, after } = around(translate(locale, "reset.orSignIn"), "link");
  return (
    <>
      {before}
      <Link href={PARENTS} className="text-ink-900 font-semibold underline underline-offset-4">
        {translate(locale, "reset.orSignIn.link")}
      </Link>
      {after}
    </>
  );
}
