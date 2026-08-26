# KIDDO subscription, Stripe and account completion (Phase 8C)

KIDDO is a paid subscription. A parent pays; the child gets all of KIDDO.
There is no free tier, no trial, no locked game, no child-facing money of
any kind. Two plans, both defined once in `src/lib/billing/subscription.ts`
and charged by Stripe:

| plan | Stripe price | shown as |
| --- | --- | --- |
| `yearly` | `STRIPE_PRICE_YEARLY` | Yearly · RM59.90/year · "⭐ Best value" (listed first, preselected) |
| `monthly` | `STRIPE_PRICE_MONTHLY` | Monthly · RM9.90/month |

Every figure a parent reads comes from one table, `AMOUNTS` in
`src/lib/billing/subscription.ts`, in sen the way Stripe holds them
(`{ monthly: 990, yearly: 5990 }`). `money()` formats it, `YEARLY_PER_MONTH`
and `YEARLY_SAVING_PERCENT` are computed from it, and a test scans `src/`
to fail the build if any other file prints an amount. Changing a price is
editing that table and the two Stripe prices — nothing else. (`AMOUNTS` is
what KIDDO *says*; Stripe is what it *charges*. They are set by hand to
agree, and step 1 of the manual checklist below is where that is checked.)

## Architecture: Stripe is the billing authority, Firebase is identity and data

```
landing ─▶ /#pricing ─▶ /join?plan=… ─ Firebase Auth ─▶ POST /api/billing/checkout ─▶ Stripe Checkout
                                                                                        │
   /play opens ◀─ /welcome ◀─ users/{uid}.subscription ◀─ POST /api/billing/webhook ◀────┘
                                       └─▶ joinEvents/{sub} ─▶ GET /api/social/recent ─▶ landing notice
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
src/lib/social/joins.ts            pure model: a join event, the recent window, the sentence for one
src/app/api/social/recent          GET → {events:[{at,plan}]}         (no auth; nothing private in it)
src/lib/cloud/session.ts           session store now carries `subscription`; `needs-subscription` status
src/components/landing/Pricing.tsx            the two plans on the landing page; CTAs to /join
src/components/landing/JoinNotices.tsx        the corner notice, from /api/social/recent only
src/components/account/JoinGate.tsx           /join — account, then Checkout, for the chosen plan
src/components/account/WelcomeGate.tsx        /welcome — "Welcome to KIDDO! 🎉" once access is real
src/components/account/SubscriptionGate.tsx   the plan chooser and every non-active state
src/components/account/BillingRow.tsx         plan, status, renewal/end date, "Manage subscription"
src/components/account/PlayGate.tsx           wraps /play and /worlds: open only with access
src/components/account/ResetPassword.tsx      /parents/reset — password reset + email verification links
src/lib/cloud/preview.ts           a pretend cloud for browser measurement (no credentials)
firestore.rules                    `subscription` is server-owned; `stripeEvents` and `joinEvents` are server-only
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

## The way in

KIDDO is not opened and entered; it is subscribed to. The landing page's
only call to action is `Start KIDDO`, which is an anchor to `#pricing` on
the same page — a parent reads the problem, the alternative and what is
inside before anything asks them for anything. No modal opens on arrival.

**The main road (a new parent).**

`/` → `#pricing` → `Start Yearly` / `Start Monthly` → `/join?plan=…`
(step 1 of 2: email, password, confirm password) → Stripe Checkout →
`/welcome?checkout=success` (step 2 of 2) → *confirming* → webhook writes
`active` → "Welcome to KIDDO! 🎉 / Your KIDDO adventure starts here." +
the child's name → `Enter KIDDO` → `/play`.

The plan travels in the query string and can still be changed on `/join`;
the *price* never travels — the server reads it from Stripe by price id.
Once the account exists, Checkout starts by itself, but only for a parent
who signed up or signed in during this visit: arriving already signed in
gives a button instead, because nothing they just did asked to be charged.
An unknown `?plan=` falls back to yearly.

**The second door (a parent who already has an account).** `Sign in` in
the header → `/parents`, which is unchanged:

`/parents` → sign in / create account → **subscription gate** (before the
child's name is asked) → choose plan → `Start KIDDO` → Stripe Checkout →
`/parents?checkout=success` → *confirming* → webhook writes `active` →
onboarding → dashboard (billing card says "You're all set") → `/play` opens.

Both roads run through the same session store, the same checkout route and
the same webhook; `/join` and `/welcome` are two screens over the existing
machinery, not a second flow. `/welcome` is `noindex`, and so is `/join`.

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
5. On the transition *into* `active` (and only then), `recordJoin` creates
   `joinEvents/{stripeSubscriptionId}` = `{ at, plan }`. Keyed by the
   subscription id, so one subscription is one join however many times
   Stripe says so; created, never set, so a renewal cannot re-announce it;
   and it never fails the webhook — a notice is not worth a retry.

## Social proof: only purchases that happened

The landing page shows a small notice in the corner — "🎉 A new KIDDO
family just joined", "🚀 A family just chose the Yearly plan" — a few
seconds apart, each event once, then never again for that visit. There is
no ticker, no counter and no dismiss button.

It cannot be fabricated, by construction rather than by policy:

- The only writer is `recordJoin`, called by the webhook on a real
  Stripe subscription becoming active. No generator, no sample data, no
  seed script — a test scans the three modules for one.
- The document holds two fields, `at` and `plan`. No uid, email, name,
  city, country, amount or count, so no notice can leak one. The private
  half of the purchase is not in the collection to begin with.
- `joinEvents` is `allow read, write: if false` — closed to every client,
  signed in or not. The browser reads `GET /api/social/recent`, which
  answers with an empty list when Firebase Admin is unconfigured or
  Firestore fails. An empty list renders nothing at all.
- Events older than 14 days are dropped, at most 4 are shown, and an event
  dated in the future is discarded rather than trusted.

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
- `npm test` → `tests/social.test.ts` (the join model, the window, the
  privacy of every sentence, and the structural proof: one writer, no
  generator, closed rules, empty list renders nothing).
- `npm run test:rules` → the client cannot write `subscription`; nobody
  can touch `stripeEvents` or `joinEvents`.
- `npm run measure:landing` → the landing CTA leads to `#pricing`, both
  plan CTAs lead to `/join?plan=…`, yearly is the first of exactly two
  plans and carries the only best-value badge, and the saving it claims is
  arithmetic on the two prices printed beside it.
- `npm run measure:join` → a real browser walks the new road on the pretend
  cloud: signed out (`/join` charges nothing, `/welcome` points home, `/play`
  closed with no money words and no sign-out), plan → account → Checkout
  starting by itself → confirming → "Welcome to KIDDO! 🎉" → the child's
  name → `Enter KIDDO` → `/play`; log out from the parent area; a parent
  who is already signed in gets a button rather than a charge; a subscriber
  is told there is nothing to pay; access follows the subscription; eight
  viewports, reduced motion, console.
- `npm run measure:account` → a real browser walks the whole flow on the
  pretend cloud (`localStorage["kiddo.preview.cloud"]="1"`): signed-out,
  closed child pages, gate, cancelled return, monthly and yearly checkout,
  confirming → onboarding → dashboard, portal, past_due, cancel at period
  end, reset, verification, eight viewports, reduced motion, console.

## Manual Stripe test-mode steps (need credentials; not done here)

1. Stripe dashboard (test mode) → Products → one product "KIDDO" with two
   recurring prices matching `AMOUNTS`: RM9.90/month and RM59.90/year.
   Copy the `price_…` ids into `STRIPE_PRICE_MONTHLY` /
   `STRIPE_PRICE_YEARLY`. If a price ever changes, change it in both
   places — Stripe charges, `AMOUNTS` is what the pricing page says.
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
7. Repeat with a second parent, from the landing page this time: `Start
   KIDDO` → `Start Yearly` → `/join` → pay → `/welcome`. Check
   `users/{uid}.subscription`
   in Firestore: `status: active`, correct `plan`, `currentPeriodEnd`, and
   `joinEvents/{sub_…}` = `{at, plan}` — then reload `/` and wait a few
   seconds for the notice that purchase produced.
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
