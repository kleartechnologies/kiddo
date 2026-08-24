"use client";

import { ParentDashboard } from "@/components/parents/ParentDashboard";
import { retrySession, sessionHasAccess, signOut, useSession } from "@/lib/cloud/session";
import { Button } from "@/components/ui/Button";

import { AccountRow } from "./AccountRow";
import { AuthCard } from "./AuthCard";
import { BillingRow } from "./BillingRow";
import { ChildOnboarding } from "./ChildOnboarding";
import { SubscriptionGate } from "./SubscriptionGate";

/**
 * Which parent area to show.
 *
 *  - `unavailable` (no Firebase on this build): the device-only dashboard,
 *    exactly as before accounts existed.
 *  - `signed-out`: sign in / create account. Progress already on this
 *    device is kept and carried into the account afterwards.
 *  - `needs-subscription`, or any signed-in state whose subscription no
 *    longer opens KIDDO: the subscription gate, before the child.
 *  - `needs-child`: the one onboarding question.
 *  - `trouble`: the account could not be read; try again or sign out.
 *  - `ready`: the same dashboard, now reading the cloud journey, with the
 *    account card underneath.
 *  - `loading` / `signed-in`: a quiet line, never a spinner screen.
 */
export function ParentGate() {
  const session = useSession();

  /* The gate comes first for everyone signed in: a parent whose payment
     failed sees it from the dashboard too, with their child and journey
     still safe behind it. */
  if (session.user && session.subscription && !sessionHasAccess(session) && session.status !== "trouble" && session.status !== "signed-in") {
    return (
      <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:gap-8 sm:py-8" data-parent-gate="needs-subscription">
        <SubscriptionGate />
      </main>
    );
  }

  switch (session.status) {
    case "unavailable":
      return <ParentDashboard />;
    case "signed-out":
      return (
        <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:gap-8 sm:py-8" data-parent-gate="signed-out">
          <AuthCard />
          <p className="text-ink-500 text-sm leading-snug">
            Anything your child has already played on this device is kept, and joins your account the first time you sign in here.
          </p>
        </main>
      );
    case "needs-child":
      return (
        <main className="flex flex-1 flex-col gap-6 py-6 select-text sm:gap-8 sm:py-8" data-parent-gate="needs-child">
          <ChildOnboarding />
        </main>
      );
    case "trouble":
      return (
        <main className="flex flex-1 flex-col gap-4 py-6 select-text sm:py-8" data-parent-gate="trouble">
          <p className="text-ink-900 text-base leading-snug" role="status">
            We couldn&apos;t reach your account just now. Check your connection and try again.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={retrySession} data-session-retry>
              Try again
            </Button>
            <Button variant="quiet" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </main>
      );
    case "ready":
      return (
        <ParentDashboard>
          <div className="flex flex-col gap-4" data-parent-gate="ready">
            <BillingRow />
            <AccountRow />
          </div>
        </ParentDashboard>
      );
    default:
      return (
        <main className="flex flex-1 flex-col py-6 sm:py-8" data-parent-gate={session.status} aria-busy>
          <p className="text-ink-500 text-base">Opening the parent area…</p>
        </main>
      );
  }
}
