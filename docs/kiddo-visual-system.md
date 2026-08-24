# The KIDDO visual system

How a thing in a KIDDO activity becomes something a child can look at, and when
it stops being one.

`content-universe.md` is the other half of this. It says what a challenge is
made of and how a subject grows; this says what those pieces look like, how much
of the work a picture is allowed to do, and — the part that matters most — how a
picture leaves.

Everything below is a rule about the *default* experience. There is no calm
mode, no reduced mode and no accessibility mode, because a mode is a thing a
grown-up has to know to switch on, and the child who needed it most is the child
whose grown-up never found the switch. The quiet, uncluttered, motion-light,
never-colour-alone version **is** KIDDO.

---

## The principle

> **SHOW → INTERACT → REINFORCE**

A child should understand what they are being asked to do before they need to
read anything. They act. Then the thing they did is confirmed, calmly, in more
than one channel.

Rich visuals do not mean a lot of visuals. Every rule in this document exists to
serve one sentence: **a board should have exactly one thing to look at first,
and it should be the question.**

---

## A · Illustration style

An illustration is a flat vector drawing, authored in this repository, in a
100-unit square viewBox.

| rule | why |
|------|-----|
| Flat fills only. No gradients, no filters, no shadow. | The character rig is drawn this way. An object beside KIDDO that had depth would look like it came out of a different box. |
| No outer stroke around the silhouette. | Same rule the characters follow. Strokes are used *inside* a drawing — a fleece, a shell, a wave — never around it. |
| Ink for features only. Eyes, mouths, nostrils. | One warm near-black in the whole product. |
| Every fill is a token, reached by name. | `illustrations/paint.ts` is the only palette an illustration may use, and every entry in it is a `var(--color-*)`. A palette change reaches the library at once, and nothing can drift. |
| It has to read at 48px. | An illustration is an *answer tile* as often as it is a question. Four flat shapes read at that size; twelve do not. The reference sheet on `/playground` shows every drawing at three sizes side by side for exactly this reason. |
| No motion, ever. | An illustration is the subject of a board. The tile around it is what changes when the board does. |

**Hue is for telling things apart, not for accuracy.** A dog is apricot and a
cat is honey because one board can hold both, and two animals that differ only
in silhouette are two animals a child has to squint at. Where a real animal has
no hue — a sheep, a cow, a mouse — it is drawn in paper, cream or stone, which
is this palette's way of saying "no colour" without reaching outside itself.

There is no brown, no grey and no red anywhere in KIDDO, and there is none in
the library: a tree trunk is apricot-deep, and nothing is ever scarlet.

## B · Object style

Three kinds of drawing, and the difference is about what the thing *is*.

**Objects** — an apple, a ball, a hat. One compact shape, centred, with air
around it. Nothing with a face, nothing that is a scene, and nothing with a part
a child might count twice. Four of the library's objects are *countable*: a
counting board draws a row of nine of them across a phone, so the air around
each one is load-bearing.

**Creatures** — drawn face-on, in the same box, so a row of animals reads as one
family rather than as nine stickers. Ears and tails go behind the body; the face
is the last thing drawn.

**Places** — the only illustrations allowed to be compositions, because a place
is not a thing you can hold. Each has a ground line and is built so its
silhouette survives 48px: the house is a roof over a door, the farm is a barn on
green, the sea is blue with a wave in it. **A place never contains the animal
that lives in it** — the animal is on the other side of the board, and a farm
with a cow already in it would answer the question before the child did.

## C · Character style

**The character sheet is frozen.** The five characters and KIDDO are drawn by
the vector rig in `components/character`, their `base` hues are exact, and
nothing in this phase touched any of it. `/character` is the reference.

What the visual system asks of the cast is only this: the objects beside them
obey the same three rules the rig does — flat shapes, ink for features, no
shadow — so a cow and KIDDO look like they were drawn by the same hand.

On a board, only KIDDO is alive. Every other character is rendered with
`alive={false}`, because a blinking character among still ones quietly draws the
eye to one answer.

## D · Card style

Every surface in the product is one of three radii — `tile` (1.25rem), `card`
(1.75rem), `hero` (2.5rem) — on paper, over a cream page, with a hairline
`edge` border and a soft warm shadow. Nothing is grey.

