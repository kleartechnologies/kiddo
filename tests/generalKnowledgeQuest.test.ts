import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { GAMES, getGame, UPCOMING_THEMES } from "@/data/games";
import { challengeKey, conceptKey } from "@/lib/content/challenges";
import { GENERAL_KNOWLEDGE_ACTIVITIES } from "@/lib/content/packs/general-knowledge";
import { currentChallenge } from "@/lib/content/progress";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import {
  answerLabelOf,
  buildGeneralKnowledgeSession,
  currentBoard,
  currentOptions,
  freshGeneralKnowledgeState,
  generalKnowledgePrompt,
  generalKnowledgeProgress,
  generalKnowledgeReducer,
  GENERAL_KNOWLEDGE_LENGTH,
  GENERAL_KNOWLEDGE_PLAN,
  GENERAL_KNOWLEDGE_TIMING,
  IDLE_BOARD,
  type GeneralKnowledgeAction,
  type GeneralKnowledgeState,
} from "@/lib/games/generalKnowledgeQuest";
import { ALL_CATALOGUES } from "@/lib/i18n/messages";
import { en } from "@/lib/i18n/messages/en";
import { assertChoiceStatesAreSaid, assertNothingScolds } from "./helpers/words";

/**
 * A whole round of General Knowledge Quest, played without React.
 *
 * The same shape as `shapesColoursQuest.test.ts`, deliberately: these two
 * games share every engine they draw with and not one of their rules, and the
 * way to show that this is a game of its own — rather than Shapes Quest with
 * animals in it — is that its rules can be stated, and broken, here on their
 * own. The two that are only here are the topic-grouped plan and the
 * sentence-level de-duplication of a round, and each has a test below.
 *
 * The last five tests read source files rather than a rendered page. There is
 * no DOM in this project's test runner, so an accessibility or responsiveness
 * promise can only be asserted at the source — and a promise that is never
 * asserted is one that quietly stops being true.
 */

function run(
  state: GeneralKnowledgeState,
  ...actions: GeneralKnowledgeAction[]
): GeneralKnowledgeState {
  return actions.reduce(generalKnowledgeReducer, state);
}

function boardOf(state: GeneralKnowledgeState) {
  const challenge = currentChallenge(state.run);
  assert.ok(challenge && challenge.payload.kind === "choice");
  return challenge.payload;
}

/** The id of the right answer, straight from the content. */
function rightAnswer(state: GeneralKnowledgeState): string {
  return boardOf(state).answerId;
}

/** Any id that is not the right answer. */
function wrongAnswer(state: GeneralKnowledgeState): string {
  const board = boardOf(state);
  const wrong = board.options.find((option) => option.id !== board.answerId);
  assert.ok(wrong, "every board should have a distractor");
  return wrong.id;
}

/** Start a real round, past the intro and ready to be answered. */
function started(seed = 5): GeneralKnowledgeState {
  const dealt = freshGeneralKnowledgeState(
    buildGeneralKnowledgeSession(createRng(seed)),
  );
  return run(dealt, { type: "begin" }, { type: "settle" });
}

/** Answer the question in front of you correctly and move on. */
function answerRight(state: GeneralKnowledgeState): GeneralKnowledgeState {
  return run(
    state,
    /* A connect board is finished by its own engine, which tells the round
       `solved`; a tile question is answered by tapping the right tile. */
    currentBoard(state)
      ? { type: "solved" }
      : { type: "answer", optionId: rightAnswer(state) },
    { type: "settle" },
    { type: "settle" },
  );
}

