import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem } from "../../types";
import { pic, type Sym } from "./shared";

/**
 * How living things grow.
 *
 * An egg is a hen that has not happened yet. That is a genuinely strange idea
 * the first time a child meets it, and it is the one thing this activity
 * teaches: the thing in front of you was something smaller, and it will be
 * something bigger, and the order that happens in never changes.
 *
 * An `order`, drawn by `OrderStage` with nothing new in it. It is the right
 * interaction rather than a convenient one — a growing-up is a sequence, and
 * asking "which comes next" one tile at a time would hide the shape of the
 * whole thing, which is the shape being learned.
 *
 * ## What is deliberately not here
 *
 * **The butterfly.** It is the life cycle every early-years classroom teaches
 * and it cannot be drawn with the pictures this pack has: there is a
 * caterpillar and there is a butterfly, and there is no chrysalis. A leaf
 * standing in for the eggs, or a chicken's egg standing in for a butterfly's,
 * would be a picture that lies about what it shows, and the pack's rule is
 * that a picture means what it draws. It is written down in
 * `docs/content-universe.md` as wanting a drawn asset, not an engine.
 *
 * **The frog.** Same reason: there is no tadpole.
 *
 * **Anything that ends.** The runs stop at grown-up. Death is a real part of a
 * life cycle and it is not this app's to introduce.
 *
 * ## How a level gets harder
 *
 * | | cards | what is being ordered |
 * |-|-------|-----------------------|
 * |1| 3 | cycles a child has watched happen — a chick, a bean, themselves |
 * |2| 3 | cycles that take a year or a lifetime, so they have to be reasoned |
 * |3| 4 | the level-one cycles again, with the stage in between put back |
 *
 * Length and familiarity, not speed. Nothing here is timed, and a board that
 * takes a minute is the same board as one that takes four seconds.
 */

/* ------------------------------------------------------------------ tiles */

const STAGES = {
  egg: pic("🥚", "an egg"),
  hatching: pic("🐣", "a chick hatching out"),
  chick: pic("🐥", "a fluffy chick"),
  hen: pic("🐔", "a hen"),

  seed: pic("🫘", "a seed"),
  shoot: pic("🌱", "a little green shoot"),
  leafy: pic("🌿", "a leafy plant"),
  flower: pic("🌼", "a flower"),

  baby: pic("👶", "a baby"),
  child: pic("🧒", "a child"),
  grownUp: pic("🧑", "a grown-up"),
  elder: pic("🧓", "an older person"),

  acorn: pic("🌰", "an acorn"),
  oak: pic("🌳", "a big oak tree"),

  blossom: pic("🌸", "apple blossom"),
  greenApple: pic("🍏", "a little green apple"),
  redApple: pic("🍎", "a ripe red apple"),

  tomato: pic("🍅", "a tomato"),
} as const;

type StageKey = keyof typeof STAGES;

export const LIFE_CYCLE_TILES: readonly Sym[] = Object.values(STAGES);

/* ------------------------------------------------------------------- runs */

/** One growing-up, written down in the order it happens. */
interface Run {
  /**
   * Which living thing this is the growing-up of.
   *
   * The concept, and deliberately not the run: the three-card chick and the
   * four-card chick are one thing to know at two grains, so they share this
   * and `conceptKey` collapses them.
   */
  cycle: string;
  steps: readonly StageKey[];
  level: 1 | 2 | 3;
}

const RUNS: readonly Run[] = [
  /* Level 1 — three cards, and every one of them something a child has
     actually watched: a chick on a farm visit, a bean on the windowsill, and
     the people in their own house. */
  { cycle: "chicken", steps: ["egg", "hatching", "hen"], level: 1 },
  { cycle: "plant", steps: ["seed", "shoot", "leafy"], level: 1 },
  { cycle: "person", steps: ["baby", "child", "grownUp"], level: 1 },

  /* Level 2 — still three cards, but nobody has ever watched an acorn become
     an oak. These have to be worked out from what the pictures are, which is
     a different job from remembering. */
  { cycle: "oak", steps: ["acorn", "shoot", "oak"], level: 2 },
  { cycle: "apple", steps: ["blossom", "greenApple", "redApple"], level: 2 },
  { cycle: "tomato", steps: ["shoot", "flower", "tomato"], level: 2 },

  /* Level 3 — the level-one cycles with the missing middle put back. A fourth
     card is not simply one more thing to place: it is a stage the child has to
     decide belongs *between* two they already know. */
  { cycle: "chicken", steps: ["egg", "hatching", "chick", "hen"], level: 3 },
  { cycle: "plant", steps: ["seed", "shoot", "leafy", "flower"], level: 3 },
  { cycle: "person", steps: ["baby", "child", "grownUp", "elder"], level: 3 },
];

/**
 * The honest content count of this objective: six living things and the order
 * they grow in. Not nine, and not the boards — the four-card chick is the
 * three-card chick looked at more closely, which is why both carry the same
 * concept tag and a session that has just dealt one will not deal the other.
 */
export const LIFE_CYCLES: readonly string[] = [
  ...new Set(RUNS.map((run) => run.cycle)),
];

function poolAtLevel(level: Level): readonly Run[] {
  const wanted = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return RUNS.filter((run) => run.level === wanted);
}

/**
 * The fewest cards that may still be sitting where the child found them.
 *
 * The same rule `math.number-order` and `general-knowledge.day-order` use: a
 * tray that is mostly already sorted is a board finished by moving one card.
 */
function displacedAtLevel(level: Level, count: number): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return count;
}

/** The tray. Shuffled until enough has moved, then rotated as a fallback. */
function trayOrder(
  steps: readonly StageKey[],
  rng: Rng,
  displaced: number,
): StageKey[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(steps);
    const moved = shuffled.filter((step, index) => step !== steps[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...steps.slice(1), steps[0]];
}

export const lifeCycles = defineGeneratedActivity({
  id: "life-cycles",
  packId: "general-knowledge",
  title: "How Things Grow",
  category: "general-knowledge",
  activityType: "life-cycles",
  kind: "order",
  ageRange: { min: 4, max: 7 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const run = pool[rng.int(0, pool.length - 1)];
    const { steps } = run;

    const items: OrderItem[] = trayOrder(
      steps,
      rng,
      displacedAtLevel(level, steps.length),
    ).map((step) => ({ id: step, item: STAGES[step].item }));

    const first = STAGES[steps[0]].key;
    const last = STAGES[steps[steps.length - 1]].key;

    return {
      level,
      prompt: {
        speech: "Can you put these in order, starting with the very beginning?",
      },
      payload: { kind: "order", items, answerOrder: [...steps] },
      explanation: `That is how it grows! It starts as ${first} and grows into ${last}.`,
      hint: "Find the smallest one, and put that one down to start with.",
      meta: {
        objective: "puts the stages of a living thing's life in order",
        tags: ["family:living thing", `concept:life-cycle:${run.cycle}`],
      },
    };
  },
});

export const LIFE_CYCLE_ACTIVITIES = [lifeCycles];
