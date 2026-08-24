import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { defineQuizActivity, except, pic, word, type Question, type Sym } from "./shared";

/**
 * Your own body: what the parts are called, what they do, and how to look
 * after them.
 *
 * Naming and senses are kept apart on purpose. "Which one is your ear?" is a
 * word; "which part do you hear with?" is a fact. They use the same pictures
 * and they are different things to know, so they are different activities and
 * a round can ask both without ever feeling like it repeated itself.
 */

const BODY = {
  eye: pic("👁️", "an eye"),
  ear: pic("👂", "an ear"),
  nose: pic("👃", "a nose"),
  mouth: pic("👄", "a mouth"),
  tongue: pic("👅", "a tongue"),
  tooth: pic("🦷", "a tooth"),
  hand: pic("✋", "a hand"),
  arm: pic("💪", "an arm"),
  leg: pic("🦵", "a leg"),
  foot: pic("🦶", "a foot"),
  brain: pic("🧠", "a brain"),
  heart: pic("🫀", "a heart"),
} as const;

type BodyKey = keyof typeof BODY;

export const BODY_TILES: readonly Sym[] = Object.values(BODY);

const NAMING: readonly { key: BodyKey; level: 1 | 2 | 3 }[] = [
  { key: "eye", level: 1 },
  { key: "nose", level: 1 },
  { key: "ear", level: 1 },
  { key: "mouth", level: 1 },
  { key: "hand", level: 1 },
  { key: "foot", level: 2 },
  { key: "leg", level: 2 },
  { key: "arm", level: 2 },
  { key: "tooth", level: 2 },
  { key: "tongue", level: 3 },
  { key: "brain", level: 3 },
  { key: "heart", level: 3 },
];

export const bodyParts = defineQuizActivity({
  id: "body-parts",
  title: "All About My Body",
  activityType: "body-parts",
  ageRange: { min: 3, max: 6 },
  host: "kiddo",
  questions: [
    ...NAMING.map(({ key, level }): Question => {
      const answer = BODY[key];
      return {
        level,
        ask: `Which one is ${answer.key}?`,
        answer,
        distractors: except(BODY_TILES, answer),
        because: `That is ${answer.key}. Point to yours!`,
        hint: "Try touching each part on yourself as you look.",
        idea: `body:${key}`,
        family: "body part",
      };
    }),
    {
      level: 3,
      ask: "Which part beats away inside your chest, all day and all night?",
      answer: BODY.heart,
      distractors: except(BODY_TILES, BODY.heart),
      because: "Your heart beats inside your chest and pumps your blood around.",
      hint: "Put your hand on your chest and feel the thump.",
      idea: "body:heart-beats",
      family: "body part",
    },
    {
      level: 3,
      ask: "Which part is inside your head and helps you think and remember?",
      answer: BODY.brain,
      distractors: except(BODY_TILES, BODY.brain),
      because: "Your brain does all your thinking and remembering.",
      hint: "It is hiding where you cannot see it, up top.",
      idea: "body:brain-thinks",
      family: "body part",
    },
  ],
});

/* ----------------------------------------------------------------- senses */

const SENSE_TILES: readonly Sym[] = [
  BODY.eye,
  BODY.ear,
  BODY.nose,
  BODY.tongue,
  BODY.hand,
];

const SENSES: readonly { key: BodyKey; ask: string; because: string; hint: string; idea: string; level: 1 | 2 | 3 }[] = [
  { key: "eye", ask: "Which part of you do you see with?", because: "You see the whole world with your eyes.", hint: "Cover them up and everything goes dark.", idea: "sense:sight", level: 1 },
  { key: "ear", ask: "Which part of you do you hear with?", because: "You hear every sound with your ears.", hint: "Cover them up and everything goes quiet.", idea: "sense:hearing", level: 1 },
  { key: "nose", ask: "Which part of you do you smell with?", because: "You smell flowers and dinner with your nose.", hint: "Take a big sniff. What did you use?", idea: "sense:smell", level: 1 },
  { key: "tongue", ask: "Which part of you do you taste with?", because: "Your tongue tells you if something is sweet or sour.", hint: "It is inside your mouth and it wiggles.", idea: "sense:taste", level: 2 },
  { key: "hand", ask: "Which part of you feels whether something is soft or scratchy?", because: "You feel things with your hands and your skin.", hint: "Think about stroking a cat.", idea: "sense:touch", level: 2 },
  { key: "nose", ask: "Which part would tell you that the toast is burning?", because: "Your nose picks up the smell of smoke straight away.", hint: "You would notice it before you saw anything.", idea: "sense:smell-warning", level: 3 },
  { key: "ear", ask: "Which part tells you that the music is very loud?", because: "Your ears hear how loud a sound is.", hint: "You would want to cover these up.", idea: "sense:loud", level: 3 },
  { key: "eye", ask: "Which part tells you that a strawberry is red and shiny?", because: "Your eyes see colours and shapes.", hint: "You have to look to know that one.", idea: "sense:sight-colour", level: 3 },
];

