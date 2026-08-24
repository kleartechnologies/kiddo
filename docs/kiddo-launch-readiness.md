# KIDDO — launch readiness (Phase 7)

Last reviewed: 24 August 2026 (Phase 8A deployment audit). This is the honest state of KIDDO as a product
a parent could discover, trust and come back to. It lists what is done, what
is deliberately not done, and what a real launch still needs.

## The front of KIDDO

| Route       | Audience | Indexed | Notes                                                      |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `/`         | Parents  | yes     | Landing page. Built from the real worlds, doors and rounds |
| `/privacy`  | Parents  | yes     | What KIDDO stores, verified against the code               |
| `/parents`  | Parents  | yes     | Dashboard; footnote links to `/privacy`                    |
| `/play`     | Children | yes     | KIDDO World (moved from `/`); PWA `start_url`              |
| `/worlds/*` | Children | yes     | Worlds and activities, unchanged                           |
| `/play/*`   | Children | yes     | Standalone games, unchanged                                |
| `/playground/*`, `/character` | Internal | **no** | `robots: noindex` on every page + `robots.txt` disallow |

Navigation is one deliberate link in each direction: landing → Open KIDDO /
Start the adventure → `/play`; `/play` → For grown-ups → `/parents`;
`/parents` → Open KIDDO → `/play`; `/parents` → What KIDDO stores → `/privacy`;
`/privacy` and `/` share the same header (wordmark → `/`, For parents, Privacy,
Open KIDDO). Route strings live in `src/lib/routes.ts`.

## Checklist

### Done in Phase 7

- [x] Public landing page at `/` (hero, three worlds with real in-round
      screenshots, how it works, progression with real `WorldDoor`s, parent
      section with the real dashboard, closing call, footer)
- [x] Child home preserved, unchanged, at `/play`; every internal link,
      back link, celebration exit and 404 updated
- [x] `/privacy` written from the code: three `localStorage` keys, one
      `sessionStorage` seed, no cookies, no third-party requests, fonts
      self-hosted via `next/font`
- [x] Parent dashboard footnote links to `/privacy`
- [x] Web app manifest (`src/app/manifest.ts`): name, short name, description,
      `start_url`/`id` `/play`, standalone, theme `#fff7ec`, background
      `#fbf8f3`, 192/512 icons + maskable icon, categories, `lang`
- [x] Favicon (`icon.svg`), Apple touch icon, Open Graph / Twitter image —
      all photographed from the real KIDDO mascot and world scenes
      (`scripts/make-brand-assets.mjs`, source sheet at `/playground/brand`)
- [x] Page titles, descriptions, OG/Twitter tags, `theme-color`
- [x] `robots.txt` (allow all, disallow `/playground`, `/character`)
- [x] Reduced motion respected on the landing page (`MotionConfig
      reducedMotion="user"`; no looping decorative animation)
- [x] Every link/button ≥ 48 px on `/`, `/privacy`, `/parents`
- [x] One `h1` per page, headings in order, alt text on every image,
      decorative art `aria-hidden`
- [x] Responsive at 360×640, 390×844, 430×932, 768×1024, 1024×768,
      1280×800, 1440×900 — no horizontal scroll
- [x] No new dependencies, no video, no animation libraries, all landing
      images ≤ 65 KB webp
- [x] `npm run measure:landing` added (layout, targets, honesty, navigation,
      reduced motion, console)

### Phase 8A deployment audit (24 Aug 2026)

- [x] Every public route returns 200; `/playground/*` and `/character` carry
      `noindex, nofollow` and are in `robots.txt`; nothing in the customer
      journey links to them
