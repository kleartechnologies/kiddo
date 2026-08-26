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

1. **Stripe is the authority on billing.** What a parent has paid for is
   whatever Stripe says. KIDDO stores a copy so it can answer quickly; the
   copy is never the source of truth and is never repaired by guessing.
2. **Firebase Auth is the authority on identity.** A caller is who their
   verified ID token says they are. No route takes an identity from a request
   body, a query string, or a header a client chose.
3. **The webhook is the only writer of subscription state.** Nothing else —
   no page, no client SDK call, no other API route — sets `status`,
   `currentPeriodEnd`, `cancelAtPeriodEnd`, `stripeCustomerId` or
   `stripeSubscriptionId`.
4. **The client cannot write billing state.** `firestore.rules` refuses any
   client write that touches the `subscription` field, and refuses to delete
   `users/{uid}` at all. The server writes it with the Admin SDK, which
   bypasses rules by design — which is exactly why the rules can be strict.
5. **Social proof is genuine.** `/api/social/recent` reports real subscription
   events derived from real webhooks. When KIDDO cannot tell, it shows
   nothing. There is no sample data and no fallback anywhere in that path.
6. **Secrets never carry `NEXT_PUBLIC_`.** That prefix compiles a value into
   the browser bundle. Every secret KIDDO has is read only by route handlers
   under `src/app/api`. Renaming one is a breach, not a refactor.
7. **Paid content requires authorization.** `/api/content/round` deals a round
   only to a caller with a verified token and an active subscription. See
   §7 for what this does *not* yet cover.
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
| `POST /api/billing/checkout` | Yes — `requireCaller` (verified ID token, `checkRevoked`) | Price comes from server config by plan name; customer looked up from the caller's own `users/{uid}`; existing active subscription → 409 | `LIMITS.checkout` — 8/hr per uid | `readJson` (415/413/400), `plan` must be `monthly`\|`yearly`, `returnTo` through `safePath` | Minting Checkout sessions; buying at an attacker-chosen price; a second subscription | Guarded |
| `POST /api/billing/portal` | Yes — `requireCaller` | Customer id read from the caller's own Firestore record, never from the body; 404 if absent | `LIMITS.portal` — 12/hr per uid | `readJson`, `returnTo` through `safePath` | Opening another parent's billing portal | Guarded |
| `POST /api/billing/webhook` | No — Stripe is not a user | `webhooks.constructEvent` over the **raw** body; unsigned or mis-signed → 400. Event id claimed by `.create()` on `stripeEvents/{id}`, so a replay is a no-op | Not rate limited by design; the signature is the gate and Stripe retries legitimately | Raw text, capped at `MAX_WEBHOOK_BYTES`; parsing only inside `constructEvent` | Forging subscription state; replaying an event | Guarded |
| `POST /api/account/delete` | Yes — `requireCaller` | Deletes only `caller.uid`; requires a recent login (`auth_time`) or 403 | `LIMITS.accountDelete` — 3/hr per uid | No body read at all | Deleting someone else's account; wiping billing identity | Guarded |
| `POST /api/content/round` | Yes — `requireCaller` | `hasAccess(subscriptionOf(caller.uid))` or 402 | `LIMITS.content` — 240/hr per uid | `readJson`; `round` matched against a fixed registry, unknown → 404 | Draining paid content; unlimited Firestore reads | Guarded (but see §7) |
| `GET /api/social/recent` | No — public by design | Nothing to authorize: the response contains only `{ at, plan }` per event, never a person | `LIMITS.social` — 30/min per IP, behind a 60s CDN + in-process cache | No body | Unlimited Firestore reads from a stranger | Guarded |

App Check (§4) sits in front of the four authenticated routes, ahead of every
other check. It is deliberately **not** on the webhook (Stripe has no browser)
or on `/api/social/recent` (the landing page does not load the Firebase SDK).

### What no route ever trusts

