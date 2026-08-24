import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";
import { defineQuizActivity, except, pic, type Question, type Sym } from "./shared";

/**
 * Space, and the difference between day and night.
 *
 * Space is the one subject in the pack that a child cannot go and look at, so
 * every fact here is one they can check from a window or a bedtime book: the
 * sun is out in the day, the moon comes out at night, we live on the Earth, a
 * rocket is how people get up there. Nothing about orbits, gravity or how far
 * away anything is.
 */

const SPACE = {
  sun: pic("☀️", "the sun"),
  moon: pic("🌙", "the moon"),
  star: pic("⭐", "a star"),
  earth: pic("🌍", "planet Earth"),
  rocket: pic("🚀", "a rocket"),
  planet: pic("🪐", "a planet with rings"),
  astronaut: pic("👨‍🚀", "an astronaut"),
  satellite: pic("🛰️", "a satellite"),
} as const;

type SpaceKey = keyof typeof SPACE;

export const SPACE_TILES: readonly Sym[] = Object.values(SPACE);

const SPACE_FACTS: readonly {
  key: SpaceKey;
  ask: string;
  because: string;
  hint: string;
  idea: string;
  /** Tiles that would also be a fair answer, kept off the board. */
  avoid?: readonly SpaceKey[];
  level: 1 | 2 | 3;
}[] = [
  { key: "sun", ask: "Which one is the sun?", because: "That is the sun, our own bright star.", hint: "It is the brightest one of all.", idea: "space:sun", level: 1 },
  { key: "moon", ask: "Which one is the moon?", because: "That is the moon, going round and round the Earth.", hint: "It is the curved one.", idea: "space:moon", level: 1 },
  /* The sun is a star too, so it is never on the board opposite one. */
  { key: "star", ask: "Which one is a star?", because: "That is a star, twinkling far, far away.", hint: "It is the little pointy one.", idea: "space:star", avoid: ["sun"], level: 1 },
  { key: "rocket", ask: "Which one is a rocket?", because: "That is a rocket, ready to blast off.", hint: "It is the pointy one with fire underneath.", idea: "space:rocket", level: 2 },
  { key: "earth", ask: "Which one is planet Earth?", because: "That is the Earth, with its blue seas and green land.", hint: "Look for the blue and green one.", idea: "space:earth", level: 2 },
  { key: "astronaut", ask: "Which one is an astronaut?", because: "That is an astronaut, in a special suit for space.", hint: "It is the person.", idea: "space:astronaut", level: 3 },
  { key: "earth", ask: "Which one do we all live on?", because: "We all live together on planet Earth.", hint: "It is the one with land and sea on it.", idea: "space:we-live-on-earth", avoid: ["planet"], level: 2 },
  { key: "sun", ask: "Which one warms us up and lights the sky in the daytime?", because: "The sun gives us light and warmth all day long.", hint: "You can feel this one on your face.", idea: "space:sun-warms", avoid: ["star"], level: 2 },
  { key: "moon", ask: "Which one do we see high in the sky at night-time?", because: "The moon shines in the sky at night.", hint: "You would have to stay up late to see it.", idea: "space:moon-at-night", avoid: ["star"], level: 3 },
  { key: "rocket", ask: "What do people travel in to get all the way to space?", because: "People ride a rocket up into space.", hint: "It needs an enormous amount of fire to lift off.", idea: "space:rocket-travel", avoid: ["satellite"], level: 3 },
];

export const spaceFacts = defineQuizActivity({
  id: "space",
  title: "Up in Space",
  activityType: "space-facts",
  ageRange: { min: 4, max: 6 },
  host: "pip",
  questions: SPACE_FACTS.map((fact): Question => {
    const answer = SPACE[fact.key];
    const barred = new Set<string>([
      answer.key,
      ...(fact.avoid ?? []).map((key) => SPACE[key].key),
    ]);
    return {
      level: fact.level,
      ask: fact.ask,
      answer,
      distractors: SPACE_TILES.filter((tile) => !barred.has(tile.key)),
      because: fact.because,
      hint: fact.hint,
      idea: fact.idea,
      family: "space",
    };
  }),
});

/* ---------------------------------------------------------- day and night */

const PART_OF_DAY = {
  morning: pic("🌅", "the morning"),
  midday: pic("🌞", "the middle of the day"),
  evening: pic("🌇", "the evening"),
  night: pic("🌃", "night-time"),
} as const;

const DAY_TILES: readonly Sym[] = Object.values(PART_OF_DAY);

const SKY = {
  sun: pic("☀️", "the sun"),
  moon: pic("🌙", "the moon"),
  stars: pic("✨", "the stars"),
  rainbow: pic("🌈", "a rainbow"),
  cloud: pic("☁️", "a cloud"),
} as const;