- [x] `NEXT_PUBLIC_SITE_URL` wiring proven with a throwaway build: with it set,
      `<link rel="canonical">` appears on `/` and `/privacy` and `og:image` /
      `twitter:image` become absolute on every page. Without it they stay
      relative / fall back to `localhost:3000` (Next's default) — so it is a
      **must-configure**, not a code change
- [x] `viewport-fit=cover` added so `Screen`'s `env(safe-area-inset-*)`
      padding is non-zero on notched phones once KIDDO is installed
- [x] Smoke test at 360×640, 390×844, 430×932, 768×1024, 1440×900:
      landing → CTA → `/play` → Let's go → activity → full round →
      celebration → world (doors done/next/new) → `/play` → parents
      (dashboard reflects the round) → privacy → landing. No console output,
      no sideways scroll, no failed requests, fonts loaded
- [x] No `console.*` in product code, no secrets, no `localhost` assumptions,
      no debug UI; `.env*.local` now git-ignored
- [ ] Image optimisation (`/_next/image`) needs a host that runs the Next
      image optimiser (Vercel / `next start`). A static export would need
      `images.unoptimized` — decide with the host

### Open TODO(launch) items — need a human decision

- [ ] **Production domain.** Set `NEXT_PUBLIC_SITE_URL` in the hosting
      environment. Until then `metadataBase` is unset, so `og:image` /
      `twitter:image` resolve to localhost in the built HTML and no canonical
      is emitted (`src/app/layout.tsx`, `src/app/page.tsx`). No sitemap is
      generated for the same reason.
- [ ] **Contact and responsible party** on `/privacy`: a support email and the
      name of the company or person responsible.
- [ ] **Hosting provider and server-log retention** on `/privacy`
      (depends on where KIDDO is deployed).
- [ ] **Legal review.** `/privacy` says plainly that it has not been legally
      reviewed and makes no COPPA / GDPR-K compliance claim. That sentence
      should only be removed after a real review.
- [ ] Deployment target, HTTPS, and a real production build smoke test on a
      physical iPhone/iPad and Android phone (installed-app mode included).

### Phase 8B — parent accounts + cloud journey sync (24 Aug 2026)

Done; see `docs/kiddo-accounts.md`. Firebase project `kiddocares-b105e`,
email/password auth, Firestore `users` / `children` / `journeys`, rules in
`firestore.rules` (emulator-tested). Device-only mode remains the fallback
when `NEXT_PUBLIC_FIREBASE_*` are unset.

- [ ] Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` on
      Netlify (values from the Firebase console → Web app).
- [ ] Enable the Email/Password provider in Firebase Authentication.
- [ ] `firebase login --reauth && firebase deploy --only firestore:rules`.
- [ ] Add the production domain to Firebase Auth → Authorized domains.
- [ ] State the Firestore region on `/privacy` (TODO(launch) marker added).
- [ ] Smoke-test sign-up → onboarding → play → second device against the
      real project (not possible here: CLI credentials expired).

### Phase 8C — subscription + Stripe + account completion (24 Aug 2026)

Done; see `docs/kiddo-billing.md`. Two plans (RM9.90/month, RM59.90/year),
Stripe Checkout + Customer Portal + signed webhook, server-owned
`users/{uid}.subscription`, `/play` and `/worlds` closed without an active
subscription, password reset, email verification, server-side account
deletion that cancels Stripe first. Landing copy no longer says "Free to
try"; `/privacy` describes Stripe and billing data.

- [ ] Set `FIREBASE_SERVICE_ACCOUNT`, `STRIPE_SECRET_KEY`,
      `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`
      on Netlify (server-only; never `NEXT_PUBLIC_`).
- [ ] Create the product and two prices in Stripe; register the webhook
      endpoint `/api/billing/webhook`; enable the Customer Portal.
- [ ] Set the Firebase Auth email action URL to `https://<site>/parents/reset`.
- [ ] Run the manual Stripe test-mode steps in `docs/kiddo-billing.md`
      (not possible here: no credentials). No real payment has been made.
- [ ] `firebase deploy --only firestore:rules` (rules changed again: the
      `subscription` field and `stripeEvents` collection).

### NOT YET IMPLEMENTED

These are deliberately absent. Nothing on the landing page or privacy page
claims or hints that they exist.

- **Production analytics** — none; no first- or third-party events.
- **Customer support system** — no contact form, help centre or email yet
  (see the TODO above).
- **Service worker / offline** — the manifest makes KIDDO installable, but
  it needs a network connection. No offline infrastructure existed, so none
  was added.
- **Multiple child profiles** — one child per parent account (the model
  allows more; the UI does not).

## How to verify

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
npm start -- -p 4310
npm run measure:landing
npm run measure:parents
npm run measure:journey -- --quick
npm run measure:worlds -- --quick
npm run measure:quest-magic -- --quick
npm run measure:account
npm run measure:quest-magic -- --quick
node scripts/make-brand-assets.mjs   # regenerate icons / OG / landing shots
```

Brand assets are generated from the running product, so regenerate them
whenever the mascot rig, world scenes or dashboard change.
