import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  captionOf,
  challengeKey,
  checkAnswer,
  checkStep,
  conceptKey,
  drawChallenges,
  labelOf,
} from "@/lib/content/challenges";
import { LEVELS, resolveLevel } from "@/lib/content/difficulty";
import {
  GENERAL_KNOWLEDGE_ACTIVITIES,
  GENERAL_KNOWLEDGE_PACK,
} from "@/lib/content/packs/general-knowledge";
import { BABY_FACTS } from "@/lib/content/packs/general-knowledge/animals";
import { CONTENT_REGISTRY } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type {
  Activity,
  Challenge,
  ChoicePayload,
  ConnectPair,
  ContentItem,
} from "@/lib/content/types";
import { validatePack } from "@/lib/content/validate";

/**
 * The General Knowledge pack, checked as *knowledge* rather than as code.
 *
 * A general knowledge question has a failure mode that a maths question does
 * not: it can be well-formed, well-rendered, perfectly generated — and wrong.
 * Or worse, it can have two right answers and only accept one, which teaches a
 * child that their correct answer was a mistake. No amount of asking the
 * generator whether it is happy will catch either.
 *
 * So the tests below re-derive the answers from tables written by hand, from
 * what is actually true of the world: cows say moo, a baby frog is a tadpole,
 * a penguin lives in the snow, a rock is not alive, a potato is a vegetable.
 * The pack is then checked against those tables. Where the risk is ambiguity
 * rather than error, a second hand table lists the things that would *also* be
 * a fair answer — an owl is a bird, a police car is a car, a sunflower is a
 * flower — and no board is allowed to hold one beside the question that asks
 * for the category.
 *
 * The counting test measures rather than claims: §10 of the brief asks for a
 * real number of distinct concepts, so `sample` below deals tens of thousands
 * of challenges and the assertions count what actually came out.
 */

/** Draw a lot, at every level the activity offers, and keep what came out. */
function sample(activity: Activity, seeds = 60): Challenge[] {
  const drawn: Challenge[] = [];
  for (const level of activity.levels) {
    for (let seed = 0; seed < seeds; seed++) {
      drawn.push(
        ...drawChallenges(activity, { level, count: 6, rng: createRng(seed) }),
      );
    }
  }
  return drawn;
}

const PREFIX = "general-knowledge.";

function short(id: string): string {
  return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id;
}

const SAMPLES = new Map(
  GENERAL_KNOWLEDGE_ACTIVITIES.map((a) => [short(a.id), sample(a)] as const),
);

function drawn(id: string): Challenge[] {
  const challenges = SAMPLES.get(id) ?? [];
  assert.ok(challenges.length > 0, `nothing was drawn for ${PREFIX}${id}`);
  return challenges;
}

function everyChallenge(): Challenge[] {
  return [...SAMPLES.values()].flat();
}

/**
 * Every challenge that is a `choice`, which is all but two activities.
 *
 * `homePartners` and `babyPartners` join two columns instead of picking one of
 * four, so neither has an answer tile, distractors or a board to count. The
 * questions below that are really about *a choice board* ask this; the ones
 * about whether the pack is kind, readable and in its own subject ask
 * `everyChallenge`, and cover all thirty.
 */
function everyBoard(): Challenge[] {
  return everyChallenge().filter((c) => c.payload.kind === "choice");
}

/** The board of a challenge, narrowed. */
function boardOf(challenge: Challenge): ChoicePayload {
  assert.equal(challenge.payload.kind, "choice", `${challenge.id} is not a choice`);
  return challenge.payload as ChoicePayload;
}

/** Everything a child can see on a board, whichever kind of board it is. */
function piecesOf(challenge: Challenge): ContentItem[] {
  const payload = challenge.payload;
  if (payload.kind === "choice") return payload.options.map((o) => o.item);
  if (payload.kind === "connect") {
    return [...payload.left, ...payload.right].map((node) => node.item);
  }
  if (payload.kind === "order") return payload.items.map((item) => item.item);
  return payload.pairs.flatMap((pair) => [pair.left, pair.right]);
}

function answerOf(challenge: Challenge): ContentItem {
  const board = boardOf(challenge);
  const option = board.options.find((o) => o.id === board.answerId);
  assert.ok(option, `${challenge.id} has no tile matching its answer id`);
  return option.item;
}

function distractorsOf(challenge: Challenge): ContentItem[] {
  const board = boardOf(challenge);
  return board.options.filter((o) => o.id !== board.answerId).map((o) => o.item);
}

function tagOf(challenge: Challenge, prefix: string): string {
  const tag = (challenge.meta?.tags ?? []).find((t) => t.startsWith(prefix));
  assert.ok(tag, `${challenge.id} has no ${prefix} tag`);
  return tag.slice(prefix.length);
}

const ideaOf = (challenge: Challenge) => tagOf(challenge, "concept:");
const familyOf = (challenge: Challenge) => tagOf(challenge, "family:");

/** "an ice cube" and "The Ice Cube" are the same thing to a fact table. */
function plain(label: string): string {
  return label.trim().toLowerCase().replace(/^(a|an|the)\s+/, "");
}

