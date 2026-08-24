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
import { ALPHABET_RUNS } from "@/lib/content/packs/english/alphabetOrder";
import { ENGLISH_ACTIVITIES, ENGLISH_PACK } from "@/lib/content/packs/english";
import { ENDING_WORDS, couldEnd } from "@/lib/content/packs/english/endingSounds";
import { OPPOSITES, OPPOSITE_PAIRS } from "@/lib/content/packs/english/opposites";
import { PHONICS_WORDS, SAME_SOUND } from "@/lib/content/packs/english/phonics";
import { PLURAL_WORDS } from "@/lib/content/packs/english/plurals";
import { PICTURE_WORDS } from "@/lib/content/packs/english/soundPartners";
import { BUILDABLE_WORDS } from "@/lib/content/packs/english/wordBuild";
import { RHYME_FAMILIES, RHYME_PAIRS } from "@/lib/content/packs/english/rhyming";
import { SPELLING_WORDS } from "@/lib/content/packs/english/spelling";
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
  ConnectNode,
  ConnectPair,
} from "@/lib/content/types";
import { validatePack } from "@/lib/content/validate";

/**
 * The English content pack, checked as content rather than as code.
 *
 * The Math tests ask whether a sum is fair. These ask the same question of a
 * language, where "fair" is harder and more interesting: a board with two
 * letters that say the same sound has two right answers, a gap that spells a
 * second real word has two right answers, and a capital I next to a lower case
 * l has no answer at all. Every one of those is asserted below, because every
 * one of them was a real decision while the pack was written.
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

const SAMPLES = new Map(ENGLISH_ACTIVITIES.map((a) => [a.id, sample(a)] as const));

function drawn(id: string): Challenge[] {
  return SAMPLES.get(`english.${id}` as Activity["id"]) ?? [];
}

function everyEnglishChallenge(): Challenge[] {
  return [...SAMPLES.values()].flat();
}

/**
 * Every English challenge that is a `choice`, which is seven of the eleven.
 *
 * `alphabet-order` and `word-build` hand the child a tray of letters to
 * arrange, and `rhyming-partners` and `sound-partners` two columns to join, so
 * none of the four has an answer tile, distractors or a board of three or
 * four. The questions below that are really about *a choice board* ask this
 * one; the questions about whether the pack is deterministic, readable and
 * honestly levelled ask `everyEnglishChallenge`, and cover all eleven.
 */
function everyEnglishBoard(): Challenge[] {
  return everyEnglishChallenge().filter((c) => c.payload.kind === "choice");
}

/** The activity that teaches this, whichever slot it sits in. */
function activityFor(type: ActivityType): Activity {
  const found = ENGLISH_ACTIVITIES.find((a) => a.activityType === type);
  assert.ok(found, `the pack has no ${type} activity`);
  return found;
}

/** The board of a challenge, narrowed. */
function boardOf(challenge: Challenge): ChoicePayload {
  assert.equal(challenge.payload.kind, "choice", `${challenge.id} is not a choice`);
  return challenge.payload as ChoicePayload;
}

/** The id of every piece a child can move or tap, whichever kind of board. */
function pieceIdsOf(challenge: Challenge): string[] {
  const payload = challenge.payload;
  if (payload.kind === "choice") return payload.options.map((o) => o.id);
  if (payload.kind === "order") return payload.items.map((i) => i.id);
  if (payload.kind === "connect") {
    return [...payload.left, ...payload.right].map((node) => node.id);
  }
  return payload.pairs.map((pair) => pair.id);
}

/** The text on every tile, in board order. */
function tilesOf(challenge: Challenge): string[] {
  return boardOf(challenge).options.map((option) => {
    assert.equal(option.item.kind, "text", `${challenge.id}: a non-text tile`);
    return option.item.kind === "text" ? option.item.text : "";
  });
}

/** The text on the right tile. */
function answerTextOf(challenge: Challenge): string {
  const payload = boardOf(challenge);
  const option = payload.options.find((o) => o.id === payload.answerId);
  assert.ok(option, `${challenge.id}: the answer is not on the board`);
  return option.item.kind === "text" ? option.item.text : "";
}

/* ======================================================== content: the pack */

/* 1 ---------------------------------------------------------------------- */
test("the English pack is in the one content registry, once", () => {
  const packs = CONTENT_REGISTRY.filter((pack) => pack.id === "english");
  assert.equal(packs.length, 1, "english should appear exactly once");
  assert.equal(packs[0], ENGLISH_PACK);

  for (const activity of ENGLISH_ACTIVITIES) {
    assert.equal(
      getActivity(activity.id),
      activity,
      `${activity.id} should be reachable through the registry`,
    );
  }
});

/* 2 ---------------------------------------------------------------------- */
test("all eleven English activities are present, and all eleven validate", () => {
  const wanted: ActivityType[] = [
    "letter-recognition",
    "letter-case",
    "letter-sequence",
    "phonics",
    "ending-sounds",
    "rhyming",
    "spelling",
    "singular-plural",
    "opposites",
  ];
  const got = ENGLISH_ACTIVITIES.map((activity) => activity.activityType);
  assert.equal(ENGLISH_ACTIVITIES.length, 11);
  for (const type of wanted) {
    assert.ok(got.includes(type), `missing ${type}`);
  }

  /* Two of the nine subjects are asked more than one way, and that is the
     two-axis split rather than a duplicate: `phonics` is a letter to pick and
     a column of pictures to join to their letters, `spelling` is a word to
     complete and a word to build out of its letters. Same subject, different
     gesture, one thing known. */
  const twice = got.filter((type, index) => got.indexOf(type) !== index);
  assert.deepEqual(twice.sort(), ["phonics", "spelling"]);

  /* Seven ways of asking, two ways of arranging, two ways of joining. All
     three kinds already had an engine before this pack reached for them, so
     nothing here is a new interaction — what is asserted is that a fourth one
     has not quietly appeared. */
  assert.deepEqual(
    [...new Set(ENGLISH_ACTIVITIES.map((a) => a.kind))].sort(),
    ["choice", "connect", "order"],
  );

  assert.deepEqual(validatePack(ENGLISH_PACK), []);
  /* And adding a pack has not broken anybody else's. */
  for (const pack of CONTENT_REGISTRY) {
    assert.deepEqual(validatePack(pack), [], `${pack.id} should be valid`);
  }
});

/* 3 ---------------------------------------------------------------------- */
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
    assert.ok(count >= 20, `${id} can only ask ${count} distinct questions`);
  }
});

/* 4 ---------------------------------------------------------------------- */
test("the same seed deals the same round, a different seed does not", () => {
  for (const activity of ENGLISH_ACTIVITIES) {
    const level = activity.levels[0];
    const once = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
    const twice = drawChallenges(activity, { level, count: 6, rng: createRng(7) });
    assert.deepEqual(once, twice, `${activity.id} is not deterministic`);
  }

  /* At least one activity has to actually differ, or "seeded" means nothing. */
  const spelling = ENGLISH_ACTIVITIES.find((a) => a.activityType === "spelling")!;
  const a = drawChallenges(spelling, { level: 3, count: 6, rng: createRng(1) });
  const b = drawChallenges(spelling, { level: 3, count: 6, rng: createRng(2) });
  assert.notDeepEqual(a.map(challengeKey), b.map(challengeKey));
});

