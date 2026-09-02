# KIDDO security runbook

What KIDDO defends, where each defence is actually enforced, what has to be
true of the production environment for those defences to hold, and what to do
on the day something goes wrong.

Read this before deploying. Two of the sections below — **Production
requirements** and **Console settings** — are deployment blockers: KIDDO will
run without them and be less safe than this document claims.

One section is an honest admission rather than a defence: **Paid content**.
The educational content is still publicly retrievable from the JavaScript
bundle. That is written down in full, with the reproduction, rather than
softened.

---

## 1. Principles

These are the rules the code is built on. A change that breaks one of them is
a security regression even if every test still passes.

1. **The payment gateway is the authority on billing.** What a parent has
   paid for is whatever Billplz says — and, for the parents who subscribed
   before KIDDO was sold once, whatever Stripe says. KIDDO stores a copy so
   it can answer quickly; the copy is never the source of truth and is never
   repaired by guessing. In particular, a parent coming back from Billplz
   with `billplz[paid]=true` in the address bar has shown KIDDO a string, not
   a payment: the server re-asks Billplz before anything is written.
2. **Firebase Auth is the authority on identity.** A caller is who their
   verified ID token says they are. No route takes an identity from a request
   body, a query string, or a header a client chose.
3. **One function writes access; one function writes subscription state.**
   `settleBill` in `src/server/entitlement.ts` is the only writer of
   `access`, and it writes it only with a bill it has just fetched from
   Billplz in its hand. `applySubscription` in `src/server/billing.ts` is the
   only writer of `subscription`, and only from a signed Stripe event.
   Nothing else — no page, no client SDK call, no other API route — sets
   either field.
4. **The client cannot write billing state.** `firestore.rules` refuses any
   client write that touches the `access` or `subscription` fields, and
   refuses to delete `users/{uid}` at all. The server writes them with the
   Admin SDK, which bypasses rules by design — which is exactly why the rules
   can be strict.
5. **Social proof is genuine.** `/api/social/recent` reports real purchases,
   written by the same function that grants access. When KIDDO cannot tell,
   it shows nothing. There is no sample data and no fallback anywhere in that
   path.
6. **Secrets never carry `NEXT_PUBLIC_`.** That prefix compiles a value into
   the browser bundle. Every secret KIDDO has is read only by route handlers
   under `src/app/api`. Renaming one is a breach, not a refactor.
7. **Paid content requires authorization.** `/api/content/round` deals a round
   only to a caller with a verified token who has bought KIDDO (or holds a
   still-active older subscription). See §7 for what this does *not* yet
   cover.
8. **Fail closed.** The rate limiter refuses when it cannot count. `siteUrl()`
   returns `null` in production rather than trusting a caller's `Origin`.
   Missing configuration produces a 503, not a permissive default.

---

## 2. API route audit

Every route under `src/app/api`, and how each one is guarded. The abuse test
suite (`tests/abuse.test.ts`) walks this directory and fails if a route is
added without being declared, so this table cannot silently go stale.

| Route | Auth required? | Authorization check | Rate limit | Input validation | Potential abuse | Result |
|---|---|---|---|---|---|---|
| `POST /api/billing/billplz/create` | Yes — `requireCaller` (verified ID token, `checkRevoked`) | Amount is `LIFETIME_AMOUNT` from server code — the body carries no price and no plan; payer email from the verified token; the bill's owner is written to `billplzBills/{id}` before the URL is returned; already owns KIDDO → 409 | `LIMITS.checkout` — 8/hr per uid | `readJson` (415/413/400), `returnTo` through `safePath` | Minting bills; buying at an attacker-chosen price; paying twice | Guarded |
| `POST /api/billing/billplz/callback` | No — Billplz is not a user | X-Signature (HMAC-SHA256, constant-time) when the collection has a key; then the bill is re-fetched from Billplz with the secret key. Ownership comes from `billplzBills/{id}`, never from the callback's email. `settled` is claimed in a transaction, so a repeat grants nothing | `LIMITS.callback` — 20/hr **per bill id**, so one caller cannot spend another parent's budget | Form-encoded only (415), capped at `MAX_CALLBACK_BYTES` (413) | Forging a payment; moving someone else's payment onto your account; replaying a callback | Guarded |
| `POST /api/billing/billplz/confirm` | Yes — `requireCaller` | Only the bill's own owner may ask (`record.uid !== caller.uid` → the same 404 as an unknown bill); the answer comes from `getBill`, never from the `billplz[…]` parameters the browser carried | `LIMITS.confirm` — 30/hr per uid | `readJson`, `billId` a string ≤128 chars | Believing the redirect; enumerating bill ids | Guarded |
| `POST /api/billing/portal` | Yes — `requireCaller` | Customer id read from the caller's own Firestore record, never from the body; 404 if absent | `LIMITS.portal` — 12/hr per uid | `readJson`, `returnTo` through `safePath` | Opening another parent's billing portal | Guarded |
| `POST /api/billing/webhook` | No — Stripe is not a user | `webhooks.constructEvent` over the **raw** body; unsigned or mis-signed → 400. Event id claimed by `.create()` on `stripeEvents/{id}`, so a replay is a no-op | Not rate limited by design; the signature is the gate and Stripe retries legitimately | Raw text, capped at `MAX_WEBHOOK_BYTES`; parsing only inside `constructEvent` | Forging subscription state; replaying an event | Guarded |
| `POST /api/account/delete` | Yes — `requireCaller` | Deletes only `caller.uid`; requires a recent login (`auth_time`) or 403 | `LIMITS.accountDelete` — 3/hr per uid | No body read at all | Deleting someone else's account; wiping billing identity | Guarded |
| `POST /api/content/round` | Yes — `requireCaller` | `hasAccess(entitlementOf(caller.uid))` or 402 | `LIMITS.content` — 240/hr per uid | `readJson`; `round` matched against a fixed registry, unknown → 404 | Draining paid content; unlimited Firestore reads | Guarded (but see §7) |
| `GET /api/social/recent` | No — public by design | Nothing to authorize: the response contains only `{ at }` per event, never a person | `LIMITS.social` — 30/min per IP, behind a 60s CDN + in-process cache | No body | Unlimited Firestore reads from a stranger | Guarded |