const stem = (w: string) => w.replace(/ies$/, "y").replace(/(es|s)$/, "");
const wordsIn = (text: string) =>
  text.toLowerCase().split(/[^a-z']+/).filter(Boolean);

/** Words too common to count as giving anything away. */
const STOP = new Set([
  "a", "an", "the", "of", "and", "or", "in", "on", "at", "is", "it", "you",
  "your", "to", "with", "one", "big", "little", "small", "that", "this",
  "for", "up", "down", "out",
]);

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* ------------------------------------------------------------ the pack */

test("the General Knowledge pack is in the one content registry, once", () => {
  const found = CONTENT_REGISTRY.filter((p) => p.id === "general-knowledge");
  assert.equal(found.length, 1, "the pack should be registered exactly once");
  assert.equal(found[0], GENERAL_KNOWLEDGE_PACK);
  assert.equal(GENERAL_KNOWLEDGE_PACK.accent, "sage");

  /* Every pack in the registry still validates, this one included. */
  for (const pack of CONTENT_REGISTRY) {
    assert.deepEqual(validatePack(pack), [], `${pack.id} does not validate`);
  }
});

test("all thirty-four activities are present, and none needs a new engine", () => {
  const activities = GENERAL_KNOWLEDGE_PACK.activities;
  assert.equal(activities.length, 34);
  assert.equal(GENERAL_KNOWLEDGE_ACTIVITIES.length, 34);

  const ids = activities.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "two activities share an id");
  for (const id of ids) assert.ok(id.startsWith(PREFIX), `${id} is misfiled`);

  /* §7: twenty-eight `choice` activities, four `connect` and two `order`, and
     five of the six non-choices are a table this pack already had, asked a
     different way — `home-partners` is `animal-homes`, `animal-babies` is
     `baby-animals`, `helper-partners` is `helper-tools`, `body-partners` is
     `senses`, and `day-order` is the four parts of `day-and-night` asked as a
     run. Only `life-cycles` is new outright. All three kinds already had an
     engine before this pack existed, so "no new engine" still holds: what is
     asserted is that nothing here has invented a *fourth* way to answer. */
  const kinds = activities.map((a) => a.kind);
  assert.equal(kinds.filter((k) => k === "choice").length, 28);
  assert.deepEqual(
    activities.filter((a) => a.kind === "connect").map((a) => a.id).sort(),
    [
      "general-knowledge.animal-babies",
      "general-knowledge.body-partners",
      "general-knowledge.helper-partners",
      "general-knowledge.home-partners",
    ],
  );
  assert.deepEqual(
    activities.filter((a) => a.kind === "order").map((a) => a.id).sort(),
    ["general-knowledge.day-order", "general-knowledge.life-cycles"],
  );
  assert.deepEqual([...new Set(kinds)].sort(), ["choice", "connect", "order"]);

  /* And the activities that share an `ActivityType` really are two ways to
     play one thing, not two different things that got the same name. */
  const BOTH_WAYS = {
    "animal-habitats": ["choice", "connect"],
    "baby-animals": ["choice", "connect"],
    community: ["choice", "connect"],
    "body-parts": ["choice", "connect"],
    "day-and-night": ["choice", "order"],
  } as const;
  for (const [type, kinds] of Object.entries(BOTH_WAYS)) {
    const both = activities.filter((a) => a.activityType === type);
    assert.ok(both.length >= 2, `${type} is only asked one way`);
    assert.deepEqual(
      [...new Set(both.map((a) => a.kind))].sort(),
      [...kinds],
      `${type} should be askable both ways`,
    );
  }

  /* §4: no piece is a shape, a number or a letter, so nothing here can drift
     into another quest's territory — on either kind of board.

     Two documented exceptions, and both are a refusal rather than a loophole.

     `animal-babies` writes the baby's *name* on its right-hand tiles, because
     there is no picture of a lamb a child can tell apart from a picture of a
     sheep and the emoji for a puppy is a smaller dog. A board with two tiles
     that look the same has two right answers, which is worse than a board
     with a word on it — so the word is deliberate.

     `body-partners` writes what each part *does* — SEE, HEAR, SMELL — because
     there is no honest picture of smelling. A flower beside a nose can be
     seen and touched as well, so the picture board every early-years workbook
     draws has no single right answer; only sight and hearing have things in
     the world no other part can reach. The picture-and-pick version of the
     same objective is `senses`, which is where a child who cannot read yet
     meets it.

     In both cases the assertion below is that the tile is still a named,
     uncaptioned tile like every other one. */
  const WORDS_ALLOWED = new Set([
    "general-knowledge.animal-babies",
    "general-knowledge.body-partners",
  ]);

  for (const challenge of everyChallenge()) {
    const words = WORDS_ALLOWED.has(challenge.activityId);
    for (const item of piecesOf(challenge)) {
      assert.ok(
        item.kind === "picture" || (words && item.kind === "text"),
        `${challenge.id} shows a ${item.kind}`,
      );
      assert.equal(captionOf(item), "", "a tile should carry no caption");
      assert.ok(labelOf(item).trim().length > 0, `${challenge.id} has a nameless tile`);
    }
  }
});

/* --------------------------------------------------------------- counting */

test("the pack knows far more than a hundred *different* things", () => {
  const all = everyChallenge();
  const concepts = new Set(all.map(conceptKey));

  assert.ok(
    concepts.size >= 200,
    `only ${concepts.size} distinct concepts; the brief asks for 100+, ideally 200+`,
  );

  /* Shuffling headroom: one fact should be dealable a great many ways, so a
     child meets it again without meeting the same picture of it again.

     Measured over the choice activities only, and the reason is worth writing
     down. A choice concept is one fact — "a cow lives on a farm" — and the
     board around it is three or four tiles out of a family of a dozen, which
     is hundreds of arrangements of the same idea. A connect concept is a
     *set* of facts, so the set choice is itself most of the shuffling and
     what is left over is only the arrangement: a two-pair board has exactly
     two orders, and no amount of content will make that twenty. The two
     numbers measure different things and averaging them would hide both. */
  const chosen = everyBoard();
  const choiceConcepts = new Set(chosen.map(conceptKey));
  const choiceBoards = new Set(chosen.map(challengeKey));
  assert.ok(
    choiceBoards.size > choiceConcepts.size * 20,
    `${choiceBoards.size} boards from ${choiceConcepts.size} concepts is not enough shuffling`,
  );

  /* The connect activity's own version of the same promise, and it is a
     different sentence. `challengeKey` sorts a connect board's joins before
     comparing, because the set of joins *is* the question — so for this
     activity "same board" and "same concept" agree by design, and asserting
     one is bigger than the other would be asserting the engine is broken.

     What is worth proving is that the arrangements really do collapse: the
     same three animals, dealt against a differently shuffled column of
     places, has to be one thing to have learned and not two. */
  const joined = all.filter((c) => c.payload.kind === "connect");
  assert.ok(joined.length > 0, "the pack has no connect challenges at all");

  const arrangements = new Map<string, Set<string>>();
  for (const challenge of joined) {
    if (challenge.payload.kind !== "connect") continue;
    const key = conceptKey(challenge);
    if (!arrangements.has(key)) arrangements.set(key, new Set());
    arrangements
      .get(key)!
      .add(challenge.payload.right.map((node) => node.id).join(","));
  }
  const reshuffled = [...arrangements.values()].filter((set) => set.size > 1);
  assert.ok(
    reshuffled.length > 0,
    "every connect set was only ever dealt one way round",
  );
  assert.equal(
    new Set(joined.map(challengeKey)).size,
    arrangements.size,
    "a reshuffled connect board should not read as a new board",
  );

  /* No activity is a token entry: each carries real content of its own. */
  for (const [id, challenges] of SAMPLES) {
    const own = new Set(challenges.map(conceptKey));
    assert.ok(own.size >= 6, `${id} only knows ${own.size} things`);
  }
});

test("the same seed deals the same round, a different seed does not", () => {
  for (const activity of GENERAL_KNOWLEDGE_ACTIVITIES) {
    const once = drawChallenges(activity, { level: 2, count: 5, rng: createRng(7) });
    const again = drawChallenges(activity, { level: 2, count: 5, rng: createRng(7) });
    assert.deepEqual(
      once.map((c) => c.id),
      again.map((c) => c.id),
      `${activity.id} is not deterministic`,
    );
    assert.deepEqual(
      once.map((c) => piecesOf(c).map(labelOf)),
      again.map((c) => piecesOf(c).map(labelOf)),
      `${activity.id} shuffles its tiles differently on the same seed`,
    );
  }

  const a = GENERAL_KNOWLEDGE_ACTIVITIES.map((act) =>
    drawChallenges(act, { level: 2, count: 5, rng: createRng(1) }).map((c) => c.id).join(),
  ).join("|");
  const b = GENERAL_KNOWLEDGE_ACTIVITIES.map((act) =>
    drawChallenges(act, { level: 2, count: 5, rng: createRng(2) }).map((c) => c.id).join(),
  ).join("|");
  assert.notEqual(a, b, "two different seeds dealt an identical pack");
});

test("every level from 1 to 5 resolves to something the activity can draw", () => {
  for (const activity of GENERAL_KNOWLEDGE_ACTIVITIES) {
    assert.ok(activity.levels.length > 0, `${activity.id} offers no levels`);
    const top = Math.max(...activity.levels);
    for (const level of LEVELS) {
      const resolved = resolveLevel(level, activity.levels);
      assert.ok(
        activity.levels.includes(resolved),
        `${activity.id} resolved level ${level} to ${resolved}, which it does not offer`,
      );
      const drawnAt = drawChallenges(activity, {
        level: resolved,
        count: 3,
        rng: createRng(level),
      });
      assert.equal(drawnAt.length, 3, `${activity.id} could not fill level ${level}`);
    }
    /* §6: 4 and 5 are not new difficulty, they land on the hardest real one. */
    assert.equal(resolveLevel(4, activity.levels), top);
    assert.equal(resolveLevel(5, activity.levels), top);
  }
});

/* ----------------------------------------------------------- every board */

test("every board offers one answer, three or four tiles, and no tile twice", () => {
  for (const challenge of everyBoard()) {
    const board = boardOf(challenge);
    const { options } = board;

    assert.ok(
      options.length === 3 || options.length === 4,
      `${challenge.id} has ${options.length} tiles; ChoiceStage lays out 2, 3 or 4`,
    );

    const answers = options.filter((o) => o.id === board.answerId);
    assert.equal(answers.length, 1, `${challenge.id} does not have exactly one answer`);

    const ids = options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${challenge.id} repeats an option id`);

    const labels = options.map((o) => labelOf(o.item));
    assert.equal(
      new Set(labels).size,
      labels.length,
      `${challenge.id} shows the same thing twice: ${labels.join(", ")}`,
    );

    /* Two tiles drawn with the same glyph are the same tile to a child, even
       if the words underneath differ. */
    const glyphs = options.map((o) =>
      o.item.kind === "picture" ? o.item.glyph : labelOf(o.item),
    );
    assert.equal(
      new Set(glyphs).size,
      glyphs.length,
      `${challenge.id} shows the same picture twice: ${glyphs.join(" ")}`,
    );

    /* The engine agrees with the board, and rejects everything else. */
    for (const option of options) {
      assert.equal(
        checkAnswer(challenge, { kind: "choice", optionId: option.id }),
        option.id === board.answerId,
        `${challenge.id} judged ${labelOf(option.item)} wrongly`,
      );
    }
    assert.equal(
      checkAnswer(challenge, { kind: "choice", optionId: "not-a-tile" }),
      false,
    );
  }
});

/* ------------------------------------------------------------ distractors */

/**
 * Tiles that appear on a board but are never themselves the answer anywhere in
 * their family. Each one is a deliberate distractor: something a child knows,
 * in the right family, that the pack has no separate question about. Anything
 * not on this list must earn its place by being a real answer somewhere.
 */
const DISTRACTOR_ONLY: Readonly<Record<string, readonly string[]>> = {
  animal: ["a butterfly", "a chicken", "a bee"],
  food: ["cake"],
  plant: ["a plant in a pot"],
  sky: ["a cloud", "a star", "a rainbow"],
  drink: ["tea", "milk", "juice"],
  "living or not": ["a key", "a book", "a cup", "a spoon"],
  "thing to take outside": ["a swimsuit", "a sun hat", "sunglasses"],
  clothing: ["a dress"],
  "healthy habit": ["chocolate", "cake"],
  space: ["a satellite", "a planet with rings"],
  "place in nature": ["a volcano"],
  "thing you wear": ["glasses", "a scarf", "a cap"],
  "safe or for grown-ups": [
    "a crayon", "a ball", "a spoon", "a balloon", "a carrot", "bread", "an apple",
  ],
  sign: ["a no entry sign", "a recycling sign"],
};

test("every wrong tile is a real member of the family the question is about", () => {
  const all = everyBoard();

  /* Build, from the pack itself, the things each family calls an answer. */
  const answers = new Map<string, Set<string>>();
  for (const challenge of all) {
    const family = familyOf(challenge);
    if (!answers.has(family)) answers.set(family, new Set());
    answers.get(family)!.add(labelOf(answerOf(challenge)));
  }

  assert.ok(answers.size >= 20, `only ${answers.size} families; expected 20+`);

  for (const challenge of all) {
    const family = familyOf(challenge);
    const allowed = new Set([
      ...answers.get(family)!,
      ...(DISTRACTOR_ONLY[family] ?? []),
    ]);
    for (const item of distractorsOf(challenge)) {
      const label = labelOf(item);
      assert.ok(
        allowed.has(label),
        `${challenge.id} puts "${label}" on a "${family}" board, and nothing in that family is ever "${label}"`,
      );
    }
  }
});

/* ------------------------------------------------------- the facts, by hand */

/** Which animal makes the sound. Written from life, not from the pack. */
const SOUNDS: Readonly<Record<string, string>> = {
  moo: "cow", woof: "dog", meow: "cat", quack: "duck",
  baa: "sheep", neigh: "horse", roar: "lion", hoot: "owl", buzz: "bee",
  ribbit: "frog", hiss: "snake", cluck: "chicken", squeak: "mouse",
  howl: "wolf", tweet: "bird",
};

/** What the baby grows up into. */
const BABIES: Readonly<Record<string, string>> = {
  calf: "cow", puppy: "dog", kitten: "cat", duckling: "duck",
  lamb: "sheep", foal: "horse", cub: "lion", chick: "chicken",
  tadpole: "frog", caterpillar: "butterfly", joey: "kangaroo", fawn: "deer",
};

/** Where the animal lives. */
const HOMES: Readonly<Record<string, string>> = {
  bear: "forest", bird: "nest", camel: "desert", chicken: "farm", cow: "farm",
  crab: "sea", deer: "forest", dolphin: "sea", duck: "pond", fish: "sea",
  fox: "forest", hedgehog: "forest", horse: "farm", koala: "tree",
  monkey: "jungle", octopus: "sea", parrot: "jungle", penguin: "snow",
  rabbit: "burrow", seal: "snow", shark: "sea", sheep: "farm",
  squirrel: "forest", tiger: "jungle", turtle: "sea", wolf: "forest",
};

/** What the animal eats. */
const DIET: Readonly<Record<string, string>> = {
  bear: "honey", bird: "worm", cat: "fish", chicken: "corn", cow: "grass",
  dog: "bone", giraffe: "leaves", horse: "hay", monkey: "banana",
  mouse: "cheese", panda: "bamboo", rabbit: "carrot", squirrel: "nut",
};

/** Which part of you does the sensing. */
const SENSES: Readonly<Record<string, string>> = {
  sight: "eye", "sight-colour": "eye", hearing: "ear", loud: "ear",
  smell: "nose", "smell-warning": "nose", taste: "tongue", touch: "hand",
};

test("the animal facts the pack teaches match a list written by hand", () => {
  const checks: readonly [string, string, Readonly<Record<string, string>>][] = [
    ["animal-sounds", "sound:", SOUNDS],
    ["baby-animals", "baby:", BABIES],
    ["animal-homes", "home:", HOMES],
    ["animal-diet", "eats:", DIET],
    ["senses", "sense:", SENSES],
  ];

  for (const [id, prefix, truth] of checks) {
    const asked = new Set<string>();
    for (const challenge of drawn(id)) {
      const idea = ideaOf(challenge);
      assert.ok(idea.startsWith(prefix), `${challenge.id} has an odd concept "${idea}"`);
      const key = idea.slice(prefix.length);
      const expected = truth[key];
      assert.ok(
        expected !== undefined,
        `${id} asks about "${key}", which is not in the hand-written table — add it, and check it is true`,
      );
      assert.equal(
        plain(labelOf(answerOf(challenge))),
        expected,
        `${id} says "${key}" is "${plain(labelOf(answerOf(challenge)))}"; it is "${expected}"`,
      );
      asked.add(key);
    }
    /* The table is not allowed to be bigger than the pack either: a fact
       written here and never asked is a fact quietly dropped. */
    for (const key of Object.keys(truth)) {
      assert.ok(asked.has(key), `${id} never asks about "${key}"`);
    }
  }
});

/* --------------------------------------------------------- sorting, by hand */

const ALIVE = ["bird", "butterfly", "cat", "dog", "fish", "flower", "rabbit", "tree"];
const NOT_ALIVE = ["ball", "car", "chair", "rock", "key", "book", "cup", "spoon"];

const NATURAL = ["cloud", "flower", "mountain", "rock", "tree", "sea", "volcano"];
const MADE = ["bicycle", "book", "car", "chair", "house", "aeroplane"];

const HOT = ["fire", "sun", "cup of tea", "bowl of soup"];
const COLD = ["ice cube", "snowflake", "ice cream", "snowman"];

const FRUIT = [
  "apple", "banana", "orange", "strawberry", "grapes", "watermelon", "pear", "lemon",
];
const VEGETABLES = ["carrot", "broccoli", "corn", "potato", "cucumber", "onion"];

/**
 * A sorting question is only fair if *every* other tile falls on the other
 * side of the line. Each entry below is one line, drawn by hand: the activity,
 * how to spot a board asking for the left-hand side, and the two groups.
 */
const SORTINGS: readonly {
  id: string;
  asks: (challenge: Challenge) => boolean;
  yes: readonly string[];
  no: readonly string[];
  named: string;
}[] = [
  {
    id: "living-things",
    asks: (c) => /alive\?$/i.test(c.prompt.speech) && !/not alive/i.test(c.prompt.speech),
    yes: ALIVE, no: NOT_ALIVE, named: "alive",
  },
  {
    id: "living-things",
    asks: (c) => /not alive\?$/i.test(c.prompt.speech),
    yes: NOT_ALIVE, no: ALIVE, named: "not alive",
  },
  {
    id: "natural-or-made",
    asks: (c) => /^natural:/.test(ideaOf(c)),
    yes: NATURAL, no: MADE, named: "natural",
  },
  {
    id: "natural-or-made",
    asks: (c) => /^made:/.test(ideaOf(c)),
    yes: MADE, no: NATURAL, named: "made by people",
  },
  {
    id: "hot-or-cold",
    asks: (c) => /^hot/.test(ideaOf(c)),
    yes: HOT, no: COLD, named: "hot",
  },
  {
    id: "hot-or-cold",
    asks: (c) => /^cold/.test(ideaOf(c)),
    yes: COLD, no: HOT, named: "cold",
  },
  {
    id: "food-origins",
    asks: (c) => /^which one is a fruit\?$/i.test(c.prompt.speech),
    yes: FRUIT, no: VEGETABLES, named: "a fruit",
  },
  {
    id: "food-origins",
    asks: (c) => /^which one is a vegetable\?$/i.test(c.prompt.speech),
    yes: VEGETABLES, no: FRUIT, named: "a vegetable",
  },
];

test("every sorting question puts the answer on one side and the rest on the other", () => {
  /* The two sides of every line must not overlap, or the question is unfair
     before a single board is dealt. */
  for (const { yes, no, named } of SORTINGS) {
    const both = yes.filter((thing) => no.includes(thing));
    assert.deepEqual(both, [], `"${named}" claims ${both.join(", ")} on both sides`);
  }

  for (const { id, asks, yes, no, named } of SORTINGS) {
    let seen = 0;
    for (const challenge of drawn(id)) {
      if (!asks(challenge)) continue;
      seen += 1;
      const answer = plain(labelOf(answerOf(challenge)));
      assert.ok(
        yes.includes(answer),
        `${challenge.id} says "${answer}" is ${named}; the hand-written list says otherwise`,
      );
      for (const item of distractorsOf(challenge)) {
        const label = plain(labelOf(item));
        assert.ok(
          no.includes(label),
          `${challenge.id} asks which one is ${named} and offers "${label}", which is not clearly on the other side`,
        );
      }
    }
    assert.ok(seen > 0, `no board was found asking which one is ${named}`);
  }
});

/* ------------------------------------------------------------- ambiguity */

/**
 * Things that are *also* the category on the left. An owl is a bird; a police
 * car is a car; a sunflower is a flower; the sun is a star. A child who picks
 * one of these has answered correctly, so none may share a board with the
 * question that asks for the category.
 *
 * A big ship and a sailing boat are deliberately *not* here: a ship is not a
 * sailing boat, and "which one is a sailing boat?" beside a ship is a fair
 * question about sails.
 */
const ALSO_TRUE: Readonly<Record<string, readonly string[]>> = {
  bird: ["owl", "duck", "chicken", "penguin", "parrot", "eagle"],
  fish: ["shark"],
  bear: ["panda"],
  flower: ["sunflower"],
  car: ["police car"],
  star: ["sun"],
  fruit: FRUIT,
  vegetable: VEGETABLES,
  /* A volcano is a mountain. */
  mountain: ["volcano"],
  /* The beach and island glyphs prominently show the sea. */
  sea: ["beach", "island"],
  /* The storm glyph has rain falling out of it. */
  rain: ["thunderstorm"],
  /* Fog is a cloud on the ground, the storm glyph contains one, and the
     wind glyph is drawn as a puffing cloud. */
  cloud: ["fog", "thunderstorm", "wind"],
  fog: ["cloud"],
  /* The grass glyph is a sprig of green leaves. */
  leaf: ["grass"],
  grass: ["leaf"],
};

test("no board holds a second tile that would also be right", () => {
  let checked = 0;
  for (const challenge of everyBoard()) {
    const asked = /^which one is (.+)\?$/i.exec(challenge.prompt.speech);
    if (!asked) continue;
    const category = plain(asked[1]);
    const also = ALSO_TRUE[category];
    if (!also) continue;
    checked += 1;
    for (const item of distractorsOf(challenge)) {
      const label = plain(labelOf(item));
      assert.ok(
        !also.includes(label),
        `${challenge.id} asks for ${category} and offers "${label}", which is also ${category}`,
      );
    }
  }
  assert.ok(checked > 0, "the ambiguity table matched no board at all");
});

/**
 * Facts that are true of more than one owner. The tables give each food and
 * each sound to one animal, but the world is less tidy: a horse eats grass as
 * surely as a cow does, a cat hisses as surely as a snake, and a cup carries
 * water as surely as a bucket. A child who knows the second truth must never
 * see it dealt as a wrong answer beside the question it would also answer.
 */
const CROSS_TRUE: readonly {
  id: string;
  asks: RegExp;
  barred: readonly string[];
}[] = [
  { id: "animal-diet", asks: /^what does a horse like to eat\?$/i, barred: ["grass", "carrot"] },
  { id: "animal-diet", asks: /^what does a cow like to eat\?$/i, barred: ["hay"] },
  { id: "animal-diet", asks: /^what does a bear like to eat\?$/i, barred: ["fish"] },
  { id: "animal-diet", asks: /^what does a chicken like to eat\?$/i, barred: ["worm"] },
  { id: "animal-diet", asks: /^what does a rabbit like to eat\?$/i, barred: ["grass", "leaves"] },
  { id: "animal-sounds", asks: /^which animal says hiss\?$/i, barred: ["cat"] },
  { id: "animal-sounds", asks: /^which animal says howl\?$/i, barred: ["dog"] },
  { id: "object-uses", asks: /^what do you carry water in\?$/i, barred: ["cup"] },
  { id: "safety", asks: /^which sign tells the cars to stop\?$/i, barred: ["no entry sign"] },
];

test("a fact true of two things never deals the second as a wrong answer", () => {
  for (const { id, asks, barred } of CROSS_TRUE) {
    let seen = 0;
    for (const challenge of drawn(id)) {
      if (!asks.test(challenge.prompt.speech)) continue;
      seen += 1;
      for (const item of distractorsOf(challenge)) {
        const label = plain(labelOf(item));
        assert.ok(
          !barred.includes(label),
          `${challenge.id} asks "${challenge.prompt.speech}" and offers "${label}", which would also be right`,
        );
      }
    }
    assert.ok(seen > 0, `no board was found asking ${asks}`);
  }
});

test("the mechanic and the police car never share a helpers board", () => {
  /* A mechanic works with cars all day, so joining the mechanic to the
     patrol car is a fair guess — and a fair guess must never be dealable. */
  let boards = 0;
  for (const challenge of drawn("helper-partners")) {
    if (challenge.payload.kind !== "connect") continue;
    boards += 1;
    const helpers = challenge.payload.left.map((node) => node.id);
    assert.ok(
      !(helpers.includes("helper-mechanic") && helpers.includes("helper-police")),
      `${challenge.id} deals the mechanic beside the police patrol car`,
    );
  }
  assert.ok(boards > 0, "no helpers board was drawn at all");
});

/* ----------------------------------------------------------- what is said */

/**
 * The answer's own name turning up in the question. Every one of these is the
 * true name of the thing — a stop sign really is called a stop sign — and none
 * of them gives anything away, because the tiles are pictures and the other
 * tiles are signs and stations too.
 */
const NAMED_AFTER: readonly string[] = [
  "day-and-night|day",
  "places|train",
  "places|post",
  "safety|stop",
  "safety|warning",
  "safety|children",
];

test("the question never says the answer out loud, and nor does the hint", () => {
  for (const [id, challenges] of SAMPLES) {
    for (const challenge of challenges) {
      /* A connect board has no single answer tile to give away. What its
         prompt must not do is name any of them, and the sentence tests below
         read every board's words, this one included. */
      if (challenge.payload.kind !== "choice") continue;
      const label = labelOf(answerOf(challenge));
      const ask = challenge.prompt.speech;

      /* "Which one is a cow?" is meant to name it: that is the question. */
      const naming = /^which one is (.+)\?$/i.exec(ask);
      const noun = naming ? plain(naming[1]) : "";
      const structural =
        noun === plain(label) || noun.endsWith(` of ${plain(label)}`);

      /* A word both the answer and a wrong tile carry gives nothing away. */
      const shared = new Set(
        distractorsOf(challenge).flatMap((item) =>
          wordsIn(labelOf(item)).map(stem),
        ),
      );
      const telling = wordsIn(label)
        .filter((w) => !STOP.has(w) && !shared.has(stem(w)));

      const askWords = new Set(wordsIn(ask).map(stem));
      const hintWords = new Set(wordsIn(challenge.hint ?? "").map(stem));

      for (const word of telling) {
        if (!structural && !NAMED_AFTER.includes(`${id}|${word}`)) {
          assert.ok(
            !askWords.has(stem(word)),
            `${challenge.id} asks "${ask}" and the answer is "${label}"`,
          );
        }
        assert.ok(
          !hintWords.has(stem(word)),
          `${challenge.id} hints "${challenge.hint}", which says "${word}" — the answer is "${label}"`,
        );
      }
    }
  }
});

test("no hint claims a number of tiles the board has not got", () => {
  const COUNTS = [
    /\b(two|three|four|five)\s+(of\s+(these|them)|are|is|of\s+the)\b/i,
    /\ball\s+(three|four|five)\b/i,
    /\bboth\b/i,
  ];
  for (const challenge of everyChallenge()) {
    const hint = challenge.hint ?? "";
    for (const rule of COUNTS) {
      assert.ok(
        !rule.test(hint),
        `${challenge.id} hints "${hint}", but the board has ${piecesOf(challenge).length} pieces and the count may not hold`,
      );
    }
  }
});

test("every challenge can be read aloud, and says why afterwards", () => {
  for (const challenge of everyChallenge()) {
    const ask = challenge.prompt.speech;
    assert.ok(ask.trim().length > 0, `${challenge.id} asks nothing`);
    assert.ok(ask.trim().endsWith("?"), `${challenge.id} asks "${ask}" without a question mark`);
    assert.ok(ask.length < 120, `${challenge.id} asks a sentence far too long: "${ask}"`);

    const why = challenge.explanation ?? "";
    assert.ok(why.trim().length > 0, `${challenge.id} explains nothing`);
    assert.ok(/[.!]$/.test(why.trim()), `${challenge.id} explains "${why}" without an end stop`);

    const hint = challenge.hint ?? "";
    assert.ok(hint.trim().length > 0, `${challenge.id} has no hint`);
    assert.ok(/[.!?]$/.test(hint.trim()), `${challenge.id} hints "${hint}" without an end stop`);

    /* Anything on the stage is a picture too, so nothing is unrenderable. */
    for (const part of challenge.prompt.display ?? []) {
      if (part.kind === "item") {
        assert.equal(part.item.kind, "picture", `${challenge.id} stages a ${part.item.kind}`);
      }
    }
  }
});

test("nothing in the pack is scored, timed, or unkind", () => {
  /* "lives" is left out on purpose: a shark lives in the sea. The game's own
     source is scanned for scores and lives in the gameplay tests instead. */
  const UNKIND =
    /\b(wrong|nope|incorrect|fail|failed|silly|stupid|score|scored|points|hurry|time'?s up|too slow|naughty)\b/i;
  for (const challenge of everyChallenge()) {
    for (const text of [
      challenge.prompt.speech,
      challenge.explanation ?? "",
      challenge.hint ?? "",
      ...piecesOf(challenge).map(labelOf),
    ]) {
      assert.ok(!UNKIND.test(text), `${challenge.id} says "${text}"`);
    }
  }
});

test("every sentence the pack builds reads like English", () => {
  /* Vowel letters, consonant sounds: "a uniform" is right and "an uniform"
     is not. The reverse list is for consonant letters with vowel sounds. */
  const CONSONANT_SOUND = /^(uniform|unicorn|university|useful|used|one|once|european)$/;
  const VOWEL_SOUND = /^(hour|honest|honour)$/;

  const SLIPS: readonly [RegExp, string][] = [
    [/ {2,}/, "two spaces"],
    [/\s[.,?!]/, "a space before punctuation"],
    [/^\s|\s$/, "space at the edge"],
    [/\b(a a|the the|is is|to to)\b/i, "a doubled word"],
  ];

  const seen = new Set<string>();
  for (const challenge of everyChallenge()) {
    for (const text of [
      challenge.prompt.speech,
      challenge.explanation ?? "",
      challenge.hint ?? "",
      ...piecesOf(challenge).map(labelOf),
    ]) {
      if (seen.has(text)) continue;
      seen.add(text);

      for (const [rule, what] of SLIPS) {
        assert.ok(!rule.test(text), `${challenge.id} has ${what}: "${text}"`);
      }

      for (const [, article, word] of text.matchAll(/\b(a|an) ([a-z]+)/gi)) {
        const vowel = /^[aeiou]/i.test(word);
        const soundsVowel = vowel
          ? !CONSONANT_SOUND.test(word.toLowerCase())
          : VOWEL_SOUND.test(word.toLowerCase());
        assert.equal(
          article.toLowerCase(),
          soundsVowel ? "an" : "a",
          `"${text}" should say "${soundsVowel ? "an" : "a"} ${word}"`,
        );
      }
    }
  }
  assert.ok(seen.size > 500, `only ${seen.size} distinct sentences in the pack`);
});

/* ------------------------------------------------------ staying in its lane */

test("the pack never asks a question that belongs to another quest", () => {
  /* §4: shapes, colours, numbers, letters, sounds and patterns are the other
     quests' subjects. General Knowledge asks about the world instead. */
  const THEIRS =
    /\b(circle|square|triangle|rectangle|oval|diamond|hexagon|shape|colour|color|letter|alphabet|spell|spelling|rhymes? with|starts with|pattern|comes next|how many|count|add|plus|minus|take away|same or different|bigger than|smaller than|odd one out)\b/i;
  for (const challenge of everyChallenge()) {
    assert.ok(
      !THEIRS.test(challenge.prompt.speech),
      `${challenge.id} asks "${challenge.prompt.speech}", which is another quest's question`,
    );
  }
});

