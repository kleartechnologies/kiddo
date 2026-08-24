# KIDDO subscription, Stripe and account completion (Phase 8C)

KIDDO is a paid subscription. A parent pays; the child gets all of KIDDO.
There is no free tier, no trial, no locked game, no child-facing money of
any kind. Two plans, both defined once in `src/lib/billing/subscription.ts`
and priced in Stripe, never in code:

| plan | Stripe price | shown as |
| --- | --- | --- |
| `yearly` | `STRIPE_PRICE_YEARLY` | Annual · RM59.90/year · "Best value" (listed first, preselected) |
| `monthly` | `STRIPE_PRICE_MONTHLY` | Monthly · RM9.90/month |

## Architecture: Stripe is the billing authority, Firebase is identity and data

```
parent ─ Firebase Auth ─▶ users/{uid} ─▶ POST /api/billing/checkout ─▶ Stripe Checkout
                                                                          │
      child opens /play ◀─ users/{uid}.subscription ◀─ POST /api/billing/webhook ◀─┘
```

```
src/lib/billing/subscription.ts    pure model: plans, states, hasAccess(), stateFromStripe()
src/server/firebaseAdmin.ts        Admin SDK (server-only): verify ID tokens, Firestore, delete users
src/server/stripe.ts               Stripe client + env (server-only)
src/server/billing.ts              customerFor, applySubscription (transaction), claimEvent (idempotency)
src/server/http.ts                 json/problem helpers, requireCaller, safePath, siteUrl
src/app/api/billing/checkout       POST {plan, returnTo} → {url}      (Bearer Firebase ID token)
src/app/api/billing/portal         POST {returnTo} → {url}            (Bearer Firebase ID token)
src/app/api/billing/webhook        POST raw Stripe event              (Stripe-Signature)
src/app/api/account/delete         POST → {deleted:true}              (Bearer, sign-in < 5 min old)
src/lib/cloud/session.ts           session store now carries `subscription`; `needs-subscription` status
src/components/account/SubscriptionGate.tsx   the plan chooser and every non-active state
src/components/account/BillingRow.tsx         plan, status, renewal/end date, "Manage subscription"
src/components/account/PlayGate.tsx           wraps /play and /worlds: open only with access
src/components/account/ResetPassword.tsx      /parents/reset — password reset + email verification links
src/lib/cloud/preview.ts           a pretend cloud for browser measurement (no credentials)
firestore.rules                    `subscription` is server-owned; `stripeEvents` is server-only
```

The browser is never trusted to decide whether a parent has paid:

- The only thing the client reads is `users/{uid}.subscription`, and the
  rules forbid it from writing that field (or any field except `email`
  and `updatedAt`). The client cannot create a user document with a
  `subscription` key either.
- Only the webhook handler writes `subscription`, through the Admin SDK,
  after `stripe.webhooks.constructEvent` has verified the signature.
- `?checkout=success` on the return URL shows a *confirming* screen and
  nothing else; access arrives only when the Firestore listener sees a
  server-written `active`. The query parameter is stripped from the
  address immediately, so a reload or a shared link cannot replay it.
- Checkout and Portal URLs are minted server-side from the caller's
  verified Firebase ID token; the customer id comes from the server-side
  user document, never from the request body. A parent cannot open another
  parent's portal.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT`
  are read only under `src/server/` and `src/app/api/`, every `src/server`
  module imports `server-only`, and a test (`tests/billing.test.ts`)
  scans `src/` to fail the build if any of them is referenced elsewhere or
  under a `NEXT_PUBLIC_` name.

## Subscription states

`users/{uid}.subscription` = `{ status, plan, currentPeriodEnd, cancelAtPeriodEnd, stripeCustomerId, stripeSubscriptionId, eventCreated, updatedAt }`.

| status | from Stripe | opens KIDDO? | parent sees |
| --- | --- | --- | --- |
| `none` | no subscription yet | no | the plan chooser |
| `incomplete` | `incomplete` (first payment not finished) | no | "Your payment is still being confirmed" + retry |
| `active` | `active`, `trialing` | **yes** | billing card; `cancelAtPeriodEnd` → "Cancelled. KIDDO stays open until <date>" |
| `past_due` | `past_due` | no | "A payment didn't go through" + "Update payment details" (portal) |
| `cancelled` | `canceled` | no | "Welcome back to KIDDO" + plan chooser |
| `expired` | `unpaid`, `incomplete_expired`, `paused`, anything unknown | no | same as cancelled |

`hasAccess()` is the single decision: `status === "active"` and
`now ≤ currentPeriodEnd + 24 h`. The 24-hour grace covers the window
between a period ending and Stripe's renewal webhook landing; after that a
stuck "active" stops opening KIDDO on its own. Transitional states
(`confirming` while waiting for the webhook, `stale` after 45 s) live only
in the gate component, never in the data.

A child already on an open page is never interrupted: `PlayGate` opens
once per page lifetime and stays open. The next *fresh* visit while not
active shows the child "Ask a grown-up to open KIDDO!" with a door to the
parent area — no prices, no errors, no billing words.

## Checkout flow