/* 5 ---------------------------------------------------------------------- */
test("one draw never repeats a question or an option id", () => {
  for (const activity of ENGLISH_ACTIVITIES) {
    for (const level of activity.levels) {
      const round = drawChallenges(activity, { level, count: 8, rng: createRng(11) });

      const ids = round.map((challenge) => challenge.id);
      assert.equal(new Set(ids).size, ids.length, `${activity.id}: repeated an id`);

      for (const challenge of round) {
        const pieceIds = pieceIdsOf(challenge);
        assert.equal(
          new Set(pieceIds).size,
          pieceIds.length,
          `${challenge.id}: two pieces share an id`,
        );
        if (challenge.payload.kind !== "choice") continue;
        const tiles = tilesOf(challenge);
        assert.equal(
          new Set(tiles).size,
          tiles.length,
          `${challenge.id}: the same tile twice — ${tiles.join(", ")}`,
        );
      }
    }
  }
});

/* 6 ---------------------------------------------------------------------- */
test("the registry can filter English by level, age, kind and pack", () => {
  const all = findActivities({ packId: "english" });
  assert.equal(all.length, 11);

  /* Seven of the eleven are a `choice`, which is why one engine renders
     English Quest. `kind` is the filter a game uses to find the content its
     renderer can actually draw, so it has to be able to tell them apart —
     English Quest asks for choices and gets exactly the seven it can show,
     and the four it cannot are invisible to it rather than broken inside
     it. */
  assert.equal(findActivities({ packId: "english", kind: "choice" }).length, 7);
  assert.deepEqual(
    findActivities({ packId: "english", kind: "order" }).map((a) => a.id).sort(),
    ["english.alphabet-order", "english.word-build"],
  );
  assert.deepEqual(
    findActivities({ packId: "english", kind: "connect" }).map((a) => a.id).sort(),
    ["english.rhyming-partners", "english.sound-partners"],
  );

  for (const level of [1, 2, 3] as const) {
    assert.equal(
      findActivities({ packId: "english", level }).length,
      11,
      `every activity should offer level ${level}`,
    );
  }

  /* Spelling and alphabet order start at five; the letter activities are for
     the four year old who cannot read yet, and so is rhyme — hearing that CAT
     and HAT end alike needs no reading at all. The filter has to tell them
     apart. */
  const forFour = findActivities({ packId: "english", age: 4 }).map((a) => a.id);
  assert.ok(!forFour.includes("english.spelling"));
  assert.ok(!forFour.includes("english.word-build"));
  assert.ok(!forFour.includes("english.alphabet-order"));
  assert.ok(!forFour.includes("english.plurals"));
  assert.ok(!forFour.includes("english.ending-sounds"));
  assert.ok(forFour.includes("english.rhyming-partners"));
  /* Beginning sounds needs no reading either, whether it is asked one letter
     at a time or as a column of pictures to join up. */
  assert.ok(forFour.includes("english.sound-partners"));
  assert.equal(forFour.length, 6);
  assert.equal(findActivities({ packId: "english", age: 8 }).length, 5);

  assert.deepEqual(findActivities({ packId: "english", category: "english" }), all);
});

/* 7 ---------------------------------------------------------------------- */
test("levels 4 and 5 snap down to what English actually offers", () => {
  for (const activity of ENGLISH_ACTIVITIES) {
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

    /* Snapping is not a crash guard, it is a promise: ask for 5 and the child
       gets the hardest thing this activity has, which is 3. */
    const hardest = drawChallenges(activity, { level: 5, count: 4, rng: createRng(3) });
    for (const challenge of hardest) {
      assert.equal(challenge.level, 3, `${activity.id} did not snap level 5 to 3`);
    }
  }
});

/* 8 ---------------------------------------------------------------------- */
test("every board has exactly one right answer, and checkAnswer finds it", () => {
  for (const challenge of everyEnglishBoard()) {
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

    /* Three tiles, or four at level 3. Never two, never a wall of them. */
    assert.ok(
      payload.options.length >= 3 && payload.options.length <= 4,
      `${challenge.id} has ${payload.options.length} tiles`,
    );
  }
});

/* 9 ---------------------------------------------------------------------- */
test("every challenge carries where it came from, and can be read aloud", () => {
  for (const activity of ENGLISH_ACTIVITIES) {
    for (const challenge of SAMPLES.get(activity.id) ?? []) {
      assert.equal(challenge.packId, "english");
      assert.equal(challenge.activityId, activity.id);
      assert.equal(challenge.category, "english");
      assert.equal(challenge.activityType, activity.activityType);
      assert.deepEqual(challenge.ageRange, activity.ageRange);
      assert.ok(
        challenge.id.startsWith(`${activity.id}#`),
        `${challenge.id} is not named after its activity`,
      );

      /* The one accessibility promise the content layer can keep by itself:
         the question has to make sense with the stage covered up. */
      assert.ok(challenge.prompt.speech.trim().length > 0);
      assert.ok(
        challenge.prompt.speech.endsWith("?"),
        `${challenge.id}: "${challenge.prompt.speech}" is not a question`,
      );
      assert.ok(challenge.explanation && challenge.explanation.trim().length > 0);
    }
  }
});

/* 10 --------------------------------------------------------------------- */
test("no tile is ever a distractor a child could not have meant", () => {
  for (const challenge of everyEnglishBoard()) {
    const payload = boardOf(challenge);
    const answer = answerTextOf(challenge);

    for (const option of payload.options) {
      const text = option.item.kind === "text" ? option.item.text : "";
      assert.ok(text.length > 0, `${challenge.id}: an empty tile`);
      assert.ok(
        /^[A-Za-z]+$/.test(text),
        `${challenge.id}: "${text}" is not letters`,
      );
      /* One case per board: a big A beside a little a is a trick, not a tile. */
      assert.equal(
        text === text.toUpperCase() ? "upper" : "lower",
        answer === answer.toUpperCase() ? "upper" : "lower",
        `${challenge.id}: "${text}" is a different case from "${answer}"`,
      );
      /* Every tile is the same shape of thing as the answer. A single letter
         never shares a board with a word. */
      assert.equal(
        [...text].length === 1,
        [...answer].length === 1,
        `${challenge.id}: "${text}" is not the same kind of tile as "${answer}"`,
      );
    }
  }
});

/* ================================================================ letters */

/* 11 --------------------------------------------------------------------- */
test("letter recognition names the letter it is asking for", () => {
  for (const challenge of drawn("letter-recognition")) {
    const answer = answerTextOf(challenge);
    assert.equal(
      challenge.prompt.speech,
      `Which one is the letter ${answer}?`,
      `${challenge.id}: the question does not name its answer`,
    );
    /* No display on purpose: printing the letter above the tiles would turn
       knowing a letter into matching two shapes. */
    assert.equal(challenge.prompt.display, undefined);
    assert.equal([...answer].length, 1);
    assert.equal(answer, answer.toUpperCase());
  }
});

/* 12 --------------------------------------------------------------------- */
test("recognition gets harder by the company the answer keeps", () => {
  const easy = new Set("ABCDEFHKMOPST");
  const level1 = drawChallenges(
    activityFor("letter-recognition"),
    { level: 1, count: 40, rng: createRng(4) },
  );
  for (const challenge of level1) {
    for (const tile of tilesOf(challenge)) {
      assert.ok(easy.has(tile), `level 1 offered ${tile}, which is not an easy letter`);
    }
    assert.equal(tilesOf(challenge).length, 3, "level 1 is three tiles");
  }

  const level3 = drawChallenges(
    activityFor("letter-recognition"),
    { level: 3, count: 40, rng: createRng(4) },
  );
  for (const challenge of level3) {
    assert.equal(tilesOf(challenge).length, 4, "level 3 is four tiles");
  }
});