App Check (§4) sits in front of every authenticated route, ahead of every
other check. It is deliberately **not** on the two gateway callbacks (neither
Billplz nor Stripe has a browser) or on `/api/social/recent` (the landing page
does not load the Firebase SDK).

### What no route ever trusts

`uid`, email, Billplz bill state, Stripe customer id, Stripe subscription id,
price id, amount, or any account identifier from a request body or query
string. A test asserts that the only body fields any route reads are
`billId`, `returnTo`, `round`, `tier` and `seed` — and that a `billId` buys
nothing on its own, because the bill is re-fetched from Billplz and its owner
read from Firestore.

---

## 3. Production requirements

Set every one of these on Netlify under **Site configuration → Environment
variables**. Names and shapes are documented in `.env.example`; values live in
the dashboards they came from and nowhere in this repository.

| Variable | Required | Why it matters to security |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Yes** | The only origin KIDDO will send a parent back to, **and** the origin Billplz is told to call back on. Missing in production, `siteUrl()` returns `null` and the create route answers 503 rather than honour an attacker's `Origin` header — which also means no bill is ever created with a callback URL a caller chose. |
| `FIREBASE_SERVICE_ACCOUNT` | **Yes** | Verifying ID tokens, writing access and subscription state, deleting accounts, and the rate limiter. Without it every protected route answers 503. |
| `BILLPLZ_SECRET_KEY` | **Yes** | The HTTP Basic username on every Billplz call. **A secret**: never `NEXT_PUBLIC_`, never in the repository, never in a client bundle. Without it the Billplz routes answer 503 and nothing is ever granted. Roll it in the Billplz dashboard if it is ever printed, pasted or committed. |
| `BILLPLZ_COLLECTION_ID` | **Yes** | The collection KIDDO's bills belong to. `settleBill` refuses a bill from any other collection, so this is also what stops a paid bill from an unrelated Billplz product opening KIDDO. |
| `BILLPLZ_MODE` | **Yes** | `sandbox` unless the value is exactly `production`. Fail-safe by construction: a typo sends parents to sandbox money, never real money. |
| `BILLPLZ_XSIGNATURE_KEY` | Strongly recommended | The collection's X-Signature key. Set it and an unsigned or wrongly signed callback is refused before Billplz is called at all. Without it KIDDO still believes only `getBill`, so a forged callback cannot grant anything — it can only make KIDDO look. **A secret.** |
| `STRIPE_SECRET_KEY` | Legacy | Only for the parents who subscribed before KIDDO was sold once. Unset it and the webhook and portal answer 503; existing `access.lifetime` purchases are unaffected. |
| `STRIPE_WEBHOOK_SECRET` | Legacy | The live endpoint's own `whsec_…`. Without it the webhook answers 503 and an older subscription's state stops being updated. |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Legacy | Live-mode price ids, used only to read an older subscription's plan back. Nothing can start a new one. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | **Yes** | Identifiers, not secrets. Access is enforced by `firestore.rules`. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` | Recommended | reCAPTCHA Enterprise site key. Empty means App Check never starts. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER` | Optional | `recaptcha-enterprise` (default) or `recaptcha-v3`. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` | **Never in production** | A deliberate bypass for local browsers. |
| `APP_CHECK_ENFORCED` | Recommended, after verification | `true` makes the server reject un-attested calls to the authenticated parent routes. Turn on only once the console shows verified traffic. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional | The Meta dataset id, digits only. Compiled into an inline `<script>` on the parent-facing pages, so `pixelId()` refuses anything that is not a plain number rather than trusting the variable. Unset, no build requests anything from Facebook. |
| `CSP_REPORT_ONLY` | No | Read at **build** time. Leave empty so the policy is enforced. |
| `KIDDO_DEV_PAGES` | **Must stay empty** | `1` compiles the `/playground` and `/character` reference screens into the build. Empty is what keeps them out of production entirely. |

