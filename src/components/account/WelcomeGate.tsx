"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { hasAccess } from "@/lib/billing/subscription";
import { useSession } from "@/lib/cloud/session";
import { KIDDO_HOME, PARENTS, PRICING } from "@/lib/routes";

import { ChildOnboarding } from "./ChildOnboarding";
import { CONFIRM_WAIT_MS } from "./SubscriptionGate";
import { useCheckoutReturn } from "./checkoutReturn";

/**
 * `/welcome` — where Stripe sends a parent back after a payment.
 *
 * The happy path is the whole point of the page: KIDDO, a sentence, and one
 * button into the product. But arriving here proves only that Stripe took a
 * payment, not that KIDDO has heard about it — the webhook is a separate
 * journey and is occasionally a few seconds behind. So the page waits,
 * visibly and calmly, and never says the payment failed on the strength of
 * a subscription it has not read yet.
 *
 *   access already → welcome (and the one onboarding question, if it is
 *                    still owed)
 *   no access yet  → "confirming", because Stripe said the payment went
 *                    through and the webhook is the only thing missing
 *   still nothing  → say exactly that, and warn against paying twice
 *
 * Access is never decided here. `hasAccess` on what the server wrote is the
 * only thing that opens KIDDO, on this page as on every other.
 */
export function WelcomeGate() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [now] = useState(() => Date.now());
  const [stale, setStale] = useState(false);
  const open = hasAccess(session.subscription, now);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setStale(true), CONFIRM_WAIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (open) {
    return (
      <div className="flex flex-col gap-6" data-welcome="open">
        <Celebration />
        {session.status === "needs-child" && (
          <ChildOnboarding heading="h2" title="Who’s playing?" />
        )}
      </div>
    );
  }

  if (session.status === "signed-out" || session.status === "unavailable") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="signed-out">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Sign in to finish</h1>
        <p className="text-ink-700 text-base leading-snug">
          We can’t see your account on this device, so KIDDO can’t check your subscription.
          Sign in and the parent area will show exactly where things stand.
        </p>
        <ButtonLink href={PARENTS} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />} className="self-start">
          Go to the parent area
        </ButtonLink>
      </Card>
    );
  }

  if (checkout === "cancelled") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="cancelled">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">No payment was made</h1>
        <p className="text-ink-700 text-base leading-snug">
          You left the checkout before paying, and nothing was charged. The plans are
          waiting whenever you are.
        </p>
        <ButtonLink href={PRICING} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />} className="self-start">
          See the plans
        </ButtonLink>
      </Card>
    );
  }

  if (!stale) {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="confirming" aria-busy>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          We’re confirming your KIDDO access
        </h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          Thank you! Your payment reached Stripe and KIDDO is opening up. This usually
          takes a few seconds — there’s nothing you need to do, and this page will move on
          by itself.
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="waiting">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Still confirming</h1>
      <p className="text-ink-700 text-base leading-snug" role="status">
        We haven’t heard back about the payment yet. If your card was charged, KIDDO will
        open on its own shortly — please don’t pay twice. The parent area always shows the
        current state of your subscription.
      </p>
      <ButtonLink href={PARENTS} size="md" variant="soft" className="self-start">
        Go to the parent area
      </ButtonLink>
    </Card>
  );
}

/** The moment itself: KIDDO, the two sentences, and the door. */
function Celebration() {
  return (
    <Card
      as="section"
      padding="lg"
      radius="hero"
      className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-8 sm:text-left"
      data-welcome-celebration
    >
      <CharacterFigure id="kiddo" size="xl" pose="cheer" />
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
          Welcome to KIDDO! 🎉
        </h1>
        <p className="text-ink-700 max-w-xl text-lg leading-relaxed text-pretty">
          Your KIDDO adventure starts here.
        </p>
        <ButtonLink
          href={KIDDO_HOME}
          size="lg"
          iconRight
          icon={<ArrowRight className="size-6" aria-hidden />}
          data-welcome-enter
        >
          Enter KIDDO
        </ButtonLink>
      </div>
    </Card>
  );
}
