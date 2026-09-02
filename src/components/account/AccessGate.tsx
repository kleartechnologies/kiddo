"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasAccess, LIFETIME_PRICE, ORIGINAL_PRICE } from "@/lib/billing/access";
import {
  confirmPurchase,
  openBillingPortal,
  forgetPendingBill,
  pendingBill,
  signOut,
  startPurchase,
  useSession,
} from "@/lib/cloud/session";
import type { AuthFailure } from "@/lib/cloud/types";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";

import { useCheckoutReturn } from "./checkoutReturn";

/**
 * The access gate: the one page between a signed-in parent and KIDDO.
 *
 * One price, one button, no renewal. Storybook, not SaaS — the same card and
 * type as the rest of the parent area, no comparison table, no feature grid,
 * because there is exactly one KIDDO and paying opens all of it. There is no
 * plan to choose, which is the whole of the simplification: a parent who has
 * decided has nothing left to decide.
 *
 * What the gate says depends on what the server knows:
 *  - never bought: the offer
 *  - coming back from a paid bill: "confirming" until the server has asked
 *    Billplz and written the entitlement
 *  - an old subscription that failed (past_due): plain words and the Stripe
 *    portal, for the parents who subscribed before KIDDO was sold once
 *  - an old subscription that ended: the offer again, with a note
 *
 * Nothing here decides access. `confirmPurchase` asks the *server* to
 * re-read the bill from Billplz; the session moves on by itself when the
 * entitlement the server wrote arrives.
 */

const WORDS: Partial<Record<AuthFailure, MessageKey>> = {
  offline: "auth.error.offline",
  "billing-unavailable": "join.error.billing-unavailable",
  "no-account": "join.error.no-account",
};

export function AccessGate() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const t = useT();
  const id = useId();
  const entitlement = session.entitlement;
  const sub = entitlement?.subscription ?? null;
  const status = sub?.status ?? "none";

  /* Came back from a bill Billplz called paid, but the entitlement is not
     here yet. Show "confirming" for a while; if it still has not arrived,
     fall back to the offer with an explanation. */
  const [stale, setStale] = useState(false);
  const [now] = useState(() => Date.now());
  const returned = checkout?.paid === true;
  useEffect(() => {
    if (!returned) return;
    const timer = setTimeout(() => setStale(true), CONFIRM_WAIT_MS);
    return () => clearTimeout(timer);
  }, [returned]);

  /* Ask the server, once, what really happened to that bill. The callback
     from Billplz is the authority and may already have landed; this is the
     same authority reached the other way round, so a parent watching the
     screen is not waiting on a webhook they cannot see. */
  useEffect(() => {
    if (!returned || !session.user) return;
    const bill = checkout?.billId ?? pendingBill();
    if (!bill) return;
    let live = true;
    void confirmPurchase(bill).then((paid) => {
      if (live && paid) forgetPendingBill();
    });
    return () => {
      live = false;
    };
  }, [returned, checkout?.billId, session.user]);

  const confirming = returned && !stale && !hasAccess(entitlement, now);

  async function buy() {
    if (busy) return;
    setBusy("checkout");
    setError(null);
    const failure = await startPurchase("/parents");
    if (failure) {
      setBusy(null);
      setError(WORDS[failure] ?? "join.error.checkout");
    }
    /* On success the browser is on its way to Billplz; keep the button busy. */
  }

  async function manage() {
    if (busy) return;
    setBusy("portal");
    setError(null);
    const failure = await openBillingPortal("/parents");
    if (failure) {
      setBusy(null);
      setError(WORDS[failure] ?? "gate.error.portal");
    }
  }

  if (confirming) {
    return (
      <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-4" data-access-gate="confirming" aria-busy>
        <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
          {t("gate.confirming.title")}
        </h1>
        <p className="text-ink-700 text-base leading-snug" role="status">
          {t("gate.confirming.body")}
        </p>
      </Card>
    );
  }

  const headline: MessageKey =
    status === "past_due"
      ? "gate.headline.past_due"
      : status === "cancelled" || status === "expired"
        ? "gate.headline.returning"
        : status === "incomplete"
          ? "gate.headline.incomplete"
          : "gate.headline.ready";

  const lead: MessageKey =
    status === "past_due"
      ? "gate.lead.past_due"
      : status === "cancelled" || status === "expired"
        ? "gate.lead.ended"
        : status === "incomplete"
          ? "gate.lead.incomplete"
          : stale
            ? "gate.lead.stale"
            : "gate.lead.default";

  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-access-gate={status} data-checkout-return={checkout ? (checkout.paid ? "paid" : "unpaid") : undefined}>
      <div className="flex items-start gap-4">
        <span className="bg-honey-soft text-honey-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">KIDDO</p>
          <h1 id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
            {t(headline)}
          </h1>
          <p className="text-ink-700 text-base leading-snug">{t(lead)}</p>
          {checkout?.paid === false && status !== "past_due" && (
            <p className="text-ink-500 text-sm" role="status" data-checkout-cancelled>
              {t("gate.cancelledNote")}
            </p>
          )}
        </div>
      </div>

      {status === "past_due" ? (
        <div className="flex flex-col gap-3">
          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-access-error>
            {error ? t(error) : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void manage()} aria-busy={busy === "portal"} icon={<ArrowRight className="size-5" aria-hidden />} iconRight data-billing-manage>
              {t(busy === "portal" ? "common.oneMoment" : "gate.updatePayment")}
            </Button>
            <Button variant="quiet" onClick={() => void signOut()}>
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void buy();
          }}
          className="flex flex-col gap-4"
        >
          <div className="bg-paper border-ink-900 rounded-card flex flex-col gap-1 border-2 p-4 shadow-soft sm:p-5" data-access-offer>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-semibold sm:text-xl">{t("offer.name")}</span>
              <span className="bg-honey-soft text-honey-ink rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
                {t("offer.note")}
              </span>
            </span>
            <span className="text-ink-700 text-base">
              <s className="text-ink-500 line-through" data-access-was aria-hidden>
                {ORIGINAL_PRICE}
              </s>
              <span className="sr-only">{t("offer.was", { price: ORIGINAL_PRICE })}</span>{" "}
              <span className="text-ink-900 font-semibold" data-access-price>
                {LIFETIME_PRICE}
              </span>{" "}
              / {t("offer.per")}
            </span>
            <span className="text-ink-700 text-base leading-snug">{t("offer.blurb")}</span>
          </div>

          <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-access-error>
            {error ? t(error) : ""}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" size="lg" aria-busy={busy === "checkout"} icon={<ArrowRight className="size-5" aria-hidden />} iconRight data-access-start>
              {t(busy === "checkout" ? "common.oneMoment" : "offer.cta", { price: LIFETIME_PRICE })}
            </Button>
            <p className="text-ink-500 text-sm">{t("gate.footnote")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {sub?.stripeCustomerId && (
              <button type="button" onClick={() => void manage()} className="text-ink-900 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-billing-manage>
                {t("gate.billingHistory")}
              </button>
            )}
            <button type="button" onClick={() => void signOut()} className="text-ink-700 -my-3 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4" data-gate-signout>
              {t("common.signOut")}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

/** How long "confirming" is shown before admitting the answer is late. */
export const CONFIRM_WAIT_MS = 45_000;
