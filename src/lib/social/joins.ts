import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

/**
 * "A new KIDDO family just joined" — and nothing more than that.
 *
 * KIDDO shows a small notice on the landing page when another family buys
 * it. Every one of them is a real Billplz bill that really settled; there is
 * no generator, no sample data and no way for this module to invent an
 * event, because it only ever formats events it is handed and the only thing
 * that writes them is the server, on the same transaction that grants access
 * (`src/server/entitlement.ts`).
 *
 * A join event carries one fact and no second: when it happened. No uid, no
 * email, no name, no country, no city, no amount, no count of how many
 * families there are. That is deliberate: a notice must never let a stranger
 * learn something about a parent, and the cheapest way to guarantee that is
 * for the private facts never to leave the server in the first place.
 *
 * Rows written while KIDDO was a subscription also carry `plan`. It is
 * dropped on the way in rather than carried around: with one price there is
 * no plan to name, and an event that holds one fact cannot leak a second.
 */

export interface JoinEvent {
  /** Unix ms, from the moment the server granted lifetime access. */
  at: number;
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
  return { at: r.at };
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
 * The sentence for one event, in the reader's language. It says only what
 * the event proves: a family joined. No names, no places, no numbers, and
 * — now that KIDDO is sold once — no plan.
 *
 * The wording alternates on the event's own timestamp rather than at random,
 * so the same event reads the same way on a reload and two notices in a row
 * are not identical sentences.
 */
export function noticeFor(event: JoinEvent, locale: Locale = DEFAULT_LOCALE): string {
  return translate(locale, event.at % 2 === 0 ? "social.join.joined" : "social.join.started");
}
