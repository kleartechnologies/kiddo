# KIDDO parent accounts and cloud journey sync (Phase 8B)

The parent owns the account. The child is a profile inside it. The child
never signs in, never sees an email address, a password, or the word
"account"; `/play` and every game work exactly as before, whether or not a
parent has signed in on the device.

## Architecture

```
src/lib/firebase/config.ts     env → Firebase web config (null = device-only)
src/lib/firebase/backend.ts    the real CloudBackend (Auth + Firestore), lazy
src/lib/cloud/types.ts         CloudBackend interface, CloudError, AuthFailure
src/lib/cloud/session.ts       parent session store: who is signed in, which child
src/lib/journey/useJourney.ts  ONE journey store; persists locally or to the cloud
src/lib/profile/useChildName.ts  child's first name; mirrored to the cloud when bound
src/components/account/*       CloudSession, ParentGate, AuthCard, ChildOnboarding, AccountRow
firestore.rules                ownership enforced by Firestore itself
```

- **Firebase is loaded lazily** (`import("@/lib/firebase/backend")`) and only
  when (a) the hint key `kiddo.account.v1` says a parent signed in on this
  device before, or (b) a parent presses Sign in / Create account. A child
  playing device-only never downloads the SDK.
- **Device-only mode** is what you get with no `NEXT_PUBLIC_FIREBASE_*`
  variables: `configureSession(null)` → session status `unavailable` →
  `/parents` renders the dashboard exactly as in Phase 7. All existing
  measurement suites run in this mode.
- The journey's pure transitions (`src/lib/journey/journey.ts`) are untouched.
  `useJourney.ts` only decides *where* the result is kept.

## Firestore data model

| collection | id | fields | notes |
| --- | --- | --- | --- |
| `users` | auth `uid` | `email`, `createdAt`, `updatedAt` | created on first sign-in (`ensureUser`); no parent name field |
| `children` | auto id | `parentId` (= uid), `name` (1–24 chars, first word only), `createdAt`, `updatedAt` | `parentId` is immutable under the rules |
| `journeys` | the child's id | `completed: string[]`, `last: string \| null`, `updatedAt` | same shape as `Journey`; keyed by childId so ownership is one lookup |

Invariants: a child has exactly one parent; a journey has exactly one child;
the client reads a child only via `where("parentId", "==", uid)` (the rules
reject any other query); deleting an account deletes journey → child → user
→ auth user in that order so nothing is orphaned.

## Security rules (`firestore.rules`)

- `users/{uid}`: read/create/update/delete only when `request.auth.uid == uid`;
  create must carry the token's own email; only `email/createdAt/updatedAt`.
- `children/{id}`: read/update/delete only when `resource.data.parentId ==
  uid`; create only with `parentId == uid` and a valid name; `parentId` and
  `createdAt` cannot change; no extra fields (so no birthdate can sneak in).
- `journeys/{childId}`: every operation requires
  `get(children/$(childId)).data.parentId == uid`; writes must be
  `{completed: list ≤ 200, last: string|null, updatedAt}` and nothing else.
- Everything else, and every unauthenticated request, is denied.

Tested against the Firestore emulator: `npm run test:rules`
(`tests/firestore.rules.test.mjs`, 10 tests). Needs Java; the script finds a
Homebrew OpenJDK automatically.

Deploy with `firebase deploy --only firestore:rules` (needs `firebase login`).

## Authentication flow

There are two doors and one door frame. `/join` is where a parent who has
just chosen a plan makes an account (`JoinGate`, then Stripe, then
`/welcome`); `/parents` is where a parent who already has one signs in
(`ParentGate`). Both render the same `AuthCard` against the same session
store, so there is one authentication system and one set of sentences.

1. `/parents` → `ParentGate` reads `useSession()`.
2. `signed-out` → `AuthCard` (email + password, and — when creating an
   account — a confirm-password field checked before Firebase is called;
   Create account / Sign in toggle; failures mapped to plain sentences,
   never Firebase codes).
