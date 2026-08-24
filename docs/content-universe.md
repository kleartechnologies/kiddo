# The Content Universe

A proposal, and the record of what has since been built from it. Sections 0
and A–E were written when the registry held sixty activities and fifty-six of
them were `choice`; the census in §0 is now re-measured, and the tables in
§B–D are marked with what shipped. Where a recommendation has been carried
out, or deliberately not carried out, it says so in place.

**Built so far** — three content batches:

| Batch | From | What | Where |
| --- | --- | --- | --- |
| 1 | §H.1 | The engine router | `components/games/engines/ChallengeStage.tsx` |
| 1 | §E.1 | `general-knowledge.home-partners` — animals and their homes, as a `connect` | `packs/general-knowledge/habitats.ts` |
| 1 | §E.2 | `english.alphabet-order` — runs of the alphabet, as an `order` | `packs/english/alphabetOrder.ts` |
| 2 | §E.3 | `match.quantity-partners` — numeral ↔ pips | `packs/match/quantities.ts` |
| 2 | §E.6 | `shapes.shape-partners` — a thing ↔ the shape it is | `packs/shapes/realWorld.ts` |
| 2 | §B–D | `match.opposite-partners`, `match.sound-partners` | `packs/match/` |
| 3 | §B–D | Twenty activities — see the batch table in §I | across five packs |
| 3 | §H.5 | Concept tags for Math and English | ten activity files |
| 3 | §H.3 | The `discovery.animal-babies` overlap, decided | `reference/match.ts` |

No engine was added, no `ChallengeKind` was added, and no existing stage was
changed by any of the three. `/playground/mixed` plays one round of all four
interactions in sequence and `/playground/batch` plays the newest content the
same way; both are reference pages, not Quests, and the Quest system has not
been redesigned. §H.2, §H.4, §H.6 and §H.7 are still proposals.

Read `src/lib/content/types.ts` first if you have not: this document assumes its
two axes — `ActivityType` is *what is being learned*, `ChallengeKind` is *how
the child answers* — and every recommendation below is an application of them
rather than a change to them.

---

## 0. What the census actually says

Measured, not estimated. Re-run after the third batch by dealing every activity
at every level it offers, thirty-two seeds deep.

| Pack | Activities | choice | connect | order | match | Atomic facts |
|---|---|---|---|---|---|---|
| math | 13 | 10 | 1 | 2 | – | 1,955 |
| english | 11 | 7 | 2 | 2 | – | 423 |
| logic | 6 | 4 | 2 | – | – | 783 |
| shapes | 14 | 12 | 1 | 1 | – | 290 |
| general-knowledge | 34 | 28 | 4 | 2 | – | 461 |
| match | 4 | – | 4 | – | – | 103 |
| discovery *(reference shelf)* | 4 | 1 | 2 | 1 | – | 39 |
| **total** | **86** | **62** | **16** | **8** | **0** | — |

Sixty activities became eighty-six, and the share that is `choice` fell from
ninety-three per cent to seventy-two. `OrderStage` went from one activity to
eight and `ConnectStage`/`MatchStage` from three to sixteen. The `match` *kind*
still has zero registry activities and still should: a face-down deck cannot say
what the child did wrongly, which is the bar `engine.ts` sets, and `MatchStage`
is a second renderer for `connect` rather than a renderer for `match`.

### What "atomic facts" counts

The column above is not `conceptKey`s. For a `connect` board it is the distinct
`leftId → rightId` links the activity can ever draw — the individual facts, not
the sets of them — and for everything else it is distinct `conceptKey`s. That
distinction is the whole reason the number is quotable: `match.letter-partners`
deals 1,831 different *boards* out of 24 teachable letters, and 24 is the
number that means something to a child.

Two entries in the column are still board counts wearing a concept tag, and are
marked here rather than quietly averaged away:

- `math.comparison` reports 1,140. Its tag names the whole set compared and the
  direction asked — `concept:compare:2-5-9:biggest` — so choosing three numbers
  out of twenty counts as its own idea. The honest editorial figure is "compare
  any two to four numbers up to twenty, either way round".
- `logic.odd-one-out` (309), `logic.patterns` (204) and `logic.sequences` (138)
  are rules over authored tables — six word groups, the pattern grammar, the
  run generator — and their tags name the instance rather than the rule.

Everything else in the table is an authored fact you could point at in a file:
42 ending-sound words, 28 plural nouns, 27 opposite pairs, 24 teachable
letter pairs, 24 habitat facts, 15 animal sounds, 14 relationship pairs, 14
real-world shape facts, 13 baby-animal facts, 10 quantity facts.

### Concept tagging is now complete

Every activity in every subject pack tags its concepts. The four activities on
the Discovery reference shelf do not, and are the only ones that do not, which
is deliberate: they exist to be a sample of a renderer, and nothing counts them
as curriculum. §H.5 is closed.

