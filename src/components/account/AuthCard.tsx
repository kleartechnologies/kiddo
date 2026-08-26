"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sendPasswordReset, signIn, signUp } from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";
import { around } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useTranslation } from "@/lib/i18n/useLocale";

/**
 * Where a parent signs in or creates the account their child will play
 * under. One card, three modes: sign in, create an account, and the
 * forgotten-password detour. Creating asks for the password twice, because
 * it is the only field on the page that cannot be checked by reading it
 * back; signing in asks once, because a wrong one simply does not work.
 *
 * Errors are sentences, not codes, and they sit in a live region next to
 * the boxes rather than in a toast that vanishes.
 */

/**
 * The one sentence a failed sign-in gets, whatever went wrong. "No account
 * has that email" and "that password is wrong" are the two halves of an
 * account-enumeration oracle: either one, asked repeatedly, sorts a list
 * of addresses into customers and strangers. `wrong-password` and
 * `no-account` therefore point at the *same* key, in every language — a
 * translator who gave them two different sentences would reopen the oracle
 * without ever touching the code.
 */
const SAME_EITHER_WAY: MessageKey = "auth.error.sameEitherWay";

const WORDS: Record<AuthFailure, MessageKey> = {
  "invalid-email": "auth.error.invalid-email",
  "weak-password": "auth.error.weak-password",
  /* Says what happened without confirming an account exists. Firebase
     itself still answers `email-already-in-use` on the wire, which no
     wording here can hide — see docs/SECURITY.md. */
  "email-in-use": "auth.error.email-in-use",
  /* Signing in never says which half was wrong, and never says whether
     the email is one KIDDO knows. Firebase itself has to be told the same
     — turn on Email Enumeration Protection in the Console (see
     docs/SECURITY.md), or the network answer tells an attacker what this
     sentence will not. */
  "wrong-password": SAME_EITHER_WAY,
  "no-account": SAME_EITHER_WAY,
  "too-many-attempts": "auth.error.too-many-attempts",
  offline: "auth.error.offline",
  "bad-link": "auth.error.bad-link",
  "recent-login": "auth.error.recent-login",
  "billing-unavailable": "auth.error.billing-unavailable",
  unknown: "auth.error.unknown",
};

/** Not an auth failure — the two password boxes simply differ. */
const MISMATCH: MessageKey = "auth.error.mismatch";

export type Mode = "signin" | "signup" | "forgot";

export function AuthCard({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [sent, setSent] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const { locale, t } = useTranslation();
  const id = useId();
  const creating = mode === "signup";
  const forgot = mode === "forgot";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    if (forgot) {
      const failure = await sendPasswordReset(email);
      setBusy(false);
      /* "No account" is deliberately not distinguished: the sentence is the
         same either way, so the form cannot be used to look up who has an
         account. */
      if (failure && failure !== "no-account") setError(WORDS[failure]);
      else setSent(email.trim());
      return;
    }
    if (creating && password !== confirm) {
      /* Caught here rather than by Firebase: the two boxes are KIDDO's
         idea, and a mistyped confirmation is not an auth failure. */
      setBusy(false);
      setError(MISMATCH);
      return;
    }
    const failure = creating ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (failure) setError(WORDS[failure]);
  }

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setSent(null);
    setConfirm("");
  }

  if (forgot && sent) {
    return (
      <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-auth-card="forgot-sent">
        <div className="flex items-start gap-4">
          <span className="bg-sage-soft text-sage-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
              {t("auth.sent.title")}
            </h1>
            <p className="text-ink-700 text-base leading-snug" role="status">
              <SentSentence locale={locale} email={sent} />
            </p>
          </div>
        </div>
        <Button variant="soft" size="md" onClick={() => switchTo("signin")} className="self-start" data-auth-switch>
          {t("auth.switch.backToSignIn")}
        </Button>
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-auth-card={mode}>
      <div className="flex items-start gap-4">
        <span className="bg-sage-soft text-sage-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <KeyRound className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
            {t(forgot ? "auth.forgot.title" : creating ? "auth.signup.title" : "auth.signin.title")}
          </h1>
          <p className="text-ink-700 text-base leading-snug">
            {t(forgot ? "auth.forgot.blurb" : creating ? "auth.signup.blurb" : "auth.signin.blurb")}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-ink-700 text-base font-semibold">
            {t("auth.field.email")}
          </label>
          <input
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-paper border-edge text-ink-900 placeholder:text-ink-300 min-h-14 rounded-tile border-2 px-4 text-lg"
            data-auth-email
          />
        </div>
        {!forgot && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-password`} className="text-ink-700 text-base font-semibold">
              {t("auth.field.password")}
            </label>
            {!creating && (
              <button type="button" onClick={() => switchTo("forgot")} className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-auth-forgot>
                {t("auth.forgotLink")}
              </button>
            )}
          </div>
          <input
            id={`${id}-password`}
            type="password"
            name="password"
            autoComplete={creating ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={creating ? `${id}-hint` : undefined}
            className="bg-paper border-edge text-ink-900 placeholder:text-ink-300 min-h-14 rounded-tile border-2 px-4 text-lg"
            data-auth-password
          />
          {creating && (
            <p id={`${id}-hint`} className="text-ink-500 text-sm">
              {t("auth.field.passwordHint")}
            </p>
          )}
        </div>
        )}
        {creating && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-confirm`} className="text-ink-700 text-base font-semibold">
              {t("auth.field.confirm")}
            </label>
            <input
              id={`${id}-confirm`}
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="bg-paper border-edge text-ink-900 placeholder:text-ink-300 min-h-14 rounded-tile border-2 px-4 text-lg"
              data-auth-confirm
            />
          </div>
        )}

        <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-auth-error>
          {error ? t(error) : ""}
        </p>

        <Button
          type="submit"
          size="md"
          icon={<ArrowRight className="size-5" aria-hidden />}
          iconRight
          className="self-start"
          aria-busy={busy}
          data-auth-submit
        >
          {t(
            busy
              ? "auth.submit.busy"
              : forgot
                ? "auth.submit.forgot"
                : creating
                  ? "auth.submit.signup"
                  : "auth.submit.signin",
          )}
        </Button>
      </form>

      <p className="text-ink-700 text-base">
        {t(
          forgot
            ? "auth.switch.rememberedIt"
            : creating
              ? "auth.switch.haveAccount"
              : "auth.switch.newHere",
        )}{" "}
        <button
          type="button"
          onClick={() => switchTo(forgot || creating ? "signin" : "signup")}
          className="text-ink-900 -my-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
          data-auth-switch
        >
          {t(
            forgot
              ? "auth.switch.backToSignIn"
              : creating
                ? "auth.switch.signInInstead"
                : "auth.switch.createAccount",
          )}
        </button>
      </p>
    </Card>
  );
}

/**
 * "If there is a KIDDO account for **you@example.com**, …" — one sentence,
 * with the address emphasised wherever the language puts it. `around` splits
 * the translated sentence at its `{email}` hole rather than KIDDO gluing two
 * fragments together, so Malay is free to lead with the address.
 */
function SentSentence({ locale, email }: { locale: Locale; email: string }) {
  const { before, after } = around(translate(locale, "auth.sent.body"), "email");
  return (
    <>
      {before}
      <span className="font-semibold">{email}</span>
      {after}
    </>
  );
}
