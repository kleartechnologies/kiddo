import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { challengeKey, checkAnswer, checkStep, drawChallenges } from "@/lib/content/challenges";
import { orderReferenceActivity } from "@/lib/content/reference/order";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { ChallengeOf } from "@/lib/content/types";
import { validateActivity, validateChallenge } from "@/lib/content/validate";
import {
  freshOrderState,
  isOrderAccepting,
  isOrderPlaced,
  orderPositionOf,
  orderProgress,
  orderReducer,
  orderTray,
  type OrderAction,
  type OrderState,
} from "@/lib/games/engines/order";

/**
 * The Order interaction engine, played without a browser.
 *
 * The same three layers `connect.test.ts` checks, in the same places. The
 * content layer is checked as content: an ordering with two right answers, or
 * one that names an item twice, is the kind of thing types cannot catch. The
 * reducer is checked as rules, with no React anywhere. And a handful of the
 * engine's decisions — real buttons, no marking in the renderer, no fixed
 * pixel board — are checked against the source, because they are exactly the
 * sort of thing that gets tidied away by someone who cannot see why they are
 * there.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The same file with its comments taken out.
 *
 * Every promise below is about what the code *does*, and a doc block that
 * explains why the engine never reads `answerOrder` would otherwise read as
 * the engine reading `answerOrder`.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const STAGE = "src/components/games/engines/OrderStage.tsx";
const REDUCER = "src/lib/games/engines/order.ts";

/** Draw one board, repeatably. */
function board(level: 1 | 2 | 3 = 2, seed = 3): ChallengeOf<"order"> {
  const [drawn] = drawChallenges(orderReferenceActivity, {
    level,
    count: 1,
    rng: createRng(seed),
  });
  assert.ok(drawn && drawn.payload.kind === "order", "expected an order board");
  return drawn as ChallengeOf<"order">;
}

/** A spread of boards, for the checks that are about every board. */
function sample(seeds = 30): ChallengeOf<"order">[] {
  const boards: ChallengeOf<"order">[] = [];
  for (const level of [1, 2, 3] as const) {
    for (let seed = 0; seed < seeds; seed++) boards.push(board(level, seed));
  }
  return boards;
}

const answerOf = (challenge: ChallengeOf<"order">) => challenge.payload.answerOrder;

/** Play a whole board correctly, one tile at a time. */
function playThrough(challenge: ChallengeOf<"order">): OrderState {
  let state = freshOrderState(challenge);
  for (const id of answerOf(challenge)) {
    state = orderReducer(state, { type: "place", itemIds: [...state.placed, id] });
    state = orderReducer(state, { type: "retry" });
  }
  return state;
}

/** Apply a run of actions in order. */
function run(state: OrderState, ...actions: OrderAction[]): OrderState {
  return actions.reduce(orderReducer, state);
}

/* ------------------------------------------------------------- content --- */

test("the reference order activity is registered, and is not a game", () => {
  const activity = getActivity("discovery.count-order");
  assert.ok(activity, "count-order should be in the registry");
  assert.equal(activity.kind, "order");
  /* The home screen reads `data/games.ts`. A reference activity is not a
     Quest and must never quietly become one. */
  assert.doesNotMatch(read("src/data/games.ts"), /count-order/);
});

test("every board it can deal is valid content", () => {
  assert.deepEqual(validateActivity(orderReferenceActivity, 40), []);
});

test("a board's item ids are unique, and answerOrder names each exactly once", () => {
  for (const challenge of sample()) {
    const ids = challenge.payload.items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, challenge.id);

    const answer = answerOf(challenge);
    assert.equal(new Set(answer).size, answer.length, challenge.id);
    assert.deepEqual([...answer].sort(), [...ids].sort(), challenge.id);
  }
});

test("a tray is never handed over already solved", () => {
  for (const challenge of sample()) {
    const dealt = challenge.payload.items.map((item) => item.id);
    assert.notDeepEqual(dealt, [...answerOf(challenge)], challenge.id);
  }
});

test("levels deal three, four and five tiles", () => {
  assert.equal(board(1).payload.items.length, 3);
  assert.equal(board(2).payload.items.length, 4);
  assert.equal(board(3).payload.items.length, 5);
});

