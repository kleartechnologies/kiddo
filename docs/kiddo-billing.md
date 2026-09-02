# KIDDO lifetime access, Billplz and account completion

KIDDO is bought once. A parent pays **RM29.90** — the launch price, shown
beside the struck-through original RM39.90 — and KIDDO is theirs — for
that child, that account, for good. There is no free tier, no trial, no
locked game, no child-facing money of any kind, and — since the move off
Stripe — no subscription, no monthly plan, no yearly plan, no renewal date
and nothing to cancel.

One price, defined once, in sen:

```ts
// src/lib/billing/access.ts
export const LIFETIME_AMOUNT = 2990;              // RM29.90, what is charged
export const LIFETIME_PRICE = money(LIFETIME_AMOUNT);
export const ORIGINAL_AMOUNT = 3990;              // RM39.90, struck through, never billed
export const ORIGINAL_PRICE = money(ORIGINAL_AMOUNT);
```

Every figure a parent reads comes from that constant. `money()` formats it,
the landing page, the join page, the gate and the receipt all read
`LIFETIME_PRICE`, the server puts `LIFETIME_AMOUNT` on the bill, and a test
scans `src/` to fail the build if any other file prints a ringgit amount.
Changing the price is editing that one integer. Nothing about money ever
travels from the browser: the amount is never in a request body, never in a
query string, and never something a client could suggest.

## Architecture: Billplz is the payment authority, Firebase is identity and data

```
landing ─▶ /#pricing ─▶ /join ─ Firebase Auth ─▶ POST /api/billing/billplz/create ─▶ Billplz bill URL
                                                          │                              │
                                              billplzBills/{billId}                      │
                                              {uid, amount, settled:false}               │
                                                                                    parent pays
                                                                                         │
      ┌──────────────────── POST /api/billing/billplz/callback ◀───── server-side callback
      │                              (X-Signature, then GET v3/bills/{id})
      │
      ├─▶ users/{uid}.access {lifetime:true, …}  ─▶ /play opens
      └─▶ joinEvents/{billId} ─▶ GET /api/social/recent ─▶ landing notice

           /welcome?billplz[id]=…&billplz[paid]=true   (the browser's own leg)
                     └─▶ POST /api/billing/billplz/confirm ─▶ same GET v3/bills/{id}
```

The two legs are independent and either may arrive first. The callback is
the authority; `confirm` is the same authority reached from the other side
so a parent is not left watching a spinner. Neither believes the browser.

```
src/lib/billing/access.ts          pure model: the price, AccessState, Entitlement, hasAccess()
src/lib/billing/subscription.ts    pure model for the OLD subscriptions only; no prices left in it
src/server/firebaseAdmin.ts        Admin SDK (server-only): verify ID tokens, Firestore, delete users
src/server/billplz.ts              Billplz client + env + X-Signature (server-only)
src/server/entitlement.ts          entitlementOf, recordBill, settleBill (one transaction), recordJoin
src/server/billing.ts              legacy Stripe only: subscriptionOf, applySubscription, claimEvent
src/server/http.ts                 json/problem helpers, requireCaller, safePath, siteUrl
src/app/api/billing/billplz/create    POST {returnTo?} → {url, billId}   (Bearer Firebase ID token)
src/app/api/billing/billplz/callback  POST form-encoded bill fields      (X-Signature; no auth)
src/app/api/billing/billplz/confirm   POST {billId} → {paid}             (Bearer Firebase ID token)
src/app/api/billing/portal            POST {returnTo} → {url}            legacy Stripe portal
src/app/api/billing/webhook           POST raw Stripe event              legacy Stripe webhook
src/app/api/account/delete            POST → {deleted:true}              (Bearer, sign-in < 5 min old)
src/lib/social/joins.ts            pure model: a join event, the recent window, the sentence for one
src/app/api/social/recent          GET → {events:[{at}]}                 (no auth; nothing private in it)
src/lib/cloud/session.ts           session store carries `entitlement`; `needs-purchase` status
src/components/landing/Pricing.tsx        the one offer on the landing page; CTA to /join
src/components/landing/JoinNotices.tsx    the corner notice, from /api/social/recent only
src/components/account/JoinGate.tsx       /join — account, then the bill
src/components/account/WelcomeGate.tsx    /welcome — "Pembayaran berjaya! 🎉" once access is real
src/components/account/AccessGate.tsx     the offer, and every not-yet-bought state
src/components/account/BillingRow.tsx     what you have, and when you paid
src/components/account/PlayGate.tsx       wraps /play and /worlds: open only with access
src/lib/cloud/preview.ts           a pretend cloud for browser measurement (no credentials)
firestore.rules                    `access` is server-owned; `billplzBills`/`joinEvents` server-only
```