/* ------------------------------------------------------- joining them up */

/**
 * Places an animal could fairly be said to live in as well as its own.
 *
 * Written out here by hand rather than read from the pack, because that is
 * the point: `homePartners` guarantees exactly one intended solution, and a
 * guarantee checked against the same table it was built from is not checked
 * at all. A seal is on the snow and in the sea; a koala is up a tree and in
 * a forest and, to a child looking at a picture, in a jungle. Any board that
 * puts one of these opposite the other has two defensible answers.
 */
const ALSO_HOME: Readonly<Record<string, readonly string[]>> = {
  seal: ["the sea"],
  penguin: ["the sea"],
  koala: ["the jungle", "the forest"],
  squirrel: ["a tree"],
  parrot: ["a tree"],
};

function connectBoards(): Challenge[] {
  const joined = drawn("home-partners").filter((c) => c.payload.kind === "connect");
  assert.ok(joined.length > 0, "home-partners dealt no connect boards");
  return joined;
}

test("every animal-homes board joins each animal to exactly one place", () => {
  for (const challenge of connectBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    /* A bijection, which is what `ConnectStage` draws and what `validate`
       insists on: every animal in one pair, every place in one pair. */
    assert.equal(payload.left.length, payload.right.length);
    assert.equal(payload.pairs.length, payload.left.length);
    assert.equal(
      new Set(payload.pairs.map((p) => p.leftId)).size,
      payload.left.length,
      `${challenge.id}: an animal is joined twice or not at all`,
    );
    assert.equal(
      new Set(payload.pairs.map((p) => p.rightId)).size,
      payload.right.length,
      `${challenge.id}: a place takes two animals or none`,
    );

    /* Two, three or four lines, by level. Never one, never five. */
    const expected = challenge.level === 1 ? 2 : challenge.level === 2 ? 3 : 4;
    assert.equal(
      payload.pairs.length,
      expected,
      `${challenge.id} is level ${challenge.level} but has ${payload.pairs.length} lines`,
    );
  }
});