/* 13 --------------------------------------------------------------------- */
test("big and little letters: one case per board, and the pair is real", () => {
  for (const challenge of drawn("letter-case")) {
    const answer = answerTextOf(challenge);
    const speech = challenge.prompt.speech;

    /* "Big C. Which little letter matches?" and the other way round. */
    const askingForLower = speech.startsWith("Big ");
    const shown = askingForLower
      ? speech.slice("Big ".length, speech.indexOf("."))
      : speech.slice("Little ".length, speech.indexOf("."));

    assert.equal(
      answer,
      askingForLower ? shown.toLowerCase() : shown.toUpperCase(),
      `${challenge.id}: "${speech}" is not answered by ${answer}`,
    );
    assert.equal(
      answer === answer.toLowerCase(),
      askingForLower,
      `${challenge.id}: the board is in the wrong case`,
    );

    /* The stage shows the other half of the pair, and only that. */
    const display = challenge.prompt.display ?? [];
    assert.equal(display.length, 1);
    const first = display[0];
    assert.ok(first.kind === "item" && first.item.kind === "text");
    if (first.kind === "item" && first.item.kind === "text") {
      assert.equal(first.item.text, shown);
      assert.notEqual(
        first.item.text,
        answer,
        `${challenge.id}: the answer is printed on the stage`,
      );
    }
  }
});

/* 14 --------------------------------------------------------------------- */
test("no case question is ever about I or L, the two identical strokes", () => {
  /* A capital I and a lower case l are the same vertical stroke in this
     typeface, so `I -> i` and `l -> L` are questions with two defensible
     answers. Both letters are kept out of the pools the question is drawn
     from — never out of the boards, where a single-case tile is still
     perfectly tellable apart from its neighbours. */
  for (const challenge of drawn("letter-case")) {
    const speech = challenge.prompt.speech;
    const asked = speech.startsWith("Big ")
      ? speech.slice("Big ".length, speech.indexOf("."))
      : speech.slice("Little ".length, speech.indexOf("."));

    assert.ok(
      !"IL".includes(asked.toUpperCase()),
      `${challenge.id}: "${speech}" asks about an unanswerable pair`,
    );
    assert.ok(
      !"IL".includes(answerTextOf(challenge).toUpperCase()),
      `${challenge.id}: ${answerTextOf(challenge)} cannot be the only right tile`,
    );
  }
});

/* ================================================================ phonics */

/* 15 --------------------------------------------------------------------- */
test("every phonics word starts with the letter it claims to", () => {
  assert.ok(PHONICS_WORDS.length >= 50, `only ${PHONICS_WORDS.length} words`);

  const seen = new Set<string>();
  for (const entry of PHONICS_WORDS) {
    assert.ok(/^[A-Z]{3,5}$/.test(entry.word), `${entry.word} is not an upper case word`);
    assert.equal(
      entry.word[0],
      entry.sound,
      `${entry.word} does not start with ${entry.sound}`,
    );
    assert.ok(!seen.has(entry.word), `${entry.word} is in the list twice`);
    seen.add(entry.word);

    /* A "wrong" letter that is also a fair answer is not a wrong letter. */
    for (const wrong of entry.wrong) {
      assert.notEqual(wrong, entry.sound, `${entry.word}: ${wrong} is the answer`);
      assert.ok(
        !(SAME_SOUND[entry.sound] ?? []).includes(wrong),
        `${entry.word}: ${wrong} says the same sound as ${entry.sound}`,
      );
    }
    assert.ok(entry.wrong.length >= 2, `${entry.word} has too few distractors`);
  }
});

/* 16 --------------------------------------------------------------------- */
test("no phonics board offers two letters that say the same sound", () => {
  const sameSound = (a: string, b: string) =>
    (SAME_SOUND[a] ?? []).includes(b) || (SAME_SOUND[b] ?? []).includes(a);

  for (const challenge of drawn("beginning-sounds")) {
    const answer = answerTextOf(challenge);
    const tiles = tilesOf(challenge);

    if ([...answer].length === 1) {
      /* Direction one: the word is shown, the letters are the answers. */
      for (const tile of tiles) {
        if (tile === answer) continue;
        assert.ok(
          !sameSound(tile, answer),
          `${challenge.id}: ${tile} and ${answer} say the same sound`,
        );
      }
    } else {
      /* Direction two: the letter is asked for, the words are the answers.
         Every other word on the board has to start with something else. */
      const asked = challenge.prompt.speech.replace("Which word starts with ", "")[0];
      assert.equal(answer[0], asked, `${challenge.id}: the answer is the wrong word`);
      for (const tile of tiles) {
        if (tile === answer) continue;
        assert.notEqual(tile[0], asked, `${challenge.id}: ${tile} also starts with ${asked}`);
        assert.ok(
          !sameSound(tile[0], asked),
          `${challenge.id}: ${tile} starts with the sound ${asked} makes`,
        );
      }
    }
  }
});

/* 17 --------------------------------------------------------------------- */
test("level 1 phonics only ever shows the word and asks for its letter", () => {
  const level1 = drawChallenges(
    activityFor("phonics"),
    { level: 1, count: 40, rng: createRng(6) },
  );
  for (const challenge of level1) {
    assert.ok(
      challenge.prompt.speech.startsWith("What sound does "),
      `${challenge.id}: level 1 asked the harder direction`,
    );
    assert.equal(answerTextOf(challenge).length, 1);
    /* Three letter words only, at the very start. */
    const shown = challenge.prompt.display?.[0];
    assert.ok(shown?.kind === "item" && shown.item.kind === "text");
    if (shown?.kind === "item" && shown.item.kind === "text") {
      assert.equal(shown.item.text.length, 3, "level 1 is three letter words");
    }
  }

  /* And the harder direction does turn up once the levels do. */
  const later = drawChallenges(
    activityFor("phonics"),
    { level: 3, count: 60, rng: createRng(6) },
  );
  assert.ok(
    later.some((c) => c.prompt.speech.startsWith("Which word starts with ")),
    "the word-picking direction never appeared",
  );
});

/* ======================================================== alphabet order */

function orderBoards(): Challenge[] {
  const boards = drawn("alphabet-order").filter((c) => c.payload.kind === "order");
  assert.ok(boards.length > 0, "alphabet-order dealt no order boards");
  return boards;
}

/** The letters the child is asked to end up with, in answer order. */
function runOf(challenge: Challenge): string[] {
  assert.equal(challenge.payload.kind, "order");
  if (challenge.payload.kind !== "order") return [];
  const byId = new Map(
    challenge.payload.items.map((item) => [
      item.id,
      item.item.kind === "text" ? item.item.text : "",
    ]),
  );
  return challenge.payload.answerOrder.map((id) => {
    const letter = byId.get(id);
    assert.ok(letter, `${challenge.id}: the answer names a tile that is not in the tray`);
    return letter;
  });
}

/* 21 --------------------------------------------------------------------- */
test("every alphabet board asks for a real run of the alphabet, and only one", () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;

    const run = runOf(challenge);

    /* Three, four or five tiles by level, and the whole tray is the answer:
       no letter is dealt that has nowhere to go. */
    const expected = challenge.level === 1 ? 3 : challenge.level === 2 ? 4 : 5;
    assert.equal(run.length, expected, `${challenge.id} is level ${challenge.level}`);
    assert.equal(payload.items.length, run.length);
    assert.equal(payload.answerOrder.length, payload.items.length);
    assert.equal(
      new Set(payload.items.map((i) => i.id)).size,
      payload.items.length,
      `${challenge.id}: the same tile twice`,
    );

    /* Consecutive, so "what comes next" is a question the alphabet answers
       and not a comparison the child has to reason their way to. */
    assert.ok(
      alphabet.includes(run.join("")),
      `${challenge.id}: ${run.join(" ")} is not a run of the alphabet`,
    );

    /* Big letters only: one shape per tile, and no board that is secretly
       asking about upper and lower case at the same time. */
    for (const item of payload.items) {
      assert.equal(item.item.kind, "text");
      const text = item.item.kind === "text" ? item.item.text : "";
      assert.equal([...text].length, 1, `${challenge.id}: "${text}" is not one letter`);
      assert.equal(text, text.toUpperCase(), `${challenge.id}: "${text}" is not a big letter`);
    }
  }
});