/** A round in which the habitats slot dealt the one board that is joined up. */
function startedOnHomes(): GeneralKnowledgeState {
  for (let seed = 0; seed < 400; seed++) {
    let state = started(seed);
    for (let question = 0; question < 10; question++) {
      const board = currentBoard(state);
      if (board?.activityId === "general-knowledge.home-partners") return state;
      state = answerRight(state);
    }
  }
  assert.fail("no seed under 400 dealt home-partners");
}

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* 1 ---------------------------------------------------------------------- */
test("a round is ten questions, drawn rather than written", () => {
  assert.equal(GENERAL_KNOWLEDGE_LENGTH, 10);
  assert.equal(GENERAL_KNOWLEDGE_PLAN.slots.length, 10);

  for (const seed of [0, 1, 42, 1234]) {
    const session = buildGeneralKnowledgeSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length}`);
  }

  /* The unseeded deal is a real round too: it is what the server renders. */
  assert.equal(buildGeneralKnowledgeSession().length, 10);

  /* No round repeats an id: two slots may land on the same activity, and a
     generated id is only unique inside one draw. */
  for (let seed = 0; seed < 80; seed++) {
    const ids = buildGeneralKnowledgeSession(createRng(seed)).map(
      (challenge: Challenge) => challenge.id,
    );
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }

  /* The same seed is the same round, twice running. */
  const once = buildGeneralKnowledgeSession(createRng(99)).map(challengeKey);
  const again = buildGeneralKnowledgeSession(createRng(99)).map(challengeKey);
  assert.deepEqual(once, again);
});

/* 2 ---------------------------------------------------------------------- */
test("no round teaches the same thing twice, or says the same sentence twice", () => {
  for (let seed = 0; seed < 200; seed++) {
    const session = buildGeneralKnowledgeSession(createRng(seed));

    const ideas = session.map(conceptKey);
    assert.equal(
      new Set(ideas).size,
      ideas.length,
      `seed ${seed} taught the same thing twice: ${ideas.join(" / ")}`,
    );

    /* Which of course also means no repeated board. */
    const boards = session.map(challengeKey);
    assert.equal(new Set(boards).size, boards.length);

    /* And this game's own rule, the one Shapes Quest does not have: a whole
       sentence is never heard twice. The sorting activities ask "which one is
       a fruit?" of three different fruits — three real facts, and three
       identical sentences, which is what makes a round feel circular. */
    const said = session.map((challenge) => challenge.prompt.speech);
    assert.equal(
      new Set(said).size,
      said.length,
      `seed ${seed} asked the same sentence twice: ${said.join(" / ")}`,
    );
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a round gets harder as it goes, and never doubles back", () => {
  const planned = GENERAL_KNOWLEDGE_PLAN.slots.map((slot) => slot.level);
  assert.deepEqual(planned, [1, 1, 1, 2, 2, 2, 2, 2, 3, 3]);

  for (let seed = 0; seed < 120; seed++) {
    const levels = buildGeneralKnowledgeSession(createRng(seed)).map(
      (challenge) => challenge.level,
    );
    assert.deepEqual(
      levels,
      planned,
      `seed ${seed} climbed differently: ${levels.join(",")}`,
    );
  }
});

/* 4 ---------------------------------------------------------------------- */
test("every slot offers real activities, and every activity can be reached", () => {
  const known = new Set(GENERAL_KNOWLEDGE_ACTIVITIES.map((a) => a.id));
  const offered = new Set<string>();

  for (const [index, slot] of GENERAL_KNOWLEDGE_PLAN.slots.entries()) {
    assert.ok(slot.from.length >= 3, `slot ${index} offers only ${slot.from.length}`);
    assert.equal(
      new Set(slot.from).size,
      slot.from.length,
      `slot ${index} lists the same activity twice`,
    );
    for (const id of slot.from) {
      assert.ok(known.has(id), `slot ${index} names ${id}, which does not exist`);
      offered.add(id);
    }
  }

  /* Every activity this game can draw is reachable: nothing was written and
     forgotten.

     "Can draw" is the whole qualification, and it is not a loophole. General
     Knowledge Quest renders `ChoiceStage`, and — for exactly one activity,
     `home-partners`, the one whose answer is somewhere to go — `ConnectStage`
     under the same round. Every other `connect` board and both `order`
     boards are deliberately absent, and the assertion below is that they are
     the *only* things absent — the day another non-choice activity is written
     and nobody notices, this fails. Where they are played instead is
     `/playground/mixed` and `/playground/batch`. */
  const HELD = new Set(["general-knowledge.home-partners"]);
  const drawable = new Set(
    GENERAL_KNOWLEDGE_ACTIVITIES.filter((a) => a.kind === "choice" || HELD.has(a.id)).map(
      (a) => a.id,
    ),
  );
  const missing = [...drawable].filter((id) => !offered.has(id));
  assert.deepEqual(missing, [], `never offered in any round: ${missing.join(", ")}`);

  const skipped = [...known].filter((id) => !drawable.has(id));
  assert.deepEqual(
    skipped.sort(),
    [
      "general-knowledge.animal-babies",
      "general-knowledge.body-partners",
      "general-knowledge.day-order",
      "general-knowledge.helper-partners",
      "general-knowledge.life-cycles",
    ],
    "a non-choice activity has appeared in the pack and nobody decided where it is played",
  );
  for (const id of skipped) {
    assert.ok(!offered.has(id), `${id} is offered to a game that cannot draw it`);
  }

  /* And the round is not predictable: over many seeds, the slots land on
     different activities. */
  const shapes = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    shapes.add(
      buildGeneralKnowledgeSession(createRng(seed))
        .map((challenge) => challenge.activityId)
        .join(">"),
    );
  }
  assert.ok(shapes.size > 150, `only ${shapes.size} different orders in 200 rounds`);
});

/* 5 ---------------------------------------------------------------------- */
test("the one activity with no easy questions is never offered as an easy one", () => {
  /* Tools of the job starts at level two. `resolveLevel` would snap it up into
     a level-one slot without complaining, and a snapped-up question is not an
     easy question — so the plan keeps it out of the gentle slots by hand. */
  const tools = GENERAL_KNOWLEDGE_ACTIVITIES.find(
    (a) => a.id === "general-knowledge.helper-tools",
  );
  assert.ok(tools, "helper-tools is missing from the pack");
  assert.ok(!tools.levels.includes(1), "helper-tools now has a level one");

  for (const slot of GENERAL_KNOWLEDGE_PLAN.slots) {
    if (slot.level > 1) continue;
    assert.ok(
      !slot.from.includes("general-knowledge.helper-tools"),
      "helper-tools is offered where the round is meant to be easy",
    );
  }
});

/* 6 ---------------------------------------------------------------------- */
test("the round starts with hello, and exactly one thing to press", () => {
  const dealt = freshGeneralKnowledgeState(
    buildGeneralKnowledgeSession(createRng(3)),
  );
  assert.equal(dealt.phase, "intro");
  assert.equal(generalKnowledgeProgress(dealt).current, 0);
  assert.equal(generalKnowledgeProgress(dealt).total, 10);

  /* Nothing is answerable while KIDDO is saying hello. */
  const tapped = run(dealt, { type: "answer", optionId: rightAnswer(dealt) });
  assert.equal(tapped.phase, "intro");
  assert.equal(generalKnowledgeProgress(tapped).current, 0);

  /* Pressing the button starts the first question landing, and a beat later
     the board is listening. */
  const begun = run(dealt, { type: "begin" });
  assert.equal(begun.phase, "ready");
  assert.equal(run(begun, { type: "settle" }).phase, "awaitingAnswer");

  /* A second hello does nothing. */
  assert.equal(run(begun, { type: "begin" }).phase, "ready");

  /* A whole spoken question has to land before a tile can be tapped. */
  assert.ok(GENERAL_KNOWLEDGE_TIMING.ready >= 500);
  assert.ok(GENERAL_KNOWLEDGE_TIMING.correct > GENERAL_KNOWLEDGE_TIMING.retry);
});

/* 7 ---------------------------------------------------------------------- */
test("a right answer moves the round on, once KIDDO has said why", () => {
  const state = started(11);
  assert.equal(state.phase, "awaitingAnswer");

  const right = run(state, { type: "answer", optionId: rightAnswer(state) });
  assert.equal(right.phase, "correct");
  assert.equal(right.picked, rightAnswer(state));

  /* The dots do not move while the answer is being shown. */
  assert.equal(generalKnowledgeProgress(right).current, 0);

  const next = run(right, { type: "settle" });
  assert.equal(next.phase, "ready");
  assert.equal(generalKnowledgeProgress(next).current, 1);
  assert.deepEqual(next.tried, []);
  assert.equal(next.picked, null);
  assert.equal(next.hinted, false);

  /* There is something to say: every question in this pack ends in a fact. */
  const challenge = currentChallenge(state.run);
  assert.ok(challenge?.explanation, "the first question explains nothing");
  assert.ok(answerLabelOf(challenge).length > 0);
});

/* 8 ---------------------------------------------------------------------- */
test("a wrong answer costs nothing, and can be given as often as you like", () => {
  let state = started(7);
  const wrong = wrongAnswer(state);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    state = run(state, { type: "answer", optionId: wrong }, { type: "settle" });
    assert.equal(state.phase, "awaitingAnswer", "the board stopped listening");
    assert.equal(
      generalKnowledgeProgress(state).current,
      0,
      "a wrong answer moved the round on",
    );
    assert.equal(state.picked, null);
    assert.ok(state.hinted, "KIDDO stopped offering the hint");
    /* The same tile tried twelve times is still one ruled-out tile. */
    assert.deepEqual(state.tried, [wrong]);
  }

  /* And the question is still there, still answerable, still the same one. */
  const finished = run(state, { type: "answer", optionId: rightAnswer(state) });
  assert.equal(finished.phase, "correct");
  assert.equal(generalKnowledgeProgress(run(finished, { type: "settle" })).current, 1);
});

/* 9 ---------------------------------------------------------------------- */
test("taps that arrive out of turn fall on the floor", () => {
  const state = started(21);

  /* Rapid tapping: the second tap lands while the first answer is showing. */
  const right = rightAnswer(state);
  const wrong = wrongAnswer(state);
  const drummed = run(
    state,
    { type: "answer", optionId: right },
    { type: "answer", optionId: wrong },
    { type: "answer", optionId: wrong },
  );
  assert.equal(drummed.phase, "correct", "a late tap undid a right answer");
  assert.equal(drummed.picked, right);
  assert.deepEqual(drummed.tried, []);

  /* And the other way round: a tap during the nudge cannot be counted. */
  const nudged = run(
    state,
    { type: "answer", optionId: wrong },
    { type: "answer", optionId: right },
  );
  assert.equal(nudged.phase, "incorrect");
  assert.deepEqual(nudged.tried, [wrong]);

  /* An id from nowhere — a stale tile from the last question, a fuzzed
     value — is not an answer at all, right or wrong. */
  const nonsense = run(state, { type: "answer", optionId: "not-a-tile" });
  assert.equal(nonsense.phase, "awaitingAnswer");
  assert.deepEqual(nonsense.tried, []);
  assert.equal(nonsense.picked, null);
  assert.equal(nonsense.hinted, false);
});

/* 10 --------------------------------------------------------------------- */
test("ten right answers finish the round, and it then asks nothing more", () => {
  let state = started(4);

  for (let question = 0; question < 10; question += 1) {
    assert.equal(generalKnowledgeProgress(state).current, question);
    assert.ok(
      currentOptions(state).length >= 3 || (currentBoard(state)?.payload.pairs.length ?? 0) >= 2,
      "a question arrived with no board",
    );
    state =
      question < 9
        ? answerRight(state)
        : run(
            state,
            currentBoard(state)
              ? { type: "solved" }
              : { type: "answer", optionId: rightAnswer(state) },
            { type: "settle" },
          );
    if (question < 9) {
      state = run(state, { type: "settle" });
      assert.equal(state.phase, "awaitingAnswer");
    }
  }

  assert.equal(state.phase, "complete");
  assert.equal(generalKnowledgeProgress(state).current, 10);
  assert.equal(currentChallenge(state.run), null);
  assert.deepEqual(currentOptions(state), []);
  assert.equal(generalKnowledgePrompt(state), "");
  assert.equal(answerLabelOf(currentChallenge(state.run)), "");

  /* Nothing can restart it by accident. */
  assert.equal(run(state, { type: "settle" }).phase, "complete");
  assert.equal(run(state, { type: "answer", optionId: "anything" }).phase, "complete");
  assert.equal(run(state, { type: "begin" }).phase, "complete");
});

/* 11 --------------------------------------------------------------------- */
test("Play Again deals a different round, and skips the hello", () => {
  const first = buildGeneralKnowledgeSession(createRng(8));
  const second = buildGeneralKnowledgeSession(createRng(9));

  const played = run(freshGeneralKnowledgeState(first), { type: "begin" }, {
    type: "settle",
  });
  const replayed = run(played, {
    type: "deal",
    challenges: second,
    intro: false,
  });

  assert.equal(replayed.phase, "ready", "Play Again said hello all over again");
  assert.equal(generalKnowledgeProgress(replayed).current, 0);
  assert.equal(generalKnowledgeProgress(replayed).total, 10);
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
  const asked = generalKnowledgePrompt(state);
  assert.equal(asked, currentChallenge(state.run)?.prompt.speech);

  const missed = run(state, { type: "answer", optionId: wrongAnswer(state) }, {
    type: "settle",
  });
  const nudged = generalKnowledgePrompt(missed);

  assert.ok(missed.hinted);
  assert.notEqual(nudged, asked, "the same question was asked twice");
  assert.equal(nudged, currentChallenge(missed.run)?.hint);

  /* That the hint keeps the answer secret is content, and every board in the
     pack is checked for it in `tests/generalKnowledge.test.ts`. The only claim
     here is that getting it right afterwards clears the nudge away. */
  const recovered = run(
    missed,
    { type: "answer", optionId: rightAnswer(missed) },
    { type: "settle" },
  );
  assert.equal(recovered.hinted, false);
  assert.equal(
    generalKnowledgePrompt(recovered),
    currentChallenge(recovered.run)?.prompt.speech,
  );
});

/* 13 --------------------------------------------------------------------- */
test("General Knowledge Quest is in the catalogue and wired to a route of its own", () => {
  const game = getGame("general-knowledge-quest");
  assert.ok(game, "general-knowledge-quest is not in the catalogue");
  assert.equal(game.route, "/play/general-knowledge-quest");
  assert.equal(game.status, "ready");
  assert.equal(game.access, "free");
  assert.equal(game.category, "discovery");
  assert.equal(game.accent, "sage");
  assert.ok(game.cast.length > 0);
  assert.ok(game.themes.length > 0);
  for (const theme of game.themes) {
    assert.equal(theme.access, "free", `${theme.id} is locked`);
  }

  /* One id, one route, one card. A duplicate would give KIDDO World two. */
  assert.equal(GAMES.filter((g) => g.id === "general-knowledge-quest").length, 1);
  assert.equal(new Set(GAMES.map((g) => g.route)).size, GAMES.length);

  /* Built, so it is off the "coming soon" list. */
  assert.ok(!UPCOMING_THEMES.some((theme) => /general knowledge|world/i.test(theme)));

  /* And the route knows how to draw it, rather than falling through to the
     holding stage every unbuilt game gets. */
  const route = source("src/app/play/[gameId]/page.tsx");
  assert.match(route, /"general-knowledge-quest": GeneralKnowledgeQuestGame/);

  /* The games that were already here are still here, and still routed. */
  for (const id of [
    "memory-match",
    "find-it",
    "math-quest",
    "english-quest",
    "logic-quest",
    "shapes-colours-quest",
  ]) {
    assert.ok(getGame(id), `${id} fell out of the catalogue`);
    assert.ok(route.includes(`"${id}":`), `${id} lost its route`);
  }
});

/* 14 --------------------------------------------------------------------- */
test("a wrong answer is never punished in words, in the game or in the rules", () => {
  const game = source("src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx");

  /* The words a child sees. The game names the keys; the catalogues hold the
     sentences. Nothing under either of them says no — in either language. */
  assert.match(game, /t\("game\.general-knowledge-quest\.retry"\)/);
  assert.match(game, /t\("game\.general-knowledge-quest\.done\.title"\)/);
  assert.equal(en["game.general-knowledge-quest.retry"], "Ooh, not that one. Try again!");
  assert.equal(en["game.general-knowledge-quest.done.title"], "You know so much!");
  const lines = assertNothingScolds(assert, "game.general-knowledge-quest.", "quest.");
  assert.ok(lines.length >= 40, "the round's words went missing from the catalogues");

  /* No score, no lives, no clock — not in the game and not in its rules.
     "lives" is looked for as a game mechanic rather than as a word, because
     English also uses it for where an animal sits in the world. */
  const rules = source("src/lib/games/generalKnowledgeQuest.ts");
  const hook = source("src/lib/games/useGeneralKnowledgeQuest.ts");
  for (const file of [game, rules, hook]) {
    for (const forbidden of ["score", "streak", "penalt", "attempts left", "countdown"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}`, "i").test(file),
        `General Knowledge Quest keeps a ${forbidden}`,
      );
    }
    assert.ok(
      !/\blives\s*[:=]|\blives (left|remaining)\b|\bLives\b/.test(file),
      "General Knowledge Quest counts lives",
    );
  }

  /* KIDDO cheers or encourages. There is no third, unhappier reaction, and
     the shell has no vocabulary for one. */
  assert.match(game, /feedback=\{quest\.feedback\}/);
  for (const value of ["correct", "retry", "idle"]) {
    assert.ok(hook.includes(`"${value}"`));
  }
  assert.ok(!hook.includes('"sad"'));

  /* And the round has its own timings rather than a borrowed set — the
     thinking time is the game's decision, not the animation's. */
  assert.ok(!rules.includes("SHAPES_QUEST_TIMING"));
  assert.ok(!hook.includes("useShapesColoursQuest"));
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

  /* Nothing rests on colour alone: the state is in the accessible name. Every
     tile in this pack is a picture, so the name is the only thing a child
     using a screen reader has — which is why no tile is called after the word
     the question is looking for. */
  const stage = source("src/components/games/engines/ChoiceStage.tsx");
  assertChoiceStatesAreSaid(assert, stage);
  assert.match(en["stage.choice.correct"], /that's the one/);
  assert.match(en["stage.choice.wrong"], /not this one/);
  assert.match(en["stage.choice.tried"], /already tried/);

  /* And the round says out loud where it has got to, and what was asked, for
     a child who cannot see the dots or the bubble. */
  const game = source("src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx");
  /* Said through the shell's one live region — which sits outside the keyed
     stage, so it never remounts with the board — rather than in a paragraph
     of the game's own. The shell is where `role="status"` now lives. */
  assert.match(game, /announce=\{announcement\}/);
  const frame = source("src/components/games/GameShell.tsx");
  assert.match(frame, /role="status"/);
  assert.match(frame, /aria-live="polite"/);
  /* Which question this is, and what the answer turned out to be — said as
     keys, with the step numbers handed in. A catalogue that dropped
     `{current}` would leave a listening child with no place in the round, so
     the holes are checked in every language rather than the sentence in one. */
  assert.match(game, /t\("quest\.asking", \{ question: quest\.question, \.\.\.step \}\)/);
  assert.match(game, /t\("quest\.answered", \{ answer: answerLabel, \.\.\.step \}\)/);
  assert.match(
    game,
    /const step = \{ current: quest\.progress\.current \+ 1, total: quest\.progress\.total \}/,
  );
  for (const words of Object.values(ALL_CATALOGUES)) {
    for (const hole of ["{current}", "{total}", "{question}"]) {
      assert.ok(words["quest.asking"].includes(hole), `quest.asking lost ${hole}`);
    }
    for (const hole of ["{current}", "{total}", "{answer}"]) {
      assert.ok(words["quest.answered"].includes(hole), `quest.answered lost ${hole}`);
    }
  }
});

