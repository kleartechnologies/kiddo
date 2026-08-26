import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { ACCENT_WORDS } from "@/lib/accents";
import {
  checkAnswer,
  checkStep,
  drawChallenges,
  labelOf,
  spokenOf,
} from "@/lib/content/challenges";
import { gapsIn, localizeChallenge, localizeRound, shapeOf } from "@/lib/content/i18n";
import { SENTENCES } from "@/lib/content/i18n/phrases";
import { currentChallenge } from "@/lib/content/progress";
import { ACTIVITIES } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Answer, Challenge, ContentItem } from "@/lib/content/types";
import {
  buildMathQuestSession,
  freshMathQuestState,
  mathQuestProgress,
  mathQuestReducer,
  type MathQuestAction,
  type MathQuestState,
} from "@/lib/games/mathQuest";
import { LOCALES } from "@/lib/i18n/locale";
import { dealRound, ROUND_NAMES } from "@/server/content";

/**
 * The questions themselves, in both languages.
 *
 * The interface is finite and its completeness is a type error; the content is
 * neither. KIDDO *deals* its questions — one addition activity is nineteen
 * hundred sums — so the sentences a child hears do not exist until the moment
 * they are dealt, and there is no list of them for a compiler to be exhaustive
 * over. This file is the other end of that guarantee: it deals the whole
 * registry, at every level, and reads every word that comes out.
 *
 * Three questions, and they are asked in this order because that is the order
 * they matter in.
 *
 *   1. **Is anything still English?** `gapsIn` hands back every sentence and
 *      every name the dictionary and the sentence book could not say. Empty is
 *      the only passing answer — one gap is a Malay question with an English
 *      word wedged in the middle of it, which is §13's mixed-language bug in
 *      the one place a four year old cannot read past.
 *   2. **Did the question change?** It must not have. Every id, the level, the
 *      age band, the activity and the order the options were dealt in cross
 *      untouched, so `checkAnswer` returns the identical verdict on the Malay
 *      board that it returns on the English one — asserted here against every
 *      option of every board, right and wrong, rather than argued for.
 *   3. **Did the right things stay put?** The word a child is being taught to
 *      read is the object of the lesson, not language: CAT must stay CAT, and
 *      the numbers in a sum must stay the numbers in that sum.
 *
 * The catalogue's own sweep — keys, holes, the switcher, which language KIDDO
 * opens in — is `tests/i18n.test.ts`.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * How many times each activity is dealt at each level.
 *
 * Twelve, and the number is load-bearing rather than arbitrary: at eight the
 * whole sentence book is reached and at six three entries are not, so this is
 * the smallest round number with real slack in it. Seventeen thousand
 * challenges, about two seconds.
 */
const SEEDS = 12;

/** The same splitting `localizeText` does, so a shape here is a shape there. */
const SENTENCE_END = /(?<=[.?!])\s+/;

/** Something with at least a word in it, rather than "3." or "A". */
const HAS_WORDS = /\p{L}{2}/u;

function itemsOf(challenge: Challenge): ContentItem[] {
  const items: ContentItem[] = [];
  for (const part of challenge.prompt.display ?? []) {
    if (part.kind === "item") items.push(part.item);
  }
  if (challenge.prompt.anchor) items.push(challenge.prompt.anchor);
  const payload = challenge.payload;
  if (payload.kind === "choice") for (const o of payload.options) items.push(o.item);
  if (payload.kind === "order") for (const o of payload.items) items.push(o.item);
  if (payload.kind === "match") for (const p of payload.pairs) items.push(p.left, p.right);
  if (payload.kind === "connect") {
    for (const n of payload.left) items.push(n.item);
    for (const n of payload.right) items.push(n.item);
  }
  return items;
}

/** Every dealt challenge in the product, once. */
function everything(seeds = SEEDS): Challenge[] {
  const all: Challenge[] = [];
  for (const activity of ACTIVITIES) {
    for (const level of activity.levels) {
      for (let seed = 0; seed < seeds; seed++) {
        all.push(...drawChallenges(activity, { level, count: 6, rng: createRng(seed) }));
      }
    }
  }
  return all;
}

/* One sweep, read by every test below. Dealing the registry twelve times over
   and saying all of it is the expensive part of this file, and there is no
   reason to do either more than once: both are pure functions of a seed, so
   the two arrays are the same two arrays every test sees, and `SAID[i]` is
   `DEALT[i]` in Bahasa Melayu. */
