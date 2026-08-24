"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLANS, describeSubscription } from "@/lib/billing/subscription";
import { openBillingPortal, useSession } from "@/lib/cloud/session";

import { useCheckoutReturn } from "./checkoutReturn";

/**
 * Billing, in one line and one button. The plan and what happens next
 * (renews / ends, and when) come from the server's copy of the
 * subscription; everything a parent might want to *change* — card,
 * cancel, invoices — happens in Stripe's own portal, so KIDDO never draws
 * a card form.
 */
export function BillingRow() {
  const session = useSession();
  const checkout = useCheckoutReturn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const id = useId();
  const sub = session.subscription;
  if (!sub || !session.user) return null;

  const plan = sub.plan ? PLANS[sub.plan] : null;

  async function manage() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await openBillingPortal("/parents");
    if (failure) {
      setBusy(false);
      setError(
        failure === "offline"
          ? "KIDDO can’t reach the internet right now. Check the connection and try again."
          : "KIDDO couldn’t open billing just now. Please try again.",
      );
    }
  }

  return (
    <Card as="section" aria-labelledby={`${id}-billing`} className="flex flex-col gap-4" data-billing-row={sub.status}>
      {checkout === "success" && (
        <p className="bg-sage-soft text-sage-ink rounded-tile px-4 py-3 text-base font-semibold" role="status" data-checkout-confirmed>
          You’re all set — KIDDO is open for your child.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={`${id}-billing`} className="font-display text-lg font-semibold sm:text-xl">
            Your subscription
          </h2>
          <p className="text-ink-700 flex items-center gap-2 text-base" data-billing-plan={sub.plan ?? "unknown"}>
            <CreditCard className="size-4 shrink-0" aria-hidden />
            {plan ? `${plan.name} · ${plan.price}/${plan.per}` : "KIDDO subscription"}
          </p>
          <p className="text-ink-500 text-sm" data-billing-line>
            {describeSubscription(sub, now)}
          </p>
          <p aria-live="polite" className="text-apricot-ink min-h-5 text-sm font-semibold" data-billing-error>
            {error ?? ""}
          </p>
        </div>
        {sub.stripeCustomerId && (
          <Button variant="soft" size="sm" icon={<ExternalLink className="size-5" aria-hidden />} iconRight onClick={() => void manage()} aria-busy={busy} className="min-h-12" data-billing-manage>
            {busy ? "One moment…" : "Manage subscription"}
          </Button>
        )}
      </div>
    </Card>
  );
}
