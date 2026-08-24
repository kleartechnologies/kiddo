import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { getActivity } from "@/lib/content/registry";
import {
  EMPTY_JOURNEY,
  continueTarget,
  markCompleted,
  markCompletedAt,
  markOpened,
  type Journey,
} from "@/lib/journey/journey";
import {
  conceptsByWorld,
  conceptsOf,
  daypartGreeting,
  journeySummary,
  nextUp,
  overviewLine,
  progressLabel,
  recentActivities,
  tiersLabel,
  worldSummaries,
} from "@/lib/parents/dashboard";
import { PLAYABLE_WORLDS, TIERS, WORLD_ACTIVITIES, activitiesOf } from "@/lib/worlds/activities";

/**
 * The parent dashboard, checked as a grown-up would read it.
 *
 * Every number the dashboard shows is a pure function of the child's
 * journey, so every test here is one journey in and the sentences and
 * counts a parent should see out — for an empty journey, a half-finished
 * one and a finished one — plus the promise that "next up" is the very
 * same door the child's own Continue button points at.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const [apples, flowers] = activitiesOf("counting");
const [home] = activitiesOf("animals");

const partial: Journey = markOpened(
  markCompleted(markCompleted(markCompleted(EMPTY_JOURNEY, apples.id), flowers.id), home.id),
  home.id,
);

const all: Journey = WORLD_ACTIVITIES.reduce(
  (journey, door) => markCompleted(journey, door.id),
  EMPTY_JOURNEY,
);

/* Every door finished at every size — the journey of a child who took every
   bigger challenge too. */
const allTiers: Journey = WORLD_ACTIVITIES.reduce(
  (journey, door) =>
    TIERS.reduce((grown, tier) => markCompletedAt(grown, door.id, tier), journey),
  EMPTY_JOURNEY,
);

/* 1 — empty ---------------------------------------------------------------- */
test("an empty journey is reported as not started, with nothing invented", () => {
  const s = journeySummary(EMPTY_JOURNEY);
  assert.deepEqual(s, {
    activitiesDone: 0,
    activitiesTotal: 9,
    keepsakes: 0,
    worldsVisited: 0,
    worldsTotal: 3,
    everything: false,
  });
  assert.equal(overviewLine(EMPTY_JOURNEY), "The adventure has not started yet.");
  assert.deepEqual(recentActivities(EMPTY_JOURNEY), []);
  for (const world of worldSummaries(EMPTY_JOURNEY)) {
    assert.equal(world.state, "untouched");
    assert.equal(world.progress.done, 0);
    assert.match(progressLabel(world.progress), /^Not explored yet/);
  }
});

/* 2 — partial -------------------------------------------------------------- */
test("a partial journey counts activities and worlds from the record alone", () => {
  const s = journeySummary(partial);
  assert.equal(s.activitiesDone, 3);
  assert.equal(s.keepsakes, 3, "one keepsake per finished door, never more");
  assert.equal(s.worldsVisited, 2);
  assert.equal(s.everything, false);
  assert.equal(overviewLine(partial), "3 activities completed across 2 worlds.");

  const [counting, animals, words] = worldSummaries(partial);
  assert.equal(counting.state, "started");
  assert.equal(progressLabel(counting.progress), "2 of 3 activities explored");
  assert.equal(animals.state, "started");
  assert.equal(progressLabel(animals.progress), "1 of 3 activities explored");
  assert.equal(words.state, "untouched");

  const one = markCompleted(EMPTY_JOURNEY, apples.id);
  assert.equal(overviewLine(one), "1 activity completed across 1 world.");
});

/* 3 — complete ------------------------------------------------------------- */
test("a finished journey says so everywhere, and has no next door", () => {
  const s = journeySummary(all);
  assert.equal(s.activitiesDone, WORLD_ACTIVITIES.length);
  assert.equal(s.worldsVisited, PLAYABLE_WORLDS.length);
  assert.equal(s.everything, true);
  assert.equal(overviewLine(all), "Every activity completed across all 3 worlds.");
  for (const world of worldSummaries(all)) {
    assert.equal(world.state, "complete");
    assert.equal(world.next, null);
    assert.equal(progressLabel(world.progress), "All 3 activities explored");
  }
  assert.equal(nextUp(all), null);
});

