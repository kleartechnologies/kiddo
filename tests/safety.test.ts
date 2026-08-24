import assert from "node:assert/strict";
import { test } from "node:test";

import { drawChallenges } from "@/lib/content/challenges";
import { ACTIVITIES } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import {
  BARRED_WORDS,
  hasBarredWord,
  WORD_PICTURES,
} from "@/lib/content/vocabulary";

/**
 * Content safety, proved by exhaustion rather than promised by review.
 *
 * KIDDO's home is Malaysia and its market is Southeast Asia, and
 * `lib/content/vocabulary.ts` writes down what follows from that: the pig
 * family is never a teaching example — not filtered at render time, but kept
 * out of every content table. A rule like that is exactly the kind that rots:
 * one new pack, one new distractor list, one borrowed word bank, and it is
 * broken without any diff looking dangerous.
 *
 * So this file does not read the tables. It deals the actual product — every
 * registered activity, at every level it offers, across many seeds — and
 * walks every string a challenge carries: speech, labels, tile text, hints,
 * explanations, ids, tags, all of it. If a barred word can reach a child, it
 * can reach this walk.
 */

/** Every string anywhere inside a value, walked without knowing its shape. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) strings(v, out);
  return out;
}

test("the barred-word rule is watching for whole words, not fragments", () => {
  /* The detector itself, before trusting a sweep to it. */
  assert.ok(hasBarredWord("The pig lives here"));
  assert.ok(hasBarredWord("PIG"), "case must not matter");
  assert.ok(hasBarredWord("a piglet!"), "punctuation is not a hiding place");
  assert.ok(!hasBarredWord("The hamster naps"), "HAM must not match inside HAMSTER");
  assert.ok(!hasBarredWord("a spigot"), "PIG must not match inside SPIGOT");
  assert.ok(BARRED_WORDS.includes("pig") && BARRED_WORDS.includes("oink"));
});

test("no barred word is anywhere in the word-picture vocabulary", () => {
  for (const word of Object.keys(WORD_PICTURES)) {
    assert.ok(!hasBarredWord(word), `WORD_PICTURES teaches ${word}`);
  }
});

test("no activity, at any level, on any seed, shows or says a barred word", () => {
  assert.ok(ACTIVITIES.length > 0, "the registry is empty");
  let checked = 0;

  for (const activity of ACTIVITIES) {
    for (const level of activity.levels) {
      for (let seed = 0; seed < 40; seed++) {
        const challenges = drawChallenges(activity, {
          level,
          count: 6,
          rng: createRng(seed),
        });
        for (const challenge of challenges) {
          for (const text of strings(challenge)) {
            checked += 1;
            assert.ok(
              !hasBarredWord(text),
              `${challenge.id} (level ${level}, seed ${seed}) carries "${text}"`,
            );
          }
        }
      }
    }
  }

  /* The sweep has to have been a sweep. */
  assert.ok(checked > 100_000, `only ${checked} strings were checked`);
});