Nothing here belongs in the repository. `.gitignore` covers `.env*` with a
single exception for `.env.example`, whose values are all empty.

---

## 4. Console settings

### Firebase — Email Enumeration Protection

**Firebase console → Authentication → Settings → User actions → check
"Protect against email enumeration" → Save.**

Without it, `createUserWithEmailAndPassword` returns
`auth/email-already-in-use` and sign-in distinguishes
`auth/user-not-found` from `auth/wrong-password` — which turns the sign-in
form into an oracle for "is this address a KIDDO customer". With it, Firebase
collapses those into `auth/invalid-credential`.

The client already assumes the protection is on: `AuthCard.tsx` shows one
message for a failed sign-in whichever error arrives, and the reset form says
the same thing whether or not the address exists. A test holds that in place.
The remaining leak is sign-*up*, which the client cannot hide on its own —
this console setting is the fix, not a code change.

### Firebase — Google sign-in

**Firebase console → Authentication → Sign-in method → Google → Enable →
set the support email → Save.** Then **Authentication → Settings →
Authorized domains** must list **every hostname KIDDO is served from** —
`kiddocares.com` and, while the Netlify subdomain is still reachable,
`kiddocares.netlify.app`. Until both steps are done, "Continue with Google"
fails with `auth/operation-not-allowed` or `auth/unauthorized-domain`,
which reaches the parent as "Something went wrong. Please try again." —
all the card can honestly say about a server setting.

The list starts as `localhost` plus the two firebase-hosted names, and
nothing else. `127.0.0.1` is **not** on it: the same machine under its
numeric spelling is a different domain to Firebase, so drive the local
check at `http://localhost:4310` or it fails for a reason that has nothing
to do with the code.

Enabling Google does not weaken Email Enumeration Protection above, and it
does not create a second account for an address that already has a password:
Firebase keeps one account per email address, and the card answers
`auth/account-exists-with-different-credential` with "that email already
signs in a different way".

### Firebase — App Check

**Firebase console → App Check → Apps → register the web app with reCAPTCHA
Enterprise → copy the site key into `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY`.**

Then leave enforcement **off** in the console and `APP_CHECK_ENFORCED` unset
until the App Check dashboard shows verified requests arriving. Only then set
`APP_CHECK_ENFORCED=true` and enable enforcement for Firestore and
Authentication.

What App Check does and does not cover:

- **Covers** every authenticated API route (Billplz create, Billplz confirm,
  portal, account delete, content round) via `requireAppCheck`, and — once
  enforced in the console — direct Firestore and Firebase Auth calls from the
  browser SDK.
- **Does not cover** `/api/billing/billplz/callback` or
  `/api/billing/webhook` (neither gateway has a browser), or
  `/api/social/recent` (no Firebase SDK on the landing page).
- **Does not replace** anything. Every route keeps its token check, its
  ownership check and its rate limit; App Check only makes automated signup
  and API abuse expensive, it does not make any of them authorized.
- **Local development is unaffected.** No key means `startAppCheck` is a
  no-op and `requireAppCheck` returns `null`.

### Firestore — TTL policies

**Firebase console → Firestore → TTL → Create policy** for each:

| Collection | Field | Why |
|---|---|---|
| `rateLimits` | `expiresAt` | One document per identity per window. Without a TTL these accumulate forever and the limiter becomes a storage bill. |
| `stripeEvents` | `expiresAt` | Idempotency receipts. Only recent ones can prevent a replay Stripe would actually send. |

`billplzBills` has **no** TTL, and must not be given one: it is the record of
which account each bill belongs to, and it is what makes a settled bill
impossible to settle twice. Losing it would make a late callback unattributable.

### Firestore — rules

Deploy `firestore.rules` with the application. The rules are part of the
deployment, not a console convenience:

- `users/{uid}`: create and update by the owner only, with an explicit key
  allowlist, per-field types and length caps. **`allow delete: if false`** —
  deletion happens only through `POST /api/account/delete`, which uses the
  Admin SDK. `access` and `subscription` are unwritable by any client — a
  parent who could write `access.lifetime` would not need to pay.
- `children/{childId}`: owner-scoped by `parentId`, capped at
  **6 children per parent** (`MAX_CHILDREN_PER_PARENT`). Six is a real family
  with room to spare, and small enough that a script cannot use one account to
  create unbounded documents.
- `journeys/{childId}`: writable only by the parent who owns that child, with
  caps on both the number of entries and the size of each entry.
- `billplzBills`, `stripeEvents`, `joinEvents`, `rateLimits`: **no client
  access at all**, read or write. `joinEvents` reaches the browser only
  through `/api/social/recent`, stripped to the time. `billplzBills` never
  reaches a browser at all.
- A final `match /{document=**} { allow read, write: if false; }` closes
  everything not named above.

`npm run test:rules` exercises these against the emulator.

### Netlify

