"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  clearGoogleRedirectFailure,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  useGoogleRedirectFailure,
} from "@/lib/cloud/session";
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
 *
 * Google sits above the form in the first two modes, because for a parent
 * who has a Google account it is the whole job in one tap and the form is
 * the longer way round. One button, not two: Firebase makes the account the
 * first time and finds it every time after, so "sign in" and "create an
 * account" are the same action to Google and it would be a lie to draw them
 * as different buttons.
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
  /* Never reached: `signInWithGoogle` answers `null` for a shut window, so
     the card says nothing at all. Present because the map is total, and it
     is better to name the reason than to leave a hole in it. */
  "popup-closed": "auth.error.unknown",
  "popup-blocked": "auth.error.popup-blocked",
  /* KIDDO stopped waiting. Says so without guessing why, because it does
     not know why — that is the whole meaning of the timeout. */
  "timed-out": "auth.error.timed-out",
  "different-sign-in": "auth.error.different-sign-in",
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
  /**
   * Two flags where there used to be one, and the second one is a bug fix.
   *
   * A single `busy` made the card a single point of failure: `google()` set
   * it, `submit()` refused to run while it was set, and an installed iPhone
   * had a Google promise that never settled. So a parent tapped the button
   * at the top of the card — the one that is deliberately first, because it
   * is the shortest road — and from that moment the email and password
   * boxes underneath it silently swallowed every press, including on the
   * create-an-account side. One hung promise, all three paths dead.
   *
   * The promise no longer hangs (`cloud/session.ts` bounds it, and on iOS it
   * is not a popup at all any more), and it no longer *could* take the form
   * with it if it did. Both halves matter: the second is the one that holds
   * when some future SDK invents a new way to never answer.
   */
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const { locale, t } = useTranslation();
  const redirectFailure = useGoogleRedirectFailure();
  const id = useId();
  const creating = mode === "signup";
  const forgot = mode === "forgot";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    clearGoogleRedirectFailure();
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

  async function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    clearGoogleRedirectFailure();
    const failure = await signInWithGoogle();
    setGoogleBusy(false);
    /* `null` covers "signed in", "shut the window", and — on an installed
       iPhone — "the browser is leaving for Google right now". Nothing to
       say in any of the three, so the live region is left as it was. */
    if (failure) setError(WORDS[failure]);
  }

  /**
   * A sign-in that left the page cannot report back into the button that
   * started it, so the reason comes back through the session store on the
   * next load and is read here, in the same live region as every other
   * failure. Read rather than copied into state: the store already is the
   * state, and an effect that mirrors it into a second copy is a render the
   * card does not need. Anything the parent does next — pressing Google,
   * submitting the form, changing mode — clears it, so it is not news twice.
   */
  const shown = error ?? (redirectFailure ? WORDS[redirectFailure] : null);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    clearGoogleRedirectFailure();
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

      {!forgot && (
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="soft"
            size="md"
            block
            onClick={google}
            aria-busy={googleBusy}
            icon={<GoogleMark />}
            data-auth-google
          >
            {t(googleBusy ? "auth.google.leaving" : "auth.google.continue")}
          </Button>
          {/* A rule with a word in it. `aria-hidden` because a screen
              reader reading "or" between a button and a form learns
              nothing it cannot already tell from the order. */}
          <div className="flex items-center gap-3" aria-hidden>
            <span className="bg-edge h-0.5 flex-1 rounded-full" />
            <span className="text-ink-500 text-sm font-semibold uppercase">{t("auth.google.or")}</span>
            <span className="bg-edge h-0.5 flex-1 rounded-full" />
          </div>
        </div>
      )}

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
          {shown ? t(shown) : ""}
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
 * Google's own "G", drawn rather than fetched: an `<img>` from
 * google.com would need a hole in `img-src` and would leave a request to
 * Google on every view of the sign-in page, whether or not the parent uses
 * it. Four paths and no network. The colours are Google's and are fixed on
 * purpose — their branding requires the mark unaltered, so these do not
 * follow KIDDO's palette or its theme.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 16.99 2 20.4 2 24s.85 7.01 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
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
