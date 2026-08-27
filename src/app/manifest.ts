import type { MetadataRoute } from "next";

import { DEFAULT_LOCALE, LOCALE_HTML_LANG } from "@/lib/i18n/locale";
import { KIDDO_HOME } from "@/lib/routes";

/**
 * The install manifest.
 *
 * Installing KIDDO puts the *child's* KIDDO on the home screen: `start_url`
 * is `/play`, not the parent landing page, because the person tapping the
 * icon is four. Colours are the product's own tokens — the cream paper
 * behind every screen — so the splash and the title bar look like the app.
 *
 * Display is `standalone`: no browser chrome, but the system status bar
 * stays, which is what a parent expects from an app and what keeps the
 * clock visible. There is no service worker on purpose: KIDDO is
 * installable, not offline. See `docs/kiddo-launch-readiness.md`.
 *
 * The name and description are in KIDDO's default language, because a manifest
 * is one static file with one language and that language is the product's.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIDDO — Main. Belajar. Ketawa.",
    short_name: "KIDDO",
    description:
      "Dunia permainan kecil untuk pembelajaran awal. Anak mengira di taman, membantu haiwan pulang dan meneroka perkataan di dalam buku cerita.",
    id: KIDDO_HOME,
    start_url: KIDDO_HOME,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf5ec",
    theme_color: "#fff7ec",
    lang: LOCALE_HTML_LANG[DEFAULT_LOCALE],
    categories: ["education", "kids", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
