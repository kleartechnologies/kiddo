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

const WORDS: Partial<Record<AuthFailure, string>> = {
  "weak-password": "Please choose a password with at least 6 characters.",
  "bad-link": "This link has expired or has already been used.",
  offline: "KIDDO can’t reach the internet right now. Check the connection and try again.",
};

export function ResetPassword() {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    else if (failure) setError(WORDS[failure] ?? "Something went wrong. Please try again.");
    else setStage({ kind: "done-reset" });
  }

  const back = (
    <ButtonLink href={PARENTS} size="md" icon={<ArrowRight className="size-5" aria-hidden />} iconRight className="self-start" data-reset-back>
      Go to sign in
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
            {stage.kind === "checking" && "One moment…"}
            {stage.kind === "reset" && "Choose a new password"}
            {stage.kind === "done-reset" && "Your password is changed"}
            {stage.kind === "done-verify" && "Your email is verified"}
            {stage.kind === "bad-link" && "This link doesn’t work any more"}
            {stage.kind === "offline" && "KIDDO can’t reach the internet"}
            {stage.kind === "unavailable" && "Accounts aren’t set up on this KIDDO"}
          </h1>
          <p className="text-ink-700 text-base leading-snug" role="status">
            {stage.kind === "checking" && "Checking your link."}
            {stage.kind === "reset" && `For ${stage.email}. At least 6 characters.`}
            {stage.kind === "done-reset" && "Sign in with it to get back to your child’s KIDDO."}
            {stage.kind === "done-verify" && "Thank you. You can carry on in the parent area."}
            {stage.kind === "bad-link" && "Password links expire after a while and only work once. Go to sign in and choose “Forgot password?” to get a new one."}
            {stage.kind === "offline" && "Check the connection and open the link from your email again."}
            {stage.kind === "unavailable" && "This KIDDO keeps everything on the device, so there is no password to reset."}
          </p>
        </div>
      </div>

      {stage.kind === "reset" && (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-password`} className="text-ink-700 text-base font-semibold">
              New password
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
            {error ?? ""}
          </p>
          <Button type="submit" size="md" icon={<ArrowRight className="size-5" aria-hidden />} iconRight className="self-start" aria-busy={busy} data-reset-submit>
            {busy ? "One moment…" : "Save new password"}
          </Button>
        </form>
      )}

      {(stage.kind === "done-reset" || stage.kind === "done-verify" || stage.kind === "bad-link" || stage.kind === "unavailable") && back}
      {stage.kind === "offline" && (
        <p className="text-ink-700 text-base">
          Or <Link href={PARENTS} className="text-ink-900 font-semibold underline underline-offset-4">go to sign in</Link>.
        </p>
      )}
    </Card>
  );
}