test("a level above the ones it offers is snapped down, not dropped", () => {
  const [drawn] = drawChallenges(orderReferenceActivity, { level: 5, count: 1 });
  assert.ok(drawn);
  assert.equal(drawn.level, 3);
});

test("the same seed deals the same board, twice", () => {
  for (const seed of [0, 1, 7, 99]) {
    assert.deepEqual(board(2, seed).payload, board(2, seed).payload);
  }
});

test("different seeds vary the board", () => {
  const keys = new Set(
    Array.from({ length: 20 }, (_, seed) => challengeKey(board(3, seed))),
  );
  assert.ok(keys.size > 1, "every seed dealt the same question");
});

test("exactly one arrangement is accepted", () => {
  const challenge = board(1);
  const answer = answerOf(challenge);
  assert.ok(checkAnswer(challenge, { kind: "order", itemIds: [...answer] }));

  /* Every other arrangement of the same three tiles is refused. */
  for (const wrong of permutations([...answer])) {
    if (wrong.join() === answer.join()) continue;
    assert.equal(
      checkAnswer(challenge, { kind: "order", itemIds: wrong }),
      false,
      wrong.join(),
    );
  }
});

test("checkStep accepts a prefix and refuses a tile out of place", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);

  for (let length = 0; length <= answer.length; length++) {
    assert.ok(
      checkStep(challenge, { kind: "order", itemIds: answer.slice(0, length) }),
      `prefix of ${length}`,
    );
  }

  /* Right so far, then the wrong tile. */
  assert.equal(
    checkStep(challenge, { kind: "order", itemIds: [answer[1]] }),
    false,
  );
  assert.equal(
    checkStep(challenge, { kind: "order", itemIds: [answer[0], answer[2]] }),
    false,
  );
});

test("a half-built line is a step but not an answer", () => {
  const challenge = board(2);
  const half = answerOf(challenge).slice(0, 2);
  assert.ok(checkStep(challenge, { kind: "order", itemIds: half }));
  assert.equal(checkAnswer(challenge, { kind: "order", itemIds: half }), false);
});

test("a made-up id is refused by the content layer", () => {
  const challenge = board(2);
  assert.equal(
    checkStep(challenge, { kind: "order", itemIds: ["not-a-tile"] }),
    false,
  );
  assert.equal(
    checkAnswer(challenge, { kind: "order", itemIds: ["not-a-tile"] }),
    false,
  );
});

test("an answer of another kind is never accepted", () => {
  const challenge = board(2);
  assert.equal(checkAnswer(challenge, { kind: "choice", optionId: "n1" }), false);
  assert.equal(checkStep(challenge, { kind: "choice", optionId: "n1" }), false);
});

test("challengeKey is the ordering, so the same run is the same question", () => {
  const challenge = board(2, 11);
  const twin: ChallengeOf<"order"> = {
    ...challenge,
    id: `${challenge.id}-twin`,
    /* Same tiles, dealt into the tray the other way round. The question a
       child is being asked has not changed. */
    payload: {
      ...challenge.payload,
      items: [...challenge.payload.items].reverse(),
    },
  };
  assert.equal(challengeKey(challenge), challengeKey(twin));
});

test("validateChallenge catches an answerOrder that names a tile twice", () => {
  const challenge = board(1);
  const answer = answerOf(challenge);
  const broken = {
    ...challenge,
    payload: {
      ...challenge.payload,
      answerOrder: [answer[0], answer[0], answer[1]],
    },
  };
  assert.ok(validateChallenge(broken).some((p) => /twice/.test(p)));
});

test("validateChallenge catches an answerOrder that misses a tile", () => {
  const challenge = board(1);
  const broken = {
    ...challenge,
    payload: { ...challenge.payload, answerOrder: answerOf(challenge).slice(0, 2) },
  };
  assert.ok(validateChallenge(broken).some((p) => /cover every item/.test(p)));
});

/* ------------------------------------------------------------- reducer --- */

test("a fresh board is empty, accepting and unfinished", () => {
  const challenge = board(2);
  const state = freshOrderState(challenge);

  assert.deepEqual(state.placed, []);
  assert.equal(state.selectedId, null);
  assert.equal(state.attemptId, null);
  assert.equal(state.feedback, "idle");
  assert.equal(state.completed, false);
  assert.ok(isOrderAccepting(state));
  assert.deepEqual(orderProgress(state), { current: 0, total: 4 });
  assert.equal(orderTray(state).length, 4);
});

