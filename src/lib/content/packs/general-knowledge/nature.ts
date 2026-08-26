import {
  capitalise,
  defineQuizActivity,
  except,
  pic,
  type Question,
  type Sym,
} from "./shared";

/**
 * Plants, and the two big sorting ideas a child meets alongside them: alive
 * or not, and grown or built.
 *
 * These last two are the only activities in the pack whose boards are
 * deliberately mixed — a living thing next to a thing that never lived is the
 * question, so a board of all animals would have nothing to ask. They still
 * declare a family (`living or not`, `natural or made`), and the tiles still
 * come from a named pool, so a test can check that a board of "which one is
 * alive?" holds exactly one living thing and nothing borrowed from a
 * different question.
 */

/* ---------------------------------------------------------------- plants */

const PLANTS = {
  flower: pic("🌸", "a flower"),
  tree: pic("🌳", "a tree"),
  leaf: pic("🍃", "a leaf"),
  grass: pic("🌿", "grass"),
  mushroom: pic("🍄", "a mushroom"),
  cactus: pic("🌵", "a cactus"),
  sunflower: pic("🌻", "a sunflower"),
  pot: pic("🪴", "a plant in a pot"),
  seed: pic("🌰", "a seed"),
} as const;

type PlantKey = keyof typeof PLANTS;

export const PLANT_TILES: readonly Sym[] = Object.values(PLANTS);

/**
 * `avoid` keeps a second right answer off a naming board. A sunflower is a
 * flower, so it never stands beside one. The leaf and the grass bar each
 * other for a plainer reason: the grass glyph is drawn as a sprig of green
 * leaves, so either one dealt beside the other gives the board two tiles
 * that look like the same answer.
 */
const PLANT_NAMES: readonly {
  key: PlantKey;
  level: 1 | 2 | 3;
  avoid?: readonly PlantKey[];
}[] = [
  { key: "flower", level: 1, avoid: ["sunflower"] },
  { key: "tree", level: 1 },
  { key: "grass", level: 1, avoid: ["leaf"] },
  { key: "leaf", level: 2, avoid: ["grass"] },
  { key: "seed", level: 2 },
  { key: "mushroom", level: 2 },
  { key: "sunflower", level: 3 },
  { key: "cactus", level: 3 },
];

const DRINKS: readonly Sym[] = [
  pic("💧", "water"),
  pic("🥛", "milk"),
  pic("🧃", "juice"),
  pic("🍵", "tea"),
];

const SKY: readonly Sym[] = [
  pic("☀️", "the sun"),
  pic("🌙", "the moon"),
  pic("☁️", "a cloud"),
  pic("⭐", "a star"),
];

const PLANT_FACTS: readonly Question[] = [
  {
    level: 2,
    ask: "Plants get thirsty too. What do plants drink?",
    answer: DRINKS[0],
    distractors: DRINKS.slice(1),
    because: "Plants drink water through their roots.",
    hint: "It is the same thing you drink when you are really thirsty.",
    idea: "plants-drink-water",
    family: "drink",
  },
  {
    level: 2,
    ask: "Plants need light to grow. Which one gives them their light?",
    answer: SKY[0],
    distractors: SKY.slice(1),
    because: "The sun gives plants the light they need to grow.",
    hint: "It is the bright one that comes out in the daytime.",
    idea: "plants-need-sun",
    family: "sky",
  },
  {
    level: 2,
    ask: "Where do apples grow?",
    answer: PLANTS.tree,
    distractors: [PLANTS.grass, PLANTS.cactus, PLANTS.mushroom, PLANTS.flower],
    because: "Apples grow high up on a tree.",
    hint: "You would need to reach up high to pick one.",
    idea: "apples-grow-on-trees",
    family: "plant",
  },
  {
    level: 3,
    ask: "Which one is tiny now, but grows into a big tree?",
    answer: PLANTS.seed,
    distractors: [PLANTS.leaf, PLANTS.flower, PLANTS.grass, PLANTS.mushroom],
    because: "A tiny seed grows all the way into a tree.",
    hint: "It is the smallest thing here, and it goes in the soil.",
    idea: "seeds-grow",
    family: "plant",
  },
];

export const plants = defineQuizActivity({
  id: "plants",
  activityType: "plants",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  questions: [
    ...PLANT_NAMES.map(({ key, level, avoid }): Question => {
      const answer = PLANTS[key];
      const barred = (avoid ?? []).map((other) => PLANTS[other]);
      return {
        level,
        ask: `Which one is ${answer.key}?`,
        answer,
        distractors: except(PLANT_TILES, answer, ...barred),
        because: `Yes — that is ${answer.key}.`,
        hint: "Look closely at each one before you choose.",
        idea: `plant:${key}`,
        family: "plant",
      };
    }),
    ...PLANT_FACTS,
  ],
});

