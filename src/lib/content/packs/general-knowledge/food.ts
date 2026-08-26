import { defineQuizActivity, except, pic, type Question, type Sym } from "./shared";

/**
 * Food: what it is called, and where it comes from before it reaches a plate.
 *
 * Every sorting question here was written against the *kitchen* meaning of
 * the words, not the botanist's. A tomato is on no board that asks for a
 * fruit or a vegetable, because both answers are defensible and a child who
 * is told they are wrong when they are right learns the wrong lesson. The
 * same care keeps cheese away from "which food comes from a cow?" and carrots
 * away from "which one grows under the ground?".
 */

const FRUIT = {
  apple: pic("🍎", "an apple"),
  banana: pic("🍌", "a banana"),
  orange: pic("🍊", "an orange"),
  strawberry: pic("🍓", "a strawberry"),
  grapes: pic("🍇", "grapes"),
  watermelon: pic("🍉", "a watermelon"),
  pear: pic("🍐", "a pear"),
  lemon: pic("🍋", "a lemon"),
} as const;

const VEG = {
  carrot: pic("🥕", "a carrot"),
  broccoli: pic("🥦", "broccoli"),
  corn: pic("🌽", "corn"),
  potato: pic("🥔", "a potato"),
  cucumber: pic("🥒", "a cucumber"),
  onion: pic("🧅", "an onion"),
} as const;

const OTHER = {
  bread: pic("🍞", "bread"),
  cheese: pic("🧀", "cheese"),
  egg: pic("🥚", "an egg"),
  milk: pic("🥛", "milk"),
  rice: pic("🍚", "rice"),
  honey: pic("🍯", "honey"),
  cake: pic("🍰", "cake"),
  wheat: pic("🌾", "wheat"),
  /** Named but never sorted: it is a fruit to a botanist and a vegetable to a cook. */
  tomato: pic("🍅", "a tomato"),
} as const;

const FRUIT_TILES: readonly Sym[] = Object.values(FRUIT);
const VEG_TILES: readonly Sym[] = Object.values(VEG);

/** Everything edible in the pack, for boards that just need other food. */
export const FOOD_TILES: readonly Sym[] = [
  ...FRUIT_TILES,
  ...VEG_TILES,
  ...Object.values(OTHER),
];

/* ------------------------------------------------------------------ names */

/**
 * `called` is for the handful of foods whose tile label is plural. The tile
 * is right to say "grapes" — that is what the picture is — but the question
 * has to say "a bunch of grapes", or KIDDO asks "which one is grapes?".
 */
const NAMES: readonly { tile: Sym; level: 1 | 2 | 3; called?: string }[] = [
  { tile: FRUIT.apple, level: 1 },
  { tile: FRUIT.banana, level: 1 },
  { tile: FRUIT.orange, level: 1 },
  { tile: VEG.carrot, level: 1 },
  { tile: OTHER.bread, level: 1 },
  { tile: OTHER.milk, level: 1 },
  { tile: OTHER.egg, level: 1 },
  { tile: FRUIT.strawberry, level: 2 },
  { tile: FRUIT.grapes, level: 2, called: "a bunch of grapes" },
  { tile: FRUIT.watermelon, level: 2 },
  { tile: VEG.corn, level: 2 },
  { tile: VEG.potato, level: 2 },
  { tile: OTHER.cheese, level: 2 },
  { tile: OTHER.rice, level: 2 },
  { tile: FRUIT.pear, level: 3 },
  { tile: FRUIT.lemon, level: 3 },
  { tile: VEG.broccoli, level: 3 },
  { tile: VEG.cucumber, level: 3 },
  { tile: VEG.onion, level: 3 },
  { tile: OTHER.tomato, level: 3 },
];

export const foodNames = defineQuizActivity({
  id: "food-names",
  activityType: "food-knowledge",
  ageRange: { min: 3, max: 6 },
  host: "pip",
  questions: NAMES.map(({ tile, level, called }): Question => ({
    level,
    ask: `Which one is ${called ?? tile.key}?`,
    answer: tile,
    distractors: except(FOOD_TILES, tile, OTHER.wheat),
    because: `That is ${called ?? tile.key}.`,
    hint: "Picture it on your plate, then look for it here.",
    idea: `food:${tile.key}`,
    family: "food",
  })),
});

/* ---------------------------------------------------------- where it comes from */

