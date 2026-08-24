# KIDDO game worlds

How a KIDDO game stops looking like every other KIDDO game without any of
them stopping being KIDDO.

This document is the Phase 4 record: what the games were before worlds, what
a world is, which three exist, and — most of the page — what a world is not
allowed to touch. Read it before adding a fourth.

## 1. What a game is made of today

Every quest is the same four-layer stack, and three of the layers are shared
by all of them.

| Layer                                                                                             | Owns                                                                                                                                                                                                                                 | Shared?                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Content** (`src/lib/content`)                                                                   | What a challenge _is_: `Challenge{ activityId, prompt, payload }`, dealt by `drawSession`, marked by `checkAnswer`. Keyed on interaction kind (`choice`, `order`, `match`, `connect`), never on subject.                             | Yes — one registry, 84 activities              |
| **Engine** (`src/components/games/engines`, `src/lib/games/engines`)                              | One gesture each: `ChoiceStage` taps a tile, `ConnectStage` joins two nodes, `OrderStage` and `MatchStage` do what they say. Validation, selection state, accessible names, focus, keyboard, pointer capture, the stale-board guard. | Yes — an engine cannot tell a sum from a rhyme |
| **Quest** (`src/lib/games/*Quest.ts`, `use*Quest.ts`, `src/components/games/<subject>/*Game.tsx`) | The round: a `SessionPlan`, a pure reducer (`intro → ready → awaitingAnswer → correct/incorrect → complete`), timings, what KIDDO says, the sr-only status line.                                                                     | No — six near-clones, one per subject          |
| **Shell** (`GameShell`)                                                                           | The frame: back link, title, sound, progress dots, KIDDO + speech bubble, the celebration, the sound cues.                                                                                                                           | Yes — every quest mounts it                    |

### The game types that exist

| Game                    | Engines it renders                                                     | Board shapes                               |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| Math Quest              | `ChoiceStage`                                                          | sums, counting pips, patterns, comparisons |
| English Quest           | `ChoiceStage`                                                          | letters, beginning sounds, spelling        |
| Logic Quest             | `ChoiceStage`                                                          | odd one out, sequences                     |
| Shapes & Colours Quest  | `ChoiceStage`                                                          | shapes, swatches, scenes                   |
| General Knowledge Quest | `ChoiceStage` + one `ConnectStage` slot (`home-partners`, with `walk`) | facts, one joined-up board                 |
| Match Quest             | `MatchStage`                                                           | pairs                                      |
| Find It, Memory Match   | their own boards                                                       | not challenge-driven                       |

### The shared shell, exactly

```
Screen(theme = game.category, detail = "quiet")   ← sky + quiet hills, fixed
  header: BackLink · h1 · SoundToggle · ProgressDots
  main.playing
    row: CharacterFigure(kiddo, pose ← feedback) + SpeechBubble(prompt, reserve)
    div.flex-1.justify-center
      ChoiceStage:   PromptDisplay(Card radius=hero) → ul of ChoiceTile
      ConnectStage:  PromptDisplay? → grid-cols-2 of bordered node buttons + SVG lines
```

## 2. The problem

Screenshot any two quests mid-question and cover the title: they are the same
screen. Sky, KIDDO in the top-left, a white card with the question, a row of
white tiles. The _content_ changes — an apple, a letter, a triangle — but the
**composition** never does. A four year old reads composition before content.
To them, KIDDO has one game with different stickers in it.

This is not a bug in the engines. It is the engines working: they were built
to have no idea what they are drawing. The missing piece is a layer that _does_
know, and is allowed to arrange the same engine differently — without ever
being allowed to touch the gesture, the marking or the accessible name.

## 3. What a world is

A **world** is a presentation profile for one kind of learning moment. It is
chosen from `challenge.activityId`, it lives above the engines, and it decides
three things and three things only:

1. **Environment** — what is drawn _around_ the board (a garden, a landscape,
   an open book), and how that environment arrives and leaves.