/* 22 --------------------------------------------------------------------- */
test("the alphabet tray is always scrambled, and more so the harder it gets", () => {
  const floors: Record<number, number> = { 1: 2, 2: 3, 3: 5 };

  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;

    const moved = payload.items.filter(
      (item, index) => item.id !== payload.answerOrder[index],
    ).length;

    /* Never handed over already solved — that is a board finished by going
       left to right without reading it. */
    assert.ok(moved > 0, `${challenge.id} arrives already in order`);
    assert.ok(
      moved >= floors[challenge.level],
      `${challenge.id} is level ${challenge.level} but only ${moved} tiles are out of place`,
    );
  }

  /* And level three really is a full derangement: nothing may be left where
     it was found, so no tile can go unthought-about. */
  for (const challenge of orderBoards()) {
    if (challenge.level !== 3 || challenge.payload.kind !== "order") continue;
    const { items, answerOrder } = challenge.payload;
    for (const [index, item] of items.entries()) {
      assert.notEqual(
        item.id,
        answerOrder[index],
        `${challenge.id}: a tile is already home`,
      );
    }
  }
});

/* 23 --------------------------------------------------------------------- */
test("a level only reaches as far into the alphabet as it should", () => {
  const furthest: Record<number, string> = { 1: "J", 2: "S", 3: "Z" };

  for (const challenge of orderBoards()) {
    for (const letter of runOf(challenge)) {
      assert.ok(
        letter <= furthest[challenge.level],
        `${challenge.id} is level ${challenge.level} and reaches ${letter}`,
      );
    }
  }

  /* Each level really uses its extra room, or the ladder is decoration. */
  const reach = new Map<number, string>();
  for (const challenge of orderBoards()) {
    const highest = runOf(challenge).reduce((a, b) => (a > b ? a : b));
    const seen = reach.get(challenge.level) ?? "A";
    reach.set(challenge.level, highest > seen ? highest : seen);
  }
  assert.deepEqual([...reach].sort(), [[1, "J"], [2, "S"], [3, "Z"]]);
});

/* 24 --------------------------------------------------------------------- */
test("the order engine accepts one arrangement, and forgives every attempt", () => {
  for (const challenge of orderBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "order") continue;
    const { answerOrder } = payload;

    assert.ok(
      checkAnswer(challenge, { kind: "order", itemIds: answerOrder }),
      `${challenge.id}: the engine rejects its own answer`,
    );

    /* Any other arrangement of the same tiles is not finished. Not punished
       — the tile goes back to the tray and the board is still there — but
       not accepted either, so there is exactly one way to be done. */
    const swapped = [...answerOrder];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    assert.equal(
      checkAnswer(challenge, { kind: "order", itemIds: swapped }),
      false,
      `${challenge.id}: two different arrangements are both accepted`,
    );

    /* `checkStep` is the prefix rule the stage leans on: every opening run of
       the answer is right so far, and any wrong tile at any point is not. */
    for (let taken = 0; taken <= answerOrder.length; taken += 1) {
      assert.ok(
        checkStep(challenge, { kind: "order", itemIds: answerOrder.slice(0, taken) }),
        `${challenge.id}: the first ${taken} tiles were refused`,
      );
    }
    for (let taken = 0; taken < answerOrder.length - 1; taken += 1) {
      const wrong = [...answerOrder.slice(0, taken), answerOrder[answerOrder.length - 1]];
      if (wrong[taken] === answerOrder[taken]) continue;
      assert.equal(
        checkStep(challenge, { kind: "order", itemIds: wrong }),
        false,
        `${challenge.id}: a tile out of turn was accepted at ${taken}`,
      );
    }
  }
});

/* 25 --------------------------------------------------------------------- */
test("alphabet order counts runs, not the trays it hands them over in", () => {
  /* Eight runs of three inside A-J, sixteen of four inside A-S, twenty-two of
     five inside the whole alphabet. That is the number of things there are to
     learn here, and it is a much smaller number than the boards. */
  assert.equal(ALPHABET_RUNS.length, 46);
  assert.equal(new Set(ALPHABET_RUNS).size, 46, "a run is listed twice");

  const boards = orderBoards();
  const concepts = new Set(boards.map(conceptKey));
  const arrangements = new Set(
    boards.map((c) =>
      c.payload.kind === "order" ? c.payload.items.map((i) => i.id).join(",") : "",
    ),
  );

  assert.ok(
    arrangements.size > concepts.size * 2,
    `${arrangements.size} trays from ${concepts.size} concepts: the same run is barely reshuffled`,
  );
  assert.ok(
    concepts.size <= ALPHABET_RUNS.length,
    `${concepts.size} concepts from ${ALPHABET_RUNS.length} runs: a shuffle is being counted as something to learn`,
  );

  /* Every concept the sample found really is one of the authored runs. */
  const authored = new Set(ALPHABET_RUNS.map((run) => `english.alphabet-order|alphabet:${run}`));
  for (const key of concepts) {
    assert.ok(authored.has(key), `${key} is not a run this activity can deal`);
  }
});

/* =============================================================== spelling */

/**
 * Short words a child or a parent would recognise on sight.
 *
 * The spelling activity's whole risk is a gap that can be filled two ways, so
 * this list is deliberately stocked with the near misses the word list had to
 * be written around — COT and CUT for CAT, BLACK for BLOCK, BROAD for BREAD,
 * MOOSE for MOUSE, STEP for STOP. If somebody adds a word later without
 * checking, the test below finds it.
 */
const REAL_WORDS = new Set([
  "BAD", "BAG", "BAT", "BED", "BEG", "BET", "BIG", "BIN", "BIT", "BOG", "BUD",
  "BUG", "BUN", "BUS", "BUT", "CAB", "CAN", "CAP", "CAR", "CAT", "COD", "COG",
  "COP", "COT", "COW", "CUB", "CUP", "CUT", "DAD", "DEN", "DID", "DIG", "DIM",
  "DIP", "DOG", "DOT", "DUG", "EAR", "EGG", "END", "FAN", "FAR", "FAT", "FAX",
  "FED", "FEW", "FIG", "FIN", "FIT", "FIX", "FOG", "FOX", "FUN", "GAP", "GAS",
  "GET", "GOT", "GUM", "GUN", "HAM", "HAS", "HAT", "HEN", "HID", "HIP", "HIT",
  "HOP", "HOT", "HUG", "HUM", "HUN", "HUT", "INK", "JAM", "JAR", "JET", "JOB",
  "JOG", "JUG", "KID", "KIT", "LAP", "LEG", "LET", "LID", "LIP", "LIT", "LOG",
  "LOT", "MAD", "MAN", "MAP", "MAT", "MEN", "MET", "MIX", "MOB", "MOP", "MUD",
  "MUG", "NAP", "NET", "NOD", "NOT", "NUT", "OAK", "ODD", "OWL", "PAD", "PAN",
  "PAT", "PEG", "PEN", "PET", "PIG", "PIN", "PIT", "POD", "POP", "POT", "PUG",
  "PUP", "RAG", "RAM", "RAN", "RAT", "RED", "RIB", "RID", "RIM", "RIP", "ROB",
  "ROD", "ROT", "RUB", "RUG", "RUN", "SAD", "SAT", "SAW", "SET", "SIN", "SIP",
  "SIR", "SIT", "SIX", "SON", "SUN", "TAG", "TAN", "TAP", "TAX", "TEN", "TIN",
  "TIP", "TOE", "TOP", "TOY", "TUB", "TUG", "VAN", "VET", "WAG", "WAR", "WAS",
  "WAX", "WEB", "WET", "WIG", "WIN", "YES", "YET", "ZIP", "ZAP", "ANT", "ARM",
  "BALL", "BELL", "BILL", "BULL", "BOOK", "BOOT", "BEAT", "BOAT", "BEST",
  "BLACK", "BLOCK", "BREAD", "BROAD", "BRAID", "CAKE", "COKE", "CARD", "CART",
  "CLOUD", "COAT", "CORD", "DESK", "DISK", "DOLL", "DRUM", "DUCK", "DECK",
  "DOCK", "FAST", "FIST", "FISH", "FLAG", "FLAT", "FLOG", "FOOD", "FOOT",
  "GATE", "GOAT", "GOLD", "GRAPE", "GREEN", "GROAN", "HAND", "HARD", "HEAD",
  "HEAT", "HOUSE", "HORSE", "HOOK", "LEAF", "LOAF", "LOCK", "LICK", "LUCK",
  "MASK", "MILK", "MOON", "MOOSE", "MOUSE", "MUST", "NEST", "NOSE", "NOISE",
  "PACK", "PICK", "PLANE", "PLATE", "RAIN", "RUIN", "ROOM", "ROOT", "SEED",
  "SAND", "SHEEP", "SHARP", "SHOP", "SMILE", "SMOKE", "SNAKE", "SNAIL",
  "SOCK", "SACK", "SICK", "SPOON", "STAR", "STEP", "STIR", "STONE", "STORE",
  "STOP", "SWAN", "TENT", "TINT", "TRAIN", "TRAIL", "TREE", "TRUE", "WAVE",
  "WOVE", "WAVY", "WEST", "WIND", "APPLE", "AMPLE",
]);

