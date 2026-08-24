import assert from "node:assert/strict";
import { test } from "node:test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  challengeKey,
  checkAnswer,
  checkStep,
  conceptKey,
  drawChallenges,
} from "@/lib/content/challenges";
import { resolveLevel, type Level } from "@/lib/content/difficulty";
import { letterPartnersActivity, MATCH_PACK } from "@/lib/content/packs/match";
import {
  AMBIGUOUS,
  confusable,
  confusions,
  TEACHABLE,
} from "@/lib/content/packs/match/shared";
import { getActivity, getPack } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Challenge, ChallengeOf } from "@/lib/content/types";
import { validatePack } from "@/lib/content/validate";
import { GAMES, getGame } from "@/data/games";
import {
  boardOf,
  buildMatchQuestSession,
  freshMatchQuestState,
  matchQuestProgress,
  matchQuestReducer,
  MATCH_QUEST_LENGTH,
  MATCH_QUEST_PLAN,
  MATCH_QUEST_TIMING,
  type MatchQuestState,
} from "@/lib/games/matchQuest";

/**
 * Match Quest, played without a browser.
 *
 * The board itself is not retested here: it is a `connect` board, `MatchStage`
 * draws it, and `tests/match.test.ts` already holds forty-four promises about
 * how one behaves. What is new in this game is the *content* — twenty-four
 * letter correspondences, and the rules that decide which of them meet on a
 * board — and the *round* the boards are dealt into. Those are what this file
 * is about.
 *
 * One test in it deliberately duplicates work the generator already did.
 * `everyCorrespondence` is a hand-written table of what each capital's lower
 * case form actually is, and the board is checked against that rather than
 * against `toLowerCase`. A generator that pairs `A` with `a` by calling
 * `toLowerCase`, checked by a test that calls `toLowerCase`, has proved
 * nothing at all.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const source = (path: string) => read(path);

/**
 * What every capital's little letter actually is.
 *
 * Typed out, not derived. This is the independent half of the check, and the
 * moment it is computed it stops being one.
 */
const LOWER_CASE: Record<string, string> = {
  A: "a", B: "b", C: "c", D: "d", E: "e", F: "f", G: "g", H: "h", I: "i",
  J: "j", K: "k", L: "l", M: "m", N: "n", O: "o", P: "p", Q: "q", R: "r",
  S: "s", T: "t", U: "u", V: "v", W: "w", X: "x", Y: "y", Z: "z",
};

type Board = ChallengeOf<"connect">;

function isBoard(challenge: Challenge): challenge is Board {
  return challenge.payload.kind === "connect";
}

/** Draw one board, repeatably. */
function board(level: Level = 2, seed = 3): Board {
  const [drawn] = drawChallenges(letterPartnersActivity, {
    level,
    count: 1,
    rng: createRng(seed),
  });
  assert.ok(drawn && isBoard(drawn), "expected a letter board");
  return drawn;
}

/** Draw a lot, at every level, and keep what came out. */
function sample(seeds = 40): Board[] {
  const drawn: Board[] = [];
  for (const level of letterPartnersActivity.levels) {
    for (let seed = 0; seed < seeds; seed += 1) {
      for (const challenge of drawChallenges(letterPartnersActivity, {
        level,
        count: 4,
        rng: createRng(seed),
      })) {
        assert.ok(isBoard(challenge));
        drawn.push(challenge);
      }
    }
  }
  return drawn;
}

const SAMPLE = sample();

const at = (level: Level) => SAMPLE.filter((b) => b.level === level);

/** The capitals on a board, as plain letters. */
function capitals(b: Board): string[] {
  return b.payload.left.map((node) => {
    assert.equal(node.item.kind, "text");
    return (node.item as { text: string }).text;
  });
}

/** The lower case letters on a board, in the order they are laid out. */
function littles(b: Board): string[] {
  return b.payload.right.map((node) => {
    assert.equal(node.item.kind, "text");
    return (node.item as { text: string }).text;
  });
}

/* CONTENT ================================================================= */