### The second thing the census says

Group every activity by `ActivityType` and ask how many have more than one way
to play:

```
19 of 57 activityTypes now have more than one kind, up from 4 of 49:

addition          choice(math.addition)            connect(math.sum-partners)
animal-diet       choice(gk.animal-diet)           connect(discovery.animal-food)
animal-habitats   choice(gk.animal-homes)          connect(gk.home-partners)
animal-sounds     choice(gk.animal-sounds)         connect(match.sound-partners)
baby-animals      choice(gk.baby-animals)          connect(gk.animal-babies)
body-parts        choice(gk.body-parts)            connect(gk.body-partners)
community         choice(gk.community-helpers, gk.helper-tools)
                                                   connect(gk.helper-partners)
comparison        choice(math.comparison)          order(math.quantity-order)
counting          choice(math.counting, math.counting-objects, shapes.counting)
                                                   connect(match.quantity-partners)
day-and-night     choice(gk.day-and-night)         order(gk.day-order)
letter-case       choice(english.letter-case)      connect(match.letter-partners)
matching          choice(shapes.matching)          connect(discovery.animal-babies)
number-sequence   choice(math.number-sequence)     order(math.number-order,
                                                         discovery.count-order)
opposites         choice(english.opposites)        connect(match.opposite-partners)
phonics           choice(english.beginning-sounds) connect(english.sound-partners)
shape-recognition choice(shapes.shape-names, shapes.shape-objects)
                                                   connect(shapes.shape-partners)
size-comparison   choice(shapes.size)              order(shapes.size-order)
sorting           choice(logic.sorting)            connect(logic.group-partners)
spelling          choice(english.spelling)         order(english.word-build)
```

This was the most important finding in the original document and it has held.
The brief's core principle — *every learning objective should be able to appear
through multiple ways of play* — needed no new type, no new field and no
migration. `ActivityType` is the join key and it works across pack boundaries:
`match.letter-partners` declares `category: "english"` and
`activityType: "letter-case"`, so a query for "every way to play letter case"
returns both versions today.

The one row that lies is `matching`, and §H.3 now says why and what was decided
about it.

---

## A. The five domains

The brief proposes five. The registry already has five subjects plus two things
that are not subjects. They agree almost exactly, which is the answer to "do not
blindly accept these domains" — the codebase was asked and it said the same.

| # | Domain | Pack | At the proposal | Today | Child-facing framing |
|---|---|---|---|---|---|
| 1 | Letters & Words | `english` | 4 activities | 11 | "Help KIDDO with letters" |
| 2 | Numbers & Counting | `math` | 8 activities | 13 | "Play with numbers" |
| 3 | Shapes, Colours & Space | `shapes` | 11 activities | 14 | "Look closely" |
| 4 | Patterns & Thinking | `logic` | 4 activities | 6 | "Work it out" |
| 5 | The World Around Us | `general-knowledge` | 28 activities | 34 | "Find out about the world" |

And the two that are not domains:

- **`match` is an interaction wearing a pack.** It now holds four activities
  and every one of them declares the subject it belongs to: `letter-partners`
  and `opposite-partners` are `category: "english"`, `quantity-partners` is
  `"math"` and `sound-partners` is `"general-knowledge"`. The first of them
  already declared `activityType: "letter-case"` — it *is*
  English content, shelved by gesture. Left alone, it becomes the template for
  a `connect` pack and an `order` pack, which is the same mistake the challenge
  layer rejects at the level below: keying on interaction rather than subject.
  `packs/match/shared.ts` argues the other side well — that finding differs from
  selecting, and the matching strand is its own skill — and that argument is
  right about the *child's experience* and wrong about the *shelf*. A pack is a
  subject; a kind is already carried on the activity.

  **Recommendation:** fold `letter-partners` into `english`, keep every id
  stable enough that `MATCH_QUEST_PLAN` still names it, and let Match Quest go
  on being a game about pairing that draws from whichever pack has pairing
  content. **This is a decision to make, not one I have made** — it touches a
  deliberate, documented choice by the author, and it is worth ten minutes of
  disagreement before anyone edits a file.

- **`discovery` is the reference shelf** and the registry already says so. It
  holds the smallest honest example of each kind so a seam has something to
  point at. It should never grow into a domain. Its three non-choice activities
  should be *copied into their real packs* as production content and left here
  as samples.

`UPCOMING_THEMES` already names Science, Time, Music and Feelings. None of them
should be built until the five above are deep. Five domains at four ways to play
beats nine domains at one.

---

## B–D. Concepts, ways to play, and the engine that renders each

The table that matters. Every row is a real `ActivityType` already in
`types.ts`. **Engine column is the engine that exists today** — nothing in this
section proposes a new one.

Legend: **●** built and shipped · **○** proposed, buildable now with existing
machinery · **◐** proposed but blocked, see §H or §J · **·** not worth building

