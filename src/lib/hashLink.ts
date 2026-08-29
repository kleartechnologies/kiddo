import type { MouseEvent } from "react";

/**
 * Make a link to `/#section` work every time, not just the first.
 *
 * A browser — and Next's router — treats a click on a hash link whose hash
 * is already in the address bar as "nowhere to go" and does nothing. On the
 * landing page that is a real failure: a parent taps "Mulakan KIDDO", reads
 * the plans, scrolls back down to the FAQ, taps the sticky bar's button —
 * and the second tap is dead, because the URL has said `#pricing` since the
 * first one. A button that works only once reads as a broken page.
 *
 * So the landing CTAs handle their own click when the target section is on
 * the current page: scroll to it (smoothly, unless the OS asks for reduced
 * motion — the global CSS override cannot reach a scroll started from
 * script) and record the hash the way a native anchor would have. When the
 * target is not here — the same constants are linked from `/join` and
 * `/welcome` — the event is left alone and the Link navigates, which
 * scrolls on arrival like any fresh visit.
 *
 * Modified clicks (new tab, new window) are also left alone; they open a
 * fresh page, where the hash still works once, which is all it needs.
 */
export function followHashLink(event: MouseEvent, id: string): void {
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const target = document.getElementById(id);
  if (!target) return;

  event.preventDefault();
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  window.history.pushState(null, "", `#${id}`);
}