/* 1 ---------------------------------------------------------------------- */
test("the pack is registered, and everything in it is a connect activity", () => {
  const pack = getPack("match");
  assert.ok(pack, "the match pack is not in the registry");
  assert.equal(pack, MATCH_PACK);
  assert.ok(pack.activities.length > 0);

  for (const activity of pack.activities) {
    assert.equal(activity.kind, "connect", `${activity.id} is not a match board`);
    assert.equal(activity.packId, "match");
  }

  assert.ok(getActivity("match.letter-partners"), "the letters activity is missing");
});

/* 2 ---------------------------------------------------------------------- */
test("every board the pack can deal validates", () => {
  assert.deepEqual(validatePack(MATCH_PACK), []);
});

/* 3 ---------------------------------------------------------------------- */
test("a board holds the number of pairs its level asked for", () => {
  const expected: Record<number, number> = { 1: 3, 2: 4, 3: 5 };

  for (const b of SAMPLE) {
    const want = expected[b.level];
    assert.equal(b.payload.pairs.length, want, `level ${b.level} board`);
    assert.equal(b.payload.left.length, want);
    assert.equal(b.payload.right.length, want);
  }
});

/* 4 ---------------------------------------------------------------------- */
test("card ids are unique in each group, and no pair names a card that is not there", () => {
  for (const b of SAMPLE) {
    const left = b.payload.left.map((node) => node.id);
    const right = b.payload.right.map((node) => node.id);

    assert.equal(new Set(left).size, left.length, "two capitals share an id");
    assert.equal(new Set(right).size, right.length, "two little letters share an id");

    for (const pair of b.payload.pairs) {
      assert.ok(left.includes(pair.leftId), `${pair.leftId} is not on the board`);
      assert.ok(right.includes(pair.rightId), `${pair.rightId} is not on the board`);
    }
  }
});

