import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { challengeKey, checkAnswer, checkStep, drawChallenges } from "@/lib/content/challenges";
import { connectReferenceActivity } from "@/lib/content/reference/connect";
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
 * The Connect interaction engine, played without a browser.
 *
 * Three layers, tested where each one lives. The content layer is checked as
 * content: a board that cannot be finished, or that has two right answers, is
 * the kind of thing types cannot catch. The reducer is checked as rules, the
 * way `mathQuest.test.ts` checks a whole round with no React anywhere. And a
 * handful of the engine's decisions — real buttons, no canvas, no fixed pixel
 * board — are checked against the source, because they are exactly the sort of
 * thing that gets tidied away by someone who cannot see why they are there.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The same file with its comments taken out.
 *
 * Every promise below is about what the code *does*, and a doc block that
 * explains why there is no score in the engine would otherwise read as a score
 * in the engine. So the prose is removed before anything is asserted about it.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const STAGE = "src/components/games/engines/ConnectStage.tsx";

/** Draw one board, repeatably. */
function board(level: 1 | 2 | 3 = 2, seed = 3): ChallengeOf<"connect"> {
  const [drawn] = drawChallenges(connectReferenceActivity, {
    level,
    count: 1,
    rng: createRng(seed),
  });
  assert.ok(drawn && drawn.payload.kind === "connect", "expected a connect board");
  return drawn as ChallengeOf<"connect">;
}

/** Draw a lot, at every level, and keep what came out. */
function sample(seeds = 30): ChallengeOf<"connect">[] {
  const drawn: Challenge[] = [];
  for (const level of connectReferenceActivity.levels) {
    for (let seed = 0; seed < seeds; seed++) {
      drawn.push(
        ...drawChallenges(connectReferenceActivity, { level, count: 4, rng: createRng(seed) }),
      );
    }
  }
  return drawn as ChallengeOf<"connect">[];
}

const SAMPLE = sample();

function run(state: ConnectState, ...actions: ConnectAction[]): ConnectState {
  return actions.reduce(connectReducer, state);
}

/** Every right line on a board, in the order the content lists them. */
const rightLinks = (challenge: ChallengeOf<"connect">): readonly ConnectPair[] =>
  challenge.payload.pairs;

/** A line that joins two nodes that do not belong together. */
function wrongLink(challenge: ChallengeOf<"connect">): ConnectPair {
  const { pairs } = challenge.payload;
  const [first, second] = pairs;
  assert.ok(first && second, "a board needs two pairs to have a wrong line");
  return { leftId: first.leftId, rightId: second.rightId };
}

/** Play every right line, letting the feedback pass between each. */
function playThrough(challenge: ChallengeOf<"connect">): ConnectState {
  let state = freshConnectState(challenge);
  for (const link of rightLinks(challenge)) {
    state = run(state, { type: "connect", link }, { type: "retry" });
  }
  return state;
}

/* CONTENT ================================================================= */

/* 1 ---------------------------------------------------------------------- */
test("the reference activity is registered, and is not a game", () => {
  assert.ok(
    getActivity("discovery.animal-food"),
    "the reference connect activity should be in the registry",
  );
  assert.equal(connectReferenceActivity.kind, "connect");

  /* §13: it proves the engine, it does not ship as a Quest. If it ever
     appears on the home screen, that was not this pass. */
  assert.doesNotMatch(read("src/data/games.ts"), /animal-food/);
});