/* ------------------------------------------------------- alive, or not */

const LIVING: readonly Sym[] = [
  pic("🐱", "a cat"),
  pic("🐶", "a dog"),
  pic("🐦", "a bird"),
  pic("🐟", "a fish"),
  pic("🐰", "a rabbit"),
  pic("🦋", "a butterfly"),
  pic("🌳", "a tree"),
  pic("🌸", "a flower"),
];

const NOT_LIVING: readonly Sym[] = [
  pic("🪑", "a chair"),
  pic("⚽", "a ball"),
  pic("📖", "a book"),
  pic("☕", "a cup"),
  pic("🚗", "a car"),
  pic("🥄", "a spoon"),
  pic("🪨", "a rock"),
  pic("🔑", "a key"),
];

const find = (pool: readonly Sym[], name: string) =>
  pool.find((symbol) => symbol.key === name) as Sym;

const ALIVE_ANSWERS = ["a cat", "a dog", "a bird", "a fish", "a rabbit", "a butterfly", "a tree", "a flower"];
const NOT_ALIVE_ANSWERS = ["a chair", "a rock", "a ball", "a car"];

export const livingThings = defineQuizActivity({
  id: "living-things",
  activityType: "living-things",
  ageRange: { min: 4, max: 6 },
  host: "foxy",
  questions: [
    ...ALIVE_ANSWERS.map((name, index): Question => ({
      level: index < 4 ? 1 : 2,
      ask: "Which one is alive?",
      answer: find(LIVING, name),
      distractors: NOT_LIVING,
      because: `${capitalise(name)} is alive — it grows, and it needs looking after.`,
      hint: "Living things grow. Which one of these could get bigger?",
      idea: `alive:${name}`,
      family: "living or not",
    })),
    ...NOT_ALIVE_ANSWERS.map((name): Question => ({
      level: 3,
      ask: "Which one is not alive?",
      answer: find(NOT_LIVING, name),
      distractors: LIVING,
      because: `${capitalise(name)} is not alive. It does not grow, eat or drink.`,
      hint: "The others all grow. One never will.",
      idea: `not-alive:${name}`,
      family: "living or not",
    })),
    {
      level: 2,
      ask: "Which one needs food and water every single day?",
      answer: find(LIVING, "a dog"),
      distractors: NOT_LIVING,
      because: "A dog is alive, so it needs food and water every day.",
      hint: "Only living things get hungry.",
      idea: "living-need-food",
      family: "living or not",
    },
    {
      level: 3,
      ask: "Which one starts small and grows bigger and bigger?",
      answer: find(LIVING, "a tree"),
      distractors: NOT_LIVING,
      because: "A tree grows taller every year. Things that are not alive stay the same.",
      hint: "Think about which one was once much smaller than it is now.",
      idea: "living-grow",
      family: "living or not",
    },
  ],
});

/* -------------------------------------------------- grown, or built */

const NATURAL: readonly Sym[] = [
  pic("🏔️", "a mountain"),
  pic("🌳", "a tree"),
  pic("☁️", "a cloud"),
  pic("🪨", "a rock"),
  pic("🌸", "a flower"),
  pic("🌊", "the sea"),
];

const MADE: readonly Sym[] = [
  pic("🚗", "a car"),
  pic("🏠", "a house"),
  pic("🚲", "a bicycle"),
  pic("📖", "a book"),
  pic("✈️", "an aeroplane"),
  pic("🪑", "a chair"),
];

export const naturalOrMade = defineQuizActivity({
  id: "natural-or-made",
  activityType: "natural-or-made",
  ageRange: { min: 4, max: 6 },
  host: "wally",
  questions: [
    ...MADE.map((answer, index): Question => ({
      level: index < 3 ? 1 : 2,
      ask: "Which one did people make?",
      answer,
      distractors: NATURAL,
      because: `People made ${answer.key}. It did not grow on its own.`,
      hint: "The others were already here. One was built by somebody.",
      idea: `made:${answer.key}`,
      family: "natural or made",
    })),
    ...NATURAL.map((answer, index): Question => ({
      level: index < 3 ? 2 : 3,
      ask: "Which one was not made by people?",
      answer,
      distractors: MADE,
      because: `Nobody built ${answer.key}. It is part of nature.`,
      hint: "Which one would still be here if nobody had ever built anything?",
      idea: `natural:${answer.key}`,
      family: "natural or made",
    })),
  ],
});

export const NATURE_ACTIVITIES = [plants, livingThings, naturalOrMade];
