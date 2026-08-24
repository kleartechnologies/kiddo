# KIDDO Child Experience Audit — Phase 12, Stage A

Date: 2026-08-24.
Scope: every playable activity — the 9 world doors (Easy / Medium / Hard) and the 8 quest games on /play — plus the screens around them (landing, child home, world pages, activity intro, celebration, parent dashboard).

## Honesty note (read first)

KIDDO has **not** been tested with real children. Nothing below claims a child did or felt anything. Every finding is tagged:

- **MEASURED** — taken from code read in full, from the browser measurement suites (all green on this build: journey, worlds, parents, plus the standing Phase 11 battery), or from screenshots captured on this build at 360×640 / 768×1024 / 1440×900.
- **JUDGMENT** — design judgment, imagining a first-time 4–8-year-old, applied against the questions in the Phase 12 brief. It is an informed guess, not evidence.

Real child testing remains outstanding and is the only way to confirm or refute the JUDGMENT items.

## How this audit was made

1. Read, in full: all four stage engines (Choice, Connect, Match, Order), ChallengeStage, PromptDisplay, ContentItemView, GameShell, Celebration, TierPicker, GameWorld + world definitions, WorldActivityGame, the 9 door tier plans, and every content generator those doors draw from (math, shapes, english, general-knowledge packs).
2. Ran the measurement suites with screenshots on: `measure:journey --quick`, `measure:worlds --quick`, `measure:parents` (all pass, 0 console errors), plus a manual capture of the landing page. 40+ screenshots inspected.
3. Walked each door tier-by-tier through the brief's 17 questions, then through SEE → UNDERSTAND → TOUCH → DISCOVER → SUCCEED → CELEBRATE → WANT TO PLAY AGAIN.

Ratings in the table: **Strong / Good / Fair / Weak** — JUDGMENT unless noted.

---

## 1. Door-by-door audit

### Counting Garden

**Count the Apples** (counting-objects + counting; Hard adds shape-counting)
- *What do I do?* Count the things on the board, tap the number. Understandable without reading: mostly yes — the board shows countable things and number tiles (MEASURED: screenshots show things in the world scene with numbers on garden sign posts).
- Easy: 1–5 things, drawn KIDDO art, 3 tiles, near-miss distractors. Medium: 4–10, emoji, 3 tiles. Hard: 6–10, 4 tiles, pip *blocks* vs rows (keeping-track skill) plus "how many circles / blue ones?" selective counting — a genuinely different kind of thinking, not just bigger numbers. The Easy→Medium→Hard ladder is honest (MEASURED: tier plans + generators).
- Weakness (MEASURED in code): the Easy tier mixes in `counting` slots that deal **bare pips (dots)** — the least garden-like board in the whole world, on the very first door a child opens. JUDGMENT: a first-timer in a "garden" deserves flowers, not dots.
- Feedback satisfying: yes — tap → tile settles, host reacts, explanation line teaches ("There are 7."). Celebration: same as everywhere (see cross-cutting).
- Replay: fair — 14 countable things and varied counts; counting is inherently repetitive; the Hard-tier block arrangement is the surprise.

**Count the Flowers**
- Starts at L2 (correct — it's the second door; its Easy ≈ Apples' Medium). Comparison rounds ("Which number is bigger / biggest?") use tiles-as-the-question — clean, no clutter.
- Weakness (MEASURED): the door is called *Count the Flowers* but the generator deals any of 14 things — the captured Medium round asks to count **bees** (screenshot vp-phone-360-640-round). JUDGMENT: a small broken promise; a child sent to count flowers may count cars.
- Difficulty ramp honest; superlatives at 3-value boards are real reasoning.

**Find the Number** (number-recognition, before/after/between; Hard adds missing-number)
- The reversal (numeral shown → pick the quantity) is good pedagogy; before → after → between is the best-authored ramp in math; missing-number runs (up/down, step 1–2) make Hard genuinely "I really have to think".
- Weakness: the whole door is numerals + pips — the least illustrated door in the garden. JUDGMENT: acceptable as the SYMBOL end of the PICTURE→WORD→SYMBOL ladder, but it is the door weakest at "I am playing with something", and its intro screen (see cross-cutting) does nothing to soften that.

