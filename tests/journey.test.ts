import assert from "node:assert/strict";
import { test } from "node:test";

import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import { buildGeneralKnowledgeSession } from "@/lib/games/generalKnowledgeQuest";
import {
  EMPTY_JOURNEY,
  continueTarget,
  everythingDone,
  isCompleted,
  markCompleted,
  markCompletedAt,
  markOpened,
  nextActivityIn,
  parseJourney,
  statusOf,
  stickersOf,
  suggestWorldAfter,
  suggestedTier,
  tierStateOf,
  tierUnlocked,
  worldProgress,
} from "@/lib/journey/journey";
import {
  PLAYABLE_WORLDS,
  TIERS,
  WORLD_ACTIVITIES,
  activitiesOf,
  findWorldActivity,
} from "@/lib/worlds/activities";
import { WORLD_PLACES, activityRoute, worldGameFor } from "@/lib/worlds/places";

/**
 * The world journey, checked as the child would walk it.
 *
 * The doors, the plans behind them, and the small pure record of which doors
 * have been opened. Nothing here is a score; every assertion is about which
 * door is offered next and what the world says when there is none.
 */

test("every world has three doors, each drawing from content that exists", () => {
  for (const world of PLAYABLE_WORLDS) {
    const doors = activitiesOf(world);
    assert.equal(doors.length, 3, `${world} has three doors`);
    for (const door of doors) {
      assert.equal(door.world, world);
      assert.equal(door.id, `${world}.${door.slug}`);
      assert.equal(door.plan, door.plans[1], "a door opens on Easy");
      for (const tier of TIERS) {
        const plan = door.plans[tier];
        assert.ok(plan.slots.length >= 3, `${door.id} tier ${tier} asks enough questions`);
        assert.equal(
          plan.slots.length,
          door.plans[1].slots.length,
          `${door.id} tier ${tier}: harder is never longer`,
        );
        for (const slot of plan.slots) {
          for (const id of slot.from) {
            const activity = getActivity(id);
            assert.ok(activity, `${door.id} tier ${tier} uses ${id}, which exists`);
            assert.ok(
              activity.levels.includes(slot.level),
              `${id} has level ${slot.level} for ${door.id} tier ${tier}`,
            );
          }
        }
      }
    }
  }
  assert.equal(new Set(WORLD_ACTIVITIES.map((a) => a.id)).size, WORLD_ACTIVITIES.length);
});

test("every door deals a full round the quest machine can play", () => {
  for (const door of WORLD_ACTIVITIES) {
    for (const tier of TIERS) {
      const plan = door.plans[tier];
      for (const seed of [1, 2, 3]) {
        const round = buildGeneralKnowledgeSession(createRng(seed), plan);
        assert.equal(round.length, plan.slots.length, `${door.id} tier ${tier} seed ${seed}`);
        for (const challenge of round) {
          assert.ok(
            challenge.payload.kind === "choice" || challenge.payload.kind === "connect",
            `${door.id} tier ${tier} dealt a ${challenge.payload.kind} board, which the round cannot play`,
          );
        }
      }
    }
  }
});

test("doors have routes, places and a game to play inside", () => {
  for (const door of WORLD_ACTIVITIES) {
    assert.equal(activityRoute(door), `/worlds/${door.world}/${door.slug}`);
    assert.equal(findWorldActivity(door.world, door.slug), door);
    assert.equal(WORLD_PLACES[door.world].route, `/worlds/${door.world}`);
    assert.equal(worldGameFor(door).title, door.title);
  }
  assert.equal(findWorldActivity("counting", "nope") ?? null, null);
  assert.equal(findWorldActivity("meadow", "count-the-apples") ?? null, null);
});

test("a fresh journey starts at the first door of the first world", () => {
  const first = activitiesOf("counting")[0];
  assert.equal(continueTarget(EMPTY_JOURNEY), first);
  assert.equal(statusOf(EMPTY_JOURNEY, first), "next");
  assert.equal(statusOf(EMPTY_JOURNEY, activitiesOf("counting")[1]), "new");
  assert.equal(stickersOf(EMPTY_JOURNEY), 0);
  assert.deepEqual(worldProgress(EMPTY_JOURNEY, "counting"), { done: 0, total: 3, complete: false });
});

test("finishing a door moves next along, and continue follows the last world", () => {
  const [apples, flowers, numbers] = activitiesOf("counting");
  let journey = markOpened(EMPTY_JOURNEY, apples.id);
  assert.equal(continueTarget(journey), apples, "opened but not finished: still next");
  journey = markCompleted(journey, apples.id);
  assert.equal(statusOf(journey, apples), "done");
  assert.equal(statusOf(journey, flowers), "next");
  assert.equal(statusOf(journey, numbers), "new");
  assert.equal(continueTarget(journey), flowers);
  assert.equal(stickersOf(journey), 1);

  /* Wandering into another world moves "continue" there. */
  const home = activitiesOf("animals")[0];
  journey = markOpened(journey, home.id);
  assert.equal(continueTarget(journey), home);

  /* Playing a door again changes nothing but "last". */
  const again = markCompleted(journey, apples.id);
  assert.equal(again.completed.length, journey.completed.length);
  assert.equal(again.last, apples.id);
  assert.equal(markCompleted(again, apples.id), again, "no new object when nothing changed");
});

