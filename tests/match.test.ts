import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  challengeKey,
  checkAnswer,
  checkStep,
  drawChallenges,
} from "@/lib/content/challenges";
import { matchReferenceActivity } from "@/lib/content/reference/match";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Challenge, ChallengeOf, ConnectPair } from "@/lib/content/types";
import { validateActivity, validateChallenge } from "@/lib/content/validate";
import {
  connectProgress,
  connectReducer,
  connectedPartner,
  freshConnectState,
  isConnectAccepting,
  isConnectMatched,
  type ConnectAction,
  type ConnectState,
} from "@/lib/games/engines/connect";

/**
 * The Match board, played without a browser.
 *
 * ## Why this file talks about `connect`
 *
 * Because the board *is* a `connect` board. Pairing two cards and joining two
 * nodes are the same answer, and an answer shape is what a `ChallengeKind` is,
 * so `MatchStage` is a second renderer rather than a second kind — and a
 * second renderer gets the reducer, the hook and the marking that already
 * exist rather than copies of them.
 *
 * The `match` kind could not have held this board, and the last test in the
 * content section is the proof: its answer is `pairIds`, the pairs the child
 * *found*, so there is no way to say "the child put this with that" when this
 * and that were never a pair. A renderer built on it would have had to decide
 * the pairing was right before it could report it, which is the renderer
 * marking its own homework.
 *
 * Three layers, tested where each one lives: the content as content, the rules
 * as rules, and a handful of the stage's decisions against its source, because
 * they are exactly the sort of thing that gets tidied away by someone who
 * cannot see why they are there.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The same file with its comments taken out.
 *
 * Every promise below is about what the code *does*, and a doc block that
 * explains why there is no score in the board would otherwise read as a score
 * in the board.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const STAGE = "src/components/games/engines/MatchStage.tsx";

/** Draw one board, repeatably. */
function board(level: 1 | 2 | 3 = 2, seed = 3): ChallengeOf<"connect"> {
  const [drawn] = drawChallenges(matchReferenceActivity, {
    level,
    count: 1,
    rng: createRng(seed),
  });
  assert.ok(drawn && drawn.payload.kind === "connect", "expected a match board");
  return drawn as ChallengeOf<"connect">;
}

/** Draw a lot, at every level, and keep what came out. */
function sample(seeds = 30): ChallengeOf<"connect">[] {
  const drawn: Challenge[] = [];
  for (const level of matchReferenceActivity.levels) {
    for (let seed = 0; seed < seeds; seed++) {
      drawn.push(
        ...drawChallenges(matchReferenceActivity, { level, count: 4, rng: createRng(seed) }),
      );
    }
  }
  return drawn as ChallengeOf<"connect">[];
}

const SAMPLE = sample();

function run(state: ConnectState, ...actions: ConnectAction[]): ConnectState {
  return actions.reduce(connectReducer, state);
}

/** A pairing of two cards that do not belong together. */
function wrongPair(challenge: ChallengeOf<"connect">): ConnectPair {
  const [first, second] = challenge.payload.pairs;
  assert.ok(first && second, "a board needs two pairs to have a wrong one");
  return { leftId: first.leftId, rightId: second.rightId };
}

/** Find every pair, letting the feedback pass between each. */
function playThrough(challenge: ChallengeOf<"connect">): ConnectState {
  let state = freshConnectState(challenge);
  for (const link of challenge.payload.pairs) {
    state = run(state, { type: "connect", link }, { type: "retry" });
  }
  return state;
}

/* CONTENT ================================================================= */

/* 1 ---------------------------------------------------------------------- */
test("the reference activity is registered, and is not a game", () => {
  assert.ok(
    getActivity("discovery.animal-babies"),
    "the reference match activity should be in the registry",
  );
  /* The two axes: `matching` is what is being learned, `connect` is how it is
     answered, and only the second one an engine ever reads. */
  assert.equal(matchReferenceActivity.activityType, "matching");
  assert.equal(matchReferenceActivity.kind, "connect");

  /* It proves the board, it does not ship as a Quest. */
  assert.doesNotMatch(read("src/data/games.ts"), /animal-babies/);
});

