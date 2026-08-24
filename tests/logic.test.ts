import assert from "node:assert/strict";
import { test } from "node:test";

import {
  challengeKey,
  checkAnswer,
  conceptKey,
  drawChallenges,
  labelOf,
  spokenOf,
} from "@/lib/content/challenges";
import { LEVELS } from "@/lib/content/difficulty";
import { LOGIC_ACTIVITIES, LOGIC_PACK } from "@/lib/content/packs/logic";
import { PAIR_FACTS } from "@/lib/content/packs/logic/pairPartners";
import { COLOUR_PAIRS } from "@/lib/content/packs/logic/shared";
import { canMix, WORD_GROUPS, type WordGroup } from "@/lib/content/packs/logic/words";
import {
  CONTENT_REGISTRY,
  findActivities,
  getActivity,
} from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type {
  Activity,
  ActivityType,
  Challenge,
  ChoicePayload,
  ConnectPayload,
  ContentItem,
  ShapeItem,
} from "@/lib/content/types";
import { validatePack } from "@/lib/content/validate";

/**
 * The Logic content pack, checked as content rather than as code.
 *
 * A logic question is only worth asking if it has exactly one defensible
 * answer, and "generated" is exactly the word that should make a reader
 * suspicious of that. So the tests below do not take the pack's word for it:
 * they read the pattern off the stage and work out the answer themselves, from
 * the pixels the child sees, and then check the board agrees. Every rule the
 * pack claims to generate is re-derived here by a second, independent piece of
 * code — which is the only kind of test that can catch a generator that has
 * quietly started producing puzzles with two right answers.
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

const SAMPLES = new Map(LOGIC_ACTIVITIES.map((a) => [a.id, sample(a)] as const));

function drawn(id: string): Challenge[] {
  const challenges = SAMPLES.get(`logic.${id}` as Activity["id"]) ?? [];
  assert.ok(challenges.length > 0, `nothing was drawn for logic.${id}`);
  return challenges;
}

function everyLogicChallenge(): Challenge[] {
  return [...SAMPLES.values()].flat();
}

/** The board of a challenge, narrowed. Every Logic challenge has one. */
function boardOf(challenge: Challenge): ChoicePayload {
  assert.equal(challenge.payload.kind, "choice", `${challenge.id} is not a choice`);
  return challenge.payload as ChoicePayload;
}

/** The two columns of a `connect` challenge, narrowed. */
function linesOf(challenge: Challenge): ConnectPayload {
  assert.equal(challenge.payload.kind, "connect", `${challenge.id} is not a connect`);
  return challenge.payload as ConnectPayload;
}

/**
 * Every tile on a board, whichever kind of board it is.
 *
 * Two of the pack's six activities are `connect`, and the things every Logic
 * challenge must be true of — no tile that cannot be read aloud, no "1 dots" —
 * are true of a node in a column exactly as they are of an option on a board.
 */
function itemsOf(challenge: Challenge): ContentItem[] {
  const payload = challenge.payload;
  if (payload.kind === "choice") return payload.options.map((option) => option.item);
  if (payload.kind === "connect") {
    return [...payload.left, ...payload.right].map((node) => node.item);
  }
  throw new Error(`${challenge.id} is a ${payload.kind}, which Logic does not deal`);
}

/** What a tile says, in the words a screen reader would use. */
function tileLabels(challenge: Challenge): string[] {
  return boardOf(challenge).options.map((option) => labelOf(option.item));
}

function answerLabel(challenge: Challenge): string {
  const payload = boardOf(challenge);
  const option = payload.options.find((o) => o.id === payload.answerId);
  assert.ok(option, `${challenge.id}: the answer is not on the board`);
  return labelOf(option.item);
}

/**
 * The things on the stage, in order, with the gap left out.
 *
 * This is the question as the child sees it, and everything the rule tests
 * below are allowed to know.
 */
