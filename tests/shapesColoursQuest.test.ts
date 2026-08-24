import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { challengeKey, conceptKey } from "@/lib/content/challenges";
import { currentChallenge } from "@/lib/content/progress";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import { GAMES, getGame, UPCOMING_THEMES } from "@/data/games";
import {
  answerLabelOf,
  buildShapesQuestSession,
  freshShapesQuestState,
  shapesQuestPrompt,
  shapesQuestProgress,
  shapesQuestReducer,
  SHAPES_QUEST_LENGTH,
  SHAPES_QUEST_PLAN,
  SHAPES_QUEST_TIMING,
  type ShapesQuestAction,
  type ShapesQuestState,
} from "@/lib/games/shapesColoursQuest";
import { SHAPES_ACTIVITIES } from "@/lib/content/packs/shapes";

/**
 * A whole round of Shapes & Colours Quest, played without React.
 *
 * The same shape as `logicQuest.test.ts`, deliberately: the games share every
 * question they ask and not one of their rules, and the way to show that this
 * really is its own game — rather than Logic Quest with circles in it — is
 * that its rules can be stated, and broken, on their own. The rule that is
 * only here is the concept-level de-duplication of a round, and it has a test
 * of its own below.
 *
 * The last four tests read source files rather than a rendered page. There is
 * no DOM in this project's test runner, and an accessibility promise that is
 * never asserted is a promise that quietly stops being true — so they assert
 * what can honestly be asserted from here, and say so.
 */

function run(state: ShapesQuestState, ...actions: ShapesQuestAction[]): ShapesQuestState {
  return actions.reduce(shapesQuestReducer, state);
}

function optionsOf(state: ShapesQuestState) {
  const challenge = currentChallenge(state.run);
  assert.ok(challenge && challenge.payload.kind === "choice");
  return challenge.payload;
}

/** The id of the right answer, straight from the content. */
function rightAnswer(state: ShapesQuestState): string {
  return optionsOf(state).answerId;
}

/** Any id that is not the right answer. */
function wrongAnswer(state: ShapesQuestState): string {
  const payload = optionsOf(state);
  const wrong = payload.options.find((option) => option.id !== payload.answerId);
  assert.ok(wrong, "every board should have a distractor");
  return wrong.id;
}

