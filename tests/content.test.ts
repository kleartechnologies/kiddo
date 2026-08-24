import assert from "node:assert/strict";
import { test } from "node:test";

import {
  challengeKey,
  checkAnswer,
  checkStep,
  conceptKey,
  drawChallenges,
} from "@/lib/content/challenges";
import { LEVELS } from "@/lib/content/difficulty";
import { MATH_ACTIVITIES, MATH_PACK } from "@/lib/content/packs/math";
import { NUMBER_RUNS } from "@/lib/content/packs/math/numberOrder";
import { CONTENT_REGISTRY, getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Activity, ActivityType, Challenge } from "@/lib/content/types";
import { validatePack } from "@/lib/content/validate";

/**
 * The Math content pack, checked as content rather than as code.
 *
 * These are the questions a four year old will actually be asked, so the
 * things worth asserting are the things that would make one of them unfair:
 * two right answers, no right answer, a distractor nobody would ever pick, or
 * the same sum twice in one round.
 */

/** Draw a lot, at every level the activity offers, and keep what came out. */
function sample(activity: Activity, seeds = 40): Challenge[] {
  const drawn: Challenge[] = [];
  for (const level of activity.levels) {
    for (let seed = 0; seed < seeds; seed++) {
      drawn.push(
        ...drawChallenges(activity, { level, count: 8, rng: createRng(seed) }),
      );
    }
  }
  return drawn;
}

const SAMPLES = new Map(MATH_ACTIVITIES.map((a) => [a.id, sample(a)] as const));

function everyMathChallenge(): Challenge[] {
  return [...SAMPLES.values()].flat();
}

/* 1 ---------------------------------------------------------------------- */
test("the Math pack is in the one content registry, once", () => {
  const packs = CONTENT_REGISTRY.filter((pack) => pack.id === "math");
  assert.equal(packs.length, 1, "math should appear exactly once");
  assert.equal(packs[0], MATH_PACK);

  for (const activity of MATH_ACTIVITIES) {
    assert.equal(
      getActivity(activity.id),
      activity,
      `${activity.id} should be reachable through the registry`,
    );
  }
});

