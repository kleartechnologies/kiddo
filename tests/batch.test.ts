import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { BATCH_PLAN, BATCH_ROUND } from "@/components/dev/batchRound";
import { challengeKey, conceptKey } from "@/lib/content/challenges";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import { drawSession } from "@/lib/content/session";
import type { Challenge, ChallengeKind } from "@/lib/content/types";
import { validateChallenge } from "@/lib/content/validate";

/**
 * The twenty activities of this batch, dealt as one round.
 *
 * This file checks one claim and nothing else: that the new content is
 * registered well enough to be dealt alongside everything else, by the session
 * layer that already existed, into the engines that already existed. It is the
 * cheap half of the proof — the other half is `/playground/batch` in a real
 * browser at six sizes, which is where anything about *looks* is decided.
 *
 * Nothing here is a new capability. `drawSession` is told twenty activity ids
 * and a level each; no slot mentions a kind, no engine was touched, and no
 * Quest was changed to make the round possible.
 */

const KIND_OF: Record<string, ChallengeKind> = {
  choice: "choice",
  connect: "connect",
  order: "order",
  /* A matching board is a connect in a different coat — same answer, different
     gesture. `ChallengeStage` picks the engine from `look`. */
  match: "connect",
};

const deal = (seed?: number): Challenge[] =>
  drawSession(BATCH_PLAN, { rng: seed === undefined ? undefined : createRng(seed) });

test("the batch round deals the sequence it claims", () => {
  const round = deal();

  assert.equal(round.length, BATCH_ROUND.length, "a slot came back empty");
  assert.deepEqual(
    round.map((challenge) => challenge.payload.kind),
    [
      "choice", "connect", "order",
      "choice", "connect", "order",
      "choice", "connect", "order", "choice", "choice",
      "connect", "connect",
      "connect", "connect", "order", "order",
      "connect", "connect", "connect",
    ],
    "the sequence of answer shapes is not the one the round claims",
  );

  round.forEach((challenge, index) => {
    const step = BATCH_ROUND[index];
    assert.equal(
      challenge.payload.kind,
      KIND_OF[step.label],
      `step ${index + 1} is labelled ${step.label} and dealt a ${challenge.payload.kind}`,
    );
    assert.ok(
      step.from.some((id) => challenge.id.startsWith(id)),
      `step ${index + 1} says ${step.from.join(" or ")} and dealt ${challenge.id}`,
    );
  });
});

test("the round names all twenty new activities and only real ones", () => {
  const named = new Set(BATCH_ROUND.flatMap((step) => step.from));

  assert.deepEqual(
    [...named].sort(),
    [
      "english.ending-sounds",
      "english.opposites",
      "english.plurals",
      "english.sound-partners",
      "english.word-build",
      "general-knowledge.body-partners",
      "general-knowledge.day-order",
      "general-knowledge.helper-partners",
      "general-knowledge.life-cycles",
      "logic.group-partners",
      "logic.pair-partners",
      "match.opposite-partners",
      "match.quantity-partners",
      "match.sound-partners",
      "math.before-and-after",
      "math.quantity-order",
      "math.sum-partners",
      "shapes.shape-objects",
      "shapes.shape-partners",
      "shapes.size-order",
    ],
    "the round does not exercise exactly the twenty activities this batch added",
  );

  for (const step of BATCH_ROUND) {
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

test("every board in the round is one an engine already exists for", () => {
  for (const seed of [undefined, 2, 11, 97, 404]) {
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

  assert.ok(moved > 60, `only ${moved} boards changed across five deals`);
});

test("one deal does not teach the same concept twice", () => {
  /* No activity appears twice in this round, so a repeated concept could only
     come from two activities that read the same table — `shape-objects` and
     `shape-partners` do, and so do `english.opposites` and
     `match.opposite-partners`. A round that asked the same question twice
     would be a round with eighteen boards pretending to be twenty. */
  for (const seed of [undefined, 5, 23, 88]) {
    const concepts = deal(seed).map(conceptKey);
    assert.equal(
      new Set(concepts).size,
      concepts.length,
      `a deal repeated a concept: ${concepts.join(", ")}`,
    );
  }
});

test("the batch round is a reference page, not a game", () => {
  const games = readFileSync(new URL("../src/data/games.ts", import.meta.url), "utf8");
  assert.ok(!games.includes("batch"), "the batch round is in the games catalogue");
  assert.ok(!games.includes("playground"), "a playground page is in the games catalogue");
});

test("nothing in the round tells a child they got it wrong", () => {
  for (const seed of [undefined, 3, 31]) {
    for (const challenge of deal(seed)) {
      const words = [challenge.prompt.speech, challenge.explanation, challenge.hint]
        .filter(Boolean)
        .join(" ");
      assert.ok(
        !/\b(wrong|incorrect|failed|lost|game over|quick|fast|hurry|timer)\b/i.test(words),
        `${challenge.id} says something unkind or hurried: ${words}`,
      );
    }
  }
});