/* 16 --------------------------------------------------------------------- */
test("one implementation, drawn by the engine that already existed", () => {
  const game = source("src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx");

  /* No second layout for a phone, no second component for a tablet: one
     `ChoiceStage`, which sizes itself. */
  assert.match(game, /<ChoiceStage/);
  assert.ok(!/isMobile|useMediaQuery|window\.inner/.test(game));

  /* And no General-Knowledge-specific rendering was smuggled into the shared
     engine: the stage still knows about kinds of content, never about packs. */
  const stage = source("src/components/games/engines/ChoiceStage.tsx");
  for (const word of ["general knowledge", "animal", "vehicle", "body-parts", "weather"]) {
    assert.ok(
      !stage.toLowerCase().includes(word),
      `ChoiceStage knows about "${word}" — the engine has stopped being subject-agnostic`,
    );
  }

  /* The one generic thing that was added: a picture, which any pack can use. */
  const view = source("src/components/games/engines/ContentItemView.tsx");
  assert.match(view, /case "picture"/);
  assert.ok(!view.toLowerCase().includes("general-knowledge"));

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
    "src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx",
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

  /* The longest thing on screen is a question, so the bubble has to wrap and
     the board has to fit the height it is given. */
  const board = source("src/components/games/engines/ChoiceStage.tsx");
  assert.match(board, /flex-wrap/);
  assert.match(board, /100dvh/);
});