- Environment variables per §3, scoped to production.
- HTTPS enforced (Netlify default) — the `Strict-Transport-Security` header
  KIDDO sends assumes it.
- No branch/deploy previews serving production Billplz or Stripe keys. A
  preview that needs to work should use sandbox/test credentials, its own
  collection, and its own `NEXT_PUBLIC_SITE_URL` — otherwise its bills carry a
  callback URL pointing at production.

### Billplz

- One collection for KIDDO lifetime purchases; its id goes to
  `BILLPLZ_COLLECTION_ID`. A bill from any other collection is refused by
  `settleBill`, so sharing an account with another product is safe.
- The collection's **X-Signature key** enabled and copied to
  `BILLPLZ_XSIGNATURE_KEY`. Billplz shows it once.
- `BILLPLZ_MODE=production` — and only that exact word — for real money.
  Anything else, including a typo or an unset variable, uses the sandbox.
- The callback URL is not configured in the dashboard: it is sent per bill as
  `${NEXT_PUBLIC_SITE_URL}/api/billing/billplz/callback`, which is why §3
  treats that variable as a security control.
- `BILLPLZ_SECRET_KEY` is the Basic-auth username on every call. It is read
  only by `src/server/billplz.ts`, which is `import "server-only"` — a build
  fails rather than compiles it into a bundle.

### Stripe (legacy subscriptions only)

Nothing can start a new Stripe subscription. Keep these only while parents who
subscribed before the change still have one.

- Live-mode webhook endpoint at `https://<site>/api/billing/webhook`,
  subscribing to the subscription lifecycle events the handler reads.
- Its signing secret goes to `STRIPE_WEBHOOK_SECRET`. One secret per
  endpoint — a test-mode secret on production silently rejects every event.
- The two live price ids stay in `STRIPE_PRICE_*`; they are read only to name
  an existing subscription's plan.
- Customer Portal configured in live mode, or `/api/billing/portal` will
  error for the parents who still have something to manage.

---

## 5. Security headers

Set in `next.config.ts` for every path, and verified by a test:

`Content-Security-Policy` (see below) · `X-Content-Type-Options: nosniff` ·
`X-Frame-Options: DENY` · `Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy` (camera, microphone, geolocation, payment, USB, sensors
all denied) · `Strict-Transport-Security: max-age=63072000; includeSubDomains;
preload` · and `X-Powered-By` removed.

The CSP allows `'self'` plus exactly the Firebase, reCAPTCHA and Meta hosts
the browser actually contacts. Fonts are self-hosted at build by
`next/font/google`, so no font host is allowed. `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'` and `form-action 'self'` are all set;
Billplz's payment page (and Stripe's Checkout) is a full-page redirect, not an
iframe or a cross-origin form post, so none of those break it. `form-action
'self'` is safe for the same reason: KIDDO navigates to Billplz with
`location.assign`, it never posts a form there.

**The first real weakening is `script-src 'unsafe-inline'.`** Next streams
data to the client through inline `<script>` tags. The alternative is a
nonce, which in this Next fork requires every page to be dynamically rendered
— it would end static prerendering of the landing page. KIDDO has no
injection point for the directive to defend (no `dangerouslySetInnerHTML`, no
`eval`, no `new Function` anywhere in `src`), and a closed `connect-src`
means injected script would have nowhere to send anything. This is a
documented trade, not an oversight; a test asserts the rest of the policy
stays strict.

**The second is `script-src https://apis.google.com`,** added for "Continue
with Google". Firebase's `signInWithPopup` loads Google's `gapi.iframes` to
talk to the window it opens, and posts the answer back through a hidden
`/__/auth/iframe` on the project's `authDomain` — which is why `frame-src`
names that host in full rather than a wildcard. So the claim above that
KIDDO carries *no* third-party script no longer holds: it carries one,
Google's, on the page that is already trusting Google with the sign-in
itself. There is no version of Firebase popup sign-in without it.

`frame-src` names `'self'` and **one** auth host, and they are one iframe at
two addresses. In production the helpers answer on KIDDO's own origin:
`netlify.toml` rewrites `/__/auth/*` to Firebase Hosting with `status = 200`,
which is a proxy rather than a redirect, so the parent's browser only ever
sees `kiddocares.com` and `authDomain` can be set to it. That is the whole
reason the rewrite exists: Google's account chooser shows the host it will
send the parent back to, and a parent halfway through buying KIDDO should
not be asked to trust `kiddocares-b105e.firebaseapp.com`. The firebaseapp.com
host stays named beside `'self'` so that a build with no
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, or one rolled back to it, is not a build
whose sign-in popup is silently blocked.

An earlier version of this file described `auth.kiddocares.com`, a Firebase
Hosting custom domain, as the way to reach the same end. That domain was
written down but never created — it does not resolve — and the proxy is
better than reviving it: it needs no DNS record and no second Hosting site,
and it leaves KIDDO with exactly one production origin rather than two.