2. **Composition** — how the engine's existing parts are framed: does the
   prompt sit in a card or stand on the grass; are the options tiles or signs;
   are nodes cards or creatures or words on a page; is a join a line, a path
   or a ribbon.
3. **Reactions** — which Magic Motion (from the existing eight) plays at which
   engine moment: a thing arriving, a join landing, a round finishing.

Code shape (`src/lib/worlds`, `src/components/games/world`):

```
worldOf(challenge)  ──►  GameWorldId          pure lookup on activityId, "meadow" by default
WORLDS[id]          ──►  GameWorldSpec        name, environment, composition tokens, reactions
<GameWorld world>   ──►  environment + transition + a React context
useGameWorld()      ──►  the spec, read by engines for *look tokens only*
```

Engines read the context and branch on tokens like `tiles: "tile" | "sign"` or
`nodes: "card" | "creature" | "page"`. They never read the world's name. The
promise "an engine cannot tell what it is about" is kept: a `sign` is just a
tile with a post under it; a `creature` is just a node without a border.

### What is shared (every world, no exceptions)

- The `Screen` sky from `game.category`, the header, `BackLink`, `SoundToggle`,
  `ProgressDots`, the sound cues — `GameShell` is the only frame.
- KIDDO and the speech bubble: the same figure, the same poses (`point`,
  `cheer`, `reassure`), the same `reserve` so nothing under the bubble moves.
- Every engine, reducer, hook, timing, and `checkAnswer`.
- Typography, colour tokens, radii, shadows, the 48px floor, `tap-target`.
- The accessibility contract: `aria-disabled` not `disabled`, sr-only
  `role="status"`, the sr-only prompt transcription, every drawing
  `aria-hidden`, tick and magnifier badges, one focus ring.
- Reduced motion: `MotionConfig reducedMotion="user"` and every Magic Motion's
  settled state.
- The Celebration, and its words.
- The Magic Motion vocabulary: pop, bounce, float, slide, walk, grow, sparkle,
  celebrate. A world chooses from it; it does not extend it.

### What varies (by world)

|             | Meadow (default)     | Counting Garden                                    | Animal Adventure                                               | Word World                                    |
| ----------- | -------------------- | -------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| Environment | none — the sky alone | a garden panel: ground, far hills, a tree, flowers | a landscape: sky, sun, hills, water, ground                    | an open storybook: two pages and a spine      |
| Prompt      | `Card`               | things stand **on the grass**, no card             | —                                                              | —                                             |
| Options     | `ChoiceTile`         | number **signs** on posts, planted in the ground   | —                                                              | —                                             |
| Nodes       | bordered cards       | —                                                  | **creatures** on the land, **homes** on the far side, no cards | **words on the page**, picture above the word |
| Join        | straight line        | —                                                  | a dotted **path**                                              | a soft **ribbon** curving through the spine   |
| Arrivals    | tiles pop (existing) | objects `pop` one at a time (existing)             | animals `pop` in; homes are already there                      | pictures `grow`, words `pop`                  |
| Right       | tick badge           | `sparkle` on the sign                              | `walk` (existing) then `sparkle` on the home                   | `sparkle` on the rhyme, `bounce` on the pair  |
| Round done  | `celebrate`          | `celebrate`                                        | `celebrate`                                                    | `celebrate`                                   |
| Transition  | crossfade            | the garden grows up from the ground                | the land slides in                                             | the page turns                                |

The Word World ribbon is the one join that is not a straight line. It is a
cubic whose handles sit level with their own ends, halfway across the gutter,
so it leaves a word sideways, does its turning between the pages and arrives
sideways — it never slants across a word, a picture or a check, and two rhymes
on different rows cross in the spine like ribbons, not like a diagram. It is
pastel (`blossom-base`), thinner than the words, and has the same draw-on and
reduced-motion branch every join always had. The pages themselves are plain:
no ruled lines, which read as somewhere to write. Every coordinate on a board
is measured, then brought back by the board's own `zoom` (Word World zooms
its board on a tall screen), because `getBoundingClientRect` answers in
screen pixels and the SVG draws in the board's.

