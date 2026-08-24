import assert from "node:assert/strict";
import { test } from "node:test";

import { drawChallenges } from "@/lib/content/challenges";
import { SOUND_FACTS, soundLevelOf } from "@/lib/content/packs/general-knowledge/animals";
import { OPPOSITES } from "@/lib/content/packs/english/opposites";
import { MATCH_ACTIVITIES, MATCH_PACK } from "@/lib/content/packs/match";
import { QUANTITY_FACTS } from "@/lib/content/packs/match/quantities";
import {
  AMBIGUOUS,
  LETTER_POOLS,
  TEACHABLE,
  confusions,
} from "@/lib/content/packs/match/shared";
import { CONTENT_REGISTRY, getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Activity, Challenge, ConnectPayload } from "@/lib/content/types";
import { validateChallenge, validatePack } from "@/lib/content/validate";

/**
 * The Match pack, checked as content.
 *
 * `tests/match.test.ts` is about the board: the reducer, the marking, the
 * stage. This file is about the four activities the board is fed with, and
 * asks of each the two questions a match board lives or dies by.
 *
 * **Is there exactly one way to finish it?** A match board shows every
 * question and every answer at once, so a second defensible pairing is not a
 * harder board — it is a board where a child is told no while being right.
 * Two capitals that share a lower case form, two groups of dots with the same
 * number in them, two words that are opposites of the same third word, two
 * animals that make the same noise: every one of those is checked here.
 *
 * **Can it be finished without reading it?** The far shelf is deranged, so no
 * card ever faces its own partner. A board solvable by position teaches
 * position.
 *
 * Everything else — how a level gets harder — is checked the way the rest of
 * the packs check it: by re-deriving what the level promised and counting what
 * came out.
 */

/** Draw a lot, at every level the activity offers, and keep what came out. */
function sample(activity: Activity, seeds = 60): Challenge[] {
  const drawn: Challenge[] = [];
  for (const level of activity.levels) {
    for (let seed = 0; seed < seeds; seed++) {
      drawn.push(
        ...drawChallenges(activity, { level, count: 4, rng: createRng(seed) }),
      );
    }
  }
  return drawn;
}

const SAMPLES = new Map(MATCH_ACTIVITIES.map((a) => [a.id, sample(a)] as const));

function drawn(id: string): Challenge[] {
  const challenges = SAMPLES.get(`match.${id}` as Activity["id"]) ?? [];
  assert.ok(challenges.length > 0, `nothing was drawn for match.${id}`);
  return challenges;
}

/** The board of a challenge, narrowed. Every activity here deals one. */
function boardOf(challenge: Challenge): ConnectPayload {
  assert.equal(challenge.payload.kind, "connect", `${challenge.id} is not a connect`);
  return challenge.payload as ConnectPayload;
}

/** How many lines this level asked for. */
function linesAt(level: number, sizes: readonly [number, number, number]): number {
  return sizes[level <= 1 ? 0 : level === 2 ? 1 : 2];
}

/**
 * The two promises every board in this pack makes, whatever it is about.
 *
 * A full board of the size its level asked for, every card joined exactly
 * once, and nothing facing its own partner.
 */
function assertWellFormed(
  challenge: Challenge,
  sizes: readonly [number, number, number],
): ConnectPayload {
  const payload = boardOf(challenge);
  const wanted = linesAt(challenge.level, sizes);

  assert.equal(payload.pairs.length, wanted, `${challenge.id} came up short`);
  assert.equal(payload.left.length, wanted, `${challenge.id}: near shelf`);
  assert.equal(payload.right.length, wanted, `${challenge.id}: far shelf`);

  const left = payload.left.map((node) => node.id);
  const right = payload.right.map((node) => node.id);
  assert.equal(new Set(left).size, left.length, `${challenge.id}: a card twice`);
  assert.equal(new Set(right).size, right.length, `${challenge.id}: a card twice`);
  assert.deepEqual(payload.pairs.map((pair) => pair.leftId).sort(), [...left].sort());
  assert.deepEqual(payload.pairs.map((pair) => pair.rightId).sort(), [...right].sort());

  const partner = new Map(payload.pairs.map((pair) => [pair.leftId, pair.rightId] as const));
  for (const [index, node] of payload.left.entries()) {
    assert.notEqual(
      partner.get(node.id),
      right[index],
      `${challenge.id}: card ${index} faces its own partner`,
    );
  }

  return payload;
}