### Animal Adventure

**Find the Home** (connect, travel)
- The strongest single activity in KIDDO. Join an animal to its home and the animal **walks into it** (MEASURED: travel prop; worlds screenshots show creature capsules, path joins, check badges). ~half of Easy boards are fully KIDDO-drawn; avoid-tables keep every board honestly single-answer; pairs go 2→3→4 with less-familiar animals at Hard.
- Weakness (carried from Phase 10, still true — MEASURED in code): **before the first tap nothing invites the child in.** The `invited` state (dashed tide border on the other side) only wakes after a first selection. The first board relies entirely on the prompt sentence. JUDGMENT: this is the single weakest "what can I touch?" moment in the product, on its best game.
- Replay: strong — the walk is the reward; boards vary widely.

**Who Lives Here?** (choice mix: names, sounds, babies, homes)
- Most varied door content-wise; distractor policy (avoid/except tables) is excellent — no unfair boards found (MEASURED: tables read in full). "Which animal says moo?" works read-aloud.
- Weakness: five taps of the same gesture; variety is entirely in the content, none in the interaction. JUDGMENT: fine for a quiz door, but it is the door most like a (nicely dressed) quiz.

**Land or Sea?** (homes, diet, land-and-water)
- Diet's food-first tiles with the animal as hero picture have good visual logic. Land-and-water's property questions ("Which one is made of water?") are real thinking.
- Weakness (MEASURED): the land-and-water place tiles are emoji-only — the pack never attaches art, even though `habitats.ts` already has drawn PLACE_ART for sea, forest, desert, pond, nest and more. Easy boards here can arrive with **zero KIDDO drawings**. This is the cheapest visual win in the audit.

### Word World

**Alphabet Adventure** (letter-recognition, letter-case)
- The lookalike confusion tables (b/d/p/q; M/W/N at Hard) are excellent difficulty engineering. Letters are named in the prompt, tiles are pure letter shapes — honest (naming the letter on the tile would answer the question).
- Weakness: visually the most worksheet-like door — text tiles on a page. The book look (pages, ribbon, bookmark — MEASURED: screenshots) carries all the charm. JUDGMENT: acceptable by design, but this door leans hardest on a grown-up reading the prompt aloud.