/** Start a real round, past the intro and ready to be answered. */
function started(seed = 5): ShapesQuestState {
  const dealt = freshShapesQuestState(buildShapesQuestSession(createRng(seed)));
  return run(dealt, { type: "begin" }, { type: "settle" });
}

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* 1 ---------------------------------------------------------------------- */
test("a round is ten challenges, drawn rather than written", () => {
  assert.equal(SHAPES_QUEST_LENGTH, 10);
  assert.equal(SHAPES_QUEST_PLAN.slots.length, 10);

  for (const seed of [0, 1, 42, 1234]) {
    const session = buildShapesQuestSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length}`);
  }

  /* No round repeats an id: two slots may land on the same activity, and a
     generated id is only unique inside one draw. */
  for (let seed = 0; seed < 80; seed++) {
    const ids = buildShapesQuestSession(createRng(seed)).map(
      (challenge: Challenge) => challenge.id,
    );
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("no round asks the same *idea* twice — this game's own rule", () => {
  /* Math, English and Logic de-duplicate a round by board. This one does it by
     concept, because fourteen activities built from small ideas can deal
     thousands of different-looking boards from the same handful of lessons:
     "which one is the circle?" three times in three colours is three different
     boards and one question. */
  for (let seed = 0; seed < 200; seed++) {
    const session = buildShapesQuestSession(createRng(seed));
    const ideas = session.map(conceptKey);
    assert.equal(
      new Set(ideas).size,
      ideas.length,
      `seed ${seed} taught the same thing twice: ${ideas.join(" / ")}`,
    );
    /* Which of course also means no repeated board. */
    const boards = session.map(challengeKey);
    assert.equal(new Set(boards).size, boards.length);

    /* And the other half of the promise: KIDDO never says the same sentence
       about the same answer twice. Two boards can teach different things and
       still land as the same moment — "which one is blue?" over four hexagons
       and again over four different shapes, blue tapped both times. Before
       this rule existed that happened in sixteen rounds out of five hundred. */
    const asked = session.map(
      (challenge) => `${challenge.prompt.speech}|${answerLabelOf(challenge)}`,
    );
    assert.equal(
      new Set(asked).size,
      asked.length,
      `seed ${seed} asked the same question twice: ${asked.join(" / ")}`,
    );
  }
});

/* 2b --------------------------------------------------------------------- */
test("but the same words over a genuinely different puzzle are still allowed", () => {
  /* The rule above must not be a blunt ban on a repeated sentence. "Which one
     comes next?" over two different patterns is one sentence and two real
     puzzles, and a round that refused the second would lose its variety for
     nothing. If this ever stops happening, the key has been over-tightened. */
  let roundsWithARepeatedSentence = 0;
  for (let seed = 0; seed < 200; seed++) {
    const spoken = buildShapesQuestSession(createRng(seed)).map(
      (challenge) => challenge.prompt.speech,
    );
    if (new Set(spoken).size !== spoken.length) roundsWithARepeatedSentence++;
  }
  assert.ok(
    roundsWithARepeatedSentence > 20,
    `only ${roundsWithARepeatedSentence} of 200 rounds reused a question — over-tightened`,
  );
});

/* 3 ---------------------------------------------------------------------- */
test("a round climbs from very easy to harder, and never the other way", () => {
  const levels = SHAPES_QUEST_PLAN.slots.map((slot) => slot.level);
  assert.deepEqual(
    [...levels].sort((a, b) => a - b),
    levels,
    "the plan's levels go down somewhere",
  );
  assert.equal(levels[0], 1);
  assert.equal(levels[levels.length - 1], 3);

  /* The dealt round agrees with the plan, slot for slot. */
  for (let seed = 0; seed < 40; seed++) {
    const session = buildShapesQuestSession(createRng(seed));
    session.forEach((challenge, index) => {
      assert.equal(
        challenge.level,
        levels[index],
        `seed ${seed}, question ${index + 1} came back at level ${challenge.level}`,
      );
    });
  }

  /* The two activities that start at level two are never offered in a level
     one slot: the first three questions are meant to be the easy ones, and a
     level-two question snapped down into an easy slot is not easy. */
  const late = SHAPES_ACTIVITIES.filter((activity) => !activity.levels.includes(1));
  assert.deepEqual(
    late.map((activity) => activity.id).sort(),
    ["shapes.classify", "shapes.symmetry"],
  );
  for (const slot of SHAPES_QUEST_PLAN.slots.filter((s) => s.level === 1)) {
    for (const id of slot.from) {
      assert.ok(
        !late.some((activity) => activity.id === id),
        `${id} is offered in a level one slot`,
      );
    }
  }
});

/* 4 ---------------------------------------------------------------------- */
test("a round mixes the pack, and only this pack", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 60; seed++) {
    const session = buildShapesQuestSession(createRng(seed));
    for (const challenge of session) {
      assert.equal(challenge.packId, "shapes", "another pack got into the round");
      assert.equal(challenge.payload.kind, "choice");
      seen.add(challenge.activityId);
    }
    /* One round is never one activity ten times over. */
    const spread = new Set(session.map((c) => c.activityId));
    assert.ok(spread.size >= 6, `seed ${seed} only used ${spread.size} activities`);
  }

  /* And over many rounds, every activity the plan can deal gets played.
     Three of the pack's fourteen are missing from that, and each one is
     missing for a reason worth naming rather than deriving:

     - `shapes.shape-partners` is a `connect` and `shapes.size-order` is an
       `order`. Shapes & Colours Quest is a `ChoiceStage` game, so it cannot
       draw either, exactly as Logic Quest cannot draw its two connects.
     - `shapes.shape-objects` *is* a choice and could be dealt tomorrow. It is
       not in `SHAPES_QUEST_PLAN` because the round plan was not part of the
       content batch that wrote it, and quietly editing a quest's slots is a
       change to the game rather than to the library.

     Naming them here is the tripwire: the day a fifteenth activity is written
     and nobody decides whether the round should deal it, this fails. */
  const skipped = SHAPES_ACTIVITIES.map((activity) => activity.id)
    .filter((id) => !seen.has(id))
    .sort();
  assert.deepEqual(skipped, [
    "shapes.shape-objects",
    "shapes.shape-partners",
    "shapes.size-order",
  ]);

  /* Every activity the plan names really exists. A typo here would silently
     shrink the round. */
  for (const slot of SHAPES_QUEST_PLAN.slots) {
    assert.ok(slot.from.length >= 2, "a slot with one activity always deals the same");
    for (const id of slot.from) {
      assert.ok(
        SHAPES_ACTIVITIES.some((activity) => activity.id === id),
        `the plan names ${id}, which is not in the pack`,
      );
    }
  }
});

/* 5 ---------------------------------------------------------------------- */
test("the round opens with KIDDO saying hello", () => {
  const state = freshShapesQuestState(buildShapesQuestSession(createRng(1)));
  assert.equal(state.phase, "intro");
  assert.equal(shapesQuestProgress(state).current, 0);

  /* Nothing can be answered until the child has pressed the one button. */
  const ignored = run(state, { type: "answer", optionId: rightAnswer(state) });
  assert.equal(ignored.phase, "intro");
  assert.equal(shapesQuestProgress(ignored).current, 0);

  const begun = run(state, { type: "begin" });
  assert.equal(begun.phase, "ready");
  assert.equal(run(begun, { type: "settle" }).phase, "awaitingAnswer");

  /* Play Again skips the hello: KIDDO has already said it. */
  const replay = freshShapesQuestState(buildShapesQuestSession(createRng(2)), false);
  assert.equal(replay.phase, "ready");
});

/* 6 ---------------------------------------------------------------------- */
test("a right answer is celebrated first and counted second", () => {
  const state = started();
  const answered = run(state, { type: "answer", optionId: rightAnswer(state) });

  assert.equal(answered.phase, "correct");
  assert.equal(answered.picked, rightAnswer(state));
  /* Still on the same question: the dots move when the cheering is done. */
  assert.equal(shapesQuestProgress(answered).current, 0);

  const settled = run(answered, { type: "settle" });
  assert.equal(shapesQuestProgress(settled).current, 1);
  assert.equal(settled.phase, "ready");
  assert.deepEqual(settled.tried, []);
  assert.equal(settled.picked, null);
  assert.equal(settled.hinted, false);
});

/* 7 ---------------------------------------------------------------------- */
test("a wrong answer hands the board straight back", () => {
  const state = started();
  const wrong = wrongAnswer(state);
  const missed = run(state, { type: "answer", optionId: wrong });

  assert.equal(missed.phase, "incorrect");
  assert.equal(missed.picked, wrong);
  assert.deepEqual(missed.tried, [wrong]);
  /* The dots do not move. Nothing is spent. */
  assert.equal(shapesQuestProgress(missed).current, 0);

  const back = run(missed, { type: "settle" });
  assert.equal(back.phase, "awaitingAnswer");
  assert.equal(back.picked, null, "the wrong tile stops glowing");
  assert.deepEqual(back.tried, [wrong], "but stays dimmed, so the choice narrows");

  /* And the same question can now be got right, with nothing held against it. */
  const then = run(back, { type: "answer", optionId: rightAnswer(back) });
  assert.equal(then.phase, "correct");
  assert.equal(shapesQuestProgress(run(then, { type: "settle" })).current, 1);
});

/* 8 ---------------------------------------------------------------------- */
test("a wrong answer costs nothing, however many times it happens", () => {
  let state = started(11);
  const wrong = wrongAnswer(state);

  for (let attempt = 0; attempt < 12; attempt++) {
    state = run(
      state,
      { type: "answer", optionId: wrong },
      { type: "settle" },
    );
  }

  /* Twelve wrong taps later: same question, same progress, one dimmed tile. */
  assert.equal(state.phase, "awaitingAnswer");
  assert.equal(shapesQuestProgress(state).current, 0);
  assert.deepEqual(state.tried, [wrong], "a tile tried twice is still one tile");
  assert.equal(shapesQuestProgress(state).total, 10);

  /* And it still finishes, exactly as if it had been right the first time. */
  const done = run(state, { type: "answer", optionId: rightAnswer(state) });
  assert.equal(done.phase, "correct");
});

/* 9 ---------------------------------------------------------------------- */
test("taps outside the answering phase fall on the floor", () => {
  /* The whole defence against a four year old drumming on the screen: no
     counting, no debouncing, no timers to get wrong. A tap that arrives in any
     phase but `awaitingAnswer` changes nothing at all. */
  const state = started(3);
  const right = rightAnswer(state);

  /* While the question is still landing. */
  const landing = run(freshShapesQuestState(buildShapesQuestSession(createRng(3))), {
    type: "begin",
  });
  assert.equal(landing.phase, "ready");
  assert.equal(run(landing, { type: "answer", optionId: right }).phase, "ready");

  /* While the answer is being celebrated — the tap that answered this question
     must not answer the next one. */
  const cheering = run(state, { type: "answer", optionId: right });
  const drummed = run(
    cheering,
    { type: "answer", optionId: right },
    { type: "answer", optionId: wrongAnswer(state) },
  );
  assert.deepEqual(drummed, cheering, "a tap got through while KIDDO was cheering");

  /* An option that is not on the board is not an answer. */
  const nonsense = run(state, { type: "answer", optionId: "no-such-tile" });
  assert.deepEqual(nonsense, state);

  /* And the beat before a tile can be tapped is thinking time, not animation:
     it does not shorten under reduced motion, because it is a number here. */
  assert.ok(SHAPES_QUEST_TIMING.ready >= 300);
  assert.ok(SHAPES_QUEST_TIMING.retry >= 600);
});

/* 10 --------------------------------------------------------------------- */
test("ten right answers finish the round", () => {
  let state = started(21);

  for (let question = 0; question < 10; question++) {
    assert.equal(state.phase, "awaitingAnswer", `question ${question + 1} not ready`);
    assert.equal(shapesQuestProgress(state).current, question);

    state = run(
      state,
      { type: "answer", optionId: rightAnswer(state) },
      { type: "settle" },
    );

    if (question < 9) {
      /* Between questions there is a beat, then the next board. */
      assert.equal(state.phase, "ready");
      state = run(state, { type: "settle" });
    }
  }

  assert.equal(state.phase, "complete");
  assert.equal(shapesQuestProgress(state).current, 10);
  assert.equal(shapesQuestProgress(state).total, 10);
  assert.equal(currentChallenge(state.run), null);
  /* Nothing is announced once there is no question left. */
  assert.equal(shapesQuestPrompt(state), "");
});

/* 11 --------------------------------------------------------------------- */
test("playing again deals a new round and skips the hello", () => {
  const first = buildShapesQuestSession(createRng(1));
  const second = buildShapesQuestSession(createRng(2));

  const replayed = run(freshShapesQuestState(first), {
    type: "deal",
    challenges: second,
    intro: false,
  });

  assert.equal(replayed.phase, "ready");
  assert.equal(shapesQuestProgress(replayed).current, 0);
  assert.equal(shapesQuestProgress(replayed).total, 10);
  assert.notDeepEqual(
    first.map(challengeKey),
    second.map(challengeKey),
    "Play Again deals the same round again",
  );

  /* Everything from the last round is gone. */
  assert.deepEqual(replayed.tried, []);
  assert.equal(replayed.picked, null);
  assert.equal(replayed.hinted, false);
});

/* 12 --------------------------------------------------------------------- */
test("after a wrong answer KIDDO points at where to look, not at the answer", () => {
  const state = started(13);
  const asked = shapesQuestPrompt(state);
  assert.equal(asked, currentChallenge(state.run)?.prompt.speech);

  const missed = run(state, { type: "answer", optionId: wrongAnswer(state) }, {
    type: "settle",
  });
  const nudged = shapesQuestPrompt(missed);

  assert.ok(missed.hinted);
  assert.notEqual(nudged, asked, "the same question was asked twice");
  assert.equal(nudged, currentChallenge(missed.run)?.hint);

  /* The hint is content, not a rule of the game — every activity in the pack
     writes its own, and `tests/shapesColours.test.ts` checks each one keeps
     its secret. Here the only claim is that getting it right clears it. */
  const recovered = run(
    missed,
    { type: "answer", optionId: rightAnswer(missed) },
    { type: "settle" },
  );
  assert.equal(recovered.hinted, false);
  assert.equal(shapesQuestPrompt(recovered), currentChallenge(recovered.run)?.prompt.speech);
});

/* 13 --------------------------------------------------------------------- */
test("Shapes & Colours Quest is in the catalogue and wired to a route of its own", () => {
  const game = getGame("shapes-colours-quest");
  assert.ok(game, "shapes-colours-quest is not in the catalogue");
  assert.equal(game.route, "/play/shapes-colours-quest");
  assert.equal(game.status, "ready");
  assert.equal(game.access, "free");
  assert.equal(game.category, "shapes");
  assert.ok(game.cast.length > 0);
  assert.ok(game.themes.length > 0);
  for (const theme of game.themes) {
    assert.equal(theme.access, "free", `${theme.id} is locked`);
  }

  /* One id, one route, one card. A duplicate would give KIDDO World two. */
  assert.equal(GAMES.filter((g) => g.id === "shapes-colours-quest").length, 1);
  assert.equal(new Set(GAMES.map((g) => g.route)).size, GAMES.length);

  /* Built, so it is off the "coming soon" list. */
  assert.ok(!UPCOMING_THEMES.some((theme) => /shape|colour/i.test(theme)));

  /* And the route knows how to draw it, rather than falling through to the
     holding stage every unbuilt game gets. */
  const route = source("src/app/play/[gameId]/page.tsx");
  assert.match(route, /"shapes-colours-quest": ShapesColoursQuestGame/);
});

/* 14 --------------------------------------------------------------------- */
test("a wrong answer is never punished in words, in the game or in the shell", () => {
  const game = source("src/components/games/shapes/ShapesColoursQuestGame.tsx");

  /* The words a child sees. Nothing here says no. */
  assert.match(game, /Almost!/);
  for (const forbidden of ["Wrong", "failed", "Oops", "No,", "Incorrect"]) {
    assert.ok(
      !game.includes(forbidden),
      `ShapesColoursQuestGame says "${forbidden}" to a four year old`,
    );
  }

  /* No score, no lives, no clock — not in the game and not in its rules.
     "lives" is looked for as a game mechanic rather than as a word, because
     English also uses it for where a thing sits in a file. */
  const rules = source("src/lib/games/shapesColoursQuest.ts");
  for (const file of [game, rules]) {
    for (const forbidden of ["score", "streak", "penalt", "attempts left"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}`, "i").test(file),
        `Shapes & Colours Quest keeps a ${forbidden}`,
      );
    }
    assert.ok(
      !/\blives\s*[:=]|\blives (left|remaining)\b|\bLives\b/.test(file),
      "Shapes & Colours Quest counts lives",
    );
  }

  /* KIDDO cheers or encourages. There is no third, unhappier reaction, and
     the shell has no vocabulary for one. */
  assert.match(game, /feedback=\{quest\.feedback\}/);
  const hook = source("src/lib/games/useShapesColoursQuest.ts");
  for (const value of ["correct", "retry", "idle"]) {
    assert.ok(hook.includes(`"${value}"`));
  }
  assert.ok(!hook.includes('"sad"'));
});