### 1. Letters & Words (`english`)

| Concept | choice | connect | order | match | Status |
|---|---|---|---|---|---|
| letter-recognition | ● | · | · | · | the connect version is `sound-partners`, one row down |
| letter-case | ● | ● `match.letter-partners` | · | · | — |
| phonics (beginning sounds) | ● | ● `english.sound-partners` | · | · | 38 picture words ↔ their first letter |
| ending sounds | ● `english.ending-sounds` | · | · | · | 42 words, asked from both ends |
| spelling | ● | · | ● `english.word-build` | · | 42 buildable words |
| alphabet sequence | · | · | ● `english.alphabet-order` | · | — |
| rhyming | · | ● `english.rhyming-partners` | · | · | — |
| plurals | ● `english.plurals` | · | · | · | 28 nouns, `+S` / `+ES` / neither |
| opposites | ● `english.opposites` | ● `match.opposite-partners` | · | · | 27 pairs, one table |
| word-matching | · | ○ word ↔ picture | · | · | still unbuilt — see §J |

### 2. Numbers & Counting (`math`)

| Concept | choice | connect | order | match | Status |
|---|---|---|---|---|---|
| counting | ● | ● `match.quantity-partners` | · | · | numeral ↔ pips, 10 facts |
| number-recognition | ● | ● *(same board)* | · | · | — |
| comparison (more/less) | ● | · | ● `math.quantity-order` | · | smallest group first |
| before / after / between | ● `math.before-and-after` | · | · | · | 19 neighbour facts, 18 between facts |
| addition | ● | ● `math.sum-partners` | · | · | sum ↔ its answer |
| subtraction | ● | · | · | · | the connect form would be the same board |
| number-sequence | ● | · | ● `math.number-order`, `discovery.count-order` | · | — |
| missing-number | ● | · | · | · | the tray version is `number-order` |

### 3. Shapes, Colours & Space (`shapes`)

| Concept | choice | connect | order | match | Status |
|---|---|---|---|---|---|
| shape-recognition | ● | ● `shapes.shape-partners` | · | · | 14 real-world shape facts |
| shapes in the world | ● `shapes.shape-objects` | ● *(same table)* | · | · | — |
| colour-recognition | ● | ◐ thing ↔ its colour | · | · | blocked — §J |
| size-comparison | ● | · | ● `shapes.size-order` | · | three sizes, either direction |
| same-or-different | ● | · | · | · | — |
| classifying / sorting | ● | ◐ things into two baskets | · | · | blocked — §H.2 |
| position (`SceneItem`) | ● | · | · | · | — |
| symmetry | ● | · | · | · | — |
| shape-properties | ● | ◐ shape ↔ number of corners | · | · | blocked — §J |

### 4. Patterns & Thinking (`logic`)

| Concept | choice | connect | order | match | Status |
|---|---|---|---|---|---|
| patterns | ● | · | ○ **place** the missing piece | · | OrderStage — still unbuilt |
| sequences | ● | · | ○ put the run in order | · | OrderStage — still unbuilt |
| odd-one-out | ● | · | · | · | — |
| sorting | ● | ● `logic.group-partners` | · | · | the six word groups, joined not picked |
| relationships | · | ● `logic.pair-partners` | · | · | 14 things-used-together facts |
| memory | · | · | · | ○ the deck Memory Match already draws | needs registry work — §H.4 |

### 5. The World Around Us (`general-knowledge`)

Thirty-four activities — twenty-eight choice, four connect, two order — and the
richest `PictureItem` library in the codebase, which is what made it the
cheapest domain to give a second way to play.

| Concept | choice | connect | order | match | Status |
|---|---|---|---|---|---|
| animal-habitats | ● | ● `gk.home-partners` | · | · | 24 habitat facts |
| animal-diet | ● | ● `discovery.animal-food` | · | · | — |
| baby-animals | ● | ● `gk.animal-babies` | · | · | 13 facts; the authoritative one — §H.3 |
| animal-sounds | ● | ● `match.sound-partners` | · | · | 15 facts |
| food-origins | ● | ○ food ↔ where it comes from | · | · | still unbuilt |
| community-helpers | ● | ● `gk.helper-partners` | · | · | 10 facts |
| body-parts / senses | ● | ● `gk.body-partners` | · | · | 9 facts |
| life cycles | · | · | ● `gk.life-cycles` | · | 6 runs — §J on the two that are missing |
| seasons | ● | · | ○ round the year | · | still unbuilt |
| day-and-night | ● | · | ● `gk.day-order` | · | — |
| transport | ● | ○ vehicle ↔ land/sea/sky | · | · | still unbuilt |

---

## E. What to build first

Ranked. The ranking rule is **fun per line of new machinery**, and every one of
the six needs zero new machinery: each is a second way to play an objective that
already has a first way, so the content is new and nothing else is.