/* 17 --------------------------------------------------------------------- */
test("this is its own game, sharing engines with the other quests and no rules", () => {
  const rules = source("src/lib/games/generalKnowledgeQuest.ts");

  /* §1: reuse the content architecture, write the state machine. */
  for (const shared of ["drawSession", "checkAnswer", "conceptKey", "startRun"]) {
    assert.ok(rules.includes(shared), `the rules do not use ${shared}`);
  }
  /* Read the imports rather than the prose: the file is free to *mention*
     Shapes Quest, and it does, explaining why it is not one. */
  const imports = [...rules.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const borrowed of [
    "mathQuest",
    "englishQuest",
    "logicQuest",
    "shapesColoursQuest",
  ]) {
    assert.ok(
      !imports.some((path) => path.includes(borrowed)),
      `General Knowledge Quest imports ${borrowed}'s reducer`,
    );
  }

  /* The other games do not import this one either: nothing about them changed
     to make room for it. */
  for (const path of [
    "src/lib/games/mathQuest.ts",
    "src/lib/games/englishQuest.ts",
    "src/lib/games/logicQuest.ts",
    "src/lib/games/shapesColoursQuest.ts",
  ]) {
    assert.ok(
      !source(path).includes("generalKnowledge"),
      `${path} was changed to know about General Knowledge`,
    );
  }
});