/* 2 ---------------------------------------------------------------------- */
test("every board it can deal validates", () => {
  assert.deepEqual(validateActivity(matchReferenceActivity, 40), []);
  for (const challenge of SAMPLE) {
    assert.deepEqual(validateChallenge(challenge), [], challenge.id);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a board holds the number of pairs its level asked for", () => {
  const wanted: Record<number, number> = { 1: 3, 2: 4, 3: 5 };
  for (const challenge of SAMPLE) {
    assert.equal(
      challenge.payload.pairs.length,
      wanted[challenge.level],
      `${challenge.id}: level ${challenge.level}`,
    );
  }
});

/* 4 ---------------------------------------------------------------------- */
test("card ids are unique in each group", () => {
  for (const { payload, id } of SAMPLE) {
    const left = payload.left.map((node) => node.id);
    const right = payload.right.map((node) => node.id);
    assert.equal(new Set(left).size, left.length, `${id} repeats a card`);
    assert.equal(new Set(right).size, right.length, `${id} repeats a card`);
  }
});

/* 5 ---------------------------------------------------------------------- */
test("every pair names cards that are on the board", () => {
  for (const { payload, id } of SAMPLE) {
    for (const pair of payload.pairs) {
      assert.ok(
        payload.left.some((node) => node.id === pair.leftId),
        `${id}: dangling ${pair.leftId}`,
      );
      assert.ok(
        payload.right.some((node) => node.id === pair.rightId),
        `${id}: dangling ${pair.rightId}`,
      );
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("every card is in exactly one pair, so the board can always be finished", () => {
  for (const { payload, id } of SAMPLE) {
    assert.equal(payload.pairs.length, payload.left.length, `${id}: spare card`);
    assert.equal(payload.pairs.length, payload.right.length, `${id}: spare card`);

    const usedLeft = new Set(payload.pairs.map((pair) => pair.leftId));
    const usedRight = new Set(payload.pairs.map((pair) => pair.rightId));
    assert.equal(usedLeft.size, payload.pairs.length, `${id}: a card in two pairs`);
    assert.equal(usedRight.size, payload.pairs.length, `${id}: a card in two pairs`);
  }
});

/* 7 ---------------------------------------------------------------------- */
test("there is exactly one way to finish a board", () => {
  /* Every card belongs to one pair and every pair is authored, so the set of
     pairings that `checkAnswer` accepts has one member. Checked by trying
     every other pairing of the same cards there is. */
  for (const challenge of [board(1, 5), board(2, 9), board(3, 14)]) {
    const { pairs } = challenge.payload;
    let accepted = 0;
    for (const left of challenge.payload.left) {
      for (const right of challenge.payload.right) {
        if (checkStep(challenge, { kind: "connect", links: [{ leftId: left.id, rightId: right.id }] })) {
          accepted++;
        }
      }
    }
    assert.equal(
      accepted,
      pairs.length,
      `${challenge.id}: ${accepted} pairings accepted for ${pairs.length} pairs`,
    );
  }
});

/* 8 ---------------------------------------------------------------------- */
test("the same seed deals the same board, every time", () => {
  for (const level of matchReferenceActivity.levels) {
    for (const seed of [0, 1, 7, 99]) {
      const once = drawChallenges(matchReferenceActivity, { level, count: 3, rng: createRng(seed) });
      const twice = drawChallenges(matchReferenceActivity, { level, count: 3, rng: createRng(seed) });
      assert.deepEqual(once.map(challengeKey), twice.map(challengeKey));
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("different seeds can deal different boards", () => {
  const keys = new Set(
    [0, 1, 2, 3, 4, 5, 6, 7].map((seed) =>
      challengeKey(
        drawChallenges(matchReferenceActivity, { level: 3, count: 1, rng: createRng(seed) })[0],
      ),
    ),
  );
  assert.ok(keys.size > 1, "eight seeds dealt the same board every time");
});

/* 10 --------------------------------------------------------------------- */
test("no seed deals a board without a random source", () => {
  const a = drawChallenges(matchReferenceActivity, { level: 2, count: 2 });
  const b = drawChallenges(matchReferenceActivity, { level: 2, count: 2 });
  assert.deepEqual(a.map(challengeKey), b.map(challengeKey));
});

/* 11 --------------------------------------------------------------------- */
test("the two groups are not dealt in step", () => {
  /* Shuffled together, a board could be solved by position alone — first card
     with first card — without ever looking at what is on them. */
  let differed = 0;
  for (const { payload } of SAMPLE) {
    const inStep = payload.pairs.every(
      (pair, index) =>
        payload.left[index]?.id === pair.leftId &&
        payload.right[index]?.id === pair.rightId,
    );
    if (!inStep) differed++;
  }
  assert.ok(differed > SAMPLE.length * 0.5, "the groups are dealt in lockstep");
});

/* 12 --------------------------------------------------------------------- */
test("exactly the intended pairs are accepted", () => {
  for (const challenge of SAMPLE) {
    for (const pair of challenge.payload.pairs) {
      assert.equal(
        checkStep(challenge, { kind: "connect", links: [pair] }),
        true,
        `${challenge.id}: ${pair.leftId}>${pair.rightId} should be right`,
      );
    }
    assert.equal(
      checkAnswer(challenge, { kind: "connect", links: challenge.payload.pairs }),
      true,
    );
  }
});

/* 13 --------------------------------------------------------------------- */
test("a wrong pair is rejected, and a half-finished board is not finished", () => {
  for (const challenge of SAMPLE) {
    assert.equal(
      checkStep(challenge, { kind: "connect", links: [wrongPair(challenge)] }),
      false,
      `${challenge.id} accepted a wrong pair`,
    );
    const half = challenge.payload.pairs.slice(0, 1);
    assert.equal(checkStep(challenge, { kind: "connect", links: half }), true);
    assert.equal(checkAnswer(challenge, { kind: "connect", links: half }), false);
  }
});

/* 14 --------------------------------------------------------------------- */
test("the order the pairs were found in does not change the answer", () => {
  const challenge = board(3, 17);
  const forwards = challenge.payload.pairs;
  const backwards = [...forwards].reverse();
  assert.equal(checkAnswer(challenge, { kind: "connect", links: forwards }), true);
  assert.equal(checkAnswer(challenge, { kind: "connect", links: backwards }), true);
});

/* 15 --------------------------------------------------------------------- */
test("made-up card ids are rejected, and so is an answer of the wrong kind", () => {
  const challenge = board();
  assert.equal(
    checkStep(challenge, { kind: "connect", links: [{ leftId: "unicorn", rightId: "rainbow" }] }),
    false,
  );
  /* A `match` answer against this board is not a near miss — it is a different
     question, and the seam says so rather than guessing. */
  assert.equal(checkStep(challenge, { kind: "match", pairIds: ["dog"] }), false);
  assert.equal(checkAnswer(challenge, { kind: "choice", optionId: "dog" }), false);
});

/* 16 --------------------------------------------------------------------- */
test("a board's key does not depend on the order the pairs are listed in", () => {
  const challenge = board(3, 11);
  const reversed: ChallengeOf<"connect"> = {
    ...challenge,
    payload: { ...challenge.payload, pairs: [...challenge.payload.pairs].reverse() },
  };
  assert.equal(challengeKey(challenge), challengeKey(reversed));
});

/* 17 --------------------------------------------------------------------- */
test("the `match` kind could not have held this board", () => {
  /* The whole reason `MatchStage` renders `connect`. A `match` answer is the
     pairs that were *found*, so a wrong pairing has no id and cannot be said
     at all — and `checkStep` for `match` asks only whether the ids are real
     and unrepeated, which any list of authored ids passes. */
  const source = code("src/lib/content/challenges.ts");
  assert.match(source, /case "match":/);

  const pretend = {
    ...board(),
    payload: {
      kind: "match" as const,
      pairs: [
        { id: "a", left: { kind: "text" as const, text: "A" }, right: { kind: "text" as const, text: "B" } },
        { id: "b", left: { kind: "text" as const, text: "C" }, right: { kind: "text" as const, text: "D" } },
      ],
    },
  };
  /* Naming a pair is enough. There is no wrong answer to give. */
  assert.equal(checkStep(pretend, { kind: "match", pairIds: ["a"] }), true);
  assert.equal(checkStep(pretend, { kind: "match", pairIds: ["b"] }), true);
  assert.equal(checkStep(pretend, { kind: "match", pairIds: ["a", "b"] }), true);
  assert.equal(checkAnswer(pretend, { kind: "match", pairIds: ["a", "b"] }), true);
});

/* THE RULES =============================================================== */

/* 18 --------------------------------------------------------------------- */
test("a fresh board has nothing chosen, nothing paired and nothing to say", () => {
  const state = freshConnectState(board());
  assert.equal(state.selectedLeft, null);
  assert.equal(state.selectedRight, null);
  assert.deepEqual(state.connections, []);
  assert.equal(state.attempt, null);
  assert.equal(state.feedback, "idle");
  assert.equal(state.completed, false);
  assert.equal(isConnectAccepting(state), true);
  assert.deepEqual(connectProgress(state), {
    current: 0,
    total: state.challenge.payload.pairs.length,
  });
});

/* 19 --------------------------------------------------------------------- */
test("choosing one card waits for its partner rather than answering", () => {
  const challenge = board();
  const first = challenge.payload.pairs[0].leftId;

  const state = run(freshConnectState(challenge), { type: "selectLeft", nodeId: first });
  assert.equal(state.selectedLeft, first);
  assert.deepEqual(state.connections, []);
  assert.equal(state.feedback, "idle");

  /* The same card again is a child changing their mind, not a mistake. */
  assert.equal(run(state, { type: "selectLeft", nodeId: first }).selectedLeft, null);
});

/* 20 --------------------------------------------------------------------- */
test("a board can be worked from either group", () => {
  const challenge = board();
  const { leftId, rightId } = challenge.payload.pairs[0];

  const secondFirst = run(
    freshConnectState(challenge),
    { type: "selectRight", nodeId: rightId },
    { type: "selectLeft", nodeId: leftId },
  );
  assert.deepEqual(secondFirst.connections, [{ leftId, rightId }]);
  assert.equal(secondFirst.feedback, "correct");
});

/* 21 --------------------------------------------------------------------- */
test("tap-tap and drag end in the same state", () => {
  const challenge = board();
  const link = challenge.payload.pairs[0];

  const tapped = run(
    freshConnectState(challenge),
    { type: "selectLeft", nodeId: link.leftId },
    { type: "selectRight", nodeId: link.rightId },
  );
  const dragged = run(freshConnectState(challenge), { type: "connect", link });

  assert.deepEqual(tapped.connections, dragged.connections);
  assert.equal(tapped.feedback, dragged.feedback);
  assert.equal(tapped.completed, dragged.completed);
  assert.equal(tapped.selectedLeft, null);
  assert.equal(dragged.selectedLeft, null);
});

/* 22 --------------------------------------------------------------------- */
test("a right pair is kept, and both its cards leave play", () => {
  const challenge = board();
  const link = challenge.payload.pairs[0];
  const state = run(freshConnectState(challenge), { type: "connect", link });

  assert.deepEqual(state.connections, [link]);
  assert.equal(state.feedback, "correct");
  assert.equal(isConnectMatched(state, "left", link.leftId), true);
  assert.equal(isConnectMatched(state, "right", link.rightId), true);
  assert.equal(connectedPartner(state, "left", link.leftId), link.rightId);
  assert.equal(connectedPartner(state, "right", link.rightId), link.leftId);
});

/* 23 --------------------------------------------------------------------- */
test("a wrong pair is shown, then let go, and costs the child nothing", () => {
  const challenge = board();
  const wrong = wrongPair(challenge);

  const shown = run(freshConnectState(challenge), { type: "connect", link: wrong });
  assert.deepEqual(shown.attempt, wrong);
  assert.equal(shown.feedback, "retry");
  assert.deepEqual(shown.connections, [], "a wrong pair is never kept");
  assert.equal(shown.completed, false);
  assert.equal(isConnectAccepting(shown), false, "the board waits while KIDDO speaks");

  const after = run(shown, { type: "retry" });
  assert.equal(after.attempt, null);
  assert.equal(after.feedback, "idle");
  assert.equal(isConnectAccepting(after), true);
  /* Nothing was taken away: the same cards are still there to try again. */
  assert.deepEqual(after.challenge.payload.left, challenge.payload.left);
  assert.deepEqual(after.challenge.payload.right, challenge.payload.right);
  assert.deepEqual(connectProgress(after), {
    current: 0,
    total: challenge.payload.pairs.length,
  });
});

/* 24 --------------------------------------------------------------------- */
test("the same wrong pair can be tried again straight away", () => {
  const challenge = board();
  const wrong = wrongPair(challenge);
  const twice = run(
    freshConnectState(challenge),
    { type: "connect", link: wrong },
    { type: "retry" },
    { type: "connect", link: wrong },
    { type: "retry" },
    { type: "connect", link: challenge.payload.pairs[0] },
  );
  assert.deepEqual(twice.connections, [challenge.payload.pairs[0]]);
});

/* 25 --------------------------------------------------------------------- */
test("a card that is already paired cannot be paired again", () => {
  const challenge = board(3, 4);
  const [first, second] = challenge.payload.pairs;
  const paired = run(
    freshConnectState(challenge),
    { type: "connect", link: first },
    { type: "retry" },
  );

  assert.equal(run(paired, { type: "selectLeft", nodeId: first.leftId }), paired);
  assert.equal(run(paired, { type: "selectRight", nodeId: first.rightId }), paired);
  assert.equal(
    run(paired, { type: "connect", link: { leftId: first.leftId, rightId: second.rightId } }),
    paired,
    "a paired card cannot be re-paired",
  );
});

/* 26 --------------------------------------------------------------------- */
test("finding the same pair twice cheers once", () => {
  const challenge = board();
  const link = challenge.payload.pairs[0];
  const once = run(freshConnectState(challenge), { type: "connect", link }, { type: "retry" });
  const twice = run(once, { type: "connect", link });
  assert.deepEqual(twice.connections, [link]);
  assert.equal(twice.feedback, "idle", "the second one fell on the floor");
});

/* 27 --------------------------------------------------------------------- */
test("a board is finished when the content layer says it is", () => {
  for (const challenge of [board(1, 2), board(2, 6), board(3, 8)]) {
    const done = playThrough(challenge);
    assert.equal(done.connections.length, challenge.payload.pairs.length);
    assert.equal(done.completed, true);
    assert.equal(isConnectAccepting(done), false, "a finished board stops listening");
    assert.deepEqual(connectProgress(done), {
      current: challenge.payload.pairs.length,
      total: challenge.payload.pairs.length,
    });
  }
});

/* 28 --------------------------------------------------------------------- */
test("nothing lands after the last pair", () => {
  const challenge = board();
  const done = playThrough(challenge);
  assert.equal(run(done, { type: "selectLeft", nodeId: challenge.payload.left[0].id }), done);
  assert.equal(run(done, { type: "connect", link: challenge.payload.pairs[0] }), done);
});

/* 29 --------------------------------------------------------------------- */
test("rapid taps while KIDDO is speaking fall on the floor", () => {
  const challenge = board(3, 12);
  const wrong = wrongPair(challenge);
  const hammered = run(
    freshConnectState(challenge),
    { type: "connect", link: wrong },
    /* Everything a four year old's finger can do in 800ms. */
    { type: "connect", link: challenge.payload.pairs[0] },
    { type: "connect", link: challenge.payload.pairs[1] },
    { type: "selectLeft", nodeId: challenge.payload.pairs[1].leftId },
    { type: "selectRight", nodeId: challenge.payload.pairs[1].rightId },
  );
  assert.deepEqual(hammered.connections, [], "a locked board accepted a pair");
  assert.deepEqual(hammered.attempt, wrong);
  assert.equal(hammered.feedback, "retry");
});

/* 30 --------------------------------------------------------------------- */
test("reset puts the board back, and can be handed a new one", () => {
  const challenge = board();
  const played = playThrough(challenge);

  assert.deepEqual(run(played, { type: "reset" }), freshConnectState(challenge));

  const next = board(3, 21);
  const swapped = run(played, { type: "reset", challenge: next });
  assert.equal(swapped.challenge.id, next.id);
  assert.deepEqual(swapped.connections, []);
});

/* 31 --------------------------------------------------------------------- */
test("the reducer is pure: it never edits the state it was handed", () => {
  const challenge = board();
  const before = freshConnectState(challenge);
  const snapshot = JSON.stringify(before);
  run(
    before,
    { type: "selectLeft", nodeId: challenge.payload.pairs[0].leftId },
    { type: "connect", link: challenge.payload.pairs[0] },
    { type: "retry" },
  );
  assert.equal(JSON.stringify(before), snapshot);
});

/* THE BOARD =============================================================== */

/* 32 --------------------------------------------------------------------- */
test("there is one set of rules, not two", () => {
  /* The point of the whole decision: no `match` reducer, no `useMatch`, no
     second copy of what a pairing means. */
  const source = code(STAGE);
  assert.match(source, /ConnectStageProps/, "the two boards take the same props");
  assert.match(
    code("src/components/dev/MatchPlayground.tsx"),
    /useConnect/,
    "the board runs on the reducer that already exists",
  );
  for (const orphan of [
    "src/lib/games/engines/match.ts",
    "src/lib/games/engines/useMatch.ts",
  ]) {
    assert.throws(() => read(orphan), `${orphan} would be a second set of rules`);
  }
});

/* 33 --------------------------------------------------------------------- */
test("the cards are real buttons, and there is no canvas anywhere near them", () => {
  const source = code(STAGE);
  assert.match(source, /<motion\.button/, "a card must be a button");
  assert.match(source, /type="button"/);
  assert.doesNotMatch(source, /<canvas/i);
  assert.doesNotMatch(source, /getContext/);
});

/* 34 --------------------------------------------------------------------- */
test("every card says what it is and what state it is in", () => {
  const source = code(STAGE);
  assert.match(source, /aria-label=\{srLabelOf\(/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /aria-disabled=/);
  /* Not colour alone, and not position alone: the state is in the words. */
  assert.match(source, /not matched yet/);
  assert.match(source, /matched with/);
  assert.match(source, /Choose the item that matches it/);
  /* The board itself is named, and what happens is announced. */
  assert.match(source, /role="group"/);
  assert.match(source, /aria-live="polite"/);
});

/* 35 --------------------------------------------------------------------- */
test("a keyboard can play it", () => {
  const source = code(STAGE);
  /* A click with no pointer behind it is Enter or Space. */
  assert.match(source, /event\.detail !== 0/);
  /* And nothing takes the cards out of the tab order. */
  assert.doesNotMatch(source, /tabIndex=\{-1\}/);
  assert.doesNotMatch(source, /[\s{]disabled=\{/, "a disabled button loses its focus ring");
});

/* 36 --------------------------------------------------------------------- */
test("a found pair keeps the same button, so focus is never dropped", () => {
  /* The cards are reordered inside one list with their keys unchanged, rather
     than moved to a "found" list somewhere else. React moves the DOM node; a
     child who pressed Enter is still standing on it afterwards. */
  const source = code(STAGE);
  assert.match(source, /key=\{node\.id\}/);
  assert.doesNotMatch(source, /key=\{`?\$\{?node\.id\}?[^}]*matched/);
});

/* 37 --------------------------------------------------------------------- */
test("the board has no fixed pixel size in it", () => {
  const source = code(STAGE);
  assert.doesNotMatch(source, /\b[whx]-\[\d+px\]/);
  assert.doesNotMatch(source, /(width|height):\s*\d+px/);
  /* The grid is as many equal fractions as there are cards — the browser
     decides what a fraction is worth at 360px and at 1440. */
  assert.match(source, /minmax\(0, 1fr\)/);
});

/* 38 --------------------------------------------------------------------- */
test("a card is comfortably bigger than a fingertip", () => {
  const source = code(STAGE);
  /* 14 in the Tailwind scale is 3.5rem — 56px — and 12 is 3rem, the 48px
     floor, which only a short screen ever sees. */
  assert.match(source, /min-h-14/);
  assert.match(source, /\[@media\(max-height:44rem\)\]:min-h-12/);
});

/* 39 --------------------------------------------------------------------- */
test("carrying a card does not scroll the page", () => {
  const source = code(STAGE);
  assert.match(source, /touch-none/);
  assert.match(source, /setPointerCapture/);
  /* Drag is an input, not a mechanic: it ends in the same place a tap does. */
  assert.match(source, /elementFromPoint/);
});

/* 40 --------------------------------------------------------------------- */
test("every movement is gated on reduced motion, hover included", () => {
  const source = code(STAGE);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /from "framer-motion"/, "no second animation system");
  /* Measured in a browser once already, on the Order board: an ungated
     `whileHover` still lifted a chosen tile under a resting pointer. The
     gate is a zeroed distance, not a removed prop: a gesture prop's
     presence reaches the server HTML (the press gesture stamps
     `tabindex="0"` there), and `useReducedMotion` is `false` on the
     server, so a prop that vanishes on the client is a hydration
     mismatch — measured as a console error on the reduced-motion pass of
     `measure-visual.mjs`. */
  for (const gesture of [/whileHover=\{[^}]*\}/, /whileTap=\{[^}]*\}/]) {
    const found = source.match(new RegExp(gesture, "g")) ?? [];
    assert.ok(found.length > 0, "the cards respond to a pointer at all");
    for (const prop of found) assert.match(prop, /reduced \? 0/);
  }
  /* The settling is a layout animation, and it is turned off too. */
  assert.match(source, /layout=\{reduced \? false/);
  assert.match(source, /transition=\{reduced \? \{ duration: 0 \}/);
  /* And the lift a chosen card rests at is gone as well — the border, the
     colour and `aria-pressed` were already saying it. */
  assert.match(source, /selected && !reduced/);
});

/* 40a --------------------------------------------------------------------- */
test("where a card rests is layout, not a transform", () => {
  /* Measured in a browser: an animated `y` and a `layout` animation fight
     over the same matrix, and a card came away carrying a 24px offset that
     never came back when the speech bubble above the board changed height.
     Resting position is `top`; transforms are for gestures only. */
  const source = code(STAGE);
  assert.doesNotMatch(source, /animate=\{\{[^}]*\by:/);
  assert.match(source, /"top-1"/);
  assert.match(source, /"-top-1"/);
});

/* 41 --------------------------------------------------------------------- */
test("the board holds no game state, and no score, lives or clock", () => {
  const source = code(STAGE);
  assert.doesNotMatch(source, /checkAnswer|checkStep/, "the board never marks");
  assert.doesNotMatch(source, /useReducer/);
  for (const forbidden of [
    /\bscore\b/i,
    /\blives\b/i,
    /\bstreak\b/i,
    /\bxp\b/i,
    /\btimer\b/i,
    /setTimeout/,
  ]) {
    assert.doesNotMatch(source, forbidden, `${forbidden} has no place in a board`);
  }
  for (const prop of ["connections", "selectedLeftId", "selectedRightId", "attempt"]) {
    assert.ok(source.includes(prop), `${prop} should arrive as a prop`);
  }
});

/* 42 --------------------------------------------------------------------- */
test("the board knows nothing about any subject", () => {
  const source = code(STAGE);
  /* A whole word, and not the one with a dot after it: this file is full of
     `matched` and `matches`, which are what the board *is*, and `Math.max`,
     which is arithmetic rather than a subject. */
  for (const word of [
    /\bmaths?\b(?!\.)/i,
    /\bspell/i,
    /\banimal/i,
    /\bcolour/i,
    /\bshape[s]?\b/i,
  ]) {
    assert.doesNotMatch(source, word, `${word} does not belong in an engine`);
  }
});

/* 43 --------------------------------------------------------------------- */
test("it does not look like ConnectStage", () => {
  const source = code(STAGE);
  /* The one thing that must not be copied: there are no lines, so there is
     nothing to clip, nothing to measure and no coordinate space. */
  assert.doesNotMatch(source, /<svg/);
  assert.doesNotMatch(source, /<line/);
  assert.doesNotMatch(source, /ResizeObserver/);
  assert.doesNotMatch(source, /getBoundingClientRect/);
});
