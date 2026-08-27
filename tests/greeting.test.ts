import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_CHILD_NAME_LENGTH,
  isLongChildName,
  normalizeChildName,
} from "@/lib/profile/child";
import {
  FALLBACK_GREETING,
  GREETING_COUNT,
  greetingFor,
} from "@/lib/profile/greeting";

/**
 * The greeting, checked as the thing a child reads.
 *
 * Every test here is a sentence that must never appear on a screen. The brief
 * named three of them outright — "Hi, undefined!", "Hi, null!", "Hi, !" — and
 * the point of the pair of modules under test is that none of them is
 * reachable, rather than that some component remembers to check.
 */

/** Every seed the greeting can be asked for, plus the ones it should not be. */
const SEEDS = [0, 1, 2, 3, 7, 15, 16, 4823, 9999];
const BAD_SEEDS = [-1, -9999, Number.NaN, Number.POSITIVE_INFINITY, 1.7];

test("a name is trimmed to one friendly first name", () => {
  assert.equal(normalizeChildName("Noah"), "Noah");
  assert.equal(normalizeChildName("  Noah  "), "Noah");
  assert.equal(normalizeChildName("noah"), "noah");
  /* The whole privacy story: a surname typed in is not a surname stored. */
  assert.equal(normalizeChildName("Noah Whitfield"), "Noah");
  assert.equal(normalizeChildName("Noah  James  Whitfield"), "Noah");
  assert.equal(normalizeChildName("Zoë"), "Zoë");
  assert.equal(normalizeChildName("O'Brien"), "O'Brien");
  assert.equal(normalizeChildName("Anne-Marie"), "Anne-Marie");
});

test("nothing usable comes back as null, never as a string", () => {
  for (const raw of [
    undefined,
    null,
    "",
    "   ",
    "\n\t ",
    "​",
    42,
    {},
    [],
    () => "Noah",
    "undefined",
    "null",
    "NULL",
    "NaN",
    "123",
    "!!!",
    "?",
    "x".repeat(MAX_CHILD_NAME_LENGTH + 1),
  ]) {
    assert.equal(
      normalizeChildName(raw),
      null,
      `${JSON.stringify(String(raw))} should not be a name`,
    );
  }
});

test("with no name, the greeting is the one this screen always had", () => {
  for (const seed of [...SEEDS, ...BAD_SEEDS]) {
    assert.deepEqual(greetingFor(null, seed), FALLBACK_GREETING);
  }
  /* In KIDDO's default language, which is Bahasa Melayu — the same two lines
     this screen had before it could greet anyone by name. */
  assert.equal(FALLBACK_GREETING.hello, "Hai!");
  assert.equal(FALLBACK_GREETING.invitation, "Nak main apa?");
});

test("no seed can put an empty or broken name on a child's screen", () => {
  for (const seed of [...SEEDS, ...BAD_SEEDS]) {
    for (const name of ["Noah", "Bo", "Bartholomew", "Zoë"]) {
      const { hello, invitation } = greetingFor(name, seed);

      assert.ok(hello.includes(name), `${hello} does not say ${name}`);
      assert.ok(!hello.includes("{name}"), `${hello} left the placeholder in`);
      assert.ok(!/undefined|null|NaN/.test(hello), `${hello} leaked a non-value`);
      assert.ok(!/,\s*!/.test(hello), `${hello} greets nobody`);
      assert.ok(invitation.endsWith("?"), `${invitation} is not a question`);
    }
  }
});

test("the same visit is greeted the same way", () => {
  for (const seed of SEEDS) {
    assert.deepEqual(greetingFor("Noah", seed), greetingFor("Noah", seed));
  }
});

test("the greeting varies between visits, and only so far", () => {
  const seen = new Set(
    Array.from({ length: 200 }, (_, seed) => {
      const { hello, invitation } = greetingFor("Noah", seed);
      return `${hello} ${invitation}`;
    }),
  );

  /* Alive: a child does not see one fixed sentence forever. Bounded: the set
     is small and written by hand, so no visit can produce a line nobody has
     read. */
  assert.ok(seen.size > 1, "the greeting never changes");
  assert.equal(seen.size, GREETING_COUNT);
});

test("a long name is only ever greeted in a way that fits beside it", () => {
  assert.ok(isLongChildName("Bartholomew"));
  assert.ok(!isLongChildName("Noah"));

  for (let seed = 0; seed < 200; seed += 1) {
    const { hello } = greetingFor("Bartholomew", seed);
    assert.ok(
      hello === "Hai, Bartholomew!" || hello === "Hei, Bartholomew!",
      `${hello} is too long to set at the hero's size`,
    );
  }
});