test("selecting a tile puts it in hand and answers nothing", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const state = run(freshOrderState(challenge), { type: "select", itemId: answer[1] });

  assert.equal(state.selectedId, answer[1]);
  assert.deepEqual(state.placed, []);
  assert.equal(state.feedback, "idle");
});

test("selecting another tile changes the child's mind, and costs nothing", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const state = run(
    freshOrderState(challenge),
    { type: "select", itemId: answer[2] },
    { type: "select", itemId: answer[0] },
  );

  assert.equal(state.selectedId, answer[0]);
  assert.deepEqual(state.placed, []);
  assert.equal(state.feedback, "idle");
});

test("choosing the tile already in hand places it: the tap-tap gesture", () => {
  const challenge = board(2);
  const first = answerOf(challenge)[0];
  const state = run(
    freshOrderState(challenge),
    { type: "select", itemId: first },
    { type: "select", itemId: first },
  );

  assert.deepEqual(state.placed, [first]);
  assert.equal(state.selectedId, null);
  assert.equal(state.feedback, "correct");
});

test("tap-tap and drag land in exactly the same state", () => {
  const challenge = board(2);
  const first = answerOf(challenge)[0];

  const tapped = run(
    freshOrderState(challenge),
    { type: "select", itemId: first },
    { type: "select", itemId: first },
  );
  const dragged = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [first],
  });

  assert.deepEqual(tapped, dragged);
});

test("a right tile lands, and the line grows by one", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const state = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [answer[0]],
  });

  assert.deepEqual(state.placed, [answer[0]]);
  assert.equal(state.feedback, "correct");
  assert.equal(state.completed, false);
  assert.equal(isOrderPlaced(state, answer[0]), true);
  assert.equal(orderPositionOf(state, answer[0]), 1);
  assert.deepEqual(orderProgress(state), { current: 1, total: 4 });
  assert.equal(orderTray(state).length, 3);
});

test("a wrong tile never lands, and nothing is taken away", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const wrong = answer[2];

  const state = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [wrong],
  });

  assert.deepEqual(state.placed, []);
  assert.equal(state.attemptId, wrong);
  assert.equal(state.feedback, "retry");
  assert.equal(state.completed, false);
  /* The refused tile is still in the tray, and still playable. */
  assert.ok(orderTray(state).some((item) => item.id === wrong));
});

test("retry hands the board back exactly as it was", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const before = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [answer[0]],
  });
  const after = run(before, { type: "retry" });

  assert.deepEqual(after.placed, before.placed);
  assert.equal(after.attemptId, null);
  assert.equal(after.feedback, "idle");
  assert.ok(isOrderAccepting(after));
});

test("a refused tile can be played again the moment the board is handed back", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);

  let state = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [answer[3]],
  });
  state = run(state, { type: "retry" });
  state = run(state, { type: "place", itemIds: [answer[0]] });

  assert.deepEqual(state.placed, [answer[0]]);
  assert.equal(state.feedback, "correct");
});

test("nothing lands while KIDDO is still talking", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);

  const showing = run(freshOrderState(challenge), {
    type: "place",
    itemIds: [answer[0]],
  });
  assert.equal(isOrderAccepting(showing), false);

  const rapid = run(
    showing,
    { type: "place", itemIds: [answer[0], answer[1]] },
    { type: "select", itemId: answer[1] },
  );
  assert.deepEqual(rapid, showing);
});

test("a stale arrangement from a double tap falls on the floor", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);

  const state = run(
    freshOrderState(challenge),
    { type: "place", itemIds: [answer[0]] },
    { type: "retry" },
  );

  /* The same arrangement again: it no longer extends the line by one. */
  assert.deepEqual(run(state, { type: "place", itemIds: [answer[0]] }), state);
  /* And one that skips a place. */
  assert.deepEqual(
    run(state, { type: "place", itemIds: [answer[0], answer[1], answer[2]] }),
    state,
  );
  /* And one that rewrites what is already down. */
  assert.deepEqual(
    run(state, { type: "place", itemIds: [answer[1], answer[0]] }),
    state,
  );
});