3. On auth: `ensureUser` writes `users/{uid}`; `findChild(uid)`.
   - no child → `needs-child` → `ChildOnboarding` ("What's your child's
     name?", prefilled from the device's name if any) → `createChildProfile`.
   - child found → `adoptChild` binds the name and the journey → `ready`.
   - Firestore unreachable → `trouble` (retry / sign out). Never guesses
     "no child", which would invite a duplicate profile.
4. `ready` → the unchanged `ParentDashboard`, now reading the cloud journey,
   with `AccountRow` (email, sync status, Sign out, Delete account) and
   `BillingRow` (plan, one-word status, what happens next, "Manage
   subscription") inside it. Signing out lives here and only here: the
   child's screens have no account UI at all.
5. Page reload: the hint key starts the SDK immediately; Firebase restores
   the session; status goes `loading → signed-in → ready` with a quiet
   "Opening the parent area…" line in between, no modal, no spinner screen.

## Journey migration (one-time, deterministic)

`bindJourneyToCloud(childId)` waits for the first cloud snapshot, then:

| cloud `journeys/{childId}` | local `kiddo.journey.v1` | result |
| --- | --- | --- |
| exists | anything | **cloud wins**; local cache overwritten; nothing written up; `migration: "cloud"` |
| missing | valid and non-empty | local written to the cloud once; `migration: "migrated"` |
| missing | missing, empty or invalid | stays empty; nothing written; `migration: "empty"` |

Nothing is ever merged. Invalid local JSON is ignored by `parseJourney`.
After migration the device copy is only a cache: every cloud snapshot
overwrites it, and `storage` events from other tabs are ignored while bound.

**Sign-out** clears the cached journey and the cached name from the device,
so a different parent signing in afterwards starts from their own cloud
journey and can never "migrate" the previous child's progress.

## Save status and failures

`useJourneySaveStatus()` is `local | saving | synced | error`. A failed cloud
write keeps the journey on screen (the round really did finish), sets
`error`, and `AccountRow` shows "The latest progress has not reached your
account yet" with a *Try again* button (`retrySave`). The child's screens
never show any of this. The app never claims "saved" until the write
resolved.

## Reset

`ResetProgress` (unchanged dialog) calls `resetJourney()` → `EMPTY_JOURNEY`
is adopted, cached locally, and — when bound — written to
`journeys/{childId}`. The child profile and the parent account are kept.

## Account deletion

> Phase 8C: deletion now goes through `POST /api/account/delete`, which
> cancels the Stripe subscription first. The client path below remains
> as the fallback when that route answers 503. See `docs/kiddo-billing.md`.

`AccountRow` → native dialog → `deleteAccount()`: deletes the journey doc,
the child doc, the user doc, then `deleteUser()` on the auth user. All four
steps are allowed by the rules for the owner, so this is genuine
self-service deletion with no privileged credentials in the client.

Firebase refuses `deleteUser` unless the sign-in is recent (≈5 minutes), so
the backend checks `lastSignInTime` *before* touching any document; a stale
sign-in is reported as "sign out, sign in again, then delete" and nothing is
removed. If Firebase still answers `auth/requires-recent-login` after the
documents are gone (clock skew), the next sign-in lands on onboarding with
an empty account — the data the parent asked to delete is deleted either
way; only the sign-in lingers until they retry. No Admin SDK / Cloud
Function exists yet; none is required for this flow. Server-side cleanup
(e.g. a Cloud Function on auth user deletion) is a Phase 8C nicety, not a
gap.

## Phase 8C additions

Password reset, email verification, the subscription gate and Stripe are
documented in `docs/kiddo-billing.md`. The `CloudBackend` interface grew
`sendPasswordReset / verifyResetCode / confirmPasswordReset /
sendVerification / applyActionCode / reloadUser / watchSubscription /
startCheckout / openPortal`; `users/{uid}` gained a server-owned
`subscription` map.

## Environment

See `.env.example`. Without the Firebase variables the build is
device-only. Values are public client config; security lives in the rules.
