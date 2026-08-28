"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { isParentPage, META_PIXEL_ID } from "@/lib/analytics/meta";

/**
 * Meta's pixel, on the parent's pages only.
 *
 * Three departures from the snippet Meta hands out, each deliberate:
 *
 *   The tag is mounted from the root layout but renders nothing at all
 *   unless `isParentPage` says the current route is one a parent reads.
 *   A child's screen never loads `fbevents.js`, never sets `_fbp`, and
 *   never sends a request to Facebook — see `src/lib/analytics/meta.ts`.
 *
 *   `autoConfig` is turned off before `init`. Left on, the pixel reads
 *   button text and form fields on the page it sits on and reports what it
 *   finds; `/join` and `/parents` are pages where a parent types an email
 *   address and a password. KIDDO sends page views and nothing else, and
 *   the privacy page says so in those words.
 *
 *   `disablePushState` is set, and the snippet's `PageView` moved out of
 *   the inline script and into the effect below. Left alone, `fbevents.js`
 *   hooks `history.pushState` and reports a page view for every route Next
 *   moves to — which, once a parent has opened the landing page, includes
 *   `/play` and every screen beyond it. Unmounting the tag does not undo
 *   that: the library is in the document for as long as the document
 *   lives. So the pixel is told to report nothing on its own, and every
 *   page view KIDDO sends is one the effect below decided to send.
 *   `scripts/check-meta-pixel.mjs` is what caught this, and is what keeps
 *   catching it. `next/script` executes an inline script from its own
 *   effect, and a child's effects run before its parent's, so `window.fbq`
 *   — the queue the snippet defines up front, before `fbevents.js` has
 *   finished downloading — is always there by the time the effect asks.
 *
 * The page view is all this file sends. The two conversion events — a
 * checkout started, and a purchase the server confirmed — are in
 * `src/lib/analytics/events.ts`, sent from the moments they describe.
 *
 * There is no `<noscript>` beacon. Meta's snippet carries one for readers
 * with JavaScript turned off; KIDDO is a React app that such a browser
 * cannot open at all, and React would create the image for everyone else
 * on a client navigation and double-count the page view.
 */

/* Meta's loader, verbatim, minus its `PageView`. The id is interpolated
   into script source, which is only safe because `pixelId()` has already
   refused anything that is not a plain number. */
const LOADER = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState = true;
fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
fbq('init', '${META_PIXEL_ID}');`;

export function MetaPixel() {
  const pathname = usePathname();
  const measured = META_PIXEL_ID !== null && isParentPage(pathname);

  /* The last path reported, so a navigation counts once. Child screens are
     recorded here too without being reported, so that stepping out to
     `/play` and back to `/` is a second view of the landing page and not a
     silence. */
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === pathname) return;
    reported.current = pathname;
    /* `trackSingle` and not `track`: with the pixel's own page-view
       reporting turned off, a second `track("PageView")` in the same
       document is swallowed as a duplicate, and every page a parent opens
       after the first would go uncounted. Naming the pixel is also what
       keeps this honest if a second one is ever added to the page. */
    if (measured) window.fbq?.("trackSingle", META_PIXEL_ID, "PageView");
  }, [measured, pathname]);

  if (!measured) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {LOADER}
    </Script>
  );
}
