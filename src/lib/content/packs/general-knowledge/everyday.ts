import { defineQuizActivity, except, pic, type Question, type Sym } from "./shared";

/**
 * The things in a child's own house, and the things they put on to go out.
 *
 * Two halves, and the split between them matters more than it looks. Naming
 * ("which one is a broom?") is vocabulary; using ("what do you sweep the
 * floor with?") is knowledge. The same twenty pictures serve both, and the
 * second half is where a child stops labelling the world and starts
 * explaining it — which is the whole reason this quest exists.
 *
 * Every "what do you use to…" question was checked for a second right answer
 * and reworded until it had none. A coat also keeps you dry in the rain, so
 * the rain question lives in the object half where no coat can reach it.
 */

/* ---------------------------------------------------------------- objects */

const OBJECTS = {
  chair: pic("🪑", "a chair"),
  bed: pic("🛏️", "a bed"),
  door: pic("🚪", "a door"),
  window: pic("🪟", "a window"),
  book: pic("📖", "a book"),
  clock: pic("⏰", "a clock"),
  key: pic("🔑", "a key"),
  spoon: pic("🥄", "a spoon"),
  cup: pic("☕", "a cup"),
  toothbrush: pic("🪥", "a toothbrush"),
  soap: pic("🧼", "soap"),
  broom: pic("🧹", "a broom"),
  scissors: pic("✂️", "scissors"),
  pencil: pic("✏️", "a pencil"),
  umbrella: pic("☂️", "an umbrella"),
  mirror: pic("🪞", "a mirror"),
  candle: pic("🕯️", "a candle"),
  bucket: pic("🪣", "a bucket"),
  hammer: pic("🔨", "a hammer"),
  bath: pic("🛁", "a bath"),
} as const;

type ObjectKey = keyof typeof OBJECTS;

/** The pool, for boards elsewhere that need something that is plainly a thing. */
export const OBJECT_TILES: readonly Sym[] = Object.values(OBJECTS);

const NAMING: readonly {
  key: ObjectKey;
  level: 1 | 2 | 3;
  /** For the labels that will not sit behind "which one is…" unchanged. */
  called?: string;
}[] = [
  { key: "chair", level: 1 },
  { key: "bed", level: 1 },
  { key: "door", level: 1 },
  { key: "book", level: 1 },
  { key: "spoon", level: 1 },
  { key: "cup", level: 1 },
  { key: "key", level: 2 },
  { key: "clock", level: 2 },
  { key: "toothbrush", level: 2 },
  { key: "soap", level: 2 },
  { key: "umbrella", level: 2 },
  { key: "pencil", level: 2 },
  { key: "window", level: 2 },
  { key: "broom", level: 3 },
  { key: "scissors", level: 3, called: "a pair of scissors" },
  { key: "mirror", level: 3 },
  { key: "candle", level: 3 },
  { key: "bucket", level: 3 },
  { key: "hammer", level: 3 },
  { key: "bath", level: 3 },
];

export const objectNames = defineQuizActivity({
  id: "object-names",
  activityType: "everyday-objects",
  ageRange: { min: 3, max: 6 },
  host: "wally",
  questions: NAMING.map(({ key, level, called }): Question => {
    const answer = OBJECTS[key];
    return {
      level,
      ask: `Which one is ${called ?? answer.key}?`,
      answer,
      distractors: except(OBJECT_TILES, answer),
      because: `That's right — ${answer.key}.`,
      hint: "Take your time and look at every picture once.",
      idea: `object:${key}`,
      family: "object",
    };
  }),
});

/* ------------------------------------------------------------------- uses */

/**
 * `avoid` keeps a second right answer off the board, in the same spirit as
 * the coat note above: a cup also carries water, so it never sits beside the
 * bucket question.
 */
const USES: readonly {
  key: ObjectKey;
  ask: string;
  because: string;
  level: 1 | 2 | 3;
  avoid?: readonly ObjectKey[];
}[] = [
  { key: "bed", ask: "What do you sleep in?", because: "You sleep in a cosy bed.", level: 1 },
  { key: "spoon", ask: "What do you eat soup with?", because: "A spoon scoops the soup up.", level: 1 },
  { key: "toothbrush", ask: "What do you clean your teeth with?", because: "A toothbrush keeps your teeth shiny.", level: 1 },
  { key: "book", ask: "What do you read a story from?", because: "Stories live inside a book.", level: 1 },
  { key: "soap", ask: "What do you wash your hands with?", because: "Soap washes the germs away.", level: 2 },
  { key: "key", ask: "What do you unlock a door with?", because: "A key opens the lock.", level: 2 },
  { key: "umbrella", ask: "What keeps you dry when it rains?", because: "An umbrella holds the rain off you.", level: 2 },
  { key: "clock", ask: "What tells you what time it is?", because: "A clock shows the time.", level: 2 },
  { key: "pencil", ask: "What do you draw a picture with?", because: "A pencil makes the lines.", level: 2 },
  { key: "bath", ask: "What do you sit in to get clean?", because: "A warm bath gets you clean all over.", level: 2 },
  { key: "broom", ask: "What do you sweep the floor with?", because: "A broom sweeps the dust away.", level: 3 },
  { key: "scissors", ask: "What do you cut paper with?", because: "Scissors snip the paper.", level: 3 },
  { key: "mirror", ask: "What do you look in to see your own face?", because: "A mirror shows you back to you.", level: 3 },
  { key: "hammer", ask: "What do you knock a nail in with?", because: "A hammer taps the nail in.", level: 3 },
  { key: "bucket", ask: "What do you carry water in?", because: "A bucket holds the water.", level: 3, avoid: ["cup"] },
  { key: "candle", ask: "What do you blow out on a birthday cake?", because: "You blow out the candle and make a wish.", level: 3 },
];

