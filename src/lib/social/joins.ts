import { isPlan, type Plan } from "@/lib/billing/subscription";

/**
 * "A new KIDDO family just joined" — and nothing more than that.
 *
 * KIDDO shows a small notice on the landing page when another family
 * subscribes. Every one of them is a real Stripe subscription that really
 * became active; there is no generator, no sample data and no way for this
 * module to invent an event, because it only ever formats events it is
 * handed and the only thing that writes them is the Stripe webhook
 * (`src/server/billing.ts`).
 *
 * A join event carries two facts and no third: when it happened, and which
 * of the two plans it was. No uid, no email, no name, no country, no city,
 * no amount, no count of how many families there are. That is deliberate:
 * a notice must never let a stranger learn something about a parent, and
 * the cheapest way to guarantee that is for the private facts never to
 * leave the server in the first place.
 */

export interface JoinEvent {
  /** Unix ms, from the Stripe event that made the subscription active. */
  at: number;
  /** Which plan, when it was one KIDDO recognises. */
  plan: Plan | null;
}

/** Nothing older than this is worth mentioning; a notice must be news. */
export const JOIN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** How many notices one visit may see, however busy KIDDO has been. */
export const MAX_JOIN_NOTICES = 4;

/** Read an event back from Firestore (or a fetch) without trusting it. */
export function parseJoinEvent(raw: unknown): JoinEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.at !== "number" || !Number.isFinite(r.at) || r.at <= 0) return null;
  return { at: r.at, plan: isPlan(r.plan) ? r.plan : null };
}

/**
 * The events worth showing: real, recent, newest first, and no more than a
 * handful. An event dated in the future is dropped rather than trusted —
 * a clock that is wrong must not produce a notice that cannot be true.
 */
export function recentJoins(events: readonly JoinEvent[], now: number): JoinEvent[] {
  return events
    .filter((event) => event.at <= now && now - event.at <= JOIN_WINDOW_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_JOIN_NOTICES);
}

/**
 * The sentence for one event. Each says only what the event proves: a
 * family joined, and — when KIDDO knows which — on which plan. No names,
 * no places, no numbers.
 */
export function noticeFor(event: JoinEvent): string {
  switch (event.plan) {
    case "yearly":
      return "🚀 A family just chose the Yearly plan";
    case "monthly":
      return "🎉 A new KIDDO family just joined";
    default:
      return "✨ Another family started their KIDDO journey";
  }
}
