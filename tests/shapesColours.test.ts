import assert from "node:assert/strict";
import { test } from "node:test";

import { isTellableApart, TELLABLE_PAIRS } from "@/lib/accents";
import {
  challengeKey,
  checkAnswer,
  conceptKey,
  drawChallenges,
  labelOf,
  RELATION_WORDS,
  captionOf,
} from "@/lib/content/challenges";
import { LEVELS, resolveLevel } from "@/lib/content/difficulty";
import { SHAPES_ACTIVITIES, SHAPES_PACK } from "@/lib/content/packs/shapes";
import {
  areLookalikes,
  SHAPE_FACTS,
} from "@/lib/content/packs/shapes/shared";
import { CONTENT_REGISTRY, getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type {
  Activity,
  ActivityType,
  Challenge,
  ChoicePayload,
  ConnectPayload,
  ContentItem,
  OrderPayload,
  SceneItem,
  ShapeItem,
  ShapeName,
} from "@/lib/content/types";
import { SHAPE_OBJECT_FACTS } from "@/lib/content/packs/shapes/realWorld";
import { validatePack } from "@/lib/content/validate";
import type { Accent } from "@/lib/games/types";

/**
 * The Shapes & Colours pack, checked as content rather than as code.
 *
 * A shape question is only worth asking if a child can *see* the difference
 * the question turns on, and "generated" is the word that should make a reader
 * suspicious of that. So the tests below do not take the pack's word for
 * anything: they read the tiles off the board and work out the answer
 * themselves, from what a child would be looking at, and then check the pack
 * agrees. Every rule the pack claims — one answer, no two tiles the same, no
 * two colours a colour-blind child cannot tell apart, no shape compared to a
 * shape it cannot be compared to — is re-derived here by a second, independent
 * piece of code.
 *
 * The one that matters most is the counting test. §8 of the brief asks for a
 * *measured* number, not a claim, so `sample` below deals thousands of
 * challenges and the assertions count what actually came out.
 */

/** Draw a lot, at every level the activity offers, and keep what came out. */
function sample(activity: Activity, seeds = 120): Challenge[] {
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

const SAMPLES = new Map(SHAPES_ACTIVITIES.map((a) => [a.id, sample(a)] as const));

function drawn(id: string): Challenge[] {
  const challenges = SAMPLES.get(`shapes.${id}` as Activity["id"]) ?? [];
  assert.ok(challenges.length > 0, `nothing was drawn for shapes.${id}`);
  return challenges;
}

function everyShapesChallenge(): Challenge[] {
  return [...SAMPLES.values()].flat();
}

/**
 * Every challenge that is a board of tiles.
 *
 * Twelve of the pack's fourteen activities are a `choice`, and most of the
 * rules below — one answer, no two tiles a child cannot tell apart, no
 * comparison that cannot be made — are rules about a board of tiles. The
 * `connect` and the `order` are checked on their own terms further down
 * rather than squeezed through a helper that would have to lie about them.
 */
function everyShapesBoard(): Challenge[] {
  return everyShapesChallenge().filter(
    (challenge) => challenge.payload.kind === "choice",
  );
}

/** The board of a challenge, narrowed. */
function boardOf(challenge: Challenge): ChoicePayload {
  assert.equal(challenge.payload.kind, "choice", `${challenge.id} is not a choice`);
  return challenge.payload as ChoicePayload;
}

/** The two columns of a `connect` challenge, narrowed. */
function linesOf(challenge: Challenge): ConnectPayload {
  assert.equal(challenge.payload.kind, "connect", `${challenge.id} is not a connect`);
  return challenge.payload as ConnectPayload;
}

/** The tray of an `order` challenge, narrowed. */
function trayOf(challenge: Challenge): OrderPayload {
  assert.equal(challenge.payload.kind, "order", `${challenge.id} is not an order`);
  return challenge.payload as OrderPayload;
}

/** Every tile a challenge shows, whichever kind of challenge it is. */
function itemsOf(challenge: Challenge): ContentItem[] {
  const payload = challenge.payload;
  if (payload.kind === "choice") return payload.options.map((option) => option.item);
  if (payload.kind === "order") return payload.items.map((item) => item.item);
  if (payload.kind === "connect") {
    return [...payload.left, ...payload.right].map((node) => node.item);
  }
  throw new Error(`${challenge.id} is a ${payload.kind}, which this pack does not deal`);
}

/** The things on the stage, in order, with any gap left out. */
function stageItems(challenge: Challenge): ContentItem[] {
  return (challenge.prompt.display ?? []).flatMap((part) =>
    part.kind === "item" ? [part.item] : [],
  );
}

function tileItems(challenge: Challenge): ContentItem[] {
  return boardOf(challenge).options.map((option) => option.item);
}

function answerItem(challenge: Challenge): ContentItem {
  const payload = boardOf(challenge);
  const option = payload.options.find((o) => o.id === payload.answerId);
  assert.ok(option, `${challenge.id}: the answer is not on the board`);
  return option.item;
}

/** Every shape drawn anywhere in a challenge, tiles and stage alike. */
function shapesIn(item: ContentItem): ShapeItem[] {
  if (item.kind === "shape") return [item];
  if (item.kind === "scene") return [item.subject, item.anchor];
  return [];
}

function isShape(item: ContentItem): item is ShapeItem {
  return item.kind === "shape";
}

function isScene(item: ContentItem): item is SceneItem {
  return item.kind === "scene";
}

/** The colour a tile is actually drawn in, or none if it wears its house one. */
function accentOf(item: ContentItem): Accent | undefined {
  return item.kind === "shape" ? item.accent : undefined;
}

/* ======================================================== content: the pack */

/* 1 ---------------------------------------------------------------------- */
test("the Shapes pack is in the one content registry, once", () => {
  const packs = CONTENT_REGISTRY.filter((pack) => pack.id === "shapes");
  assert.equal(packs.length, 1, "shapes should appear exactly once");
  assert.equal(packs[0], SHAPES_PACK);

  for (const activity of SHAPES_ACTIVITIES) {
    assert.equal(
      getActivity(activity.id),
      activity,
      `${activity.id} should be reachable through the registry`,
    );
  }

  /* There is one registry, and adding to it is one line. Every pack in it —
     Math, English, Logic, Discovery — is still whole. */
  for (const pack of CONTENT_REGISTRY) {
    assert.deepEqual(validatePack(pack), [], `${pack.id} should be valid`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("all fourteen Shapes activities are present, and none needs a new engine", () => {
  const wanted: ActivityType[] = [
    "shape-recognition",
    "colour-recognition",
    "matching",
    "same-or-different",
    "size-comparison",
    "counting",
    "classifying",
    "shape-properties",
    "position",
    "symmetry",
    "patterns",
  ];
  const got = SHAPES_ACTIVITIES.map((activity) => activity.activityType);
  assert.equal(SHAPES_ACTIVITIES.length, 14);
  for (const type of wanted) {
    assert.ok(got.includes(type), `missing ${type}`);
  }

  /* Two activity types are asked twice, and both times on purpose.
     `shape-recognition` is `shapeNames` (a shape on the stage, names on the
     tiles), `shapeObjects` (a real thing on the stage, shapes on the tiles)
     and `shapePartners` (a column of things and a column of shapes);
     `size-comparison` is `size` (which of these two is bigger) and `sizeOrder`
     (put all three in order). Same knowledge, different gesture, one
     `ActivityType` — which is what the two-axis split is for. */
  assert.equal(got.filter((type) => type === "shape-recognition").length, 3);
  assert.equal(got.filter((type) => type === "size-comparison").length, 2);

  assert.deepEqual(validatePack(SHAPES_PACK), []);

  /* Fourteen activities, three mechanics, no engine of its own. This is the
     reusability claim, asserted: twelve are drawn by the `ChoiceStage` that
     already existed, one by the `OrderStage` that already existed and one by
     the `ConnectStage` that already existed. No new ChallengeKind. */
  const kinds = new Map(SHAPES_ACTIVITIES.map((a) => [a.id, a.kind] as const));
  assert.equal([...kinds.values()].filter((kind) => kind === "choice").length, 12);
  assert.deepEqual(
    [...kinds].filter(([, kind]) => kind !== "choice").sort(),
    [
      ["shapes.shape-partners", "connect"],
      ["shapes.size-order", "order"],
    ],
  );
});

/* 3 ---------------------------------------------------------------------- */
test("the pack can ask far more than a hundred *different* questions", () => {
  /* The count that matters, and the one §8 asks to be measured rather than
     claimed. `conceptKey` is the learning idea — so a board with the tiles in
     a different order is not a second question, and neither is the same
     mirror row written in different shapes. Rearrangements are deliberately
     worth nothing here. */
  const perActivity = new Map<string, number>();
  for (const [id, challenges] of SAMPLES) {
    perActivity.set(id, new Set(challenges.map(conceptKey)).size);
  }

  const total = new Set(everyShapesChallenge().map(conceptKey)).size;
  assert.ok(
    total >= 100,
    `only ${total} meaningfully different questions: ${JSON.stringify([...perActivity])}`,
  );

  /* And no single activity is a one-trick pony hiding behind the total. The
     floor is low on purpose: `same-or-different` is genuinely eight ideas —
     same or different, by shape, colour or size — and inflating it by naming
     the shapes it happens to use would be measuring the boards again. */
  for (const [id, count] of perActivity) {
    assert.ok(count >= 8, `${id} can only ask ${count} different questions`);
  }
  /* Most of them are much richer than that floor. */
  const rich = [...perActivity.values()].filter((count) => count >= 15).length;
  assert.ok(rich >= 8, `only ${rich} activities reach fifteen distinct ideas`);

  /* The measure has to be stricter than counting boards, or it is measuring
     nothing: there must be arrangements that collapse onto one concept. */
  const boards = new Set(everyShapesChallenge().map(challengeKey)).size;
  assert.ok(
    boards > total * 4,
    `conceptKey is counting boards, not concepts (${boards} boards, ${total} concepts)`,
  );
});

/* 4 ---------------------------------------------------------------------- */
test("the same seed deals the same round, a different seed does not", () => {
  for (const activity of SHAPES_ACTIVITIES) {
    for (const level of activity.levels) {
      const once = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
      const twice = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
      assert.deepEqual(once, twice, `${activity.id} is not deterministic at ${level}`);
    }

    /* And with no rng at all — the server's first render, which has to match
       the browser's first render exactly. */
    const server = drawChallenges(activity, { level: 2, count: 6 });
    const again = drawChallenges(activity, { level: 2, count: 6 });
    assert.deepEqual(server, again, `${activity.id} is unstable unseeded`);

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
test("every level from 1 to 5 resolves to something the activity can draw", () => {
  for (const activity of SHAPES_ACTIVITIES) {
    for (const level of LEVELS) {
      /* Nothing invents fake difficulty above 3: a level the pack does not
         write snaps to the nearest one it does, and still deals a full round
         rather than an empty one. */
      const resolved = resolveLevel(level, activity.levels);
      assert.ok(
        activity.levels.includes(resolved),
        `${activity.id}: level ${level} resolved to ${resolved}, which it cannot draw`,
      );

      const dealt = drawChallenges(activity, { level, count: 5, rng: createRng(3) });
      assert.equal(dealt.length, 5, `${activity.id} dealt short at level ${level}`);
      for (const challenge of dealt) {
        assert.equal(
          challenge.level,
          resolved,
          `${activity.id}: a level ${level} draw came back at ${challenge.level}`,
        );
      }
    }

    /* Levels 4 and 5 are the top level's questions, not new ones. */
    assert.deepEqual(
      drawChallenges(activity, { level: 5, count: 4, rng: createRng(9) }).map(
        challengeKey,
      ),
      drawChallenges(activity, {
        level: activity.levels[activity.levels.length - 1] ?? 3,
        count: 4,
        rng: createRng(9),
      }).map(challengeKey),
    );
  }
});

/* 6 ---------------------------------------------------------------------- */
test("every board has one answer, and no two tiles a child could not tell apart", () => {
  for (const challenge of everyShapesBoard()) {
    const payload = boardOf(challenge);

    assert.ok(payload.options.length >= 2, `${challenge.id} has one tile`);
    assert.ok(payload.options.length <= 4, `${challenge.id} has too many tiles`);

    /* Exactly one tile carries the answer id, and it is on the board. */
    const answers = payload.options.filter((o) => o.id === payload.answerId);
    assert.equal(answers.length, 1, `${challenge.id}: ${answers.length} answers`);

    /* Every tile is its own thing. Two tiles that look identical are two right
       answers or two wrong ones, and either way the board is broken. */
    const ids = payload.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${challenge.id} repeats a tile`);
    const looks = payload.options.map((o) => JSON.stringify(o.item));
    assert.equal(
      new Set(looks).size,
      looks.length,
      `${challenge.id} draws the same picture twice`,
    );

    /* And the engine's own marking agrees with the payload's answer id. */
    for (const option of payload.options) {
      assert.equal(
        checkAnswer(challenge, { kind: "choice", optionId: option.id }),
        option.id === payload.answerId,
        `${challenge.id}: ${option.id} is marked wrongly`,
      );
    }
  }
});

/* 7 ---------------------------------------------------------------------- */
test("no board asks a child to tell two colours apart that they cannot", () => {
  /* The rule, from §4: two tiles must never become indistinguishable under a
     common colour-vision deficiency. `isTellableApart` is the palette's own
     answer to that, simulated across protanopia, deuteranopia and tritanopia
     in `lib/accents.ts`. Here it is applied to every board the pack deals.
     Where a board turns on colour, every pair on it has to survive; where it
     does not, the answer still has to be tellable from each wrong tile. */
  for (const challenge of everyShapesBoard()) {
    const options = boardOf(challenge).options;
    const answer = answerItem(challenge);

    /* A board whose tiles are all the same shape is answered by colour alone,
       whatever the question says it is about. */
    const shapes = options.flatMap((option) => shapesIn(option.item));
    const oneShape = new Set(shapes.map((shape) => shape.shape)).size === 1;
    const sizes = new Set(shapes.map((shape) => shape.size ?? "full"));

    const accents = options
      .map((option) => accentOf(option.item))
      .filter((accent): accent is Accent => accent !== undefined);

    if (oneShape && sizes.size === 1 && accents.length === options.length) {
      for (const [i, left] of accents.entries()) {
        for (const right of accents.slice(i + 1)) {
          assert.ok(
            isTellableApart(left, right),
            `${challenge.id}: ${left} and ${right} on the same one-shape board`,
          );
        }
      }
    }

    /* And on every board, the answer's colour against each wrong tile's. */
    const answerAccent = accentOf(answer);
    if (answerAccent) {
      for (const option of options) {
        const other = accentOf(option.item);
        if (option.id === boardOf(challenge).answerId || !other) continue;
        if (other === answerAccent) continue;
        assert.ok(
          isTellableApart(answerAccent, other),
          `${challenge.id}: the answer is ${answerAccent} beside ${other}`,
        );
      }
    }
  }
});

/* 8 ---------------------------------------------------------------------- */
test("no question asks for a comparison that cannot be made", () => {
  for (const challenge of everyShapesBoard()) {
    const options = boardOf(challenge).options;

    /* Size. "Which one is bigger, the star or the circle?" has no answer — so
       every board that turns on size is one shape in one colour. */
    if (challenge.activityType === "size-comparison") {
      const shapes = options.flatMap((option) => shapesIn(option.item));
      const drawnSizes = new Set(shapes.map((shape) => shape.size ?? "full"));
      if (drawnSizes.size > 1) {
        const stage = stageItems(challenge).flatMap(shapesIn);
        const comparing = stage.length > 0;
        if (!comparing) {
          assert.equal(
            new Set(shapes.map((shape) => shape.shape)).size,
            1,
            `${challenge.id} compares the sizes of different shapes`,
          );
        }
        assert.equal(
          new Set(shapes.map((shape) => shape.accent ?? "house")).size,
          1,
          `${challenge.id} compares sizes across colours`,
        );
      }
    }

    /* Corners and sides. Nothing is ever asked to count the corners of a star
       or a heart, because neither has a number a child would arrive at. */
    const speech = challenge.prompt.speech;
    if (/how many (corners|sides)/i.test(speech)) {
      const subject = stageItems(challenge).flatMap(shapesIn)[0];
      assert.ok(subject, `${challenge.id} asks about a shape it does not show`);
      assert.ok(
        SHAPE_FACTS[subject.shape].countable,
        `${challenge.id} asks a child to count the ${subject.shape}`,
      );
      /* And the number offered is the true one. */
      const wanted = /sides/i.test(speech)
        ? SHAPE_FACTS[subject.shape].sides
        : SHAPE_FACTS[subject.shape].corners;
      const answer = answerItem(challenge);
      assert.equal(answer.kind, "number");
      assert.equal(
        answer.kind === "number" ? answer.value : -1,
        wanted,
        `${challenge.id}: a ${subject.shape} does not have that many`,
      );
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("naming a shape: exactly one tile is that shape, and level three is the hard one", () => {
  for (const challenge of drawn("shape-names")) {
    const match = /which one is an? (\w+)\?/i.exec(challenge.prompt.speech);
    assert.ok(match, `${challenge.id}: "${challenge.prompt.speech}"`);
    const wanted = match[1] as ShapeName;

    const tiles = tileItems(challenge).filter(isShape);
    assert.equal(tiles.length, boardOf(challenge).options.length);

    const matching = tiles.filter((tile) => tile.shape === wanted);
    assert.equal(
      matching.length,
      1,
      `${challenge.id}: ${matching.length} tiles are ${wanted}`,
    );
    assert.equal(labelOf(answerItem(challenge)), wanted);

    /* Levels one and two never put a lookalike beside the answer; level three
       always does. That is the whole difficulty curve, and it is checked from
       the tiles rather than from the code that made them. */
    const twins = tiles.filter(
      (tile) => tile.shape !== wanted && areLookalikes(tile.shape, wanted),
    );
    if (challenge.level < 3) {
      assert.equal(twins.length, 0, `${challenge.id} is harder than its level`);
    } else {
      assert.equal(twins.length, 1, `${challenge.id} is not the level three question`);
    }
  }
});

/* 10 --------------------------------------------------------------------- */
test("naming a colour: exactly one tile is that colour, and it is the answer", () => {
  const COLOUR_WORDS: Record<string, Accent> = {
    blue: "tide",
    pink: "blossom",
    yellow: "honey",
    orange: "apricot",
    green: "sprout",
  };

  for (const challenge of drawn("colour-names")) {
    const match = /which one is (\w+)\?/i.exec(challenge.prompt.speech);
    assert.ok(match, `${challenge.id}: "${challenge.prompt.speech}"`);
    const wanted = COLOUR_WORDS[match[1].toLowerCase()];
    assert.ok(wanted, `${challenge.id} asks for "${match[1]}"`);

    const tiles = tileItems(challenge).filter(isShape);
    const matching = tiles.filter((tile) => tile.accent === wanted);
    assert.equal(
      matching.length,
      1,
      `${challenge.id}: ${matching.length} tiles are ${match[1]}`,
    );
    assert.equal(accentOf(answerItem(challenge)), wanted);

    /* Every tile is coloured deliberately. A tile wearing its house colour on
       a colour board is an accident waiting to be the answer. */
    for (const tile of tiles) {
      assert.ok(tile.accent, `${challenge.id} has an uncoloured tile`);
    }
  }
});

/* 11 --------------------------------------------------------------------- */
test("matching: the other property is always a trap, never the answer", () => {
  for (const challenge of drawn("matching")) {
    const stage = stageItems(challenge).filter(isShape)[0];
    assert.ok(stage, `${challenge.id} has nothing to match against`);
    const tiles = tileItems(challenge).filter(isShape);
    const answer = answerItem(challenge);
    assert.ok(isShape(answer));

    const byShape = /same shape/i.test(challenge.prompt.speech);

    if (byShape) {
      /* One tile shares the outline, and it is the answer. */
      const same = tiles.filter((tile) => tile.shape === stage.shape);
      assert.equal(same.length, 1, `${challenge.id}: ${same.length} tiles match`);
      assert.equal(answer.shape, stage.shape);
      /* The answer is deliberately a *different* colour from the stage, and
         something else on the board wears the stage's colour — so matching by
         hue gets it wrong. */
      assert.notEqual(
        answer.accent,
        stage.accent,
        `${challenge.id}: the answer can be found by colour alone`,
      );
      assert.ok(
        tiles.some((tile) => tile.shape !== stage.shape && tile.accent === stage.accent),
        `${challenge.id} has no colour trap`,
      );
    } else {
      const same = tiles.filter((tile) => tile.accent === stage.accent);
      assert.equal(same.length, 1, `${challenge.id}: ${same.length} tiles match`);
      assert.equal(answer.accent, stage.accent);
      assert.notEqual(
        answer.shape,
        stage.shape,
        `${challenge.id}: the answer can be found by shape alone`,
      );
      assert.ok(
        tiles.some((tile) => tile.accent !== stage.accent && tile.shape === stage.shape),
        `${challenge.id} has no shape trap`,
      );
    }
  }
});

/* 12 --------------------------------------------------------------------- */
test("same or different: every box is two things, and exactly one box answers", () => {
  for (const challenge of drawn("same-different")) {
    const asksSame = /the same\?/i.test(challenge.prompt.speech);
    const boxes = tileItems(challenge);

    for (const box of boxes) {
      assert.ok(isScene(box), `${challenge.id} has a box with one thing in it`);
    }

    /* Worked out from the pictures: two shapes match when their outline,
       colour and size all match. */
    const matches = (item: ContentItem) => {
      assert.ok(isScene(item));
      const { subject, anchor } = item;
      return (
        subject.shape === anchor.shape &&
        (subject.accent ?? "house") === (anchor.accent ?? "house") &&
        (subject.size ?? "full") === (anchor.size ?? "full")
      );
    };

    const answering = boxes.filter((box) => matches(box) === asksSame);
    assert.equal(
      answering.length,
      1,
      `${challenge.id}: ${answering.length} boxes answer "${challenge.prompt.speech}"`,
    );
    assert.equal(matches(answerItem(challenge)), asksSame);
  }
});

/* 13 --------------------------------------------------------------------- */
test("size: the biggest really is the biggest, and matching really matches", () => {
  const ORDER = { small: 0, medium: 1, large: 2 } as const;

  for (const challenge of drawn("size")) {
    const tiles = tileItems(challenge).filter(isShape);
    const answer = answerItem(challenge);
    assert.ok(isShape(answer));

    const stage = stageItems(challenge).filter(isShape)[0];

    if (stage) {
      /* "Which one is the same size?" — and no tile shares the stage's shape,
         so it cannot be answered by spotting a copy. */
      assert.equal(answer.size, stage.size, `${challenge.id}: sizes differ`);
      assert.equal(
        tiles.filter((tile) => tile.size === stage.size).length,
        1,
        `${challenge.id}: more than one tile is that size`,
      );
      for (const tile of tiles) {
        assert.notEqual(
          tile.shape,
          stage.shape,
          `${challenge.id} can be answered by finding the matching shape`,
        );
      }
      continue;
    }

    const biggest = /big/i.test(challenge.prompt.speech);
    const ranked = tiles
      .map((tile) => ORDER[tile.size ?? "medium"])
      .sort((a, b) => a - b);
    const wanted = biggest ? ranked[ranked.length - 1] : ranked[0];
    assert.equal(
      ORDER[answer.size ?? "medium"],
      wanted,
      `${challenge.id}: "${challenge.prompt.speech}" picks the wrong tile`,
    );
    /* And only one tile is that size, or the question has two answers. */
    assert.equal(
      tiles.filter((tile) => ORDER[tile.size ?? "medium"] === wanted).length,
      1,
      `${challenge.id} has two tiles the same size`,
    );
  }
});

/* 14 --------------------------------------------------------------------- */
test("counting: the number on the answer tile is the number in the row", () => {
  for (const challenge of drawn("counting")) {
    const row = stageItems(challenge).filter(isShape);
    assert.ok(row.length >= 3, `${challenge.id} has nothing much to count`);
    assert.ok(row.length <= 6, `${challenge.id} has ${row.length} things to count`);

    const speech = challenge.prompt.speech;
    const byShape = /how many (\w+)s do you see/i.exec(speech);
    const byColour = /how many (\w+) ones do you see/i.exec(speech);

    const COLOUR_WORDS: Record<string, Accent> = {
      blue: "tide",
      pink: "blossom",
      yellow: "honey",
      orange: "apricot",
      green: "sprout",
    };

    /* Counted here, from the row a child is looking at. */
    const counted = byColour
      ? row.filter((item) => item.accent === COLOUR_WORDS[byColour[1].toLowerCase()])
          .length
      : row.filter((item) => item.shape === byShape?.[1]).length;

    assert.ok(byShape || byColour, `${challenge.id}: "${speech}"`);
    const answer = answerItem(challenge);
    assert.equal(answer.kind, "number");
    assert.equal(
      answer.kind === "number" ? answer.value : -1,
      counted,
      `${challenge.id}: "${speech}" over ${row.map((s) => labelOf(s)).join(", ")}`,
    );

    /* The whole row's size is on the board as a wrong answer whenever it is
       not the right one — counting everything is the mistake worth catching. */
    const numbers = tileItems(challenge).flatMap((item) =>
      item.kind === "number" ? [item.value] : [],
    );
    assert.equal(new Set(numbers).size, numbers.length);
    if (counted !== row.length) {
      assert.ok(
        numbers.includes(row.length),
        `${challenge.id} does not offer "all of them"`,
      );
    }
  }
});

/* 15 --------------------------------------------------------------------- */
test("shape and colour together: every wrong tile is wrong in exactly one way", () => {
  const COLOUR_WORDS: Record<string, Accent> = {
    blue: "tide",
    pink: "blossom",
    yellow: "honey",
    orange: "apricot",
    green: "sprout",
  };

  for (const challenge of drawn("classify")) {
    const match = /which one is the (\w+) (\w+)\?/i.exec(challenge.prompt.speech);
    assert.ok(match, `${challenge.id}: "${challenge.prompt.speech}"`);
    const accent = COLOUR_WORDS[match[1].toLowerCase()];
    const shape = match[2] as ShapeName;

    const tiles = tileItems(challenge).filter(isShape);
    const answering = tiles.filter(
      (tile) => tile.shape === shape && tile.accent === accent,
    );
    assert.equal(answering.length, 1, `${challenge.id}: ${answering.length} answers`);

    /* Both single-property traps are present, so neither half of the question
       can be skipped. */
    assert.ok(
      tiles.some((tile) => tile.shape === shape && tile.accent !== accent),
      `${challenge.id} has no colour trap`,
    );
    assert.ok(
      tiles.some((tile) => tile.shape !== shape && tile.accent === accent),
      `${challenge.id} has no shape trap`,
    );

    /* Never at level one: two properties at once is a level two idea. */
    assert.ok(challenge.level >= 2, `${challenge.id} is at level ${challenge.level}`);
  }
});

/* 16 --------------------------------------------------------------------- */
test("properties: the fact asked for is true of the answer and false of the rest", () => {
  for (const challenge of drawn("properties")) {
    const speech = challenge.prompt.speech;
    if (/how many/i.test(speech)) continue; /* covered by test 8 */

    const tiles = tileItems(challenge).filter(isShape);
    const answer = answerItem(challenge);
    assert.ok(isShape(answer));

    const holds = /is round/i.test(speech)
      ? (shape: ShapeName) => SHAPE_FACTS[shape].round
      : /straight sides/i.test(speech)
        ? /* Straight sides is a fact about the sides, not the negation of
             round: the heart is not round, yet every side KIDDO draws on it
             curves — so "not round" was the exact equivalence that once let
             a heart be the answer here. */
          (shape: ShapeName) => SHAPE_FACTS[shape].sides > 0
        : (() => {
            const corners = Number(/(\d+) corners/i.exec(speech)?.[1]);
            assert.ok(Number.isFinite(corners), `${challenge.id}: "${speech}"`);
            return (shape: ShapeName) => SHAPE_FACTS[shape].corners === corners;
          })();

    const answering = tiles.filter((tile) => holds(tile.shape));
    assert.equal(
      answering.length,
      1,
      `${challenge.id}: ${answering.length} tiles answer "${speech}"`,
    );
    assert.ok(holds(answer.shape), `${challenge.id}: the answer does not hold`);
  }
});

/* 17 --------------------------------------------------------------------- */
test("where things are: one picture shows it, and lookalike words never meet", () => {
  /* Two words that draw nearly the same picture must never be offered against
     each other — "beside" and "to the right of" are the same arrangement, and
     a board offering both has two right answers however carefully it is
     drawn. */
  const SAME_PICTURE: readonly (readonly [string, string])[] = [
    ["beside", "right"],
    ["beside", "left"],
    ["near", "beside"],
  ];

  for (const challenge of drawn("position")) {
    const boxes = tileItems(challenge).filter(isScene);

    if (boxes.length === 0) {
      /* The turned-around form: one picture on the stage, shapes on the tiles.
         The anchor is on the board too, so the relation has to be understood
         rather than guessed from "the other one". */
      const scene = stageItems(challenge).filter(isScene)[0];
      assert.ok(scene, `${challenge.id} shows no picture`);
      const answer = answerItem(challenge);
      assert.ok(isShape(answer));
      assert.equal(answer.shape, scene.subject.shape);
      assert.ok(
        tileItems(challenge)
          .filter(isShape)
          .some((tile) => tile.shape === scene.anchor.shape),
        `${challenge.id} does not offer the anchor as a wrong answer`,
      );
      continue;
    }

    /* Every box shows the same two shapes; only the word changes. */
    const subjects = new Set(boxes.map((box) => box.subject.shape));
    const anchors = new Set(boxes.map((box) => box.anchor.shape));
    assert.equal(subjects.size, 1, `${challenge.id} changes the subject between boxes`);
    assert.equal(anchors.size, 1, `${challenge.id} changes the anchor between boxes`);
    assert.notEqual(
      [...subjects][0],
      [...anchors][0],
      `${challenge.id} puts a shape next to itself`,
    );

    const relations = boxes.map((box) => box.relation);
    assert.equal(new Set(relations).size, relations.length);
    for (const [a, b] of SAME_PICTURE) {
      assert.ok(
        !(relations.includes(a as never) && relations.includes(b as never)),
        `${challenge.id} offers "${a}" against "${b}"`,
      );
    }

    /* And the answer is the box whose relation the question names. */
    const answer = answerItem(challenge);
    assert.ok(isScene(answer));
    assert.ok(
      challenge.prompt.speech.includes(RELATION_WORDS[answer.relation]),
      `${challenge.id}: "${challenge.prompt.speech}" does not ask for ${answer.relation}`,
    );
  }
});

/* 18 --------------------------------------------------------------------- */
test("symmetry: the answer is the only tile that makes the row read both ways", () => {
  for (const challenge of drawn("symmetry")) {
    const parts = challenge.prompt.display ?? [];
    const gap = parts.findIndex((part) => part.kind === "blank");
    assert.ok(gap >= 0, `${challenge.id} has no gap`);
    assert.equal(
      parts.filter((part) => part.kind === "blank").length,
      1,
      `${challenge.id} has more than one gap`,
    );

    /* The middle of an odd row is never the gap: `● ▲ ? ▲ ●` is mirrored
       whatever goes in it, so it is not a question. */
    if (parts.length % 2 === 1) {
      assert.notEqual(gap, (parts.length - 1) / 2, `${challenge.id} has no answer`);
    }

    const mirror = parts[parts.length - 1 - gap];
    assert.equal(mirror.kind, "item");
    const wanted = mirror.kind === "item" ? JSON.stringify(mirror.item) : "";

    /* Exactly one tile completes it, worked out from the row rather than from
       the pack's own answer id. */
    const fits = boardOf(challenge).options.filter(
      (option) => JSON.stringify(option.item) === wanted,
    );
    assert.equal(fits.length, 1, `${challenge.id}: ${fits.length} tiles fit the gap`);
    assert.equal(fits[0].id, boardOf(challenge).answerId);

    /* Not Logic's repeat: this row's gap moves, and Logic's never does. */
    assert.ok(challenge.level >= 2, `${challenge.id} is at level ${challenge.level}`);
  }
});

/* 19 --------------------------------------------------------------------- */
test("patterns: one object throughout, one property taking turns", () => {
  for (const challenge of drawn("patterns")) {
    const row = stageItems(challenge).filter(isShape);
    assert.ok(row.length >= 4, `${challenge.id} is too short to show a repeat`);

    /* The claim that keeps this out of Logic Quest's territory, asserted: the
       object never changes, only what it looks like does. Logic's patterns are
       written in different symbols and could never satisfy this. */
    const shapes = new Set([
      ...row.map((item) => item.shape),
      ...tileItems(challenge).filter(isShape).map((item) => item.shape),
    ]);
    assert.equal(
      shapes.size,
      1,
      `${challenge.id} changes the object — that is Logic's pattern, not this one`,
    );

    /* Exactly one property varies. */
    const accents = new Set(row.map((item) => item.accent ?? "house"));
    const sizes = new Set(row.map((item) => item.size ?? "full"));
    assert.ok(
      (accents.size > 1) !== (sizes.size > 1),
      `${challenge.id} varies ${accents.size > 1 ? "and" : "neither"} colour nor size cleanly`,
    );

    /* The gap is at the end, and the answer continues the repeat. Worked out
       here by finding the shortest unit that explains the row. */
    const parts = challenge.prompt.display ?? [];
    assert.equal(parts[parts.length - 1].kind, "blank", `${challenge.id}'s gap moved`);

    const keys = row.map((item) => `${item.accent ?? "-"}/${item.size ?? "-"}`);
    const unit = [1, 2, 3].find((length) =>
      keys.every((key, index) => key === keys[index % length]),
    );
    assert.ok(unit, `${challenge.id} has no repeating unit: ${keys.join(" ")}`);

    const answer = answerItem(challenge);
    assert.ok(isShape(answer));
    assert.equal(
      `${answer.accent ?? "-"}/${answer.size ?? "-"}`,
      keys[keys.length % unit],
      `${challenge.id}: the answer does not continue the pattern`,
    );
  }
});

/* 20 --------------------------------------------------------------------- */
test("every challenge can be drawn, read aloud, and has a hint that hides the answer", () => {
  for (const activity of SHAPES_ACTIVITIES) {
    for (const challenge of SAMPLES.get(activity.id) ?? []) {
      assert.equal(challenge.packId, "shapes");
      assert.equal(challenge.activityId, activity.id);
      assert.equal(challenge.activityType, activity.activityType);
      assert.ok(challenge.id.startsWith(`${activity.id}#`));

      assert.ok(
        challenge.prompt.speech.trim().endsWith("?"),
        `${challenge.id}: "${challenge.prompt.speech}" is not a question`,
      );
      assert.ok(challenge.explanation && challenge.explanation.trim().length > 0);

      /* Renderable: every item is one the engine knows how to draw, and every
         shape is one the pack has a path for. `picture` is on the list for
         `shapeObjects` and `shapePartners`, the two activities that ask what
         shape a real thing is — the picture is the *question* on those boards
         and never the answer, and `ContentItemView` has drawn one for General
         Knowledge since long before this pack wanted one. */
      for (const item of [...stageItems(challenge), ...itemsOf(challenge)]) {
        assert.ok(
          ["shape", "scene", "number", "count", "text", "picture"].includes(item.kind),
          `${challenge.id} holds a ${item.kind}, which this pack does not draw`,
        );
        for (const shape of shapesIn(item)) {
          assert.ok(SHAPE_FACTS[shape.shape], `unknown shape ${shape.shape}`);
        }
        /* Nothing this pack draws prints its own name underneath it: a caption
           saying "blue circle" answers half the questions here outright. */
        assert.equal(
          captionOf(item),
          "",
          `${challenge.id} captions a tile with "${captionOf(item)}"`,
        );
        /* But a screen reader still gets words for it. */
        assert.ok(labelOf(item).trim().length > 0, `${challenge.id} has a silent tile`);
      }

      /* Every question has somewhere to point after a wrong answer — the game
         reads it out, so a missing one would mean asking the same thing twice. */
      const hint = challenge.hint ?? "";
      assert.ok(hint.trim().length > 0, `${challenge.id} has no hint`);

      /* And a hint says where to look, never anything the question has not
         already said. Two things make that stricter than "the hint must not
         contain the answer":
         
         A question that names its own answer — "which one is a square?" — has
         no secret left to keep, and its hint is free to say *square has four
         equal sides*, which is the whole nudge. What must never leak is a fact
         the child did not already have.
         
         A scene's secret is not its shapes. Every box in "which one shows the
         star above the box?" holds the same star and the same box, so naming
         them gives nothing away; the *relation* is the answer, and that is
         what the hint is checked against. */
      /* On a `connect` board every tile in the right-hand column is an
         answer, so every one of them is checked. On an `order` board the
         answer is an arrangement rather than a tile — there is no word the
         hint could leak, and what the prompt says about which end to start
         from it says out loud on purpose. */
      const answers: ContentItem[] =
        challenge.payload.kind === "connect"
          ? linesOf(challenge).right.map((node) => node.item)
          : challenge.payload.kind === "order"
            ? []
            : [answerItem(challenge)];

      for (const answer of answers) {
        const secret = isScene(answer)
          ? RELATION_WORDS[answer.relation].replace(/ the$/, "")
          : labelOf(answer);
        const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const leaks = new RegExp(`\\b${escaped}\\b`, "i");
        assert.ok(
          !leaks.test(hint) || leaks.test(challenge.prompt.speech),
          `${challenge.id}: the hint "${hint}" gives away "${secret}"`,
        );
      }
    }
  }
});

/* 21 --------------------------------------------------------------------- */
test("nothing in the pack is scored, timed, or unkind", () => {
  /* Deliberately not the word "points": a star has points, and a hint saying
     so is the opposite of unkind. What is being looked for is the vocabulary
     of scoring and of running out of time, neither of which KIDDO has. */
  const UNKIND =
    /\b(wrong|nope|incorrect|fail|failed|silly|stupid|score|scored|lives|hurry|time'?s up|too slow)\b/i;

  for (const challenge of everyShapesChallenge()) {
    for (const words of [
      challenge.prompt.speech,
      challenge.explanation ?? "",
      challenge.hint ?? "",
    ]) {
      assert.ok(
        !UNKIND.test(words),
        `${challenge.id} says "${words}"`,
      );
    }
  }

  /* The palette pairs the pack leans on are the ones that survive colour
     blindness, and there are five of them. If that list ever shrinks, the
     boards above stop being fair — so it is asserted here rather than assumed. */
  assert.ok(TELLABLE_PAIRS.length >= 5);
  for (const [left, right] of TELLABLE_PAIRS) {
    assert.ok(isTellableApart(left, right), `${left}/${right} is not tellable`);
  }
});

/* 22 --------------------------------------------------------------------- */
test("every sentence the pack builds reads like English", () => {
  /* Sentences here are assembled from parts — "That one is ${aOrAn(shape)},
     and it is ${word}" — and an assembled sentence goes wrong in ways an
     authored one cannot. "That one is a oval" is the whole failure mode, and
     it is invisible in a diff: the bug is in a template that reads fine.
     This is also what a screen reader says out loud, word for word. */
  const SLIPS: readonly [RegExp, string][] = [
    [/\ba [aeiou]/i, `"a" before a vowel — say "an"`],
    [/\ban [^aeiou\s]/i, `"an" before a consonant — say "a"`],
    [/ {2,}/, "a double space"],
    [/\s[.,?!]/, "a space before punctuation"],
    [/^\s|\s$/, "space at the edge"],
    [/\ba a\b|\bthe the\b|\bis is\b/i, "a doubled word"],
  ];

  for (const challenge of everyShapesChallenge()) {
    const spoken = [
      challenge.prompt.speech,
      challenge.explanation ?? "",
      challenge.hint ?? "",
      /* The tile labels too: they are what a screen reader reads instead of
         the picture, so "a oval and a square" is heard by exactly the child
         who has no other way to answer. */
      ...itemsOf(challenge).map(labelOf),
      ...stageItems(challenge).map(labelOf),
    ];

    for (const sentence of spoken) {
      for (const [slip, why] of SLIPS) {
        assert.ok(
          !slip.test(sentence),
          `${challenge.id}: ${why} — ${JSON.stringify(sentence)}`,
        );
      }
    }
  }
});

/* 23 --------------------------------------------------------------------- */
test("shapes in the world: the shape offered is the shape the thing really is", () => {
  /* The table first. Every fact has to name a shape the pack can draw, and
     nothing may be listed twice — two facts about the same thing would put
     the same picture in both columns of a connect board. */
  const names = SHAPE_OBJECT_FACTS.map((thing) => thing.name);
  assert.equal(new Set(names).size, names.length, "a thing is listed twice");
  assert.equal(SHAPE_OBJECT_FACTS.length, 14, "the honest count has moved");
  for (const thing of SHAPE_OBJECT_FACTS) {
    assert.ok(SHAPE_FACTS[thing.shape], `${thing.name} is ${thing.shape}, which is not a shape`);
    for (const barred of thing.avoid ?? []) {
      assert.ok(SHAPE_FACTS[barred], `${thing.name} avoids ${barred}, which is not a shape`);
      assert.notEqual(barred, thing.shape, `${thing.name} avoids its own shape`);
    }
  }

  const shapeOf = new Map(SHAPE_OBJECT_FACTS.map((thing) => [thing.name, thing] as const));
  const asked = (challenge: Challenge) => {
    const said = challenge.prompt.speech.replace(/^What shape is an? /, "").replace("?", "");
    const thing = shapeOf.get(said);
    assert.ok(thing, `${challenge.id}: "${said}" is not in the table`);
    return thing;
  };

  /* The choice version: exactly one tile is the right shape, and no tile is a
     shape the fact says it must never be asked against. */
  for (const challenge of drawn("shape-objects")) {
    const thing = asked(challenge);
    const shapes = tileItems(challenge).filter(isShape).map((item) => item.shape);
    assert.equal(shapes.length, boardOf(challenge).options.length, "a tile is not a shape");
    assert.equal(
      shapes.filter((shape) => shape === thing.shape).length,
      1,
      `${challenge.id}: ${thing.name} is not on the board exactly once`,
    );
    for (const barred of thing.avoid ?? []) {
      assert.ok(
        !shapes.includes(barred),
        `${challenge.id}: ${barred} could argue with ${thing.name}`,
      );
    }
    assert.ok(thing.level <= challenge.level, `${challenge.id} deals a harder fact`);

    /* Level three puts one lookalike on the board on purpose, and the levels
       below never do: that is the whole difficulty lever. */
    const traps = shapes.filter((shape) => areLookalikes(shape, thing.shape));
    if (challenge.level >= 3) {
      assert.equal(traps.length, 1, `${challenge.id}: ${traps.length} lookalikes`);
    } else {
      assert.equal(traps.length, 0, `${challenge.id}: a lookalike below level three`);
    }
  }

  /* The connect version: same facts, and a full board every time. */
  const byShapeId = new Map<string, (typeof SHAPE_OBJECT_FACTS)[number]>(
    SHAPE_OBJECT_FACTS.map((thing) => [`thing-${thing.name.replace(/\s+/g, "-")}`, thing]),
  );
  for (const challenge of drawn("shape-partners")) {
    const lines = linesOf(challenge);
    const wanted = challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : 4;
    assert.equal(lines.pairs.length, wanted, `${challenge.id} came up short`);

    const on = lines.pairs.map((pair) => {
      const thing = byShapeId.get(pair.leftId);
      assert.ok(thing, `${challenge.id}: ${pair.leftId} is not in the table`);
      assert.equal(pair.rightId, `shape-${thing.shape}`, `${challenge.id}: wrong shape`);
      assert.ok(thing.level <= challenge.level, `${challenge.id} deals a harder fact`);
      return thing;
    });

    /* A bijection: no two things on one board share a shape, and nothing is
       ever asked beside a shape it could fairly claim. */
    const used = on.map((thing) => thing.shape);
    assert.equal(new Set(used).size, used.length, `${challenge.id}: two lines, one shape`);
    for (const [index, thing] of on.entries()) {
      for (const other of on.slice(index + 1)) {
        assert.ok(
          !thing.avoid?.includes(other.shape) && !other.avoid?.includes(thing.shape),
          `${challenge.id}: ${thing.name} and ${other.name} cannot share a board`,
        );
      }
    }

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

/* 24 --------------------------------------------------------------------- */
test("smallest to biggest: one shape, three sizes, and a tray worth sorting", () => {
  for (const challenge of drawn("size-order")) {
    const tray = trayOf(challenge);
    assert.equal(tray.items.length, 3, `${challenge.id} is not three cards`);

    /* One shape, one colour. The only thing that differs between the cards is
       how much room each takes up — otherwise the board could be answered by
       sorting on something that is not the question. */
    const shapes = tray.items.map((item) => item.item).filter(isShape);
    assert.equal(shapes.length, 3, `${challenge.id}: a card is not a shape`);
    assert.equal(
      new Set(shapes.map((shape) => shape.shape)).size,
      1,
      `${challenge.id} mixes shapes`,
    );
    assert.equal(
      new Set(shapes.map((shape) => shape.accent ?? "house")).size,
      1,
      `${challenge.id} mixes colours`,
    );
    assert.equal(
      new Set(shapes.map((shape) => shape.size)).size,
      3,
      `${challenge.id} does not show three sizes`,
    );

    /* The answer really is the sizes in order, and which end it starts from is
       what the prompt just said out loud. */
    const sizes = tray.answerOrder.map((id) => id.split("-")[1]);
    const biggestFirst = challenge.prompt.speech.includes("biggest");
    assert.deepEqual(
      sizes,
      biggestFirst ? ["large", "medium", "small"] : ["small", "medium", "large"],
      `${challenge.id}: ${sizes.join(", ")} is not an order`,
    );
    assert.equal(biggestFirst, challenge.level >= 3, `${challenge.id}: wrong way round`);

    /* And the tray is never handed over already sorted. */
    const laid = tray.items.map((item) => item.id);
    const moved = laid.filter((id, index) => id !== tray.answerOrder[index]).length;
    assert.ok(
      moved >= (challenge.level <= 1 ? 2 : 3),
      `${challenge.id}: only ${moved} cards had moved`,
    );

    /* Every card named in the answer is on the tray, and nothing else is. */
    assert.deepEqual([...laid].sort(), [...tray.answerOrder].sort());
  }
});