export const senses = defineQuizActivity({
  id: "senses",
  title: "My Five Senses",
  activityType: "senses",
  ageRange: { min: 4, max: 6 },
  host: "pip",
  questions: SENSES.map((sense): Question => {
    const answer = BODY[sense.key];
    return {
      level: sense.level,
      ask: sense.ask,
      answer,
      distractors: except(SENSE_TILES, answer),
      because: sense.because,
      hint: sense.hint,
      idea: sense.idea,
      family: "body part",
    };
  }),
});

/* --------------------------------------------------- what each part does */

/**
 * Every part of you, joined to the one thing it does.
 *
 * `senses` shows five parts and asks which one hears. This puts three, four or
 * five parts on the board at once and asks for all of them together, which is
 * a different job: a word that has been used is gone, so the last line is
 * decided by the first four. Same objective, same `activityType`, no new
 * engine.
 *
 * ## Why the far column is words and not more pictures
 *
 * Because there is no honest picture of *smelling*. The obvious board — a
 * flower beside a nose, a lemon beside a tongue — looks lovely and has no
 * right answer: a flower can be seen and touched as well as smelled, and a
 * lemon can be seen, touched and smelled. Only sight and hearing have things
 * in the world that no other part can reach, so a picture board could carry
 * two pairs honestly and would have to fake the other three.
 *
 * A short word does not fake anything. SEE, HEAR, SMELL — one syllable each,
 * every one of them in reach of a child who is starting to read, which is why
 * this board starts at five and `senses` still starts at four. A child who
 * cannot yet read them has the picture-and-pick version of the same objective
 * waiting on the other activity, which is the point of having both.
 *
 * ## How a level gets harder
 *
 * | | pairs | what joins the pool |
 * |-|-------|---------------------|
 * |1| 3 | the four parts you can point at and use straight away |
 * |2| 4 | and the ones whose job has to be thought about |
 * |3| 5 | and the two you cannot see at all |
 */
interface Doing {
  part: BodyKey;
  /** One short word. Never two parts' word, and never two words for a part. */
  does: string;
  /** The level this pairing joins the pool at. Pools are cumulative. */
  level: 1 | 2 | 3;
}

const DOINGS: readonly Doing[] = [
  { part: "eye", does: "SEE", level: 1 },
  { part: "ear", does: "HEAR", level: 1 },
  { part: "nose", does: "SMELL", level: 1 },
  { part: "leg", does: "WALK", level: 1 },
  { part: "tongue", does: "TASTE", level: 2 },
  { part: "hand", does: "HOLD", level: 2 },
  { part: "tooth", does: "CHEW", level: 2 },
  { part: "brain", does: "THINK", level: 3 },
  { part: "heart", does: "BEAT", level: 3 },
];

/**
 * The honest content count of this objective: nine parts of you and the one
 * thing each of them does. Not the boards — there are hundreds of those.
 */
export const DOING_FACTS: readonly Doing[] = DOINGS;

const PAIRS_AT: Record<1 | 2 | 3, number> = { 1: 3, 2: 4, 3: 5 };

function doingsAtLevel(level: Level): readonly Doing[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return DOINGS.filter((entry) => entry.level <= ceiling);
}

/**
 * The order the words are laid out in.
 *
 * Deranged from three tiles up, so no word is ever left facing its own part
 * and joining straight across is never accidentally right. Two tiles get a
 * plain shuffle: the only derangement of two is the swap, which would make the
 * crossed line always correct — a pattern to learn instead of a fact.
 */