test("a finished world says so and points at another", () => {
  let journey = EMPTY_JOURNEY;
  for (const door of activitiesOf("counting")) journey = markCompleted(journey, door.id);
  assert.equal(nextActivityIn(journey, "counting"), null);
  assert.deepEqual(worldProgress(journey, "counting"), { done: 3, total: 3, complete: true });
  assert.equal(suggestWorldAfter(journey, "counting"), "animals");
  assert.equal(continueTarget(journey), activitiesOf("animals")[0], "continue leaves the finished world");
  assert.equal(everythingDone(journey), false);

  for (const door of WORLD_ACTIVITIES) journey = markCompleted(journey, door.id);
  assert.equal(everythingDone(journey), true);
  assert.equal(continueTarget(journey), null);
  assert.equal(stickersOf(journey), WORLD_ACTIVITIES.length);
  assert.ok(suggestWorldAfter(journey, "words"), "still somewhere to go, to play again");
});

test("whatever was on disk is read back without trust", () => {
  assert.deepEqual(parseJourney(null), EMPTY_JOURNEY);
  assert.deepEqual(parseJourney("garbage"), EMPTY_JOURNEY);
  assert.deepEqual(parseJourney({ completed: "x", last: 4 }), EMPTY_JOURNEY);
  const read = parseJourney({
    completed: ["counting.count-the-apples", "counting.count-the-apples", "gone.door", 7],
    last: "gone.door",
  });
  assert.deepEqual(read, {
    completed: ["counting.count-the-apples"],
    medium: [],
    hard: [],
    last: null,
  });

  /* A journey written before tiers existed reads back unchanged: `completed`
     kept its meaning, and the tier lists it never had read as empty. */
  assert.deepEqual(
    parseJourney({ completed: ["counting.count-the-apples"], last: "counting.count-the-apples" }),
    {
      completed: ["counting.count-the-apples"],
      medium: [],
      hard: [],
      last: "counting.count-the-apples",
    },
  );
  /* Tier lists are read with the same distrust as the rest. */
  assert.deepEqual(parseJourney({ completed: [], medium: "x", hard: { a: 1 }, last: null }), EMPTY_JOURNEY);
  assert.deepEqual(
    parseJourney({
      completed: ["counting.count-the-apples"],
      medium: ["counting.count-the-apples", "gone.door", 9],
      hard: [],
      last: null,
    }).medium,
    ["counting.count-the-apples"],
  );
});

/* ---- Tiers --------------------------------------------------------------- */

test("a door opens on Easy; each finish unlocks the next size and locks nothing", () => {
  const door = WORLD_ACTIVITIES[0];
  assert.equal(suggestedTier(EMPTY_JOURNEY, door.id), 1);
  assert.equal(tierStateOf(EMPTY_JOURNEY, door.id, 1), "ready");
  assert.equal(tierStateOf(EMPTY_JOURNEY, door.id, 2), "locked");
  assert.equal(tierStateOf(EMPTY_JOURNEY, door.id, 3), "locked");

  const easy = markCompletedAt(EMPTY_JOURNEY, door.id, 1);
  assert.equal(tierStateOf(easy, door.id, 1), "done");
  assert.equal(tierStateOf(easy, door.id, 2), "ready");
  assert.equal(tierStateOf(easy, door.id, 3), "locked");
  assert.equal(suggestedTier(easy, door.id), 2);
  assert.equal(isCompleted(easy, door.id), true, "finishing Easy is what finishing has always meant");

  const medium = markCompletedAt(easy, door.id, 2);
  assert.equal(tierStateOf(medium, door.id, 3), "ready");
  assert.equal(suggestedTier(medium, door.id), 3);

  const hard = markCompletedAt(medium, door.id, 3);
  for (const tier of TIERS) {
    assert.equal(tierStateOf(hard, door.id, tier), "done", "nothing ever locks back");
    assert.equal(tierUnlocked(hard, door.id, tier), true);
  }
  assert.equal(suggestedTier(hard, door.id), 3, "a finished door still offers its biggest challenge");
  assert.equal(statusOf(hard, door), "done");

  /* Unlocks are per door: finishing one opens nothing on another. */
  assert.equal(tierStateOf(hard, WORLD_ACTIVITIES[1].id, 2), "locked");
});

test("finishing a tier twice is finishing it once, and no finish rewrites another", () => {
  const door = WORLD_ACTIVITIES[0];
  const other = WORLD_ACTIVITIES[1];
  const once = markCompletedAt(EMPTY_JOURNEY, door.id, 2);
  assert.deepEqual(once.medium, [door.id]);
  assert.deepEqual(once.completed, [], "a Medium finish never pretends Easy happened");
  assert.equal(markCompletedAt(once, door.id, 2), once, "no new object when nothing changed");

  /* World progress and stickers stay what they always were: Easy finishes. */
  assert.deepEqual(worldProgress(once, door.world), { done: 0, total: 3, complete: false });
  assert.equal(stickersOf(once), 0);

  /* Later finishes elsewhere leave every tier list intact. */
  const hard = markCompletedAt(markCompletedAt(once, door.id, 1), door.id, 3);
  const wandered = markCompletedAt(hard, other.id, 1);
  assert.deepEqual(wandered.medium, hard.medium);
  assert.deepEqual(wandered.hard, hard.hard);
  assert.equal(wandered.last, other.id);
});