A tile is `border-2` plus a 5px solid bottom edge in a deeper token, which is
what makes it look pressable without an animation having to say so. The prompt
is a `hero` card, the answers are `tile` cards, and the difference in radius is
one of the ways a child can tell the question from the answers without reading
either.

Minimum touch target is `3.5rem` (56px), set by the `.tap-target` utility —
above the 44px platform guidance, because the hands are four years old.

## E · Background treatment

The page is `cream-100`, flat, everywhere. There is no illustrated background
behind a board, no pattern, no vignette and no scene.

This is a decision, not an omission. A background is a second thing to look at,
and a board's whole job is to have one. KIDDO World — the home screen — is where
the illustrated world lives, and it is the only place in the product where
anything moves on its own.

## F · Typography hierarchy

Two families. `--font-display` (Fredoka) for anything a child reads as a *thing*
— a letter, a word on a tile, a numeral, a heading. `--font-sans` (Nunito) for
anything a grown-up reads.

Content type is sized by **how many characters it is and which scale it is at**,
never by which activity it belongs to. `textSize()` in `ContentItemView` is the
whole rule: one or two characters keep the largest size, which is every letter
and every numeral there will ever be; a word steps down as it lengthens, because
`STRAWBERRY` at the size of a `4` is wider than a tile on the narrowest phone.

There are three scales:

| scale | what it is | example |
|-------|-----------|---------|
| `tile` | an answer | one of four choices |
| `stage` | part of the question | the `3` in `2 + 3 = ?` |
| `hero` | a question that is one thing to look at | the cow in "where does this live?" |

`hero` is a **size and never a style**. Any item can be drawn at it, and any
branch with no hero-specific size falls back to the stage one.

Hero sizes are capped against the viewport (`min(4.5rem, 15dvh)`) rather than
stepped on the type scale. The subject is the tallest thing above the answers,
so it is allowed to be large on a tablet and quietly gives the height back on a
360×640 phone — instead of pushing the answers off the bottom.

## G · Visual hierarchy

In order, on every board:

1. **The subject.** The largest thing on the screen, if there is one.
2. **The answers.** Equal to each other. Always.
3. **The host and what it says.** Present, warm, and never louder than the board.
4. **Chrome.** Progress, back, sound. Legible and last.

The rules that keep it true:

- **No answer may look more important than another answer.** This is why a
  half-illustrated board is refused: two drawn tiles among four is a pattern,
  and a child who joins the drawn ones is right for the wrong reason. See §M.
- **A picture that supports a word is smaller than a picture that is the item.**
  `anchorSize` is one step under `pictureSize` at every scale. The moment the
  cat is bigger than `CAT`, the child stops reading.
- **A picture is captionless when the picture is the answer.** The word lives in
  the accessible name. A caption under a picture would turn a picture board into
  a reading test.

## H · Interaction states

Eight, and every one of them is legible with the colour removed.

| state | what changes |
|-------|--------------|
| idle | paper, `edge` border, 5px solid bottom edge |
| hover | lifts 4px |
| pressed | drops 3px |
| selected | lift plus a heavier border, and `aria-pressed` |
| correct | `yes-soft` surface, sprout border, **a tick badge**, host confirms |
| retry | `retry-soft` surface, apricot border, **a magnifier badge**, one settle |
| tried | quieter surface, **a badge**, still perfectly tappable |
| settled / disabled | dimmed, `aria-disabled`, not removed from the board |

Three things this table is asserting:

**Feedback is never colour alone.** Every state that means something carries a
shape — a tick, a magnifier — as well as a hue, and the hues themselves are
checked against each other by `isTellableApart` so no board shows two accents a
colour-blind child could confuse.

**There is no cross anywhere in KIDDO.** A wrong answer is not a verdict on the
child, it is an instruction to keep looking, and a magnifier says that.

**Nothing that was tapped is ever removed.** A choice that vanished would move
everything else on the board and lose the child's place.

### Why nothing shakes

It used to. A tile that was not the answer threw itself left and right five
times over four hundred milliseconds — the universal web idiom for *no*, which
is a password field's idiom borrowed for a four year old. It was the wrong idiom
twice over: it was the one piece of motion in the product that existed to say a
child got something wrong rather than to show them something, and a sharp
repeated movement is the hardest kind for a motion-sensitive child to sit
through.

