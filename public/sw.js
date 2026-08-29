/**
 * KIDDO's service worker.
 *
 * It stores nothing. That is the whole design, and it is worth saying first
 * because a service worker that caches is the usual thing and is the wrong
 * thing here. KIDDO's pages are prerendered HTML served from a CDN, its
 * JavaScript is content-hashed, and its games read a parent's subscription
 * and a child's journey out of Firestore — so a cache would buy a second
 * saved on a warm load and pay for it with a child looking at yesterday's
 * shelf, or a parent whose renewed subscription is still refused by a copy
 * of the app from last week. There is no Cache Storage entry, no precache
 * list and no version to bust. The privacy page can go on saying that KIDDO
 * keeps four small things on the device, because this file adds none.
 *
 * What it is for, then, is two things:
 *
 *   1. **Installability.** Chromium wants a registered worker with a `fetch`
 *      handler before it will offer to install a site. That is the whole of
 *      the requirement, and the handler below is the whole of the answer.
 *
 *   2. **The offline page.** Once KIDDO is on a home screen it has no
 *      address bar, no reload button and no back button, so a child who taps
 *      the icon on a train shows their parent the browser's own error page
 *      inside what looks like an app. The handler answers a failed
 *      navigation with the small KIDDO-coloured page at the bottom of this
 *      file instead — a string in this file, not a cached response, so it
 *      cannot go stale either.
 *
 * Only whole-page navigations are intercepted. Next's client-side routing
 * fetches data rather than documents, so a child moving between the shelf and
 * a game never touches this file; neither do the fonts, the artwork, the
 * audio, Firebase or Stripe.
 */

/**
 * Take over immediately rather than waiting for every KIDDO tab to close.
 *
 * Safe precisely because nothing is cached: the usual reason to let an old
 * worker finish is that the pages it is serving expect its cache, and there
 * is no cache here. A parent who is handed a fixed version of this file gets
 * it on the next load rather than the next day.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      /* Without this, every full page load waits for the worker to boot
         before the request even starts. Preload lets the browser fetch the
         page in parallel and hand the response over, so having a service
         worker at all costs KIDDO nothing on a good connection. */
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /* Everything that is not a person opening a page is none of this worker's
     business, and is left to the browser exactly as if no worker existed. */
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch {
        return offlinePage();
      }
    })(),
  );
});

/**
 * The one page this worker can answer on its own.
 *
 * Bahasa Melayu, because that is the language KIDDO opens in (see
 * `src/lib/i18n/locale.ts`) and because a worker has no way to read the
 * language a parent chose — the preference lives in `localStorage`, which is
 * not reachable from here. One sentence, one instruction, no button: there is
 * nothing to press when there is no network, and a "try again" that cannot
 * work is worse than none.
 *
 * No image and no font file: both would have to be cached to survive being
 * offline, and this worker caches nothing. Colours and the rounded face are
 * KIDDO's own tokens, written out because `globals.css` is not reachable
 * either.
 */
function offlinePage() {
  const html = `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fff7ec">
<title>KIDDO</title>
<style>
  :root { color-scheme: light; }
  html, body { height: 100%; margin: 0; }
  body {
    display: grid;
    place-items: center;
    padding: max(2rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
             max(2rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
    background: #faf5ec;
    color: #2c2620;
    font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif;
    text-align: center;
  }
  main { max-width: 22rem; }
  h1 { margin: 0 0 0.75rem; font-size: 1.75rem; font-weight: 600; letter-spacing: -0.01em; }
  p { margin: 0; font-size: 1.0625rem; line-height: 1.5; color: #4f453c; }
  .mark {
    display: block;
    margin: 0 auto 1.25rem;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 1.5rem;
    background: #86be7c;
  }
</style>
</head>
<body>
  <main>
    <span class="mark" aria-hidden="true"></span>
    <h1>KIDDO perlukan internet</h1>
    <p>Sambungan terputus buat sementara. Sambung semula WiFi atau data, kemudian buka KIDDO sekali lagi.</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      /* This document is served by the worker, so it carries no header from
         `next.config.ts`. It has no script, no image and no third party in
         it, and the policy below says exactly that. */
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
