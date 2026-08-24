"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLANS, PLAN_ORDER, hasAccess, type Plan } from "@/lib/billing/subscription";
import { openBillingPortal, signOut, startCheckout, useSession } from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";

import { useCheckoutReturn } from "./checkoutReturn";

/**
 * The subscription gate: the one page between a signed-in parent and KIDDO.
 *
 * Two plans, one button, "cancel anytime". Storybook, not SaaS — the same
 * cards and type as the rest of the parent area, no comparison table, no
 * feature grid, because there is exactly one KIDDO and paying opens all of
 * it. The yearly plan is first and marked "Best value"; that is the whole
 * of the persuasion.
 *
 * What the gate says depends on what the server knows:
 *  - never subscribed: the two plans
 *  - coming back from Checkout: "confirming" until the webhook lands
 *  - payment failed (past_due): plain words and a way to fix the card
 *  - cancelled / ended: the two plans again, with a note
 *
 * Nothing here decides access. The session moves on by itself when the
 * subscription the server wrote becomes active.
 */

const WORDS: Partial<Record<AuthFailure, string>> = {
  offline: "KIDDO can’t reach the internet right now. Check the connection and try again.",
  "billing-unavailable": "Subscriptions aren’t set up on this KIDDO yet. Please try again later.",
  "no-account": "Please sign in again and then choose a plan.",
};

export function SubscriptionGate() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const sub = session.subscription;
  const status = sub?.status ?? "none";

  /* Returned from a Checkout that was not cancelled, but the webhook has
     not written "active" yet. Show "confirming" for a while; if it still
     has not arrived, fall back to the plans with an explanation. */
  const [stale, setStale] = useState(false);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    if (checkout !== "success") return;
    const timer = setTimeout(() => setStale(true), CONFIRM_WAIT_MS);
    return () => clearTimeout(timer);
  }, [checkout]);

  const confirming = checkout === "success" && !stale && !hasAccess(sub, now);

  async function choose() {
    if (busy) return;
    setBusy("checkout");
    setError(null);
    const failure = await startCheckout(plan, "/parents");
    if (failure) {
      setBusy(null);
      setError(WORDS[failure] ?? "Something went wrong starting the payment. Please try again.");
    }
    /* On success the browser is on its way to Stripe; keep the button busy. */
  }

  async function manage() {
    if (busy) return;
    setBusy("portal");
    setError(null);
    const failure = await openBillingPortal("/parents");
    if (failure) {
      setBusy(null);
      setError(WORDS[failure] ?? "KIDDO couldn’t open billing just now. Please try again.");
    }
  }

  if (confirming) {
    return (
      <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-4" data-subscription-gate="confirming" aria-busy>
        <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
          We’re confirming your KIDDO access
        </h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          Thank you! Your payment went through to Stripe and KIDDO is opening up. This usually takes a few seconds — there’s nothing you need to do.
        </p>
      </Card>
    );
  }

  const headline =
    status === "past_due"
      ? "A payment didn’t go through"
      : status === "cancelled" || status === "expired"
        ? "Welcome back to KIDDO"
        : status === "incomplete"
          ? "Your payment is still being confirmed"
          : "Your child’s adventure is ready.";

  const lead =
    status === "past_due"
      ? "KIDDO is paused until the payment goes through. Updating the card in billing usually sorts it out straight away."
      : status === "cancelled" || status === "expired"
        ? "Your subscription has ended. Choose a plan and everything your child played is right where they left it."
        : status === "incomplete"
          ? "Stripe hasn’t confirmed the first payment yet. If it was declined, you can try again below; a pending payment opens KIDDO as soon as it clears."
          : stale
            ? "We haven’t heard back from the payment yet. If your card was charged, KIDDO will open on its own shortly — please don’t pay twice. If the payment didn’t go through, you can try again below."
            : "One subscription opens every world, every game and every new story for your child. No ads, nothing to buy inside.";

  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-subscription-gate={status} data-checkout-return={checkout ?? undefined}>
      <div className="flex items-start gap-4">
        <span className="bg-honey-soft text-honey-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">KIDDO</p>
          <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
            {headline}
          </h1>
          <p className="text-ink-700 text-base leading-snug">{lead}</p>
          {checkout === "cancelled" && status !== "past_due" && (
            <p className="text-ink-500 text-sm" role="status" data-checkout-cancelled>
              No payment was made. Whenever you’re ready, the plans are below.
            </p>
          )}
        </div>
      </div>

      {status === "past_due" ? (
        <div className="flex flex-col gap-3">
          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-subscription-error>
            {error ?? ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void manage()} aria-busy={busy === "portal"} icon={<ArrowRight className="size-5" aria-hidden />} iconRight data-billing-manage>
              {busy === "portal" ? "One moment…" : "Update payment details"}
            </Button>
            <Button variant="quiet" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void choose();
          }}
          className="flex flex-col gap-4"
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Choose a plan</legend>
            {PLAN_ORDER.map((key) => {
              const p = PLANS[key];
              const selected = plan === key;
              return (
                <label
                  key={key}
                  className={`bg-paper flex cursor-pointer items-center gap-4 rounded-card border-2 p-4 transition-colors sm:p-5 ${
                    selected ? "border-ink-900 shadow-soft" : "border-edge hover:bg-cream-50"
                  }`}
                  data-plan={key}
                  data-plan-selected={selected || undefined}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={key}
                    checked={selected}
                    onChange={() => setPlan(key)}
                    className="accent-ink-900 size-5 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold sm:text-xl">{p.name}</span>
                      {p.note && (
                        <span className="bg-honey-soft text-honey-ink rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
                          {p.note}
                        </span>
                      )}
                    </span>
                    <span className="text-ink-700 text-base">
                      <span className="text-ink-900 font-semibold">{p.price}</span>/{p.per}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-subscription-error>
            {error ?? ""}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" size="lg" aria-busy={busy === "checkout"} icon={<ArrowRight className="size-5" aria-hidden />} iconRight data-subscription-start>
              {busy === "checkout" ? "One moment…" : "Start KIDDO"}
            </Button>
            <p className="text-ink-500 text-sm">Cancel anytime. Payments are handled by Stripe.</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {sub?.stripeCustomerId && (
              <button type="button" onClick={() => void manage()} className="text-ink-900 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-billing-manage>
                Billing history
              </button>
            )}
            <button type="button" onClick={() => void signOut()} className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-gate-signout>
              Sign out
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

/** How long "confirming" is shown before admitting the webhook is late. */
export const CONFIRM_WAIT_MS = 45_000;