## The browser is never trusted to decide whether a parent has paid

This is the whole security story, and every line of it is structural rather
than a policy someone has to remember:

- **The secret key never leaves the server.** `BILLPLZ_SECRET_KEY` is read
  only in `src/server/billplz.ts`, which begins with `import "server-only"`
   — importing it from a client component is a *build error*, not a leak.
  It is never `NEXT_PUBLIC_`, never in Firebase's client config, never
  logged, and `tests/billing.test.ts` scans `src/` to fail the build if the
  name appears anywhere but under `src/server/`.
- **Only the server writes `access`.** `firestore.rules` allows a client to
  create a user document with `email/createdAt/updatedAt` and to update
  `email/updatedAt` — nothing else, ever. A browser that could write
  `access.lifetime` would not need to pay at all, so the rules say it
  cannot, and `npm run test:rules` proves it against the emulator.
- **Nothing is granted from a redirect.** `billplz[paid]=true` in the
  address bar chooses which reassuring screen to draw and nothing more.
  `/welcome` hands the bill id to `POST /api/billing/billplz/confirm`,
  which asks *Billplz* over KIDDO's own authenticated connection. The
  parameters are stripped from the address immediately, so a reload or a
  shared link cannot replay them.
- **A callback cannot name its own owner.** The uid comes from
  `billplzBills/{billId}`, written when the bill was created from a
  verified Firebase ID token — never from the email or any other field on
  the callback body. There is no path from "I know an email address" to
  "grant that account access".
- **A bill from elsewhere cannot open KIDDO.** A secret key can read every
  bill on the account, so `billIsSettled` also checks `collection_id`
  against `BILLPLZ_COLLECTION_ID` and that `paid_amount >= amount`.
- **Duplicate callbacks are harmless.** `settleBill` is one Firestore
  transaction keyed on the bill id: it reads the ledger, checks the bill,
  writes the entitlement and marks the bill settled together, or does
  nothing. A second delivery reads `settled: true` and stops. And
  `lifetime: true` written twice is the same state — there is no counter to
  double-increment, no period to extend and no second charge to make.
- **The callback is signed.** With `BILLPLZ_XSIGNATURE_KEY` set, an
  unsigned or wrongly signed callback is refused with 401 before anything
  is read (constant-time comparison). Without it the route still believes
  nothing until it has re-read the bill from Billplz.

## The entitlement

`users/{uid}.access` = `{ lifetime, grantedAt, source, billId, amount }`.

| field | meaning |
| --- | --- |
| `lifetime` | `true` and nothing else counts. Strictly `=== true` when parsed. |
| `grantedAt` | Unix ms, when the server wrote it. Shown as "Paid on …". |
| `source` | `"billplz"`, or `"manual"` for a grant made by hand in support. |
| `billId` | The Billplz bill it came from. The receipt, and the dedupe key. |
| `amount` | Sen actually received, from Billplz — not what was asked for. |

It has no expiry, no period, no renewal date and no cancellation date,
because there is nothing to expire. `hasAccess(entitlement, now)` is the
single decision everything reads:

```ts
hasAccess(e, now) = e.access.lifetime === true || subscriptionActive(e.subscription, now)
```

The second half is the promise to the parents who subscribed before this
change: **nothing was revoked, nothing was migrated, nothing was deleted.**
`users/{uid}.subscription` is still read exactly as it was, still written by
the Stripe webhook, and still opens KIDDO while it is active. Those parents
keep their Customer Portal ("Manage subscription" on the billing card) until
they cancel it themselves. What they cannot do — what nobody can do — is
start a *new* subscription: the checkout route is gone, and with it
`customerFor()` and `liveSubscriptions()`, so "no new Stripe customers" is a
fact about the code rather than a rule about behaviour.