What replaced it is a **settle**: the tile eases down a hair, comes back, once,
and stops. It says the tap landed and the tile is still there to try again,
which is true. The badge and the surface do the rest, and both survive reduced
motion, where the settle does not run at all.

## I · Animation principles

> Every animation must communicate something. Never introduce one because
> "children like animation".

- **Motion shows a change of state, not a mood.** A lift says tappable. A settle
  says the tap landed. A rise-in says this board is new.
- **Nothing loops.** The one exception in the whole product is the clouds on the
  home screen, which cross a fifth of their own width in ninety-six seconds —
  slow enough that you notice it after looking away and back.
- **Nothing decorative auto-plays.** Nothing on a board moves until the child
  moves it.
- **No confetti storms, no flashing, no aggressive bouncing.** Celebration is a
  character, a sentence and one gentle pop.
- **An illustration never animates.** It is the subject; the tile is what moves.

All motion goes through the existing `MotionProvider` and the springs in
`lib/motion.ts`. No new animation system was added for this phase, and none was
needed.

## J · Reduced motion

`MotionConfig reducedMotion="user"` covers Framer Motion; a blanket
`prefers-reduced-motion: reduce` rule in `globals.css` collapses every CSS
transition and animation. Under reduce:

- state changes are instant, and **every state is still fully legible**, because
  every one of them is a surface, a border and a badge rather than a movement;
- the clouds are never animated at all — declared inside `no-preference` rather
  than switched off later, because a collapsed transform animation *jumps* to
  its end position instead of never starting;
- nothing loops, because nothing looped anyway;
- no information is lost. A child on reduced motion sees the same board, the
  same badges and the same answer.

## K · Accessibility principles

- **Every drawing is `aria-hidden`.** Always. The word for the thing lives in
  the item's accessible name, where it is part of a whole instruction rather
  than a glyph read out on its own. A screen reader hears exactly the same board
  whether it was drawn or glyphed — that is a test, not an aspiration.
- **The prompt is transcribed once, as a sentence.** A screen reader that read
  `2 + 3 = ?` part by part would say "two, plus, three, equals" as four things
  to tab through.
- **`aria-disabled` and a guard, never the disabled attribute.** A tile that
  goes properly disabled under a child's finger throws keyboard focus back to
  the top of the page.
- **One focus ring, everywhere**: 3px of ink at 3px offset. Ink rather than a
  sixth hue, so it is maximum contrast and never reads as an accent.
- **Colour is never the only channel.** See §H.
- **48px is a floor and 56px is the target.**
- **No sound is ever necessary.** Audio confirms; it never informs. Every board
  is completable in silence, and audio is `correct`, `completion` and important
  host guidance only — there is no background music and nothing loops.

## L · Image-to-text ratio, by mode and by level

Three modes. A mode is a property of **what is being learned**, not of a
subject.

| mode | what it is for | what the board looks like |
|------|----------------|---------------------------|
| **1 · VISUAL FIRST** | animals, objects, colours, shapes, counting, habitats, food, body parts | a large picture, and as close to no text as the activity allows |
| **2 · VISUAL + TEXT** | alphabet, vocabulary, rhyming, early reading, number names | the word is the item; a smaller picture sits above it |
| **3 · SYMBOL / TEXT FIRST** | number ordering, alphabet ordering, equations | the symbol is the item, and a picture may support it but must never obscure it |

A single board can hold two modes, and one of them does: `animal-babies` is
MODE 1 down its left column and MODE 3 down its right, because there is no
picture that tells a lamb from a sheep, and a drawn right column would be a
board a child could finish without ever meeting the word *lamb*.

By level:

| level | what a child sees |
|-------|-------------------|
| 1 | picture carries the meaning; text is minimal or absent |
| 2 | picture and word together, or the word alone with the pool widened |
| 3 | the symbol or the concept, with the picture gone |

## M · When the picture goes away

The most important rule in this document.

> **PICTURE → PICTURE + WORD → SYMBOL**
>
> Visuals should teach independence rather than become permanent hints.

Help that never goes away is not help; it is a crutch a child learns to lean on
instead of learning the thing. So the illustration belongs to the **entry
level** and leaves as the board gets harder.