/* 4 — next ----------------------------------------------------------------- */
test("next up is exactly what the child's Continue button points at", () => {
  for (const journey of [EMPTY_JOURNEY, partial, markOpened(EMPTY_JOURNEY, home.id)]) {
    assert.equal(nextUp(journey)?.activity ?? null, continueTarget(journey));
  }
  assert.equal(nextUp(EMPTY_JOURNEY)?.mode, "start");
  assert.equal(nextUp(partial)?.mode, "continue");
  /* The child was last in the animal world, so that is where next is. */
  assert.equal(nextUp(partial)?.activity.world, "animals");
  assert.equal(nextUp(partial)?.place.name, "Animal Adventure");
});

/* 5 — recent --------------------------------------------------------------- */
test("recent is newest first, led by the last door if it is finished", () => {
  assert.deepEqual(
    recentActivities(partial).map((a) => a.id),
    [home.id, flowers.id, apples.id],
  );
  /* Replaying an old door brings it to the top without duplicating it. */
  const replayed = markCompleted(partial, apples.id);
  assert.deepEqual(
    recentActivities(replayed).map((a) => a.id),
    [apples.id, home.id, flowers.id],
  );
  /* A door merely opened is not recent: nothing was finished. */
  const peeked = markOpened(partial, activitiesOf("words")[0].id);
  assert.deepEqual(recentActivities(peeked).map((a) => a.id), [home.id, flowers.id, apples.id]);
  assert.equal(recentActivities(all, 2).length, 2);
});

/* 6 — concepts ------------------------------------------------------------- */
test("learning concepts come from the doors' own plans, and only from them", () => {
  for (const world of PLAYABLE_WORLDS) {
    const concepts = conceptsOf(EMPTY_JOURNEY, world);
    assert.ok(concepts.length >= 2, `${world} names its skills`);
    const drawn = new Set(
      activitiesOf(world).flatMap((door) =>
        TIERS.flatMap((tier) => door.plans[tier].slots.flatMap((slot) => slot.from)),
      ),
    );
    assert.deepEqual(new Set(concepts.map((c) => c.id)), drawn, `${world} lists what it deals`);
    for (const concept of concepts) {
      assert.equal(concept.title, getActivity(concept.id)?.title);
      assert.equal(concept.practised, false);
    }
  }
  /* The examples the brief gave, in the content's own words. */
  const counting = conceptsOf(EMPTY_JOURNEY, "counting").map((c) => c.title);
  assert.ok(counting.includes("Counting"));
  assert.ok(counting.includes("Knowing numbers"));
  const words = conceptsOf(EMPTY_JOURNEY, "words").map((c) => c.title);
  assert.ok(words.includes("Knowing letters"));
  assert.ok(words.includes("Words That Rhyme"));

  /* Finishing a door ticks the skills it drew from, and no others. */
  const ticked = conceptsOf(partial, "counting");
  assert.equal(ticked.find((c) => c.id === "math.counting")?.practised, true);
  assert.equal(ticked.find((c) => c.id === "math.number-recognition")?.practised, false);
  /* A lesson only a harder tier deals is not claimed until that tier is
     finished — an Easy-only journey leaves it unticked. */
  assert.ok(conceptsOf(all, "words").some((c) => !c.practised));
  assert.ok(conceptsOf(allTiers, "words").every((c) => c.practised));
  assert.equal(conceptsByWorld(partial).length, 3);
});