test("no animal on a board could fairly be joined to somebody else's home", () => {
  let boards = 0;
  for (const challenge of connectBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;
    boards += 1;

    const places = payload.right.map((node) => labelOf(node.item));
    for (const pair of payload.pairs) {
      const animal = payload.left.find((node) => node.id === pair.leftId);
      const home = payload.right.find((node) => node.id === pair.rightId);
      assert.ok(animal && home, `${challenge.id}: a line names a node that is not there`);

      const name = labelOf(animal.item);
      for (const other of places) {
        if (other === labelOf(home.item)) continue;
        assert.ok(
          !(ALSO_HOME[name] ?? []).includes(other),
          `${challenge.id}: ${name} is joined to ${labelOf(home.item)} but "${other}" is also on the board`,
        );
      }
    }
  }
  assert.ok(boards > 100, `only ${boards} connect boards were checked`);
});

test("the engine agrees with an animal-homes board, and only with it", () => {
  for (const challenge of connectBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    /* The whole set of lines is the answer, in whatever order they were made. */
    assert.ok(
      checkAnswer(challenge, { kind: "connect", links: payload.pairs }),
      `${challenge.id}: the engine rejects its own answer`,
    );
    assert.ok(
      checkAnswer(challenge, {
        kind: "connect",
        links: [...payload.pairs].reverse(),
      }),
      `${challenge.id}: the order the lines were drawn in changed the marking`,
    );

    /* Every line the board does not name is refused — that is what "wrong
       connections stay representable and get rejected" means. A board of n
       animals offers n * n possible lines and accepts exactly n of them. */
    let accepted = 0;
    for (const animal of payload.left) {
      for (const place of payload.right) {
        const link: ConnectPair = { leftId: animal.id, rightId: place.id };
        const authored = payload.pairs.some(
          (p) => p.leftId === link.leftId && p.rightId === link.rightId,
        );
        assert.equal(
          checkStep(challenge, { kind: "connect", links: [link] }),
          authored,
          `${challenge.id}: judged ${animal.id}>${place.id} wrongly`,
        );
        if (authored) accepted += 1;
      }
    }
    assert.equal(accepted, payload.pairs.length);

    /* Half a board is right so far, and not yet finished. Nothing anywhere
       treats "not finished" as a failure. */
    const half = payload.pairs.slice(0, 1);
    assert.ok(checkStep(challenge, { kind: "connect", links: half }));
    assert.equal(checkAnswer(challenge, { kind: "connect", links: half }), false);
  }
});