`/parents` → sign in / create account → **subscription gate** (before the
child's name is asked) → choose plan → `Start KIDDO` → Stripe Checkout →
`/parents?checkout=success` → *confirming* → webhook writes `active` →
onboarding → dashboard (billing card says "You're all set") → `/play` opens.

- `checkout` already-subscribed: if Stripe has a live subscription
  (`active`/`trialing`/`past_due`) for the customer the route answers
  `409 already-subscribed` — no duplicate subscriptions even if the
  Firestore copy lags.
- `?checkout=cancelled`: the gate with a calm note, no error.
- A declined card stays inside Stripe Checkout (Stripe shows the error);
  if the parent gives up, they come back through the cancel URL.
- Webhook delay: "We're confirming your KIDDO access" for up to 45 s,
  then "This is taking longer than usual … please don't pay twice", with
  the Firestore listener still waiting. Nothing is polled; the listener
  fires the moment the server writes.
- `returnTo` is validated (`safePath`: must begin with `/`, not `//`).

## Webhook (`/api/billing/webhook`)

Handled: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`. Other
types are acknowledged with `200 {ignored}` so Stripe stops retrying.

1. Raw body + `Stripe-Signature` → `constructEvent` (400 on missing,
   forged, wrong-secret, tampered or stale signatures).
2. `claimEvent(event.id)` creates `stripeEvents/{id}`; if it already
   exists the event is a retry → `200 {duplicate:true}`. The claim is
   released on failure so Stripe's retry can succeed.
3. The parent is identified from `client_reference_id`, then session
   metadata `uid`, then subscription metadata `uid`, then customer
   metadata `uid` (all set by the checkout route, never by the browser).
4. `applySubscription` runs a Firestore transaction that ignores events
   older than the one already applied (`eventCreated`), so out-of-order
   delivery cannot resurrect a cancelled state.

## Password reset and email verification

Firebase Auth does the work; KIDDO provides the screens. Set the
**action URL** for both templates in Firebase console → Authentication →
Templates to `https://<site>/parents/reset` (`actionReturnUrl()` also
passes `continueUrl` = `/parents`). The page handles
`?mode=resetPassword|verifyEmail&oobCode=…` with explicit states:
checking · reset form · done (reset) · done (verified) · bad link (used,
expired, malformed, or no code) · offline · unavailable. Forgot-password
sends the same sentence whether or not the address has an account.

Verification is a parent-side nicety: the account card shows "Resend" /
"I've verified" while `emailVerified` is false. It does not gate anything.

## Account deletion

`POST /api/account/delete` (requires a sign-in less than 5 minutes old,
same bar as Firebase's `deleteUser`): cancel every non-cancelled Stripe
subscription on the customer → delete the Stripe customer → delete
journeys and children by `parentId`, then `users/{uid}` → delete the auth
user. The client then signs out and clears the device cache. If the server
is not configured (503) the client falls back to the Phase 8B path
(journey → child → user → auth user), which is only reachable on a
deployment that has Firebase but no Stripe, where no subscription can
exist. Stripe keeps invoice history as required by its own rules; KIDDO
makes no retention promise.

## Environment (server-only)

See `.env.example`: `FIREBASE_SERVICE_ACCOUNT`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.
Without them the routes answer `503 billing-not-configured`; signed-in
parents see the gate with "Billing isn't set up on this site yet" and
nobody gets through it.

## Tests and measurements

- `npm test` → `tests/billing.test.ts` (model, every state, gate ordering,
  both plans, cancelled/failed checkout, portal, reset, verification,
  deletion ordering, webhook signatures, idempotency, 503 without
  credentials, secret-leak scan, child-screen word scan) alongside the
  untouched journey/cloud suites.
- `npm run test:rules` → the client cannot write `subscription`; nobody
  can touch `stripeEvents`.
- `npm run measure:account` → a real browser walks the whole flow on the
  pretend cloud (`localStorage["kiddo.preview.cloud"]="1"`): signed-out,
  closed child pages, gate, cancelled return, monthly and yearly checkout,
  confirming → onboarding → dashboard, portal, past_due, cancel at period
  end, reset, verification, eight viewports, reduced motion, console.

## Manual Stripe test-mode steps (need credentials; not done here)

1. Stripe dashboard (test mode) → Products → one product "KIDDO" with two
   recurring prices: RM9.90/month and RM59.90/year. Copy the `price_…` ids
   into `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`.
2. Developers → API keys → `STRIPE_SECRET_KEY=sk_test_…`.
3. Settings → Billing → Customer portal: enable cancel + update payment
   method; save.
4. Locally: `stripe listen --forward-to localhost:3000/api/billing/webhook`
   → `STRIPE_WEBHOOK_SECRET=whsec_…`. On Netlify: Developers → Webhooks →
   add endpoint `https://<site>/api/billing/webhook` with the four events
   above → signing secret.
5. `FIREBASE_SERVICE_ACCOUNT` from Firebase console → Service accounts.
6. Sign up on `/parents`, choose Monthly, pay with `4242 4242 4242 4242`
   → expect *confirming* → onboarding within a few seconds; `/play` opens.
7. Repeat with a second parent and Annual. Check `users/{uid}.subscription`
   in Firestore: `status: active`, correct `plan`, `currentPeriodEnd`.
8. Use `4000 0000 0000 0341` (attach succeeds, payment fails) and then
   `stripe trigger invoice.payment_failed` / move the clock in a test
   clock to reach `past_due` → the parent area shows "A payment didn't go
   through"; "Update payment details" opens the portal.
9. Cancel in the portal → billing line "Cancelled. KIDDO stays open until
   <date>"; after the period, status `cancelled` → the gate.
10. Press Back in Checkout → `?checkout=cancelled` → calm note.
11. `stripe events resend <evt_id>` → webhook answers `{duplicate:true}`;
    Firestore unchanged.
12. Delete the account → Stripe shows the subscription cancelled and the
    customer deleted; Firestore and Auth have no trace.