## 4. Which worlds first, and why these

1. **Counting Garden** — `math.counting-objects`, `math.counting`. The
   activity where "objects in the environment" is the lesson itself: three
   apples on the grass are more countable than three apples in a card. The
   existing one-at-a-time `pop` is the learning moment and is kept unchanged.
2. **Animal Adventure** — `general-knowledge.home-partners`, and since
   Phase 10 `general-knowledge.animal-homes` beside it: the same facts, the
   same landscape, asked as a choice instead of a board. The one connect board
   that already has a journey (`walk`) and already has a landscape in its
   content (house, farm, sea). The world only gives the journey ground to
   cross.
3. **Word World** — `english.rhyming-partners`, joined in Phase 10 by
   `english.sound-partners` (the same storybook page, joining a heard picture
   to a letter). The activity whose content is
   _relationships between pictures and words_ — 🐱 CAT ↔ 🎩 HAT — which is a
   storybook page, not a card grid. English Quest does not deal it (its plan
   is `ChoiceStage` only), so in Phase 4 the Word World is reached from
   `/playground/worlds`, played by the real `ConnectStage` and `useConnect`
   at level 1 — the level whose words still come with their pictures. Giving
   English Quest a joined-up slot is a later decision, not a world one.

Math Quest's plan reserves one slot for `math.counting-objects` so every round
visits the Counting Garden at least once.

Every other activity stays in the Meadow until a world earns its place.

## 5. Rules: what a world must never do

- **Never own interaction.** No `onClick`, no pointer handler, no selection
  state, no `checkAnswer`. If a world needs a new gesture, it is not a world.
- **Never duplicate an engine.** There is no `CountingGameShell`. A world
  wraps the engine that exists; if the engine needs a seam, the seam is a
  look token or a render slot, added once, defaulted to today's behaviour.
- **Never change an accessible name, a status line, a focus order, or a
  touch target.** The sr experience of every world is the Meadow's.
- **Never invent a motion.** Only the eight Magic Motions; only at engine
  moments that already exist (arrive, join, right, complete). Nothing loops.
  Nothing plays because time passed.
- **Never draw with a new material.** Flat vector from `scenery.tsx`, the
  `Illustration` set, `PAINT`/`ACCENT_VARS` colours. No raster, no gradients
  inside shapes, no brown, no grey, no red.
- **Never redesign KIDDO**, the bubble, the header, the celebration, or any
  character.
- **Never score.** A world has no numbers in it that are not the content's.
- **Never add a dependency.**

## 6. The one-active-challenge rule

One challenge is on the table at a time. `GameShell` takes a `stageKey`
(the challenge id) and keys the playfield on it inside the existing
`AnimatePresence mode="wait"`, so a board leaves before the next arrives and
two boards are never interactive at once. The environment is keyed on the
_world_ id, not the challenge id, so it stays put between two counting
questions and changes only when the child moves to a different world — the
moment a child should notice.

Two rules of the keyed stage, both learned from measurement:

- The world's padding and its context ride _inside_ the keyed stage, so a
  board on its way out keeps the world it was played in until it has gone,
  rather than being re-laid-out under the next one while it fades.
- The stage swap is a crossfade and nothing else. A board's own parts arrive
  with their own motion — pips pop, animals walk — and Phase 2's rule is that
  nothing under them moves while they do; a stage that rose 10px would move
  the whole row under the first pip.

## 7. On `kiddo-visual-system.md` §E

§E says "there is no illustrated background behind a board". That was the
right rule when the only alternative was the home-screen meadow behind a card
grid. Worlds do not put a background _behind_ a board; they put the board _in_
an environment, drawn at the board's own scale and `detail="quiet"` in spirit:
nothing moves unless the child did something. §E should now read "no
illustrated background behind a board _that is not its world_" — the
home-screen scenery is still never painted behind tiles.
