import assert from "node:assert/strict";
import { test } from "node:test";

import { challengeKey } from "@/lib/content/challenges";
import { currentChallenge, runProgress } from "@/lib/content/progress";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import { GAMES, getGame } from "@/data/games";
import {
  buildEnglishQuestSession,
  englishQuestReducer,
  freshEnglishQuestState,
  ENGLISH_QUEST_LENGTH,
  ENGLISH_QUEST_TIMING,
  type EnglishQuestAction,
  type EnglishQuestState,
} from "@/lib/games/englishQuest";

/**
 * A whole round of English Quest, played without React.
 *
 * The same shape as `mathQuest.test.ts`, deliberately: the two games have
 * separate rules and separate reducers, and the way to show that English Quest
 * really is its own game — rather than Math Quest with letters in it — is that
 * its rules can be stated, and broken, on their own.
 */

function run(state: EnglishQuestState, ...actions: EnglishQuestAction[]): EnglishQuestState {
  return actions.reduce(englishQuestReducer, state);
}

function optionsOf(state: EnglishQuestState) {
  const challenge = currentChallenge(state.run);
  assert.ok(challenge && challenge.payload.kind === "choice");
  return challenge.payload;
}

/** The id of the right answer, straight from the content. */
function rightAnswer(state: EnglishQuestState): string {
  return optionsOf(state).answerId;
}

/** Any id that is not the right answer. */
function wrongAnswer(state: EnglishQuestState): string {
  const payload = optionsOf(state);
  const wrong = payload.options.find((option) => option.id !== payload.answerId);
  assert.ok(wrong, "every board should have a distractor");
  return wrong.id;
}

/** Start a real round, past the intro and ready to be answered. */
function started(seed = 5): EnglishQuestState {
  const dealt = freshEnglishQuestState(buildEnglishQuestSession(createRng(seed)));
  return run(dealt, { type: "begin" }, { type: "settle" });
}