/* 18 --------------------------------------------------------------------- */
test("no wrong letter ever finishes a spelling word into another real word", () => {
  assert.ok(SPELLING_WORDS.length >= 40, `only ${SPELLING_WORDS.length} words`);

  const seen = new Set<string>();
  for (const entry of SPELLING_WORDS) {
    assert.ok(/^[A-Z]{3,5}$/.test(entry.word), `${entry.word} is not an upper case word`);
    assert.ok(!seen.has(entry.word), `${entry.word} is in the list twice`);
    seen.add(entry.word);

    assert.ok(
      entry.at >= 0 && entry.at < entry.word.length,
      `${entry.word}: the gap at ${entry.at} is not in the word`,
    );
    assert.ok(entry.wrong.length >= 2, `${entry.word} has too few distractors`);

    const answer = entry.word[entry.at];
    for (const wrong of entry.wrong) {
      assert.equal([...wrong].length, 1, `${entry.word}: "${wrong}" is not a letter`);
      assert.notEqual(wrong, answer, `${entry.word}: ${wrong} is the answer`);

      /* The assertion the whole activity rests on. */
      const filled =
        entry.word.slice(0, entry.at) + wrong + entry.word.slice(entry.at + 1);
      assert.ok(
        !REAL_WORDS.has(filled),
        `${entry.word} with ${wrong} spells ${filled}, which is a word`,
      );
    }

    /* Vowel gaps take vowel distractors: swapping a consonant into a vowel
       slot offers a choice nobody would make, which teaches nothing. */
    if ("AEIOU".includes(answer)) {
      for (const wrong of entry.wrong) {
        assert.ok(
          "AEIOU".includes(wrong),
          `${entry.word}: ${wrong} is not a vowel, but the gap is one`,
        );
      }
    }
  }
});

/* 19 --------------------------------------------------------------------- */
test("a spelling question shows the word with exactly one gap in it", () => {
  for (const challenge of drawn("spelling")) {
    const speech = challenge.prompt.speech;
    const word = speech.slice("Let's spell ".length, speech.indexOf(". Which"));
    assert.ok(word.length >= 3, `${challenge.id}: "${speech}" names no word`);

    const display = challenge.prompt.display ?? [];
    assert.equal(display.length, word.length, `${challenge.id}: the gap is the wrong size`);

    const blanks = display.filter((p) => p.kind === "blank");
    assert.equal(blanks.length, 1, `${challenge.id}: ${blanks.length} gaps`);

    /* Every other slot shows the letter that really is there... */
    const shown = display.map((p) =>
      p.kind === "item" && p.item.kind === "text" ? p.item.text : "_",
    );
    const answer = answerTextOf(challenge);
    assert.equal(
      shown.join("").replace("_", answer),
      word,
      `${challenge.id}: the stage does not spell ${word}`,
    );
    /* ...and the answer is not one of them, which would give it away. */
    assert.equal(challenge.explanation, `${word} is spelled ${[...word].join(", ")}.`);
  }
});

/* 20 --------------------------------------------------------------------- */
test("the answer to a spelling question is always the letter in the gap", () => {
  const byWord = new Map(SPELLING_WORDS.map((entry) => [entry.word, entry]));

  for (const challenge of drawn("spelling")) {
    const speech = challenge.prompt.speech;
    const word = speech.slice("Let's spell ".length, speech.indexOf(". Which"));
    const entry = byWord.get(word);
    assert.ok(entry, `${challenge.id}: ${word} is not in the authored list`);

    assert.equal(
      answerTextOf(challenge),
      entry.word[entry.at],
      `${challenge.id}: the wrong letter is marked correct`,
    );
    for (const tile of tilesOf(challenge)) {
      assert.ok(
        tile === entry.word[entry.at] || entry.wrong.includes(tile),
        `${challenge.id}: ${tile} was never authored as a distractor for ${word}`,
      );
    }
  }
});

/* ====================================================== content: rhyming */

/**
 * Every rhyme in the pack, written out again by hand.
 *
 * The point of a second copy is that it is a second *opinion*. `rhyming.ts`
 * files a word by the ending you can hear, and the only way to check it did
 * not quietly file one by the ending you can see is to say them all out loud
 * again here and compare. EIGHT is with PLATE, KEY is with BEE, ONE is with
 * SUN, TWO is with SHOE — none of which a spelling rule would ever produce.
 *
 * The two tables have to match exactly in both directions, so a rhyme added
 * to the pack without a person checking it fails this file rather than
 * reaching a child.
 */
const RHYMES: Readonly<Record<string, readonly string[]>> = {
  at: ["CAT", "HAT"],
  og: ["DOG", "FROG"],
  un: ["SUN", "FUN", "ONE"],
  all: ["BALL", "TALL"],
  ish: ["FISH", "DISH"],
  ar: ["CAR", "STAR"],
  ox: ["BOX", "FOX"],
  ig: ["DIG", "BIG"],
  ug: ["BUG", "RUG"],
  ake: ["CAKE", "SNAKE"],
  ouse: ["MOUSE", "HOUSE"],
  ed: ["BED", "RED", "HEAD"],
  oat: ["BOAT", "COAT"],
  oon: ["MOON", "SPOON"],
  ee: ["BEE", "TREE", "KEY"],
  ing: ["KING", "RING"],
  ock: ["SOCK", "CLOCK"],
  ain: ["TRAIN", "RAIN"],
  ice: ["MICE", "RICE"],
  eep: ["SHEEP", "SLEEP"],
  ap: ["CAP", "MAP"],
  in: ["PIN", "BIN"],
  ag: ["BAG", "FLAG"],
  oy: ["BOY", "TOY"],
  an: ["VAN", "MAN"],
  op: ["MOP", "TOP"],
  ose: ["NOSE", "ROSE"],
  uck: ["DUCK", "TRUCK"],
  orn: ["CORN", "HORN"],
  air: ["BEAR", "CHAIR"],
  eye: ["EYE", "PIE"],
  ale: ["WHALE", "SNAIL"],
  ate: ["PLATE", "EIGHT"],
  oor: ["DOOR", "FOUR"],
  eel: ["WHEEL", "SEAL"],
  oo: ["SHOE", "TWO"],
  eat: ["FEET", "MEAT"],
  ite: ["KITE", "LIGHT"],
};

