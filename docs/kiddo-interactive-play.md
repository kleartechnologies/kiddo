# KIDDO Interactive Play — Phase 10

Phase 9 built the illustration system and proved a scaffold can leave.
Phase 10 is about what the child *does*: every game audited as an
interaction, the connect affordance made obvious without a word of
instruction, and the level-one library finished so that no entry-level
board in the five upgraded activities has to fall back to emoji for want
of a drawing.

The rules of Phase 9 all still hold: one GameShell, one engine per kind,
art is data (`ArtId` on a `ContentItem`), glyph is the floor, the
illustration is a promotion, and `illustratedAtLevel` / `narrowToDrawn`
are the only two words for *when*.

## The audit (done before any code was written)

"Mechanic" is the engine that draws it. "Change mechanic?" was asked of
every game; the answer is **no** for all of them — every weakness found
was visual or contextual, not structural, and the brief's own warning
("do not make every activity a drag-and-drop game") agrees with what the
audit found: the variety of choice / order / connect / cards is a
feature. What changes is what the child *sees* and how the board
*invites* them.

| Activity | Mechanic | Learning objective | Visual weakness found | Treatment (this phase) | Mechanic change? | L1 art? | World? |
|---|---|---|---|---|---|---|---|
| `general-knowledge.home-partners` (Find the Home) | connect + travel | animal ↔ habitat | only 5 of 10 places drawn, so half the drawable facts (monkey→jungle among them) could never deal a drawn board; a fresh board does not show where to begin | all 10 places drawn (`jungle`, `forest`, `desert`, `snow`, `tree` join the library); monkey drawn; `illustrablePool` lifts itself; ConnectStage `invited` state shows the destination column waking up when an animal is chosen | no — travel walk + arrive/partner reactions kept | yes — full coverage | already Animal Adventure |
| `general-knowledge.animal-homes` (Where Do Animals Live?) | choice | same table, asked one animal at a time | the one L1 board in the family that stayed all-emoji: animal subject and place tiles never promoted | subject animal and every place tile drawn at level 1 (`animalItem`, `PLACE_ART`); scaffold still leaves at L2 | no | yes | joins Animal Adventure (`WORLD_OF_ACTIVITY`) |
| `english.sound-partners` (Pictures and their first letter) | connect | first sound of a word | left column is emoji at every level — the only connect board with no drawn form; letters must stay letters | left pictures promoted at L1 by the same coin the other connects use, all-or-nothing per board; BEE authored into phonics so /b/ has a drawn picture; right column stays text on purpose (the letter *is* the objective) | no | yes — left column only | joins Word World (book pages, ribbon join) |
| `english.rhyming-partners` (Rhyming Friends) | connect | hearing rhyme | BOX/FOX is a level-one pair the library could not draw | fox and box drawn → sixth fully-drawn pair; coin unchanged | no | widened | already Word World |
| `math.counting-objects` (Counting Garden) | choice | counting a collection | L1 deals only the 7 drawn things, so bee, ladybird, banana, strawberry, orange, balloon and biscuit never appear at the level that draws | all 14 countables drawn; `DRAWN` re-derives; the L1 garden now deals everything | no — counted row + number answer kept | yes — full coverage | already Counting Garden |
| `english.beginning/ending-sounds`, `english.spelling` | choice | first/last sound; the missing letter | anchors (Phase 9) promote only where the vocabulary has art | FOX, BOX, BEE gain art in the vocabulary → their anchors draw at L1 | no | via anchors | meadow, on purpose |
| `general-knowledge.animal-babies` | connect | parent ↔ baby *word* | none new — deliberately picture-left / word-right | untouched | no | already | meadow |
| `english.alphabet-order`, `letter-recognition`, `letter-case` | order/choice | the letters themselves | none — tiles are the content; anchors already ladder | untouched | no | already | meadow |
| `math.counting`, `number-recognition`, arithmetic, `before-and-after`, sequences | choice | numerals and pips as *notation* | none — symbols are the lesson (Phase 9 §17) | untouched | no | no, on purpose | counting (counting only) |
| `logic.*`, `shapes-colours.*` | choice/order | abstraction itself | decorating them would obscure the lesson | untouched | no | no, on purpose | meadow |
| `match.*` (Memory Match) & match quest | cards | memory + the pairing | picture cards already carry the content | untouched | no | promotion arrives free as the library grows | — |
| `general-knowledge.*` quizzes (food, body, weather, transport, …) | choice | naming the world | glyph floor, structurally sound | untouched this phase; promotions arrive by `art:` lines, no code | no | future | meadow |

## The connect affordance (the called-out weakness)

A fresh connect board is four things on the left and four on the right,
and nothing that says "these join". The fix is the smallest one that
materially changes comprehension, and it is state, not motion:

- **`invited`** — the moment a node is chosen on one side, every open
  node on the *other* side wakes up: its border and port turn toward the
  water-blue the chosen node already has. The board itself answers
  "now what?" by pointing at every legal destination.
- The ports (the little sockets a line plugs into) carry the same state,
  so the affordance reads at the exact pixel the line will land on.
- No instructional text, no looping animation, no first-use modal. The
  screen-reader script already said it in words ("chosen. Now choose the
  one it goes with."); `invited` is the same sentence for the eyes.
- `data-connect-line` on every held line, so the measurement suite can
  prove lines appear on join, match the pair count when solved, and
  never survive into the next round.

Reduced motion: `invited` is a colour/border state with no transform and
no keyframe; the blanket reduced-motion rule needs nothing from it.

## What was deliberately not done

- No second GameShell, engine, animation word, or per-question JSX.
- No mechanic was changed. The audit looked for worksheet-feel and found
  the *worlds* (scenery, reactions, travel) already carry the context;
  what was missing was coverage (drawings) and affordance (invited).
- No decoration of abstract content (numbers, letters, shapes, logic).
- No new content tables — every new drawing promotes a fact that
  already existed.
- Bear, penguin, camel and the other L2+ animals stay glyph: their
  levels never draw, so a drawing would be dead weight until the ladder
  itself changes.

## Cultural safety

Unchanged and untouched: the barred vocabulary (`pig`, `piglet`,
`oink`, `pork`, `bacon`, `ham`) stays barred, no farm machinery is a
home, and every addition here (jungle, forest, desert, snow, tree
hollow, monkey, fox, bee, ladybird, banana, strawberry, orange,
biscuit, balloon, box) is universally recognizable. The safety sweep in
`tests/safety.test.ts` runs over every board these changes can deal.
