"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { reportPurchase } from "@/lib/analytics/events";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { hasAccess } from "@/lib/billing/access";
import { confirmPurchase, forgetPendingBill, pendingBill, useSession } from "@/lib/cloud/session";
import { useT } from "@/lib/i18n/useLocale";
import { KIDDO_HOME, PARENTS, PRICING } from "@/lib/routes";

import { ChildOnboarding } from "./ChildOnboarding";
import { CONFIRM_WAIT_MS } from "./AccessGate";
import { useCheckoutReturn } from "./checkoutReturn";

/**
 * `/welcome` — where Billplz sends a parent back after a payment.
 *
 * The happy path is the whole point of the page: KIDDO, a sentence, and one
 * button into the product. But arriving here proves only that a browser came
 * back from a payment page, not that the money arrived — `billplz[paid]=true`
 * is a string in an address bar, and the server-side callback is a separate
 * journey that is occasionally a few seconds behind. So the page asks the
 * *server* what happened, waits visibly and calmly for the answer, and never
 * says the payment failed on the strength of an entitlement it has not read
 * yet.
 *
 *   access already → welcome (and the one onboarding question, if it is
 *                    still owed)
 *   no access yet  → "confirming", while `confirmPurchase` has the server
 *                    re-read the bill from Billplz with its own secret key
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
  const entitlement = session.entitlement;
  const open = hasAccess(entitlement, now);
  const user = session.user;

  /* The one place KIDDO tells Meta a purchase happened, and it says so on
     the strength of what the server wrote rather than on having been sent
     back here by Billplz. Repeats are the reporter's own business: it
     remembers the bill it named, so a reload of this page is a second
     welcome and not a second sale. */
  useEffect(() => {
    if (open && entitlement) reportPurchase(entitlement);
  }, [open, entitlement]);

  /* Ask the server, once, to settle the bill this visit is about. Billplz's
     callback is the authority; this reaches the same authority from the
     other side so a parent is not left watching a spinner while a webhook
     they cannot see makes its way over. The server checks the bill belongs
     to this account and re-reads it from Billplz before writing anything —
     nothing here is taken on the redirect's word. */
  useEffect(() => {
    if (open || !user) return;
    const bill = checkout?.billId ?? pendingBill();
    if (!bill) return;
    let live = true;
    void confirmPurchase(bill).then((paid) => {
      if (live && paid) forgetPendingBill();
    });
    return () => {
      live = false;
    };
  }, [open, user, checkout?.billId]);

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

  if (checkout?.paid === false) {
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
