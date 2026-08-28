"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { reportPurchase } from "@/lib/analytics/events";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { hasAccess } from "@/lib/billing/subscription";
import { useSession } from "@/lib/cloud/session";
import { useT } from "@/lib/i18n/useLocale";
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
  const t = useT();
  const checkout = useCheckoutReturn();
  const [now] = useState(() => Date.now());
  const [stale, setStale] = useState(false);
  const subscription = session.subscription;
  const open = hasAccess(session.subscription, now);

  /* The one place KIDDO tells Meta a subscription was bought, and it says so
     on the strength of what the webhook wrote rather than on having been
     sent back here by Stripe. Repeats are the reporter's own business: it
     remembers the subscription it named, so a reload of this page is a
     second welcome and not a second sale. */
  useEffect(() => {
    if (open && subscription) reportPurchase(subscription);
  }, [open, subscription]);

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
          <ChildOnboarding heading="h2" title="welcome.who" />
        )}
      </div>
    );
  }

  if (session.status === "signed-out" || session.status === "unavailable") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="signed-out">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("welcome.signedOut.title")}</h1>
        <p className="text-ink-700 text-base leading-snug">{t("welcome.signedOut.body")}</p>
        <ButtonLink href={PARENTS} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />} className="self-start">
          {t("welcome.toParents")}
        </ButtonLink>
      </Card>
    );
  }

  if (checkout === "cancelled") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="cancelled">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("welcome.cancelled.title")}</h1>
        <p className="text-ink-700 text-base leading-snug">{t("welcome.cancelled.body")}</p>
        <ButtonLink href={PRICING} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />} className="self-start">
          {t("welcome.cancelled.cta")}
        </ButtonLink>
      </Card>
    );
  }

  if (!stale) {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="confirming" aria-busy>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {t("welcome.confirming.title")}
        </h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          {t("welcome.confirming.body")}
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-welcome="waiting">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("welcome.waiting.title")}</h1>
      <p className="text-ink-700 text-base leading-snug" role="status">
        {t("welcome.waiting.body")}
      </p>
      <ButtonLink href={PARENTS} size="md" variant="soft" className="self-start">
        {t("welcome.toParents")}
      </ButtonLink>
    </Card>
  );
}

/** The moment itself: KIDDO, the two sentences, and the door. */
function Celebration() {
  const t = useT();
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
          {t("welcome.title")}
        </h1>
        <p className="text-ink-700 max-w-xl text-lg leading-relaxed text-pretty">
          {t("welcome.body")}
        </p>
        <ButtonLink
          href={KIDDO_HOME}
          size="lg"
          iconRight
          icon={<ArrowRight className="size-6" aria-hidden />}
          data-welcome-enter
        >
          {t("common.enterKiddo")}
        </ButtonLink>
      </div>
    </Card>
  );
}
