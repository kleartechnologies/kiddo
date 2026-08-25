import type { MetadataRoute } from "next";

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
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIDDO — Play. Learn. Smile.",
    short_name: "KIDDO",
    description:
      "Playful little worlds for early learning. Children count in a garden, help animals home and discover words in a storybook.",
    id: KIDDO_HOME,
    start_url: KIDDO_HOME,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf5ec",
    theme_color: "#fff7ec",
    lang: "en",
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