**Rhyming Friends** (connect)
- Word cards carry pictures where art exists (MEASURED: MOUSE + mouse art, DOG, HOUSE, CAKE in screenshots) — the best use of art in English. Hard always seeds a sound-only pair (BEAR–CHAIR) — real listening, not spelling-matching.
- Weakness: rhyme is a *sound* and the app is nearly silent; at Medium+ many word tiles have no picture. JUDGMENT: for a pre-reader without a grown-up, Medium+ here is the most opaque board in KIDDO. Within the read-aloud design intent, but the picture coverage (13 of 41 pairs' words drawn) sets the floor.

**Word Discovery** (beginning/ending sounds, spelling; Hard adds sound-partners connect)
- `C _ T` with an anchor picture is SEE→UNDERSTAND at its best. Authored wrong-letter lists mean no accidental real words. The Hard-tier sound-partners connect (pictures → letters) removes reading exactly when difficulty rises — good design.
- Weakness: ending sounds is the hardest listening task and arrives with the least scaffolding; acceptable at the world's third door. Minor.

### The 8 quest games on /play (Memory Match, Find It!, Math Quest, English Quest, Logic Quest, Shapes & Colours Quest, Match Quest, General Knowledge Quest)

All "ready" (MEASURED: games.ts). They share the same engines and content packs as the doors, wrapped in topic pickers rather than worlds. Memory Match and Find It! are their own formats (face-down pairs; find-in-scene) and are the most game-like things on /play. JUDGMENT: their child experience rises and falls with the same engine/feedback findings below; they do not get the world layer (backdrop, looks, reactions), so a quest round feels plainer than a door round — that is the deliberate trade of the doors being the "adventure". Order-based rounds (What Comes Next, alphabet order) use OrderStage, whose numbered dashed slots + armed-next-slot are clear (MEASURED: code); no door deals Order or Match looks (MEASURED: all three worlds use line-family joins; `cards`→MatchStage is Match Quest only).

---

## 2. Screens around the games (MEASURED: screenshots)

- **Landing**: strong. Clear promise, world cards, honest pricing line, phone mockups of real boards. No change proposed.
- **Child home**: warm, KIDDO greets by name, one clear primary action, world cards with New/hero art. Strong.
- **World pages**: the best screens in the product — backdrop hero, host speech, keepsake row ("No flowers yet" → grown flowers), one glowing next-door card, per-door tier chips when earned. Strong.
- **Activity intro**: **the emptiest screen in KIDDO.** At 360×640 it is a large blank sky-blue panel with a small floating host and one button (MEASURED: 03-round-intro). Nothing shows what the child is about to play with; the world's own scenery (tree, flowers, hills) that appears on every *board* is absent from the intro. This is every child's first sight of every game.
- **Round screen**: good — progress pips, host + speech, world-scene board, chunky tiles on world-styled sign posts. One flaw: at phone width the speech bubble reserves noticeably more height than its text (MEASURED: vp-phone-360-640-round — roughly two text-lines of empty bubble below "How many bees can you count?").
- **Celebration**: warm, and **visually identical at every tier** — the Easy and Medium celebration screenshots differ in nothing but one grey subtitle line (MEASURED: 04 vs 04b). Same character pose, same three confetti flecks, same layout. There is also no distinct moment anywhere for completing a whole world (MEASURED: code — the third keepsake fills the same way as the first).
- **TierPicker**: clear ("Ready for a bigger challenge?", ✓/→/🔒, 48px targets). Strong.
- **Connect boards**: creature capsules / book pages read beautifully; after all joins in Animal Adventure the left capsules sit **empty** (the animal walked home) — four blank pill shapes with checks (MEASURED: animals done shot). Understandable once you saw the walk; slightly hollow as a final picture.
- **Parent dashboard**: calm, honest ("Short rounds, no scores… nothing is ever locked or taken away"). Strong.

## 3. Heuristic walk: SEE → UNDERSTAND → TOUCH → DISCOVER → SUCCEED → CELEBRATE → WANT TO PLAY AGAIN

| Step | State | Weakest places |
|---|---|---|
| SEE | Strong | Find the Number, Alphabet Adventure (symbol-end of the ladder — by design); activity **intro screen** (empty) |
| UNDERSTAND | Good | First-ever connect board (nothing says "touch one"); word tiles without pictures for pre-readers |
| TOUCH | Strong | — (44px+ everywhere, card affordances consistent; MEASURED by suites) |
| DISCOVER | Good | Quiz doors (Who Lives Here?, Land or Sea?) — five identical gestures, discovery is content-only |
| SUCCEED | Strong | Retry line repeats quickly (2 variants) |
| CELEBRATE | **Fair** | Flat hierarchy: Easy = Medium = Hard = last-door-of-world (MEASURED) |
| PLAY AGAIN | Good | A fully-finished door offers nothing newly *visible*; carried by content variety + "Play again" |

---

## 4. Full activity table

Ratings are JUDGMENT informed by MEASURED code/screens. E/M/H = does that tier feel right and meaningfully step up?

| Activity | Easy | Medium | Hard | Visual | Fun | Clarity | Replay | Main weakness | Best improvement |
|---|---|---|---|---|---|---|---|---|---|
| Count the Apples | Good | Good | Strong | Good | Good | Strong | Fair | Bare-pip boards inside the garden's first door | Deal drawn things, not dots, at Easy |
| Count the Flowers | Good | Good | Good | Good | Good | Strong | Fair | Title says flowers, board may deal bees/cars | Bias the pool to garden things |
| Find the Number | Good | Good | Strong | Fair | Fair | Strong | Fair | Least illustrated door; abstract by design | Warmer intro + world-fit framing |
| Find the Home | Strong | Strong | Strong | Strong | Strong | Good | Strong | Nothing invites the first tap on a connect board | Calm first-touch invitation |
| Who Lives Here? | Good | Good | Good | Good | Good | Strong | Good | Five identical taps; quiz-like | More praise/line variety; keep content variety |
| Land or Sea? | Good | Good | Good | Fair | Good | Strong | Good | Emoji-only place tiles; zero-drawing Easy boards possible | Reuse existing PLACE_ART on tiles |
| Alphabet Adventure | Good | Good | Strong | Fair | Fair | Good | Fair | Most worksheet-like boards (text tiles) | Lean on book look; intro that shows the book |
| Rhyming Friends | Strong | Good | Strong | Good | Strong | Fair | Good | Wordless-reader opacity at M+ where art is missing | Extend WORD_ART coverage |
| Word Discovery | Good | Good | Strong | Good | Good | Strong | Good | Ending sounds thinly scaffolded | Minor copy/hint polish only |
| Memory Match | Good | Good | n/a | Good | Strong | Strong | Strong | No world layer; plainer chrome | None needed now |
| Find It! | Good | Good | n/a | Good | Strong | Strong | Strong | Same | None needed now |
| Math Quest | Good | Good | Good | Fair | Good | Strong | Good | Engine findings apply; no world dressing | Inherits engine fixes |
| English Quest | Good | Good | Good | Fair | Good | Strong | Good | Same | Inherits engine fixes |
| Logic Quest | Good | Good | Good | Fair | Good | Strong | Good | Same | Inherits engine fixes |
| Shapes & Colours Quest | Good | Good | Good | Good | Good | Strong | Good | Same | Inherits engine fixes |
| Match Quest | Good | Good | Good | Good | Strong | Good | Strong | MatchStage invited-state is subtle | Inherits connect improvements |
| General Knowledge Quest | Good | Good | Good | Fair | Good | Strong | Good | Same | Inherits engine fixes |

---

## 5. Top 10 child-experience improvements

Ranked by (1) how much it reduces child confusion, (2) fun/replay impact, (3) visual quality, (4) learning clarity, (5) how often a child meets it — **not** by implementation convenience.

| # | Priority | Improvement | Why it wins on the criteria |
|---|---|---|---|
| 1 | **P0** | **Fill the activity intro screen.** Put the world into the intro board: scenery props + the host *in* the scene + a hint of the things about to be played with (e.g. a couple of apples/paw prints/letters), instead of a blank sky. | Met on **every** round of every door; it is the first thing a child ever sees in a game and today it shows nothing to be curious about. (MEASURED emptiness.) |
| 2 | **P0** | **Give celebrations a real hierarchy.** Keep small-success feedback as is; make activity completion the anchor; add a stronger flourish for a Hard finish; add a distinct world-completion moment when the third keepsake arrives ("your whole garden is in bloom"). | The brief's own rule — "if everything is a celebration, nothing feels special" — currently describes the product (MEASURED: identical tier celebrations; no world moment). |
| 3 | **P0** | **Invite the first touch on connect boards.** Before any selection, give the left column a calm, *static* invitation (the existing dashed-tide `invited` treatment, or slightly enlarged ports) so the board itself says "touch one of these". No arrows, no flashing, no looping. | Weakest UNDERSTAND step, sitting on the best game (Find the Home) and every other connect board; flagged in Phase 10 and still unaddressed. |
| 4 | P1 | **No bare-pip boards on Counting Garden's first door at Easy.** Fill Count the Apples T1 with drawn-thing counting; keep pips for Medium+ where the scaffold ladder wants them. | First-door, first-tier, highest-frequency entry point; world-fit and visual quality at the exact moment of first impression. |
| 5 | P1 | **Make Count the Flowers deal garden things.** Bias/limit its pool (flower, tree, apple, strawberry, bee…) so the door keeps its promise. | Learning clarity + trust; data-only change. |
| 6 | P1 | **Attach existing PLACE_ART to land-and-water tiles.** Sea, forest, desert, pond, nest already have drawn art in habitats.ts; the world pack just never uses it. | Removes the only Easy boards in KIDDO that can arrive with zero drawings; pure data reuse, no new art. |
| 7 | P1 | **Tighten the prompt bubble on phones.** Stop reserving ~2 empty text lines below short prompts at 360px. | Met on every round on the primary (mobile) viewport; visual quality. (MEASURED.) |
| 8 | P1 | **More voice variety in feedback.** Grow correct/retry lines from 2 variants to 4–5 calm ones each (retry stays non-punishing: "Almost! Let's look again."-family), and let the explanation carry the moment. | Five-slot rounds repeat praise quickly; the brief calls out repetitive "Great!" fatigue directly. |
| 9 | P2 | **Extend WORD_ART for rhyming pairs.** Add drawn art for a handful of high-frequency rhyme words used at Medium so more boards carry pictures for pre-readers. | Clarity for the least-readable boards; costs new art, so P2. |
| 10 | P2 | **Settle the emptied connect board.** After an animal walks home, leave a small calm trace in the left capsule (e.g. faded paw print) so the finished board reads "everyone went home", not "four blank pills". | Final-picture polish on the flagship interaction; low frequency (end of board), so P2. |

**Deliberately not proposed:** XP/coins/streaks/timers or any mechanic on the banned list; a second GameShell or animation framework; redesigning KIDDO or the engines; changes to Memory Match / Find It! / quest chrome; landing/home/world-page/parents changes (they measured strong).

## 6. Stage B implementation plan

Order of work (P0 → P1; P2 only if P0/P1 land cleanly and verified):

1. **Intro scene (P0-1)** — extend the intro board in WorldActivityGame/GameShell's intro state to render the world backdrop's ground band + 2–3 world props + host in-scene, using existing backdrop/art components. Data-driven per world; reduced-motion safe (static scene); decorative art aria-hidden.
2. **Celebration hierarchy (P0-2)** — parameterize Celebration by moment (`easy | medium | hard | world`): scale confetti count/spread and one extra beat (e.g. keepsake bloom) for hard/world; world-completion copy + moment triggered when the last door of a world completes (Journey already knows). Reduced motion: hierarchy must survive via composition/copy, not motion alone.
3. **Connect first-touch invitation (P0-3)** — in ConnectStage (and MatchStage's shelf equivalent): when nothing is selected and nothing is matched yet, apply the existing invited look statically to the choose-from side. Remove it after first selection forever (session-local). No new animation.
4. **Door data fixes (P1-4, P1-5)** — adjust Count the Apples T1 plan and Count the Flowers thing-pool via tier-plan/params (data + registry only; concept counts unchanged — verify against the measured-concepts rule).
5. **PLACE_ART on world.ts tiles (P1-6)** — attach art in the land-and-water pack where ids match habitats' PLACE_ART.
6. **Prompt bubble height (P1-7)** — CSS/min-height fix in PromptDisplay at narrow widths.
7. **Feedback line variety (P1-8)** — copy additions in WorldActivityGame lines.
8. **P2 items (9, 10)** — only if the battery is green after the above.

After each slice, and in full at the end: `npm test`, `tsc --noEmit`, lint, build, `test:rules`, then `measure:visual`, `measure:worlds`, `measure:journey --quick`, `measure:quest-magic --quick`, `measure:parents`, `measure:landing`, `measure:account`, plus the complete cultural-safety sweep after any content change. New behavior gets tests; no existing assertion is weakened.

---

*Stage A ends here per the Phase 12 brief: audit and plan only — no product code has been changed.*