/** Which family a word is in, and proof that it is in only one. */
const FAMILY_OF = new Map<string, string>();
for (const [family, words] of Object.entries(RHYMES)) {
  for (const word of words) {
    assert.ok(
      !FAMILY_OF.has(word),
      `${word} is in two rhyme families: ${FAMILY_OF.get(word)} and ${family}`,
    );
    FAMILY_OF.set(word, family);
  }
}

/**
 * The rhymes whose endings are spelled two different ways.
 *
 * These are what level three is for, and what makes the activity about sound
 * rather than about the last two letters. A child who joins BEAR to CHAIR has
 * heard something; a child who joins CAT to HAT may only have looked.
 */
const SOUND_ONLY = new Set([
  "BEAR>CHAIR", "EYE>PIE", "WHALE>SNAIL", "PLATE>EIGHT", "DOOR>FOUR",
  "WHEEL>SEAL", "SHOE>TWO", "FEET>MEAT", "KITE>LIGHT", "TREE>KEY",
  "ONE>SUN", "HEAD>BED",
]);

/** The rhymes the easiest level is allowed to deal. */
const LEVEL_ONE = new Set([
  "CAT>HAT", "DOG>FROG", "SUN>FUN", "BALL>TALL", "FISH>DISH", "CAR>STAR",
  "BOX>FOX", "DIG>BIG", "BUG>RUG", "CAKE>SNAKE", "MOUSE>HOUSE", "BED>RED",
]);

function rhymeBoards(): Challenge[] {
  const joined = drawn("rhyming-partners").filter((c) => c.payload.kind === "connect");
  assert.ok(joined.length > 0, "rhyming-partners dealt no connect boards");
  return joined;
}

/** The word on a tile, and an assertion that a tile is a word at all. */
function wordOn(challenge: Challenge, id: string): string {
  const payload = challenge.payload;
  assert.equal(payload.kind, "connect");
  if (payload.kind !== "connect") return "";
  const node = [...payload.left, ...payload.right].find((n) => n.id === id);
  assert.ok(node, `${challenge.id}: no tile called ${id}`);
  assert.equal(node.item.kind, "text", `${challenge.id}: ${id} is not a word`);
  return node.item.kind === "text" ? node.item.text : "";
}

/** The joins a board asks for, as `LEFT>RIGHT`. */
function rhymesOn(challenge: Challenge): string[] {
  const payload = challenge.payload;
  if (payload.kind !== "connect") return [];
  return payload.pairs.map(
    (pair) => `${wordOn(challenge, pair.leftId)}>${wordOn(challenge, pair.rightId)}`,
  );
}

/* 26 --------------------------------------------------------------------- */
test("the pack's rhymes and the hand-written ones are the same list", () => {
  assert.equal(RHYME_PAIRS, RHYME_FAMILIES.length);
  assert.equal(RHYME_PAIRS, 41);

  const written = new Set<string>();
  for (const [left, right, family] of RHYME_FAMILIES) {
    written.add(`${left}>${right}`);

    /* Both halves are in the same family, and it is the family a person put
       them in — which is the whole assertion, because "these two words rhyme"
       is a fact about English that no code can derive. */
    assert.equal(FAMILY_OF.get(left), family, `${left} is filed under ${family}`);
    assert.equal(FAMILY_OF.get(right), family, `${right} is filed under ${family}`);
  }

  /* And nothing in the hand-written table was left unused: every word here is
     half of a rhyme the pack can actually deal. */
  for (const word of FAMILY_OF.keys()) {
    assert.ok(
      [...written].some((rhyme) => rhyme.split(">").includes(word)),
      `${word} is written down and never dealt`,
    );
  }

  assert.equal(SOUND_ONLY.size + LEVEL_ONE.size <= RHYME_PAIRS, true);
  for (const rhyme of [...SOUND_ONLY, ...LEVEL_ONE]) {
    assert.ok(written.has(rhyme), `${rhyme} is not a rhyme the pack knows`);
  }
});

/* 27 --------------------------------------------------------------------- */
test("every rhyming board joins each word to exactly one partner", () => {
  let boards = 0;

  for (const challenge of rhymeBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;
    boards += 1;

    /* A bijection, which is what `ConnectStage` draws and what `validate`
       insists on: every word in exactly one line. */
    assert.equal(payload.left.length, payload.right.length);
    assert.equal(payload.pairs.length, payload.left.length);
    assert.equal(new Set(payload.pairs.map((p) => p.leftId)).size, payload.left.length);
    assert.equal(new Set(payload.pairs.map((p) => p.rightId)).size, payload.right.length);

    /* Two, three or four lines, by level. Never one, and never a wall. */
    const expected = challenge.level === 1 ? 2 : challenge.level === 2 ? 3 : 4;
    assert.equal(
      payload.pairs.length,
      expected,
      `${challenge.id} is level ${challenge.level} with ${payload.pairs.length} lines`,
    );

    /* No word is ever on the board twice, in either column or across both. */
    const words = [...payload.left, ...payload.right].map((node) =>
      wordOn(challenge, node.id),
    );
    assert.equal(new Set(words).size, words.length, `${challenge.id}: a word twice`);
    for (const word of words) {
      assert.equal(word, word.toUpperCase());
      assert.ok(FAMILY_OF.has(word), `${challenge.id}: ${word} is not in the table`);
    }
  }

  assert.ok(boards > 100, `only ${boards} rhyming boards were checked`);
});

/* 28 --------------------------------------------------------------------- */
test("every line on a rhyming board is a real rhyme, and only one board can be", () => {
  for (const challenge of rhymeBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect") continue;

    const families = new Set<string>();
    for (const pair of payload.pairs) {
      const left = wordOn(challenge, pair.leftId);
      const right = wordOn(challenge, pair.rightId);
      const family = FAMILY_OF.get(left);

      assert.equal(
        FAMILY_OF.get(right),
        family,
        `${challenge.id} joins ${left} to ${right}, which do not rhyme`,
      );

      /* One family per board. Two pairs from the same one would give some
         word on the stage two partners, and the board two solutions. */
      assert.ok(
        !families.has(family!),
        `${challenge.id} has two ${family} rhymes on it`,
      );
      families.add(family!);
    }

    /* Which is what makes the board unambiguous: every word in the left
       column rhymes with exactly one word in the right one. */
    for (const node of payload.left) {
      const left = wordOn(challenge, node.id);
      const partners: string[] = payload.right
        .map((other) => wordOn(challenge, other.id))
        .filter((word) => FAMILY_OF.get(word) === FAMILY_OF.get(left));
      assert.equal(
        partners.length,
        1,
        `${challenge.id}: ${left} rhymes with ${partners.length} words on the board`,
      );
    }
  }
});

/* 29 --------------------------------------------------------------------- */
test("the engine agrees with a rhyming board, and only with it", () => {
  for (const challenge of rhymeBoards()) {
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

    /* Every line a child could draw is representable, and every line the
       board did not author is refused — by the content layer, one at a time,
       with nothing taken away for having tried it. */
    let accepted = 0;
    for (const left of payload.left) {
      for (const right of payload.right) {
        const link: ConnectPair = { leftId: left.id, rightId: right.id };
        const authored = payload.pairs.some(
          (p) => p.leftId === link.leftId && p.rightId === link.rightId,
        );
        assert.equal(
          checkStep(challenge, { kind: "connect", links: [link] }),
          authored,
          `${challenge.id}: judged ${left.id}>${right.id} wrongly`,
        );
        if (authored) accepted += 1;
      }
    }
    assert.equal(accepted, payload.pairs.length);

    /* One line in is right so far and not finished, and "not finished" is
       never treated as failure anywhere. */
    const half = payload.pairs.slice(0, 1);
    assert.ok(checkStep(challenge, { kind: "connect", links: half }));
    assert.equal(checkAnswer(challenge, { kind: "connect", links: half }), false);
  }
});

