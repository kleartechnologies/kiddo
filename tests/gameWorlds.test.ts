import assert from "node:assert/strict";
import { test } from "node:test";

import { getActivity } from "@/lib/content/registry";
import { isMagicMotion } from "@/lib/magicMotion";
import {
  GAME_WORLDS,
  WORLD_OF_ACTIVITY,
  worldOf,
  type GameWorldId,
} from "@/lib/worlds/worlds";

/**
 * The game worlds, checked as data: an activity sent to a world that exists,
 * a world that only ever reacts with one of the eight motions, and a meadow
 * that stays exactly as quiet as every game was before there were worlds.
 */

test("every activity with a world is a real activity in a real world", () => {
  for (const [activityId, world] of Object.entries(WORLD_OF_ACTIVITY)) {
    assert.ok(
      getActivity(activityId as never),
      `${activityId} is not an activity`,
    );
    assert.ok(
      GAME_WORLDS[world as GameWorldId],
      `${activityId} → ${world}, which is not a world`,
    );
  }
});

test("the meadow is the world of everything unlisted, and of nothing at all", () => {
  assert.equal(worldOf(null), "meadow");
  assert.equal(worldOf(undefined), "meadow");
  assert.equal(worldOf({ activityId: "math.addition" }), "meadow");
  assert.equal(worldOf({ activityId: "math.counting-objects" }), "counting");
  assert.equal(
    worldOf({ activityId: "general-knowledge.home-partners" }),
    "animals",
  );
  assert.equal(worldOf({ activityId: "english.rhyming-partners" }), "words");
  assert.equal(
    worldOf({ activityId: "general-knowledge.animal-homes" }),
    "animals",
  );
  assert.equal(worldOf({ activityId: "english.sound-partners" }), "words");
});

test("a world's reactions come from the Magic Motion vocabulary, and the meadow has none", () => {
  for (const world of Object.values(GAME_WORLDS)) {
    for (const [moment, name] of Object.entries(world.reactions)) {
      if (name === null) continue;
      assert.ok(
        isMagicMotion(name),
        `${world.id} reacts at ${moment} with "${name}"`,
      );
    }
  }
  assert.ok(
    Object.values(GAME_WORLDS.meadow.reactions).every((name) => name === null),
    "the meadow reacts at nothing",
  );
});

test("a world that travels does not also react when the traveller is joined", () => {
  /* ConnectStage's walk must stay the first [data-magic] in a left node. */
  assert.equal(GAME_WORLDS.animals.reactions.joined, null);
});