/* 18 --------------------------------------------------------------------- */
test("the one board that is joined up is held by the same round, by the same rules", () => {
  let state = startedOnHomes();
  const board = currentBoard(state);
  assert.ok(board);
  assert.equal(board.payload.kind, "connect");
  assert.equal(state.phase, "awaitingAnswer");
  assert.deepEqual(currentOptions(state), [], "a board has no tiles to tap");
  assert.equal(generalKnowledgePrompt(state), board.prompt.speech);
  const before = generalKnowledgeProgress(state).current;

  /* Tapping does nothing to a board: there is nothing to tap. */
  assert.equal(run(state, { type: "answer", optionId: "dog" }).phase, "awaitingAnswer");

  /* A missed line softens the question, costs nothing, and can happen
     as often as you like. */
  const missed = run(state, { type: "missed" }, { type: "missed" });
  assert.equal(missed.phase, "awaitingAnswer");
  assert.equal(missed.hinted, true);
  assert.equal(generalKnowledgePrompt(missed), board.hint);
  assert.equal(generalKnowledgeProgress(missed).current, before);

  /* The engine finishing the board is the round's right answer. */
  state = run(missed, { type: "solved" });
  assert.equal(state.phase, "correct");
  assert.equal(run(state, { type: "solved" }).phase, "correct", "a second solve is ignored");
  state = run(state, { type: "settle" }, { type: "settle" });
  assert.equal(state.phase, "awaitingAnswer");
  assert.equal(generalKnowledgeProgress(state).current, before + 1);
  assert.equal(state.hinted, false);

  /* And neither word means anything to a tile question. */
  assert.equal(currentBoard(state), null);
  assert.equal(run(state, { type: "solved" }).phase, "awaitingAnswer");
  assert.equal(run(state, { type: "missed" }).hinted, false);
});

