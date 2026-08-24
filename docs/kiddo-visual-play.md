# KIDDO Visual Play — Phase 9

Make each activity *show* what it is about, so a four year old who cannot read
the prompt still knows what to do. This phase changes content presentation
only: the GameShell → GameWorld → Engine architecture, the four challenge
kinds, the Magic Motion vocabulary and every rule in
`docs/kiddo-visual-system.md` are unchanged and still govern.

Three things came out of it:

1. **A prompt anchor.** `Prompt.anchor` is a picture of the thing a question
   is about — the sun above `S _ N` — rendered by `PromptDisplay` above the
   display line. It is *context*, not a scaffold: the word is already spoken
   aloud, so the picture reinforces meaning without leaking the answer, and it
   appears at every level (the tile scaffold ladder is untouched).
2. **A safe visual vocabulary.** `src/lib/content/vocabulary.ts` maps words to
   pictures once, for every English activity, and writes down the content-
   safety rule: no pig, and no example a Malaysian or Southeast-Asian family
   would flinch at. `tests/safety.test.ts` deals every activity at every level
   across many seeds and proves no barred word is ever shown or spoken.
3. **Real homes.** `home-partners` teaches animal → actual habitat with three
   new level-one facts a child can act out — duck → pond, rabbit → burrow,
   bird → nest — all six level-one animals drawn, and no tractor anywhere.

## The audit (spec §18)

Every activity a child can reach today, and what this phase did about it.
"Picture floor" means the glyph-always / drawing-as-promotion rule of
`lib/content/art.ts`; "anchor" means the new `Prompt.anchor`.

| Activity | Interaction | Visual support before | Problem | Treatment |
|---|---|---|---|---|
| `english.spelling` (Word Discovery) | choice | bare letter row `S _ N` | nothing shows what the word *means* — the spec's marquee gap | anchor picture of the word (☀️ / drawn sun) above the letters, from the vocabulary |
| `english.beginning-sounds` | choice | bare word | same | anchor picture where the vocabulary knows the word |
| `english.ending-sounds` | choice | bare word | same | anchor picture where the vocabulary knows the word |
| `english.rhyming-partners` (Rhyming Friends) | connect | 4 drawn pairs (cat/hat, dog/frog, car/star, mouse/house), rest glyph | most level-one pairs undrawable; PIG/BIG a default example | +sun, snake, cake drawings → cake/snake pair joins the drawn pool; PIG/BIG → DIG/BIG |
| `general-knowledge.home-partners` (Find the Home) | connect + travel | half of level-1 boards fully drawn; farm glyph is a tractor 🚜 | tractor-as-home is the exact confusion the spec names; pig is a level-1 default; only sea + farm drawn | pig removed; duck→pond, rabbit→burrow, bird→nest added at level 1; duck/rabbit/bird + pond/nest/burrow drawn; farm glyph 🌾 |
| `general-knowledge.animal-homes` | choice | animal hero over place tiles | same table, same tractor | inherits every habitats fix automatically |
| `general-knowledge.animal-names/sounds/babies/diet` | choice | hero subject picture | pig / oink / piglet are level-1 defaults | pig row removed from the table; ladders re-checked |
| `math.counting-objects` (Counting Objects) | choice | rows of drawn apples/stars/flowers standing in the garden; sparkle on right | already the model the spec asks for | no change; still measured |
| `math.counting` (Counting) | choice | pips (CountItem) | pips are deliberate notation, and the Garden deals `counting-objects` beside it | no change |
| `math.number-recognition`, `before-and-after`, arithmetic, sequences | choice | numerals, pips | symbols are the content being learned | no change, on purpose (spec §17) |
| `english.letter-recognition`, `letter-case`, `alphabet-order` | choice/order | letter tiles, picture anchors at level 1 | already on the picture ladder | no change |
| `english.plurals` | choice | word tiles | PIG/PIGS a level-1 default | → FROG/FROGS |
| `logic.odd-one-out` & word groups | choice | word tiles at level 2+ | PIG in the animals word list | → DEER; words are the content, no decoration added |
| `logic.patterns`, `sorting`, `sequences`, `shapes.*` | choice/order | shapes and pictures drawn natively | none — abstract content, honest presentation | no change (spec §17) |
| `match.sound-partners`, `letter-partners`, `quantity-partners` (Memory Match) | connect/cards | picture cards | none | no change |
| reference match (cards sample) | cards | picture cards | PIG/PIGLET family | → HORSE/FOAL |
| `general-knowledge.*` quizzes (Find It / naming boards: food, everyday, community, body, weather, space, transport, world) | choice | picture tiles on the glyph floor | none structural; drawings arrive by promotion as the library grows | no change this phase |

## What was deliberately not done

- No new engine, shell, world, or animation name (spec §9; Magic Motion stays
  eight strong).
- No decoration on abstract boards — numbers, letters, shapes and logic keep
  their honest presentation (spec §17).
- Bee/ladybird/banana in the counting garden were drawn in Phase 10, exactly
  as promised — an `ArtId`, a drawing, one `art:` line each, no code change
  (see `docs/kiddo-interactive-play.md`). Bug/rug in rhyming stay on the glyph
  floor on purpose: a drawn ladybird labelled BUG would teach the wrong word.

## Content safety (spec §2)

`vocabulary.ts` is the one place that says which words are barred as
teaching examples for KIDDO's home market (Malaysia / Southeast Asia): the pig
family, and anything a family could hear as an insult. The sweep test deals
every registered activity, every level, hundreds of seeds, and asserts no
barred word appears in any speech, label, text or explanation. Adding a barred
word to any pack now fails the build.