test("no place is ever left facing its own animal on a board of three or more", () => {
  let deranged = 0;
  for (const challenge of connectBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect" || payload.pairs.length < 3) continue;
    deranged += 1;

    for (const [index, animal] of payload.left.entries()) {
      const pair = payload.pairs.find((p) => p.leftId === animal.id)!;
      assert.notEqual(
        payload.right[index].id,
        pair.rightId,
        `${challenge.id}: row ${index} joins straight across`,
      );
    }
  }
  assert.ok(deranged > 50, `only ${deranged} boards of three or more were checked`);
});

/* ------------------------------------------------ animals and their babies */

/**
 * The other `connect` in the pack, and the harder one to keep fair.
 *
 * `home-partners` can be argued with — a seal is at home in the sea as well as
 * the snow — and `habitats.ts` carries an `avoid` list because of it. This one
 * cannot: `animals.ts` gives a `baby` only where the name belongs to exactly
 * one animal in the table, which is why the koala (joey), the tiger (cub) and
 * the goat (kid) have none. So the tests below check that the property still
 * holds rather than working around its absence, and check the two things that
 * are genuinely new: that a board of five is still a bijection, and that the
 * baby's *word* tile behaves like every other tile in the pack.
 */
function babyBoards(): Challenge[] {
  const joined = drawn("animal-babies").filter((c) => c.payload.kind === "connect");
  assert.ok(joined.length > 0, "animal-babies dealt no connect boards");
  return joined;
}