Each is written with its *purpose*, per the brief's §11 fun test — the child is
given a job, not a question.

**1. `general-knowledge.animal-homes` (connect)** — *"Can you put the animals in
their homes?"*
The single most fun activity available. `packs/general-knowledge/habitats.ts`
already holds every animal and every habitat as `PictureItem`s; this is a
generator over data that exists, rendered by an engine that exists. It is also
the clearest possible demonstration of the whole thesis — the same twenty-four
facts that are currently a quiz become a job.

**2. `english.alphabet-order` (order)** — *"Help KIDDO line up the letters."*
`OrderStage` is the most under-used asset in the repo — a full drag, tap and
keyboard engine serving one reference activity. Alphabet runs (`D E _ G`) are
the most natural order content in early years, and `packs/english/shared.ts`
already has the letter cards.

**3. `math.quantity-partners` (connect)** — *"Which treasure belongs here?"*
Numeral ↔ pips. `CountItem` exists for exactly this. Teaches the single most
important idea in early maths — that the symbol *4* and four things are the same
thing — which a choice board can only ever test.

**4. `logic.pattern-finish` (order)** — *"Help KIDDO finish the pattern."*
The brief calls this out by name. Today `logic.patterns` asks the child to pick
what comes next; this has them *place* it. Same rule, same generator shape, and
the difference between answering and doing.

**5. `math.count-order` (order)** — promote `discovery.count-order` into `math`.
Nearly free: the activity is written and tested, it is simply shelved on the
reference shelf where no child meets it. Copy it into the pack, leave the
sample.

**6. `shapes.shape-partners` (connect)** — *"Who could be its friend?"*
Object ↔ shape. Bridges Shapes and the World: a plate is a circle, a door is a
rectangle. Uses `ShapeItem` and `PictureItem` side by side, which nothing does
yet.

**Do 1 and 2 first, then stop and play them.** They exercise the two starved
engines with real content and will tell us more about the fun test than the
other four combined.

*Done — all six.*

1. Shipped as `general-knowledge.home-partners`. `animal-homes` was already
   taken by the choice activity that reads the same table, and the two now
   share one `activityType`, which is this document's thesis in one file.
2. Shipped as written.
3. Shipped as `match.quantity-partners` rather than `math.quantity-partners`,
   because the four pairing activities are shelved by gesture and each carries
   the subject it belongs to on the activity. Its level-one board allows one
   neighbouring pair; `packs/match/quantities.ts` explains why forbidding them
   outright would mean a level that deals exactly one board forever.
4. Not shipped, and no longer recommended in this form. `logic.patterns` asks
   the child to pick what comes next; placing it would be the same rule with a
   tray, and the tray adds a gesture rather than an idea. The order engine got
   `math.number-order`, `english.word-build`, `shapes.size-order`,
   `general-knowledge.day-order` and `general-knowledge.life-cycles` instead,
   which are five runs a child could not read off the board.
5. Shipped as `math.number-order`, written rather than promoted:
   `discovery.count-order` orders numerals and the pack version orders groups
   of things, so the reference stayed a reference.
6. Shipped as `shapes.shape-partners`, sharing its fourteen facts with
   `shapes.shape-objects` — the same table asked as a choice and as a board.

---

## F. What NOT to build yet

- **A fifth `ChallengeKind`, or any new engine.** Nothing in §B–D needs one.
  `engine.ts` sets the bar — a new kind is justified only when no existing kind
  can express what the child did *including expressing it wrongly* — and every
  proposal above clears it with an existing kind.
- **`BuildStage`.** The brief mentions building a rocket and constructing
  quantities. It is the one idea here that genuinely needs a new kind, and
  `engine.ts` already says so. It is also the largest single piece of work in
  the roadmap. Not until the four existing kinds are full.
- **`FindStage`.** Tempting — "find all the A's" is `choice` with a different
  layout, so it is a renderer and not a kind, and it would instantly make all
  sixty-two choice activities playable a second way. Held back for one reason:
  Find It already exists as a game with its own board, and building `FindStage`
  before deciding what happens to Find It creates two answers to the same
  question. Decide that first (§H.4). **This is the highest-value item in
  the "not yet" list and should be the next proposal after this one.**
- **Sorting into baskets.** Blocked by the validator, not by taste. §H.2, §J.1.
- **A full Calm Mode.** §L — most of it already exists.
- **New domains** (Science, Time, Music, Feelings).
- **Any scoring, lives, timers, XP, streaks or leaderboards.** Unchanged.

---

## G. Where the architecture is already sufficient

Genuinely sufficient — verified, not assumed:

1. **`ActivityType` as the cross-pack join key.** Already works, already proven
   four times. "Every way to play letter case" is
   `findActivities({}).filter(a => a.activityType === "letter-case")` today.