const DEALT = everything();
const SAID = DEALT.map((challenge) => localizeChallenge("ms", challenge));

/* --------------------------------------------------- is anything English -- */

/* 1 ---------------------------------------------------------------------- */
test("every word of every question can be said in Bahasa Melayu", () => {
  /* The whole promise of the content layer, and the only test in the suite
     that could be failed by adding a *question* rather than by adding code.
     A gap prints the exact line the sentence book is missing, ready to be
     written — see `shapeOf`. */
  assert.ok(DEALT.length > 10_000, "the sweep stopped dealing");

  const gaps = new Map<string, string>();
  for (const challenge of DEALT) {
    for (const gap of gapsIn("ms", challenge)) {
      if (!gaps.has(gap)) gaps.set(gap, challenge.activityId);
    }
  }

  const report = [...gaps].slice(0, 20).map(([gap, where]) => `${where}: ${gap}`);
  assert.deepEqual(report, [], `${gaps.size} things KIDDO cannot say in Malay`);
});

/* 2 ---------------------------------------------------------------------- */
test("the sentence book has no line nothing reaches", () => {
  /* The other direction, and the one that rots quietly. A book entry whose
     English sentence no pack deals any more is a translation being maintained
     for nobody — and, worse, a place a future reader will look to find out
     what KIDDO says and be told something it does not. Eight hundred and
     fifty entries, every one of them reachable. */
  const reached = new Set<string>();
  for (const challenge of DEALT) {
    for (const text of [challenge.prompt.speech, challenge.explanation, challenge.hint]) {
      for (const sentence of (text ?? "").split(SENTENCE_END)) {
        if (sentence.length === 0 || !HAS_WORDS.test(sentence)) continue;
        reached.add(shapeOf("ms", sentence));
      }
    }
    for (const item of itemsOf(challenge)) {
      const name = labelOf(item);
      if (name.length === 0 || !HAS_WORDS.test(name)) continue;
      /* A name is looked up whole before it is broken into holes, so both
         forms count as having been reached. */
      reached.add(name);
      reached.add(shapeOf("ms", name));
    }
  }

  const dead = Object.keys(SENTENCES.ms).filter((key) => !reached.has(key));
  assert.deepEqual(dead.slice(0, 20), [], `${dead.length} book entries nothing deals`);
  assert.ok(Object.keys(SENTENCES.ms).length > 800, "the book shrank");

  /* English holds nothing: an English sentence is already said. */
  assert.deepEqual(SENTENCES.en, {});
});

/* 3 ---------------------------------------------------------------------- */
test("a Malay question is Malay all the way through", () => {
  /* §13, checked on the finished board rather than on the pieces. Everything
     a person reads — the question, the explanation, the hint, the name of
     every tile — comes back different from the English it was dealt in,
     except the things that are deliberately not language. */
  for (const [index, challenge] of DEALT.entries()) {
    const said = SAID[index]!;
    for (const [before, after] of [
      [challenge.prompt.speech, said.prompt.speech],
      [challenge.explanation, said.explanation],
      [challenge.hint, said.hint],
    ] as const) {
      if (!before || !HAS_WORDS.test(before)) continue;
      assert.notEqual(after, before, `${challenge.activityId} still says "${before}"`);
    }
  }
});

/* ---------------------------------------------- did the question change? -- */

/* 4 ---------------------------------------------------------------------- */
test("English is the object it always was, not a copy of it", () => {
  /* Not a micro-optimisation — a promise. Every existing test in this suite
     deals a round and reads its English, so if `localizeChallenge("en", …)`
     ever started rebuilding the object, the thing those tests check and the
     thing a child plays would have quietly become two different objects. */
  for (const challenge of DEALT) {
    assert.equal(localizeChallenge("en", challenge), challenge);
  }
  const round = DEALT.slice(0, 10);
  const same = localizeRound("en", round);
  assert.deepEqual(same, round);
  for (const [index, challenge] of same.entries()) assert.equal(challenge, round[index]);
});