/** How many lines a level asks for. Three, four, five — and nothing else. */
const BABY_LINES: Readonly<Record<number, number>> = { 1: 3, 2: 4, 3: 5 };

/** The babies a child meets last, one of which every level-three board holds. */
const LATE_BABIES = ["fawn", "joey", "tadpole", "caterpillar"];

test("every animal-babies board joins each animal to exactly one baby", () => {
  let boards = 0;

  for (const challenge of babyBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;
    boards += 1;

    assert.equal(payload.left.length, payload.right.length);
    assert.equal(payload.pairs.length, payload.left.length);
    assert.equal(
      new Set(payload.pairs.map((p) => p.leftId)).size,
      payload.left.length,
      `${challenge.id}: an animal is joined twice or not at all`,
    );
    assert.equal(
      new Set(payload.pairs.map((p) => p.rightId)).size,
      payload.right.length,
      `${challenge.id}: a baby belongs to two animals or none`,
    );

    assert.equal(
      payload.pairs.length,
      BABY_LINES[challenge.level],
      `${challenge.id} is level ${challenge.level} but has ${payload.pairs.length} lines`,
    );

    /* And every line on it is a fact from the hand-written table, checked the
       way a grown-up would check it: read the two tiles, and say it out loud. */
    for (const pair of payload.pairs) {
      const animal = payload.left.find((node) => node.id === pair.leftId);
      const baby = payload.right.find((node) => node.id === pair.rightId);
      assert.ok(animal && baby, `${challenge.id}: a line names a node that is not there`);

      const name = plain(labelOf(animal.item));
      const little = plain(labelOf(baby.item));
      assert.equal(
        BABIES[little],
        name,
        `${challenge.id} says a baby ${name} is called a ${little}`,
      );
    }
  }

  assert.ok(boards > 100, `only ${boards} baby boards were checked`);
});