2. **Four `ChallengeKind`s.** Cover every proposal in §B–D.
3. **`ContentItem`.** `PictureItem`, `ShapeItem`, `SceneItem`, `CountItem`,
   `TextItem`, `NumberItem`, `SwatchItem` and `CharacterItem` cover every
   proposed activity without a new member.
4. **`checkStep` / `checkAnswer`.** Multi-move gestures were solved when
   `connect` was written; `order` and `match` are already answered there for
   engines that do not exist yet.
5. **`SessionPlan`.** A slot's `from` is a list of activity ids and says nothing
   about kind, so a round that mixes a connect board and a choice question is
   already expressible *in the content layer*. (What cannot render it is a game
   — see gap 1.)
6. **`defineGeneratedActivity`.** Every activity above is a rule over existing
   data. New content is a file and one line in a pack index.
7. **Determinism.** `Rng`, seeded draws, and the no-`Math.random` rule hold for
   everything proposed.
8. **Accessibility.** `labelOf` / `captionOf` / `spokenOf` already encode the
   hard-won rule that a picture's name goes in the accessible name and not under
   the tile. Every new `PictureItem` activity inherits it.

---

## H. Genuine architectural gaps

Seven, in priority order. Sizes are estimates.

### 1. No engine router — mixed rounds cannot be rendered *(~20 lines)* — **built**

Every game imports exactly one stage: the five Quests import `ChoiceStage`,
Match Quest imports `MatchStage`. So although the content layer can deal a
mixed round, no game can draw one, and the brief's "different children should be
able to play differently" cannot reach a child.

The fix is not an engine. It is a dispatcher on `payload.kind`:

```tsx
// components/games/engines/ChallengeStage.tsx
switch (challenge.payload.kind) {
  case "choice":  return <ChoiceStage  … />
  case "order":   return <OrderStage   … />
  case "connect": return <ConnectStage … />   // or MatchStage, by preference
  case "match":   return null                 // no renderer yet
}
```

**This is the single highest-value piece of glue in the roadmap.** It is what
turns "one objective, many ways to play" from a fact about the data into
something the child experiences — and it is what a future Calm Mode or
preference setting would switch on. It is also where a child who prefers pairing
gets pairing.

**Built**, as `ChallengeStage.tsx`, and smaller than the sketch: a union of the
four stages' own props and three type predicates, with no `match` case at all —
leaving the kind out of the props union means a `match` challenge is a compile
error rather than the `null` above, which is a blank board a child would meet.
`/playground/mixed` is the proof it renders a mixed sequence.

### 2. Buckets are forbidden by the validator *(a decision, then ~10 lines)*

`validateChallenge` requires, for `connect`, that no left node is in two pairs
and no right node is in two pairs. Sorting five things into two baskets is
five links landing on two right-hand nodes, so **it fails validation today.**
`engine.ts` speculates that a bucket is "simply a right-hand node several
left-hand nodes point at" — the validator disagrees, and the validator is the
one that runs.

This is a real, contained gap and the rule is correct as written for two-column
boards. Either relax it per-payload (a `buckets: true` flag), or accept that
sorting stays `choice`. Worth a decision; not worth guessing.

### 3. `discovery.animal-babies` overlaps a real pack — **decided**

It declares `activityType: "matching"`, so it joins `shapes.matching` — "find
another one like this" — rather than `general-knowledge.baby-animals`, which is
the same objective. The original recommendation was to retype it
`"baby-animals"`. That is not what was done, and the reason is the overlap
underneath the label rather than the label itself.

**The decision: `general-knowledge.animal-babies` is the authoritative
baby-animals activity, and `discovery.animal-babies` stays a renderer sample.**

- General Knowledge holds thirteen animal-to-baby facts against the reference's
  seven, levels the board by how familiar a baby's *name* is, and sits in a
  subject a child reaches from the home screen. If the lesson grows, it grows
  there.
- The reference stays because `look: "cards"` needs a sample, and a renderer
  with nothing minimal to point at is a renderer nobody can read. Seven
  families is the smallest table that makes a five-pair board vary, which is
  all a reference activity is for.
- It keeps `activityType: "matching"` rather than becoming a third
  baby-animals row. Retyping it would put a shelf sample in the results of
  "every way to play baby animals" beside two real activities, which is a worse
  lie than the one being fixed. The right repair is for the `waysToPlay` helper
  of §H.6 to exclude the reference shelf when it is written; until it exists,
  nothing queries either field.

Duplicated *content* would have been the problem. A duplicated *sample of an
engine* is what a reference shelf is. `reference/match.ts` and `registry.ts`
both carry this in place.

### 4. Two content islands: Find It and Memory Match

Both predate the content layer and neither uses it. `lib/games/findIt.ts` has
its own item union with its own `label`/`accent`; `lib/games/memory.ts` has its
own deck. Consequences: the `match` kind has zero content, `MatchPayload` has no
renderer, and none of the eighty-six activities in the registry can be played as
a find or a memory game.

