import type { NextConfig } from "next";

/**
 * What a KIDDO page is allowed to load, and from where.
 *
 * Written from what KIDDO actually uses, not from a template. The whole
 * product is served from its own origin: `next/font/google` downloads
 * Fredoka and Nunito at build time and self-hosts them, the artwork and
 * the audio clips are files in `public/`, and there is no analytics tag,
 * no CDN script and no embed anywhere in `src/`. So `default-src 'self'`
 * is not a wish here — it is a description.
 *
 * The named hosts are the ones Firebase's own SDK talks to from the
 * browser: Identity Toolkit and Secure Token for sign-in, Firestore for
 * the parent's children and journeys, Installations and App Check for
 * attestation, and reCAPTCHA for the App Check challenge itself. Stripe
 * is not among them because KIDDO never loads Stripe.js: Checkout and the
 * Customer Portal are full-page redirects to Stripe's own site, which the
 * page's policy does not govern. `form-action 'self'` is therefore safe.
 *
 * Two of the hosts are there for "Continue with Google" and for nothing
 * else, and both are worth naming plainly rather than passing over:
 *
 *   `script-src https://apis.google.com` — `signInWithPopup` loads
 *   Google's `gapi.iframes` to talk to the window it opened. That is
 *   third-party script running inside KIDDO's own origin, which is a real
 *   widening; it is Google's own, on the same page that is already
 *   trusting Google with the sign-in itself, and there is no version of
 *   Firebase popup sign-in that does without it.
 *
 *   `frame-src` names two hosts, and they are one iframe at two addresses:
 *   the hidden `/__/auth/iframe` that the popup posts its answer back
 *   through, which Firebase serves on the project's `authDomain` (see
 *   `src/lib/firebase/config.ts`). `auth.kiddocares.com` is a Firebase
 *   Hosting custom domain on this same project, and Hosting serves the
 *   `/__/auth/*` helpers on every domain attached to a site — naming it is
 *   what lets `authDomain` move there, which is the whole point: Google's
 *   account chooser shows the host it is sending the parent back to, and a
 *   parent halfway through buying KIDDO should not be asked to trust
 *   `kiddocares-b105e.firebaseapp.com`. The firebaseapp.com host stays
 *   named beside it so a build whose `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is
 *   unset — or one rolled back to it — is not a build whose sign-in popup
 *   is silently blocked. Both are written out in full rather than
 *   wildcarded, so a different Firebase project would be refused rather
 *   than quietly allowed; `tests/abuse.test.ts` holds the spellings in step.
 *
 * A popup and not `signInWithRedirect`, which would need no `frame-src` at
 * all. That was forced while the handler sat on firebaseapp.com: KIDDO is
 * served from kiddocares.com, and browsers that partition third-party
 * storage — Safari and Chrome both — lose a redirect's state on the way
 * back and drop the parent on the sign-in page having apparently done
 * nothing. A handler on `auth.kiddocares.com` is same-site with KIDDO and
 * would not have that problem, but changing how every parent signs in is
 * not part of moving the domain. The popup stays.
 *
 * `script-src` keeps `'unsafe-inline'`, and that is a real weakening worth
 * stating plainly rather than hiding. Next.js streams a page's data through
 * inline `<script>` tags; the alternative is a per-request nonce, which
 * (see `next/dist/docs/01-app/02-guides/content-security-policy.md`)
 * requires every page to be dynamically rendered — KIDDO's landing page
 * would stop being static HTML the CDN can serve. What that directive would
 * buy is protection against injected script, and KIDDO has no injection
 * point to protect: no `dangerouslySetInnerHTML`, no `eval`, no HTML from
 * anyone but React, all of which `tests/abuse.test.ts` holds in place. The
 * rest of the policy still does its work regardless — `object-src 'none'`,
 * `base-uri 'self'` and a closed `connect-src` mean that even injected
 * script would have nowhere to send anything. See docs/SECURITY.md.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com/recaptcha/",
  "frame-src https://auth.kiddocares.com https://kiddocares-b105e.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/",
  "upgrade-insecure-requests",
].join("; ");

/**
 * `CSP_REPORT_ONLY=true` reports violations instead of blocking, for
 * checking a policy change against a real browser before it can break a
 * parent's sign-in. It is not a production setting: unset, the policy is
 * enforced.
 */
const cspHeader =
  process.env.CSP_REPORT_ONLY === "true"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

const securityHeaders = [
  { key: cspHeader, value: csp },
  /* No sniffing: a file KIDDO serves as JSON is read as JSON. */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* Belt and braces with `frame-ancestors` above, for older browsers. */
  { key: "X-Frame-Options", value: "DENY" },
  /* Referrers stay inside KIDDO in full and leave it as an origin only. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* KIDDO asks for none of these, so nothing on the page may either. */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  },
  /* Two years, subdomains included, and ready to preload. Ignored over
     plain http, so local development is unaffected. */
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * The reference screens — `/playground/*` and `/character` — are internal
 * tooling, and `robots.txt` is a request, not a boundary. Their page files
 * are named `page.dev.tsx`, which only counts as a page when this list says
 * so, so an ordinary build has no such route and ships none of their code:
 * the batch and mixed playgrounds alone pull the whole content registry in.
 *
 * They are not deleted, because eleven `scripts/measure-*.mjs` drive them
 * against a *production* server. Build with `KIDDO_DEV_PAGES=1` to get them
 * back for a measuring run; Netlify builds without it. See docs/SECURITY.md.
 */
const pageExtensions = process.env.KIDDO_DEV_PAGES === "1"
  ? ["dev.tsx", "tsx", "ts"]
  : ["tsx", "ts"];

const nextConfig: NextConfig = {
  pageExtensions,

  /* Nothing gains from announcing the framework and its version. */
  poweredByHeader: false,

  /* The measurement scripts (`scripts/measure-*.mjs`) drive a headless Chrome
     at `http://127.0.0.1:4310`, and this Next.js blocks dev-only assets for
     any origin other than the one the server booted with (`localhost`) — the
     page then serves but never hydrates, which a script sees as a strip whose
     chips do nothing. Same machine, same interface; only the spelling of the
     host differs. Development-only setting; production ignores it. */
  allowedDevOrigins: ["127.0.0.1"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