const SORTING: readonly Question[] = [
  {
    level: 1,
    ask: "Which one is a fruit?",
    answer: FRUIT.apple,
    distractors: VEG_TILES,
    because: "An apple is a fruit. Fruit is sweet and grows from a flower.",
    hint: "Fruit is the sweet one you might have as a pudding.",
    idea: "fruit:apple",
    family: "food",
  },
  {
    level: 2,
    ask: "Which one is a fruit?",
    answer: FRUIT.banana,
    distractors: VEG_TILES,
    because: "A banana is a fruit, with a yellow skin you peel.",
    hint: "Fruit is the sweet one you might have as a pudding.",
    idea: "fruit:banana",
    family: "food",
  },
  {
    level: 3,
    ask: "Which one is a fruit?",
    answer: FRUIT.watermelon,
    distractors: VEG_TILES,
    because: "A watermelon is a very big, very juicy fruit.",
    hint: "Fruit is the sweet one you might have as a pudding.",
    idea: "fruit:watermelon",
    family: "food",
  },
  {
    level: 1,
    ask: "Which one is a vegetable?",
    answer: VEG.carrot,
    distractors: FRUIT_TILES,
    because: "A carrot is a vegetable. It grows in the soil.",
    hint: "Vegetables usually turn up at dinner, not pudding.",
    idea: "veg:carrot",
    family: "food",
  },
  {
    level: 2,
    ask: "Which one is a vegetable?",
    answer: VEG.broccoli,
    distractors: FRUIT_TILES,
    because: "Broccoli is a green vegetable that looks like a tiny tree.",
    hint: "Vegetables usually turn up at dinner, not pudding.",
    idea: "veg:broccoli",
    family: "food",
  },
  {
    level: 3,
    ask: "Which one is a vegetable?",
    answer: VEG.potato,
    distractors: FRUIT_TILES,
    because: "A potato is a vegetable that grows under the ground.",
    hint: "Vegetables usually turn up at dinner, not pudding.",
    idea: "veg:potato",
    family: "food",
  },
  {
    level: 2,
    ask: "Which food comes from a cow?",
    answer: OTHER.milk,
    distractors: [OTHER.bread, OTHER.honey, OTHER.rice, FRUIT.apple],
    because: "Cows give us milk.",
    hint: "It is white, and you might drink it.",
    idea: "from:cow",
    family: "food",
  },
  {
    level: 2,
    ask: "Which food comes from a chicken?",
    answer: OTHER.egg,
    distractors: [OTHER.bread, OTHER.honey, OTHER.rice, OTHER.cheese],
    because: "Chickens lay eggs.",
    hint: "It has a shell you have to crack.",
    idea: "from:chicken",
    family: "food",
  },
  {
    level: 2,
    ask: "Which food do busy bees make?",
    answer: OTHER.honey,
    distractors: [OTHER.bread, OTHER.milk, OTHER.rice, OTHER.egg],
    because: "Bees make sweet, sticky honey.",
    hint: "It is golden and very sticky.",
    idea: "from:bees",
    family: "food",
  },
  {
    level: 3,
    ask: "Which one grows under the ground?",
    answer: VEG.potato,
    distractors: [FRUIT.apple, VEG.corn, FRUIT.strawberry, VEG.broccoli],
    because: "Potatoes grow hidden under the soil.",
    hint: "You would have to dig this one up.",
    idea: "grows:underground",
    family: "food",
  },
  {
    level: 3,
    ask: "Which one grows high up on a tree?",
    answer: FRUIT.apple,
    distractors: [VEG.carrot, VEG.potato, VEG.broccoli, VEG.onion],
    because: "Apples grow on apple trees, and we pick them from the branches.",
    hint: "You would need to reach up, not dig down.",
    idea: "grows:on-a-tree",
    family: "food",
  },
  {
    level: 3,
    ask: "Bread is made from a plant. Which plant is it?",
    answer: OTHER.wheat,
    distractors: [VEG.carrot, VEG.onion, FRUIT.lemon, VEG.cucumber],
    because: "Bread is made from wheat, ground up into flour.",
    hint: "It is the tall golden grass that grows in big fields.",
    idea: "bread-from-wheat",
    family: "food",
  },
];

export const foodOrigins = defineQuizActivity({
  id: "food-origins",
  activityType: "food-knowledge",
  ageRange: { min: 4, max: 6 },
  host: "foxy",
  questions: SORTING,
});

export const FOOD_ACTIVITIES = [foodNames, foodOrigins];