/* 15 --------------------------------------------------------------------- */
test("the way out and the way through are both reachable without a mouse", () => {
  /* No DOM in this runner, so these are asserted at the source. Each one is a
     promise that would otherwise be checked by hand and quietly regress. */

  /* Back to KIDDO World — or to the world the round was played in: one
     link, always top left, on every game screen. */
  const shell = source("src/components/games/GameShell.tsx");
  assert.match(shell, /<BackLink href=\{exit\?\.href\} label=\{exit\?\.label\} \/>/);

  /* Every tile is a real button, so it is tabbable and answers to Enter and
     Space without a keydown handler existing anywhere. */
  const tile = source("src/components/kiddo/ChoiceTile.tsx");
  assert.match(tile, /type="button"/);
  assert.match(tile, /aria-label=\{srLabel \?\? label\}/);
  assert.match(tile, /aria-disabled=\{locked\}/);
  assert.ok(
    !/\sdisabled=\{/.test(tile),
    "a disabled attribute would drop keyboard focus mid-round",
  );

  /* Nothing rests on colour alone: the state is in the accessible name. This
     is the whole reason a pack about colour is safe to build on this engine. */
  const stage = source("src/components/games/engines/ChoiceStage.tsx");
  assert.match(stage, /that's the one/);
  assert.match(stage, /not this one/);
  assert.match(stage, /already tried/);

  /* And the round says out loud where it has got to, for a child who cannot
     see the dots. */
  const game = source("src/components/games/shapes/ShapesColoursQuestGame.tsx");
  /* Said through the shell's one live region, which sits outside the keyed
     stage and so never remounts with the board. */
  assert.match(game, /announce=\{announcement\}/);
  const frame = source("src/components/games/GameShell.tsx");
  assert.match(frame, /role="status"/);
  assert.match(frame, /aria-live="polite"/);
  assert.match(game, /Question \$\{quest\.progress\.current \+ 1\}/);
});

/* 16 --------------------------------------------------------------------- */
test("one implementation, drawn by the engine that already existed", () => {
  const game = source("src/components/games/shapes/ShapesColoursQuestGame.tsx");

  /* No second layout for a phone, no second component for a tablet: one
     `ChoiceStage`, which sizes itself. */
  assert.match(game, /<ChoiceStage/);
  assert.ok(!/isMobile|useMediaQuery|window\.inner/.test(game));

  /* And no Shapes-specific rendering was smuggled into the shared engine: the
     stage still knows about kinds of content, never about packs. */
  const stage = source("src/components/games/engines/ChoiceStage.tsx");
  for (const word of ["shapes", "shape-names", "colour-names", "symmetry"]) {
    assert.ok(
      !stage.toLowerCase().includes(word),
      `ChoiceStage knows about "${word}" — the engine has stopped being subject-agnostic`,
    );
  }

  /* Reduced motion is inherited from the one global place, not re-decided. */
  const provider = source("src/components/MotionProvider.tsx");
  assert.match(provider, /reducedMotion="user"/);
  assert.ok(!game.includes("useReducedMotion") && !game.includes("MotionConfig"));

  /* Nothing on the path from the round to a tile is a fixed number of pixels
     wide, and nothing scrolls sideways to cope. A 360px phone and a 1440px
     laptop get the same markup; the sizes are all relative, and the caps are
     written against `dvh` so a laptop turned on its side shrinks the board
     rather than pushing it under the fold. */
  for (const path of [
    "src/components/games/shapes/ShapesColoursQuestGame.tsx",
    "src/components/games/engines/ChoiceStage.tsx",
    "src/components/games/engines/PromptDisplay.tsx",
    "src/components/games/engines/ContentItemView.tsx",
    "src/components/kiddo/ChoiceTile.tsx",
    "src/components/games/GameShell.tsx",
  ]) {
    const file = source(path);
    assert.ok(
      !/\b(?:min-)?w-\[\d+px\]|\bwidth: *\d+px/.test(file),
      `${path} pins a width in pixels`,
    );
    assert.ok(
      !/overflow-x-(auto|scroll)/.test(file),
      `${path} scrolls sideways instead of wrapping`,
    );
  }

  /* The two rows that can get long — a strip of six shapes to count, a
     pattern with a gap on the end — wrap onto a second line rather than
     running off the edge. */
  const display = source("src/components/games/engines/PromptDisplay.tsx");
  assert.match(display, /flex-wrap/);
  const board = source("src/components/games/engines/ChoiceStage.tsx");
  assert.match(board, /flex-wrap/);
  assert.match(board, /100dvh/);
});
