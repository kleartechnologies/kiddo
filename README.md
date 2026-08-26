# KIDDO

**Play. Learn. Smile.**

A small, safe web play world of bite-sized games for children aged roughly 4–8.
This repository is the foundation build: the design system, the KIDDO character
system, the reusable game shell, and a working KIDDO World prototype. Memory
Match, Find It, Math Quest, English Quest, Logic Quest and Shapes & Colours
Quest are fully playable.

KIDDO is a standalone product. It shares no code, branding, assets,
configuration or infrastructure with anything else.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run lint     # eslint
npm test         # node --test, no test framework installed
npx tsc --noEmit # typecheck
```

Requires Node 20.9+. Next.js 16 (App Router, Turbopack), React 19,
TypeScript, Tailwind CSS v4, Framer Motion, Lucide.

Content is local TypeScript data. The only backend is optional: a parent may
create an account (Firebase Authentication) so the child's journey is kept
in Cloud Firestore and follows them between devices. Without the
`NEXT_PUBLIC_FIREBASE_*` variables (see `.env.example`) KIDDO runs
device-only, with progress in `localStorage`. See `docs/kiddo-accounts.md`.
Firestore rules are tested with `npm run test:rules` (needs Java).
KIDDO is a paid subscription (Phase 8C): the parent pays through Stripe
Checkout, a signed webhook writes the entitlement to Firestore, and the
child's pages open only with an active subscription. Secrets live in
server-only variables (see `.env.example`); see `docs/kiddo-billing.md`.

KIDDO speaks English and Bahasa Melayu, all the way down: the landing page,
the money screens, the parent area, and the questions, hints and explanations
inside the games. Interface strings live in `src/lib/i18n/messages` (missing a
translation is a compile error); the words inside a dealt question are
localized by `src/lib/content/i18n` from a lexicon and a sentence book. Ids,
answers, seeds and progress are never translated, so changing language
mid-round changes the words and nothing else. See
`docs/kiddo-localization.md`, and `docs/kiddo-malay-review.md` for the Malay
strings still awaiting a native Malaysian speaker's review.

## Routes

| Route             | What it is                                                    |
| ----------------- | ------------------------------------------------------------- |
| `/`               | **Landing page** — the parent-facing front of KIDDO (Phase 7) |
| `/play`           | **KIDDO World** — the child's home screen and world chooser   |
| `/play/[gameId]`  | A game, rendered inside `GameShell`. All six games are playable |
| `/worlds/...`     | The three worlds and their activities                         |
| `/parents`        | The parent area: the child's journey, name and reset          |
| `/privacy`        | What KIDDO stores, in plain words. Linked from `/` and `/parents` |
| `/character`      | The KIDDO character specification. Internal, not linked       |
| `/playground`     | Internal design-system reference. Not linked from the product |

## How it is organised

```
src/
  app/                     routes only, thin
  components/
    character/             the mascot itself: rig, expressions, poses, canon
    ui/                    Button, Card, Chip, Screen — generic primitives
    kiddo/                 branded pieces: characters, game cards, celebration
    games/                 GameShell, the challenge engines, the games
    dev/                   internal reference pages, deletable
  data/
    games.ts               the catalogue
    characters.ts          KIDDO & Friends
  lib/
    accents.ts             accent family -> Tailwind classes
    motion.ts              shared animation conventions
    games/                 types, session state, each game's rules
    content/               challenges, activities, packs, the registry
tests/                     node --test, run against src directly
public/
  characters/ games/ icons/ sounds/ illustrations/
