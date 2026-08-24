import type { MetadataRoute } from "next";

/**
 * What search engines may read.
 *
 * The landing page, the privacy page and the worlds are public. The
 * playground and the character sheet are internal reference screens — each
 * already carries `robots: noindex`, and this keeps crawlers from fetching
 * them at all. No sitemap is declared until the production domain is known
 * (a sitemap needs absolute URLs; see `metadataBase` in `app/layout.tsx`).
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