export const dayAndNight = defineQuizActivity({
  id: "day-and-night",
  title: "Day and Night",
  activityType: "day-and-night",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  tiles: { 1: 4, 2: 4, 3: 4 },
  questions: [
    {
      level: 1,
      ask: "It is dark outside and everybody is asleep. Which part of the day is it?",
      answer: PART_OF_DAY.night,
      distractors: except(DAY_TILES, PART_OF_DAY.night),
      because: "When it is dark and everyone is asleep, it is night-time.",
      hint: "Think about when the stars come out.",
      idea: "day:night",
      family: "part of the day",
    },
    {
      level: 1,
      ask: "You have just woken up and the sun is coming up. Which part of the day is it?",
      answer: PART_OF_DAY.morning,
      distractors: except(DAY_TILES, PART_OF_DAY.morning),
      because: "When you wake up and the sun rises, it is the morning.",
      hint: "It is when you eat your breakfast.",
      idea: "day:morning",
      family: "part of the day",
    },
    {
      level: 2,
      ask: "The sun is right up high and it is time for lunch. Which part of the day is it?",
      answer: PART_OF_DAY.midday,
      distractors: except(DAY_TILES, PART_OF_DAY.midday),
      because: "When the sun is highest, it is the middle of the day.",
      hint: "It is halfway between waking up and going to bed.",
      idea: "day:midday",
      family: "part of the day",
    },
    {
      level: 3,
      ask: "The sun is going down and it is nearly bedtime. Which part of the day is it?",
      answer: PART_OF_DAY.evening,
      distractors: except(DAY_TILES, PART_OF_DAY.evening),
      because: "As the sun goes down, the evening begins.",
      hint: "It comes after the day and before the night.",
      idea: "day:evening",
      family: "part of the day",
    },
    {
      level: 1,
      ask: "What comes out in the sky when it gets dark?",
      answer: SKY.moon,
      distractors: [SKY.sun, SKY.rainbow, SKY.cloud],
      because: "The moon comes out when it gets dark.",
      hint: "It is round or curved, and silvery.",
      idea: "day:moon-comes-out",
      family: "sky",
    },
    {
      level: 2,
      ask: "What lights up the whole sky in the daytime?",
      answer: SKY.sun,
      distractors: [SKY.moon, SKY.stars, SKY.cloud],
      because: "The sun lights up the sky all day.",
      hint: "It is the one you must never look straight at.",
      idea: "day:sun-lights",
      family: "sky",
    },
    {
      level: 3,
      ask: "What twinkles all over the sky on a clear, dark night?",
      answer: SKY.stars,
      distractors: [SKY.sun, SKY.rainbow, SKY.cloud],
      because: "The stars twinkle in the dark night sky.",
      hint: "There are far too many of them to count.",
      idea: "day:stars-twinkle",
      family: "sky",
    },
    {
      level: 3,
      ask: "Which animal is wide awake at night while you are fast asleep?",
      answer: pic("🦉", "an owl"),
      distractors: [pic("🐔", "a chicken"), pic("🦋", "a butterfly"), pic("🐝", "a bee")],
      because: "An owl sleeps in the day and hunts at night.",
      hint: "It has enormous round eyes for seeing in the dark.",
      idea: "day:owl-at-night",
      family: "animal",
    },
    {
      level: 2,
      ask: "What do you switch on when your room goes dark?",
      answer: pic("💡", "a light"),
      distractors: [pic("📖", "a book"), pic("🧹", "a broom"), pic("🥄", "a spoon")],
      because: "You switch a light on so you can see in the dark.",
      hint: "It hangs from the ceiling or sits on a table.",
      idea: "day:light-in-the-dark",
      family: "object",
    },
  ],
});

/* ------------------------------------------------------- the day, in order */

/**
 * What happens first, and what happens after that.
 *
 * `dayAndNight` shows four parts of the day and asks which one it is. This
 * asks for the whole run at once, which is a different thing to know: a child
 * can name the evening without being sure whether it comes before or after the
 * night. Same objective, same `activityType`, and no new engine — `OrderStage`
 * has drawn the alphabet and a run of numerals since long before this pack.
 *
 * ## What is deliberately not here
 *
 * Any run that depends on whose house it is. Bath before story, teeth before
 * bath, pyjamas before supper — all of them real in some homes and wrong in
 * others, and a child who does it the other way round would be told they had
 * made a mistake by an app that had made the mistake itself. Every run below
 * is one the child can check out of a window or against the clock: the sun
 * goes up before it comes down, and lunch comes after breakfast everywhere.
 *
 * ## How a level gets harder
 *
 * | | cards | what is being ordered |
 * |-|-------|-----------------------|
 * |1| 3 | the three points of a day that look completely different |
 * |2| 4 | four, so the two in the middle have to be told apart |
 * |3| 5 | five, and the last two are the dark ones |
 *
 * Length and closeness, not speed. Nothing here is timed.
 */