/* 5 ---------------------------------------------------------------------- */
test("nothing an answer is made of moves when the language does", () => {
  /* The claim `useSaid` rests on. A `picked` or `tried` id recorded while the
     board was English has to still name the same tile after a parent switches
     mid-round, or switching would corrupt the game rather than translate it
     (§14). Ids, and the order they were dealt in, both. */
  for (const [index, challenge] of DEALT.entries()) {
    const said = SAID[index]!;

    assert.equal(said.id, challenge.id);
    assert.equal(said.activityId, challenge.activityId);
    assert.equal(said.packId, challenge.packId);
    assert.equal(said.level, challenge.level, "difficulty moved with the language");
    assert.deepEqual(said.ageRange, challenge.ageRange);
    assert.equal(said.category, challenge.category);
    assert.equal(said.activityType, challenge.activityType);
    assert.equal(said.payload.kind, challenge.payload.kind);

    const before = challenge.payload;
    const after = said.payload;
    if (before.kind === "choice" && after.kind === "choice") {
      assert.equal(after.answerId, before.answerId);
      assert.deepEqual(
        after.options.map((o) => o.id),
        before.options.map((o) => o.id),
      );
    }
    if (before.kind === "order" && after.kind === "order") {
      assert.deepEqual(after.answerOrder, before.answerOrder);
      assert.deepEqual(
        after.items.map((o) => o.id),
        before.items.map((o) => o.id),
      );
    }
    if (before.kind === "match" && after.kind === "match") {
      assert.deepEqual(
        after.pairs.map((p) => p.id),
        before.pairs.map((p) => p.id),
      );
    }
    if (before.kind === "connect" && after.kind === "connect") {
      assert.deepEqual(after.pairs, before.pairs);
      assert.deepEqual(
        after.left.map((n) => n.id),
        before.left.map((n) => n.id),
      );
      assert.deepEqual(
        after.right.map((n) => n.id),
        before.right.map((n) => n.id),
      );
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("the same answer is right, and the same answers are wrong, in both", () => {
  /* §19's two hardest items — the correct answer is identical between locales
     and scoring is identical — asked of every option of every board rather
     than of a sample. A right answer that stayed right while a wrong one
     quietly became right would be the worst bug this project could ship, and
     it would look like nothing at all. */
  let asked = 0;
  for (const [index, challenge] of DEALT.entries()) {
    const said = SAID[index]!;
    const answers: Answer[] = [];

    const payload = challenge.payload;
    if (payload.kind === "choice") {
      for (const option of payload.options) answers.push({ kind: "choice", optionId: option.id });
    }
    if (payload.kind === "order") {
      answers.push({ kind: "order", itemIds: payload.answerOrder });
      answers.push({ kind: "order", itemIds: [...payload.answerOrder].reverse() });
      answers.push({ kind: "order", itemIds: payload.items.map((i) => i.id) });
    }
    if (payload.kind === "match") {
      answers.push({ kind: "match", pairIds: payload.pairs.map((p) => p.id) });
      answers.push({ kind: "match", pairIds: payload.pairs.slice(1).map((p) => p.id) });
    }
    if (payload.kind === "connect") {
      answers.push({ kind: "connect", links: payload.pairs });
      answers.push({ kind: "connect", links: payload.pairs.slice(1) });
      answers.push({
        kind: "connect",
        links: payload.pairs.map((p, index) => ({
          leftId: p.leftId,
          rightId: payload.pairs[(index + 1) % payload.pairs.length]!.rightId,
        })),
      });
    }

    for (const answer of answers) {
      asked++;
      assert.equal(
        checkAnswer(said, answer),
        checkAnswer(challenge, answer),
        `${challenge.id}: the language changed the verdict`,
      );
    }

    /* And exactly one option of a choice board is right, in Malay too. */
    if (payload.kind === "choice") {
      const right = payload.options.filter((o) =>
        checkAnswer(said, { kind: "choice", optionId: o.id }),
      );
      assert.equal(right.length, 1, `${challenge.id}: not exactly one right answer in Malay`);
      assert.equal(right[0]!.id, payload.answerId);
    }
  }
  assert.ok(asked > 20_000, "the sweep stopped asking");
});

/* ---------------------------------------- what is not language, and stays -- */

/* 7 ---------------------------------------------------------------------- */
test("the word a child is learning to read is never translated", () => {
  /* English is a *subject* in a Malaysian classroom and KIDDO treats it as
     one: in Bahasa Melayu the instructions, the praise and the explanations
     are Malay and the word under the microscope stays English, exactly as it
     is in a Malaysian workbook. Translating CAT to KUCING would not translate
     a rhyming question, it would delete it. */
  for (const [index, challenge] of DEALT.entries()) {
    const before = itemsOf(challenge);
    const after = itemsOf(SAID[index]!);
    assert.equal(after.length, before.length);

    for (const [index, item] of before.entries()) {
      const twin = after[index]!;
      assert.equal(twin.kind, item.kind, "a tile changed what it is");
      if (item.kind === "text" && twin.kind === "text") {
        assert.equal(twin.text, item.text, `${challenge.activityId} translated a reading word`);
        /* A `text` tile with no label of its own *is* its text, so none is
           added: a screen reader must hear the word, not a translation of it. */
        if (item.label === undefined) assert.equal(twin.label, undefined);
      }
      if (item.kind === "number" && twin.kind === "number") {
        assert.equal(twin.value, item.value, "a number moved");
      }
      if (item.kind === "count" && twin.kind === "count") {
        assert.equal(twin.value, item.value, "a group of dots changed size");
      }
      if (item.kind === "character" && twin.kind === "character") {
        /* A friend is a proper noun. PIP is PIP in every language, exactly as
           a child's own name is. */
        assert.equal(twin.characterId, item.characterId);
        assert.equal(spokenOf(twin), spokenOf(item));
      }
    }
  }
});

/* 8 ---------------------------------------------------------------------- */
test("no pack ever teaches a colour word as a reading word", () => {
  /* The assumption `SHOUTED_COLOURS` is built on, checked rather than
     trusted. A word in capitals inside a KIDDO sentence is either a swatch's
     name — which must be translated — or a word the child is reading — which
     must not. Five strings tell them apart, and the day a phonics activity
     deals RED as a word to sound out, that separation stops being true and
     this fails instead of a child being shown *MERAH* to spell. */
  const colours = new Set(Object.values(ACCENT_WORDS).map((word) => word.toUpperCase()));
  assert.ok(colours.size >= 5, "the colour words went missing");

  for (const challenge of DEALT) {
    for (const item of itemsOf(challenge)) {
      if (item.kind !== "text" || item.label !== undefined) continue;
      assert.ok(
        !colours.has(item.text.toUpperCase()),
        `${challenge.activityId} teaches "${item.text}" as a word to read`,
      );
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("a group of dots is counted in the language it is shown in", () => {
  /* The one tile whose spoken name is not its label. A screen reader on a
     Malay board hears "4 titik"; the caption under the tile is still nothing
     and the answer KIDDO says out loud is still "4", so the count moved and
     the sum did not. */
  let counted = 0;
  for (const [at, challenge] of DEALT.entries()) {
    const before = itemsOf(challenge);
    const after = itemsOf(SAID[at]!);
    for (const [index, item] of before.entries()) {
      if (item.kind !== "count") continue;
      counted++;
      const twin = after[index]!;
      assert.equal(item.spoken, undefined, "English stamped a spoken name");
      assert.equal(spokenOf(item), item.value === 1 ? "1 dot" : `${item.value} dots`);
      assert.equal(spokenOf(twin), `${item.value} titik`);
      assert.equal(labelOf(twin), String(item.value), "the numeral moved");
    }
  }
  assert.ok(counted > 100, "no board deals dots any more");
});

/* -------------------------------------------------------------- the seams -- */

/* 10 --------------------------------------------------------------------- */
test("a round dealt by the server arrives already said", () => {
  /* The deal-time seam. `locale` is part of dealing rather than something done
     to a dealt round afterwards, so a caller that asked for Malay is never
     sent English to translate — which is also §12's rule, in the one place
     content is composed on a server. */
  assert.ok(ROUND_NAMES.length > 0);
  for (const name of ROUND_NAMES) {
    const english = dealRound(name, 1, 4, "en");
    const malay = dealRound(name, 1, 4, "ms");
    assert.ok(english && malay, `${name} deals nothing`);
    assert.equal(malay.length, english.length, `${name}: a language changed the round`);

    for (const [index, challenge] of english.entries()) {
      const said: Challenge = malay[index]!;
      assert.equal(said.id, challenge.id, `${name}: the same seed dealt a different question`);
      assert.equal(said.level, challenge.level);
      /* Asked of the English round, because that is the question: could
         every word of what was dealt be said? `gapsIn` reports what came out
         unchanged, and a Malay sentence handed to it comes out unchanged for
         the happiest of reasons. */
      assert.deepEqual(gapsIn("ms", challenge), [], `${name}: cannot be said in Malay`);
      if (HAS_WORDS.test(challenge.prompt.speech)) {
        assert.notEqual(
          said.prompt.speech,
          challenge.prompt.speech,
          `${name}: dealt an English sentence`,
        );
      }
    }
  }
});

/* 11 --------------------------------------------------------------------- */
test("a language KIDDO does not speak is English, never an error", () => {
  /* The content is what was paid for. Refusing to deal a round over a bad
     `locale` string would be a new way to lock a child out of something they
     own, so an unknown language falls back rather than failing. */
  const name = ROUND_NAMES[0]!;
  const english = dealRound(name, 1, 4, "en");
  assert.ok(english);
  for (const bad of ["bm", "ms-MY", "", null, undefined, 7, {}]) {
    const dealt = dealRound(name, 1, 4, bad);
    assert.ok(dealt, `${JSON.stringify(bad)} refused to deal`);
    assert.deepEqual(
      dealt.map((c) => c.prompt.speech),
      english.map((c) => c.prompt.speech),
    );
  }
});

/* 12 --------------------------------------------------------------------- */
test("a round is said once — at the deal, or at the read, never both", () => {
  /* Two seams on purpose, and the reason is in both files: the server never
     re-reads a round, so it says it once at the deal; the browser has a
     parent who may switch language mid-round, so a game reduces over the
     English it was dealt and says it on the way out. Saying a round twice
     would be harmless today and wrong the first time a book entry is not
     idempotent, so the contract is written down and kept here. */
  const server = read("src/server/content.ts");
  assert.match(server, /localizeRound\(said,/);
  assert.match(server, /must not be passed\s+\*? ?through `useSaid` as well/);

  const hook = read("src/lib/content/i18n/useSaid.ts");
  assert.match(hook, /if \(locale === "en"\) return state;/);
  assert.match(hook, /useMemo/, "switching language would re-deal the round");
  assert.doesNotMatch(hook, /dispatch|useState|useReducer/, "the seam touches game state");

  /* And saying an already-said round changes nothing, in either language. */
  for (const locale of LOCALES) {
    for (const challenge of DEALT.slice(0, 200)) {
      const once = localizeChallenge(locale, challenge);
      assert.deepEqual(localizeChallenge(locale, once), once);
    }
  }
});

/* 13 --------------------------------------------------------------------- */
test("a language changed mid-round moves nothing a child was in the middle of", () => {
  /* What `useSaid` does, written out: the reducer's own state is not passed
     through anything, and the round it is indexing into is replaced by the
     same round in the reader's language. If a switch could lose a child's
     place, it would be lost here. */
  const said = (state: MathQuestState): MathQuestState => ({
    ...state,
    run: { ...state.run, challenges: localizeRound("ms", state.run.challenges) },
  });

  const play = (...actions: MathQuestAction[]) =>
    actions.reduce(mathQuestReducer, freshMathQuestState(buildMathQuestSession(createRng(3))));

  /* Two questions in, one wrong answer tried, one tile under a finger. */
  const opening = play({ type: "begin" }, { type: "settle" });
  const first = currentChallenge(opening.run);
  assert.ok(first && first.payload.kind === "choice");
  const right = first.payload.answerId;
  const wrong = first.payload.options.find((option) => option.id !== right)?.id;
  assert.ok(wrong, "a board with no distractor cannot be got wrong");

  /* Answered once and wrongly: a tile is lit up under a finger, another is
     dimmed, and the question is still open. The worst moment to switch. */
  const midway = play({ type: "begin" }, { type: "settle" }, { type: "answer", optionId: wrong });
  assert.equal(midway.phase, "incorrect", "the test itself must be mid-question");
  assert.equal(midway.picked, wrong);
  assert.deepEqual(midway.tried, [wrong]);

  const switched = said(midway);
  assert.equal(switched.phase, midway.phase, "the phase restarted");
  assert.equal(switched.picked, midway.picked, "the tile under the finger moved");
  assert.deepEqual(switched.tried, midway.tried, "a wrong answer came back");
  assert.equal(switched.run.index, midway.run.index, "the child lost their place");
  assert.deepEqual(switched.run.completed, midway.run.completed);
  assert.deepEqual(mathQuestProgress(switched), mathQuestProgress(midway));

  /* The question is the same question — same board, same options, in the same
     order — and the answer the child had already ruled out is still wrong. */
  const before = currentChallenge(midway.run);
  const after = currentChallenge(switched.run);
  assert.ok(before && after);
  assert.equal(after.id, before.id);
  assert.ok(before.payload.kind === "choice" && after.payload.kind === "choice");
  assert.deepEqual(
    after.payload.options.map((option) => option.id),
    before.payload.options.map((option) => option.id),
  );
  for (const option of after.payload.options) {
    const answer: Answer = { kind: "choice", optionId: option.id };
    assert.equal(checkAnswer(after, answer), checkAnswer(before, answer));
  }

  /* And carrying on from there works: the answer that was right before the
     switch is still the answer that finishes the question after it. */
  const finished = ([
    { type: "settle" },
    { type: "answer", optionId: right },
    { type: "settle" },
  ] as MathQuestAction[]).reduce(mathQuestReducer, switched);
  assert.equal(finished.run.index, midway.run.index + 1, "the right answer stopped working");
  assert.deepEqual(finished.run.completed, [before.id]);

  /* Only the words changed. */
  assert.notEqual(after.prompt.speech, before.prompt.speech);
});

/* 14 --------------------------------------------------------------------- */
test("a joined-up board keeps its lines when the language changes", () => {
  /* The one board with state of its own — `useConnect` restarts on a new
     board, and a said board must never look like a new one to it. */
  const boards = DEALT.filter((challenge) => challenge.payload.kind === "connect");
  assert.ok(boards.length > 40, `only ${boards.length} joined-up boards to check`);

  for (const board of boards.slice(0, 300)) {
    const twin = localizeChallenge("ms", board);
    assert.ok(board.payload.kind === "connect" && twin.payload.kind === "connect");
    assert.deepEqual(
      twin.payload.left.map((node) => node.id),
      board.payload.left.map((node) => node.id),
      `${board.id} moved a node`,
    );
    assert.deepEqual(
      twin.payload.right.map((node) => node.id),
      board.payload.right.map((node) => node.id),
      `${board.id} moved a node`,
    );
    /* Every line already joined is still joined, and every line not yet
       joined is still wrong. */
    for (const left of board.payload.left) {
      for (const right of board.payload.right) {
        const answer: Answer = { kind: "connect", links: [{ leftId: left.id, rightId: right.id }] };
        assert.equal(
          checkStep(twin, answer),
          checkStep(board, answer),
          `${board.id}: ${left.id}–${right.id} changed its mind`,
        );
      }
    }
  }
});

/* 15 --------------------------------------------------------------------- */
test("the engines that restart on a new board are never handed a said one", () => {
  /* `useConnect` and `useOrder` treat the challenge object as the identity of
     the board and start over when it changes — which is right for a new
     board and catastrophic for a translated one. Every game hook therefore
     keeps its engine on the English round and says it afterwards. That is an
     ordering, so it is checked as one. */
  for (const hook of [
    "src/lib/games/useMathQuestGame.ts",
    "src/lib/games/useGeneralKnowledgeQuest.ts",
    "src/lib/games/useMatchQuestGame.ts",
    "src/lib/games/useLogicQuestGame.ts",
    "src/lib/games/useEnglishQuest.ts",
    "src/lib/games/useShapesColoursQuest.ts",
  ]) {
    const source = read(hook)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const engine = source.search(/\buse(Connect|Order)\(/);
    const seam = source.search(/\buseSaid(Challenge)?\(/);
    assert.ok(seam >= 0, `${hook} never says its round`);
    if (engine >= 0) {
      assert.ok(engine < seam, `${hook} hands its engine a said board`);
    }
    for (const [, argument] of source.matchAll(/\buse(?:Connect|Order)\(([^)]*)\)/g)) {
      assert.doesNotMatch(argument!, /said/i, `${hook} hands its engine a said board`);
    }
    /* And the reducer that owns the child's place never sees a language. */
    assert.doesNotMatch(source, /locale/, `${hook} reduces over a language`);
  }
});
