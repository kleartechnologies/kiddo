import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { challengeKey } from "@/lib/content/challenges";
import { currentChallenge, runProgress } from "@/lib/content/progress";
import { LOGIC_ACTIVITIES } from "@/lib/content/packs/logic";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import { GAMES, getGame } from "@/data/games";
import {
  buildLogicQuestSession,
  freshLogicQuestState,
  logicQuestPrompt,
  logicQuestReducer,
  LOGIC_QUEST_LENGTH,
  LOGIC_QUEST_TIMING,
  type LogicQuestAction,
  type LogicQuestState,
} from "@/lib/games/logicQuest";

/**
 * A whole round of Logic Quest, played without React.
 *
 * The same shape as `englishQuest.test.ts`, deliberately: the games share
 * every question they ask and not one of their rules, and the way to show that
 * Logic Quest really is its own game — rather than English Quest with shapes
 * in it — is that its rules can be stated, and broken, on their own. The rule
 * that is only here is the hint, and it has a test of its own below.
 *
 * The last three tests read source files rather than a rendered page. There is
 * no DOM in this project's test runner, and an accessibility promise that is
 * never asserted is a promise that quietly stops being true — so they assert
 * what can honestly be asserted from here, and say so.
 */

function run(state: LogicQuestState, ...actions: LogicQuestAction[]): LogicQuestState {
  return actions.reduce(logicQuestReducer, state);
}

function optionsOf(state: LogicQuestState) {
  const challenge = currentChallenge(state.run);
  assert.ok(challenge && challenge.payload.kind === "choice");
  return challenge.payload;
}

/** The id of the right answer, straight from the content. */
function rightAnswer(state: LogicQuestState): string {
  return optionsOf(state).answerId;
}

/** Any id that is not the right answer. */
function wrongAnswer(state: LogicQuestState): string {
  const payload = optionsOf(state);
  const wrong = payload.options.find((option) => option.id !== payload.answerId);
  assert.ok(wrong, "every board should have a distractor");
  return wrong.id;
}

