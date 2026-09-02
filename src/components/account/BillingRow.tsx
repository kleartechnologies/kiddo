"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { accessKind, accessLabel, describeAccess, hasAccess, money } from "@/lib/billing/access";
import { openBillingPortal, useSession } from "@/lib/cloud/session";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useTranslation } from "@/lib/i18n/useLocale";

import { useCheckoutReturn } from "./checkoutReturn";

/**
 * What this family has, in one line: KIDDO, bought once, and when.
 *
 * There is nothing to manage — no card on file, no renewal, no cancellation
 * — so for almost every parent this row is a receipt rather than a control
 * panel. "Manage subscription" appears only for the parents who subscribed
 * before KIDDO was sold once, and it opens Stripe's own Customer Portal, so
 * KIDDO never draws a card form and never has to be told about a
 * cancellation twice.
 */
export function BillingRow() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [now] = useState(() => Date.now());
  const { locale, t } = useTranslation();
  const id = useId();
  const entitlement = session.entitlement;
  if (!entitlement || !session.user) return null;

  const access = entitlement.access;
  const sub = entitlement.subscription;
  const kind = accessKind(entitlement, now);

  async function manage() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await openBillingPortal("/parents");
    if (failure) {
      setBusy(false);
      setError(failure === "offline" ? "auth.error.offline" : "gate.error.portal");
    }
  }

  return (
    <Card as="section" aria-labelledby={`${id}-billing`} className="flex flex-col gap-4" data-billing-row={kind}>
      {checkout?.paid && (
        <p className="bg-sage-soft text-sage-ink rounded-tile px-4 py-3 text-base font-semibold" role="status" data-checkout-confirmed>
          {t("billing.confirmed")}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={`${id}-billing`} className="font-display text-lg font-semibold sm:text-xl">
            {t("billing.title")}
          </h2>
          <p className="text-ink-700 flex flex-wrap items-center gap-2 text-base" data-billing-offer={kind}>
            <CreditCard className="size-4 shrink-0" aria-hidden />
            {access.lifetime
              ? t("billing.offerLine", {
                  name: t("offer.name"),
                  /* What was actually paid, when the server recorded it. */
                  price: money(access.amount ?? 0),
                })
              : t("access.label.legacy")}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
                hasAccess(entitlement, now) ? "bg-sage-soft text-sage-ink" : "bg-apricot-soft text-apricot-ink"
              }`}
              data-billing-status={kind}
            >
              {accessLabel(entitlement, now, locale)}
            </span>
          </p>
          <p className="text-ink-500 text-sm" data-billing-line>
            {describeAccess(entitlement, now, locale)}
          </p>
          <p aria-live="polite" className="text-apricot-ink min-h-5 text-sm font-semibold" data-billing-error>
            {error ? t(error) : ""}
          </p>
        </div>
        {/* Only the parents who subscribed before KIDDO was sold once have a
            Stripe customer, and only they have anything to manage. */}
        {sub.stripeCustomerId && (
          <Button variant="soft" size="sm" icon={<ExternalLink className="size-5" aria-hidden />} iconRight onClick={() => void manage()} aria-busy={busy} className="min-h-12" data-billing-manage>
            {t(busy ? "common.oneMoment" : "billing.manage")}
          </Button>
        )}
      </div>
    </Card>
  );
}