`illustratedAtLevel(level)` in `lib/content/art.ts` is that rule, written down
once so that five activities cannot disagree about it. It says level one and
only level one, because every activity that uses it offers three levels, level
two is where the pool widens and the board grows, and a scaffold that survived
the first widening would be carried all the way to the top.

**What each activity falls back *to* is its own decision**, and it is not the
same decision twice:

| activity | level 1 | level 2 | level 3 |
|----------|---------|---------|---------|
| `general-knowledge.home-partners` | drawn animal ↔ drawn place, no words | glyph ↔ glyph | glyph ↔ glyph, four lines |
| `general-knowledge.animal-babies` | drawn animal ↔ the baby's **word** | glyph ↔ word | glyph ↔ word, five lines |
| `math.counting-objects` | a row of drawn things | a row of emoji, wider pool | a row, or a **block of pips** |
| `english.alphabet-order` | letter with a picture above it | letter alone | letter alone, five-tile derangement |
| `english.rhyming-partners` | word with a picture above it | word alone | word alone, sound-only rhymes |

### The all-or-nothing rule

**A board is wholly illustrated or wholly plain. Never half of each.**

On a board where both columns are content — an animal and its home, a word and
the word it rhymes with — two illustrations among four glyphs is a *pattern*,
and a child who joins the two drawn ones is right half the time for entirely the
wrong reason. It works, it is not the skill, and a five year old finds it before
an adult does.

The rule also applies where there is no leak at all, for a different reason: in
`alphabet-order` nothing about an apple says it comes before a ball, but a tray
with pictures on two tiles and nothing on the third is a tray with two tiles
that look important, and "which of these comes first" is exactly the question
that cannot afford that.

### The cost, and how it was paid

Narrowing an entry level to what the library can draw takes facts away from it.
`home-partners` would stop dealing the monkey at level one; `rhyming-partners`
would stop dealing eight of its twelve first rhymes — and a test says in as many
words that level one deals all twelve. Both are real losses and neither is worth
a picture.

So on those two activities the entry level does both, board by board:
`narrowToDrawn` is a **coin**. About half the level-one boards are dealt from
the drawn set and are wholly illustrated; the rest are dealt from the whole pool
and are wholly glyph. Every fact is still dealt at every level it was dealt at
before, no board is ever half-drawn, and a child at the entry level meets
pictures often rather than always — which is what a scaffold is.

`counting-objects` needs no coin, because there the *concept* is the number and
not the thing: a child who counts six drawn apples has learned exactly what a
child who counts six emoji apples learned. `alphabet-order` needs no coin
either, because it draws from the full window and simply anchors the runs it
can.

As the library grows, the drawn set widens and the two halves converge. Nothing
about these rules has to change for that to happen.

---

## The visual object model

There is no parallel artwork system, and that is the main architectural claim of
this phase.

`ContentItemView` was already the single place in the product where a
`ContentItem` becomes pixels, and `PictureItem`'s own doc block had promised the
widening years before it happened. So the whole schema is **one optional field
on two existing item kinds, plus one optional field on the prompt**:

```ts
interface PictureItem { kind: "picture"; glyph: string; label: string; art?: ArtId }
interface TextItem    { kind: "text";    text: string;  label?: string; art?: ArtId }
interface Prompt      { speech: string;  display?: PromptPart[]; layout?: "line" | "subject" }
```

- `PictureItem.art` — the picture **is** the thing. MODE 1.
- `TextItem.art` — the picture **supports** the word. MODE 2.
- `Prompt.layout: "subject"` — the display is one thing to look at, not a line
  to read. A subject prompt with more than one part is drawn as a line anyway,
  because four things at hero size is not a subject.

`art` is a **promotion, never a requirement**. `glyph` stays required, so an
item naming an id nobody has drawn — or a pack written against a bigger library
than this build ships — draws exactly what it has always drawn. Twenty-one
illustrations will never catch an emoji set and nothing here asks them to.

Three files, and no game, engine or stage knows about any of them:

| file | what it holds |
|------|---------------|
| `lib/content/art.ts` | the `ArtId` vocabulary and the scaffolding rules. Pure data, no React. |
| `components/kiddo/artwork/illustrations/paint.ts` | the only colours a drawing may use. All tokens. |
| `components/kiddo/artwork/illustrations/index.tsx` | `ArtId → drawing`, and the `Illustration` component. |

