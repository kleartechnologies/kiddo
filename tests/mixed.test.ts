import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { MIXED_PLAN, MIXED_ROUND } from "@/components/dev/mixedRound";
import { challengeKey } from "@/lib/content/challenges";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import { drawSession } from "@/lib/content/session";
import type { Challenge, ChallengeKind } from "@/lib/content/types";
import { validateChallenge } from "@/lib/content/validate";

/**
 * A round that changes what the child does partway through.
 *
 * Phase 3 asked for one thing to be proved — that a KIDDO round can hand a
 * child four different interactions in a sequence and get from each one to the
 * next — and the interesting part of the proof is how little there is of it.
 * `drawSession` deals the round below without being told anything about kinds,
 * because a slot has always named activities rather than engines;
 * `ChallengeStage` sends each board to the renderer its payload belongs to;
 * and no stage, hook or reducer was touched.
 *
 * So this file checks three things and refuses to check a fourth. It checks
 * that the round the page renders is the round the content layer actually
 * deals. It checks the router is a router — no state, no rules, no marking.
 * And it checks the page is not quietly becoming a game. What it does not
 * check is how any of it looks: that is `scripts/measure-mixed.mjs`, in a real
 * browser, at eight sizes.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The same file with its comments taken out.
 *
 * Every promise below is about what the code *does*, and a doc block that
 * explains why the router never marks an answer would otherwise read as the
 * router marking answers.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ROUTER = "src/components/games/engines/ChallengeStage.tsx";
const PAGE = "src/components/dev/MixedPlayground.tsx";

/**
 * What the child does, as the strip above the board names it, translated into
 * what the content layer calls it.
 *
 * The two disagree in exactly one place and it is worth the line: a matching
 * board is a `connect` in a different coat. `MatchStageProps` *is*
 * `ConnectStageProps`, and the reason is in `engine.ts` — the same answer,
 * given by a different gesture, is one kind.
 */
const KIND_OF: Record<string, ChallengeKind> = {
  choice: "choice",
  connect: "connect",
  order: "order",
  match: "connect",
};

/** Deal the round, repeatably. */
const deal = (seed?: number): Challenge[] =>
  drawSession(MIXED_PLAN, { rng: seed === undefined ? undefined : createRng(seed) });

test("the round the page shows is the round the content layer deals", () => {
  const round = deal();

  assert.equal(round.length, MIXED_ROUND.length, "a slot came back empty");

  round.forEach((challenge, index) => {
    const step = MIXED_ROUND[index];
    assert.equal(
      challenge.payload.kind,
      KIND_OF[step.label],
      `step ${index + 1} is labelled ${step.label} and deals a ${challenge.payload.kind}`,
    );
    assert.ok(
      step.from.some((id) => challenge.id.startsWith(id)),
      `step ${index + 1} says ${step.from.join(" or ")} and dealt ${challenge.id}`,
    );
  });
});

test("seven boards, four different things to do, and never the same twice running", () => {
  const round = deal();

  assert.equal(round.length, 7);
  assert.deepEqual(
    round.map((challenge) => challenge.payload.kind),
    ["choice", "connect", "order", "choice", "connect", "connect", "order"],
    "the sequence of answer shapes is not the one the round claims",
  );

  /* Four labels, because the fifth board and the sixth are the same kind and
     nothing like the same thing to do. Kinds are what an engine renders;
     what a child notices is the gesture. */
  assert.equal(new Set(MIXED_ROUND.map((step) => step.label)).size, 4);

  MIXED_ROUND.forEach((step, index) => {
    if (index === 0) return;
    assert.notEqual(
      step.label,
      MIXED_ROUND[index - 1].label,
      `steps ${index} and ${index + 1} are both ${step.label}`,
    );
  });
});

test("every board in the round is one an engine already exists for", () => {
  for (const seed of [undefined, 1, 7, 41, 500]) {
    for (const challenge of deal(seed)) {
      const problems = validateChallenge(challenge);
      assert.deepEqual(problems, [], `${challenge.id}: ${problems.join("; ")}`);

      assert.ok(
        challenge.payload.kind !== "match",
        `${challenge.id} is a match, and nothing renders a match`,
      );
    }
  }
});

test("the round asks for real activities, and asks each for what it can give", () => {
  for (const step of MIXED_ROUND) {
    for (const id of step.from) {
      const activity = getActivity(id);
      assert.ok(activity, `${id} is not in the registry`);
      assert.equal(
        activity.kind,
        KIND_OF[step.label],
        `${id} is a ${activity.kind} in a slot labelled ${step.label}`,
      );
      assert.ok(
        activity.levels?.includes(step.level) ?? true,
        `${id} does not offer level ${step.level}`,
      );
    }
  }
});

