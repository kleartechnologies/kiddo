/**
 * The Meta pixel: which build has one, and which pages may carry it.
 *
 * KIDDO is two products on one domain. `/`, `/join`, `/welcome`, `/privacy`
 * and `/parents` are addressed to a parent — they are what an advertisement
 * would land on, and measuring them is the ordinary business of selling a
 * subscription. `/play` and `/worlds` are addressed to a four-year-old, and
 * nothing on them is anybody's to measure: the whole privacy page rests on
 * a child's screens contacting nothing, and Meta's own terms would not have
 * it either. So the pixel is decided by an allow list, not a block list. A
 * route added tomorrow carries no pixel until someone comes here and names
 * it, which is the direction an accident should fall in.
 *
 * The id is read from the environment rather than written here, so a local
 * or preview build measures nothing and only the production site reports.
 * It is also *checked* rather than trusted: it is interpolated into an
 * inline `<script>` on a page whose CSP allows inline script, so an id of
 * the wrong shape would be an injection point with the environment as its
 * author. Digits only, and a build with anything else has no pixel at all.
 *
 * Set `NEXT_PUBLIC_META_PIXEL_ID` on Netlify (Site configuration →
 * Environment variables). See `docs/SECURITY.md` §3 and §5.
 */

import { JOIN, LANDING, PARENTS, PRIVACY, WELCOME } from "@/lib/routes";

/**
 * The pixel's own queue, defined by the loader in `MetaPixel` before
 * `fbevents.js` has finished downloading, and there for as long as the
 * document lives. Optional because most documents never define it at all: a
 * child's screen has no pixel, and neither has a build without an id. Every
 * caller checks, and treats its absence as a quiet no rather than an error.
 */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** A Meta dataset id is a decimal number, and long. Nothing else is one. */
const PIXEL_ID = /^[0-9]{8,20}$/;

/** The configured id, or `null` for a build that must not report anything. */
export function pixelId(value: string | undefined): string | null {
  const id = value?.trim() ?? "";
  return PIXEL_ID.test(id) ? id : null;
}

/** This build's pixel. `null` everywhere the variable is unset or malformed. */
export const META_PIXEL_ID = pixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);

/** The pages addressed to a parent. Everything else is a child's screen. */
const PARENT_PAGES: readonly string[] = [LANDING, JOIN, WELCOME, PRIVACY, PARENTS];

/**
 * Is this path one of the parent's own pages?
 *
 * `/parents/reset` and anything else under the parent area counts; `/play`,
 * `/worlds/...`, the reference screens and an unknown path do not.
 */
export function isParentPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  /* A trailing slash is the same door. `/` is left alone. */
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") || LANDING : pathname;
  return PARENT_PAGES.includes(path) || path.startsWith(`${PARENTS}/`);
}