test("the baby tiles are words on purpose, and read like every other tile", () => {
  for (const challenge of babyBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    /* Left: the same animal picture the rest of the pack uses. */
    for (const node of payload.left) {
      assert.equal(node.item.kind, "picture", `${challenge.id}: a non-picture animal`);
    }

    /* Right: the baby's name, because no drawing of a lamb is distinguishable
       from a drawing of a sheep. Upper case like every other word tile in the
       product, uncaptioned because the tile is its own caption, and carrying
       the spoken name so a screen reader says "a lamb" rather than "LAMB". */
    for (const node of payload.right) {
      assert.equal(node.item.kind, "text", `${challenge.id}: a non-word baby`);
      if (node.item.kind !== "text") continue;
      assert.equal(node.item.text, node.item.text.toUpperCase());
      assert.equal(captionOf(node.item), "");
      assert.match(labelOf(node.item), /^an? [a-z]+$/);
      assert.equal(plain(labelOf(node.item)), node.item.text.toLowerCase());
    }
  }
});

test("the engine agrees with an animal-babies board, and only with it", () => {
  for (const challenge of babyBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    assert.ok(
      checkAnswer(challenge, { kind: "connect", links: payload.pairs }),
      `${challenge.id}: the engine rejects its own answer`,
    );
    assert.ok(
      checkAnswer(challenge, { kind: "connect", links: [...payload.pairs].reverse() }),
      `${challenge.id}: the order the lines were drawn in changed the marking`,
    );

    /* Every line a child could draw and the board does not name is refused,
       one at a time, by the content layer — which is what "wrong connections
       stay representable and get rejected" means. Five animals offer
       twenty-five lines and exactly five of them are right. */
    let accepted = 0;
    for (const animal of payload.left) {
      for (const baby of payload.right) {
        const link: ConnectPair = { leftId: animal.id, rightId: baby.id };
        const authored = payload.pairs.some(
          (p) => p.leftId === link.leftId && p.rightId === link.rightId,
        );
        assert.equal(
          checkStep(challenge, { kind: "connect", links: [link] }),
          authored,
          `${challenge.id}: judged ${animal.id}>${baby.id} wrongly`,
        );
        if (authored) accepted += 1;
      }
    }
    assert.equal(accepted, payload.pairs.length);

    /* One line in is right so far and not yet finished, and nothing anywhere
       reads "not finished" as failure. */
    const half = payload.pairs.slice(0, 1);
    assert.ok(checkStep(challenge, { kind: "connect", links: half }));
    assert.equal(checkAnswer(challenge, { kind: "connect", links: half }), false);
  }
});

test("no baby is ever left facing its own animal", () => {
  for (const challenge of babyBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    /* Every board here is three lines or more, so every board is deranged:
       joining straight across is never accidentally right. */
    for (const [index, animal] of payload.left.entries()) {
      const pair = payload.pairs.find((p) => p.leftId === animal.id)!;
      assert.notEqual(
        payload.right[index].id,
        pair.rightId,
        `${challenge.id}: row ${index} joins straight across`,
      );
    }
  }
});

