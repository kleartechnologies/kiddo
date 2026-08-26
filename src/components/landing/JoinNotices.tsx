"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useLocale } from "@/lib/i18n/useLocale";
import { springSoft } from "@/lib/motion";
import {
  noticeFor,
  parseJoinEvent,
  recentJoins,
  type JoinEvent,
} from "@/lib/social/joins";

/**
 * The little notice in the corner: another family joined KIDDO.
 *
 * Every notice here is a real subscription that really became active,
 * fetched from `/api/social/recent`, which reads what the Stripe webhook
 * wrote. There is no sample event, no timer that invents one and no count
 * to inflate: if the server returns nothing — a quiet week, a build with no
 * billing configured, a request that failed — this component renders null
 * and the page simply does not have notices on it.
 *
 * What a notice may say is decided in `@/lib/social/joins`, and it is
 * deliberately almost nothing: a family joined, and sometimes which plan.
 * A stranger reading it learns that KIDDO is being bought, which is true,
 * and nothing whatsoever about the family who bought it.
 *
 * It shows each event once and then stops for good. A ticker that never
 * ran out would be a pressure tactic; this is a small, finite piece of good
 * news, and it never covers the page or takes a tap to get rid of.
 */

/** A beat after the page settles, so the first thing read is the page. */
const FIRST_DELAY_MS = 6_000;
/** How long one notice stays. */
const VISIBLE_MS = 5_500;
/** The quiet between two notices. */
const GAP_MS = 9_000;

export function JoinNotices() {
  const locale = useLocale();
  const [events, setEvents] = useState<JoinEvent[]>([]);
  const [index, setIndex] = useState(-1);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    const stop = new AbortController();
    fetch("/api/social/recent", { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const raw = (body as { events?: unknown })?.events;
        if (!Array.isArray(raw)) return;
        const parsed = raw.map(parseJoinEvent).filter((e): e is JoinEvent => e !== null);
        setEvents(recentJoins(parsed, Date.now()));
      })
      .catch(() => {
        /* No notices is the correct answer to a failed request. */
      });
    return () => stop.abort();
  }, []);

  /* One timer chain: wait, show, hide, wait, show… until the events run out. */
  useEffect(() => {
    if (events.length === 0) return;
    const next = index + 1;
    if (next >= events.length) return;
    const wait = index < 0 ? FIRST_DELAY_MS : GAP_MS;
    const appear = setTimeout(() => {
      setIndex(next);
      setShowing(true);
    }, wait);
    return () => clearTimeout(appear);
  }, [events, index]);

  useEffect(() => {
    if (!showing) return;
    const hide = setTimeout(() => setShowing(false), VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [showing, index]);

  if (events.length === 0) return null;
  const event = index >= 0 ? events[index] : null;

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-start sm:right-auto sm:left-6 sm:bottom-6"
      data-join-notices={events.length}
    >
      <AnimatePresence>
        {showing && event && (
          <motion.p
            key={event.at}
            /* `initial` is what the server would write, and it is the same
               for everyone; reduced motion is handled by MotionConfig, not
               by branching here (see lib/motion). */
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={springSoft}
            role="status"
            aria-live="polite"
            className="bg-paper border-edge text-ink-900 max-w-xs rounded-full border px-4 py-3 text-sm font-semibold shadow-lift sm:text-base"
            data-join-notice
          >
            {noticeFor(event, locale)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