`uid`, Stripe customer id, Stripe subscription id, price id, amount, or any
account identifier from a request body. A test asserts that the only body
fields any route reads are `plan`, `returnTo`, `round`, `tier` and `seed`.

---

## 3. Production requirements

Set every one of these on Netlify under **Site configuration → Environment
variables**. Names and shapes are documented in `.env.example`; values live in
the dashboards they came from and nowhere in this repository.

| Variable | Required | Why it matters to security |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Yes** | The only origin KIDDO will send a parent back to. Missing in production, `siteUrl()` returns `null` and Checkout/Portal answer 503 rather than honour an attacker's `Origin` header. |
| `FIREBASE_SERVICE_ACCOUNT` | **Yes** | Verifying ID tokens, writing subscription state, deleting accounts, and the rate limiter. Without it every protected route answers 503. |
| `STRIPE_SECRET_KEY` | **Yes** | Live-mode `sk_live_…` on production only. |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | The live endpoint's own `whsec_…`. Without it the webhook answers 503 and no subscription ever activates. |
| `STRIPE_PRICE_MONTHLY` | **Yes** | Live-mode price id. Prices live in Stripe; the client only ever names a plan. |
| `STRIPE_PRICE_YEARLY` | **Yes** | As above. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | **Yes** | Identifiers, not secrets. Access is enforced by `firestore.rules`. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` | Recommended | reCAPTCHA Enterprise site key. Empty means App Check never starts. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER` | Optional | `recaptcha-enterprise` (default) or `recaptcha-v3`. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` | **Never in production** | A deliberate bypass for local browsers. |
| `APP_CHECK_ENFORCED` | Recommended, after verification | `true` makes the server reject un-attested calls to the four parent routes. Turn on only once the console shows verified traffic. |
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

### Firebase — App Check

**Firebase console → App Check → Apps → register the web app with reCAPTCHA
Enterprise → copy the site key into `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY`.**

Then leave enforcement **off** in the console and `APP_CHECK_ENFORCED` unset
until the App Check dashboard shows verified requests arriving. Only then set
`APP_CHECK_ENFORCED=true` and enable enforcement for Firestore and
Authentication.

What App Check does and does not cover:

- **Covers** the four authenticated API routes (checkout, portal, account
  delete, content round) via `requireAppCheck`, and — once enforced in the
  console — direct Firestore and Firebase Auth calls from the browser SDK.
- **Does not cover** `/api/billing/webhook` (Stripe is not a browser) or
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

### Firestore — rules

Deploy `firestore.rules` with the application. The rules are part of the
deployment, not a console convenience:

- `users/{uid}`: create and update by the owner only, with an explicit key
  allowlist, per-field types and length caps. **`allow delete: if false`** —
  deletion happens only through `POST /api/account/delete`, which uses the
  Admin SDK. `subscription` is unwritable by any client.
- `children/{childId}`: owner-scoped by `parentId`, capped at
  **6 children per parent** (`MAX_CHILDREN_PER_PARENT`). Six is a real family
  with room to spare, and small enough that a script cannot use one account to
  create unbounded documents.
- `journeys/{childId}`: writable only by the parent who owns that child, with
  caps on both the number of entries and the size of each entry.
- `stripeEvents`, `joinEvents`, `rateLimits`: **no client access at all**,
  read or write. `joinEvents` reaches the browser only through
  `/api/social/recent`, stripped to two fields.
- A final `match /{document=**} { allow read, write: if false; }` closes
  everything not named above.

`npm run test:rules` exercises these against the emulator.

### Netlify

- Environment variables per §3, scoped to production.
- HTTPS enforced (Netlify default) — the `Strict-Transport-Security` header
  KIDDO sends assumes it.
- No branch/deploy previews serving production Stripe keys. A preview that
  needs to work should use test-mode keys and its own webhook endpoint.

### Stripe

- Live-mode webhook endpoint at `https://<site>/api/billing/webhook`,
  subscribing to the subscription lifecycle events the handler reads.