/* 19 --------------------------------------------------------------------- */
test("between boards the engine is given an empty board, never a null", () => {
  assert.equal(IDLE_BOARD.payload.kind, "connect");
  assert.deepEqual(IDLE_BOARD.payload.pairs, []);
  assert.deepEqual(IDLE_BOARD.payload.left, []);
  assert.equal(IDLE_BOARD.activityId, "general-knowledge.home-partners");
  /* It is a real challenge shape, so the engine needs no special case. */
  assert.equal(typeof IDLE_BOARD.id, "string");
  assert.equal(typeof IDLE_BOARD.prompt.speech, "string");
});

/* 20 --------------------------------------------------------------------- */
test("the animal walks home in the real Quest, and nothing else in it moves", () => {
  const game = source("src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx");
  assert.match(game, /<ConnectStage/);
  assert.match(game, /<ChoiceStage/);
  assert.match(game, /travel=\{board\.challenge\.activityId === WALKS_HOME\}/);
  assert.match(game, /const WALKS_HOME = "general-knowledge\.home-partners"/);
  /* The game passes the engine through; it does not animate itself. */
  assert.doesNotMatch(game, /MagicMotion/);
  /* The bubble is sized for everything KIDDO can say about the question. */
  assert.match(game, /promptReserve=\{phase === "intro" \? \[\] : lines\}/);
  /* A board keeps its own quiet words, separate from the question's — the
     game reads its own two keys, and the catalogue still holds the wording. */
  assert.match(game, /t\("game\.general-knowledge-quest\.yesBoard"\)/);
  assert.match(game, /t\("game\.general-knowledge-quest\.retryBoard"\)/);
  assert.equal(en["game.general-knowledge-quest.yesBoard"], "Yes! That's the one.");
  assert.equal(
    en["game.general-knowledge-quest.retryBoard"],
    "Ooh, not that one. Have another go.",
  );
  /* And they are the board's own in Malay as well, not the question's reused. */
  for (const words of Object.values(ALL_CATALOGUES)) {
    assert.notEqual(
      words["game.general-knowledge-quest.yesBoard"],
      words["game.general-knowledge-quest.retryBoard"],
    );
  }
  /* And a screen reader hears the join land, by count rather than by motion. */
  assert.match(game, /t\("quest\.joined", \{/);
  for (const words of Object.values(ALL_CATALOGUES)) {
    assert.ok(words["quest.joined"].includes("{current}"));
    assert.ok(words["quest.joined"].includes("{total}"));
  }
});
