# KIDDO Adaptive Play — Phase 11

Easy → Medium → Hard on every world door, without a second progression
system, a point, or a timer. This note is the audit that came first, the plan
that came out of it, and the record of what shipped.

## The audit (done before any code was written)

**Difficulty already exists in the content model and nowhere else.** Every
challenge is dealt by `generate({ level, rng })`; `SessionSlot.level` carries
the level into the deal (`session.ts` → `drawChallenges` → `resolveLevel`).
78 of 86 activities offer levels [1,2,3]; `math.counting` and
`math.number-recognition` stop at 2; six activities start at 2. Levels change
the *challenge*, not the length: pool width (rhymes 12 → 29 → 41), pair/tile
counts (sound-partners 3/4/5 lines, most quizzes 3 → 4 tiles), numeric
ceilings (counting 1–5 → 4–10 → 6–10, sums 5/10/20), question direction
(phonics unlocks "Which word starts with B?" at L2), guaranteed hard content
(every L3 rhyming board holds a sound-only rhyme; L3 counting deals pip
blocks), and the illustration scaffold that belongs to L1 only. That is
exactly the brief's definition of harder — reasoning, distractors, reduced
scaffolding — already authored and already test-pinned.

**Progression is two fields.** `Journey = { completed, last }` under
`kiddo.journey.v1`; `completed` is an ordered list of door ids and everything
on every screen is derived from it. No level appears anywhere in it. Five
places hardcode the shape: `parseJourney` (drops unknown fields), the
Firestore write, `firestore.rules` `onlyKeys(['completed','last','updatedAt'])`,
the rules test (asserts an extra key fails), and two measure scripts. Cloud
is cloud-wins-never-merge, test-pinned. Reset is `update(EMPTY_JOURNEY)`.

**A door is a plan.** Each of the nine `WorldActivity` doors bakes one
`SessionPlan` with fixed slot levels; `WorldActivityGame` line 46
(`useGeneralKnowledgeQuest(activity.plan)`) is the single seam where a
difficulty choice can enter. Nothing is locked today; `done | next | new`
per door, all doors always playable, replays celebrated.

**The UI pattern already exists.** Three dev playgrounds share a working
level picker: `aria-pressed` toggle buttons, `min-h-11 min-w-11` (the 44px
rule `polish.test` enforces). `Celebration` is fully parameterizable
(title, message, reward, next) and triggered by `GameShell` on
`status === "complete"`.

**Naming trap:** the content `Level` type is 1–5 ("Medium" is
`LEVEL_LABELS[3]`); only 1–3 is ever authored. The child-facing words
Easy/Medium/Hard are a new three-step vocabulary (`Tier`), never
`LEVEL_LABELS` and never the dead `difficultyOf`.

## The plan

1. **Tier is a dimension of the door, not a new store.**
   `Tier = 1 | 2 | 3`, words Easy / Medium / Hard. A door's tier plans live
   beside the door: `WorldActivity.plans = { 1: easy, 2: medium, 3: hard }`,
   each a `SessionPlan` whose slots honestly name levels the activities
   offer (the existing journey test enforces honesty). Same slot count per
   tier — harder is never longer.
2. **Schema: two new arrays on the same key.**
   `Journey = { completed, medium, hard, last }`. `completed` keeps its
   exact meaning (door finished at least once — which *is* Easy done), so
   every existing journey migrates by definition: old data reads as "Easy
   done, Medium unlocked". `parseJourney` validates the new arrays the way
   it validates `completed`; missing fields default to `[]` (the explicit,
   tested migration). Derived and unchanged: `statusOf`, `worldProgress`,
   `stickersOf`, `continueTarget`, keepsakes, reset, cloud-wins.
3. **Unlocks are derived, deterministic:** Medium open iff the door is in
   `completed`; Hard open iff in `medium`. Nothing ever locks again;
   every finished tier stays replayable.
4. **Persistence:** extend the Firestore write, `firestore.rules`
   `onlyKeys` + list checks, and the rules test. Preview cloud stores whole
   objects and needs nothing.