/* 1 ---------------------------------------------------------------------- */
test("a session is ten challenges, drawn rather than written", () => {
  assert.equal(ENGLISH_QUEST_LENGTH, 10);
  for (const seed of [0, 1, 42, 1234]) {
    const session = buildEnglishQuestSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length}`);
  }

  /* All four activities are reachable inside one round, so a child who finds
     spelling hard still meets letters they know. */
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (const challenge of buildEnglishQuestSession(createRng(seed))) {
      seen.add(challenge.activityId);
    }
  }
  assert.equal(seen.size, 4, `only ${[...seen].join(", ")} ever turned up`);
});

/* 2 ---------------------------------------------------------------------- */
test("no round asks the same question twice", () => {
  for (let seed = 0; seed < 60; seed++) {
    const session = buildEnglishQuestSession(createRng(seed));
    const keys = session.map(challengeKey);
    assert.equal(new Set(keys).size, keys.length, `seed ${seed} repeated a question`);
    const ids = session.map((challenge: Challenge) => challenge.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a round only ever gets harder", () => {
  for (let seed = 0; seed < 40; seed++) {
    const levels = buildEnglishQuestSession(createRng(seed)).map((c) => c.level);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] >= levels[i - 1], `seed ${seed} went backwards: ${levels}`);
    }
    assert.ok(levels[0] === 1, "a round opens gently");
    assert.ok(levels[levels.length - 1] >= 2, "a round builds to something");
  }
});

/* 4 ---------------------------------------------------------------------- */
test("every question the round deals is one the existing choice engine renders", () => {
  /* The acceptance test for the whole exercise: English content goes through
     `ChoiceStage` because it is a `choice` challenge, exactly as a sum is.
     There is no `EnglishChoiceStage`, and this is what makes that possible. */
  for (let seed = 0; seed < 40; seed++) {
    for (const challenge of buildEnglishQuestSession(createRng(seed))) {
      assert.equal(challenge.payload.kind, "choice");
      assert.equal(challenge.packId, "english");
      assert.equal(challenge.category, "english");
    }
  }
});

/* 5 ---------------------------------------------------------------------- */
test("the round opens with KIDDO saying hello", () => {
  const dealt = freshEnglishQuestState(buildEnglishQuestSession(createRng(9)));
  assert.equal(dealt.phase, "intro");
  assert.equal(runProgress(dealt.run).current, 0);

  const begun = run(dealt, { type: "begin" });
  assert.equal(begun.phase, "ready");
  assert.equal(run(begun, { type: "settle" }).phase, "awaitingAnswer");

  /* And pressing the button twice does not skip a question. */
  assert.equal(run(begun, { type: "begin" }), begun);
});

/* 6 ---------------------------------------------------------------------- */
test("taps outside the answering phase fall on the floor", () => {
  const state = started();
  const answer = rightAnswer(state);

  /* Still landing: the finger that answered the last question. */
  const landing = freshEnglishQuestState(buildEnglishQuestSession(createRng(5)), false);
  assert.equal(landing.phase, "ready");
  assert.equal(run(landing, { type: "answer", optionId: answer }), landing);

  /* Mid-cheer: a second tap while the tick is still on screen. */
  const cheering = run(state, { type: "answer", optionId: answer });
  assert.equal(cheering.phase, "correct");
  assert.equal(run(cheering, { type: "answer", optionId: wrongAnswer(state) }), cheering);

  /* And a whole handful of taps at once still only counts once. */
  const hammered = run(
    state,
    { type: "answer", optionId: answer },
    { type: "answer", optionId: answer },
    { type: "answer", optionId: answer },
    { type: "settle" },
  );
  assert.equal(runProgress(hammered.run).current, 1);
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
  assert.equal(next.picked, null);
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

  /* There is no third, unhappier ending: wrong for ever is still just wrong,
     and the question is still there. */
  let stubborn = state;
  for (let attempt = 0; attempt < 12; attempt++) {
    stubborn = run(
      stubborn,
      { type: "answer", optionId: wrongAnswer(stubborn) },
      { type: "settle" },
    );
  }
  assert.equal(stubborn.phase, "awaitingAnswer");
  assert.equal(currentChallenge(stubborn.run), before);
  assert.deepEqual(runProgress(stubborn.run), runProgress(state.run));
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
    for (let step = 0; step < ENGLISH_QUEST_LENGTH; step++) {
      assert.equal(state.phase, "awaitingAnswer", `stuck at question ${step + 1}`);
      assert.equal(runProgress(state.run).current, step, "the dots are out of step");
      state = run(
        state,
        { type: "answer", optionId: rightAnswer(state) },
        { type: "settle" },
      );
      if (step < ENGLISH_QUEST_LENGTH - 1) {
        state = run(state, { type: "settle" });
      }
    }

    assert.equal(state.phase, "complete");
    const progress = runProgress(state.run);
    assert.equal(progress.current, progress.total);
    assert.equal(progress.total, ENGLISH_QUEST_LENGTH);
    assert.equal(currentChallenge(state.run), null);

    /* Nothing can happen after the end except playing again. */
    assert.equal(run(state, { type: "settle" }), state);
    assert.equal(run(state, { type: "answer", optionId: "anything" }), state);
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
    challenges: buildEnglishQuestSession(createRng(3)),
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

/* 13 --------------------------------------------------------------------- */
test("English Quest gives a child longer to read than Math Quest gives to count", () => {
  /* The one number in this game that is really about English. It is a
     comprehension timing, not an animation one, which is why it lives in the
     rules rather than in the motion system. */
  assert.ok(ENGLISH_QUEST_TIMING.correct >= 1000);
  assert.ok(ENGLISH_QUEST_TIMING.retry >= 800);
  assert.ok(ENGLISH_QUEST_TIMING.ready > 0);
});

/* 14 --------------------------------------------------------------------- */
test("English Quest is in the catalogue, so KIDDO World can get to it and back", () => {
  const game = getGame("english-quest");
  assert.ok(game, "english-quest is not in the catalogue");
  assert.equal(game.route, "/play/english-quest");
  assert.equal(game.status, "ready");
  assert.equal(game.access, "free");
  assert.equal(game.category, "letters");
  assert.ok(game.cast.length > 0);
  assert.ok(game.themes.length > 0);
  for (const theme of game.themes) {
    assert.equal(theme.access, "free", `${theme.id} is locked`);
  }

  /* One id, one route, one card. A duplicate would give KIDDO World two. */
  assert.equal(GAMES.filter((g) => g.id === "english-quest").length, 1);
  assert.equal(new Set(GAMES.map((g) => g.route)).size, GAMES.length);
});