```

Each `public/` folder has a README explaining what belongs in it.

### Design tokens

All colour, type, radius, shadow and easing live in `src/app/globals.css` under
`@theme`. Components reach for tokens (`bg-sun-base`, `rounded-card`,
`font-display`), never raw hex.

Six accent families, one per member of the cast plus one for rewards —
`sage` (KIDDO), `apricot` (FOXY), `blossom` (BIBI), `sprout` (PIP), `tide`
(WALLY) and `honey` (stars and confetti) — each with `soft` / `base` / `deep` /
`ink` steps. The `base` step of each is the character's own hue, so the palette
and the artwork can never drift apart. Characters and games pick a family;
`src/lib/accents.ts` maps it to concrete classes. Tailwind can only ship classes
it finds written out in full, which is why that file is a lookup table rather
than string interpolation.

KIDDO has one bright daylight theme on purpose. There is no dark mode.

### Animation

`src/lib/motion.ts` holds the shared springs and variants. The rules:

- Motion is a response to something the child did, never decoration.
- Nothing in the interface loops. The one exception is the mascot, which
  breathes and blinks so it does not read as a dead sticker — quiet enough that
  a child stops noticing it. Pass `alive={false}` in dense grids.
- Celebrations are the one place allowed to be expressive.
- `MotionConfig reducedMotion="user"` in `MotionProvider` makes every animation
  respect the OS setting automatically, and the mascot goes still with it.

## Content architecture

> Where this is going next: [`docs/content-universe.md`](docs/content-universe.md)
> — a census of what the registry actually teaches, and a proposal for giving
> each learning objective more than one way to play. A proposal only; nothing
> in it is built.

Memory Match and Find It are games with their own content. Everything after
them is the other way round: **one engine, many challenges**. `src/lib/content`
is where that content lives, and nothing in it is React, knows a game exists,
or reaches for a network.

The whole thing rests on one split.

|                  | says                            | how many         |
| ---------------- | ------------------------------- | ---------------- |
| `ActivityType`   | what is being learned           | dozens, and growing |
| `ChallengeKind`  | how the child answers           | three, and staying |

Addition and letter recognition are nothing alike as subjects and identical as
interactions: a question, some tiles, tap the right one. Keying the payload on
the interaction is what buys a hundred challenges without a hundred
components — one `choice` engine renders every one of them, and a new subject
is data. The three kinds are `choice` (tap the right one), `order` (arrange
them) and `match` (pair them up). A fourth belongs there when a new *gesture*
arrives, never when a new subject does.

```
ContentPack        Math · English · Logic · Discovery
  Activity         Addition · Spelling · Odd one out
    Challenge      2 + 3 · C _ T · which one is different
      payload      choice | order | match   <- the only thing an engine reads