test("a baby board gets harder by what is on it, not by how fast it is", () => {
  const seen = new Map<number, Set<string>>();

  for (const challenge of babyBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    const babies = payload.right.map((node) => plain(labelOf(node.item)));
    const level = challenge.level;
    if (!seen.has(level)) seen.set(level, new Set());
    for (const baby of babies) seen.get(level)!.add(baby);

    /* Level three always holds one of the four a child meets last, so the top
       level can never deal five easy ones and call itself hard. */
    if (level === 3) {
      assert.ok(
        babies.some((baby) => LATE_BABIES.includes(baby)),
        `${challenge.id} is level 3 and holds nothing new: ${babies.join(", ")}`,
      );
    }
  }

  /* Each level reaches further into the table than the one below it. */
  const one = seen.get(1)!;
  const two = seen.get(2)!;
  const three = seen.get(3)!;
  assert.equal(one.size, 5, `level 1 draws from ${[...one].join(", ")}`);
  assert.equal(two.size, 8);
  assert.equal(three.size, BABY_FACTS);
  for (const baby of one) assert.ok(two.has(baby), `level 2 dropped ${baby}`);
  for (const baby of two) assert.ok(three.has(baby), `level 3 dropped ${baby}`);
  for (const late of LATE_BABIES) assert.ok(!two.has(late), `${late} is too early`);
});

test("animal-babies counts facts, and never counts a shuffle", () => {
  /* Thirteen facts, and the boards are arrangements of them. The concept key
     names the *set* on the board, so the same five animals dealt down the
     columns another way is one thing to have learned rather than a hundred —
     and the number that goes in a content count is `BABY_FACTS`. */
  assert.equal(BABY_FACTS, Object.keys(BABIES).length);

  const boards = babyBoards();
  const concepts = new Set(boards.map(conceptKey));

  for (const concept of concepts) {
    assert.match(concept, /\|baby:[a-z>+]+$/);
  }

  /* The arrangements really do collapse. `challengeKey` sorts a connect
     board's joins before comparing — the set of joins *is* the question — so
     the same five animals dealt against a differently shuffled column of
     babies is one board and one concept, and the two numbers agree by
     design. What is worth proving is that the shuffling happened at all. */
  const arrangements = new Map<string, Set<string>>();
  for (const challenge of boards) {
    if (challenge.payload.kind !== "connect") continue;
    const key = conceptKey(challenge);
    if (!arrangements.has(key)) arrangements.set(key, new Set());
    arrangements
      .get(key)!
      .add(challenge.payload.right.map((node) => node.id).join(","));
  }
  assert.ok(
    [...arrangements.values()].some((set) => set.size > 1),
    "every set of babies was only ever dealt one way round",
  );
  assert.equal(new Set(boards.map(challengeKey)).size, arrangements.size);

  /* The choice activity teaches the same thirteen facts one at a time, and
     the two do not collide: a concept key is prefixed by the activity that
     taught it, so "a baby cow is a calf" learned by picking is not the same
     row as the same fact learned by joining. */
  const picked = new Set(drawn("baby-animals").map(conceptKey));
  for (const concept of concepts) assert.ok(!picked.has(concept));
});

test("the choice engine knows nothing about General Knowledge", () => {
  /* §8: no General-Knowledge-only branch inside the shared renderers. */
  for (const path of [
    "src/components/games/engines/ChoiceStage.tsx",
    "src/components/games/engines/ConnectStage.tsx",
    "src/components/games/engines/ContentItemView.tsx",
  ]) {
    const text = source(path).toLowerCase();
    for (const word of ["general knowledge", "general-knowledge", "generalknowledge"]) {
      assert.ok(!text.includes(word), `${path} mentions ${word}`);
    }
  }
});

/* ------------------------------------------------------------------------ */
/* Every board the pack deals is a full board.                              */
/* ------------------------------------------------------------------------ */

/**
 * How many lines each connect activity owes a child at each level.
 *
 * Written out by hand, from the brief rather than from the generator, because
 * the failure this catches is a generator that quietly hands over a smaller
 * board when its pool runs thin. A four-line board that comes out with three
 * lines still validates, still plays, and is still a level that got easier
 * when it was meant to get harder.
 */
const LINES_AT: Readonly<Record<string, readonly [number, number, number]>> = {
  "home-partners": [2, 3, 4],
  "animal-babies": [3, 4, 5],
  "helper-partners": [3, 4, 5],
  "body-partners": [3, 4, 5],
};

test("every connect board is a full board, and no line answers itself", () => {
  for (const [id, sizes] of Object.entries(LINES_AT)) {
    for (const challenge of drawn(id)) {
      const payload = challenge.payload;
      assert.equal(payload.kind, "connect", `${challenge.id} is not a connect`);
      if (payload.kind !== "connect") continue;

      const wanted = sizes[challenge.level <= 1 ? 0 : challenge.level === 2 ? 1 : 2];
      assert.equal(
        payload.pairs.length,
        wanted,
        `${challenge.id} dealt ${payload.pairs.length} lines, not ${wanted}`,
      );
      assert.equal(payload.left.length, wanted, `${challenge.id}: left column`);
      assert.equal(payload.right.length, wanted, `${challenge.id}: right column`);

      /* A bijection, checked from the board rather than from the payload's
         word for it: every node is joined, and joined exactly once. */
      assert.deepEqual(
        payload.pairs.map((pair) => pair.leftId).sort(),
        payload.left.map((node) => node.id).sort(),
      );
      assert.deepEqual(
        payload.pairs.map((pair) => pair.rightId).sort(),
        payload.right.map((node) => node.id).sort(),
      );

      /* And from three lines up nothing sits opposite its own answer, so
         "join straight across" is never the rule a child learns instead. */
      if (payload.pairs.length >= 3) {
        const answer = new Map(
          payload.pairs.map((pair) => [pair.leftId, pair.rightId] as const),
        );
        for (const [index, node] of payload.left.entries()) {
          assert.notEqual(
            answer.get(node.id),
            payload.right[index].id,
            `${challenge.id}: row ${index} answers itself`,
          );
        }
      }
    }
  }
});

test("every tray is worth sorting, and holds every card the answer names", () => {
  /* Both `order` activities, and the same promise from each: the tray never
     arrives mostly sorted. Level three asks for every card to have moved. */
  for (const id of ["day-order", "life-cycles"]) {
    for (const challenge of drawn(id)) {
      const payload = challenge.payload;
      assert.equal(payload.kind, "order", `${challenge.id} is not an order`);
      if (payload.kind !== "order") continue;

      const laid = payload.items.map((item) => item.id);
      assert.ok(laid.length >= 3, `${challenge.id} is only ${laid.length} cards`);
      assert.equal(new Set(laid).size, laid.length, `${challenge.id}: a card twice`);
      assert.deepEqual(
        [...laid].sort(),
        [...payload.answerOrder].sort(),
        `${challenge.id}: the tray and the answer are different cards`,
      );

      const moved = laid.filter(
        (id, index) => id !== payload.answerOrder[index],
      ).length;
      const owed =
        challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : laid.length;
      assert.ok(
        moved >= owed,
        `${challenge.id}: only ${moved} of ${laid.length} cards had moved`,
      );
    }
  }
});
