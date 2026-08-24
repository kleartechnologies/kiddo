import assert from "node:assert/strict";
import { test } from "node:test";

import { labelOf } from "@/lib/content/challenges";
import { createRng } from "@/lib/content/rng";
import { buildGeneralKnowledgeSession } from "@/lib/games/generalKnowledgeQuest";
import { introPreviewOf } from "@/lib/worlds/introPreview";
import { TIERS, WORLD_ACTIVITIES } from "@/lib/worlds/activities";

/**
 * The way in previews what the round is *about*, never what to answer.
 *
 * The glimpse on the intro scene is built from the first challenge of the
 * real deal, so the promise to check is where its things may come from: a
 * tapped board lends only its prompt — showing the options would be showing
 * the answer — and a joined-up board lends a couple of things from each
 * column, where every thing is equally the question. Checked over every
 * door, every tier and many seeds, because the glimpse is dealt from the
 * same stream the round is.
 */

test("a tapped board's glimpse comes from the prompt, never from the options", () => {
  let tapped = 0;
  for (const activity of WORLD_ACTIVITIES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 8; seed += 1) {
        const [first] = buildGeneralKnowledgeSession(
          createRng(seed),
          activity.plans[tier],
        );
        if (!first || first.payload.kind !== "choice") continue;
        tapped += 1;
        const preview = introPreviewOf(first);
        const prompt = (first.prompt.display ?? [])
          .filter((part) => part.kind === "item")
          .map((part) => part.item);
        for (const item of preview) {
          assert.ok(
            prompt.includes(item),
            `${activity.id} tier ${tier} seed ${seed} glimpses "${labelOf(item)}", which is not on the prompt`,
          );
        }
      }
    }
  }
  assert.ok(tapped > 0, "tapped first boards were dealt");
});

test("a joined-up board's glimpse is a couple from each column, and nothing else", () => {
  let joined = 0;
  for (const activity of WORLD_ACTIVITIES) {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 8; seed += 1) {
        const [first] = buildGeneralKnowledgeSession(
          createRng(seed),
          activity.plans[tier],
        );
        if (!first || first.payload.kind !== "connect") continue;
        joined += 1;
        const preview = introPreviewOf(first);
        const board = [
          ...first.payload.left.map((node) => node.item),
          ...first.payload.right.map((node) => node.item),
        ];
        assert.ok(preview.length >= 2 && preview.length <= 4);
        for (const item of preview) {
          assert.ok(
            board.includes(item),
            `${activity.id} tier ${tier} seed ${seed} glimpses "${labelOf(item)}", which is not on the board`,
          );
        }
      }
    }
  }
  assert.ok(joined > 0, "joined-up first boards were dealt");
});

test("the glimpse is small, and nothing is glimpsed when there is nothing to show", () => {
  assert.deepEqual(introPreviewOf(null), []);
  assert.deepEqual(introPreviewOf(undefined), []);
  for (const activity of WORLD_ACTIVITIES) {
    for (const tier of TIERS) {
      const [first] = buildGeneralKnowledgeSession(
        createRng(3),
        activity.plans[tier],
      );
      assert.ok(introPreviewOf(first).length <= 4, `${activity.id} tier ${tier}`);
    }
  }
});