/* 2 ---------------------------------------------------------------------- */
test("the pack passes its own authoring checks", () => {
  assert.deepEqual(validatePack(MATH_PACK), []);
  for (const pack of CONTENT_REGISTRY) {
    assert.deepEqual(validatePack(pack), [], `${pack.id} should be valid`);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("all thirteen math activities are present", () => {
  const wanted: ActivityType[] = [
    "counting",
    "number-recognition",
    "comparison",
    "before-and-after",
    "addition",
    "subtraction",
    "number-sequence",
    "missing-number",
    "patterns",
  ];
  const got = MATH_ACTIVITIES.map((activity) => activity.activityType);
  assert.equal(MATH_ACTIVITIES.length, 13);
  for (const type of wanted) {
    assert.ok(got.includes(type), `missing ${type}`);
  }

  /* Four of the thirteen are asked more than one way, and that is the
     two-axis split rather than a duplicate: `counting` is a group of pips to
     name and a group of apples to count, `comparison` is which group is
     bigger and a whole row of groups to arrange, `addition` is a sum to
     answer and four sums to join to their answers, `number-sequence` is a
     missing number to pick and a run of numbers to arrange. Same subject,
     different gesture. */
  const twice = got.filter((type, index) => got.indexOf(type) !== index);
  assert.deepEqual(
    twice.sort(),
    ["addition", "comparison", "counting", "number-sequence"],
  );

  /* Ten ways of asking, two ways of arranging and one way of joining up. All
     three kinds had an engine long before this pack grew; what is asserted is
     that a fourth has not quietly appeared. */
  assert.deepEqual(
    [...new Set(MATH_ACTIVITIES.map((activity) => activity.kind))].sort(),
    ["choice", "connect", "order"],
  );
  assert.deepEqual(
    MATH_ACTIVITIES.filter((activity) => activity.kind === "order").map((a) => a.id).sort(),
    ["math.number-order", "math.quantity-order"],
  );
  assert.deepEqual(
    MATH_ACTIVITIES.filter((activity) => activity.kind === "connect").map((a) => a.id),
    ["math.sum-partners"],
  );
});

/* 4 ---------------------------------------------------------------------- */
test("the pack can ask far more than a hundred different questions", () => {
  const perActivity = new Map<string, number>();
  for (const [id, challenges] of SAMPLES) {
    perActivity.set(id, new Set(challenges.map(challengeKey)).size);
  }

  const total = [...perActivity.values()].reduce((sum, n) => sum + n, 0);
  assert.ok(
    total >= 100,
    `only ${total} distinct challenges: ${JSON.stringify([...perActivity])}`,
  );

  /* And no single activity is a one-trick pony hiding behind the total. */
  for (const [id, count] of perActivity) {
    assert.ok(count >= 10, `${id} can only ask ${count} distinct questions`);
  }
});

/* 5 ---------------------------------------------------------------------- */
test("every board has exactly one right answer, and checkAnswer finds it", () => {
  for (const challenge of everyMathChallenge()) {
    const payload = challenge.payload;

    /* An order board's answer is the whole sequence rather than one tile, so
       "exactly one" is asserted the only way it can be: the run it authored
       is accepted, and moving any two of its numbers is not. */
    if (payload.kind === "order") {
      const answer = [...payload.answerOrder];
      assert.ok(
        checkAnswer(challenge, { kind: "order", itemIds: answer }),
        `${challenge.id} refuses its own answer`,
      );
      for (let index = 1; index < answer.length; index += 1) {
        const swapped = [...answer];
        [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
        assert.ok(
          !checkAnswer(challenge, { kind: "order", itemIds: swapped }),
          `${challenge.id} accepts a second order`,
        );
      }
      continue;
    }

    /* A connect board's answer is the whole set of joins, so "exactly one" is
       asserted the way it is for an order board: the joins it authored are
       accepted, and a board with any two of them crossed over is not. */
    if (payload.kind === "connect") {
      assert.ok(
        checkAnswer(challenge, { kind: "connect", links: payload.pairs }),
        `${challenge.id} refuses its own answer`,
      );
      for (let index = 1; index < payload.pairs.length; index += 1) {
        const crossed = payload.pairs.map((pair) => ({ ...pair }));
        const first = crossed[index - 1];
        const second = crossed[index];
        [first.rightId, second.rightId] = [second.rightId, first.rightId];
        assert.ok(
          !checkAnswer(challenge, { kind: "connect", links: crossed }),
          `${challenge.id} accepts a second set of joins`,
        );
      }
      continue;
    }

    assert.equal(payload.kind, "choice");
    if (payload.kind !== "choice") continue;

    const correct = payload.options.filter((option) =>
      checkAnswer(challenge, { kind: "choice", optionId: option.id }),
    );
    assert.equal(
      correct.length,
      1,
      `${challenge.id} has ${correct.length} right answers`,
    );
    assert.equal(correct[0]?.id, payload.answerId);
  }
});

/* 6 ---------------------------------------------------------------------- */
test("wrong answers are near misses, never nonsense", () => {
  /* Comparison and patterns are excluded on purpose: their options are the
     things being compared, not numbers spun off an answer. */
  const numeric = MATH_ACTIVITIES.filter(
    (activity) =>
      activity.activityType !== "comparison" && activity.activityType !== "patterns",
  );

  for (const activity of numeric) {
    for (const challenge of SAMPLES.get(activity.id) ?? []) {
      const payload = challenge.payload;
      if (payload.kind !== "choice") continue;

      const valueOf = (index: number) => {
        const item = payload.options[index].item;
        return item.kind === "number" || item.kind === "count" ? item.value : null;
      };
      const values = payload.options.map((_, index) => valueOf(index));
      const answerIndex = payload.options.findIndex(
        (option) => option.id === payload.answerId,
      );
      const answer = values[answerIndex];
      assert.ok(answer !== null, `${challenge.id}: the answer is not a number`);

      for (const value of values) {
        assert.ok(value !== null, `${challenge.id}: a non-numeric option`);
        assert.ok(value >= 0, `${challenge.id}: ${value} is not a counting number`);
        assert.ok(
          Math.abs(value - answer) <= 9,
          `${challenge.id}: ${value} is nowhere near ${answer}`,
        );
      }

      /* Two identical tiles would make one of them unanswerable. */
      assert.equal(new Set(values).size, values.length, `${challenge.id}: a repeat`);
    }
  }
});

/* 7 ---------------------------------------------------------------------- */
test("the same seed deals the same round, a different seed does not", () => {
  for (const activity of MATH_ACTIVITIES) {
    const level = activity.levels[0];
    const once = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
    const twice = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
    assert.deepEqual(once, twice, `${activity.id} is not deterministic`);
  }

  /* At least one activity has to actually differ, or "seeded" means nothing. */
  const addition = MATH_ACTIVITIES.find((a) => a.activityType === "addition")!;
  const a = drawChallenges(addition, { level: 3, count: 6, rng: createRng(1) });
  const b = drawChallenges(addition, { level: 3, count: 6, rng: createRng(2) });
  assert.notDeepEqual(a.map(challengeKey), b.map(challengeKey));
});

/* 8 ---------------------------------------------------------------------- */
test("levels 4 and 5 are architecture-ready: they snap, they never crash", () => {
  for (const activity of MATH_ACTIVITIES) {
    for (const level of LEVELS) {
      const drawn = drawChallenges(activity, { level, count: 4, rng: createRng(3) });
      assert.ok(drawn.length > 0, `${activity.id} dealt nothing at level ${level}`);
      for (const challenge of drawn) {
        assert.ok(
          activity.levels.includes(challenge.level),
          `${activity.id} dealt level ${challenge.level}, which it does not offer`,
        );
      }
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("every challenge carries where it came from", () => {
  for (const activity of MATH_ACTIVITIES) {
    for (const challenge of SAMPLES.get(activity.id) ?? []) {
      assert.equal(challenge.packId, "math");
      assert.equal(challenge.activityId, activity.id);
      assert.equal(challenge.category, activity.category);
      assert.equal(challenge.activityType, activity.activityType);
      assert.deepEqual(challenge.ageRange, activity.ageRange);
      assert.ok(challenge.prompt.speech.trim().length > 0);
      assert.ok(
        challenge.id.startsWith(`${activity.id}#`),
        `${challenge.id} is not named after its activity`,
      );
    }
  }
});

/* 10 --------------------------------------------------------------------- */
test("one draw never repeats a question or an option id", () => {
  for (const activity of MATH_ACTIVITIES) {
    for (const level of activity.levels) {
      const drawn = drawChallenges(activity, { level, count: 8, rng: createRng(11) });
      for (const challenge of drawn) {
        if (challenge.payload.kind !== "choice") continue;
        const ids = challenge.payload.options.map((option) => option.id);
        assert.equal(new Set(ids).size, ids.length, `${challenge.id}: duplicate ids`);
      }
    }
  }
});

/* ================================================== content: numbers in order */

/**
 * The pack's one `order` activity, checked as arithmetic rather than as a
 * shuffle.
 *
 * An order board can go wrong in exactly two ways that matter to a child: the
 * tray can arrive already solved, so the board is finished by not reading it;
 * or the run can be something other than a run, so "put them in order" has an
 * answer the child cannot derive. Both are asserted below over every board the
 * activity can deal, at every level.
 */
function orderBoards(): Challenge[] {
  const boards = (SAMPLES.get("math.number-order") ?? []).filter(
    (challenge) => challenge.payload.kind === "order",
  );
  assert.ok(boards.length > 0, "number-order dealt no order boards");
  return boards;
}

/** The run a board is asking for, in the order it asks for it. */
function runOf(challenge: Challenge): number[] {
  const payload = challenge.payload;
  assert.equal(payload.kind, "order");
  if (payload.kind !== "order") return [];

  const byId = new Map(
    payload.items.map((item) => {
      assert.equal(item.item.kind, "number", `${challenge.id}: a tile is not a number`);
      return [item.id, item.item.kind === "number" ? item.item.value : NaN] as const;
    }),
  );

  return payload.answerOrder.map((id) => {
    const value = byId.get(id);
    assert.ok(value !== undefined, `${challenge.id}: the answer names a missing tile`);
    return value;
  });
}

/* 12 --------------------------------------------------------------------- */
test("every number-order board asks for a real run of numbers, and only one", () => {
  let boards = 0;

  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;
    boards += 1;

    const run = runOf(challenge);

    /* Three, four or five tiles by level, and the whole tray is the answer:
       no number is dealt that has nowhere to go. */
    const expected = challenge.level === 1 ? 3 : challenge.level === 2 ? 4 : 5;
    assert.equal(run.length, expected, `${challenge.id} is level ${challenge.level}`);
    assert.equal(payload.items.length, run.length);
    assert.equal(payload.answerOrder.length, payload.items.length);
    assert.equal(
      new Set(payload.items.map((item) => item.id)).size,
      payload.items.length,
      `${challenge.id}: the same tile twice`,
    );

    /* An even step, always upwards, always whole numbers a child can count
       to. No negatives, no decimals, no gap that has to be worked out rather
       than heard. */
    const step = run[1] - run[0];
    assert.ok([1, 2, 5, 10].includes(step), `${challenge.id}: it steps by ${step}`);
    for (const [index, value] of run.entries()) {
      assert.ok(Number.isInteger(value) && value > 0, `${challenge.id}: ${value}`);
      assert.ok(value <= 90, `${challenge.id}: ${value} is a big number for this`);
      if (index > 0) {
        assert.equal(
          value - run[index - 1],
          step,
          `${challenge.id}: ${run.join(" ")} does not step evenly`,
        );
      }
    }

    /* Smallest first, which is what the prompt asks for out loud. */
    assert.deepEqual(run, [...run].sort((a, b) => a - b));

    /* And the run really is one somebody wrote down, rather than one a
       generator invented on the way past. */
    assert.ok(
      NUMBER_RUNS.includes(run.join("-")),
      `${challenge.id}: ${run.join(" ")} is not an authored run`,
    );
  }

  assert.ok(boards > 100, `only ${boards} order boards were checked`);
});

/* 13 --------------------------------------------------------------------- */
test("the number tray is always scrambled, and more so the harder it gets", () => {
  const floors: Record<number, number> = { 1: 2, 2: 3, 3: 5 };

  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;

    const moved = payload.items.filter(
      (item, index) => item.id !== payload.answerOrder[index],
    ).length;

    /* Never handed over already solved. */
    assert.ok(moved > 0, `${challenge.id} arrives already in order`);
    assert.ok(
      moved >= floors[challenge.level],
      `${challenge.id} is level ${challenge.level} but only ${moved} tiles moved`,
    );

    /* Level three is a full derangement: no tile is left where it belongs, so
       none of the five can go unthought-about. */
    if (challenge.level === 3) {
      for (const [index, item] of payload.items.entries()) {
        assert.notEqual(item.id, payload.answerOrder[index], `${challenge.id}: home`);
      }
    }
  }
});

/* 14 --------------------------------------------------------------------- */
test("a number-order level gets harder by its step, never by a clock", () => {
  const steps = new Map<number, Set<number>>();
  const highest = new Map<number, number>();

  for (const challenge of orderBoards()) {
    const run = runOf(challenge);
    const level = challenge.level;
    const step = run[1] - run[0];

    if (!steps.has(level)) steps.set(level, new Set());
    steps.get(level)!.add(step);
    highest.set(level, Math.max(highest.get(level) ?? 0, ...run));

    /* Nothing in what a child is told is about speed, and nothing is unkind. */
    const said = [challenge.prompt.speech, challenge.hint, challenge.explanation]
      .filter(Boolean)
      .join(" ");
    assert.ok(!/\b(quick|fast|hurry|timer|seconds|wrong)\b/i.test(said), said);
  }

  /* Ones, then ones and tens, then the three skip-counts. The ladder is the
     step and the number of tiles — never how long the child took. */
  assert.deepEqual([...steps.get(1)!].sort((a, b) => a - b), [1]);
  assert.deepEqual([...steps.get(2)!].sort((a, b) => a - b), [1, 10]);
  assert.deepEqual([...steps.get(3)!].sort((a, b) => a - b), [2, 5, 10]);

  assert.equal(highest.get(1), 10, "level 1 should stay inside the first ten");
  assert.ok(highest.get(2)! > highest.get(1)!);
  assert.ok(highest.get(3)! > highest.get(2)!);
});

/* 15 --------------------------------------------------------------------- */
test("an order board is marked a tile at a time, and forgives every attempt", () => {
  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;

    const answer = [...payload.answerOrder];

    /* Right so far, at every length — which is what lets a child place one
       number, be told nothing unkind, and carry on. */
    for (let taken = 0; taken <= answer.length; taken += 1) {
      assert.ok(
        checkStep(challenge, { kind: "order", itemIds: answer.slice(0, taken) }),
        `${challenge.id}: the first ${taken} tiles were refused`,
      );
      assert.equal(
        checkAnswer(challenge, { kind: "order", itemIds: answer.slice(0, taken) }),
        taken === answer.length,
        `${challenge.id}: ${taken} tiles marked as a finished board`,
      );
    }

    /* And any other tile in any position is refused, one tile at a time, by
       the content layer — never by the engine and never by a screen. */
    for (const item of payload.items) {
      const wrong = item.id !== answer[0];
      assert.equal(
        checkStep(challenge, { kind: "order", itemIds: [item.id] }),
        !wrong,
        `${challenge.id}: judged ${item.id} wrongly as an opening move`,
      );
    }
  }
});

/* 16 --------------------------------------------------------------------- */
test("number-order counts runs, and never counts the trays it deals them in", () => {
  const boards = orderBoards();

  /* Thirty-three runs. A tray is a shuffle of one of them, and shuffles are
     not things to learn: `conceptKey` collapses every arrangement of 2 4 6 8
     10 into the one idea of counting in twos from two. */
  assert.equal(NUMBER_RUNS.length, 33);
  assert.equal(new Set(NUMBER_RUNS).size, NUMBER_RUNS.length, "an authored run twice");

  const concepts = new Set(boards.map(conceptKey));
  assert.equal(concepts.size, NUMBER_RUNS.length, "some authored run is never dealt");
  for (const concept of concepts) assert.match(concept, /\|run:[0-9-]+$/);

  /* "Same board" and "same concept" agree here by design, and asserting one
     is bigger than the other would be asserting the engine is broken:
     `challengeKey` keys an order board on the run it asks for, because a tray
     is a shuffle of the question rather than a different question.

     What is worth proving is that the shuffling happens — the same run really
     is handed over in more than one arrangement, so a child who meets 2 4 6 8
     10 again does not meet the same tray again. */
  assert.equal(new Set(boards.map(challengeKey)).size, concepts.size);

  const trays = new Map<string, Set<string>>();
  for (const challenge of boards) {
    if (challenge.payload.kind !== "order") continue;
    const key = conceptKey(challenge);
    if (!trays.has(key)) trays.set(key, new Set());
    trays.get(key)!.add(challenge.payload.items.map((item) => item.id).join(","));
  }
  const shuffled = [...trays.values()].filter((set) => set.size > 1).length;
  assert.ok(shuffled > 20, `only ${shuffled} runs were ever dealt more than one way`);
});

/* ==================================================== content: counting things */

/**
 * Counting a group of real things, which is the same question as
 * `math.counting` asked about something a child can name.
 *
 * The thing worth asserting is the one thing a counting board can get wrong:
 * showing a number of things that is not the number on the answer tile. So
 * every board below is counted the way a child counts it — by looking at what
 * is on the stage — and compared with what it says the answer is.
 */
function countingBoards(): Challenge[] {
  const boards = SAMPLES.get("math.counting-objects") ?? [];
  assert.ok(boards.length > 0, "counting-objects dealt nothing");
  return boards;
}

/** How many things are on the stage, however the stage is arranged. */
function thingsOn(challenge: Challenge): number {
  const display = challenge.prompt.display ?? [];
  assert.ok(display.length > 0, `${challenge.id} shows nothing to count`);

  /* One block of pips, or a row of pictures. Those are the two arrangements
     the content layer can describe, and a board is one or the other. */
  const first = display[0];
  if (display.length === 1 && first.kind === "item" && first.item.kind === "count") {
    return first.item.value;
  }

  const glyphs = new Set<string>();
  for (const part of display) {
    assert.equal(part.kind, "item", `${challenge.id}: something other than a thing`);
    if (part.kind !== "item") continue;
    assert.equal(part.item.kind, "picture", `${challenge.id}: a ${part.item.kind}`);
    if (part.item.kind === "picture") glyphs.add(part.item.glyph);
  }

  /* One kind of thing at a time, so "how many?" can never mean "how many of
     which?". */
  assert.equal(glyphs.size, 1, `${challenge.id} mixes ${[...glyphs].join(" ")}`);
  return display.length;
}

/* 17 --------------------------------------------------------------------- */
test("every counting board shows exactly as many things as its answer says", () => {
  const spans: Record<number, [number, number]> = { 1: [1, 5], 2: [4, 10], 3: [6, 10] };
  let boards = 0;

  for (const challenge of countingBoards()) {
    const payload = challenge.payload;
    /* A connect board's answer is the whole set of joins, so "exactly one" is
       asserted the way it is for an order board: the joins it authored are
       accepted, and a board with any two of them crossed over is not. */
    if (payload.kind === "connect") {
      assert.ok(
        checkAnswer(challenge, { kind: "connect", links: payload.pairs }),
        `${challenge.id} refuses its own answer`,
      );
      for (let index = 1; index < payload.pairs.length; index += 1) {
        const crossed = payload.pairs.map((pair) => ({ ...pair }));
        const first = crossed[index - 1];
        const second = crossed[index];
        [first.rightId, second.rightId] = [second.rightId, first.rightId];
        assert.ok(
          !checkAnswer(challenge, { kind: "connect", links: crossed }),
          `${challenge.id} accepts a second set of joins`,
        );
      }
      continue;
    }

    assert.equal(payload.kind, "choice");
    if (payload.kind !== "choice") continue;
    boards += 1;

    const things = thingsOn(challenge);
    const answer = payload.options.find((option) => option.id === payload.answerId);
    assert.ok(answer, `${challenge.id}: the answer is not on the board`);
    assert.equal(answer.item.kind, "number", `${challenge.id}: the answer is not a number`);
    assert.equal(
      answer.item.kind === "number" ? answer.item.value : -1,
      things,
      `${challenge.id} shows ${things} things and marks something else right`,
    );

    /* Inside the level's span, so the ladder is a real one: a handful, then
       past the handful, then never fewer than six. */
    const [min, max] = spans[challenge.level];
    assert.ok(
      things >= min && things <= max,
      `${challenge.id} is level ${challenge.level} and shows ${things}`,
    );

    /* Three tiles, or four at the top. Every one of them a number a child
       could have reached by miscounting, and never the same number twice. */
    assert.equal(payload.options.length, challenge.level === 3 ? 4 : 3);
    const values = payload.options.map((option) =>
      option.item.kind === "number" ? option.item.value : NaN,
    );
    assert.equal(new Set(values).size, values.length, `${challenge.id}: a repeat`);
    for (const value of values) {
      assert.ok(Number.isInteger(value) && value >= 1, `${challenge.id}: ${value}`);
      assert.ok(Math.abs(value - things) <= 4, `${challenge.id}: ${value} for ${things}`);
    }

    /* The question says what is being counted, and the explanation says the
       number. Neither says anything about how fast, or about being wrong. */
    assert.match(challenge.prompt.speech, /^How many [a-z]+ can you count\?$/);
    assert.equal(challenge.explanation, `There are ${things}.`);
  }

  assert.ok(boards > 100, `only ${boards} counting boards were checked`);
});

/* 18 --------------------------------------------------------------------- */
test("counting boards are a row of things, and a block of pips at the top level", () => {
  const arrangements = new Map<number, Set<string>>();

  for (const challenge of countingBoards()) {
    const display = challenge.prompt.display ?? [];
    const first = display[0];
    const block =
      display.length === 1 && first.kind === "item" && first.item.kind === "count";

    if (!arrangements.has(challenge.level)) arrangements.set(challenge.level, new Set());
    arrangements.get(challenge.level)!.add(block ? "block" : "row");
  }

  /* A row is counted by sweeping along it; a block has to be counted by
     keeping track, which is the harder skill and so arrives last. */
  assert.deepEqual([...arrangements.get(1)!], ["row"]);
  assert.deepEqual([...arrangements.get(2)!], ["row"]);
  assert.deepEqual([...arrangements.get(3)!].sort(), ["block", "row"]);
});

/* 19 --------------------------------------------------------------------- */
test("counting-objects counts quantities, and never counts apples", () => {
  const boards = countingBoards();
  const concepts = new Set(boards.map(conceptKey));

  /* Ten concepts, one per quantity. Six apples and six stars are the same
     thing to have learned, and a content count that called them two would be
     counting the pictures rather than the mathematics. */
  assert.equal(concepts.size, 10);
  for (const concept of concepts) assert.match(concept, /\|count:([1-9]|10)$/);

  /* And there is real variety inside each of them: the same quantity comes
     back as a different group of things, so a child meets six again without
     meeting the same six. */
  const keys = new Set(boards.map(challengeKey));
  assert.ok(
    keys.size > concepts.size * 10,
    `${keys.size} boards from ${concepts.size} quantities: the same number is always drawn the same way`,
  );
});

/* ==================================================== content: the new three */

/*
 * The Math work of this batch, checked against arithmetic rather than against
 * itself: a sum is either true or it is not, and that is a thing a test can
 * work out without asking the pack.
 *
 * Three activities were added — `before-and-after`, `sum-partners` and
 * `quantity-order` — and `addition` and `subtraction` were already here and
 * gained concept tags. All five are checked below, because the tags changed
 * what the older two claim to teach and a claim is worth checking.
 */

/** Every challenge one activity dealt. */
function drawnMath(id: string): Challenge[] {
  const challenges = SAMPLES.get(`math.${id}` as Activity["id"]) ?? [];
  assert.ok(challenges.length > 0, `nothing was drawn for math.${id}`);
  return challenges;
}

/** The numbers shown across the top of the stage, in the order they are shown. */
function shownNumbers(challenge: Challenge): number[] {
  const shown: number[] = [];
  for (const part of challenge.prompt.display ?? []) {
    if (part.kind !== "item") continue;
    if (part.item.kind === "number" || part.item.kind === "count") {
      shown.push(part.item.value);
    }
  }
  return shown;
}

/** The number on the right tile. */
function answerNumber(challenge: Challenge): number {
  const payload = challenge.payload;
  assert.equal(payload.kind, "choice", `${challenge.id} is not a choice`);
  if (payload.kind !== "choice") return Number.NaN;
  const option = payload.options.find((o) => o.id === payload.answerId);
  assert.ok(option, `${challenge.id}: the answer is not on the board`);
  assert.equal(option.item.kind, "number", `${challenge.id}: the answer is not a number`);
  return option.item.kind === "number" ? option.item.value : Number.NaN;
}

/* A ---------------------------------------------------------------------- */
test("every sum and every take-away on the stage is really true", () => {
  /* Two of the wrongest things this pack could do are to show 3 + 4 and mark
     8, or to take 3 from 5 and mark 3. Neither would be caught by any rule
     about boards, so the arithmetic is done here, from the tiles. */
  for (const challenge of drawnMath("addition")) {
    const shown = shownNumbers(challenge);
    assert.equal(shown.length, 2, `${challenge.id} does not show two numbers`);
    const [a, b] = shown;
    assert.equal(answerNumber(challenge), a + b, `${challenge.id}: ${a} + ${b}`);
    assert.equal(challenge.explanation, `${a} and ${b} make ${a + b}.`);
    /* Both parts of a sum are real things to count, and level one draws them
       as dots so a child who cannot yet read a numeral can still answer. */
    assert.ok(a >= 1 && b >= 1, `${challenge.id} adds nothing to something`);
  }

  for (const challenge of drawnMath("subtraction")) {
    const shown = shownNumbers(challenge);
    assert.equal(shown.length, 2, `${challenge.id} does not show two numbers`);
    const [whole, taken] = shown;
    const left = whole - taken;
    assert.equal(answerNumber(challenge), left, `${challenge.id}: ${whole} - ${taken}`);
    assert.equal(
      challenge.explanation,
      `Take ${taken} away from ${whole} and ${left} are left.`,
    );
    /* Never down to nothing: an empty tile is a poor drawing of zero, and the
       pack says so out loud. */
    assert.ok(left >= 1, `${challenge.id} leaves ${left}`);
    assert.ok(taken >= 1, `${challenge.id} takes nothing away`);
  }
});

/* B ---------------------------------------------------------------------- */
test("before and after: the question is true, and its own numbers are never offered", () => {
  const asked = { after: 0, before: 0, between: 0 };

  for (const challenge of drawnMath("before-and-after")) {
    const payload = challenge.payload;
    assert.equal(payload.kind, "choice", `${challenge.id} is not a choice`);
    if (payload.kind !== "choice") continue;

    const speech = challenge.prompt.speech;
    const answer = answerNumber(challenge);
    const shown = shownNumbers(challenge);
    const tiles = payload.options.map((o) =>
      o.item.kind === "number" ? o.item.value : Number.NaN,
    );

    const after = speech.match(/^What number comes after (\d+)\?$/);
    const before = speech.match(/^What number comes before (\d+)\?$/);
    const between = speech.match(/^What number goes between (\d+) and (\d+)\?$/);

    if (after) {
      asked.after += 1;
      const value = Number(after[1]);
      assert.equal(answer, value + 1, `${challenge.id}: after ${value}`);
      assert.deepEqual(shown, [value], `${challenge.id}: the wrong number is shown`);
    } else if (before) {
      asked.before += 1;
      const value = Number(before[1]);
      assert.equal(answer, value - 1, `${challenge.id}: before ${value}`);
      assert.deepEqual(shown, [value], `${challenge.id}: the wrong number is shown`);
      assert.ok(challenge.level >= 2, `${challenge.id}: level 1 counted backwards`);
    } else if (between) {
      asked.between += 1;
      const low = Number(between[1]);
      const high = Number(between[2]);
      assert.equal(high - low, 2, `${challenge.id}: ${low} and ${high} have a gap`);
      assert.equal(answer, low + 1, `${challenge.id}: between ${low} and ${high}`);
      assert.deepEqual(shown, [low, high], `${challenge.id}: the wrong numbers are shown`);
      assert.equal(challenge.level, 3, `${challenge.id}: between below level 3`);
      /* Neither end is offered as a wrong answer: both are on the stage
         already, so ruling them out would be looking rather than counting. */
      assert.ok(!tiles.includes(low) && !tiles.includes(high), `${challenge.id}: an end is a tile`);
    } else {
      assert.fail(`${challenge.id}: "${speech}" is none of the three questions`);
    }

    /* The number the question is about is never itself a tile. */
    for (const value of shown) {
      assert.ok(!tiles.includes(value), `${challenge.id}: ${value} is on the board`);
    }
    assert.ok(answer >= 1, `${challenge.id}: the answer is ${answer}`);
  }

  /* All three questions really do get dealt, and only where they should. */
  assert.ok(asked.after > 0 && asked.before > 0 && asked.between > 0, JSON.stringify(asked));
});

/* C ---------------------------------------------------------------------- */
test("sums and answers: a full board, every line true, and no two the same total", () => {
  for (const challenge of drawnMath("sum-partners")) {
    const payload = challenge.payload;
    assert.equal(payload.kind, "connect", `${challenge.id} is not a connect`);
    if (payload.kind !== "connect") continue;

    const wanted = challenge.level <= 1 ? 3 : 4;
    assert.equal(payload.pairs.length, wanted, `${challenge.id} came up short`);
    assert.equal(payload.left.length, wanted, `${challenge.id}: left column`);
    assert.equal(payload.right.length, wanted, `${challenge.id}: right column`);

    const totals: number[] = [];
    for (const pair of payload.pairs) {
      const sum = pair.leftId.match(/^sum-(\d+)-(\d+)$/);
      assert.ok(sum, `${challenge.id}: ${pair.leftId} is not a sum`);
      const total = Number(sum[1]) + Number(sum[2]);
      assert.equal(pair.rightId, `n${total}`, `${challenge.id}: ${pair.leftId} joins the wrong number`);
      totals.push(total);
    }

    /* One bond per total. Two sums making the same number would leave one
       answer card wanted by both, and the board could not be finished. */
    assert.equal(new Set(totals).size, totals.length, `${challenge.id}: two sums, one total`);

    /* The level's ceiling is what makes it harder, and level three always
       holds at least one sum that crosses ten. */
    const ceiling = challenge.level <= 1 ? 5 : challenge.level === 2 ? 10 : 20;
    for (const total of totals) {
      assert.ok(total <= ceiling, `${challenge.id}: ${total} is over ${ceiling}`);
    }
    if (challenge.level >= 3) {
      assert.ok(totals.some((total) => total > 10), `${challenge.id}: nothing crosses ten`);
    }

    /* Nothing sits opposite its own answer. */
    const answer = new Map(payload.pairs.map((pair) => [pair.leftId, pair.rightId] as const));
    for (const [index, node] of payload.left.entries()) {
      assert.notEqual(
        answer.get(node.id),
        payload.right[index].id,
        `${challenge.id}: row ${index} answers itself`,
      );
    }
  }
});

/* D ---------------------------------------------------------------------- */
test("smallest group first: the answer really is fewest to most, and the tray is not", () => {
  for (const challenge of drawnMath("quantity-order")) {
    const payload = challenge.payload;
    assert.equal(payload.kind, "order", `${challenge.id} is not an order`);
    if (payload.kind !== "order") continue;

    /* Every card is a group of dots in the one accent this activity uses.
       Colour says nothing here, so it must not vary. */
    const accents = new Set<string>();
    for (const item of payload.items) {
      assert.equal(item.item.kind, "count", `${challenge.id}: a card is not a group`);
      if (item.item.kind === "count") accents.add(item.item.accent ?? "none");
    }
    assert.equal(accents.size, 1, `${challenge.id} colours the groups differently`);

    const values = payload.answerOrder.map((id) => {
      const found = id.match(/^dots-(\d+)$/);
      assert.ok(found, `${challenge.id}: ${id} is not a group`);
      return Number(found[1]);
    });

    /* The answer is fewest to most, strictly — two cards holding the same
       number would be two right answers. */
    for (let index = 1; index < values.length; index += 1) {
      assert.ok(
        values[index] > values[index - 1],
        `${challenge.id}: ${values.join(", ")} is not smallest first`,
      );
    }

    const laid = payload.items.map((item) => item.id);
    assert.deepEqual([...laid].sort(), [...payload.answerOrder].sort());
    const moved = laid.filter((id, index) => id !== payload.answerOrder[index]).length;
    const owed = challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : laid.length;
    assert.ok(moved >= owed, `${challenge.id}: only ${moved} cards had moved`);
  }
});