function displace(chosen: readonly Doing[], rng: Rng): Doing[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

const partId = (entry: Doing) => `part-${entry.part}`;
const doesId = (entry: Doing) => `does-${entry.does.toLowerCase()}`;

/**
 * The name of the idea behind a board: the *set* of correspondences it
 * practises, sorted, so the same four parts dealt to different rows is one
 * thing to have learned. Not a way of counting — `DOING_FACTS` is that.
 */
function conceptOf(chosen: readonly Doing[]): string {
  const facts = chosen
    .map((entry) => `${entry.part}>${entry.does.toLowerCase()}`)
    .sort();
  return `concept:does:${facts.join("+")}`;
}

export const bodyPartners = defineGeneratedActivity({
  id: "body-partners",
  packId: "general-knowledge",
  title: "What Each Part Does",
  category: "general-knowledge",
  activityType: "body-parts",
  kind: "connect",
  ageRange: { min: 5, max: 8 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const wanted = PAIRS_AT[level <= 1 ? 1 : level === 2 ? 2 : 3];
    const chosen = rng.some(doingsAtLevel(level), wanted);

    const left: ConnectNode[] = chosen.map((entry) => ({
      id: partId(entry),
      item: BODY[entry.part].item,
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((entry) => ({
      id: doesId(entry),
      item: word(entry.does, entry.does.toLowerCase()).item,
    }));

    const pairs: ConnectPair[] = chosen.map((entry) => ({
      leftId: partId(entry),
      rightId: doesId(entry),
    }));

    return {
      level,
      prompt: { speech: "Can you join each part of you to what it does?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: "Every part of you has a job to do!",
      hint: "Take one part at a time. What would you miss if it had a day off?",
      meta: {
        objective: "joins each part of the body to what it does",
        tags: ["family:body part", conceptOf(chosen)],
      },
    };
  },
});

/* ---------------------------------------------------------------- habits */

const HABITS = {
  wash: pic("🧼", "washing your hands"),
  brush: pic("🪥", "brushing your teeth"),
  sleep: pic("🛌", "a good night's sleep"),
  run: pic("🏃", "running about outside"),
  water: pic("💧", "a glass of water"),
  veg: pic("🥦", "vegetables"),
  apple: pic("🍎", "an apple"),
  sweets: pic("🍬", "sweets"),
  cake: pic("🍰", "cake"),
  chocolate: pic("🍫", "chocolate"),
} as const;

const TREATS = [HABITS.sweets, HABITS.cake, HABITS.chocolate];

export const healthyHabits = defineQuizActivity({
  id: "healthy-habits",
  title: "Looking After Myself",
  activityType: "healthy-habits",
  ageRange: { min: 4, max: 6 },
  host: "kiddo",
  questions: [
    {
      level: 1,
      ask: "What should you always do before you sit down to eat?",
      answer: HABITS.wash,
      distractors: [HABITS.brush, HABITS.run, HABITS.sleep],
      because: "Washing your hands takes the germs off before you eat.",
      hint: "It happens at the sink, with soap.",
      idea: "habit:wash-before-eating",
      family: "healthy habit",
    },
    {
      level: 1,
      ask: "What should you do last thing at night to keep your smile shiny?",
      answer: HABITS.brush,
      distractors: [HABITS.wash, HABITS.run, HABITS.sleep],
      because: "Brushing your teeth at bedtime keeps them strong and shiny.",
      hint: "You need a toothbrush for this one.",
      idea: "habit:brush-at-night",
      family: "healthy habit",
    },
    {
      level: 2,
      ask: "What does your body need lots of, so you can grow big and strong?",
      answer: HABITS.sleep,
      distractors: TREATS,
      because: "Your body grows while you are fast asleep.",
      hint: "It happens in bed, with your eyes closed.",
      idea: "habit:sleep",
      family: "healthy habit",
    },
    {
      level: 2,
      ask: "What is the very best thing to drink when you are thirsty?",
      answer: HABITS.water,
      distractors: TREATS,
      because: "Water is the best drink of all for your body.",
      hint: "It comes out of the tap and has no colour at all.",
      idea: "habit:drink-water",
      family: "healthy habit",
    },
    {
      level: 2,
      ask: "Which one is a healthy snack?",
      answer: HABITS.apple,
      distractors: TREATS,
      because: "An apple is a healthy snack — crunchy and full of goodness.",
      hint: "The others are sweet treats. One grows on a tree.",
      idea: "habit:healthy-snack",
      family: "healthy habit",
    },
    {
      level: 2,
      ask: "What makes your heart strong and your legs quick?",
      answer: HABITS.run,
      distractors: TREATS,
      because: "Running about outside makes your heart and legs strong.",
      hint: "You would be out of breath afterwards.",
      idea: "habit:exercise",
      family: "healthy habit",
    },
    {
      level: 3,
      ask: "Which one should you only have now and then, as a treat?",
      answer: HABITS.sweets,
      distractors: [HABITS.apple, HABITS.veg, HABITS.water],
      because: "Sweets are lovely now and then, but not every day.",
      hint: "The others are good for you every day. One is not.",
      idea: "habit:treats-sometimes",
      family: "healthy habit",
    },
    {
      level: 3,
      ask: "What should you eat plenty of at dinner time to stay healthy?",
      answer: HABITS.veg,
      distractors: TREATS,
      because: "Vegetables are full of the goodness your body needs.",
      hint: "They are the green ones on your plate.",
      idea: "habit:eat-vegetables",
      family: "healthy habit",
    },
  ],
});

export const BODY_ACTIVITIES = [bodyParts, senses, bodyPartners, healthyHabits];