```

### Static and generated

An activity gets its challenges one of two ways, and **nothing downstream is
ever told which**:

```ts
defineStaticActivity({ ..., challenges: [ /* written out, one per question */ ] })
defineGeneratedActivity({ ..., generate: ({ level, rng }) => /* one question */ })
```

CAT, DOG, SUN had to be written down. `2 + 3` did not. Both come back from the
same call:

```ts
const challenges = drawChallenges(activity, { level: 2, count: 10, rng });
```

Static content is filtered by level and shuffled; generated content is run ten
times and de-duplicated, so the same sum never arrives twice in a round. That
seam is the architecture — an engine, a session and the shell all see an array
of `Challenge` and cannot tell where it came from.

Generators take every random number from `context.rng`, never `Math.random`.
A seeded generator is reproducible, which means a generated page can be
rendered on the server and again in the browser without tearing — the dance
Memory Match and Find It have to do on mount is not needed here. Draw without a
seed and you get the same set every time, which is what the server wants.

### Difficulty

One number, five steps: 1 very easy to 5 advanced. An activity declares the
levels it can deal and `drawChallenges` snaps a request to the nearest one, so
asking a three-level activity for level 5 is not an error. `difficultyOf()` maps
a level onto the catalogue's `gentle` / `growing` / `clever` so the two can
never disagree.

The child never sees any of this. Levels, categories, age bands and learning
objectives are internal data; the home screen says Play, Learn, Discover.

### Adding content

A Math pack is a file and one line:

```ts
// src/lib/content/packs/math/addition.ts
export const additionActivity = defineGeneratedActivity({
  id: "addition", packId: "math", title: "Adding to 10",
  category: "math", activityType: "addition", kind: "choice",
  ageRange: { min: 5, max: 8 }, levels: [1, 2, 3], host: "wally",
  generate: ({ level, rng }) => {
    const max = [4, 6, 10][level - 1];
    const a = rng.int(1, max), b = rng.int(1, max - a + 1);
    return {
      level,
      prompt: {
        speech: "What do these make?",
        display: [
          { kind: "item", item: { kind: "number", value: a } },
          { kind: "symbol", symbol: "plus" },
          { kind: "item", item: { kind: "number", value: b } },
          { kind: "symbol", symbol: "equals" },
          { kind: "blank" },
        ],
      },
      payload: {
        kind: "choice",
        options: rng.shuffle([a + b, a + b + 1, Math.max(1, a + b - 1), a + b + 2])
          .map((n) => ({ id: `n${n}`, item: { kind: "number", value: n } })),
        answerId: `n${a + b}`,
      },
    };
  },
});
```

then an entry in `CONTENT_REGISTRY`. English is the same shape with `packId:
"english"` — spelling authors `C _ T` as a `blank` in the display and the
letters as options, which is the identical `choice` payload and therefore the
identical engine. Neither touches the other, and neither touches a game.

The Math pack ships today under `content/packs/math/`: eight activities —
counting, number recognition, comparison, addition, subtraction, number
sequences, missing number and patterns — which between them can ask over two
thousand distinct questions. Seven are generated; patterns is authored, so the
static seam has something real in production and not only in a reference file.
English and Logic ship beside it under `content/packs/`, four activities each,
and one reference activity — `discovery.colours` — stays written out inline in
the registry so the static seam has something small and legible in it too.
`validate.ts` catches the mistakes types cannot — an answer that is not among
the options, a question with one choice, two challenges sharing an id.

### Sessions and engines

`drawChallenges` deals from one activity. A round is not one activity: it
counts, then compares, then adds, and it gets harder as it goes. That shape is
data too — a list of slots, each a level and the activities allowed to fill it
— and `drawSession` fills it, de-duplicating across the whole round.

```ts
const session = drawSession({ slots: [
  { level: 1, from: ["math.counting", "math.number-recognition"] },
  { level: 2, from: ["math.addition", "math.subtraction"] },
] }, { rng });
```

What counts as a repeat is the caller's to decide. By default it is the board,
which is what Math, English and Logic want. A game may pass its own `keyOf`,
and may return several keys from it — a candidate is refused if it repeats any
of them. Shapes & Colours uses both halves of that; see its section below for
why one key was not enough.

`components/games/engines/` is the other half: `ChoiceStage` renders every
`choice` challenge there will ever be. It is handed a `Challenge` and cannot
tell whether it is a sum, a colour or a letter, and it never decides whether an
answer was right — `checkAnswer` does that, in the content layer, once.

## Math Quest

The first game built on the content layer, and the proof it works.

```
lib/games/mathQuest.ts        the round: a session plan and a pure reducer
lib/games/useMathQuestGame.ts the React part: timers and one real seed
components/games/math/        what KIDDO says, and nothing else
```

Ten questions, drawn fresh from the Math pack every time and never repeating
inside a round. Levels 1–3 are dealt; 4 and 5 are architecture-ready and snap
down until the content for them exists. A wrong answer costs nothing: the tile
is dimmed, the question stays, the progress dots do not move, and KIDDO's only
two reactions are a cheer and an encouragement. There is no score, no timer, no
lives and no streak, here or anywhere in KIDDO.

Because the rules are a plain reducer over plain values, a whole round is
played in `tests/mathQuest.test.ts` with no renderer at all.

## English Quest

The second subject, and the actual proof. A whole new pack — letters, sounds
and words — reached the child through the *existing* engine: there is no
`EnglishChoiceStage`, and `ChoiceStage` needed one generic rule (a word is
already its own caption, exactly as a numeral is) to render it.

```
lib/content/packs/english/    four activities: letters, case, sounds, spelling
lib/games/englishQuest.ts     the round: its own session plan and reducer
lib/games/useEnglishQuest.ts  the React part: timers and one real seed
components/games/english/     what KIDDO says, and nothing else
```

The content layer is shared; the game rules are not. English Quest holds an
answer on screen longer than Math Quest does, because a word has to be read
before it can be answered — a decision about reading, made in a file about
English, and not a flag on somebody else's reducer.

The content is authored rather than scraped, and the interesting part is what
was left out. No gap may spell a second real word (HAT and BALL are not in the
list, because H_T and B_LL have four answers each); no phonics board may offer
two letters that say the same sound (C and K never meet); and no case question
is about I or L, whose capital and lower case are the same stroke in this
typeface. `tests/english.test.ts` asserts all three.

## Logic Quest

The third subject, and the one that tested whether the architecture had really
been built or merely described. Four activities — repeating patterns, odd one
out, sorting and sequences — reached the child through the *existing* engine.
No `PatternStage`, no `SortingStage`, no new `ChallengeKind`: all four are
`choice` challenges, and `ChoiceStage` renders them unchanged.

```
lib/content/packs/logic/      four activities, and the word lists behind them
lib/games/logicQuest.ts       the round: its own session plan and reducer
lib/games/useLogicQuestGame.ts the React part: timers and one real seed
components/games/logic/       what KIDDO says, and nothing else
```

Two generic things were added to the content layer rather than to the game.
`ShapeItem` puts a circle or a star on a tile, for any activity in any pack;
`Challenge.hint` is a nudge back towards the thinking, and never the answer.
Logic Quest is their first caller, not their owner.

The hint is the rule that is only Logic Quest's. Get a pattern wrong and KIDDO
stops repeating the question and starts pointing at where to look — *count the
dots in each one*, *say the letters out loud*. Asking a child the identical
question they have just got wrong is asking them to guess.

The row and the chain are why patterns and sequences are two activities and
not one. A pattern is a row — `● ▲ ● ▲ ?` — with nothing between its symbols,
so it is written in shapes and letters, marks that cannot run into the one
beside them. A sequence is a chain — `2 → 4 → 6 → ?` — and the arrow that
makes it a journey is also the separator that lets a sequence count in dots.

Only one Logic rule puts the answer in the colour — *which one is a different
colour?* — and the KIDDO palette was chosen to sit together, not to be pulled
apart. Simulating the three colour vision deficiencies over the palette's ten
pairs, five of them collapse to almost nothing, so `COLOUR_PAIRS` in the pack's
`shared.ts` lists the five that survive and that rule draws from those alone.
Every other rule is answerable without seeing colour at all.

Content that is generated has to earn more trust than content that is written,
so the pack is counted and checked differently. `conceptKey` counts the *rule*
rather than the board, so `A B A B ?` and `B A B A ?` are one question, not
two; by that measure the four activities can ask 744 different questions. And
`tests/logic.test.ts` does not take the generator's word for any of them: it
reads each pattern off the stage, works out the shortest repeat that explains
it, and checks the board agrees — the only kind of test that catches a
generator which has quietly started producing puzzles with two right answers.

## Shapes & Colours Quest

The fourth subject, and the first big one: eleven activities against Logic
Quest's four, because "shapes and colours" is not one skill. Naming a shape,
matching by one property while ignoring another, counting a group by colour,
knowing that a hexagon has six sides, seeing that a star is *inside* the
circle, finishing `small small big small small ?` — these are eleven different
things a child learns, and putting them in one activity would have made a
generator with eleven branches and no way to say which one a round had asked.

```
lib/content/packs/shapes/     eleven activities across six files, and shared.ts
lib/games/shapesColoursQuest.ts   the round: its plan, its keys, its reducer
lib/games/useShapesColoursQuest.ts the React part
components/games/shapes/      what KIDDO says, and nothing else
```

Every one is a `choice` challenge. No new `ChallengeKind`, no new stage, no
branch in `ChoiceStage` — which was the point of the exercise, since a pack
about *looking* is the one most likely to want its own renderer.

Three generic things were added to the content layer rather than to the game.
`ShapeItem` grew a `size` and an `accent`, so any pack can ask about a big blue
triangle. `SceneItem` puts two shapes in one 100-unit box with a relationship
between them — which is the only way `inside` can be drawn at all, since two
glyphs in a flex row can be near or far or above but never *in* each other.
And `captionOf` moved the question "does this tile print its own name?" into
the content layer beside `labelOf`, because a shape captioned "circle" answers
*which one is the circle?* outright. Shapes & Colours is their first caller,
not their owner.

**Counting the content honestly.** 244 distinct concepts, measured rather than
claimed — `conceptKey` counts the idea, so a circle asked in blue and in yellow
is one question and not two, and `tests/shapesColours.test.ts` re-derives the
number on every run rather than trusting this paragraph. The same sweep counts
17,820 distinct boards, which is the other number worth having: the concepts
are what there is to learn, the boards are why it does not feel like a
worksheet.

**A round refuses two kinds of repeat.** Math, English and Logic de-duplicate a
round by board. That is too weak here: eleven small ideas over big boards would
happily ask about the circle three times in three colours, so this round
de-duplicates by *concept*. And concept alone turned out to be too weak in the
other direction — *which one is blue?* over four hexagons and again over four
different shapes are two genuine ideas and one sentence, with the same blue
thing tapped both times. It happened in sixteen rounds out of five hundred. So
`drawSession` now accepts several keys and refuses a candidate that repeats any
of them; the second key is the question and its answer, in words. *Which one
comes next?* over two different patterns still gets through, because that is
one sentence and two real puzzles.

**Colour is never the only channel.** Every shape has a house colour, so a
pattern of circles and stars is also a pattern of blue and yellow. Where a
board is genuinely *about* colour, it draws from the five palette pairs that
survive simulated deuteranopia, protanopia and tritanopia; a three-colour board
draws from the three that are mutually tellable. The tests check the answer
against every distractor on every board the pack can deal, not a sample.

**Patterns here are not Logic Quest's patterns.** Logic Quest owns abstract
pattern reasoning — what comes next in a sequence, which one does not belong.
This pack's patterns never change the object: one shape throughout, repeating
in *colour* or in *size*. `small small big small small ?` is a question about
looking at an attribute, which is the subject of this pack, and it stays out of
the way of the subject of that one.

## Tests

```bash
npm test
```

Node's own test runner, run straight against the TypeScript in `src/`. No
Jest, no Vitest, no jsdom, no transform step: `scripts/alias-hook.mjs` teaches
Node the `@/` alias and extensionless imports in about thirty lines, and Node
strips the types itself. Adding a test framework to this repo should need a
reason.

`tests/content.test.ts`, `tests/english.test.ts` and `tests/logic.test.ts`
check the content — one right answer per board, plausible distractors,
determinism from a seed, level snapping, the variation count, and for English
the phonics and spelling rules above and for Logic the pattern, sequence,
category and classification rules re-derived independently.
`tests/mathQuest.test.ts`, `tests/englishQuest.test.ts` and
`tests/logicQuest.test.ts` play the games.

## Adding a game

1. Add an entry to `GAMES` in `src/data/games.ts` (`id` becomes the route).
2. Build the playfield as a component under `src/components/games/`.
3. Render it inside `<GameShell>` from `src/app/play/[gameId]/page.tsx`,
   replacing `<ComingSoonStage>` once `status` is `"ready"`.

`GameShell` already provides the exit, title, progress dots, the host character
asking the question, and the end-of-round celebration. Use `useGameSession`
for step/score/feedback, and `<ChoiceTile>` for anything tappable.

A game built on the content layer adds nothing to `components/games/engines/`:
it describes its round as a `SessionPlan`, keeps its rules in a pure reducer
next to its hook in `lib/games/`, and renders `<ChoiceStage>`. Math Quest is
the worked example, and it is about a hundred lines of component.

## The character

KIDDO is drawn in code, not exported from a design tool. `components/character`
is the production artwork: one character, one body, a swappable face, and a
four-pivot rig. Run the app and open **`/character`** for the full living
specification — every drawing on that page is rendered by the same components
the product ships, so the spec cannot drift from the character.

```
components/character/
  canon.ts          the numbers: viewBox, hues, pivots, overlays, timings
  parts.tsx         the layers: ear, body, arm, leg, cheeks, shadow, effects
  expressions.tsx   ten faces. A face is eyes + optional brows + a mouth
  poses.ts          eleven poses. A pose is four rotations and a pivot set
  Kiddo.tsx         the rig that assembles all of the above
  Friend.tsx        FOXY, BIBI, PIP and WALLY, from the same primitives
  useBlink.ts       the idle blink timer