Not a bug — both games work and both were built first. But they are the reason
`FindStage` is held back in §F, and bringing them onto `Challenge` would be the
largest single content multiplier available after §E. Deserves its own proposal.

### 5. Math and English do not tag concepts — **closed**

They inherited `challengeKey`, so their reported concept counts were board
counts: `english.beginning-sounds` reported 5,463 ideas and `math.comparison`
1,849. Ten activities were tagged in the third batch — counting,
number-recognition, comparison, number-sequence, missing-number and pattern in
Math; letter-recognition, letter-case, beginning-sounds and spelling in English
— and every activity written since tags its own.

Every activity in every subject pack now carries a `concept:` tag on every
board it deals. The four on the Discovery reference shelf do not, deliberately,
and are the only exceptions. Two tags name an instance rather than a rule and
so still over-report; §0 names them.

### 6. No `waysToPlay` helper *(~5 lines)*

`findActivities` filters by `packId`, `category`, `kind`, `level` and `age` —
but not by `activityType`, which is the field the whole multi-way model turns
on. Add it to `ActivityFilter`, and add:

```ts
export function waysToPlay(type: ActivityType): Activity[]
```

Five lines over machinery that exists, and it makes the model queryable instead
of implicit.

### 7. Nothing holds KIDDO to being the host *(editorial, not architectural)*

`Prompt.speech` is free text per challenge, and the existing content is honest
but flat: "Which one is a rabbit?" rather than "Can you help me find the
rabbit?" There is nothing to fix in the types — a purpose is writing, not a
field. What is missing is a written voice rule beside the content, and the six
activities in §E should be where it is set. Worth adding to
`packs/*/shared.ts` as a comment rather than as machinery.

---

## I. The third batch, in one table

Twenty activities, no new engine, no new `ChallengeKind`, no change to an
existing stage. Every one is a rule over an authored table, and every table has
a test that re-derives the activity's promises from it.

| Pack | Activity | Kind | The idea | Facts |
|---|---|---|---|---|
| math | `before-and-after` | choice | the number before, after, or between two others | 19 + 18 |
| math | `sum-partners` | connect | a sum joined to its answer | number bonds to 20 |
| math | `quantity-order` | order | smallest group of things first | 30 runs |
| english | `ending-sounds` | choice | the sound a word finishes on | 42 words |
| english | `sound-partners` | connect | a picture joined to its first letter | 38 words |
| english | `word-build` | order | letters dragged into a word | 42 words |
| english | `plurals` | choice | one, and more than one | 28 nouns |
| english | `opposites` | choice | the other half of a pair | 27 pairs |
| logic | `group-partners` | connect | words joined to the group they belong to | 6 groups |
| logic | `pair-partners` | connect | things that are used together | 14 pairs |
| shapes | `shape-objects` | choice | the shape a real thing really is | 14 facts |
| shapes | `shape-partners` | connect | the same fourteen facts, as a board | 14 facts |
| shapes | `size-order` | order | smallest to biggest, either way round | 3 sizes × shapes |
| general-knowledge | `helper-partners` | connect | a helper joined to their tool | 10 facts |
| general-knowledge | `body-partners` | connect | a sense joined to its body part | 9 facts |
| general-knowledge | `day-order` | order | morning through to night | 4 parts |
| general-knowledge | `life-cycles` | order | how a living thing grows | 6 runs |
| match | `quantity-partners` | connect *(cards)* | a numeral paired with that many pips | 10 facts |
| match | `opposite-partners` | connect *(cards)* | opposites paired, from English's table | 27 pairs |
| match | `sound-partners` | connect *(cards)* | an animal paired with the noise it makes | 15 facts |

Five choices, ten connects and five orders — deliberately the opposite of the
registry's shape, because the two starved engines were the point. Registry-wide
the balance moved from 93% choice to 72%.

Two of the twenty share their table with an activity that already existed, on
purpose: `match.opposite-partners` reads `english/opposites.ts` and
`match.sound-partners` reads the animal table in
`general-knowledge/animals.ts`. That is the multi-way model working — one set
of facts, two gestures — and not duplicated content.

---

## J. Objectives that do not fit the answer model

Written down rather than worked around. Each is a real learning objective that
was designed during a batch and then cut, because making it fit would have
meant either lying to `validateChallenge` or building a board a child could be
right about and be told no.

**1. Sorting into baskets.** Five things landing on two baskets is five links
onto two right-hand nodes, and `validateChallenge` requires a `connect` board
to be a bijection. This is §H.2 and it is the largest of the group: it blocks
`logic.sorting` and `shapes.classify` from ever having a second way to play,
and a basket is the most natural early-years gesture there is. *Requires: a
content-model decision — either a per-payload `buckets` flag or a fifth kind.*