/* 30 --------------------------------------------------------------------- */
test("no word ever faces its own rhyme on a board of three or more", () => {
  let deranged = 0;

  for (const challenge of rhymeBoards()) {
    const payload = challenge.payload;
    if (payload.kind !== "connect" || payload.pairs.length < 3) continue;
    deranged += 1;

    for (const [index, node] of payload.left.entries()) {
      const pair = payload.pairs.find((p) => p.leftId === node.id)!;
      assert.notEqual(
        payload.right[index].id,
        pair.rightId,
        `${challenge.id}: row ${index} joins straight across`,
      );
    }
  }

  /* Two-line boards are left to an even shuffle on purpose: the only
     derangement of two is the swap, so deranging them would make "the
     crossed one" always right — a pattern to learn instead of a rhyme to
     hear. So they are not counted here, and they are the only ones. */
  assert.ok(deranged > 50, `only ${deranged} boards of three or more were checked`);
});

/* 31 --------------------------------------------------------------------- */
test("a rhyming level gets harder by what is on the board, never by a clock", () => {
  const perLevel = new Map<number, Set<string>>();

  for (const challenge of rhymeBoards()) {
    const rhymes = rhymesOn(challenge);
    const level = challenge.level;
    if (!perLevel.has(level)) perLevel.set(level, new Set());
    for (const rhyme of rhymes) perLevel.get(level)!.add(rhyme);

    if (level === 1) {
      for (const rhyme of rhymes) {
        assert.ok(LEVEL_ONE.has(rhyme), `${challenge.id} deals ${rhyme} at level 1`);
      }
    }

    /* The top level always holds a rhyme that cannot be seen, only heard. */
    if (level === 3) {
      assert.ok(
        rhymes.some((rhyme) => SOUND_ONLY.has(rhyme)),
        `${challenge.id} is level 3 and every rhyme on it is visible: ${rhymes.join(", ")}`,
      );
    }

    /* And nothing anywhere in it is a clock. */
    const words = [challenge.prompt.speech, challenge.hint, challenge.explanation]
      .filter(Boolean)
      .join(" ");
    assert.ok(!/\b(quick|fast|hurry|time|second|wrong)\b/i.test(words), words);
  }

  const one = perLevel.get(1)!;
  const two = perLevel.get(2)!;
  const three = perLevel.get(3)!;

  assert.equal(one.size, LEVEL_ONE.size);
  assert.ok(two.size > one.size, `level 2 knows ${two.size} rhymes, level 1 knows ${one.size}`);
  assert.ok(three.size > two.size);
  for (const rhyme of one) assert.ok(two.has(rhyme), `level 2 dropped ${rhyme}`);
  for (const rhyme of SOUND_ONLY) assert.ok(!two.has(rhyme), `${rhyme} is too early`);
});

/* 32 --------------------------------------------------------------------- */
test("rhyming counts rhymes, and never counts a shuffle", () => {
  const boards = rhymeBoards();
  const concepts = new Set(boards.map(conceptKey));

  for (const concept of concepts) {
    assert.match(concept, /\|rhyme:[a-z↔+]+$/);
  }

  /* A concept names the *set* of rhymes on the board, sorted, so the same
     pairs dealt down the columns another way is one thing to have learned.
     Forty-one rhymes is the number that means something to a child; the
     boards are arrangements of them. */
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
    "every set of rhymes was only ever dealt one way round",
  );
  assert.equal(new Set(boards.map(challengeKey)).size, arrangements.size);
  assert.ok(concepts.size > RHYME_PAIRS, `only ${concepts.size} distinct boards of rhymes`);
});

/* ==================================================== content: the new five */

/*
 * The five activities this batch added, each checked against the table it was
 * written from rather than against itself. The shape is the same every time:
 * re-derive what the board should hold, then look at what came out.
 */

/* A ---------------------------------------------------------------------- */
test("ending sounds: forty-two words, and never a second letter that would do", () => {
  /* The table first. */
  const words = ENDING_WORDS.map((entry) => entry.word);
  assert.equal(new Set(words).size, words.length, "a word is listed twice");
  assert.equal(ENDING_WORDS.length, 42, "the honest count has moved");

  for (const entry of ENDING_WORDS) {
    assert.match(entry.sound, /^[A-Z]$/, `${entry.word} ends with "${entry.sound}"`);
    assert.ok(
      entry.word.includes(entry.sound),
      `${entry.word} does not contain the letter ${entry.sound}`,
    );
    for (const wrong of entry.wrong) {
      assert.notEqual(wrong, entry.sound, `${entry.word} offers its own answer`);
      assert.ok(
        !(SAME_SOUND[entry.sound] ?? []).includes(wrong) &&
          !(SAME_SOUND[wrong] ?? []).includes(entry.sound),
        `${entry.word}: ${wrong} says the same sound as ${entry.sound}`,
      );
    }
  }

  /* And the boards. Both directions, told apart by what the question says. */
  const byWord = new Map(ENDING_WORDS.map((entry) => [entry.word, entry] as const));
  let askedForTheWord = 0;

  for (const challenge of drawn("ending-sounds")) {
    const board = boardOf(challenge);
    const tiles = tilesOf(challenge);
    const answer = answerTextOf(challenge);
    assert.equal(board.options.length, challenge.level >= 3 ? 4 : 3, `${challenge.id}: tiles`);

    const forSound = challenge.prompt.speech.match(/^What sound does ([A-Z]+) end with\?$/);
    const forWord = challenge.prompt.speech.match(/^Which word ends with ([A-Z])\?$/);

    if (forSound) {
      const entry = byWord.get(forSound[1]);
      assert.ok(entry, `${challenge.id}: ${forSound[1]} is not in the table`);
      assert.equal(answer, entry.sound, `${challenge.id}: the answer is not the sound`);
      for (const tile of tiles) {
        if (tile === answer) continue;
        assert.ok(
          !(SAME_SOUND[entry.sound] ?? []).includes(tile) &&
            !(SAME_SOUND[tile] ?? []).includes(entry.sound),
          `${challenge.id}: ${tile} would also be right`,
        );
      }
    } else if (forWord) {
      askedForTheWord += 1;
      const sound = forWord[1];
      const entry = byWord.get(answer);
      assert.ok(entry, `${challenge.id}: ${answer} is not in the table`);
      assert.equal(entry.sound, sound, `${challenge.id}: ${answer} does not end with ${sound}`);
      for (const tile of tiles) {
        if (tile === answer) continue;
        const other = byWord.get(tile);
        assert.ok(other, `${challenge.id}: ${tile} is not in the table`);
        assert.ok(
          !couldEnd(other, sound),
          `${challenge.id}: ${tile} also ends with ${sound}`,
        );
      }
      /* Reading three whole words is the harder shape, and level one never
         asks it. */
      assert.ok(challenge.level > 1, `${challenge.id}: level 1 asked for the word`);
    } else {
      assert.fail(`${challenge.id}: "${challenge.prompt.speech}" is neither question`);
    }
  }

  assert.ok(askedForTheWord > 0, "the second direction is never dealt");
});

