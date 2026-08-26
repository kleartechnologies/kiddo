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
  "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com/recaptcha/",
  "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/",
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