function stageItems(challenge: Challenge): ContentItem[] {
  const parts = challenge.prompt.display ?? [];
  return parts.flatMap((part) => (part.kind === "item" ? [part.item] : []));
}

/** A number a child could count or read: a numeral, or a group of dots. */
function numberOn(item: ContentItem): number | null {
  return item.kind === "number" || item.kind === "count" ? item.value : null;
}

/* ======================================================== content: the pack */

/* 1 ---------------------------------------------------------------------- */
test("the Logic pack is in the one content registry, once", () => {
  const packs = CONTENT_REGISTRY.filter((pack) => pack.id === "logic");
  assert.equal(packs.length, 1, "logic should appear exactly once");
  assert.equal(packs[0], LOGIC_PACK);

  for (const activity of LOGIC_ACTIVITIES) {
    assert.equal(
      getActivity(activity.id),
      activity,
      `${activity.id} should be reachable through the registry`,
    );
  }

  /* There is one registry, and adding to it is one line. Every pack in it is
     still whole. */
  for (const pack of CONTENT_REGISTRY) {
    assert.deepEqual(validatePack(pack), [], `${pack.id} should be valid`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("all six Logic activities are present, and all six validate", () => {
  const wanted: ActivityType[] = [
    "patterns",
    "odd-one-out",
    "sorting",
    "sequences",
    "goes-together",
  ];
  const got = LOGIC_ACTIVITIES.map((activity) => activity.activityType);
  assert.equal(LOGIC_ACTIVITIES.length, 6);
  for (const type of wanted) {
    assert.ok(got.includes(type), `missing ${type}`);
  }

  /* `sorting` is asked twice, and on purpose: `sortingActivity` names a group
     and asks which word is in it, `groupPartnersActivity` deals several words
     and several group names at once. Same knowledge, different gesture, one
     `ActivityType` — which is the whole point of the two-axis split. */
  assert.equal(
    got.filter((type) => type === "sorting").length,
    2,
    "sorting should be askable both ways",
  );

  assert.deepEqual(validatePack(LOGIC_PACK), []);

  /* Six activities, two mechanics, no engine of its own. This is the
     reusability claim, asserted: four are drawn by the `ChoiceStage` that
     already existed and two by the `ConnectStage` that already existed. */
  const kinds = new Map<string, string>(
    LOGIC_ACTIVITIES.map((activity) => [activity.id, activity.kind]),
  );
  assert.equal(
    [...kinds.values()].filter((kind) => kind === "choice").length,
    4,
  );
  assert.deepEqual(
    [...kinds].filter(([, kind]) => kind === "connect").map(([id]) => id).sort(),
    ["logic.group-partners", "logic.pair-partners"],
  );
  for (const activity of LOGIC_ACTIVITIES) {
    assert.ok(
      activity.kind === "choice" || activity.kind === "connect",
      `${activity.id} needs a new engine`,
    );
  }
});

/* 3 ---------------------------------------------------------------------- */
test("the pack can ask far more than a hundred *different* questions", () => {
  /* The count that matters. `conceptKey` is the rule plus the things the rule
     is written in — so `A B A B ?` and `B A B A ?` are one concept counted
     once, and a shuffled board is not a second question. Rearrangements are
     deliberately worth nothing here. */
  const perActivity = new Map<string, number>();
  for (const [id, challenges] of SAMPLES) {
    perActivity.set(id, new Set(challenges.map(conceptKey)).size);
  }

  const total = [...perActivity.values()].reduce((sum, n) => sum + n, 0);
  assert.ok(
    total >= 100,
    `only ${total} meaningfully different questions: ${JSON.stringify([...perActivity])}`,
  );

  /* And no single activity is a one-trick pony hiding behind the total. */
  for (const [id, count] of perActivity) {
    assert.ok(count >= 20, `${id} can only ask ${count} different questions`);
  }

  /* The measure has to be stricter than counting boards, or it is measuring
     nothing: there must be arrangements that collapse onto one concept. */
  const boards = new Set(everyLogicChallenge().map(challengeKey)).size;
  assert.ok(
    boards > total,
    "conceptKey is counting boards, not concepts — the rule has stopped working",
  );
});

/* 4 ---------------------------------------------------------------------- */
test("the same seed deals the same round, a different seed does not", () => {
  for (const activity of LOGIC_ACTIVITIES) {
    for (const level of activity.levels) {
      const once = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
      const twice = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
      assert.deepEqual(once, twice, `${activity.id} is not deterministic at ${level}`);
    }

    const a = drawChallenges(activity, { level: 3, count: 6, rng: createRng(1) });
    const b = drawChallenges(activity, { level: 3, count: 6, rng: createRng(2) });
    assert.notDeepEqual(
      a.map(challengeKey),
      b.map(challengeKey),
      `${activity.id} deals the same round whatever the seed`,
    );
  }
});

/* 5 ---------------------------------------------------------------------- */
test("one draw never repeats a question, an id, or a tile", () => {
  for (const activity of LOGIC_ACTIVITIES) {
    for (const level of activity.levels) {
      const round = drawChallenges(activity, { level, count: 8, rng: createRng(11) });

      const ids = round.map((challenge) => challenge.id);
      assert.equal(new Set(ids).size, ids.length, `${activity.id}: repeated an id`);

      for (const challenge of round) {
        if (challenge.payload.kind === "connect") {
          /* A connect board is a bijection, so the thing that must not repeat
             is a node id, and the thing that must not repeat *within a
             column* is a label: two tiles reading DOG in the left column
             would be two lines to the same place. Across columns a repeat is
             fine and sometimes the point — nothing in this pack does it, but
             a word and its group name are allowed to be the same word. */
          const lines = linesOf(challenge);
          const nodeIds = [...lines.left, ...lines.right].map((node) => node.id);
          assert.equal(
            new Set(nodeIds).size,
            nodeIds.length,
            `${challenge.id}: two nodes share an id`,
          );
          for (const column of [lines.left, lines.right]) {
            const said = column.map((node) => labelOf(node.item));
            assert.equal(
              new Set(said).size,
              said.length,
              `${challenge.id}: the same tile twice — ${said.join(", ")}`,
            );
          }
          continue;
        }

        const optionIds = boardOf(challenge).options.map((option) => option.id);
        assert.equal(
          new Set(optionIds).size,
          optionIds.length,
          `${challenge.id}: two tiles share an id`,
        );

        /* Two tiles saying the same thing is either two right answers or a
           tile that cannot be meant — everywhere except odd one out, where
           three tiles being the same thing is the entire question. What must
           hold there instead is that the odd one is odd on its own. */
        const labels = tileLabels(challenge);
        if (activity.id === "logic.odd-one-out") {
          const odd = answerLabel(challenge);
          assert.equal(
            labels.filter((label) => label === odd).length,
            1,
            `${challenge.id}: the odd one is on the board twice`,
          );
          assert.ok(
            new Set(labels).size >= 2,
            `${challenge.id}: every tile is the same`,
          );
        } else {
          assert.equal(
            new Set(labels).size,
            labels.length,
            `${challenge.id}: the same tile twice — ${labels.join(", ")}`,
          );
        }
      }
    }
  }

});

/* 6 ---------------------------------------------------------------------- */
test("the registry can filter Logic by level, age, kind and pack", () => {
  const all = findActivities({ packId: "logic" });
  assert.equal(all.length, 6);
  assert.equal(findActivities({ packId: "logic", kind: "choice" }).length, 4);
  assert.deepEqual(
    findActivities({ packId: "logic", kind: "connect" }).map((a) => a.id),
    ["logic.group-partners", "logic.pair-partners"],
  );

  for (const level of [1, 2, 3] as const) {
    assert.equal(
      findActivities({ packId: "logic", level }).length,
      6,
      `every activity should offer level ${level}`,
    );
  }

  assert.deepEqual(findActivities({ packId: "logic", category: "logic" }), all);
  /* Joining several words to several group names at once is a reading task
     as much as a sorting one, so it starts at five. Everything else in the
     pack is open to a four year old. */
  assert.deepEqual(
    findActivities({ packId: "logic", age: 4 }).map((a) => a.id),
    [
      "logic.patterns",
      "logic.odd-one-out",
      "logic.sorting",
      "logic.sequences",
      "logic.pair-partners",
    ],
  );
  assert.equal(findActivities({ packId: "logic", age: 8 }).length, 4);

  /* Two packs teach patterns, and the registry keeps them apart: Math's are
     authored swatch rows, Logic's are generated shapes, dots and letters. A
     round of one never quietly deals the other. */
  const patterns = findActivities({})
    .filter((activity) => activity.activityType === "patterns")
    .map((activity) => activity.id);
  assert.ok(patterns.includes("logic.patterns"));
  assert.ok(patterns.length > 1, "Math's patterns activity has gone missing");
});

/* 7 ---------------------------------------------------------------------- */
test("there are three levels, and 4 and 5 snap down to the hardest real one", () => {
  for (const activity of LOGIC_ACTIVITIES) {
    assert.deepEqual(activity.levels, [1, 2, 3], `${activity.id} claims other levels`);

    for (const level of LEVELS) {
      const round = drawChallenges(activity, { level, count: 4, rng: createRng(3) });
      assert.ok(round.length > 0, `${activity.id} dealt nothing at level ${level}`);
      for (const challenge of round) {
        assert.ok(
          activity.levels.includes(challenge.level),
          `${activity.id} dealt level ${challenge.level}, which it does not offer`,
        );
      }
    }

    /* Snapping is a promise, not a crash guard: ask for 5 and the child gets
       the hardest thing this activity really has. There is no fake level 4. */
    for (const wanted of [4, 5] as const) {
      const hardest = drawChallenges(activity, {
        level: wanted,
        count: 4,
        rng: createRng(3),
      });
      for (const challenge of hardest) {
        assert.equal(
          challenge.level,
          3,
          `${activity.id} did not snap level ${wanted} down to 3`,
        );
      }
    }
  }
});

/* 8 ---------------------------------------------------------------------- */
test("every board has exactly one right answer, and checkAnswer finds it", () => {
  for (const challenge of everyLogicChallenge()) {
    if (challenge.payload.kind === "connect") {
      /* A connect board is right when every line is right, and there is only
         one set of lines that manages it. Crossing any two proves it: the
         board stops being accepted, so the answer really is the joining and
         not the drawing. */
      const lines = linesOf(challenge);
      assert.ok(
        lines.pairs.length >= 2 && lines.pairs.length <= 4,
        `${challenge.id} asks for ${lines.pairs.length} lines`,
      );
      assert.equal(lines.left.length, lines.pairs.length);
      assert.equal(lines.right.length, lines.pairs.length);
      assert.ok(
        checkAnswer(challenge, { kind: "connect", links: lines.pairs }),
        `${challenge.id}: its own pairs are not accepted`,
      );

      for (let index = 1; index < lines.pairs.length; index += 1) {
        const crossed = lines.pairs.map((pair) => ({ ...pair }));
        const first = crossed[index - 1];
        const second = crossed[index];
        [first.rightId, second.rightId] = [second.rightId, first.rightId];
        assert.ok(
          !checkAnswer(challenge, { kind: "connect", links: crossed }),
          `${challenge.id}: a crossed board was accepted`,
        );
      }
      continue;
    }

    const payload = boardOf(challenge);

    const correct = payload.options.filter((option) =>
      checkAnswer(challenge, { kind: "choice", optionId: option.id }),
    );
    assert.equal(
      correct.length,
      1,
      `${challenge.id} has ${correct.length} right answers`,
    );
    assert.equal(correct[0]?.id, payload.answerId);

    /* Three tiles, or four when it is harder. Never two, never a wall. */
    assert.ok(
      payload.options.length >= 3 && payload.options.length <= 4,
      `${challenge.id} has ${payload.options.length} tiles`,
    );
  }
});

/* ================================================================== rules */

/* 9 ---------------------------------------------------------------------- */
test("every pattern repeats, and the repeat gives exactly one answer", () => {
  for (const challenge of drawn("patterns")) {
    const shown = stageItems(challenge).map(labelOf);
    assert.ok(shown.length >= 4, `${challenge.id}: only ${shown.length} on the stage`);

    /* Worked out here, from the stage, without asking the pack: the shortest
       repeat that explains everything shown. A child who spots any repeat at
       all spots this one, so this is the answer the question really has. */
    let unit = 0;
    for (let size = 1; size <= shown.length && unit === 0; size++) {
      const holds = shown.every((label, i) => i < size || label === shown[i - size]);
      if (holds) unit = size;
    }

    assert.ok(unit >= 2, `${challenge.id}: "${shown.join(" ")}" does not repeat`);
    assert.ok(unit <= 4, `${challenge.id}: a ${unit}-long unit is not a pattern`);
    assert.ok(
      shown.length >= unit + 2,
      `${challenge.id}: "${shown.join(" ")}" shows the unit too few times to be sure`,
    );

    const expected = shown[shown.length - unit];
    assert.equal(
      answerLabel(challenge),
      expected,
      `${challenge.id}: "${shown.join(" ")} ?" should be ${expected}`,
    );

    /* Nothing on the board is a second defensible continuation. */
    const alsoFits = tileLabels(challenge).filter((label) => label === expected);
    assert.equal(alsoFits.length, 1, `${challenge.id}: two tiles both continue it`);

    /* The gap is the last thing on the stage, and there is exactly one. */
    const parts = challenge.prompt.display ?? [];
    assert.equal(parts.filter((p) => p.kind === "blank").length, 1);
    assert.equal(parts[parts.length - 1]?.kind, "blank");
  }
});

/* 10 --------------------------------------------------------------------- */
test("every sequence goes up or down by the same step, and only that step", () => {
  for (const challenge of drawn("sequences")) {
    const items = stageItems(challenge);
    const run = items.map(numberOn);
    assert.ok(
      run.every((value): value is number => value !== null),
      `${challenge.id}: a sequence tile is not a number`,
    );

    const numbers = run as number[];
    assert.ok(
      numbers.length >= 3,
      `${challenge.id}: ${numbers.length} terms cannot fix a rule`,
    );

    const step = numbers[1] - numbers[0];
    assert.notEqual(step, 0, `${challenge.id}: a flat sequence has no next`);
    for (let i = 1; i < numbers.length; i++) {
      assert.equal(
        numbers[i] - numbers[i - 1],
        step,
        `${challenge.id}: ${numbers.join(" ")} changes step half way`,
      );
    }

    const expected = numbers[numbers.length - 1] + step;
    assert.ok(expected >= 1, `${challenge.id}: the answer is ${expected}`);

    const answer = boardOf(challenge).options.find(
      (o) => o.id === boardOf(challenge).answerId,
    );
    assert.ok(answer);
    assert.equal(
      numberOn(answer.item),
      expected,
      `${challenge.id}: ${numbers.join(" ")} ? should be ${expected}`,
    );

    /* Every tile is the same kind of thing as the answer — dots beside dots,
       numerals beside numerals — so the odd one out is never the odd one in. */
    for (const option of boardOf(challenge).options) {
      assert.equal(
        option.item.kind,
        answer.item.kind,
        `${challenge.id}: a ${option.item.kind} tile on a ${answer.item.kind} board`,
      );
      assert.ok(
        (numberOn(option.item) ?? 0) >= 1,
        `${challenge.id}: a tile below one`,
      );
    }

    /* Arrows, not a bare row: a sequence is drawn as a chain so it can never
       be read as a repeating pattern. */
    const parts = challenge.prompt.display ?? [];
    assert.ok(parts.some((p) => p.kind === "symbol" && p.symbol === "arrow"));
    assert.equal(parts[parts.length - 1]?.kind, "blank");
  }
});

/* 11 --------------------------------------------------------------------- */
test("odd one out always has exactly one odd one, by a rule you can state", () => {
  for (const challenge of drawn("odd-one-out")) {
    const labels = tileLabels(challenge);
    const payload = boardOf(challenge);

    /* Worked out from the tiles alone: an option is odd if the ones left over
       agree with each other — either by being the same thing, or by all being
       in one word group it is not in. Exactly one option may be odd, or the
       question has two answers, or none. */
    const odd = payload.options.filter((_, index) => {
      const rest = labels.filter((_label, i) => i !== index);
      const mine = labels[index];
      const allSame = rest.every((label) => label === rest[0]) && mine !== rest[0];
      return allSame || sharesAGroupWithout(rest, mine);
    });

    assert.equal(
      odd.length,
      1,
      `${challenge.id}: ${odd.length} odd ones in [${labels.join(", ")}]`,
    );
    assert.equal(
      odd[0]?.id,
      payload.answerId,
      `${challenge.id}: the odd one is not the answer`,
    );

    /* No stage: everything the question is about is on the tiles. */
    assert.equal(challenge.prompt.display, undefined);
    assert.equal(challenge.prompt.speech, "Which one is different?");
  }
});

/** True if every one of `rest` is in one word group and `mine` is not. */
function sharesAGroupWithout(rest: readonly string[], mine: string): boolean {
  return WORD_GROUPS.some(
    (group) =>
      rest.every((label) => group.words.includes(label)) &&
      !group.words.includes(mine),
  );
}

/* 12 --------------------------------------------------------------------- */
/**
 * The one rule whose answer is carried by colour alone.
 *
 * Everything else on a Logic board can be answered without seeing colour: a
 * star is not a square, four dots are not two, DOG is not BUS. "Which one is
 * different?" asked about colour cannot be, so the pair it is asked with has
 * to be a pair everybody can see — and half of the KIDDO palette's pairs are
 * not, which is what `COLOUR_PAIRS` is for. This checks the generator actually
 * goes through it, rather than reaching back into `COLOURS`.
 */
test("a question about colour is only ever asked with a pair anyone can see", () => {
  const safe = new Set(
    COLOUR_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
  );

  let asked = 0;
  for (const challenge of drawn("odd-one-out")) {
    if (challenge.payload.kind !== "choice") continue;

    /* The colour boards are the ones whose tiles are all the same shape and
       differ only in accent. Read that off the board, not off the tag. */
    const items = challenge.payload.options.map((option) => option.item);
    if (!items.every((item) => item.kind === "shape" && item.accent)) continue;
    const shapes = new Set(items.map((item) => (item as ShapeItem).shape));
    if (shapes.size !== 1) continue;

    asked++;
    const accents = [
      ...new Set(items.map((item) => (item as ShapeItem).accent ?? "sage")),
    ];
    assert.equal(
      accents.length,
      2,
      `${challenge.id}: a colour board with ${accents.length} colours on it`,
    );
    assert.ok(
      safe.has(`${accents[0]}|${accents[1]}`),
      `${challenge.id}: ${accents[0]} and ${accents[1]} are not a pair a colour-blind child can tell apart`,
    );
  }

  assert.ok(asked > 20, `only ${asked} colour boards in the sample`);
});

test("sorting names a group, and exactly one tile is in it", () => {
  const byAsk = new Map<string, WordGroup>(
    WORD_GROUPS.map((group) => [`Which one is ${group.asks}?`, group]),
  );

  for (const challenge of drawn("sorting")) {
    const speech = challenge.prompt.speech;
    const payload = boardOf(challenge);
    const answer = payload.options.find((o) => o.id === payload.answerId);
    assert.ok(answer);

    /* Nothing to look at above the tiles: the question is the sentence, and
       printing anything on the stage would answer it. */
    assert.equal(challenge.prompt.display, undefined);

    if (speech === "Which one is a letter?" || speech === "Which one is a number?") {
      const wantsLetter = speech.endsWith("a letter?");

      const belongs = (item: ContentItem) =>
        wantsLetter
          ? item.kind === "text" && /^[A-Z]$/.test(item.text)
          : item.kind === "number";

      const inGroup = payload.options.filter((option) => belongs(option.item));
      assert.equal(
        inGroup.length,
        1,
        `${challenge.id}: ${inGroup.length} tiles answer "${speech}"`,
      );
      assert.equal(inGroup[0]?.id, payload.answerId);
      continue;
    }

    const group = byAsk.get(speech);
    assert.ok(group, `${challenge.id}: "${speech}" names no group`);

    const inGroup = payload.options.filter((option) =>
      group.words.includes(labelOf(option.item)),
    );
    assert.equal(
      inGroup.length,
      1,
      `${challenge.id}: ${inGroup.length} tiles answer "${speech}" — ${tileLabels(challenge).join(", ")}`,
    );
    assert.equal(inGroup[0]?.id, payload.answerId);
    assert.ok(group.words.includes(labelOf(answer.item)));
  }
});

/* 13 --------------------------------------------------------------------- */
test("every Logic challenge can be read aloud, and every one has a hint", () => {
  for (const activity of LOGIC_ACTIVITIES) {
    for (const challenge of SAMPLES.get(activity.id) ?? []) {
      assert.equal(challenge.packId, "logic");
      assert.equal(challenge.activityId, activity.id);
      assert.equal(challenge.category, "logic");
      assert.equal(challenge.activityType, activity.activityType);
      assert.ok(challenge.id.startsWith(`${activity.id}#`));

      assert.ok(
        challenge.prompt.speech.trim().endsWith("?"),
        `${challenge.id}: "${challenge.prompt.speech}" is not a question`,
      );
      assert.ok(challenge.explanation && challenge.explanation.trim().length > 0);

      /* Counted, and counted in English. A stage of one dot transcribes as
         "1 dot", and so does the sentence KIDDO says about it. */
      const said = [
        challenge.prompt.speech,
        challenge.explanation ?? "",
        challenge.hint ?? "",
        ...(challenge.prompt.display ?? []).flatMap((partOf) =>
          partOf.kind === "item" ? [spokenOf(partOf.item)] : [],
        ),
        ...itemsOf(challenge).map((item) => spokenOf(item)),
      ].join(" ");
      assert.ok(!said.includes("1 dots"), `${challenge.id}: "1 dots"`);

      /* Logic Quest's own rule needs one on every question, so the game never
         has to fall back to asking the same thing again. */
      const hint = challenge.hint ?? "";
      assert.ok(hint.trim().length > 0, `${challenge.id} has no hint`);

      /* And a hint says where to look, never what the answer is. Whole words
         only: the letter C is the answer to some patterns, and a hint is
         allowed to contain the word "come". On a connect board the answer is
         every tile in the right-hand column, so every one of them is checked. */
      const answers =
        challenge.payload.kind === "connect"
          ? linesOf(challenge).right.map((node) => labelOf(node.item))
          : [answerLabel(challenge)];
      for (const answer of answers) {
        const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        assert.ok(
          !new RegExp(`\\b${escaped}\\b`, "i").test(hint),
          `${challenge.id}: the hint "${hint}" gives away "${answer}"`,
        );
      }
    }
  }
});

/* 14 --------------------------------------------------------------------- */
test("things that go together: every line is a fact, and no board has two", () => {
  /* The table first. A pair only works if it is one-to-one *everywhere*: a
     thing that appeared twice would be two lines from one tile, and a partner
     that appeared twice would be two lines into one. Checked here rather than
     trusted, because it is the kind of thing an editor breaks by adding one
     good pair to a good list. */
  const things = PAIR_FACTS.map((entry) => entry.thing);
  const partners = PAIR_FACTS.map((entry) => entry.partner);
  assert.equal(new Set(things).size, things.length, "a thing is used twice");
  assert.equal(new Set(partners).size, partners.length, "a partner is used twice");
  for (const thing of things) {
    assert.ok(!partners.includes(thing), `${thing} is on both sides of the table`);
  }
  assert.equal(PAIR_FACTS.length, 14, "the honest count has moved");

  /* `avoid` is symmetric in effect, so it is read from both sides. A board
     may never hold two pairs where either names the other. */
  const facts = new Map(PAIR_FACTS.map((entry) => [entry.thing, entry] as const));

  for (const challenge of drawn("pair-partners")) {
    const lines = linesOf(challenge);
    const wanted = challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : 4;
    assert.equal(
      lines.pairs.length,
      wanted,
      `${challenge.id} came up short: ${lines.pairs.length} lines`,
    );

    const on = lines.pairs.map((pair) => {
      const thing = pair.leftId.replace(/^thing-/, "");
      const entry = facts.get(thing as (typeof PAIR_FACTS)[number]["thing"]);
      assert.ok(entry, `${challenge.id}: ${thing} is not in the table`);
      assert.equal(
        pair.rightId,
        `partner-${entry.partner}`,
        `${challenge.id}: ${thing} was joined to the wrong thing`,
      );
      /* A level only deals what it has taught. */
      assert.ok(
        entry.level <= challenge.level,
        `${challenge.id} deals a level ${entry.level} pair`,
      );
      return entry;
    });

    for (const [index, entry] of on.entries()) {
      for (const other of on.slice(index + 1)) {
        assert.ok(
          !entry.avoid?.includes(other.thing) && !other.avoid?.includes(entry.thing),
          `${challenge.id}: ${entry.thing} and ${other.thing} cannot share a board`,
        );
      }
    }

    /* On three lines and up nothing faces its own partner, so a child who
       joins straight across is never accidentally right. */
    if (lines.pairs.length >= 3) {
      for (const [index, pair] of lines.pairs.entries()) {
        assert.notEqual(
          lines.right[index].id,
          pair.rightId,
          `${challenge.id}: line ${index} answers itself`,
        );
      }
    }
  }
});

/* 15 --------------------------------------------------------------------- */
test("which group does it go in: every word really is in the group it joins", () => {
  const groupOf = new Map<string, WordGroup>();
  for (const group of WORD_GROUPS) {
    for (const word of group.words) groupOf.set(word, group);
  }

  for (const challenge of drawn("group-partners")) {
    const lines = linesOf(challenge);
    const wanted = challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : 4;
    assert.equal(
      lines.pairs.length,
      wanted,
      `${challenge.id} came up short: ${lines.pairs.length} lines`,
    );

    const groups: WordGroup[] = [];
    for (const pair of lines.pairs) {
      const word = pair.leftId.replace(/^word-/, "");
      const group = groupOf.get(word);
      assert.ok(group, `${challenge.id}: ${word} is in no group at all`);
      assert.equal(
        pair.rightId,
        `group-${group.id}`,
        `${challenge.id}: ${word} was joined to the wrong group`,
      );
      groups.push(group);
    }

    /* The rule that keeps a board from having two right answers: an APPLE is
       a fruit and something to eat, so those two group names never meet. */
    for (const [index, group] of groups.entries()) {
      for (const other of groups.slice(index + 1)) {
        assert.ok(
          canMix(group, other),
          `${challenge.id}: ${group.id} and ${other.id} cannot share a board`,
        );
      }
    }

    /* Every group name is one word. A tile reading "things to go" would be a
       reading test, which is why `vehicles` is not dealt here at all. */
    for (const node of lines.right) {
      const said = labelOf(node.item);
      assert.ok(!said.includes(" "), `${challenge.id}: "${said}" is not one word`);
    }
  }
});
