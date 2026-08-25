import { illustratedAtLevel, type ArtId } from "@/lib/content/art";
import { defineQuizActivity, drawn, except, pic, type Question, type Sym } from "./shared";

/**
 * The shape of the world outside, and how to stay safe in it.
 *
 * Land and water is recognition first — a child has to know the word
 * "mountain" before "which one is made of water?" means anything — and then
 * one property question per place, so the same six pictures carry twelve
 * different things to know.
 *
 * The safety half is written to a rule: **every question has a safe answer
 * and no frightening picture.** It teaches what to do, never what goes wrong.
 * Nothing here shows an accident, and no question asks a child to imagine
 * being hurt.
 */

/* --------------------------------------------------------- land and water */

const LAND = {
  sea: pic("🌊", "the sea"),
  mountain: pic("🏔️", "a mountain"),
  beach: pic("🏖️", "a beach"),
  island: pic("🏝️", "an island"),
  desert: pic("🏜️", "a desert"),
  forest: pic("🌲", "a forest"),
  volcano: pic("🌋", "a volcano"),
} as const;

type LandKey = keyof typeof LAND;

/**
 * The same seven places, drawn.
 *
 * All seven or none, and that is the whole reason the library grew: a board
 * here offers four of the seven at once, and two drawings among four glyphs is
 * a pattern a child can answer from without reading the question. `habitats.ts`
 * had the sea, the forest and the desert already; the mountain, the beach, the
 * island and the volcano were drawn so that this table could exist.
 */
const LAND_ART: Readonly<Record<LandKey, ArtId>> = {
  sea: "place.sea",
  mountain: "place.mountain",
  beach: "place.beach",
  island: "place.island",
  desert: "place.desert",
  forest: "place.forest",
  volcano: "place.volcano",
};

const DRAWN_LAND = Object.fromEntries(
  (Object.keys(LAND) as LandKey[]).map((key) => [
    key,
    { key: LAND[key].key, item: drawn(LAND[key], LAND_ART[key]) },
  ]),
) as Record<LandKey, Sym>;

/**
 * Which set of tiles a level is dealt from.
 *
 * The scaffold, and the same one every other illustrated activity uses: the
 * pictures belong to the entry level and leave as the board gets harder, so a
 * child who has learnt the places by their drawings has to name them by their
 * words at level two. Nothing else about the board changes — same keys, same
 * labels, same glyphs underneath.
 */
const tilesAt = (level: 1 | 2 | 3): Record<LandKey, Sym> =>
  illustratedAtLevel(level) ? DRAWN_LAND : LAND;

/**
 * Naming boards get the same `avoid` the property boards have, because a
 * name can hide inside another picture: a volcano *is* a mountain, and the
 * beach and island glyphs both prominently show the sea. A child who points
 * at the water in either must never be marked wrong.
 */
const NAMES: readonly {
  key: LandKey;
  level: 1 | 2 | 3;
  avoid?: readonly LandKey[];
}[] = [
  { key: "sea", level: 1, avoid: ["beach", "island"] },
  { key: "mountain", level: 1, avoid: ["volcano"] },
  { key: "beach", level: 2 },
  { key: "forest", level: 2 },
  { key: "desert", level: 3 },
  { key: "island", level: 3 },
];

const PROPERTIES: readonly {
  key: LandKey;
  ask: string;
  because: string;
  hint: string;
  idea: string;
  avoid?: readonly LandKey[];
  level: 1 | 2 | 3;
}[] = [
  { key: "sea", ask: "Which one is made of water?", because: "The sea is water as far as you can see.", hint: "Only one of these would make you wet.", idea: "land:sea-is-water", avoid: ["beach", "island"], level: 1 },
  { key: "beach", ask: "Where would you go to build a sandcastle?", because: "A beach is soft sand right beside the sea.", hint: "You would need sand and a bucket.", idea: "land:beach-sandcastle", avoid: ["desert"], level: 2 },
  { key: "forest", ask: "Which one is full of trees?", because: "A forest is packed with trees, all growing together.", hint: "Look for the green one.", idea: "land:forest-trees", level: 2 },
  { key: "mountain", ask: "Which one is so high that there is snow on the top?", because: "A mountain is so tall that snow sits on its peak.", hint: "It is the tallest thing here.", idea: "land:mountain-tall", level: 2 },
  { key: "desert", ask: "Which one is hot and sandy, where it hardly ever rains?", because: "A desert is dry and sandy, with almost no rain at all.", hint: "A camel would feel at home there.", idea: "land:desert-dry", avoid: ["beach"], level: 3 },
  { key: "island", ask: "Which one is land with water all the way around it?", because: "An island has sea on every side.", hint: "You would need a boat to get there.", idea: "land:island-surrounded", level: 3 },
];

export const landAndWater = defineQuizActivity({
  id: "land-and-water",
  title: "Land and Water",
  activityType: "land-and-water",
  ageRange: { min: 4, max: 6 },
  host: "wally",
  questions: [
    ...NAMES.map(({ key, level, avoid }): Question => {
      const tiles = tilesAt(level);
      const answer = tiles[key];
      const barred = (avoid ?? []).map((other) => tiles[other]);
      return {
        level,
        ask: `Which one is ${answer.key}?`,
        answer,
        distractors: except(Object.values(tiles), answer, ...barred),
        because: `That is ${answer.key}.`,
        hint: "Look at what each place is made of.",
        idea: `land:${key}`,
        family: "place in nature",
      };
    }),
    ...PROPERTIES.map((fact): Question => {
      const tiles = tilesAt(fact.level);
      const answer = tiles[fact.key];
      const barred = new Set<string>([
        answer.key,
        ...(fact.avoid ?? []).map((key) => tiles[key].key),
      ]);
      return {
        level: fact.level,
        ask: fact.ask,
        answer,
        distractors: Object.values(tiles).filter((tile) => !barred.has(tile.key)),
        because: fact.because,
        hint: fact.hint,
        idea: fact.idea,
        family: "place in nature",
      };
    }),
  ],
});