/* 1 ---------------------------------------------------------------------- */
test("the Match pack is in the one content registry, and every board validates", () => {
  const packs = CONTENT_REGISTRY.filter((pack) => pack.id === "match");
  assert.equal(packs.length, 1, "match should appear exactly once");
  assert.equal(packs[0], MATCH_PACK);
  assert.deepEqual(validatePack(MATCH_PACK), []);

  for (const activity of MATCH_ACTIVITIES) {
    assert.equal(getActivity(activity.id), activity, `${activity.id} is not reachable`);
  }

  for (const challenge of [...SAMPLES.values()].flat()) {
    assert.deepEqual(validateChallenge(challenge), [], challenge.id);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("all four are connects, and each keeps the subject it belongs to", () => {
  assert.equal(MATCH_ACTIVITIES.length, 4);
  assert.deepEqual(
    [...new Set(MATCH_ACTIVITIES.map((a) => a.kind))],
    ["connect"],
    "a match board that is not a connect would need an engine",
  );

  /* The two axes. Each activity keeps the `activityType` of the pack that
     already teaches the objective one tile at a time — so the two forms are
     one thing known — and the `category` of the subject a child is told they
     are practising, which is not always this pack's own. */
  assert.deepEqual(
    MATCH_ACTIVITIES.map((a) => [a.id, a.activityType, a.category]),
    [
      ["match.letter-partners", "letter-case", "english"],
      ["match.quantity-partners", "counting", "math"],
      ["match.opposite-partners", "opposites", "english"],
      ["match.sound-partners", "animal-sounds", "general-knowledge"],
    ],
  );
});

/* 3 ---------------------------------------------------------------------- */
test("big and little letters: one letter per pair, and never I or L", () => {
  /* Twenty-four correspondences, which is the alphabet less the two strokes
     no board may hold. That is the honest count of what this can teach. */
  const teachable: readonly string[] = TEACHABLE;
  assert.equal(teachable.length, 24);
  for (const letter of AMBIGUOUS) {
    assert.ok(!teachable.includes(letter), `${letter} is teachable`);
  }

  const ambiguous: readonly string[] = AMBIGUOUS;
  const POOLS: readonly (readonly string[])[] = [
    LETTER_POOLS.FAMILIAR,
    LETTER_POOLS.WIDER,
    LETTER_POOLS.FULL,
  ];
  const ALLOWANCE = [0, 1, 2];
  let planted = 0;

  for (const challenge of drawn("letter-partners")) {
    const payload = assertWellFormed(challenge, [3, 4, 5]);
    const index = challenge.level <= 1 ? 0 : challenge.level === 2 ? 1 : 2;

    const letters = payload.pairs.map((pair) => {
      const big = pair.leftId.replace("letter-", "");
      const little = pair.rightId.replace("letter-", "");
      /* The only real correctness rule here: the two cards are the same
         letter in its two forms. Ids carry the case, so A and a cannot
         collide, and the test reads them back rather than trusting them. */
      assert.equal(big, big.toUpperCase(), `${challenge.id}: ${big} is not a capital`);
      assert.equal(little, little.toLowerCase(), `${challenge.id}: ${little} is not little`);
      assert.equal(
        big.toLowerCase(),
        little,
        `${challenge.id}: ${big} is paired with ${little}`,
      );
      return big;
    });

    /* A level deals from its own pool and no wider. */
    for (const letter of letters) {
      assert.ok(
        POOLS[index].includes(letter),
        `${challenge.id}: ${letter} is not in the level's pool`,
      );
      assert.ok(!ambiguous.includes(letter), `${challenge.id}: ${letter} is on a board`);
    }

    /* Difficulty is how many hard-to-split pairs are on the board, and it is
       an allowance rather than an accident. Level one allows none at all. */
    const collisions = confusions(letters);
    assert.ok(
      collisions <= ALLOWANCE[index],
      `${challenge.id}: ${collisions} confusable pairs, ${ALLOWANCE[index]} allowed`,
    );
    if (challenge.level >= 3 && collisions > 0) planted += 1;
    if (challenge.level <= 1) {
      assert.equal(collisions, 0, `${challenge.id}: level one is meant to be clean`);
    }
  }

  /* And the top level really does plant one, rather than hoping for it. */
  assert.ok(planted > 0, "level three never dealt a confusable pair");
});

/* 4 ---------------------------------------------------------------------- */
test("numbers and how many: the dots really are the numeral, in one colour", () => {
  assert.equal(QUANTITY_FACTS, 10, "the honest count has moved");

  const CEILING = [5, 8, 10];
  const ALLOWANCE = [1, 1, 2];
  let planted = 0;

  for (const challenge of drawn("quantity-partners")) {
    const payload = assertWellFormed(challenge, [3, 4, 5]);
    const index = challenge.level <= 1 ? 0 : challenge.level === 2 ? 1 : 2;

    const values = payload.pairs.map((pair) => {
      const numeral = pair.leftId.match(/^n(\d+)$/);
      const group = pair.rightId.match(/^dots-(\d+)$/);
      assert.ok(numeral && group, `${challenge.id}: ${pair.leftId} to ${pair.rightId}`);
      assert.equal(numeral[1], group[1], `${challenge.id}: ${numeral[1]} is not ${group[1]} dots`);
      return Number(numeral[1]);
    });

    /* Every card is drawn as what it claims to be, and the pips are all one
       colour: a different hue per group would let a board be finished by
       matching colours without counting anything. */
    const accents = new Set<string>();
    for (const node of payload.right) {
      assert.equal(node.item.kind, "count", `${challenge.id}: a group is not dots`);
      if (node.item.kind === "count") {
        accents.add(node.item.accent ?? "none");
        assert.ok(node.item.value >= 1, `${challenge.id}: an empty group`);
      }
    }
    assert.equal(accents.size, 1, `${challenge.id} colours the groups differently`);
    for (const node of payload.left) {
      assert.equal(node.item.kind, "number", `${challenge.id}: a card is not a numeral`);
    }

    for (const value of values) {
      assert.ok(
        value >= 1 && value <= CEILING[index],
        `${challenge.id}: ${value} is outside 1 to ${CEILING[index]}`,
      );
    }

    /* Two groups one apart are the pair a child can get wrong by looking
       instead of counting, so how many of them a board holds is the lever. */
    let neighbours = 0;
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        if (Math.abs(values[i] - values[j]) === 1) neighbours += 1;
      }
    }
    assert.ok(
      neighbours <= ALLOWANCE[index],
      `${challenge.id}: ${neighbours} neighbouring groups, ${ALLOWANCE[index]} allowed`,
    );
    if (challenge.level >= 3 && neighbours > 0) planted += 1;
  }

  assert.ok(planted > 0, "level three never dealt two groups one apart");

  /* And the reason level one allows a neighbouring pair at all: forbidding it
     leaves exactly one board — 1, 3 and 5 — and a child would meet it every
     time. What the level actually promises is variety, so that is what is
     counted. */
  const easy = new Set(
    drawn("quantity-partners")
      .filter((challenge) => challenge.level === 1)
      .map((challenge) =>
        boardOf(challenge)
          .pairs.map((pair) => pair.leftId)
          .sort()
          .join(","),
      ),
  );
  assert.ok(easy.size >= 5, `level one only ever deals ${easy.size} boards`);
});

/* 5 ---------------------------------------------------------------------- */
test("words and their opposites: one pair per dimension, so one way to finish", () => {
  const byWord = new Map<string, (typeof OPPOSITES)[number]>();
  for (const entry of OPPOSITES) {
    byWord.set(entry.a, entry);
    byWord.set(entry.b, entry);
  }

  for (const challenge of drawn("opposite-partners")) {
    const payload = assertWellFormed(challenge, [3, 4, 4]);

    const families = new Set<string>();
    for (const pair of payload.pairs) {
      const near = payload.left.find((node) => node.id === pair.leftId);
      const far = payload.right.find((node) => node.id === pair.rightId);
      assert.ok(near && far, `${challenge.id}: a line names a card that is not there`);
      const a = near.item.kind === "text" ? near.item.text : "";
      const b = far.item.kind === "text" ? far.item.text : "";

      const entry = byWord.get(a);
      assert.ok(entry, `${challenge.id}: ${a} is not in the table`);
      assert.equal(
        b,
        a === entry.a ? entry.b : entry.a,
        `${challenge.id}: ${a} is paired with ${b}`,
      );
      assert.ok(entry.level <= challenge.level, `${challenge.id} deals a harder pair`);

      /* The rule this board could not exist without. BIG/SMALL and TALL/SHORT
         on one board lets a child join BIG to SHORT, be refused, and be right
         anyway — so a dimension appears at most once. */
      assert.ok(!families.has(entry.family), `${challenge.id}: ${entry.family} twice`);
      families.add(entry.family);
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("animals and their sounds: every sound belongs to exactly one animal", () => {
  /* The table first, because the whole board rests on it: if two animals
     shared a noise, a board holding both would have two ways to finish. */
  const sounds = SOUND_FACTS.map((animal) => animal.sound);
  assert.equal(new Set(sounds).size, sounds.length, "two animals make the same sound");
  const names = SOUND_FACTS.map((animal) => animal.name);
  assert.equal(new Set(names).size, names.length, "an animal is listed twice");
  assert.ok(SOUND_FACTS.length >= 15, `only ${SOUND_FACTS.length} sounds`);

  const byName = new Map(SOUND_FACTS.map((animal) => [animal.name, animal] as const));
  let newer = 0;

  for (const challenge of drawn("sound-partners")) {
    const payload = assertWellFormed(challenge, [3, 4, 5]);
    const ceiling = challenge.level <= 1 ? 1 : challenge.level === 2 ? 2 : 3;

    const levels: number[] = [];
    for (const pair of payload.pairs) {
      const name = pair.leftId.replace("animal-", "");
      const animal = byName.get(name);
      assert.ok(animal, `${challenge.id}: ${name} is not in the table`);
      assert.equal(
        pair.rightId,
        `sound-${animal.sound}`,
        `${challenge.id}: ${name} joins the wrong sound`,
      );
      const at = soundLevelOf(animal);
      assert.ok(at <= ceiling, `${challenge.id}: ${name} is a level ${at} animal`);
      levels.push(at);
    }

    /* Level three always holds at least one of the sounds only it teaches, so
       the top level can never deal five farmyard animals and call itself
       hard. */
    if (challenge.level >= 3) {
      assert.ok(levels.includes(3), `${challenge.id}: nothing here is new`);
      newer += 1;
    }
  }

  assert.ok(newer > 0, "level three was never dealt");
});
