/**
 * The public shape of KIDDO, in one place.
 *
 * Phase 7 put a parent-facing landing page at `/` and moved the child's home
 * to `/play`. Every "back to KIDDO" link, the install manifest's start URL
 * and the measurement scripts all mean the same door, so it is named once.
 */

/** Where a child lives. The installed app opens here. */
export const KIDDO_HOME = "/play";

/** The public landing page a parent discovers first. */
export const LANDING = "/";

/** The parent side: the dashboard, name and reset. */
export const PARENTS = "/parents";

/** What KIDDO stores, in plain words. */
export const PRIVACY = "/privacy";

/** The pricing section on the landing page, where "Start KIDDO" leads. */
export const PRICING = "/#pricing";

/** Choosing a plan, then creating (or signing into) the parent's account. */
export const JOIN = "/join";

/** Where Stripe sends a parent back after a successful Checkout. */
export const WELCOME = "/welcome";

/** `/join` for one plan: the choice made on the landing page, carried on. */
export function joinWithPlan(plan: "monthly" | "yearly"): string {
  return `${JOIN}?plan=${plan}`;
}