export const objectUses = defineQuizActivity({
  id: "object-uses",
  activityType: "everyday-objects",
  ageRange: { min: 4, max: 6 },
  host: "wally",
  questions: USES.map(({ key, ask, because, level, avoid }): Question => {
    const answer = OBJECTS[key];
    const barred = (avoid ?? []).map((other) => OBJECTS[other]);
    return {
      level,
      ask,
      answer,
      distractors: except(OBJECT_TILES, answer, ...barred),
      because,
      hint: "Picture yourself doing it. Which one are you using?",
      idea: `use:${key}`,
      family: "object",
    };
  }),
});

/* --------------------------------------------------------------- clothing */

const CLOTHES = {
  hat: pic("🧢", "a hat"),
  shoes: pic("👟", "shoes"),
  socks: pic("🧦", "socks"),
  shirt: pic("👕", "a shirt"),
  trousers: pic("👖", "trousers"),
  coat: pic("🧥", "a coat"),
  dress: pic("👗", "a dress"),
  gloves: pic("🧤", "gloves"),
  scarf: pic("🧣", "a scarf"),
  boots: pic("🥾", "boots"),
  glasses: pic("👓", "glasses"),
  swimsuit: pic("🩱", "a swimsuit"),
} as const;

type ClothesKey = keyof typeof CLOTHES;

export const CLOTHES_TILES: readonly Sym[] = Object.values(CLOTHES);

const WEARING: readonly {
  key: ClothesKey;
  ask: string;
  because: string;
  /** Clothes that would also answer this, and so are kept off the board. */
  avoid?: readonly ClothesKey[];
  level: 1 | 2 | 3;
}[] = [
  { key: "shoes", ask: "What do you put on your feet before you go outside?", because: "Shoes keep your feet comfy outside.", avoid: ["socks", "boots"], level: 1 },
  { key: "hat", ask: "What do you wear on your head?", because: "A hat sits on top of your head.", level: 1 },
  { key: "gloves", ask: "What do you wear on your hands?", because: "Gloves keep your fingers warm.", level: 1 },
  { key: "socks", ask: "What goes on your feet before your shoes?", because: "Socks go on first, then shoes.", avoid: ["shoes", "boots"], level: 2 },
  { key: "scarf", ask: "What do you wrap around your neck when it is chilly?", because: "A scarf keeps your neck warm.", level: 2 },
  { key: "coat", ask: "What do you put on when it is cold outside?", because: "A big coat keeps the cold out.", avoid: ["scarf", "gloves", "hat"], level: 2 },
  { key: "glasses", ask: "What do some people wear to help them see?", because: "Glasses help eyes see clearly.", level: 2 },
  { key: "swimsuit", ask: "What do you wear to go swimming?", because: "A swimsuit is for the water.", level: 2 },
  { key: "boots", ask: "What do you wear to splash in muddy puddles?", because: "Boots keep your feet dry in the mud.", avoid: ["shoes"], level: 3 },
  { key: "trousers", ask: "What do you pull on over both legs?", because: "Trousers cover both your legs.", avoid: ["dress"], level: 3 },
  { key: "shirt", ask: "What do you pull over your head and put your arms through?", because: "A shirt goes over your head and arms.", avoid: ["dress", "coat"], level: 3 },
];

export const clothing = defineQuizActivity({
  id: "clothing",
  activityType: "clothing",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  questions: WEARING.map(({ key, ask, because, avoid, level }): Question => {
    const answer = CLOTHES[key];
    const barred = new Set<string>([key, ...(avoid ?? [])]);
    return {
      level,
      ask,
      answer,
      distractors: (Object.keys(CLOTHES) as ClothesKey[])
        .filter((other) => !barred.has(other))
        .map((other) => CLOTHES[other]),
      because,
      hint: "Think about getting dressed in the morning.",
      idea: `wear:${key}`,
      family: "clothing",
    };
  }),
});

export const EVERYDAY_ACTIVITIES = [objectNames, objectUses, clothing];