`signInWithRedirect` is now used on exactly one browser, and the proxy is
what makes it safe. It was unusable while the handler sat on firebaseapp.com:
KIDDO is served from kiddocares.com, and browsers that partition third-party
storage lose the redirect's state on the way back. A same-origin handler has
no such problem. The redirect is not a general replacement for the popup —
it is reserved for an installed iOS KIDDO, where `signInWithPopup` has no
working road at all (it hands the window to Safari and its promise never
settles; see `src/lib/firebase/signInMethod.ts`, which reproduces the SDK's
own `_isIOSStandalone` test and nothing wider). Every other browser keeps the
popup, which is why `script-src https://apis.google.com` and the `frame-src`
hosts are still needed.

**The third is the Meta pixel:** `script-src https://connect.facebook.net`
for `fbevents.js` and the pixel's own configuration, and
`https://www.facebook.com` in both `img-src` and `connect-src` for the
`/tr` beacon, which is an image in older browsers and a `fetch` in newer
ones. It is the first host in `connect-src` that KIDDO does not need in
order to run. Two things bound it. The tag is rendered only on `/`,
`/join`, `/welcome`, `/privacy` and `/parents*` — a child's screen loads
nothing from Facebook, and `tests/analytics.test.ts` walks `src/app` and
fails if any other route becomes eligible. And `autoConfig` is turned off
before `init`, so the pixel does not read button text or form fields on
pages where a parent types an email address and a password; it reports a
page address, and — at two moments — the one price there is. The header
itself cannot distinguish the two halves of the site, so the policy is
written wide enough for the pages that carry the tag. Without
`NEXT_PUBLIC_META_PIXEL_ID` no page requests either host.

**The conversions** are two of Meta's standard events, in
`src/lib/analytics/events.ts`, and they are the only thing besides a page
view that KIDDO sends. `InitiateCheckout` is reported in
`startPurchase()` *before* the request to `/api/billing/billplz/create`,
because the redirect to Billplz cancels a beacon still in flight and because
what it records is the parent choosing to pay. `Purchase` is reported from
`/welcome`, on the strength of `hasAccess()` over the entitlement **the
callback wrote** — never on `billplz[paid]=true`, which is a string in an
address bar and says only where the browser came from. Both carry `value`,
`currency` and `content_name: "lifetime"`, derived from `LIFETIME_AMOUNT`;
neither carries an email address, an account id, a bill id or anything about
a child. Each also fails closed the way the tag does:
`isParentPage(location.pathname)` is checked again at send time, so an event
cannot leave a child's screen even if a caller moved.

A purchase must be counted once — and, for a thing sold once, *ever*.
`/welcome` can be reloaded, bookmarked and returned to, and the entitlement
is still there each time, so the reporter remembers the bill id in
`localStorage` (`kiddo.meta.purchase.v1`) and stays silent afterwards — and
it remembers only when the beacon actually left, so a tag still loading, or
blocked, is retried rather than lost. The device's memory is not the only
guard: the event carries `eventID: purchase_<bill id>`, so a second device,
or one whose storage was cleared, is deduplicated by Meta instead of counted
twice. An entitlement with no bill id on it — a legacy subscriber — reports
nothing at all rather than guess a key.

Two things about `fbevents.js` had to be turned off for the boundary above
to be real, and neither is visible from reading the snippet Meta hands out.
It hooks `history.pushState` and reports a page view for every route the
app moves to, so a parent who opened the landing page would have had every
screen their child walked into reported for them — `disablePushState` stops
it, and every page view KIDDO sends is then one its own effect decided to
send. And a second `fbq('track', 'PageView')` in the same document is
swallowed as a duplicate, so the deliberate ones go through `trackSingle`,
which names the pixel. `npm run check:meta-pixel` drives a real Chrome
through both halves of the site — landing page, a client navigation to
another parent page, a client navigation into `/play`, and `/play` opened
cold — and reports every request to Facebook and every
`securitypolicyviolation` at each step. It is what caught both of the
above. Its second half then buys KIDDO through the pretend cloud
(`src/lib/cloud/preview.ts`, where the payment page is a page on this site
and the "callback" is a timer) and opens `/welcome` twice more, which is the
only way to check the once-only rule against a real browser rather than
against the code that implements it. Beacons are recorded as they are
*made* rather than as they complete, because the redirect to the payment
page cancels the one before it and a cancelled request leaves no timing
entry.
Run it with a *made-up* dataset id, unless localhost's page views and a
pretend purchase belong in the real dataset:

    NEXT_PUBLIC_META_PIXEL_ID=1234567890123456 npm run measure:serve
    node scripts/check-meta-pixel.mjs

Last run: one page view on the landing page, one on the navigation, none on
either visit to `/play`, `fbq` undefined there, no violations; one
`InitiateCheckout` (MYR 29.9, `lifetime`) sent from `/join`, no purchase
before the callback landed, one `Purchase` (MYR 29.9, `lifetime`,
`eventID=purchase_preview-bill-…`) after it, and still one after two further
visits to `/welcome`. Pointed at a Firebase-configured server the second
half says which command builds the one it needs and skips.