5. **UI:** a `TierPicker` on the door's intro (three ≥48px buttons,
   ✓ / → / 🔒 as visual states, labels "Easy. Completed." / "Medium.
   Unlocked." / "Hard. Locked."), the picked tier selecting the memoised
   plan. After finishing a tier that unlocks the next, the celebration's
   next-step is "Ready for a bigger challenge?" into that tier, with
   tier-flavoured celebration copy (Easy "You found it!" · Medium "That was
   tricky!" · Hard "Wow! You figured it out!"). World-page doors show the
   three tier marks; parent dashboard gains one factual line per door
   ("Completed Easy and Medium." — never "mastered").
6. **No new engine, shell, store, route, or animation**; the picker is the
   only new component.
7. **Tests:** unlock ladder, replay, reset, parse-migration, cloud
   migration/wins with tiers, rules shape, per-tier plan honesty and
   dealability, tier plans meaningfully harder (slot levels non-decreasing
   across tiers, strictly greater somewhere).
8. **Measurement:** extend `measure-journey` — picker present and ≥44px,
   locked state announced, Easy → Medium → Hard progression driven in a real
   browser, replay allowed, celebration shown, reduced motion, all existing
   checks untouched.

## What shipped

The plan above landed whole; the record below is where each piece lives and
the two decisions that were made during the build.

- **Tier plans** — `activities.ts`: `Tier`, `TIERS`, `TIER_WORDS`, and
  `plans: { 1, 2, 3 }` per door, with `plan` kept as an alias for `plans[1]`
  so every Easy round is byte-for-byte the round that shipped before tiers.
  Slot counts are equal across a door's tiers. `english.alphabet-order` and
  `english.word-build` turned out to deal `order` boards at L3 — a kind the
  door rounds cannot play — so the alphabet and word doors draw their harder
  tiers from letter-case, ending-sounds, sound-partners and spelling instead
  (the per-tier dealability test now guards this for good).
- **Journey** — `journey.ts`: `medium` and `hard` arrays beside `completed`
  (same key, same parser distrust), `tierCompleted` / `tierUnlocked` /
  `tierStateOf` / `suggestedTier` / `markCompletedAt`. `markCompleted`
  delegates to tier 1. `useJourney.ts` gains `recordCompletedAt` and checks
  the tier lists when deciding whether a local journey is worth migrating.
- **Persistence** — `backend.ts` writes both arrays; `firestore.rules`
  accepts them as *optional* lists (≤200), so a device that has not updated
  still writes the old two-field shape: migration by shape, in both
  directions, with no second document and no second key.
- **Selection** — `TierPicker.tsx` (the one new component): three ≥48px
  `aria-pressed` buttons labelled "Easy. Completed." / "Medium. Unlocked." /
  "Hard. Locked.", lock announced via `aria-disabled`, never colour alone.
  `WorldActivityGame` shows it on the way in once Medium is unlocked (a
  fresh door keeps its one-button intro) and again inside the celebration as
  the "Ready for a bigger challenge?" invitation whenever the finished round
  just opened the next size. Switching tier hands the quest the other plan;
  the quest re-deals from its own effect — no restart plumbing.
- **Two timing decisions.** The active tier is *derived* from the journey
  (`chosen ?? suggestedTier(journey, id)`) until the child commits by
  starting a round or picking a size, at which point it becomes state — so
  server and first client paint agree on Easy (hydration-safe) and the
  journey moving mid-round can never change the round under the child. And
  the completion write is guarded by a ref keyed to the completion, not by
  effect deps — choosing Medium from the celebration changes the active tier
  while the finished round is still on screen, and that must never record a
  finish for a tier that was not played.
- **World page** — a finished door wears three small tier marks
  (`data-door-tiers`), and its link's label reads them out; an unfinished
  door keeps a clean face — a fresh world is an invitation, not a wall of
  padlocks.
- **Parents** — `conceptsOf` walks every tier's plan and only claims a
  lesson once a tier that deals it was finished; `tiersLabel` says
  "Completed Easy and Medium." on the recent rows. Facts, never mastery.

## What deliberately did not change

- No XP, points, coins, streaks, lives, timers, leaderboards, or scores —
  the journey still counts nothing but doors.
- `completed`'s meaning, order, and every function derived from it.
- The cloud merge rule (cloud wins, never merges) and the reset gesture.
- The quest plans on /play — their 3-5-2 in-round ladder already ramps a
  mixed round and is a different thing from a chosen tier.
- The engines, `GameShell`, `GameWorld`, MagicMotion, and the art system.