/* 5 ---------------------------------------------------------------------- */
test("every card is in exactly one pair, so the board can always be finished", () => {
  for (const b of SAMPLE) {
    for (const node of b.payload.left) {
      const held = b.payload.pairs.filter((pair) => pair.leftId === node.id);
      assert.equal(held.length, 1, `${node.id} is in ${held.length} pairs`);
    }
    for (const node of b.payload.right) {
      const held = b.payload.pairs.filter((pair) => pair.rightId === node.id);
      assert.equal(held.length, 1, `${node.id} is in ${held.length} pairs`);
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("the little letter really is that capital's little letter", () => {
  for (const b of SAMPLE) {
    const left = new Map(b.payload.left.map((node) => [node.id, node.item]));
    const right = new Map(b.payload.right.map((node) => [node.id, node.item]));

    for (const pair of b.payload.pairs) {
      const big = left.get(pair.leftId) as { text: string; label?: string };
      const little = right.get(pair.rightId) as { text: string; label?: string };
      assert.ok(big && little);

      /* Checked against the table at the top of this file, never against
         `toLowerCase` — the generator already used that, and a check that
         reuses the method under test is not a check. */
      const answer = LOWER_CASE[big.text];
      assert.ok(answer, `${big.text} is not a capital letter`);
      assert.equal(
        little.text,
        answer,
        `${big.text} was paired with "${little.text}"`,
      );

      /* And what a screen reader hears agrees with what is drawn. */
      assert.equal(big.label, `big ${big.text}`);
      assert.equal(little.label, `little ${little.text}`);
    }
  }
});

/* 7 ---------------------------------------------------------------------- */
test("there is exactly one way to finish a board", () => {
  for (const b of SAMPLE.slice(0, 60)) {
    const right = b.payload.right.map((node) => node.id);

    /* Every capital, against every little letter on the board. Only the
       authored partner is ever accepted. */
    for (const pair of b.payload.pairs) {
      for (const rightId of right) {
        const ok = checkStep(b, {
          kind: "connect",
          links: [{ leftId: pair.leftId, rightId }],
        });
        assert.equal(
          ok,
          rightId === pair.rightId,
          `${pair.leftId} + ${rightId} was marked ${ok}`,
        );
      }
    }

    /* And the whole board only when all of it is joined. */
    assert.ok(checkAnswer(b, { kind: "connect", links: [...b.payload.pairs] }));
    assert.ok(
      !checkAnswer(b, { kind: "connect", links: b.payload.pairs.slice(1) }),
      "a board with a pair missing was called finished",
    );
  }
});

/* 8 ---------------------------------------------------------------------- */
test("no board ever holds a capital I or a lower case l", () => {
  for (const b of SAMPLE) {
    for (const letter of capitals(b)) {
      assert.ok(
        !AMBIGUOUS.includes(letter as (typeof AMBIGUOUS)[number]),
        `a board offered ${letter}, whose two forms are one stroke`,
      );
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("difficulty is not just more cards: the letters get harder too", () => {
  /* Level 1 never asks a beginner to split hairs. */
  for (const b of at(1)) {
    assert.equal(
      confusions(capitals(b)),
      0,
      `an easy board held two letters that are hard to tell apart: ${capitals(b).join("")}`,
    );
  }

  /* Level 2 allows one collision, and no more. */
  for (const b of at(2)) {
    assert.ok(
      confusions(capitals(b)) <= 1,
      `a middle board held ${confusions(capitals(b))} collisions`,
    );
  }

  /* Level 3 plants one, so a hard board is hard on purpose rather than by
     luck — and still never more than two. */
  for (const b of at(3)) {
    const count = confusions(capitals(b));
    assert.ok(count >= 1, `a hard board had nothing hard on it: ${capitals(b).join("")}`);
    assert.ok(count <= 2, `a hard board held ${count} collisions`);
  }
});

/* 10 --------------------------------------------------------------------- */
test("the easiest boards are drawn from the letters a child meets first", () => {
  const familiar = new Set(at(1).flatMap(capitals));
  assert.ok(familiar.size <= 10, "the easy pool has grown past the familiar letters");

  const widest = new Set(at(3).flatMap(capitals));
  assert.ok(
    widest.size > familiar.size,
    "the hardest boards draw from no wider a pool than the easiest",
  );
});

/* 11 --------------------------------------------------------------------- */
test("the two shelves are never dealt in step", () => {
  for (const b of SAMPLE) {
    const partner = new Map(
      b.payload.pairs.map((pair) => [pair.leftId, pair.rightId]),
    );

    b.payload.left.forEach((node, index) => {
      assert.notEqual(
        b.payload.right[index]?.id,
        partner.get(node.id),
        `a board could be finished by position: ${capitals(b).join("")} / ${littles(b).join("")}`,
      );
    });
  }
});

/* 12 --------------------------------------------------------------------- */
test("the same seed deals the same board, every time", () => {
  for (const level of letterPartnersActivity.levels) {
    const once = board(level, 11);
    const again = board(level, 11);
    assert.deepEqual(again, once);
    assert.equal(challengeKey(again), challengeKey(once));
  }
});

/* 13 --------------------------------------------------------------------- */
test("different seeds deal genuinely different boards, not the same one reshuffled", () => {
  for (const level of letterPartnersActivity.levels) {
    const letters = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      letters.add([...capitals(board(level, seed))].sort().join(""));
    }
    assert.ok(
      letters.size >= 15,
      `level ${level} only ever deals ${letters.size} sets of letters`,
    );
  }
});

/* 14 --------------------------------------------------------------------- */
test("every one of the twenty-four correspondences can actually come up", () => {
  const seen = new Set(SAMPLE.flatMap(capitals));
  assert.deepEqual(
    [...seen].sort(),
    [...TEACHABLE].sort(),
    "some letters this pack claims to teach are never dealt",
  );
  assert.equal(seen.size, 24);
});

/* 15 --------------------------------------------------------------------- */
test("a board's key does not depend on how it was laid out", () => {
  const b = board(3, 7);
  const reversed: Board = {
    ...b,
    payload: {
      ...b.payload,
      left: [...b.payload.left].reverse(),
      right: [...b.payload.right].reverse(),
      pairs: [...b.payload.pairs].reverse(),
    },
  };

  assert.equal(challengeKey(reversed), challengeKey(b));
  assert.equal(conceptKey(reversed), conceptKey(b));
});

/* 16 --------------------------------------------------------------------- */
test("the concept is the letters, and survives KIDDO saying it differently", () => {
  const b = board(2, 5);
  const relined: Board = { ...b, prompt: { speech: "A completely different line." } };

  assert.notEqual(challengeKey(relined), challengeKey(b), "the line is part of the board");
  assert.equal(conceptKey(relined), conceptKey(b), "the line is not part of the idea");

  /* And the idea names the letters, sorted, so it cannot depend on order. */
  const letters = [...capitals(b)].sort().join("+");
  assert.ok(conceptKey(b).endsWith(`letter-case:${letters}`), conceptKey(b));
});

/* 17 --------------------------------------------------------------------- */
test("three levels are authored, and a request above them snaps to the top", () => {
  assert.deepEqual(letterPartnersActivity.levels, [1, 2, 3]);
  assert.equal(resolveLevel(4, letterPartnersActivity.levels), 3);
  assert.equal(resolveLevel(5, letterPartnersActivity.levels), 3);
  assert.equal(resolveLevel(1, letterPartnersActivity.levels), 1);

  /* Every authored level is reachable, and deals something. */
  for (const level of letterPartnersActivity.levels) {
    assert.equal(board(level, 2).level, level);
  }
});

/* 18 --------------------------------------------------------------------- */
test("the pack's own confusability table is about pairs, not distractors", () => {
  assert.ok(confusable("B", "D"));
  assert.ok(confusable("D", "B"), "the table should not care which way round");
  assert.ok(confusable("M", "W"));
  assert.ok(!confusable("B", "S"));
  assert.equal(confusions(["B", "D", "P"]), 3);
  assert.equal(confusions(["B", "S", "T"]), 0);
});

/* SESSION ================================================================= */

/* 19 --------------------------------------------------------------------- */
test("a round is ten boards, drawn rather than written", () => {
  assert.equal(MATCH_QUEST_LENGTH, 10);
  assert.equal(MATCH_QUEST_PLAN.slots.length, 10);

  for (let seed = 0; seed < 25; seed += 1) {
    const session = buildMatchQuestSession(createRng(seed));
    assert.equal(session.length, 10, `seed ${seed} dealt ${session.length} boards`);
    for (const challenge of session) {
      assert.ok(isBoard(challenge), "a round dealt something that is not a board");
      assert.equal(challenge.packId, "match");
      assert.equal(challenge.activityId, "match.letter-partners");
    }
  }
});

/* 20 --------------------------------------------------------------------- */
test("a round is deterministic from its seed, and unseeded is repeatable too", () => {
  assert.deepEqual(
    buildMatchQuestSession(createRng(9)),
    buildMatchQuestSession(createRng(9)),
  );
  assert.deepEqual(buildMatchQuestSession(), buildMatchQuestSession());
  assert.notDeepEqual(
    buildMatchQuestSession(createRng(9)),
    buildMatchQuestSession(createRng(10)),
  );
});

/* 21 --------------------------------------------------------------------- */
test("no round teaches the same set of letters twice, or deals the same board twice", () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const session = buildMatchQuestSession(createRng(seed));

    const concepts = session.map(conceptKey);
    assert.equal(
      new Set(concepts).size,
      concepts.length,
      `seed ${seed} repeated an idea`,
    );

    const boards = session.map(challengeKey);
    assert.equal(
      new Set(boards).size,
      boards.length,
      `seed ${seed} repeated a board`,
    );

    /* And every board in it is a distinct challenge as far as a run is
       concerned, so nothing is skipped by id. */
    const ids = session.map((challenge) => challenge.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} repeated an id`);
  }
});

/* 22 --------------------------------------------------------------------- */
test("a round climbs — three gentle, five in the middle, two harder — and never the other way", () => {
  const levels = MATCH_QUEST_PLAN.slots.map((slot) => slot.level);
  assert.deepEqual(levels, [1, 1, 1, 2, 2, 2, 2, 2, 3, 3]);
  assert.equal(levels.filter((level) => level === 1).length, 3);
  assert.equal(levels.filter((level) => level === 2).length, 5);
  assert.equal(levels.filter((level) => level === 3).length, 2);

  for (let seed = 0; seed < 15; seed += 1) {
    const dealt = buildMatchQuestSession(createRng(seed)).map((c) => c.level);
    assert.deepEqual(dealt, levels, `seed ${seed} climbed differently`);
  }
});

/* 23 --------------------------------------------------------------------- */
test("a round is between thirty and fifty pairings, never one long board", () => {
  for (let seed = 0; seed < 15; seed += 1) {
    const pairs = buildMatchQuestSession(createRng(seed))
      .filter(isBoard)
      .reduce((total, b) => total + b.payload.pairs.length, 0);
    assert.equal(pairs, 3 * 3 + 5 * 4 + 2 * 5);
  }
});

/* THE ROUND =============================================================== */

const start = () => freshMatchQuestState(buildMatchQuestSession(createRng(4)));

function apply(
  state: MatchQuestState,
  ...actions: Parameters<typeof matchQuestReducer>[1][]
): MatchQuestState {
  return actions.reduce(matchQuestReducer, state);
}

/** Finish a board: it is solved, held for a beat, then the next is dealt. */
function nextBoard(state: MatchQuestState): MatchQuestState {
  return apply(state, { type: "solved" }, { type: "advance" });
}

/* 24 --------------------------------------------------------------------- */
test("the round opens with KIDDO saying hello", () => {
  const state = start();
  assert.equal(state.phase, "intro");
  assert.deepEqual(matchQuestProgress(state), { current: 0, total: 10 });

  assert.equal(apply(state, { type: "begin" }).phase, "playing");
});

/* 25 --------------------------------------------------------------------- */
test("a dealt round waits behind the front door rather than starting itself", () => {
  const state = apply(start(), {
    type: "deal",
    challenges: buildMatchQuestSession(createRng(12)),
  });
  assert.equal(state.phase, "intro", "the seeded deal skipped KIDDO saying hello");
  assert.equal(state.run.index, 0);
});

/* 26 --------------------------------------------------------------------- */
test("a finished board is held on screen before the next one is dealt", () => {
  const playing = apply(start(), { type: "begin" });
  const solved = apply(playing, { type: "solved" });

  assert.equal(solved.phase, "settling");
  assert.equal(solved.run.index, 0, "the board moved on before the child saw it");
  assert.equal(boardOf(solved), boardOf(playing), "the finished board vanished");

  const next = apply(solved, { type: "advance" });
  assert.equal(next.phase, "playing");
  assert.equal(next.run.index, 1);
  assert.notEqual(boardOf(next), boardOf(playing));

  /* Long enough to be a beat, short enough not to be a wait. */
  assert.ok(MATCH_QUEST_TIMING.settle >= 1000 && MATCH_QUEST_TIMING.settle <= 2000);
});

/* 27 --------------------------------------------------------------------- */
test("ten boards finish the round, and the last one stays on the table", () => {
  let state = apply(start(), { type: "begin" });
  const last = boardOf(
    Array.from({ length: 9 }).reduce<MatchQuestState>(
      (current) => nextBoard(current),
      state,
    ),
  );

  for (let i = 0; i < 10; i += 1) state = nextBoard(state);

  assert.equal(state.phase, "complete");
  assert.deepEqual(matchQuestProgress(state), { current: 10, total: 10 });
  assert.equal(state.run.completed.length, 10);

  /* `boardOf` never hands React nothing, which is what lets the hook keep
     running the engine while the celebration is on top of it. */
  assert.equal(boardOf(state), last);
});

/* 28 --------------------------------------------------------------------- */
test("playing again deals new boards and skips the hello", () => {
  let state = apply(start(), { type: "begin" });
  for (let i = 0; i < 10; i += 1) state = nextBoard(state);

  const again = apply(state, {
    type: "restart",
    challenges: buildMatchQuestSession(createRng(77)),
  });

  assert.equal(again.phase, "playing");
  assert.equal(again.run.index, 0);
  assert.deepEqual(again.run.completed, []);
  assert.equal(again.run.challenges.length, 10);
});

/* 29 --------------------------------------------------------------------- */
test("actions that arrive at the wrong moment fall on the floor", () => {
  const intro = start();

  /* Nothing can be solved before it has been started. */
  assert.equal(apply(intro, { type: "solved" }), intro);
  assert.equal(apply(intro, { type: "advance" }), intro);

  const playing = apply(intro, { type: "begin" });
  assert.equal(apply(playing, { type: "begin" }), playing);
  assert.equal(apply(playing, { type: "advance" }), playing, "a board skipped its beat");

  /* And a board cannot be finished twice while it is being held. */
  const settling = apply(playing, { type: "solved" });
  assert.equal(apply(settling, { type: "solved" }), settling);
});

/* 30 --------------------------------------------------------------------- */
test("the reducer is pure: it never edits the state it was handed", () => {
  const state = apply(start(), { type: "begin" });
  const before = JSON.stringify(state);
  matchQuestReducer(state, { type: "solved" });
  matchQuestReducer(state, { type: "advance" });
  matchQuestReducer(state, { type: "deal", challenges: [] });
  assert.equal(JSON.stringify(state), before);
});

/* GAME ==================================================================== */

/* 31 --------------------------------------------------------------------- */
test("Match Quest is in the catalogue and wired to a route of its own", () => {
  const game = getGame("match-quest");
  assert.ok(game, "match-quest is not in the catalogue");
  assert.equal(game.route, "/play/match-quest");
  assert.equal(game.status, "ready");
  assert.equal(game.access, "free");
  assert.ok(game.cast.length > 0);
  assert.ok(game.themes.length > 0);
  for (const theme of game.themes) {
    assert.equal(theme.access, "free", `${theme.id} is locked`);
  }

  assert.equal(GAMES.filter((g) => g.id === "match-quest").length, 1);
  assert.equal(new Set(GAMES.map((g) => g.route)).size, GAMES.length);
  assert.equal(new Set(GAMES.map((g) => g.id)).size, GAMES.length);

  const route = source("src/app/play/[gameId]/page.tsx");
  assert.match(route, /"match-quest": MatchQuestGame/);
});

/* 32 --------------------------------------------------------------------- */
test("the card has artwork of its own, drawn from the vocabulary that already existed", () => {
  const game = getGame("match-quest");
  assert.ok(game?.artwork, "Match Quest has no key art, so it falls back to a line-up");
  assert.equal(game.artwork.motif.kind, "pair");
  assert.ok(game.cast.includes(game.artwork.host), "a stranger is holding the cards");

  /* One branch, one file, and the dispatcher still has no default case — so
     the day a ninth motif arrives, it cannot ship without a picture. */
  const dispatcher = source("src/components/kiddo/artwork/GameArtwork.tsx");
  assert.match(dispatcher, /case "pair":\s*\n\s*return <PairMotif/);
  assert.ok(!/default:/.test(dispatcher), "the motif switch grew a default case");

  const motif = source("src/components/kiddo/artwork/motifs/pair.tsx");
  /* Built from the shared scene, not from a second illustration system. */
  for (const piece of ["bandCentre", "PROPS", "Tile", "Glyph", "QuestionMark"]) {
    assert.ok(motif.includes(piece), `the pair motif does not use ${piece}`);
  }
  assert.ok(!/<svg|viewBox|filter|feGaussianBlur/.test(motif), "the motif drew its own canvas");
});

/* 33 --------------------------------------------------------------------- */
test("no new interaction engine was built for it", () => {
  const game = source("src/components/games/match/MatchQuestGame.tsx");

  /* The stage that already existed, used as it is. */
  assert.match(game, /import \{ MatchStage \}/);
  assert.match(game, /<MatchStage/);

  const hook = source("src/lib/games/useMatchQuestGame.ts");
  assert.match(hook, /import \{ useConnect \}/);

  /* The board's state is passed through, never kept a second time, and the
     verdict on a pair is the engine's — not one line of Match Quest decides
     whether two cards go together. */
  for (const file of [game, hook, source("src/lib/games/matchQuest.ts")]) {
    for (const forbidden of ["checkStep(", "checkAnswer(", "useState<", "setSelected"]) {
      assert.ok(
        !file.includes(forbidden),
        `Match Quest re-implements the board (${forbidden})`,
      );
    }
  }

  /* And the pack contains no stage of its own to have built. */
  const stages = execSync(
    "ls src/components/games/match",
  ).toString();
  assert.ok(!/Stage\.tsx/.test(stages), `a second stage appeared: ${stages}`);
});

/* 33a -------------------------------------------------------------------- */
test("a fresh board is never finished before the child has touched it", () => {
  const hook = source("src/lib/games/useMatchQuestGame.ts");

  /* A scar. `useConnect` moves to a new board in an effect, so for one commit
     after the round advances its state still describes the board that was
     just completed — and a round that trusts `status` alone in that commit
     finishes the new board on the spot. Measured in a browser before this
     line existed: ten steps, five of them dealt and skipped in the same beat,
     nineteen cheers where there should have been thirty-nine.

     The guard is identity, and it is asserted here rather than in a render
     test because there is no renderer in this suite — this is the cheapest
     thing that fails if someone simplifies the line away. */
  assert.match(
    hook,
    /const solved =\s*board\.status === "complete" && board\.challenge === current;/,
    "the round trusts the engine's status without checking which board it is about",
  );
});

/* 34 --------------------------------------------------------------------- */
test("sound comes from the shell, and there is only one shell", () => {
  const game = source("src/components/games/match/MatchQuestGame.tsx");
  assert.match(game, /<GameShell/);
  assert.match(game, /feedback=\{feedback\}/);
  assert.match(game, /status=\{match\.status\}/);

  /* Not one line of audio in the game. The shell reads `feedback` and
     `status` and plays the round; a second audio path would be a second
     answer to when KIDDO cheers. */
  for (const forbidden of ["useSound", "useMusic", "Audio(", "new Audio", "kiddoAudio"]) {
    assert.ok(!game.includes(forbidden), `Match Quest plays its own ${forbidden}`);
  }

  const shell = source("src/components/games/GameShell.tsx");
  assert.match(shell, /useSoundCue/);
  assert.match(shell, /useDuckedMusic/);
  assert.match(shell, /<WorldMusic/);
  assert.match(shell, /<SoundToggle/);
});

/* 35 --------------------------------------------------------------------- */
test("a pair that does not hold is never punished in words", () => {
  const game = source("src/components/games/match/MatchQuestGame.tsx");

  assert.match(game, /Great match!/);
  assert.match(game, /Those two belong together!/);
  assert.match(game, /Not these two yet\./);
  assert.match(game, /Have another look\./);
  assert.match(game, /Who could be its friend\?/);

  for (const forbidden of ["Wrong", "Failed", "Incorrect", "Oops", "No,", "Try harder"]) {
    assert.ok(
      !game.includes(forbidden),
      `Match Quest says "${forbidden}" to a four year old`,
    );
  }

  /* No score, no lives, no clock — not in the game and not in its rules. */
  const rules = source("src/lib/games/matchQuest.ts");
  for (const file of [game, rules]) {
    for (const forbidden of ["score", "streak", "penalt", "attempts left"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}`, "i").test(file),
        `Match Quest keeps a ${forbidden}`,
      );
    }
    assert.ok(!/\blives\s*[:=]|\blives (left|remaining)\b/.test(file));
  }
});

/* 36 --------------------------------------------------------------------- */
test("what the pack says out loud is said several ways, and never repeats inside a round", () => {
  const lines = new Set(SAMPLE.map((b) => b.prompt.speech));
  assert.ok(lines.size >= 4, `KIDDO only ever says ${lines.size} things`);

  const cheers = new Set(SAMPLE.map((b) => b.explanation));
  assert.ok(cheers.size >= 3, "the round is celebrated the same way every time");

  /* Every one of them is an invitation, not an instruction to a worksheet. */
  for (const line of [...lines, ...cheers]) {
    assert.ok(line && line.length < 90, `"${line}" is too long to be said`);
    assert.ok(!/question|answer|correct|score/i.test(line), `"${line}" sounds like a test`);
  }

  /* And every board has somewhere to look if the child gets stuck, which
     never names the card to tap. */
  for (const b of SAMPLE) {
    assert.ok(b.hint, "a board has no hint");
    assert.ok(
      !/^[A-Z]$/.test(b.hint.trim()) && !b.hint.includes("Tap the"),
      `"${b.hint}" gives the answer away`,
    );
  }
});
