# KIDDO — launch readiness (Phase 7)

Last reviewed: 24 August 2026 (Phase 8A deployment audit). This is the honest state of KIDDO as a product
a parent could discover, trust and come back to. It lists what is done, what
is deliberately not done, and what a real launch still needs.

## The front of KIDDO

| Route       | Audience | Indexed | Notes                                                      |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `/`         | Parents  | yes     | Landing page, ending in pricing. Built from the real worlds, doors and rounds |
| `/privacy`  | Parents  | yes     | What KIDDO stores, verified against the code               |
| `/parents`  | Parents  | yes     | Dashboard; footnote links to `/privacy`                    |
| `/join`     | Parents  | **no**  | Plan → account → Stripe Checkout (step 1 of 2)             |
| `/welcome`  | Parents  | **no**  | Post-payment welcome and the child's name (step 2 of 2)    |
| `/play`     | Children | yes     | KIDDO World (moved from `/`); PWA `start_url`              |
| `/worlds/*` | Children | yes     | Worlds and activities, unchanged                           |
| `/play/*`   | Children | yes     | Standalone games, unchanged                                |
| `/playground/*`, `/character` | Internal | **no** | `robots: noindex` on every page + `robots.txt` disallow |

Navigation is one deliberate link in each direction. The landing page's own
call to action is `Start KIDDO` → `#pricing` on the same page, and only
choosing a plan leaves it: `#pricing` → Start Yearly / Start Monthly →
`/join?plan=…` → Stripe → `/welcome` → Enter KIDDO → `/play`. A parent who
already has an account uses `Sign in` in the header → `/parents`. Then
`/play` → For grown-ups → `/parents`; `/parents` → Open KIDDO → `/play`;
`/parents` → What KIDDO stores → `/privacy`; `/privacy` and `/` share the
same header (wordmark → `/`, For parents, Pricing, Privacy, Sign in).
Route strings live in `src/lib/routes.ts`.

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
      landing → CTA → pricing → `/play` → Let's go → activity → full round →
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
- [ ] **Malay copy: native-speaker review.** KIDDO ships in English and Bahasa
      Melayu, and the Malay was written carefully but not natively. Every
      string exists and every test passes; that proves coverage, not fluency.
      `docs/kiddo-malay-review.md` is the reviewer's worklist, ordered by risk
      — the baby-animals wording first, then the fourteen sentences where the
      Malay deliberately does not mirror the English, then the 86 lesson names.
      One item in it is a product decision rather than a translation one: the
      Malay baby-animal question gives its answer away for ten of twelve
      animals, because Malay names a baby as *anak* + the grown-up.

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
      `subscription` field, `stripeEvents` and `joinEvents`).

### Phase 8D — the way in: landing → pricing → account → payment (26 Aug 2026)

KIDDO is no longer opened and entered; it is subscribed to. The landing
page states the problem (an hour on YouTube), the alternative, what is
inside, and then the two plans; `Start KIDDO` scrolls to pricing rather
than opening a signup modal. Choosing a plan leads to `/join` (account,
with password confirmation) and straight on to Stripe Checkout, then to
`/welcome` — "Welcome to KIDDO! 🎉", the child's name, `Enter KIDDO`. The
prior `/parents` road is unchanged and still works for returning parents.

No new backend: the same session store, the same `/api/billing/*` routes,
the same signed webhook, the same rules. What is new is `joinEvents` — two
fields, `at` and `plan`, written by the webhook on a real subscription
becoming active — and `GET /api/social/recent`, which is the only source
of the landing page's "another family joined" notices. Nothing generates
one; with no Firebase Admin the answer is an empty list and the page shows
no notices at all. See `docs/kiddo-billing.md`.

- [ ] Verify on the real project that a test-mode purchase produces exactly
      one `joinEvents` document and one notice (manual step 7 in
      `docs/kiddo-billing.md`).

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
npm run test:rules                   # Firestore rules, needs Java
```

The browser measurements drive a *production* server on port 4310, and that
server has two shapes. `npm start` is not one of them — start the right one
with the scripts below, which build it and check it is what they claim.

```bash
npm run measure:serve                # account-free build (no Firebase keys)
npm run measure:language             # both languages, end to end
npm run measure:landing
npm run measure:join
npm run measure:account
npm run measure:parents
npm run measure:journey
npm run measure:match-quest
npm run measure:quest-magic
```

```bash
npm run measure:serve:dev            # the same, plus KIDDO_DEV_PAGES=1
npm run measure:worlds               # these drive /playground/*, which only
npm run measure:visual               # exists in a dev-pages build and is
npm run measure:magic                # never served by a deployed KIDDO
npm run measure:magic-wired
npm run measure:order
npm run measure:match
npm run measure:mixed
npm run measure                      # viewports
```

The account-free build is a shipped product mode, not a test rig: without
`NEXT_PUBLIC_FIREBASE_API_KEY` and `…_APP_ID` KIDDO runs device-only, and
`src/lib/cloud/preview.ts` gives the account screens a pretend backend the
device opts into with `localStorage["kiddo.preview.cloud"] = "1"`. No
measurement lowers a gate, opens a route or signs in with a real account —
`scripts/measure-mode.mjs` refuses to run against the wrong server instead.

```bash
node scripts/make-brand-assets.mjs   # regenerate icons / OG / landing shots
```

Brand assets are generated from the running product, so regenerate them
whenever the mascot rig, world scenes or dashboard change.