/* B ---------------------------------------------------------------------- */
test("pictures and their first letter: a full board, and no letter says another's sound", () => {
  const bySound = new Map(PICTURE_WORDS.map((entry) => [entry.word.toLowerCase(), entry] as const));

  for (const challenge of drawn("sound-partners")) {
    const payload = challenge.payload;
    assert.equal(payload.kind, "connect", `${challenge.id} is not a connect`);
    if (payload.kind !== "connect") continue;

    const wanted = challenge.level <= 1 ? 3 : challenge.level === 2 ? 4 : 5;
    assert.equal(payload.pairs.length, wanted, `${challenge.id} came up short`);
    assert.equal(payload.left.length, wanted, `${challenge.id}: left column`);
    assert.equal(payload.right.length, wanted, `${challenge.id}: right column`);

    /* Every line is a real fact out of the phonics table: this picture, this
       first letter. And the picture really is a picture — the whole point of
       the board is that nothing on the left can be read instead of heard. */
    const sounds: string[] = [];
    for (const pair of payload.pairs) {
      const node: ConnectNode | undefined = payload.left.find(
        (tile) => tile.id === pair.leftId,
      );
      assert.ok(node, `${challenge.id}: ${pair.leftId} is not on the board`);
      assert.equal(node.item.kind, "picture", `${challenge.id}: a left tile is not a picture`);
      const name = pair.leftId.replace("picture-", "");
      const entry = bySound.get(name);
      assert.ok(entry, `${challenge.id}: ${name} is not a picture word`);
      assert.equal(pair.rightId, `letter-${entry.sound}`, `${challenge.id}: wrong letter`);
      sounds.push(entry.sound);
    }

    /* No two letters on one board could answer each other. C and K both say
       /k/, so a board holding a cat and a key has two right answers. */
    for (const [index, sound] of sounds.entries()) {
      for (const other of sounds.slice(index + 1)) {
        assert.notEqual(sound, other, `${challenge.id}: ${sound} twice`);
        assert.ok(
          !(SAME_SOUND[sound] ?? []).includes(other) &&
            !(SAME_SOUND[other] ?? []).includes(sound),
          `${challenge.id}: ${sound} and ${other} say the same sound`,
        );
      }
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

/* C ---------------------------------------------------------------------- */
test("one and more than one: the answer is the plural, and the mistakes are the mistakes", () => {
  const singles = PLURAL_WORDS.map((entry) => entry.one);
  assert.equal(new Set(singles).size, singles.length, "a noun is listed twice");
  assert.equal(PLURAL_WORDS.length, 28, "the honest count has moved");
  for (const entry of PLURAL_WORDS) {
    assert.notEqual(entry.many, entry.one, `${entry.one} is its own plural`);
    if (entry.level === 1) assert.equal(entry.many, `${entry.one}S`);
    if (entry.level === 2) assert.equal(entry.many, `${entry.one}ES`);
    if (entry.level === 3) {
      assert.notEqual(entry.many, `${entry.one}S`, `${entry.one} follows the rule after all`);
      assert.notEqual(entry.many, `${entry.one}ES`, `${entry.one} follows the rule after all`);
    }
  }

  const byOne = new Map(PLURAL_WORDS.map((entry) => [entry.one, entry] as const));
  for (const challenge of drawn("plurals")) {
    const said = challenge.prompt.speech.match(/^Here is one ([A-Z]+)\. /);
    assert.ok(said, `${challenge.id}: "${challenge.prompt.speech}"`);
    const entry = byOne.get(said[1]);
    assert.ok(entry, `${challenge.id}: ${said[1]} is not in the table`);

    /* Exactly the level authored for it, so a level really is a rule and not
       a spread of them. */
    assert.equal(entry.level, challenge.level, `${challenge.id} dealt the wrong rule`);
    assert.equal(answerTextOf(challenge), entry.many, `${challenge.id}: wrong answer`);

    const tiles = tilesOf(challenge);
    assert.equal(tiles.length, 3, `${challenge.id}: three tiles throughout`);
    assert.ok(tiles.includes(entry.one), `${challenge.id}: the singular is not offered`);
    for (const tile of tiles) {
      if (tile === entry.many) continue;
      assert.ok(
        tile === entry.one || tile === `${entry.one}S` || tile === `${entry.one}ES`,
        `${challenge.id}: ${tile} is not a mistake about ${entry.one}`,
      );
    }
  }
});

/* D ---------------------------------------------------------------------- */
test("opposites: the answer is the pair's other half, and nothing else could be", () => {
  assert.equal(OPPOSITE_PAIRS, OPPOSITES.length);
  const halves = OPPOSITES.flatMap((entry) => [entry.a, entry.b]);
  assert.equal(new Set(halves).size, halves.length, "a word is in two pairs");

  const partner = new Map<string, (typeof OPPOSITES)[number]>();
  for (const entry of OPPOSITES) {
    partner.set(entry.a, entry);
    partner.set(entry.b, entry);
  }

  const askedBothWays = new Map<string, Set<string>>();

  for (const challenge of drawn("opposites")) {
    const said = challenge.prompt.speech.match(/^What is the opposite of ([A-Z]+)\?$/);
    assert.ok(said, `${challenge.id}: "${challenge.prompt.speech}"`);
    const asked = said[1];
    const entry = partner.get(asked);
    assert.ok(entry, `${challenge.id}: ${asked} is not in the table`);
    assert.ok(entry.level <= challenge.level, `${challenge.id} deals a harder pair`);

    const answer = answerTextOf(challenge);
    assert.equal(
      answer,
      asked === entry.a ? entry.b : entry.a,
      `${challenge.id}: ${answer} is not the opposite of ${asked}`,
    );

    /* No wrong tile is from the answer's own dimension. TALL wanting SHORT
       must never be offered THIN, which is arguable and would be unfair. */
    for (const tile of tilesOf(challenge)) {
      if (tile === answer) continue;
      const other = partner.get(tile);
      assert.ok(other, `${challenge.id}: ${tile} is not in the table`);
      assert.notEqual(
        other.family,
        entry.family,
        `${challenge.id}: ${tile} is about ${entry.family} too`,
      );
    }

    const seen = askedBothWays.get(entry.a) ?? new Set<string>();
    seen.add(asked);
    askedBothWays.set(entry.a, seen);
  }

  /* At least one pair really is dealt from both ends. */
  assert.ok(
    [...askedBothWays.values()].some((seen) => seen.size === 2),
    "every pair was only ever asked one way round",
  );
});

/* E ---------------------------------------------------------------------- */
test("building words: every tile is a different letter, and the tray is scrambled", () => {
  for (const word of BUILDABLE_WORDS) {
    assert.equal(new Set(word).size, word.length, `${word} has a repeated letter`);
  }

  for (const challenge of drawn("word-build")) {
    const payload = challenge.payload;
    assert.equal(payload.kind, "order", `${challenge.id} is not an order`);
    if (payload.kind !== "order") continue;

    const said = challenge.prompt.speech.match(/^Can you build the word ([A-Z]+)\?$/);
    assert.ok(said, `${challenge.id}: "${challenge.prompt.speech}"`);
    const word = said[1];
    assert.ok(BUILDABLE_WORDS.includes(word), `${challenge.id}: ${word} is not in the pool`);
    assert.equal(word.length, challenge.level <= 1 ? 3 : challenge.level === 2 ? 4 : 5);

    /* The answer spells the word that was said, and the tray holds exactly
       those tiles. */
    assert.deepEqual(
      payload.answerOrder,
      [...word].map((letter) => `letter-${letter}`),
      `${challenge.id}: the answer does not spell ${word}`,
    );
    const laid = payload.items.map((item) => item.id);
    assert.equal(new Set(laid).size, laid.length, `${challenge.id}: a tile twice`);
    assert.deepEqual([...laid].sort(), [...payload.answerOrder].sort());

    /* And the word is never shown — showing it would make this copying. */
    assert.equal(challenge.prompt.display, undefined, `${challenge.id} shows the word`);

    const moved = laid.filter((id, index) => id !== payload.answerOrder[index]).length;
    const owed = challenge.level <= 1 ? 2 : challenge.level === 2 ? 3 : laid.length;
    assert.ok(moved >= owed, `${challenge.id}: only ${moved} tiles had moved`);
  }
});