`Illustration` is sized in **`em`** — `1.15em` square, about the box an emoji
fills at the same font size — so a drawing and a glyph are interchangeable at
every scale that exists today and every one added later. A board does not change
height when a fact is promoted, which means nothing that was measured has to be
measured again.

**Adding a penguin is one `ArtId`, one drawing, and one `art:` on the fact that
already existed.** Nothing downstream has to be told.

### The library

Forty-four drawings — twenty-nine from Phase 9, fifteen from Phase 10 —
chosen by working backwards from the entry level of real activities rather
than to be a pretty spread. (There is no pig and never will be:
`lib/content/vocabulary.ts` bars the pig family as a teaching example for
KIDDO's home market, and `tests/safety.test.ts` proves the bar holds.)

| shelf | ids | earning its place in |
|-------|-----|---------------------|
| animal | cow, sheep, dog, cat, chicken, mouse, frog, fish, shark, duck, rabbit, bird, snake, monkey, fox, bee, ladybird | `home-partners`, `animal-homes`, `animal-babies`, `rhyming-partners`, `sound-partners`, `counting-objects` |
| food | apple, egg, cake, banana, strawberry, orange, biscuit | `alphabet-order` (A, E), `counting-objects`, `rhyming-partners` |
| object | ball, hat, car, balloon, box | `alphabet-order` (B), `rhyming-partners`, `counting-objects` |
| nature | tree, flower, star, sun | `counting-objects`, `rhyming-partners`, the `spelling` anchor |
| place | house, farm, sea, pond, nest, burrow, jungle, forest, desert, snow, tree | `home-partners`, `animal-homes`, `rhyming-partners` |

Phase 10 delivered the drawings Phase 9 named next — **jungle** and **monkey**
(the last level-one `home-partners` fact) among them — and completed the place
shelf, so an `animal-homes` options row at level one is never half of each.
Still named and waiting: **G** (one more anchored alphabet run) and **dish**
(one more drawn rhyming board; **bug** stays a glyph on purpose — a drawn
ladybird labelled BUG would teach the wrong word).

---

## Responsive rules

Measured, not eyeballed. `scripts/measure-visual.mjs` drives a real browser over
CDP at 360×640, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1180×820 and
1440×900, and asserts on every board of `/playground/visual`:

- no horizontal or vertical page overflow;
- nothing clipped and nothing overlapping;
- every interactive target at least 48px in both dimensions;
- the subject of a board never smaller than 40px;
- and then it *plays the board to the end*, so a layout that cannot be finished
  fails the run.

The one number to know: `ChoiceStage` reserves a fixed slab of chrome above its
tile grid. A prompt that grows eats that slack, and 360×640 portrait is where it
runs out first — which is why hero sizes are capped in `dvh`.

---

## The clutter review

Ten questions. Ask them of any new board, on a 360×640 phone, before it ships.

1. **What does a child look at first?** Name it. If the answer is "it depends",
   the board has two subjects and needs one.
2. **What is the single task?** Say it in one short sentence a four year old
   would understand. If it takes two, it is two boards.
3. **What is interactive?** Every interactive thing should look like the other
   interactive things and unlike everything else.
4. **What is decorative?** List it. Then justify each one, or delete it.
5. **Is the task understandable without reading a paragraph?** Cover the text.
   Is the board still answerable?
6. **Is anything competing for attention?** Two things the same size, two things
   the same colour, two things that move.
7. **Does the visual help the learning, or decorate it?** If the picture could
   be swapped for any other picture and the board would work identically, it is
   decoration.
8. **Does it work with reduced motion?** Turn it on. Is every state still
   legible?
9. **Does it work with audio off?** Mute it. Is anything now unknowable?
10. **Is every state distinguishable without colour?** Grayscale it. Can you
    still tell correct from retry from tried?

---

## What this phase did not do

No new engine. No new content system. No duplicate of `MatchStage`,
`ConnectStage` or `GameShell`. No score, no XP, no coins, no analytics, no
backend, no auth, no subscriptions. No new curriculum, and no measured concept
count went down.

`ChallengeStage`, `ChoiceStage`, `OrderStage`, `ConnectStage`, `MatchStage`,
`MotionProvider` and `AudioSettings` were all left as they were, except for one
line in four engines passing `prompt.layout` through to `PromptDisplay`.