`connect-src` was **not** widened for Google sign-in, and the test that pins
it now names Firebase's own hosts plus `www.facebook.com` and nothing else. `tests/abuse.test.ts` now pins
`script-src`, `img-src` and `frame-src` just as exactly, asserts the fallback
`frame-src` auth host matches `FIREBASE_PROJECT_ID`, and asserts the custom
one is named too — so moving Firebase projects, or dropping the custom
domain from the policy while the environment still points at it, fails a
test rather than silently blocking the popup.

To re-verify after a change to what KIDDO loads, build with
`CSP_REPORT_ONLY=true`, drive the real pages, confirm no violations, then
rebuild without it. For the Google popup specifically there is a script:
`npm run check:google-csp` against a `next start` of a Firebase-configured
build presses the button in a real Chrome and reports every
`securitypolicyviolation`, together with proof that `apis.google.com` and
the auth iframe were actually requested. It signs nobody in. Last run: no
violations, both hosts reached.

---

## 6. Entitlement state

### What a parent owns

`users/{uid}.access` is the new field and the one that matters:
`{ lifetime, grantedAt, source, billId, amount }`. It has no expiry, so
`hasAccess()` consults no clock for it — a purchase that opened KIDDO opens it
for good. `settleBill` writes it inside a Firestore transaction that also
claims `billplzBills/{id}.settled`, so a callback delivered twice grants once,
and a second bill for a parent who already owns KIDDO settles to `already`
rather than to a second grant. The grant is refused unless Billplz's own
answer says `paid`, in KIDDO's collection, for at least `LIFETIME_AMOUNT`.

`users/{uid}.subscription` is the older field, still read and still honoured,
described below. A parent may have both; `hasAccess()` is satisfied by either.

### Legacy subscription state

`isNewer()` in `src/lib/billing/subscription.ts` decides whether an incoming
webhook event replaces the stored state. Ordering is by Stripe's
`eventCreated` first; when two events share the same second — which
`customer.subscription.updated` and `.deleted` routinely do at cancellation —
the more *final* state wins. Finality is status order (`none` → `incomplete` →
`active` → `past_due` → `cancelled` → `expired`), with a scheduled
cancellation ranking above the same status without one.

The effect: a stale event cannot reopen access that a later-or-equal event
closed. Identical states still compare equal, so redelivering the same event
remains harmless.

Cancellation semantics are unchanged: `cancel_at_period_end` **or** `cancel_at`
continues to mean a scheduled cancellation, and access continues until
`currentPeriodEnd`.

---

## 7. Paid content — known exposure

**KIDDO's educational content is currently retrievable by anyone, without an
account and without paying.** This is not fixed. It is written here
precisely so nobody reads "hardened" and assumes otherwise.

### What is exposed

Every question, prompt, answer set and world activity in `src/lib/content`
(~744 KB of source, of which ~616 KB is the packs) is compiled into the client
bundle, because the game screens deal their own rounds in the browser.

At the current build that is a single public chunk:

```
.next/static/chunks/25-caei83i-2v.js   ~170 KB
```

loaded by the statically prerendered `/play/*` and `/worlds/*` pages.
Reproduction against a local production server:

```
npm run build && npm start -- -p 4310
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  http://127.0.0.1:4310/_next/static/chunks/25-caei83i-2v.js
# 200 170610   — no cookie, no token, nothing bought
```

The chunk hash changes between builds; the exposure does not. A scraper needs
one request to the HTML of any play page to learn the current chunk name, and
one more to take the entire content library.

Middleware, `robots.txt`, `noindex` and route gating do **not** address this.
They control who reaches a *page*; the chunk is a static asset served by the
CDN and is fetched directly.

### What has been built

`src/server/content.ts` and `POST /api/content/round` are the real access
boundary: server-side dealing, verified token, a purchase required,
rate limited, round names matched against a fixed registry. Tests O, P and Q
hold it. It is correct and it works — but it is not yet the *only* way to the
content, so it protects nothing on its own today.

### Why it was not completed here

Firebase Auth in KIDDO is client-side only; there is no session cookie, so a
server-rendered page cannot know who is viewing it. The only sound design is
the one above: the browser fetches each round with an ID token. Making that
the sole path means every `build*Session(rng?)` call becomes asynchronous,
which pushes a loading state into all six quest hooks and `WorldActivityGame`,
and touches roughly thirty test files and the child-facing UI. Doing that
inside a security change, at speed, is how a child-facing app acquires a blank
screen mid-game.

### Follow-up plan

The seam is narrow — exactly one entry point per game.

1. Add a client helper that POSTs `{ round, tier, seed }` to
   `/api/content/round` with the current ID token and returns `Challenge[]`.
2. Replace the six `build*Session(rng)` calls and the `WorldActivityGame`
   plan draw with that helper, one game at a time, each with its own loading
   and failure state.
3. Move `src/lib/content/packs` behind `import "server-only"` so a future
   client import fails the build rather than silently re-shipping the packs.