const WHEN = {
  morning: pic("🌅", "the morning"),
  midday: pic("🌞", "the middle of the day"),
  evening: pic("🌇", "the evening"),
  night: pic("🌃", "night-time"),
  sunUp: pic("🌅", "the sun comes up"),
  sunHigh: pic("🌞", "the sun is high up"),
  sunDown: pic("🌇", "the sun goes down"),
  dark: pic("🌃", "it goes dark"),
  stars: pic("⭐", "the stars come out"),
  alarm: pic("⏰", "the alarm clock rings"),
  breakfast: pic("🥣", "breakfast"),
  lunch: pic("🥪", "lunch"),
  dinner: pic("🍽️", "dinner"),
  school: pic("🎒", "going to school"),
  homeAgain: pic("🏠", "coming home again"),
  bedtime: pic("🌙", "bedtime"),
} as const;

type WhenKey = keyof typeof WHEN;

/** One run of a day, in the order it happens. */
interface Run {
  /** Names the thing being learned. Unique, and what `conceptKey` counts. */
  id: string;
  steps: readonly WhenKey[];
  level: 1 | 2 | 3;
}

const RUNS: readonly Run[] = [
  /* Level 1 — three cards, and the three look nothing like each other. */
  { id: "day-parts", steps: ["morning", "midday", "night"], level: 1 },
  { id: "meals", steps: ["breakfast", "lunch", "dinner"], level: 1 },
  { id: "sun", steps: ["sunUp", "sunHigh", "sunDown"], level: 1 },

  /* Level 2 — four cards, so the middle of the run has to be sorted out. */
  { id: "day-parts-four", steps: ["morning", "midday", "evening", "night"], level: 2 },
  { id: "school-day", steps: ["alarm", "breakfast", "school", "homeAgain"], level: 2 },
  { id: "eating-day", steps: ["breakfast", "lunch", "dinner", "bedtime"], level: 2 },

  /* Level 3 — five cards, and the run ends in the dark, where two cards in a
     row are night-ish and only one of them can be last. */
  { id: "whole-day", steps: ["alarm", "breakfast", "school", "dinner", "bedtime"], level: 3 },
  { id: "sky-day", steps: ["sunUp", "sunHigh", "sunDown", "dark", "stars"], level: 3 },
];

/**
 * The honest content count of this objective: eight runs of a day. Not the
 * boards — every run can be dealt onto a tray dozens of ways.
 */
export const DAY_RUNS: readonly string[] = RUNS.map((run) => run.id);

function poolAtLevel(level: Level): readonly Run[] {
  const wanted = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return RUNS.filter((run) => run.level === wanted);
}

/**
 * The fewest cards that may still be sitting where the child found them.
 *
 * The same rule `math.number-order` uses: a tray that is mostly already sorted
 * is a board finished by moving one card.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/** The tray. Shuffled until enough has moved, then rotated as a fallback. */
function trayOrder(
  steps: readonly WhenKey[],
  rng: Rng,
  displaced: number,
): WhenKey[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(steps);
    const moved = shuffled.filter((step, index) => step !== steps[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...steps.slice(1), steps[0]];
}

export const dayOrder = defineGeneratedActivity({
  id: "day-order",
  packId: "general-knowledge",
  title: "What Happens First",
  category: "general-knowledge",
  activityType: "day-and-night",
  kind: "order",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const run = pool[rng.int(0, pool.length - 1)];
    const { steps } = run;

    const items: OrderItem[] = trayOrder(
      steps,
      rng,
      displacedAtLevel(level, steps.length),
    ).map((step) => ({ id: step, item: WHEN[step].item }));

    const first = WHEN[steps[0]].key;
    const last = WHEN[steps[steps.length - 1]].key;

    return {
      level,
      prompt: { speech: "Can you put the day in order, starting with what happens first?" },
      payload: { kind: "order", items, answerOrder: [...steps] },
      explanation: `That is the way a day goes! It starts with ${first} and ends with ${last}.`,
      hint: "Find the one that happens first, and put that one down to start with.",
      meta: {
        objective: "puts the parts of a day in the order they happen",
        tags: ["family:part of the day", `concept:day-order:${run.id}`],
      },
    };
  },
});

export const SPACE_ACTIVITIES = [spaceFacts, dayAndNight, dayOrder];
