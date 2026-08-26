"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { planText, describeSubscription, hasAccess, statusLabel } from "@/lib/billing/subscription";
import { openBillingPortal, useSession } from "@/lib/cloud/session";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useTranslation } from "@/lib/i18n/useLocale";

import { useCheckoutReturn } from "./checkoutReturn";

/**
 * Billing, in one line and one button: which plan, monthly or yearly,
 * what state it is in, and what happens next (renews / ends, and when) —
 * all from the server's copy of the subscription. Everything a parent
 * might want to *change* — card, cancel, invoices — happens in Stripe's
 * own Customer Portal behind "Manage subscription", so KIDDO never draws a
 * card form and never has to be told about a cancellation twice.
 */
export function BillingRow() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [now] = useState(() => Date.now());
  const { locale, t } = useTranslation();
  const id = useId();
  const sub = session.subscription;
  if (!sub || !session.user) return null;

  const plan = sub.plan ? planText(sub.plan, locale) : null;

  async function manage() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await openBillingPortal("/parents");
    if (failure) {
      setBusy(false);
      setError(failure === "offline" ? "auth.error.offline" : "sub.error.portal");
    }
  }

  return (
    <Card as="section" aria-labelledby={`${id}-billing`} className="flex flex-col gap-4" data-billing-row={sub.status}>
      {checkout === "success" && (
        <p className="bg-sage-soft text-sage-ink rounded-tile px-4 py-3 text-base font-semibold" role="status" data-checkout-confirmed>
          {t("billing.confirmed")}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={`${id}-billing`} className="font-display text-lg font-semibold sm:text-xl">
            {t("billing.title")}
          </h2>
          <p className="text-ink-700 flex flex-wrap items-center gap-2 text-base" data-billing-plan={sub.plan ?? "unknown"}>
            <CreditCard className="size-4 shrink-0" aria-hidden />
            {plan
              ? t("billing.planLine", { name: plan.name, price: plan.price, per: plan.per })
              : t("billing.unknownPlan")}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
                hasAccess(sub, now) ? "bg-sage-soft text-sage-ink" : "bg-apricot-soft text-apricot-ink"
              }`}
              data-billing-status={sub.status}
            >
              {statusLabel(sub, now, locale)}
            </span>
          </p>
          <p className="text-ink-500 text-sm" data-billing-line>
            {describeSubscription(sub, now, locale)}
          </p>
          <p aria-live="polite" className="text-apricot-ink min-h-5 text-sm font-semibold" data-billing-error>
            {error ? t(error) : ""}
          </p>
        </div>
        {sub.stripeCustomerId && (
          <Button variant="soft" size="sm" icon={<ExternalLink className="size-5" aria-hidden />} iconRight onClick={() => void manage()} aria-busy={busy} className="min-h-12" data-billing-manage>
            {t(busy ? "common.oneMoment" : "billing.manage")}
          </Button>
        )}
      </div>
    </Card>
  );
}