/* 2 ---------------------------------------------------------------------- */
test("every board it can deal validates", () => {
  assert.deepEqual(validateActivity(connectReferenceActivity, 40), []);
  for (const challenge of SAMPLE) {
    assert.deepEqual(validateChallenge(challenge), [], challenge.id);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("node ids are unique down each column", () => {
  for (const { payload, id } of SAMPLE) {
    const left = payload.left.map((node) => node.id);
    const right = payload.right.map((node) => node.id);
    assert.equal(new Set(left).size, left.length, `${id} repeats a left node`);
    assert.equal(new Set(right).size, right.length, `${id} repeats a right node`);
  }
});

/* 4 ---------------------------------------------------------------------- */
test("every pair names nodes that are on the board", () => {
  for (const { payload, id } of SAMPLE) {
    for (const pair of payload.pairs) {
      assert.ok(
        payload.left.some((node) => node.id === pair.leftId),
        `${id}: dangling left ${pair.leftId}`,
      );
      assert.ok(
        payload.right.some((node) => node.id === pair.rightId),
        `${id}: dangling right ${pair.rightId}`,
      );
    }
  }
});

/* 5 ---------------------------------------------------------------------- */
test("every node is in exactly one pair, so the board can always be finished", () => {
  for (const { payload, id } of SAMPLE) {
    assert.equal(payload.pairs.length, payload.left.length, `${id}: left/pair mismatch`);
    assert.equal(payload.pairs.length, payload.right.length, `${id}: right/pair mismatch`);

    const seen = new Set<string>();
    for (const pair of payload.pairs) {
      const key = `${pair.leftId}>${pair.rightId}`;
      assert.ok(!seen.has(key), `${id}: the same line twice`);
      seen.add(key);
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("the same seed deals the same board, every time", () => {
  for (const level of connectReferenceActivity.levels) {
    for (const seed of [0, 1, 7, 99]) {
      const once = drawChallenges(connectReferenceActivity, { level, count: 3, rng: createRng(seed) });
      const twice = drawChallenges(connectReferenceActivity, { level, count: 3, rng: createRng(seed) });
      assert.deepEqual(once.map(challengeKey), twice.map(challengeKey));
    }
  }
});

/* 7 ---------------------------------------------------------------------- */
test("different seeds can deal different boards", () => {
  const keys = new Set(
    [0, 1, 2, 3, 4, 5, 6, 7].map(
      (seed) =>
        challengeKey(
          drawChallenges(connectReferenceActivity, { level: 3, count: 1, rng: createRng(seed) })[0],
        ),
    ),
  );
  assert.ok(keys.size > 1, "eight seeds dealt the same board every time");
});

/* 8 ---------------------------------------------------------------------- */
test("no seed deals a board without a random source", () => {
  /* `drawChallenges` never reaches for `Math.random` itself, which is what
     lets a server render and a screenshot agree. */
  const a = drawChallenges(connectReferenceActivity, { level: 2, count: 2 });
  const b = drawChallenges(connectReferenceActivity, { level: 2, count: 2 });
  assert.deepEqual(a.map(challengeKey), b.map(challengeKey));
});

/* 9 ---------------------------------------------------------------------- */
test("exactly the intended lines are accepted", () => {
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
      `${challenge.id}: the whole board should mark as done`,
    );
  }
});

/* 10 --------------------------------------------------------------------- */
test("a line that is not intended is rejected, and half a board is not finished", () => {
  for (const challenge of SAMPLE) {
    assert.equal(
      checkStep(challenge, { kind: "connect", links: [wrongLink(challenge)] }),
      false,
      `${challenge.id} accepted a crossed line`,
    );
    /* Right so far, but not done: `checkStep` says yes and `checkAnswer` says
       no, which is the whole reason there are two of them. */
    const half = challenge.payload.pairs.slice(0, 1);
    assert.equal(checkStep(challenge, { kind: "connect", links: half }), true);
    assert.equal(checkAnswer(challenge, { kind: "connect", links: half }), false);
  }
});

/* 11 --------------------------------------------------------------------- */
test("the checking seam is generic, not per-kind", () => {
  /* §12: one seam, strongly typed answers, no `checkConnectAnswer`. */
  const source = code("src/lib/content/challenges.ts");
  assert.doesNotMatch(source, /checkConnectAnswer/);
  assert.match(source, /export function checkStep\(/);

  /* And it still answers for the kinds that were here first. */
  const challenge = board();
  assert.equal(checkAnswer(challenge, { kind: "choice", optionId: "dog" }), false);
  assert.equal(checkStep(challenge, { kind: "match", pairIds: ["dog"] }), false);
});

/* 12 --------------------------------------------------------------------- */
test("a board's key does not depend on the order the lines are listed in", () => {
  const challenge = board(3, 11);
  const reversed: ChallengeOf<"connect"> = {
    ...challenge,
    payload: { ...challenge.payload, pairs: [...challenge.payload.pairs].reverse() },
  };
  assert.equal(challengeKey(challenge), challengeKey(reversed));
});

/* REDUCER ================================================================= */

/* 13 --------------------------------------------------------------------- */
test("a fresh board has nothing chosen, nothing joined and nothing to say", () => {
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

/* 14 --------------------------------------------------------------------- */
test("choosing one node waits for a partner rather than answering", () => {
  const challenge = board();
  const left = challenge.payload.pairs[0].leftId;

  const state = run(freshConnectState(challenge), { type: "selectLeft", nodeId: left });
  assert.equal(state.selectedLeft, left);
  assert.deepEqual(state.connections, []);
  assert.equal(state.feedback, "idle");

  /* The same node again is a child changing their mind. */
  const undone = run(state, { type: "selectLeft", nodeId: left });
  assert.equal(undone.selectedLeft, null);
});

/* 15 --------------------------------------------------------------------- */
test("a board can be worked from either side", () => {
  const challenge = board();
  const { leftId, rightId } = challenge.payload.pairs[0];

  const rightFirst = run(
    freshConnectState(challenge),
    { type: "selectRight", nodeId: rightId },
    { type: "selectLeft", nodeId: leftId },
  );
  assert.deepEqual(rightFirst.connections, [{ leftId, rightId }]);
  assert.equal(rightFirst.feedback, "correct");
});

/* 16 --------------------------------------------------------------------- */
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

/* 17 --------------------------------------------------------------------- */
test("a right line is kept, and both its nodes leave play", () => {
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

/* 18 --------------------------------------------------------------------- */
test("a wrong line is drawn, then let go, and costs the child nothing", () => {
  const challenge = board();
  const wrong = wrongLink(challenge);

  const shown = run(freshConnectState(challenge), { type: "connect", link: wrong });
  assert.deepEqual(shown.attempt, wrong);
  assert.equal(shown.feedback, "retry");
  assert.deepEqual(shown.connections, [], "a wrong line is never kept");
  assert.equal(shown.completed, false);
  assert.equal(isConnectAccepting(shown), false, "the board waits while KIDDO speaks");

  const after = run(shown, { type: "retry" });
  assert.equal(after.attempt, null);
  assert.equal(after.feedback, "idle");
  assert.equal(isConnectAccepting(after), true);
  /* Nothing was taken away: the same nodes are still there to try again. */
  assert.deepEqual(after.challenge.payload.left, challenge.payload.left);
  assert.deepEqual(connectProgress(after), { current: 0, total: challenge.payload.pairs.length });
});

/* 19 --------------------------------------------------------------------- */
test("the same wrong line can be tried again straight away", () => {
  const challenge = board();
  const wrong = wrongLink(challenge);
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

/* 20 --------------------------------------------------------------------- */
test("a node that is already joined is out of play, from either end", () => {
  const challenge = board(3, 4);
  const [first, second] = challenge.payload.pairs;
  const joined = run(
    freshConnectState(challenge),
    { type: "connect", link: first },
    { type: "retry" },
  );

  /* Tapping it does nothing at all — no selection, no feedback, no nudge. */
  const tapped = run(joined, { type: "selectLeft", nodeId: first.leftId });
  assert.equal(tapped, joined);
  const tappedRight = run(joined, { type: "selectRight", nodeId: first.rightId });
  assert.equal(tappedRight, joined);

  /* And a line dragged out of it, or into it, is refused before it is judged. */
  const crossed = run(joined, {
    type: "connect",
    link: { leftId: first.leftId, rightId: second.rightId },
  });
  assert.equal(crossed, joined, "a joined node cannot be re-joined");
});

/* 21 --------------------------------------------------------------------- */
test("drawing the same right line twice cheers once", () => {
  const challenge = board();
  const link = challenge.payload.pairs[0];
  const once = run(freshConnectState(challenge), { type: "connect", link }, { type: "retry" });
  const twice = run(once, { type: "connect", link });
  assert.deepEqual(twice.connections, [link]);
  assert.equal(twice.feedback, "idle", "the second one fell on the floor");
});

/* 22 --------------------------------------------------------------------- */
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

/* 23 --------------------------------------------------------------------- */
test("nothing lands after the last line", () => {
  const challenge = board();
  const done = playThrough(challenge);
  const after = run(done, { type: "selectLeft", nodeId: challenge.payload.left[0].id });
  assert.equal(after, done);
});

/* 24 --------------------------------------------------------------------- */
test("rapid repeated taps while KIDDO is speaking fall on the floor", () => {
  const challenge = board(3, 12);
  const wrong = wrongLink(challenge);
  const hammered = run(
    freshConnectState(challenge),
    { type: "connect", link: wrong },
    /* Everything a four year old's finger can do in 800ms. */
    { type: "connect", link: challenge.payload.pairs[0] },
    { type: "connect", link: challenge.payload.pairs[1] },
    { type: "selectLeft", nodeId: challenge.payload.pairs[1].leftId },
    { type: "selectRight", nodeId: challenge.payload.pairs[1].rightId },
  );
  assert.deepEqual(hammered.connections, [], "a locked board accepted a line");
  assert.deepEqual(hammered.attempt, wrong, "and it stopped showing the first one");
  assert.equal(hammered.feedback, "retry");
});

/* 25 --------------------------------------------------------------------- */
test("a made-up node id changes nothing", () => {
  const challenge = board();
  const state = freshConnectState(challenge);
  assert.equal(run(state, { type: "selectLeft", nodeId: "unicorn" }), state);
  assert.equal(run(state, { type: "selectRight", nodeId: "unicorn" }), state);
  assert.equal(
    run(state, { type: "connect", link: { leftId: "unicorn", rightId: "rainbow" } }),
    state,
  );
});

/* 26 --------------------------------------------------------------------- */
test("reset puts the board back, and can be handed a new one", () => {
  const challenge = board();
  const played = playThrough(challenge);

  const again = run(played, { type: "reset" });
  assert.deepEqual(again, freshConnectState(challenge));

  const next = board(3, 21);
  const swapped = run(played, { type: "reset", challenge: next });
  assert.equal(swapped.challenge.id, next.id);
  assert.deepEqual(swapped.connections, []);
});

/* 27 --------------------------------------------------------------------- */
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

/* 28 --------------------------------------------------------------------- */
test("the engine holds no score, no lives and no clock", () => {
  const source = code("src/lib/games/engines/connect.ts");
  for (const forbidden of [/\bscore\b/i, /\blives\b/i, /\bstreak\b/i, /\bxp\b/i, /setTimeout/]) {
    assert.doesNotMatch(source, forbidden, `${forbidden} has no place in the rules`);
  }
  /* And it never marks anything itself. */
  assert.match(source, /checkStep/);
  assert.match(source, /checkAnswer/);
});

/* THE STAGE =============================================================== */

/* 29 --------------------------------------------------------------------- */
test("the nodes are real buttons, and the lines are not the interaction", () => {
  const source = code(STAGE);
  assert.match(source, /<motion\.button/, "a node must be a button");
  assert.match(source, /type="button"/);
  /* §9: the SVG is decoration over the top of the real controls. */
  assert.match(source, /<svg\s+[\s\S]*?aria-hidden/);
  assert.match(source, /pointer-events-none/);
});

/* 30 --------------------------------------------------------------------- */
test("there is no canvas anywhere near it", () => {
  const source = code(STAGE);
  assert.doesNotMatch(source, /<canvas/i);
  assert.doesNotMatch(source, /getContext/);
});

/* 31 --------------------------------------------------------------------- */
test("every node says what it is and what state it is in", () => {
  const source = code(STAGE);
  assert.match(source, /aria-label=\{srLabelOf\(/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /aria-disabled=/);
  /* Not colour alone: the state is in the words. */
  assert.match(source, /joined to/);
  assert.match(source, /not joined yet/);
});

/* 32 --------------------------------------------------------------------- */
test("a keyboard can play it", () => {
  const source = code(STAGE);
  /* A click with no pointer behind it is Enter or Space. */
  assert.match(source, /event\.detail !== 0/);
  /* And nothing takes the buttons out of the tab order. */
  assert.doesNotMatch(source, /tabIndex=\{-1\}/);
  assert.doesNotMatch(source, /[\s{]disabled=\{/, "a disabled button loses its focus ring");
});

/* 33 --------------------------------------------------------------------- */
test("the board has no fixed pixel size in it", () => {
  const source = code(STAGE);
  /* §8: nothing is `w-[420px]`, and the line ends are measured rather than
     assumed. A hardcoded board is one that breaks on a 360px phone. */
  assert.doesNotMatch(source, /\b[whx]-\[\d+px\]/);
  assert.doesNotMatch(source, /(width|height):\s*\d+px/);
  assert.match(source, /getBoundingClientRect/);
  assert.match(source, /ResizeObserver/);
});

/* 34 --------------------------------------------------------------------- */
test("a node is comfortably bigger than a fingertip", () => {
  const source = code(STAGE);
  /* 14 in the Tailwind scale is 3.5rem — 56px, the top of the 48–56px band,
     and 12 is 3rem — 48px, the floor, which only a short screen ever sees. */
  assert.match(source, /min-h-14/);
  assert.match(source, /min-h-12/);
  /* And the floor is only reached on a short screen — never on a narrow one,
     where there is height to spare and a smaller node would be a mistake. */
  assert.match(source, /\[@media\(max-height:44rem\)\]:min-h-12/);
});

/* 35 --------------------------------------------------------------------- */
test("drawing a line does not scroll the page", () => {
  const source = code(STAGE);
  assert.match(source, /touch-none/, "a finger drawing a line must not also pan");
  assert.match(source, /setPointerCapture/);
});

/* 36 --------------------------------------------------------------------- */
test("reduced motion is the global one, and it removes the drawing", () => {
  const source = code(STAGE);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /from "framer-motion"/, "no second animation system");
  /* The connection appears rather than travels. */
  assert.match(source, /reduced \? false : \{ pathLength: 0/);
  assert.match(source, /reduced \? \{ duration: 0 \}/);
});

/* 37 --------------------------------------------------------------------- */
test("the stage holds no game state", () => {
  const source = code(STAGE);
  /* §11: it is handed the game and holds only where things are on screen. */
  assert.doesNotMatch(source, /checkAnswer|checkStep/, "the stage never marks");
  assert.doesNotMatch(source, /useReducer/);
  for (const prop of ["connections", "selectedLeftId", "selectedRightId", "attempt"]) {
    assert.ok(source.includes(prop), `${prop} should arrive as a prop`);
  }
});

/* 38 --------------------------------------------------------------------- */
test("the stage knows nothing about any subject", () => {
  const source = code(STAGE);
  for (const word of [/\bmath/i, /\bspell/i, /\banimal/i, /\bcolour/i, /\bshape[s]?\b/i]) {
    assert.doesNotMatch(source, word, `${word} does not belong in an engine`);
  }
});

test("a Word World ribbon is a soft curve through the gutter, on a page with no ruled lines", () => {
  const stage = code(STAGE);
  /* The ribbon is pastel and thinner than a word, and it bends: it leaves a
     port sideways and arrives sideways, so it never cuts across a word. */
  const ribbon = stage.match(/ribbon:\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(ribbon, /--color-blossom-base/);
  assert.doesNotMatch(ribbon, /--color-blossom-deep/);
  assert.match(ribbon, /curved:\s*true/);
  assert.match(stage, /<motion\.path[\s\S]*?d=\{joinPath\(/);
  assert.match(stage, /strokeLinejoin="round"/);
  /* Every line is drawn in the board's own pixels, whatever a world zooms. */
  assert.match(stage, /origin\.width \/ board\.offsetWidth/);

  /* A joined pair has its ribbon and the existing check, and nothing else:
     the backdrop draws no dashed rule under a word. */
  const words = code("src/components/games/world/worlds/words.tsx");
  assert.doesNotMatch(words, /border-dashed|border-dotted/);
});

test("an untouched first board invites the choose-from side, once per visit", () => {
  /* Before the first interaction the board must already say "start here":
     the choose-from column wears the existing `invited` look — statically,
     no new animation — until the first selection of the visit, and never
     again after it. Both engines that draw a connect challenge make the
     same promise. */
  for (const path of [STAGE, "src/components/games/engines/MatchStage.tsx"]) {
    const source = code(path);
    /* A fact about the visit, not about one board: module state, written on
       the two input funnels and never during render. */
    assert.match(source, /^let has(?:Connected|Matched)Before = false;$/m, path);
    assert.match(
      source,
      /const untouched =\s*connections\.length === 0 &&\s*selectedLeftId === null &&\s*selectedRightId === null &&\s*attempt === null;/,
      path,
    );
    assert.match(
      source,
      /const welcoming = untouched && accepting && !has(?:Connected|Matched)Before;/,
      path,
    );
    /* Only the choose-from side is invited, through the same invited state
       the destinations already use — no tutorial, no overlay, no motion. */
    assert.match(source, /welcoming && (?:side|group) === "left"/, path);
    assert.doesNotMatch(source, /welcoming && (?:side|group) === "right"/, path);
  }
});