test("a new deal changes the boards and never the shape of the round", () => {
  const shape = deal().map((challenge) => challenge.payload.kind);
  const first = deal().map(challengeKey);
  let moved = 0;

  for (const seed of [1, 2, 3, 9, 40]) {
    const round = deal(seed);
    assert.deepEqual(
      round.map((challenge) => challenge.payload.kind),
      shape,
      `seed ${seed} dealt a different sequence of interactions`,
    );
    moved += round.filter((challenge, index) => challengeKey(challenge) !== first[index])
      .length;
  }

  /* Not "every board differs" — a level-one board drawn from a small pool
     will land on the same one sooner or later, and that is the content being
     small rather than the round being broken. */
  assert.ok(moved > 10, `only ${moved} boards changed across five deals`);
});

test("the router picks an engine and does nothing else", () => {
  const router = code(ROUTER);

  for (const rule of ["checkAnswer", "checkStep", "validateChallenge"]) {
    assert.ok(
      !router.includes(rule),
      `the router calls ${rule} — marking belongs in the content layer`,
    );
  }

  for (const state of ["useState", "useReducer", "useEffect", "useMemo"]) {
    assert.ok(
      !router.includes(state),
      `the router holds state with ${state} — the interaction hooks own that`,
    );
  }

  /* No layout either. A component that decides which of four components to
     render has no business having an opinion about padding. */
  assert.ok(!router.includes("className"), "the router draws something");
  assert.ok(!/<(div|section|ul|li)\b/.test(router), "the router draws something");
  assert.ok(!router.includes("motion."), "the router animates something");

  /* And no casts. The kinds narrow, or the union is wrong. */
  assert.ok(!/\bas\s+(Choice|Order|Connect|Match)/.test(router), "the router casts");
});

test("the router knows every kind that has a renderer, and no kind that hasn't", () => {
  const router = code(ROUTER);

  for (const stage of ["ChoiceStage", "OrderStage", "ConnectStage", "MatchStage"]) {
    assert.ok(router.includes(`<${stage} `), `the router never renders ${stage}`);
  }

  for (const kind of ["choice", "order", "connect"]) {
    assert.ok(
      router.includes(`=== "${kind}"`),
      `the router has no case for ${kind}`,
    );
  }

  /* The one that is deliberately missing. `match` is a real `ChallengeKind`
     with no engine behind it, so a match challenge must fail to compile rather
     than render as nothing. The day an engine exists, this line changes. */
  assert.ok(
    !router.includes(`=== "match"`),
    "the router branches on match — which engine did it find?",
  );
});

test("the mixed page uses the router, not the engines", () => {
  const page = code(PAGE);

  assert.ok(page.includes("<ChallengeStage"), "the page does not use the router");

  for (const stage of ["ChoiceStage", "OrderStage", "ConnectStage", "MatchStage"]) {
    assert.ok(
      !page.includes(`<${stage} `),
      `the page renders ${stage} itself — that is the router's decision`,
    );
  }

  /* The interaction hooks stay with the caller, which is the point: the router
     is not a game and this is what a game looks like around it. */
  for (const hook of ["useConnect", "useOrder"]) {
    assert.ok(page.includes(hook), `the page does not run ${hook}`);
  }
});

test("the mixed round is a reference page, not a game", () => {
  const games = read("src/data/games.ts");
  assert.ok(!games.includes("mixed"), "the mixed round is in the games catalogue");
  assert.ok(!games.includes("playground"), "a playground page is in the games catalogue");

  const page = code(PAGE);
  for (const forbidden of ["score", "lives", "streak", "coins", "leaderboard", "XP"]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(page),
      `the mixed round has a ${forbidden}`,
    );
  }
});

test("nothing in the round tells a child they got it wrong", () => {
  /* Sentences, not tokens. `"wrong"` is one of `ChoiceState`'s five words and
     is the name of a colour on a tile; what matters is what is put in front of
     a child, which is always more than one word long. */
  const said = [...code(PAGE).matchAll(/"([^"\n]{2,})"/g)]
    .map((match) => match[1])
    .filter((text) => text.includes(" "));

  for (const phrase of ["wrong", "incorrect", "failed", "you lost", "game over"]) {
    const bad = said.find((text) => new RegExp(`\\b${phrase}\\b`, "i").test(text));
    assert.ok(!bad, `the mixed round says "${bad}"`);
  }

  /* And the boards themselves say only what their own activity says. */
  for (const challenge of deal()) {
    const words = [challenge.prompt.speech, challenge.explanation, challenge.hint]
      .filter(Boolean)
      .join(" ");
    assert.ok(
      !/\b(wrong|incorrect|failed|lost|game over)\b/i.test(words),
      `${challenge.id} says something unkind: ${words}`,
    );
  }
});