test("a tile already in the line cannot be played again", () => {
  const challenge = board(2);
  const answer = answerOf(challenge);
  const state = run(
    freshOrderState(challenge),
    { type: "place", itemIds: [answer[0]] },
    { type: "retry" },
  );

  assert.deepEqual(run(state, { type: "select", itemId: answer[0] }), state);
  assert.deepEqual(
    run(state, { type: "place", itemIds: [answer[0], answer[0]] }),
    state,
  );
});

test("a made-up id is ignored rather than judged", () => {
  const challenge = board(2);
  const state = freshOrderState(challenge);

  assert.deepEqual(run(state, { type: "select", itemId: "nope" }), state);
  assert.deepEqual(run(state, { type: "place", itemIds: ["nope"] }), state);
});

test("an empty arrangement is not a move", () => {
  const challenge = board(2);
  const state = freshOrderState(challenge);
  assert.deepEqual(run(state, { type: "place", itemIds: [] }), state);
});

test("playing the whole board finishes it, and the content layer says so", () => {
  for (const level of [1, 2, 3] as const) {
    const challenge = board(level);
    const state = playThrough(challenge);

    assert.deepEqual([...state.placed], [...answerOf(challenge)]);
    assert.equal(state.completed, true);
    assert.equal(orderTray(state).length, 0);
    assert.deepEqual(orderProgress(state), {
      current: challenge.payload.items.length,
      total: challenge.payload.items.length,
    });
  }
});

test("a finished board stops listening", () => {
  const challenge = board(1);
  const done = playThrough(challenge);
  assert.equal(isOrderAccepting(done), false);

  assert.deepEqual(run(done, { type: "select", itemId: answerOf(challenge)[0] }), done);
  assert.deepEqual(run(done, { type: "place", itemIds: [] }), done);
  /* Even `retry` cannot reopen it: the round is over, not paused. */
  assert.equal(run(done, { type: "retry" }).completed, true);
});

test("reset empties the board, with or without a new challenge", () => {
  const challenge = board(2);
  const played = playThrough(challenge);

  assert.deepEqual(run(played, { type: "reset" }), freshOrderState(challenge));

  const next = board(3, 12);
  const swapped = run(played, { type: "reset", challenge: next });
  assert.equal(swapped.challenge, next);
  assert.deepEqual(swapped.placed, []);
});

test("the reducer never mutates the state it is given", () => {
  const challenge = board(2);
  const state = freshOrderState(challenge);
  const before = JSON.stringify(state);
  const answer = answerOf(challenge);

  run(
    state,
    { type: "select", itemId: answer[0] },
    { type: "place", itemIds: [answer[0]] },
    { type: "place", itemIds: [answer[2]] },
    { type: "retry" },
    { type: "reset" },
  );

  assert.equal(JSON.stringify(state), before);
});

test("the reducer keeps no score, no lives, no streak and no clock", () => {
  const source = code(REDUCER);
  for (const banned of [/\bscore\b/i, /\blives\b/i, /\bstreak\b/i, /\bxp\b/i, /setTimeout/]) {
    assert.doesNotMatch(source, banned, String(banned));
  }
});