`accessKind()` names the three cases for the UI: `"lifetime"`,
`"legacy-subscription"`, `"none"`.

A child already on an open page is never interrupted: `PlayGate` opens once
per page lifetime and stays open. The next *fresh* visit without access
shows the child "Ask a grown-up to open KIDDO!" with a door to the parent
area — no prices, no errors, no money words.

## The way in

The landing page's only call to action is an anchor to `#pricing` on the
same page — a parent reads the problem, the alternative and what is inside
before anything asks them for anything. No modal opens on arrival.

**The main road (a new parent).**

`/` → `#pricing` → `Dapatkan KIDDO — RM29.90` → `/join` (step 1 of 2:
email, password, confirm password) → Billplz → `/welcome?billplz[id]=…` →
*confirming* while `confirm` and the callback race each other → the server
writes `access` → "**Pembayaran berjaya! 🎉 / Anda kini mempunyai akses
KIDDO seumur hidup.**" + the child's name → `Masuk KIDDO` → `/play`.

There is nothing to choose on `/join`, which is the point: `/join` takes no
query parameters at all now. Once the account exists the bill is created by
itself, but only for a parent who signed up or signed in during this visit —
arriving already signed in gives a button instead, because nothing they just
did asked to be charged.

**The second door (a parent who already has an account).** `Sign in` in the
header → `/parents` → **access gate** (before the child's name is asked) →
`Dapatkan KIDDO — RM29.90` → Billplz → `/parents?billplz[id]=…` →
*confirming* → onboarding → dashboard → `/play` opens.

Both roads run through the same session store, the same create route and the
same callback; `/join` and `/welcome` are two screens over the machinery,
not a second flow. `/welcome` is `noindex`, and so is `/join`.

- Already owned: `create` answers `409 already-owned` before creating a
  bill, so a parent cannot pay twice by pressing the button twice.
- `billplz[paid]=false` (the parent gave up at the bank): "**Pembayaran
  belum berjaya. / Anda boleh cuba lagi bila-bila masa.**" — a calm note,
  not an error, and never a claim that they have access.
- Late callback: "We're confirming your KIDDO access" for up to 45 s, then
  "This is taking longer than usual … please don't pay twice", with the
  Firestore listener still waiting. Nothing is polled; the listener fires
  the moment the server writes.
- `returnTo` is validated (`safePath`: must begin with `/`, not `//`), and
  the origin comes from `NEXT_PUBLIC_SITE_URL`, never from a request header.

## The three routes

### `POST /api/billing/billplz/create` → `{ url, billId }`

Bearer Firebase ID token + App Check. In order: billing configured → App
Check → verified caller → the caller has an email → `safePath(returnTo)` →
rate limit (8/hour/uid — each call creates a real bill) → `siteUrl` →
**`hasAccess` ⇒ `409 already-owned`** → `createBill` → `recordBill`.

The bill carries `name` (derived from the email's local part), `email` (from
the *token*, not the body), `amount: LIFETIME_AMOUNT`, `description: "KIDDO
Lifetime Access"`, `callback_url`, `redirect_url`, and
`reference_1: <uid>` labelled "KIDDO account" so a human can reconcile one
in the Billplz dashboard.

`recordBill` uses Firestore's `create`, so a bill id can never be re-pointed
at a different account. A failure there fails the purchase: an unpaid bill
nobody is sent to is harmless; a paid bill with no owner is a support ticket.

### `POST /api/billing/billplz/callback` — the authority

No auth (Billplz is not a signed-in user), so it is armoured instead:

1. `application/x-www-form-urlencoded` only, and at most 8 KB — checked
   against `content-length` *and* against the bytes actually read.
2. `id` must be present → rate limit (20/hour/bill id).
3. `x_signature` verified against `BILLPLZ_XSIGNATURE_KEY` if one is set →
   `401 bad-signature` otherwise.
4. `billRecord(id)` — a **Firestore read before any outbound call**, so a
   stranger spamming random bill ids costs one read and nothing else. No
   row → `200 unknown`. Already settled → `200 already`.
5. `getBill(id)` — Billplz's own word, over KIDDO's authenticated
   connection — then `settleBill`.

Answers `200 text/plain` for every outcome Billplz should stop retrying,
and `500` for a genuine failure so that it *does* retry.

### `POST /api/billing/billplz/confirm` → `{ paid }` — the fast path

Bearer Firebase ID token + App Check. Rate limited 30/hour/uid. Reads the
ledger and answers `404 no-bill` both when the bill does not exist and when
it belongs to somebody else — the same answer to both, so bill ids cannot
be enumerated. Otherwise it re-reads the bill from Billplz and runs the
same `settleBill`. It grants access on exactly the same evidence the
callback does; the only thing it adds is that a browser asked.

## Social proof: only purchases that happened

The landing page shows a small notice in the corner — "🎉 A new KIDDO family
just joined" — a few seconds apart, each event once, then never again for
that visit. No ticker, no counter, no dismiss button.

It cannot be fabricated, by construction rather than by policy:

- The only writer is `recordJoin`, called from inside `settleBill` on the
  transition into granted. No generator, no sample data, no seed script — a
  test scans the modules for one.
- The document holds one field, `at`. No uid, email, name, city, country,
  amount or count, so no notice can leak one. (Rows written while KIDDO was
  a subscription also carry `plan`; it is parsed and ignored.)
- Keyed by the bill id and `create`d, never `set`, so one purchase is one
  notice however many times KIDDO is told about it — and it never fails a
  payment, because a notice is not worth a retry.
- `joinEvents` is `allow read, write: if false` — closed to every client,
  signed in or not. The browser reads `GET /api/social/recent`, which
  answers with an empty list when Firebase Admin is unconfigured or
  Firestore fails. An empty list renders nothing at all.
- Events older than 14 days are dropped, at most 4 are shown, and an event
  dated in the future is discarded rather than trusted.

## Password reset and email verification

Firebase Auth does the work; KIDDO provides the screens. Set the **action
URL** for both templates in Firebase console → Authentication → Templates to
`https://<site>/parents/reset` (`actionReturnUrl()` also passes
`continueUrl` = `/parents`). The page handles
`?mode=resetPassword|verifyEmail&oobCode=…` with explicit states: checking ·
reset form · done (reset) · done (verified) · bad link (used, expired,
malformed, or no code) · offline · unavailable. Forgot-password sends the
same sentence whether or not the address has an account.

Verification is a parent-side nicety: the account card shows "Resend" /
"I've verified" while `emailVerified` is false. It does not gate anything.

## Account deletion

`POST /api/account/delete` (requires a sign-in less than 5 minutes old, same
bar as Firebase's `deleteUser`): cancel every non-cancelled *legacy* Stripe
subscription on the customer → delete the Stripe customer → delete journeys
and children by `parentId`, then `users/{uid}` → delete the auth user.

⚠️ **`users/{uid}` is where `access` lives, so deleting an account ends the
lifetime access that was paid for, with no refund path.** That is said
plainly in the confirmation copy (`account.delete.body`) rather than
discovered afterwards. The `billplzBills` ledger is deliberately *not*
deleted: it is the record of which payments were made and settled, it holds
a uid and an amount and nothing else about a person, and it is what a
support conversation about a refund has to start from.

## Environment (server-only)

See `.env.example`. `FIREBASE_SERVICE_ACCOUNT`, `BILLPLZ_SECRET_KEY`,
`BILLPLZ_COLLECTION_ID`, `BILLPLZ_XSIGNATURE_KEY`, `BILLPLZ_MODE`. Without
them the routes answer `503 billing-not-configured`; signed-in parents see
the gate with "Billing isn't set up on this site yet" and nobody gets
through it.

`BILLPLZ_MODE` defaults to **sandbox**: anything other than the exact word
`production` means `https://www.billplz-sandbox.com/api/`. So the failure
mode of a half-finished configuration is a test payment, not a real one.

The legacy `STRIPE_*` values are still read, by the portal and webhook
routes only, so existing subscribers keep working. A deployment with no such
subscribers can leave them empty; those two routes then answer 503 and
nothing else changes.

## Sandbox testing

1. Create a **sandbox** account at `www.billplz-sandbox.com` (it is a
   separate account from the live one, with separate keys).
2. Billing → Collections → **New Collection**, name it "KIDDO Lifetime
   Access" → copy the collection id into `BILLPLZ_COLLECTION_ID`.
3. Settings → your account → **API keys** → copy the Secret Key into
   `BILLPLZ_SECRET_KEY`. Enable **X Signature Key** and copy it into
   `BILLPLZ_XSIGNATURE_KEY`.
4. `BILLPLZ_MODE=sandbox` (or leave it unset).
5. `FIREBASE_SERVICE_ACCOUNT` from Firebase console → Service accounts.
6. `npm run dev`, sign up on `/parents`, press `Dapatkan KIDDO — RM29.90`.
   Billplz's sandbox page offers a **"Pay"/"Fail"** switch — no card needed.
7. Pay → back on `/welcome` → *confirming* → "Pembayaran berjaya! 🎉".
   Note that on `localhost` the **callback cannot reach you**; the fast path
   (`confirm`) is what grants access there, which is exactly why it exists.
   To exercise the real callback locally, expose the port (`ngrok http 3000`)
   and set `NEXT_PUBLIC_SITE_URL` to the public URL.
8. Check Firestore: `users/{uid}.access` = `{lifetime:true, source:"billplz",
   billId, amount:2990}`, `billplzBills/{billId}.settled = true`, and
   `joinEvents/{billId}` = `{at}` — then reload `/` and wait a few seconds
   for the notice that purchase produced.
9. Press the sandbox's **Fail** switch instead → back on `/welcome` with
   "Pembayaran belum berjaya." and no access.
10. Press the button again as the same parent → `409 already-owned`.
11. Re-deliver the callback (Billplz dashboard → the bill → resend, or
    `curl` the same form body again) → `200 already`, Firestore unchanged.
12. `curl` the callback with a random `id` → `200 unknown`, nothing written.
    With a wrong `x_signature` → `401`.

## Going live

Do this deliberately; nothing here happens automatically.

1. Complete Billplz verification on the **live** account
   (`www.billplz.com`) — it needs business details and a bank account, and
   it is a human review, so start it early.
2. Create the live **Collection** ("KIDDO Lifetime Access"). It is a
   different id from the sandbox one.
3. Copy the live Secret Key and X-Signature key.
4. Netlify → Site configuration → Environment variables, **Production
   context only**: `BILLPLZ_MODE=production`, `BILLPLZ_SECRET_KEY`,
   `BILLPLZ_COLLECTION_ID`, `BILLPLZ_XSIGNATURE_KEY`. Leave every other
   context on the sandbox values.
5. `NEXT_PUBLIC_SITE_URL=https://kiddocares.com` must be set, or the create
   route answers `503 site-url-not-configured` rather than guessing an
   origin from a request header.
6. The callback URL is not configured in the Billplz dashboard — KIDDO
   sends it with every bill — but it must be reachable:
   `https://kiddocares.com/api/billing/billplz/callback`.
7. Make one real RM29.90 payment, confirm the entitlement, then refund it
   from the Billplz dashboard if you like. A refund does **not** revoke
   access — there is no webhook for it and nothing reads one; revoking is a
   manual edit of `users/{uid}.access`.

## Tests and measurements

- `npm test` → `tests/billing.test.ts` (the model, `hasAccess` in every
  state, the gate ordering, the one-price-in-one-file scan, the
  secret-leak scan, X-Signature, the ledger's idempotency, 503 without
  credentials, and the child-screen word scan).
- `npm test` → `tests/abuse.test.ts` (rate limits, App Check, caller
  verification, body caps, the 402 on locked content, bill-id enumeration).
- `npm test` → `tests/social.test.ts` (the join model, the window, the
  privacy of every sentence, and the structural proof: one writer, no
  generator, closed rules, empty list renders nothing).
- `npm run test:rules` → the client cannot write `access` or `subscription`;
  nobody can touch `billplzBills`, `stripeEvents` or `joinEvents`.
- `npm run measure:landing` → the landing CTA leads to `#pricing`, the
  offer CTA leads to `/join`, and there is exactly one price on the page.
- `npm run measure:join` / `npm run measure:account` → a real browser walks
  the whole road on the pretend cloud
  (`localStorage["kiddo.preview.cloud"]="1"`), which fakes Billplz by
  redirecting back with `billplz[id]`/`billplz[paid]` and settling the
  entitlement a couple of seconds later, the way a callback would.