4. Verify: rebuild, confirm no chunk under `.next/static` contains prompt text
   (the scan in this section, inverted, becomes the regression test), and
   confirm the games still play for a subscriber.

Until step 3 passes, treat the content as public.

### Localization does not change any of this

KIDDO shipping in Bahasa Melayu neither fixes the exposure above nor doubles
it, and the reason is worth stating plainly because "we added a language" is
exactly the kind of change that quietly grows an attack surface.

- **There is no second content path.** `dealRound(round, tier, seed, locale)`
  takes the language as its last argument on the one call that already exists.
  `POST /api/content/round` is still the only server route to content, still
  requires a verified Firebase ID token, still requires `hasAccess`, still
  matches `round` against a fixed registry, and is still rate limited. No `ms`
  route, no `ms` API, no public locale endpoint was added.
- **`locale` is not an access decision.** It reaches the route as an untrusted
  string from the caller — the language lives in the browser — and an
  unrecognised value falls back to English rather than refusing to deal a round
  the parent has paid for. A locale can change the words; it can never change
  who may have them, whose data is read, or which subscription applies.
- **Malay is not a second copy of the library.** The Malay strings are a
  lexicon and a sentence book applied to the same dealt `Challenge` object.
  There is no parallel `ms` pack, so the exposed chunk did not become two
  exposed chunks.
- **Step 3 of the follow-up plan still applies unchanged.** When the packs move
  behind `import "server-only"`, `src/lib/content/i18n` moves with whichever
  side of that boundary the dealing ends up on — it is not a separate
  migration, and it must not become an excuse to leave a client-side dealing
  path alive "for the Malay build".

`tests/localization.test.ts` holds the line that matters here — *"a language is
a set of words, never a way into the content"*. See
[kiddo-localization.md](kiddo-localization.md) for the architecture.

---

## 8. Supply chain

`npm audit --omit=dev`: **6 moderate, all one advisory.**

- **Package:** `uuid` < 11.1.1 — GHSA-w5hq-g745-h8pq, "missing buffer bounds
  check in v3/v5/v6 when `buf` is provided".
- **Path:** transitive only —
  `firebase-admin@14.3.0 → @google-cloud/storage → gaxios / teeny-request → uuid@9.0.1`.
- **Exploitability in KIDDO: none.** Both consumers call `uuid.v4()` and only
  `v4`, to generate multipart boundaries (`gaxios/build/src/gaxios.js:417`,
  `teeny-request/build/src/index.js:135`). The vulnerable code path is v3/v5/v6
  with a caller-supplied `buf`, which neither reaches. KIDDO also never uses
  Firebase Storage, so `@google-cloud/storage` is loaded but unused.
- **Safest remediation: wait for upstream.** The fix has to come from
  `firebase-admin` bumping its own dependency. `npm audit fix --force` would
  cross a major version of `firebase-admin` — a far larger risk than an
  unreachable advisory. Re-check on each `firebase-admin` release.

Dependency surface is deliberately small: `firebase`, `firebase-admin`,
`framer-motion`, `lucide-react`, `next`, `react`, `react-dom`, `stripe`. All
eight are used. `package-lock.json` is lockfile v3 and its root entry matches
`package.json` exactly.

### Secret scan

No `sk_…`, `whsec_…`, PEM private key, `BILLPLZ_SECRET_KEY`,
`BILLPLZ_XSIGNATURE_KEY`, `STRIPE_SECRET_KEY` or `FIREBASE_SERVICE_ACCOUNT`
value appears anywhere in `.next/static` or `.next/server/app`. The only
`NEXT_PUBLIC_*` names in `src` are the eight Firebase and site identifiers
listed in §3, plus `NEXT_PUBLIC_META_PIXEL_ID`. Re-run before any deploy:

```
grep -rlE 'sk_(test|live)_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|BEGIN [A-Z ]*PRIVATE KEY' \
  --exclude='*.map' .next/static .next/server
grep -rl 'BILLPLZ_SECRET_KEY\|BILLPLZ_XSIGNATURE_KEY' .next/static
```

The second command must print nothing at all: a Billplz key has no fixed
prefix to match on, so what is scanned for is the *variable name*, which is
the only way it could get into a bundle. `src/server/billplz.ts` is
`import "server-only"`, so a client component importing it fails the build
rather than shipping the key — the grep is the belt to that braces, and
`tests/billing.test.ts` asserts the same thing over the source tree.

The trailing `[A-Za-z0-9]{8}` in the first command matters: the bare prefixes
appear as *prose* in the doc comment at the top of `src/server/stripe.ts`,
which explains what each variable should look like. Those literals reach
`.next/server/**/*.map` — server source maps, which are never served to a
browser — and matching on them alone produces three false positives on a clean
build. Real key material has characters after the prefix; the documentation
does not.

---

## 9. Incident response

**If the Billplz secret key leaks**

1. Billplz dashboard → Settings → roll the API secret key immediately. The old
   key stops working the moment the new one is issued.
2. Update `BILLPLZ_SECRET_KEY` on Netlify and redeploy (env changes need a
   rebuild to reach the functions). Until then, every Billplz route answers
   502 — parents cannot buy, but nothing false is granted.
