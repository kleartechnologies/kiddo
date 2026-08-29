"use client";

import { useEffect } from "react";

/* Imported for its side effect as much as for the reset: loading the store is
   what puts the `beforeinstallprompt` listener on the window, and that event
   is fired once, early, long before the parent area hydrates. The import has
   to be at the root for the same reason the listener is at module scope —
   see the note in `lib/pwa/useInstall`. */
import "@/lib/pwa/useInstall";

/**
 * The two lines of plumbing that make KIDDO installable.
 *
 * Renders nothing and is mounted once in the root layout, beside
 * `CloudSession` and `MetaPixel`. It exists because both of its jobs are
 * whole-document jobs that no page owns:
 *
 *   - **registering the worker.** Chromium will not offer to install a site
 *     without one (see `public/sw.js`, which caches nothing and exists for
 *     that reason and for the offline page).
 *   - **being early.** Importing the install store from the root layout is
 *     the earliest KIDDO code runs, which is what lets the store catch the
 *     install event rather than find out it was fired.
 *
 * Registration is deliberately deferred to an effect rather than run during
 * render: a service worker competing for the network with the page that is
 * still painting is a slower first screen for no gain, and this one has
 * nothing useful to do until the page is up.
 *
 * A failure here is not an error a family should ever hear about. A worker
 * can be refused for reasons that have nothing to do with KIDDO — an
 * enterprise policy, private browsing on some builds, an insecure origin
 * during local development over a LAN address — and every one of them means
 * exactly one thing: no install button on this device, which is what §10
 * asks for anyway. So the rejection is swallowed, silently and on purpose;
 * there is no `console.warn`, because the only person who would read it is
 * a parent who opened the developer tools by accident.
 */
export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", {
        /* The whole product, so a child in a game is inside the installed
           app's scope rather than being handed back to the browser. */
        scope: "/",
        /* Never let the worker script itself be answered from the HTTP
           cache: an old worker that cannot be replaced is the one way this
           file could become a bug a family cannot clear. */
        updateViaCache: "none",
      })
      .catch(() => {
        /* Nothing to do and nobody to tell. See the note above. */
      });
  }, []);

  return null;
}