- Its signing secret goes to `STRIPE_WEBHOOK_SECRET`. One secret per
  endpoint — a test-mode secret on production silently rejects every event.
- Both live prices created under one product; their ids go to the two
  `STRIPE_PRICE_*` variables. The client never names a price.
- Customer Portal configured in live mode, or `/api/billing/portal` will
  error for real parents.

---

## 5. Security headers

Set in `next.config.ts` for every path, and verified by a test:

`Content-Security-Policy` (see below) · `X-Content-Type-Options: nosniff` ·
`X-Frame-Options: DENY` · `Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy` (camera, microphone, geolocation, payment, USB, sensors
all denied) · `Strict-Transport-Security: max-age=63072000; includeSubDomains;
preload` · and `X-Powered-By` removed.

The CSP allows `'self'` plus exactly the Firebase and reCAPTCHA hosts the
browser actually contacts. Fonts are self-hosted at build by
`next/font/google`, so no font host is allowed. `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'` and `form-action 'self'` are all set;
Stripe Checkout is a full-page redirect, not an iframe or a cross-origin form
post, so none of those break it.

**The one real weakening is `script-src 'unsafe-inline'.`** Next streams data
to the client through inline `<script>` tags. The alternative is a
nonce, which in this Next fork requires every page to be dynamically rendered
— it would end static prerendering of the landing page. KIDDO has no
injection point for the directive to defend (no `dangerouslySetInnerHTML`, no
`eval`, no `new Function` anywhere in `src`, and no third-party script at
all), and a closed `connect-src` means injected script would have nowhere to
send anything. This is a documented trade, not an oversight; a test asserts
the rest of the policy stays strict.

To re-verify after a change to what KIDDO loads, build with
`CSP_REPORT_ONLY=true`, drive the real pages, confirm no violations, then
rebuild without it.

---

## 6. Subscription state

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
account and without a subscription.** This is not fixed. It is written here
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
# 200 170610   — no cookie, no token, no subscription
```

The chunk hash changes between builds; the exposure does not. A scraper needs
one request to the HTML of any play page to learn the current chunk name, and
one more to take the entire content library.

Middleware, `robots.txt`, `noindex` and route gating do **not** address this.
They control who reaches a *page*; the chunk is a static asset served by the
CDN and is fetched directly.

### What has been built

`src/server/content.ts` and `POST /api/content/round` are the real access
boundary: server-side dealing, verified token, active subscription required,
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

No `sk_…`, `whsec_…`, PEM private key, `STRIPE_SECRET_KEY` or
`FIREBASE_SERVICE_ACCOUNT` value appears anywhere in `.next/static` or
`.next/server/app`. The only `NEXT_PUBLIC_*` names in `src` are the eight
Firebase and site identifiers listed in §3. Re-run before any deploy:

```
grep -rlE 'sk_(test|live)_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|BEGIN [A-Z ]*PRIVATE KEY' \
  --exclude='*.map' .next/static .next/server
```

The trailing `[A-Za-z0-9]{8}` matters: the bare prefixes appear as *prose* in
the doc comment at the top of `src/server/stripe.ts`, which explains what each
variable should look like. Those literals reach `.next/server/**/*.map` — server
source maps, which are never served to a browser — and matching on them alone
produces three false positives on a clean build. Real key material has
characters after the prefix; the documentation does not.

---

## 9. Incident response

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
console. Access to paid content follows the subscription, so also check
whether the Stripe customer was changed.

**To disable an endpoint under active abuse**

The blunt instrument is configuration, and it is fast: unsetting
`STRIPE_SECRET_KEY` makes both billing routes answer 503; unsetting
`FIREBASE_SERVICE_ACCOUNT` takes down every authenticated route and returns
`/api/social/recent` to an empty list. Neither breaks the child-facing app.
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
`NEXT_PUBLIC_SITE_URL` is set, no `/playground` or `/character` route appears
in the build output, and the secret scan in §8 is clean.
