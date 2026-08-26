"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  PLANS,
  PLAN_ORDER,
  YEARLY_SAVING_PERCENT,
  type Plan,
} from "@/lib/billing/subscription";
import { retrySession, sessionHasAccess, signOut, startCheckout, useSession } from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";
import { KIDDO_HOME, PARENTS, PRICING, WELCOME } from "@/lib/routes";

import { AuthCard } from "./AuthCard";
import { SubscriptionGate } from "./SubscriptionGate";

/**
 * `/join` — the road between choosing a plan and paying for it.
 *
 * A parent arrives here from the pricing section with a plan already in
 * mind, and this page is the two steps that follow it: the account, then
 * Stripe. Nothing else happens on it. There is no child yet, no journey,
 * no product — those come after the payment the webhook confirms.
 *
 *   plan (from /#pricing) → account (Firebase) → Stripe Checkout → /welcome
 *
 * The plan can still be changed here, because a parent who has just been
 * asked for a password is allowed to reconsider; it is carried in this
 * component's state and handed to the server when Checkout is asked for.
 * The price itself is never sent — the server reads it from Stripe.
 *
 * Once the account exists, Checkout starts on its own: the parent already
 * said which plan they wanted, and asking again would be a second decision
 * where there is only one. If that request fails they get the reason and a
 * button, never a dead end.
 */

const WORDS: Partial<Record<AuthFailure, string>> = {
  offline: "KIDDO can’t reach the internet right now. Check the connection and try again.",
  "billing-unavailable": "Subscriptions aren’t set up on this KIDDO yet. Please try again later.",
  "no-account": "Please sign in again and then choose a plan.",
};

