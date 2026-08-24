import assert from "node:assert/strict";
import { test } from "node:test";

import { challengeKey } from "@/lib/content/challenges";
import { currentChallenge, runProgress } from "@/lib/content/progress";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import {
  buildMathQuestSession,
  freshMathQuestState,
  mathQuestReducer,
  MATH_QUEST_LENGTH,
  type MathQuestAction,
  type MathQuestState,
} from "@/lib/games/mathQuest";

/**
 * A whole round of Math Quest, played without React.
 *
 * This is what the pure-reducer split buys: no jsdom, no renderer, no test
 * framework — the rules are a function on plain values, so the rules can be
 * tested as one. Anything below that a component could get wrong is a
 * component bug, and there is very little component left.
 */

function run(state: MathQuestState, ...actions: MathQuestAction[]): MathQuestState {
  return actions.reduce(mathQuestReducer, state);
}

function optionsOf(state: MathQuestState) {
  const challenge = currentChallenge(state.run);
  assert.ok(challenge && challenge.payload.kind === "choice");
  return challenge.payload;
}

/** The id of the right answer, straight from the content. */
function rightAnswer(state: MathQuestState): string {
  return optionsOf(state).answerId;
}

/** Any id that is not the right answer. */
function wrongAnswer(state: MathQuestState): string {
  const payload = optionsOf(state);
  const wrong = payload.options.find((option) => option.id !== payload.answerId);
  assert.ok(wrong, "every board should have a distractor");
  return wrong.id;
}

/** Start a real round, past the intro and ready to be answered. */
function started(seed = 5): MathQuestState {
  const dealt = freshMathQuestState(buildMathQuestSession(createRng(seed)));
  return run(dealt, { type: "begin" }, { type: "settle" });
}

/* 1 ---------------------------------------------------------------------- */
test("a session is ten challenges, drawn rather than written", () => {
  assert.equal(MATH_QUEST_LENGTH, 10);
  for (const seed of [0, 1, 42, 1234]) {
    const session = buildMathQuestSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length}`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("no round asks the same question twice", () => {
  for (let seed = 0; seed < 60; seed++) {
    const session = buildMathQuestSession(createRng(seed));
    const keys = session.map(challengeKey);
    assert.equal(new Set(keys).size, keys.length, `seed ${seed} repeated a question`);
    const ids = session.map((challenge: Challenge) => challenge.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a round only ever gets harder", () => {
  for (let seed = 0; seed < 40; seed++) {
    const levels = buildMathQuestSession(createRng(seed)).map((c) => c.level);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] >= levels[i - 1], `seed ${seed} went backwards: ${levels}`);
    }
    assert.ok(levels[0] === 1, "a round opens gently");
    assert.ok(levels[levels.length - 1] >= 2, "a round builds to something");
  }
});

/* 4 ---------------------------------------------------------------------- */
test("every question the round deals is one the choice engine can render", () => {
  for (let seed = 0; seed < 40; seed++) {
    for (const challenge of buildMathQuestSession(createRng(seed))) {
      assert.equal(challenge.payload.kind, "choice");
      assert.equal(challenge.packId, "math");
    }
  }
});

/* 5 ---------------------------------------------------------------------- */
test("the round opens with KIDDO saying hello", () => {
  const dealt = freshMathQuestState(buildMathQuestSession(createRng(9)));
  assert.equal(dealt.phase, "intro");

  const begun = run(dealt, { type: "begin" });
  assert.equal(begun.phase, "ready");
  assert.equal(run(begun, { type: "settle" }).phase, "awaitingAnswer");
});

/* 6 ---------------------------------------------------------------------- */
test("taps outside the answering phase fall on the floor", () => {
  const state = started();
  const answer = rightAnswer(state);

  /* Still landing: the finger that answered the last question. */
  const landing = freshMathQuestState(buildMathQuestSession(createRng(5)), false);
  assert.equal(landing.phase, "ready");
  assert.equal(run(landing, { type: "answer", optionId: answer }), landing);

  /* Mid-cheer: a second tap while the tick is still on screen. */
  const cheering = run(state, { type: "answer", optionId: answer });
  assert.equal(cheering.phase, "correct");
  assert.equal(run(cheering, { type: "answer", optionId: wrongAnswer(state) }), cheering);
});

/* 7 ---------------------------------------------------------------------- */
test("a right answer is celebrated first and counted second", () => {
  const state = started();
  const cheering = run(state, { type: "answer", optionId: rightAnswer(state) });

  assert.equal(cheering.phase, "correct");
  assert.deepEqual(runProgress(cheering.run), runProgress(state.run));

  const next = run(cheering, { type: "settle" });
  assert.equal(runProgress(next.run).current, runProgress(state.run).current + 1);
  assert.equal(next.phase, "ready");
  assert.deepEqual(next.tried, []);
});

/* 8 ---------------------------------------------------------------------- */
test("a wrong answer costs nothing and takes nothing away", () => {
  const state = started();
  const before = currentChallenge(state.run);
  const nudged = run(state, { type: "answer", optionId: wrongAnswer(state) });

  assert.equal(nudged.phase, "incorrect");
  assert.deepEqual(runProgress(nudged.run), runProgress(state.run));
  assert.equal(currentChallenge(nudged.run), before, "the question stays put");

  const retry = run(nudged, { type: "settle" });
  assert.equal(retry.phase, "awaitingAnswer", "the board comes straight back");
  assert.equal(retry.picked, null);
  assert.equal(currentChallenge(retry.run), before);

  /* And the right answer still works afterwards, unpunished. */
  const recovered = run(retry, { type: "answer", optionId: rightAnswer(retry) });
  assert.equal(recovered.phase, "correct");
});

/* 9 ---------------------------------------------------------------------- */
test("a tile tried twice is still one tile tried", () => {
  const state = started();
  const wrong = wrongAnswer(state);

  const once = run(
    state,
    { type: "answer", optionId: wrong },
    { type: "settle" },
    { type: "answer", optionId: wrong },
  );

  assert.deepEqual(once.tried, [wrong]);
});

/* 10 --------------------------------------------------------------------- */
test("ten right answers finish the quest", () => {
  for (const seed of [3, 8, 21]) {
    let state = started(seed);
    for (let step = 0; step < MATH_QUEST_LENGTH; step++) {
      assert.equal(state.phase, "awaitingAnswer", `stuck at question ${step + 1}`);
      state = run(
        state,
        { type: "answer", optionId: rightAnswer(state) },
        { type: "settle" },
      );
      if (step < MATH_QUEST_LENGTH - 1) {
        state = run(state, { type: "settle" });
      }
    }

    assert.equal(state.phase, "complete");
    const progress = runProgress(state.run);
    assert.equal(progress.current, progress.total);
    assert.equal(progress.total, MATH_QUEST_LENGTH);
    assert.equal(currentChallenge(state.run), null);
  }
});

/* 11 --------------------------------------------------------------------- */
test("an answer that is not on the board is ignored", () => {
  const state = started();
  assert.equal(run(state, { type: "answer", optionId: "not-a-tile" }), state);
});

/* 12 --------------------------------------------------------------------- */
test("playing again deals a new round and skips the hello", () => {
  const first = started(2);
  const again = run(first, {
    type: "deal",
    challenges: buildMathQuestSession(createRng(3)),
    intro: false,
  });

  assert.equal(again.phase, "ready");
  assert.equal(runProgress(again.run).current, 0);
  assert.deepEqual(again.tried, []);
  assert.equal(again.picked, null);
  assert.notDeepEqual(
    again.run.challenges.map(challengeKey),
    first.run.challenges.map(challengeKey),
  );
});
