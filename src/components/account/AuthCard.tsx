"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sendPasswordReset, signIn, signUp } from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";

/**
 * Where a parent signs in or creates the account their child will play
 * under. One card, two modes, the same two boxes — the only difference is
 * the sentence and the button, because a parent who has an account and one
 * who does not are asked for the same things.
 *
 * Errors are sentences, not codes, and they sit in a live region next to
 * the boxes rather than in a toast that vanishes.
 */

const WORDS: Record<AuthFailure, string> = {
  "invalid-email": "That doesn’t look like an email address.",
  "weak-password": "Please choose a password with at least 6 characters.",
  "email-in-use": "There is already a KIDDO account for that email. Try signing in.",
  "wrong-password": "That email and password don’t match.",
  "no-account": "No KIDDO account has that email yet. Create one below.",
  "too-many-attempts": "Too many tries for now. Please wait a little and try again.",
  offline: "KIDDO can’t reach the internet right now. Check the connection and try again.",
  "bad-link": "That link has expired. Ask for a new one below.",
  "recent-login": "Please sign in again first.",
  "billing-unavailable": "Subscriptions aren’t set up on this KIDDO yet.",
  unknown: "Something went wrong. Please try again.",
};

type Mode = "signin" | "signup" | "forgot";

export function AuthCard({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [sent, setSent] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const failure = creating ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (failure) setError(WORDS[failure]);
  }

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setSent(null);
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
              Check your email
            </h1>
            <p className="text-ink-700 text-base leading-snug" role="status">
              If there is a KIDDO account for <span className="font-semibold">{sent}</span>, a link to choose a new password is on its way. It only works once and expires after a while.
            </p>
          </div>
        </div>
        <Button variant="soft" size="md" onClick={() => switchTo("signin")} className="self-start" data-auth-switch>
          Back to sign in
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
            {forgot ? "Forgot your password?" : creating ? "Create a KIDDO account" : "Sign in to KIDDO"}
          </h1>
          <p className="text-ink-700 text-base leading-snug">
            {forgot
              ? "Type the email your KIDDO account is under and we’ll send a link to choose a new one."
              : creating
                ? "An account for you, the grown-up. Your child never signs in — they just play, and their progress follows them to any device you sign in on."
                : "Your child’s progress and name are kept with your account."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-ink-700 text-base font-semibold">
            Your email
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
              Password
            </label>
            {!creating && (
              <button type="button" onClick={() => switchTo("forgot")} className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-auth-forgot>
                Forgot password?
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
              At least 6 characters.
            </p>
          )}
        </div>
        )}

        <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-auth-error>
          {error ?? ""}
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
          {busy ? "One moment…" : forgot ? "Send reset link" : creating ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-ink-700 text-base">
        {forgot ? "Remembered it?" : creating ? "Already have an account?" : "New to KIDDO?"}{" "}
        <button
          type="button"
          onClick={() => switchTo(forgot || creating ? "signin" : "signup")}
          className="text-ink-900 -my-3 inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
          data-auth-switch
        >
          {forgot ? "Back to sign in" : creating ? "Sign in instead" : "Create an account"}
        </button>
      </p>
    </Card>
  );
}