export function JoinGate({ plan: chosen }: { plan: Plan }) {
  const session = useSession();
  const [plan, setPlan] = useState<Plan>(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  /* Whether the account was made (or signed into) on this visit. Only then
     does Checkout start by itself — a parent who arrived already signed in
     gets a button, because nothing they just did asked for a payment. */
  const arrivedSignedOut = useRef(false);
  const started = useRef(false);

  const status = session.status;
  const ready = status === "needs-subscription" && !sessionHasAccess(session);
  const subStatus = session.subscription?.status ?? "none";
  /* A payment that failed or is still clearing is not a fresh purchase; the
     subscription gate already says the right thing about both. */
  const complicated = subStatus === "past_due" || subStatus === "incomplete";

  async function go(next: Plan = plan) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await startCheckout(next, WELCOME);
    if (failure) {
      setBusy(false);
      started.current = false;
      setError(WORDS[failure] ?? "Something went wrong starting the payment. Please try again.");
    }
    /* On success the browser is already on its way to Stripe. */
  }

  /* Marked in an effect rather than during render, and declared before the
     effect that reads it, so the render that showed the sign-up form has
     already recorded itself by the time the account exists. */
  useEffect(() => {
    if (status === "signed-out") arrivedSignedOut.current = true;
  }, [status]);

  useEffect(() => {
    if (!ready || complicated || !arrivedSignedOut.current || started.current) return;
    started.current = true;
    void go(plan);
    /* `go` is stable enough for this: it only reads `plan`, passed in. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, complicated, plan]);

  if (status === "unavailable") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="unavailable">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Subscriptions aren’t set up here yet</h1>
        <p className="text-ink-700 text-base leading-snug">
          This copy of KIDDO is running without accounts, so there is nothing to pay for
          yet. Everything a child plays stays on this device.
        </p>
        <ButtonLink href={KIDDO_HOME} size="md" className="self-start">
          Open KIDDO
        </ButtonLink>
      </Card>
    );
  }

  if (sessionHasAccess(session)) {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="subscribed">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">You already have KIDDO</h1>
        <p className="text-ink-700 text-base leading-snug">
          Your subscription is active, so there is nothing to pay. Everything is open.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={KIDDO_HOME} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />}>
            Enter KIDDO
          </ButtonLink>
          <ButtonLink href={PARENTS} size="md" variant="soft">
            Parent area
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (status === "trouble") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="trouble">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">We couldn’t reach your account</h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          Check your connection and try again — nothing has been charged.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={retrySession} data-session-retry>
            Try again
          </Button>
          <Button variant="quiet" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </Card>
    );
  }

  /* A payment that failed or has not cleared: the gate handles both, with
     the Customer Portal rather than a second Checkout. */
  if (session.user && complicated) return <SubscriptionGate />;

  if (status === "loading" || status === "signed-in") {
    return (
      <Card as="section" padding="lg" radius="hero" data-join-gate={status} aria-busy>
        <p className="text-ink-500 text-base">One moment…</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-join-gate={status}>
      <ChosenPlan plan={plan} onChange={setPlan} disabled={busy} id={id} />

      {status === "signed-out" ? (
        <>
          <AuthCard initialMode="signup" />
          <p className="text-ink-500 text-sm leading-snug">
            You’ll be taken to Stripe to pay as soon as your account exists. Nothing is
            charged until you finish there, and KIDDO never sees your card.
          </p>
        </>
      ) : (
        <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-checkout>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {busy ? "Taking you to Stripe…" : "Ready when you are"}
          </h2>
          <p className="text-ink-700 text-base leading-snug">
            {`Signed in as ${session.user?.email ?? "your account"}. The next step is Stripe’s secure checkout.`}
          </p>
          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-join-error>
            {error ?? ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => void go()}
              aria-busy={busy}
              icon={<ArrowRight className="size-5" aria-hidden />}
              iconRight
              data-join-start
            >
              {busy ? "One moment…" : `Continue to checkout`}
            </Button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
              data-join-signout
            >
              Use a different account
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** The plan being bought, and the chance to change your mind about it. */
function ChosenPlan({
  plan,
  onChange,
  disabled,
  id,
}: {
  plan: Plan;
  onChange: (plan: Plan) => void;
  disabled: boolean;
  id: string;
}) {
  return (
    <Card as="section" aria-labelledby={`${id}-plan`} padding="lg" radius="hero" className="flex flex-col gap-5" data-join-plan={plan}>
      <div className="flex items-start gap-4">
        <span className="bg-honey-soft text-honey-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">Your plan</p>
          <h1 id={`${id}-plan`} className="font-display text-2xl font-semibold sm:text-3xl">
            {`${PLANS[plan].name} · ${PLANS[plan].price} a ${PLANS[plan].per}`}
          </h1>
          <p className="text-ink-700 text-base leading-snug">
            {plan === "yearly"
              ? `${PLANS.yearly.blurb} — ${YEARLY_SAVING_PERCENT}% less than paying monthly.`
              : PLANS.monthly.blurb + ". Cancel anytime."}
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 sm:flex-row" disabled={disabled}>
        <legend className="sr-only">Choose a plan</legend>
        {PLAN_ORDER.map((key) => {
          const selected = plan === key;
          return (
            <label
              key={key}
              className={`flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-tile border-2 px-4 py-3 transition-colors ${
                selected ? "border-ink-900 bg-cream-50" : "border-edge hover:bg-cream-50"
              }`}
              data-join-plan-option={key}
              data-join-plan-selected={selected || undefined}
            >
              <input
                type="radio"
                name="plan"
                value={key}
                checked={selected}
                onChange={() => onChange(key)}
                className="accent-ink-900 size-5 shrink-0"
              />
              <span className="text-ink-900 text-base font-semibold">
                {`${PLANS[key].name} · ${PLANS[key].price}/${PLANS[key].per}`}
              </span>
            </label>
          );
        })}
      </fieldset>

      <ButtonLink href={PRICING} variant="quiet" size="sm" className="self-start" data-join-back>
        Compare the plans again
      </ButtonLink>
    </Card>
  );
}
