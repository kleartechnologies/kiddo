"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LIFETIME_PRICE } from "@/lib/billing/access";
import { retrySession, sessionHasAccess, signOut, startPurchase, useSession } from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { KIDDO_HOME, PARENTS, PRICING, WELCOME } from "@/lib/routes";

import { AuthCard } from "./AuthCard";
import { AccessGate } from "./AccessGate";

/**
 * `/join` — the road between deciding on KIDDO and paying for it.
 *
 * A parent arrives here from the pricing section having decided, and this
 * page is the two steps that follow: the account, then Billplz. Nothing else
 * happens on it. There is no child yet, no journey, no product — those come
 * after the payment the server confirms.
 *
 *   /#pricing → account (Firebase) → Billplz → /welcome
 *
 * There is nothing to choose here, because there is one price and one thing
 * to buy. The amount is never sent from the browser either: the server puts
 * `LIFETIME_AMOUNT` on the bill, and the figure shown here is the same
 * constant, read for display only.
 *
 * Once the account exists, the payment starts on its own: the parent already
 * said what they wanted by coming here, and asking again would be a second
 * decision where there is only one. If that request fails they get the
 * reason and a button, never a dead end.
 */

const WORDS: Partial<Record<AuthFailure, MessageKey>> = {
  offline: "auth.error.offline",
  "billing-unavailable": "join.error.billing-unavailable",
  "no-account": "join.error.no-account",
};

export function JoinGate() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const t = useT();
  const id = useId();
  /* Whether the account was made (or signed into) on this visit. Only then
     does the payment start by itself — a parent who arrived already signed
     in gets a button, because nothing they just did asked for a payment. */
  const arrivedSignedOut = useRef(false);
  const started = useRef(false);

  const status = session.status;
  const ready = status === "needs-purchase" && !sessionHasAccess(session);
  const subStatus = session.entitlement?.subscription.status ?? "none";
  /* An old subscription that failed or is still clearing is not a fresh
     purchase; the access gate already says the right thing about both. */
  const complicated = subStatus === "past_due" || subStatus === "incomplete";

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await startPurchase(WELCOME);
    if (failure) {
      setBusy(false);
      started.current = false;
      setError(WORDS[failure] ?? "join.error.checkout");
    }
    /* On success the browser is already on its way to Billplz. */
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
    void go();
    /* `go` is stable enough for this: it reads nothing that changes here. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, complicated]);

  if (status === "unavailable") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="unavailable">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("join.unavailable.title")}</h1>
        <p className="text-ink-700 text-base leading-snug">{t("join.unavailable.body")}</p>
        <ButtonLink href={KIDDO_HOME} size="md" className="self-start">
          {t("join.unavailable.cta")}
        </ButtonLink>
      </Card>
    );
  }

  if (sessionHasAccess(session)) {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="subscribed">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("join.subscribed.title")}</h1>
        <p className="text-ink-700 text-base leading-snug">{t("join.subscribed.body")}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={KIDDO_HOME} size="md" iconRight icon={<ArrowRight className="size-5" aria-hidden />}>
            {t("common.enterKiddo")}
          </ButtonLink>
          <ButtonLink href={PARENTS} size="md" variant="soft">
            {t("join.subscribed.parents")}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (status === "trouble") {
    return (
      <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-gate="trouble">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("join.trouble.title")}</h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          {t("join.trouble.body")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={retrySession} data-session-retry>
            {t("common.tryAgain")}
          </Button>
          <Button variant="quiet" onClick={() => void signOut()}>
            {t("common.signOut")}
          </Button>
        </div>
      </Card>
    );
  }

  /* An old subscription that failed or has not cleared: the gate handles
     both, with the Customer Portal rather than a second payment. */
  if (session.user && complicated) return <AccessGate />;

  if (status === "loading" || status === "signed-in") {
    return (
      <Card as="section" padding="lg" radius="hero" data-join-gate={status} aria-busy>
        <p className="text-ink-500 text-base">{t("common.oneMoment")}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-join-gate={status}>
      <TheOffer id={id} />

      {status === "signed-out" ? (
        <>
          <AuthCard initialMode="signup" />
          <p className="text-ink-500 text-sm leading-snug">{t("join.beforePayment")}</p>
        </>
      ) : (
        <Card as="section" padding="lg" radius="hero" className="flex flex-col gap-4" data-join-checkout>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {t(busy ? "join.checkout.starting" : "join.checkout.ready")}
          </h2>
          <p className="text-ink-700 text-base leading-snug">
            {t("join.checkout.signedInAs", {
              email: session.user?.email ?? t("join.checkout.yourAccount"),
            })}
          </p>
          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-join-error>
            {error ? t(error) : ""}
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
              {t(busy ? "common.oneMoment" : "join.checkout.cta")}
            </Button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
              data-join-signout
            >
              {t("join.checkout.differentAccount")}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** What is being bought: one thing, one price, and nothing to choose. */
function TheOffer({ id }: { id: string }) {
  const t = useT();
  return (
    <Card as="section" aria-labelledby={`${id}-offer`} padding="lg" radius="hero" className="flex flex-col gap-5" data-join-offer="lifetime">
      <div className="flex items-start gap-4">
        <span className="bg-honey-soft text-honey-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
            {t("join.offer.eyebrow")}
          </p>
          <h1 id={`${id}-offer`} className="font-display text-2xl font-semibold sm:text-3xl" data-join-price>
            {t("join.offer.heading", { name: t("offer.name"), price: LIFETIME_PRICE })}
          </h1>
          <p className="text-ink-700 text-base leading-snug">
            {t("join.offer.blurb", { blurb: t("offer.blurb") })}
          </p>
        </div>
      </div>

      <ButtonLink href={PRICING} variant="quiet" size="sm" className="self-start" data-join-back>
        {t("join.offer.back")}
      </ButtonLink>
    </Card>
  );
}