3. Billplz → Bills: look for bills KIDDO did not create. A leaked key can
   create and read bills; it cannot move money into another account, and it
   cannot write to Firestore.
4. Nothing in Firestore needs repair. A bill KIDDO did not create has no
   `billplzBills/{id}` record, so `settleBill` refuses it however it is paid —
   the ledger, not the gateway, decides whose payment a bill is.
5. Do **not** revoke any `access.lifetime` already granted. Each one names the
   bill it came from; verify against Billplz's own records before touching a
   parent's account.

**If the X-Signature key leaks**

1. Billplz → the KIDDO collection → regenerate the X-Signature key.
2. Update `BILLPLZ_XSIGNATURE_KEY` and redeploy.
3. No audit is needed. The signature is a filter in front of `getBill`, not
   the evidence anything is granted on: a forged callback with a valid
   signature still only causes KIDDO to ask Billplz about a bill, and Billplz
   answers truthfully.

**If a Stripe secret key leaks**

1. Stripe dashboard → Developers → API keys → roll `sk_live_…` immediately.
2. Update `STRIPE_SECRET_KEY` on Netlify and redeploy (env changes need a
   rebuild to reach the functions).
3. Stripe → Developers → Events, and Payments: look for sessions, refunds or
   customer changes KIDDO did not initiate.
4. Nothing in Firestore needs repair unless a forged subscription was created;
   if one was, cancel it in Stripe and let the webhook write the correction.

**If the webhook signing secret leaks**

1. Stripe → Developers → Webhooks → the endpoint → roll the signing secret.
2. Update `STRIPE_WEBHOOK_SECRET` and redeploy.
3. Compare recent `users/{uid}.subscription` states against Stripe. Stripe is
   the authority: re-send the real events from the dashboard to correct any
   drift rather than editing Firestore by hand.

**If the Firebase service account leaks**

1. Google Cloud console → IAM → Service accounts → delete the compromised key,
   generate a new one.
2. Update `FIREBASE_SERVICE_ACCOUNT` and redeploy.
3. Revoke sessions for anyone possibly affected:
   `adminAuth().revokeRefreshTokens(uid)`. `verifyIdToken(token, true)` checks
   revocation, so this takes effect on the next request.
4. Audit `users/*`, `children/*` and `journeys/*` for writes that no parent
   made. The Admin SDK bypasses rules, so a leaked key could write anything.

**If a single account is compromised**

Revoke its refresh tokens as above; force a password reset from the Firebase
console. Access to paid content follows `users/{uid}.access` (and, for older
accounts, `.subscription`), neither of which a client can write — so check the
`billplzBills` records that name the uid rather than the field itself, and for
a legacy subscriber check whether the Stripe customer was changed.

**To disable an endpoint under active abuse**

The blunt instrument is configuration, and it is fast: unsetting
`BILLPLZ_SECRET_KEY` makes the three Billplz routes answer 503 (nobody can
buy; everyone who already has, keeps it); unsetting `STRIPE_SECRET_KEY` does
the same for the webhook and portal; unsetting `FIREBASE_SERVICE_ACCOUNT`
takes down every authenticated route and returns `/api/social/recent` to an
empty list. None of them breaks the child-facing app.
For a narrower response, drop the relevant `LIMITS` entry in
`src/server/rateLimit.ts` and deploy — the limiter is durable and shared, so
the new budget applies to every instance at once.

**To ship an emergency fix**

Branch from `main`, make the smallest change that closes the hole, run
`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` and
`npm run test:rules`, deploy, then write the follow-up test.

---

## 10. Before every deploy

```
npm test            # unit + abuse suite
npx tsc --noEmit
npm run lint
npm run build       # with KIDDO_DEV_PAGES unset
npm run test:rules  # Firestore rules against the emulator
npm audit --omit=dev
```

The browser measures (`npm run measure:landing|join|account|parents|journey`)
need a production server on `127.0.0.1:4310` **and a device-only build** — that
is, one made with the `NEXT_PUBLIC_FIREBASE_*` values absent. With Firebase
configured, `/parents` gates behind sign-in and every script that walks the
parent journey stops at the sign-in card. That is the scripts' environment, not
a failure: build with `.env.local` moved aside, run them, then restore it.

Then confirm by hand: `KIDDO_DEV_PAGES` is unset, `CSP_REPORT_ONLY` is unset,
`NEXT_PUBLIC_SITE_URL` is set to the live origin (it is what Billplz is told
to call back on), `BILLPLZ_MODE` is exactly `production`, no `/playground` or
`/character` route appears in the build output, and both halves of the secret
scan in §8 are clean.

And once, on the real site before announcing it: buy KIDDO with a real card
for RM29.90, confirm the bill in the Billplz dashboard, confirm
`users/{uid}.access.lifetime` is true with the matching `billId`, and confirm
that re-opening `/welcome` does not report a second purchase. A sandbox pass
proves the code; only this proves the configuration.