```

Three rules the whole cast obeys, and none of them are negotiable:

1. **One hue per character.** Every lighter form — inner ear, belly, muzzle,
   tail tip — is white laid over that hue at a fixed opacity. No gradients, no
   second colour, no glow, no 3D shading.
2. **Faces are always ink** (`#2E2A32`). Only the cheeks are warm.
3. **No outlines, and no detail that would vanish below 8px.** Above 64px KIDDO
   is a full body; below it the limbs drop away and the ears, eyes and mouth
   carry the identity. There is no third variant, and detail is never added
   just because a larger size has room for it.

`canon.ts` is the source of truth for the drawing. Changing a number in it
changes the character, so don't — unless the character sheet changed first.

### Using it

```tsx
<CharacterFigure id="kiddo" size="lg" pose="cheer" />
<CharacterFigure id="foxy" size="md" label="Find FOXY" />
```

`<CharacterFigure>` is the only component that decides how a character is
drawn. Reach for `<Kiddo>` directly only on the spec page. Characters are
decorative by default and hidden from screen readers; pass `label` when the
character carries meaning the child needs ("find FOXY").

Pick a pose by product moment, not by feeling — `cheer` for a correct answer,
`reassure` for a wrong one, `think` for loading, `rest` for the end of a
session. Every pose ships with the right face already attached.

### Adding an expression or a pose

- **An expression** is an entry in `FACES` in `expressions.tsx`: an eye pair, an
  optional brow pair, and a mouth, reusing the primitives already in the file.
  Add the id to the `Expression` union and to `EXPRESSION_ORDER`, and it appears
  on `/character` automatically.
- **A pose** is an entry in `POSES` in `poses.ts`: two arm rotations, two leg
  rotations, and optionally a tilt, a lift or a shoulder-pivot override. Because
  every pose is the same rig, any pose tweens into any other.

Never add a pose or a face that reads as angry, scolding or disappointed. A
wrong answer gets `reassure`: *that's okay — let's try another way.*

### If hand-drawn artwork ever arrives

Put the files in `public/characters/` and fill in `art` on the character in
`src/data/characters.ts`. `<CharacterFigure>` picks them up everywhere. The rig
stays, because it is what lets the mascot animate.

## Not in this build, on purpose

No payments, subscriptions, analytics, admin panel, CMS, AI features or
mobile app. Accounts exist only for parents (Phase 8B); a child never signs in. This is an early experiment; the point is to find out
whether children enjoy it before building any of that.