/** Start a real round, past the intro and ready to be answered. */
function started(seed = 5): LogicQuestState {
  const dealt = freshLogicQuestState(buildLogicQuestSession(createRng(seed)));
  return run(dealt, { type: "begin" }, { type: "settle" });
}

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* 1 ---------------------------------------------------------------------- */
test("a session is ten challenges, drawn rather than written", () => {
  assert.equal(LOGIC_QUEST_LENGTH, 10);
  for (const seed of [0, 1, 42, 1234]) {
    const session = buildLogicQuestSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length}`);
  }

  /* And no round asks the same question twice, in either costume. */
  for (let seed = 0; seed < 60; seed++) {
    const session = buildLogicQuestSession(createRng(seed));
    const keys = session.map(challengeKey);
    assert.equal(new Set(keys).size, keys.length, `seed ${seed} repeated a question`);
    const ids = session.map((challenge: Challenge) => challenge.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("one round mixes all four Logic activities, and only Logic", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (const challenge of buildLogicQuestSession(createRng(seed))) {
      seen.add(challenge.activityId);
      assert.equal(challenge.packId, "logic");
      assert.equal(challenge.category, "logic");
      /* The acceptance test for the whole exercise: every question the round
         deals goes through the `ChoiceStage` that already existed. There is no
         `PatternStage`, and this is what makes that possible. */
      assert.equal(challenge.payload.kind, "choice");
    }
  }
  assert.equal(seen.size, 4, `only ${[...seen].join(", ")} ever turned up`);

  /* Four of the pack's six, and the two that are missing are missing on
     purpose: `logic.group-partners` and `logic.pair-partners` are `connect`
     boards, and Logic Quest is a `ChoiceStage` game. Naming them here rather
     than deriving the list is the point — the day a seventh activity is
     written and nobody decides whether the quest should deal it, this fails. */
  const skipped = LOGIC_ACTIVITIES.map((activity) => activity.id)
    .filter((id) => !seen.has(id))
    .sort();
  assert.deepEqual(skipped, ["logic.group-partners", "logic.pair-partners"]);

  /* Within a single round, more than one kind of thinking. A round of ten
     patterns would be a different, duller game. */
  let mixed = 0;
  for (let seed = 0; seed < 40; seed++) {
    const kinds = new Set(
      buildLogicQuestSession(createRng(seed)).map((c) => c.activityId),
    );
    if (kinds.size >= 3) mixed++;
  }
  assert.ok(mixed >= 38, `only ${mixed} of 40 rounds mixed three or more`);

  /* And a round only ever gets harder. */
  for (let seed = 0; seed < 40; seed++) {
    const levels = buildLogicQuestSession(createRng(seed)).map((c) => c.level);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] >= levels[i - 1], `seed ${seed} went backwards: ${levels}`);
    }
    assert.equal(levels[0], 1, "a round opens gently");
    assert.equal(levels[levels.length - 1], 3, "a round builds to something");
  }
});

/* 3 ---------------------------------------------------------------------- */
test("the round opens with KIDDO saying hello", () => {
  const dealt = freshLogicQuestState(buildLogicQuestSession(createRng(9)));
  assert.equal(dealt.phase, "intro");
  assert.equal(runProgress(dealt.run).current, 0);

  const begun = run(dealt, { type: "begin" });
  assert.equal(begun.phase, "ready");
  assert.equal(run(begun, { type: "settle" }).phase, "awaitingAnswer");

  /* And pressing the button twice does not skip a question. */
  assert.equal(run(begun, { type: "begin" }), begun);
});

/* 4 ---------------------------------------------------------------------- */
test("a right answer is celebrated first and counted second", () => {
  const state = started();
  const cheering = run(state, { type: "answer", optionId: rightAnswer(state) });

  assert.equal(cheering.phase, "correct");
  assert.deepEqual(runProgress(cheering.run), runProgress(state.run));

  const next = run(cheering, { type: "settle" });
  assert.equal(runProgress(next.run).current, runProgress(state.run).current + 1);
  assert.equal(next.phase, "ready");
  assert.deepEqual(next.tried, []);
  assert.equal(next.picked, null);
  assert.equal(next.hinted, false, "the new question starts unhinted");
});

/* 5 ---------------------------------------------------------------------- */
test("a wrong answer hands the board straight back", () => {
  const state = started();
  const before = currentChallenge(state.run);
  const nudged = run(state, { type: "answer", optionId: wrongAnswer(state) });

  assert.equal(nudged.phase, "incorrect");
  assert.equal(currentChallenge(nudged.run), before, "the question stays put");

  const retry = run(nudged, { type: "settle" });
  assert.equal(retry.phase, "awaitingAnswer", "the board comes straight back");
  assert.equal(retry.picked, null);
  assert.equal(currentChallenge(retry.run), before);

  /* And the right answer still works afterwards, unpunished. */
  assert.equal(
    run(retry, { type: "answer", optionId: rightAnswer(retry) }).phase,
    "correct",
  );

  /* A tile tried twice is still one tile tried: nothing is being counted. */
  const wrong = wrongAnswer(state);
  const twice = run(
    state,
    { type: "answer", optionId: wrong },
    { type: "settle" },
    { type: "answer", optionId: wrong },
  );
  assert.deepEqual(twice.tried, [wrong]);
});

/* 6 ---------------------------------------------------------------------- */
test("a wrong answer costs nothing, for ever", () => {
  const state = started();
  const before = currentChallenge(state.run);

  /* There is no third, unhappier ending. Wrong twelve times is still just
     wrong, the dots have not moved, and the question is still there. */
  let stubborn = state;
  for (let attempt = 0; attempt < 12; attempt++) {
    stubborn = run(
      stubborn,
      { type: "answer", optionId: wrongAnswer(stubborn) },
      { type: "settle" },
    );
    assert.deepEqual(runProgress(stubborn.run), runProgress(state.run));
  }
  assert.equal(stubborn.phase, "awaitingAnswer");
  assert.equal(currentChallenge(stubborn.run), before);

  /* No score, no lives, no timer, no streak. The state is the whole of what
     the game remembers, and there is nothing in it to lose. */
  assert.deepEqual(
    Object.keys(stubborn).sort(),
    ["hinted", "phase", "picked", "run", "tried"],
  );
});

/* 7 ---------------------------------------------------------------------- */
test("taps outside the answering phase fall on the floor", () => {
  const state = started();
  const answer = rightAnswer(state);

  /* Still landing: the finger that answered the last question. */
  const landing = freshLogicQuestState(buildLogicQuestSession(createRng(5)), false);
  assert.equal(landing.phase, "ready");
  assert.equal(run(landing, { type: "answer", optionId: answer }), landing);

  /* Mid-cheer: a second tap while the tick is still on screen. */
  const cheering = run(state, { type: "answer", optionId: answer });
  assert.equal(cheering.phase, "correct");
  assert.equal(run(cheering, { type: "answer", optionId: wrongAnswer(state) }), cheering);

  /* A whole handful of taps at once still only counts once. */
  const hammered = run(
    state,
    { type: "answer", optionId: answer },
    { type: "answer", optionId: answer },
    { type: "answer", optionId: answer },
    { type: "settle" },
  );
  assert.equal(runProgress(hammered.run).current, 1);

  /* And an id that is not on the board is not an answer at all. */
  assert.equal(run(state, { type: "answer", optionId: "not-a-tile" }), state);
});

/* 8 ---------------------------------------------------------------------- */
test("ten right answers finish the quest", () => {
  for (const seed of [3, 8, 21]) {
    let state = started(seed);
    for (let step = 0; step < LOGIC_QUEST_LENGTH; step++) {
      assert.equal(state.phase, "awaitingAnswer", `stuck at question ${step + 1}`);
      assert.equal(runProgress(state.run).current, step, "the dots are out of step");
      state = run(
        state,
        { type: "answer", optionId: rightAnswer(state) },
        { type: "settle" },
      );
      if (step < LOGIC_QUEST_LENGTH - 1) {
        state = run(state, { type: "settle" });
      }
    }

    assert.equal(state.phase, "complete");
    const progress = runProgress(state.run);
    assert.equal(progress.current, progress.total);
    assert.equal(progress.total, LOGIC_QUEST_LENGTH);
    assert.equal(currentChallenge(state.run), null);

    /* Nothing can happen after the end except playing again. */
    assert.equal(run(state, { type: "settle" }), state);
    assert.equal(run(state, { type: "answer", optionId: "anything" }), state);
  }
});

/* 9 ---------------------------------------------------------------------- */
test("playing again deals a new round and skips the hello", () => {
  const first = started(2);
  const again = run(first, {
    type: "deal",
    challenges: buildLogicQuestSession(createRng(3)),
    intro: false,
  });

  assert.equal(again.phase, "ready");
  assert.equal(runProgress(again.run).current, 0);
  assert.deepEqual(again.tried, []);
  assert.equal(again.picked, null);
  assert.equal(again.hinted, false);
  assert.notDeepEqual(
    again.run.challenges.map(challengeKey),
    first.run.challenges.map(challengeKey),
  );
});

/* 10 --------------------------------------------------------------------- */
test("the hint is Logic Quest's own rule, and it never says the answer", () => {
  const state = started(4);
  const asked = logicQuestPrompt(state);
  const challenge = currentChallenge(state.run);
  assert.ok(challenge);
  assert.equal(asked, challenge.prompt.speech, "the question is asked plainly first");

  /* Get it wrong, and KIDDO stops repeating the question and starts pointing
     at where to look. Asking a child the identical question they have just got
     wrong is asking them to guess. */
  const looking = run(
    state,
    { type: "answer", optionId: wrongAnswer(state) },
    { type: "settle" },
  );
  assert.equal(looking.hinted, true);
  assert.equal(logicQuestPrompt(looking), challenge.hint);
  assert.notEqual(logicQuestPrompt(looking), asked);

  /* The hint is a nudge, not a strike: it does not escalate, it does not
     expire, and getting it right afterwards is worth exactly as much. */
  const stubborn = run(
    looking,
    { type: "answer", optionId: wrongAnswer(looking) },
    { type: "settle" },
  );
  assert.equal(logicQuestPrompt(stubborn), challenge.hint);

  const recovered = run(
    stubborn,
    { type: "answer", optionId: rightAnswer(stubborn) },
    { type: "settle" },
  );
  assert.equal(recovered.hinted, false, "the next question is asked plainly again");
  assert.equal(runProgress(recovered.run).current, 1);

  /* Timings are thinking time, not animation time, which is why they live in
     the rules rather than in the motion system. */
  assert.ok(LOGIC_QUEST_TIMING.ready >= 380, "a whole pattern has to land first");
  assert.ok(LOGIC_QUEST_TIMING.correct >= 1000);
  assert.ok(LOGIC_QUEST_TIMING.retry >= 800);
});

/* 11 --------------------------------------------------------------------- */
test("Logic Quest is in the catalogue and wired to a route of its own", () => {
  const game = getGame("logic-quest");
  assert.ok(game, "logic-quest is not in the catalogue");
  assert.equal(game.route, "/play/logic-quest");
  assert.equal(game.status, "ready");
  assert.equal(game.access, "free");
  assert.ok(game.cast.length > 0);
  assert.ok(game.themes.length > 0);
  for (const theme of game.themes) {
    assert.equal(theme.access, "free", `${theme.id} is locked`);
  }

  /* One id, one route, one card. A duplicate would give KIDDO World two. */
  assert.equal(GAMES.filter((g) => g.id === "logic-quest").length, 1);
  assert.equal(new Set(GAMES.map((g) => g.route)).size, GAMES.length);

  /* And the route knows how to draw it, rather than falling through to the
     holding stage every other unbuilt game gets. */
  const route = source("src/app/play/[gameId]/page.tsx");
  assert.match(route, /"logic-quest": LogicQuestGame/);
});

/* 12 --------------------------------------------------------------------- */
test("a wrong answer is never punished in words, in the game or in the shell", () => {
  const game = source("src/components/games/logic/LogicQuestGame.tsx");

  /* The words a child sees. Nothing here says no. */
  assert.match(game, /Almost!/);
  for (const forbidden of ["Wrong", "failed", "Oops", "No,", "Incorrect"]) {
    assert.ok(
      !game.includes(forbidden),
      `LogicQuestGame says "${forbidden}" to a four year old`,
    );
  }

  /* KIDDO cheers or encourages. There is no third, unhappier reaction, and
     the shell has no vocabulary for one. */
  assert.match(game, /feedback=\{logic\.feedback\}/);
  const cheerful = ["correct", "retry", "idle"];
  const hook = source("src/lib/games/useLogicQuestGame.ts");
  for (const value of cheerful) assert.ok(hook.includes(`"${value}"`));
  assert.ok(!hook.includes('"sad"') && !hook.includes('"wrong"'));
});

/* 13 --------------------------------------------------------------------- */
test("the way out and the way through are both reachable without a mouse", () => {
  /* No DOM in this runner, so these are asserted at the source. Each one is a
     promise that would otherwise be checked by hand and quietly regress. */

  /* Back to KIDDO World — or to the world the round was played in: one
     link, always top left, on every game screen. */
  const shell = source("src/components/games/GameShell.tsx");
  assert.match(shell, /<BackLink href=\{exit\?\.href\} label=\{exit\?\.label\} \/>/);
  const back = source("src/components/kiddo/BackLink.tsx");
  assert.match(back, /href = KIDDO_HOME/, "the way out goes to the child's home");
  assert.match(back, /label = "Back to KIDDO World"/);
  assert.match(back, /<Link/, "the way out has to be a real link");

  /* Every tile is a real button, so it is tabbable and answers to Enter and
     Space without a keydown handler existing anywhere. */
  const tile = source("src/components/kiddo/ChoiceTile.tsx");
  assert.match(tile, /type="button"/);
  assert.match(tile, /aria-label=\{srLabel \?\? label\}/);

  /* And it is never really `disabled`: a tile that goes disabled under a
     child's finger throws keyboard focus back to the top of the page. */
  assert.match(tile, /aria-disabled=\{locked\}/);
  assert.ok(
    !/\sdisabled=\{/.test(tile),
    "a disabled attribute would drop keyboard focus mid-round",
  );

  /* Nothing rests on colour alone: the state is in the accessible name. */
  const stage = source("src/components/games/engines/ChoiceStage.tsx");
  assert.match(stage, /that's the one/);
  assert.match(stage, /not this one/);
  assert.match(stage, /already tried/);
});

/* 14 --------------------------------------------------------------------- */
test("reduced motion is honoured globally, so Logic Quest inherits it", () => {
  /* Logic Quest adds no animation system of its own — this is the whole
     reason it does not need one, and the whole reason it is worth asserting
     from here that the global one is still in place. */
  const provider = source("src/components/MotionProvider.tsx");
  assert.match(provider, /reducedMotion="user"/);

  const css = source("src/app/globals.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration: 0\.01ms !important/);

  const game = source("src/components/games/logic/LogicQuestGame.tsx");
  assert.ok(
    !game.includes("useReducedMotion") && !game.includes("MotionConfig"),
    "Logic Quest should inherit the global setting, not re-decide it",
  );
});