**2. Colour names as a connect board.** Joining things to their colour needs a
palette where no two colours could be argued for the same object. KIDDO's
accents are a mutual trio at the readable end — the rest shade into each other
under a child's eye and under a phone's screen — so a four-line board would
have to reach for a colour the design system does not have. The choice version
stays the only honest one. *Requires: palette work, not engine work.*

**3. Shape ↔ number of corners.** Only three corner counts are usable — three,
four and six — because a circle has none in a way a five year old will argue
about and the shapes with five, seven or eight are not in the item set. Three
usable values cannot make a four-line board, and a three-line board deals one
arrangement. *Requires: more shapes in `ShapeItem`.*

**4. A four-card size order.** `ShapeSize` has three members, so
`shapes.size-order` tops out at three cards, which makes level 3 a change of
direction rather than a change of length. *Requires: a fourth `ShapeSize`.*

**5. Invariant plurals.** SHEEP and FISH are the plurals a child gets wrong
longest, and `english.plurals` cannot ask them: the board offers three word
tiles and the answer would be the tile that is identical to the prompt, which
reads as a trick. *Requires: a prompt form that can ask "is this one already
right?" — a content-model question, not a table one.*

**6. Butterfly and frog life cycles.** The two most-taught cycles in early
years, and neither is in `general-knowledge.life-cycles`, because a caterpillar
and a chrysalis and a tadpole and a froglet have no emoji that reads as the
right stage at tile size. Rule 8 of the content brief — no emoji that does not
accurately represent the concept — cuts them. *Requires: drawn artwork, which
is a `PictureItem` question the codebase has deliberately not opened.*

**7. `vehicles` on a group-name tile.** `logic.group-partners` puts a group's
name on a tile, and the vehicles group has no honest one-word name a child can
read — CARS would fit and would be a lie, because a bus is not a car. The group
is simply never dealt to a board that needs a tile name.
`packs/logic/words.ts` says so where the field is declared. *Requires: nothing;
this is the right answer.*

**8. `word-matching` has no activity.** The `ActivityType` exists in
`types.ts` and nothing declares it. Word ↔ picture is buildable today with
`ConnectStage` and would be a good batch-four candidate; it is listed here so
the unused member is understood as a plan marker rather than dead code, which
is the file's existing convention — `vocabulary` and `memory` are the same.

---

## K. What the Quests do not yet deal

Every Quest renders `ChoiceStage` and only `ChoiceStage`, so a pack's connects
and orders are unreachable from the games even though `/playground/mixed` and
`/playground/batch` play them. Widening a round is a change to a game, and
these batches changed the library. Recorded so the gap is a decision rather
than an oversight:

Measured by comparing each pack against the activity ids its plan names.

| Quest | In the pack | Named by the plan | Not named |
|---|---|---|---|
| Math | 13 | 8 | `counting-objects`, `before-and-after` *(choices)*; `quantity-order`, `number-order` *(orders)*; `sum-partners` *(connect)* |
| English | 11 | 4 | `ending-sounds`, `plurals`, `opposites` *(choices)*; `alphabet-order`, `word-build` *(orders)*; `sound-partners`, `rhyming-partners` *(connects)* |
| Logic | 6 | 4 | `group-partners`, `pair-partners` *(connects)* |
| Shapes & Colours | 14 | 11 | `shape-objects` *(choice)*; `size-order` *(order)*; `shape-partners` *(connect)* |
| General Knowledge | 34 | 28 | `life-cycles`, `day-order` *(orders)*; `animal-babies`, `home-partners`, `helper-partners`, `body-partners` *(connects)* |
| Match | 4 | 1 | `quantity-partners`, `opposite-partners`, `sound-partners` — all three renderable by the stage the game already imports |

Six of the unreachable activities are `choice` boards that a plan slot could
name today — `math.counting-objects`, `math.before-and-after`,
`english.ending-sounds`, `english.plurals`, `english.opposites` and
`shapes.shape-objects` — and Match Quest's three are renderable by the stage it
already imports. Those nine are the cheapest game work available and none of it
is content work.

The rest wait on a Quest that can hold more than one interaction, which is what
the router of §H.1 made possible and what no game has yet asked for.

`tests/shapesColoursQuest.test.ts` and `tests/generalKnowledgeQuest.test.ts`
both assert their pack's unreachable list by name, so the day a new activity is
written and nobody decides where it is played, a test fails.

---

## L. Calm Mode: mostly already here

Checked before proposing anything, per the brief.

| Calm Mode wants to reduce | Today |
|---|---|
| music | ✅ `AudioSettings.music`, capped at `MAX_MUSIC_VOLUME` |
| sound effects | ✅ `AudioSettings.effects` |
| all sound | ✅ `AudioSettings.muted` |
| background animation | ✅ `MotionProvider` sets `reducedMotion="user"` product-wide |
| transition speed | ⚠️ per-game timing constants (`MATCH_QUEST_TIMING` and friends) |
| celebration intensity | ❌ no dial |
| visual clutter | ❌ no dial |

