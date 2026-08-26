import type { MetadataRoute } from "next";

/**
 * What search engines may read.
 *
 * The landing page, the privacy page and the worlds are public. The
 * playground and the character sheet are not in a production build at all —
 * their files are `page.dev.tsx` and `next.config.ts` only counts those as
 * pages when `KIDDO_DEV_PAGES=1`. They stay listed here for the builds that
 * do have them, and because a disallow line costs nothing; it was never the
 * thing keeping them private. No sitemap is declared until the production
 * domain is known (a sitemap needs absolute URLs; see `metadataBase` in
 * `app/layout.tsx`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/playground", "/playground/", "/character"],
    },
  };
}