/* ----------------------------------------------------------------- safety */

const SAFE = {
  helmet: pic("⛑️", "a helmet"),
  teddy: pic("🧸", "a teddy"),
  ball: pic("⚽", "a ball"),
  crayon: pic("🖍️", "a crayon"),
  apple: pic("🍎", "an apple"),
  bread: pic("🍞", "bread"),
  carrot: pic("🥕", "a carrot"),
  spoon: pic("🥄", "a spoon"),
  balloon: pic("🎈", "a balloon"),
} as const;

const CAREFUL = {
  fire: pic("🔥", "a fire"),
  knife: pic("🔪", "a knife"),
  plug: pic("🔌", "a plug socket"),
  medicine: pic("💊", "medicine"),
} as const;

const SIGNS = {
  stop: pic("🛑", "a stop sign"),
  warning: pic("⚠️", "a warning sign"),
  crossing: pic("🚸", "a children crossing sign"),
  noEntry: pic("⛔", "a no entry sign"),
  /* Only ever a distractor, and never on the stop-sign board: a no entry
     sign also tells a driver not to go, so it sits beside the stop sign
     nowhere. The recycling sign carries no stop meaning at all. */
  recycling: pic("♻️", "a recycling sign"),
} as const;

const HATS = {
  helmet: SAFE.helmet,
  cap: pic("🧢", "a cap"),
  scarf: pic("🧣", "a scarf"),
  glasses: pic("👓", "glasses"),
} as const;

export const safety = defineQuizActivity({
  id: "safety",
  title: "Staying Safe",
  activityType: "safety",
  ageRange: { min: 4, max: 6 },
  host: "kiddo",
  questions: [
    {
      level: 1,
      ask: "What should you wear on your head when you ride your bike?",
      answer: HATS.helmet,
      distractors: [HATS.cap, HATS.scarf, HATS.glasses],
      because: "A helmet keeps your head safe on a bike.",
      hint: "It is the hard one.",
      idea: "safety:bike-helmet",
      family: "thing you wear",
    },
    {
      level: 1,
      ask: "Which one is safe for a child to play with?",
      answer: SAFE.teddy,
      distractors: [CAREFUL.fire, CAREFUL.knife, CAREFUL.plug],
      because: "A teddy is soft and safe. The other three are only for grown-ups.",
      hint: "Look for the soft, cuddly one.",
      idea: "safety:safe-toy",
      family: "safe or for grown-ups",
    },
    {
      level: 2,
      ask: "Which one should you never, ever play with?",
      answer: CAREFUL.fire,
      distractors: [SAFE.teddy, SAFE.ball, SAFE.crayon],
      because: "Fire is very hot and dangerous. Always tell a grown-up if you see one.",
      hint: "It is the hot one.",
      idea: "safety:never-fire",
      family: "safe or for grown-ups",
    },
    {
      level: 2,
      ask: "Which one is too sharp for children to pick up?",
      answer: CAREFUL.knife,
      distractors: [SAFE.spoon, SAFE.crayon, SAFE.teddy],
      because: "A knife is sharp. Ask a grown-up to cut things for you.",
      hint: "The others are soft or blunt. One is not.",
      idea: "safety:sharp-knife",
      family: "safe or for grown-ups",
    },
    {
      level: 2,
      ask: "Which one should you never poke your fingers into?",
      answer: CAREFUL.plug,
      distractors: [SAFE.teddy, SAFE.ball, SAFE.balloon],
      because: "A plug socket has electricity inside. Never touch one.",
      hint: "It is the one on the wall.",
      idea: "safety:plug-socket",
      family: "safe or for grown-ups",
    },
    {
      level: 3,
      ask: "Which one should you only ever take if a grown-up gives it to you?",
      answer: CAREFUL.medicine,
      distractors: [SAFE.apple, SAFE.bread, SAFE.carrot],
      because: "Medicine helps you when you are poorly, but only a grown-up can give it to you.",
      hint: "The others are food. One is not.",
      idea: "safety:medicine",
      family: "safe or for grown-ups",
    },
    {
      level: 2,
      ask: "Which sign tells the cars to stop?",
      answer: SIGNS.stop,
      distractors: [SIGNS.warning, SIGNS.crossing, SIGNS.recycling],
      because: "A stop sign tells drivers to stop.",
      hint: "It is red, with a word written right across it.",
      idea: "safety:stop-sign",
      family: "sign",
    },
    {
      level: 3,
      ask: "Which sign is warning you to be careful?",
      answer: SIGNS.warning,
      distractors: [SIGNS.stop, SIGNS.crossing, SIGNS.noEntry],
      because: "A warning sign tells you to look out and take care.",
      hint: "It is the yellow one with a big black mark in the middle.",
      idea: "safety:warning-sign",
      family: "sign",
    },
    {
      level: 3,
      ask: "Which sign shows drivers that children cross the road here?",
      answer: SIGNS.crossing,
      distractors: [SIGNS.stop, SIGNS.warning, SIGNS.noEntry],
      because: "This sign tells drivers to slow down, because children cross here.",
      hint: "Look for the sign with people on it.",
      idea: "safety:crossing-sign",
      family: "sign",
    },
  ],
});

export const WORLD_ACTIVITIES = [landAndWater, safety];