So roughly two thirds exists, and the missing third is not hard — but it should
not be built now. When it is, the shape to copy is `lib/audio/settings.ts`
exactly: one versioned `localStorage` key, a total `normalize` that takes
`unknown`, per-field fallback, and a `try/catch` around storage. That module is
the house pattern for a preference and a Calm Mode should be its sibling
(`kiddo.calm.v1`), not a rewrite of it.

The one thing worth doing *now*, because it costs nothing and is expensive to
retrofit: when the six activities in §E are written, keep celebration and
transition timings as **named constants** rather than inline numbers, so a
future Calm Mode has something to turn down.

---

## M. The fun test, applied honestly

The brief's question is whether a five-to-eight year old would want to do it
again. Applied to what exists:

- **Would they replay Match Quest?** Probably yes. It is the only game in the
  set with a job rather than a question, and it is not a coincidence that it is
  the only one not built on `ChoiceStage`.
- **Would they replay the five Quests?** Honestly: some children, some of the
  time. They are well made, the content is deep and the artwork is good — and
  they are all the same gesture. A child who does not enjoy *picking* has
  nothing else in KIDDO to do.

That is the case for this whole document. The gap between KIDDO now and KIDDO
fun is not more subjects, more polish or more engines. It is that ninety-three
per cent of a large, careful, well-architected content library can only be
touched one way.

**The goal is not "how many games can we build". It is "how many different ways
can KIDDO make a child want to learn" — and the architecture answered that
question correctly a long time ago. The content has not caught up yet.**

---

## N. What a browser measured, and the one thing it found

Every engine and every content path this batch touched was measured in headless
Chrome at seven viewports, from a 360×640 phone to a 1440×900 desktop.

| Suite | Page | Result |
|---|---|---|
| `measure` | `/playground/connect` | levels 2 and 3, seven viewports — no overflow, no overlaps, min node 140×48 ✓ |
| `measure:order` | `/playground/order` | levels 1 and 3, seven viewports — no overflow, every tile ≥48px, drag + keyboard + refusal + reduced motion ✓ |
| `measure:match` | `/playground/match` | levels 1 and 3, seven viewports — no overflow, five pairs on a 360px phone, keyboard + refusal + reduced motion ✓ |
| `measure:mixed` | `/playground/mixed` | 7/7 boards, 4/4 interactions, handover, keyboard, reduced motion, full play-through, language ✓ |
| `measure:batch` | `/playground/batch` | 20/20 boards drawn and 4/4 interactions at every viewport, 0 console problems, no overlaps, no clipping, min touch ≥48px everywhere ✓ |

### The one thing it found: a tall choice board scrolls on the shortest phone

At 360×640 some level-3 boards push the page past a screen — worst on the batch
page, where step 1 (`shapes.shape-objects`, four 154px tiles under a picture)
overflowed by 150px.

This is not something the batch introduced, and it was worth proving rather
than assuming. `/playground/mixed` was temporarily re-levelled to 3 and
re-measured: `general-knowledge.animal-homes` — content that predates this
batch, also four tiles at 154px — overflowed by 48px in exactly the same way.
A tall `choice` board on the shortest phone has always scrolled. The round was
put back to its own levels afterwards.

The remaining 102px is the reference page's own furniture. Measured directly:

| Page | Round strip | Steps | Page overflow at 360×640 |
|---|---|---|---|
| `/playground/mixed` | 62px | 7 | 48px |
| `/playground/batch` | 164px | 20 | 150px |

A twenty-step strip wraps to three rows on a phone and eats 102px that no game
spends — `MixedPlayground` was built for a round a child plays, and the batch
page asks it to hold a contents page. The 102px difference between the two
pages is exactly the 102px difference between the two strips.

The same measurement explains the batch page's `handover: choice → choice →
choice ✗`. The behaviour checks run at 360×640 and click at viewport
coordinates; with 150px below the fold the bottom row of step 1 is not on
screen, so the harness never answered the first board. At `/playground/mixed`'s
48px, the same three engines hand over correctly at level 3 — `choice →
connect → order ✓`, with keyboard, reduced motion, a full play-through and the
language check all passing. That run is the behaviour proof; the batch page's
job is coverage, and it drew all twenty boards at all seven sizes.

Neither finding is content work. Making a four-tile picture board fit a 640px
phone is a `ChoiceStage` layout question, and shortening the strip is a
dev-page question. Both are named here so the next batch that opens
`ChoiceStage` knows what to measure.

### `scripts/measure-mixed.mjs` learned to count

The script had `const STEPS = 7` written into it, so pointed at a twenty-board
round it measured the first seven and reported `3/4 interactions ✗`. It now
asks the page how long its round is on the first visit. The change is to the
measuring tape, not to anything measured.