test("the reducer asks the content layer and never marks anything itself", () => {
  const source = code(REDUCER);
  assert.match(source, /checkStep\(/);
  assert.match(source, /checkAnswer\(/);
  /* Whatever the right order is, it is not this file's business. */
  assert.doesNotMatch(source, /answerOrder/);
  assert.doesNotMatch(source, /\.sort\(/);
});

/* -------------------------------------------------------------- source --- */

test("the tiles are real buttons, not divs with handlers", () => {
  const source = code(STAGE);
  assert.match(source, /<motion\.button/);
  assert.match(source, /data-order-tile/);
  /* And the insertion point is a real button too, so it can be reached. */
  assert.match(source, /data-order-slot/);
  assert.doesNotMatch(source, /<canvas/);
});

test("every tile and place says what it is, in words", () => {
  const source = code(STAGE);
  assert.match(source, /aria-label=/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /sr-only/);
  assert.match(source, /spokenOf\(/);
});

test("nothing is removed from the tab order, and nothing is `disabled`", () => {
  const source = code(STAGE);
  /* `disabled` would take the focus ring with it, so a child on a keyboard
     could not read a tile they are not allowed to move. */
  assert.doesNotMatch(source, /[\s{]disabled=\{/);
  assert.doesNotMatch(source, /tabIndex=\{-1\}/);
  assert.match(source, /aria-disabled=/);
});

test("the keyboard has its own path through the board", () => {
  const source = code(STAGE);
  assert.match(source, /event\.detail !== 0/);
});

test("a tap and a drag arrive at the same funnel", () => {
  const source = code(STAGE);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /elementFromPoint/);
  assert.match(source, /const choose = useCallback/);
  assert.match(source, /touch-none/);
});

test("the board has no fixed width or height in it", () => {
  const source = code(STAGE);
  assert.doesNotMatch(source, /[whx]-\[\d+px\]/);
  assert.doesNotMatch(source, /(width|height):\s*\d+px/);
  /* The line is laid out by the browser, from literal column classes the
     Tailwind scanner can actually see. */
  assert.match(source, /grid-cols-5/);
  assert.match(source, /max-w-\[min\(46rem,100%\)\]/);
});

test("the tiles stay comfortably tappable, with a floor on a short screen", () => {
  const source = code(STAGE);
  assert.match(source, /min-h-16/);
  assert.match(source, /min-w-16/);
  assert.match(source, /\[@media\(max-height:44rem\)\]:min-h-12/);
  assert.match(source, /\[@media\(max-height:44rem\)\]:min-w-12/);
});

test("motion comes from the house system and nothing loops", () => {
  const source = code(STAGE);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /from "framer-motion"/);
  assert.match(source, /reduced \? false :/);
  assert.match(source, /reduced \? \{ duration: 0 \}/);
  /* "Nothing loops in the background, nothing animates just to be seen." */
  assert.doesNotMatch(source, /repeat:/);
  assert.doesNotMatch(source, /Infinity/);
  assert.doesNotMatch(source, /animate-pulse|animate-bounce|animate-ping/);
});

test("every gesture animation is gated on reduced motion, hover included", () => {
  const source = code(STAGE);
  /* Measured in a browser with `prefers-reduced-motion: reduce`: an ungated
     `whileHover` still lifted a chosen tile 8px under the pointer. Everything
     that moves a tile has to ask first. The gate is a zeroed distance, not a
     removed prop: a gesture prop's presence reaches the server HTML (the
     press gesture stamps `tabindex="0"` there), and `useReducedMotion` is
     `false` on the server, so a prop that vanishes on the client is a
     hydration mismatch — measured as a console error on the reduced-motion
     pass of `measure-visual.mjs`. */
  for (const gesture of [/whileHover=\{[^}]*\}/, /whileTap=\{[^}]*\}/]) {
    const found = source.match(new RegExp(gesture, "g")) ?? [];
    assert.ok(found.length > 0, "the tiles respond to a pointer at all");
    for (const prop of found) assert.match(prop, /reduced \? 0/);
  }
});

test("the stage holds no game state and marks nothing", () => {
  const source = code(STAGE);
  assert.doesNotMatch(source, /useReducer/);
  assert.doesNotMatch(source, /checkAnswer|checkStep/);
  /* The right order is in the payload it is handed. It must not look. */
  assert.doesNotMatch(source, /answerOrder/);
  for (const banned of [/\bscore\b/i, /\blives\b/i, /\bstreak\b/i, /\bxp\b/i, /setTimeout/]) {
    assert.doesNotMatch(source, banned, String(banned));
  }
});

test("the stage takes its state as props, and reports the arrangement", () => {
  const source = code(STAGE);
  for (const prop of ["placed", "selectedId", "attemptId", "onSelect", "onAnswer", "accepting"]) {
    assert.match(source, new RegExp(`\\b${prop}\\b`), prop);
  }
  assert.match(source, /kind: "order", itemIds: \[\.\.\.placed, itemId\]/);
});

test("the stage knows nothing about any subject", () => {
  const source = code(STAGE).toLowerCase();
  for (const subject of ["math", "spell", "alphabet", "animal", "colour", "smallest"]) {
    assert.doesNotMatch(source, new RegExp(subject), subject);
  }
});

/* ------------------------------------------------------------- helpers --- */

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest],
    ),
  );
}