/* 6b — tiers --------------------------------------------------------------- */
test("the tier line is factual: which sizes were finished, and nothing more", () => {
  assert.equal(tiersLabel(EMPTY_JOURNEY, apples.id), "Not completed yet.");
  const easy = markCompletedAt(EMPTY_JOURNEY, apples.id, 1);
  assert.equal(tiersLabel(easy, apples.id), "Completed Easy.");
  const medium = markCompletedAt(easy, apples.id, 2);
  assert.equal(tiersLabel(medium, apples.id), "Completed Easy and Medium.");
  const hard = markCompletedAt(medium, apples.id, 3);
  assert.equal(tiersLabel(hard, apples.id), "Completed Easy, Medium and Hard.");
  assert.equal(tiersLabel(hard, flowers.id), "Not completed yet.", "one door's finishes stay its own");
  /* Skipping ahead is still reported honestly, word by word. */
  assert.equal(tiersLabel(markCompletedAt(EMPTY_JOURNEY, apples.id, 2), apples.id), "Completed Medium.");
  /* And the dashboard says the line next to each recent door. */
  const dash = read("src/components/parents/ParentDashboard.tsx");
  assert.match(dash, /tiersLabel\(journey, activity\.id\)/);
  assert.match(dash, /data-parent-tiers/);
});

/* 7 — reset ---------------------------------------------------------------- */
test("after a reset the dashboard reads exactly as a first visit", () => {
  /* `resetJourney` writes EMPTY_JOURNEY; everything here is what it derives. */
  assert.equal(
    overviewLine(EMPTY_JOURNEY),
    overviewLine({ completed: [], medium: [], hard: [], last: null }),
  );
  assert.equal(nextUp(EMPTY_JOURNEY)?.activity, apples);
  assert.equal(nextUp(EMPTY_JOURNEY)?.mode, "start");
  const src = read("src/lib/journey/useJourney.ts");
  assert.match(src, /export function resetJourney\(\): void \{\s*update\(EMPTY_JOURNEY\);/);
});

/* 8 — greeting ------------------------------------------------------------- */
test("the greeting follows the clock and never breaks on a bad hour", () => {
  assert.equal(daypartGreeting(6), "Good morning");
  assert.equal(daypartGreeting(11), "Good morning");
  assert.equal(daypartGreeting(12), "Good afternoon");
  assert.equal(daypartGreeting(17), "Good afternoon");
  assert.equal(daypartGreeting(18), "Good evening");
  assert.equal(daypartGreeting(23), "Good evening");
  assert.equal(daypartGreeting(-1), "Good evening");
  assert.equal(daypartGreeting(Number.NaN), "Good afternoon");
});

/* 9 — navigation ----------------------------------------------------------- */
test("parent and child are one deliberate link apart in each direction", () => {
  const parents = read("src/app/parents/page.tsx");
  assert.match(parents, /href=\{KIDDO_HOME\}[\s\S]{0,400}Open KIDDO/, "the way back to the child is named");
  assert.match(parents, /Parent area/);
  const header = read("src/components/kiddo/WorldHeader.tsx");
  assert.match(header, /href="\/parents"/, "the child's header keeps its grown-up door");
  /* The parent page must not draw the child's hero or music. */
  assert.doesNotMatch(parents, /WorldHero|WorldMusic|ContinueAdventure/);
});

/* 10 — accessibility ------------------------------------------------------- */
test("progress is never colour alone, and the reset is behind a real dialog", () => {
  const dash = read("src/components/parents/ParentDashboard.tsx");
  assert.match(dash, /role="progressbar"/);
  assert.match(dash, /aria-valuetext=\{label\}/, "the bar says its numbers");
  assert.match(dash, /\{label\}\s*<\/p>/, "and the numbers are visible text too");
  assert.match(dash, /<h1 id="parent-heading"/);
  const reset = read("src/components/parents/ResetProgress.tsx");
  assert.match(reset, /<dialog/);
  assert.match(reset, /showModal\(\)/);
  assert.match(reset, /aria-labelledby=\{titleId\}/);
  assert.match(reset, /aria-live="polite"/);
  assert.match(reset, /value="cancel" autoFocus/, "Cancel takes focus first");
});
