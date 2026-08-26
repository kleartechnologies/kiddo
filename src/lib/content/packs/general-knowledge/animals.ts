import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { boardIsDrawn, type ArtId } from "../../art";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import {
  aOrAn,
  capitalise,
  defineQuizActivity,
  drawn,
  except,
  pic,
  word,
  type Question,
  type Sym,
} from "./shared";

/**
 * Animals: what they are called, what they say, what they eat, and what their
 * babies are called.
 *
 * One table, four activities. The table is the point: every animal is written
 * down once, with only the fields that are *unambiguously true of it in a
 * picture book*, and each activity reads the field it needs and ignores the
 * rest. An animal with no `sound` is simply never asked about sounds.
 *
 * That optionality is the safety mechanism, and it is used a lot. A koala's
 * baby is a joey, same as a kangaroo's, so the koala has no `baby`. A tiger's
 * cub is a cub, same as a lion's, so the tiger has no `baby`. A goat's baby is
 * a kid, which to a child means a child, so the goat has no `baby`. Nothing in
 * this file guesses; a fact that would need a footnote is left out instead.
 */

/* ------------------------------------------------------------------ table */

export interface Animal {
  name: string;
  glyph: string;
  /** Only when the sound is the one every picture book gives it. */
  sound?: string;
  /** Only when the baby's name belongs to this animal alone, in this table. */
  baby?: string;
  /** Only when a child would recognise it as *the* thing this animal eats. */
  eats?: { name: string; glyph: string };
}

const TABLE: readonly Animal[] = [
  /* -- farm and home ------------------------------------------------- */
  { name: "dog", glyph: "🐶", sound: "woof", baby: "puppy", eats: { name: "a bone", glyph: "🦴" } },
  { name: "cat", glyph: "🐱", sound: "meow", baby: "kitten", eats: { name: "a fish", glyph: "🐟" } },
  { name: "cow", glyph: "🐮", sound: "moo", baby: "calf", eats: { name: "grass", glyph: "🌿" } },
  { name: "sheep", glyph: "🐑", sound: "baa", baby: "lamb" },
  { name: "horse", glyph: "🐴", sound: "neigh", baby: "foal", eats: { name: "hay", glyph: "🌾" } },
  { name: "duck", glyph: "🦆", sound: "quack", baby: "duckling" },
  { name: "chicken", glyph: "🐔", sound: "cluck", baby: "chick", eats: { name: "corn", glyph: "🌽" } },
  { name: "goat", glyph: "🐐" },
  { name: "rabbit", glyph: "🐰", eats: { name: "a carrot", glyph: "🥕" } },
  { name: "mouse", glyph: "🐭", sound: "squeak", eats: { name: "cheese", glyph: "🧀" } },

  /* -- wild ----------------------------------------------------------- */
  { name: "lion", glyph: "🦁", sound: "roar", baby: "cub" },
  { name: "tiger", glyph: "🐯" },
  { name: "elephant", glyph: "🐘" },
  { name: "giraffe", glyph: "🦒", eats: { name: "leaves", glyph: "🍃" } },
  { name: "zebra", glyph: "🦓" },
  { name: "monkey", glyph: "🐵", eats: { name: "a banana", glyph: "🍌" } },
  { name: "bear", glyph: "🐻", eats: { name: "honey", glyph: "🍯" } },
  { name: "fox", glyph: "🦊" },
  { name: "wolf", glyph: "🐺", sound: "howl" },
  { name: "deer", glyph: "🦌", baby: "fawn" },
  { name: "squirrel", glyph: "🐿️", eats: { name: "a nut", glyph: "🌰" } },
  { name: "hedgehog", glyph: "🦔" },
  { name: "kangaroo", glyph: "🦘", baby: "joey" },
  { name: "camel", glyph: "🐫" },
  { name: "panda", glyph: "🐼", eats: { name: "bamboo", glyph: "🎋" } },
  { name: "koala", glyph: "🐨" },
  { name: "snake", glyph: "🐍", sound: "hiss" },
  { name: "frog", glyph: "🐸", sound: "ribbit", baby: "tadpole" },
  { name: "owl", glyph: "🦉", sound: "hoot" },
  { name: "bird", glyph: "🐦", sound: "tweet", eats: { name: "a worm", glyph: "🪱" } },
  { name: "penguin", glyph: "🐧" },
  { name: "parrot", glyph: "🦜" },
  { name: "eagle", glyph: "🦅" },
  { name: "bat", glyph: "🦇" },

  /* -- water ---------------------------------------------------------- */
  { name: "fish", glyph: "🐟" },
  { name: "whale", glyph: "🐳" },
  { name: "dolphin", glyph: "🐬" },
  { name: "shark", glyph: "🦈" },
  { name: "octopus", glyph: "🐙" },
  { name: "crab", glyph: "🦀" },
  { name: "turtle", glyph: "🐢" },
  { name: "seal", glyph: "🦭" },

  /* -- small ---------------------------------------------------------- */
  { name: "bee", glyph: "🐝", sound: "buzz" },
  { name: "butterfly", glyph: "🦋", baby: "caterpillar" },
  { name: "ladybird", glyph: "🐞" },
  { name: "snail", glyph: "🐌" },
  { name: "ant", glyph: "🐜" },
];

/** Every animal in the pack, as a tile. Other files draw on this. */
export const ANIMALS: Readonly<Record<string, Sym>> = Object.fromEntries(
  TABLE.map((animal) => [animal.name, pic(animal.glyph, animal.name)]),
);

/** The whole pool, for boards that just need "some other animals". */
export const ANIMAL_TILES: readonly Sym[] = TABLE.map(
  (animal) => ANIMALS[animal.name],
);

const tileOf = (animal: Animal) => ANIMALS[animal.name];

/**
 * Which animals the illustration library has actually drawn.
 *
 * Ten of the forty-eight, and the gap is the design rather than a backlog: the
 * table is the pack's whole animal vocabulary, the library is the handful an
 * entry-level board is built from, and every animal that is not in here is
 * still drawn exactly as it has always been drawn. `habitats.ts` reads this
 * too, so the cow that lives on a farm and the cow whose baby is a calf are the
 * same cow.
 *
 * Adding one is a drawing and a line. Nothing downstream has to be told.
 */
export const ANIMAL_ART: Readonly<Record<string, ArtId>> = {
  cow: "animal.cow",
  sheep: "animal.sheep",
  duck: "animal.duck",
  rabbit: "animal.rabbit",
  bird: "animal.bird",
  snake: "animal.snake",
  dog: "animal.dog",
  cat: "animal.cat",
  chicken: "animal.chicken",
  mouse: "animal.mouse",
  frog: "animal.frog",
  fish: "animal.fish",
  shark: "animal.shark",
  monkey: "animal.monkey",
  fox: "animal.fox",
};

/**
 * An animal tile, drawn when the board it is going on is a drawn board.
 *
 * The caller decides, and it decides for the whole board at once — which is
 * why this takes a flag rather than a level. Whether a board is drawn is
 * `boardIsDrawn` over every picture that will be on it, so a column can never
 * come out half illustrated, and the animals the library has not drawn keep
 * the whole board on glyphs rather than sitting in a drawn row looking like
 * the odd one out.
 */
export function animalItem(name: string, illustrated: boolean) {
  return drawn(ANIMALS[name], illustrated ? ANIMAL_ART[name] : undefined);
}

/* ------------------------------------------------ which one is a giraffe? */

/**
 * Naming animals — the first thing a child knows about the world, and the
 * only activity in the pack where the answer is the picture the child already
 * has in their head.
 *
 * The level is by *familiarity*, not by difficulty of the board: a dog is
 * level one because a two year old points at one, an octopus is level three
 * because it is a word most children meet in a book rather than a garden.
 */
const FAMILIAR = [
  "dog", "cat", "cow", "sheep", "horse", "duck", "chicken", "rabbit",
  "fish", "bird", "mouse", "frog", "bee",
];
const KNOWN = [
  "lion", "tiger", "elephant", "giraffe", "zebra", "monkey", "bear", "snake",
  "owl", "penguin", "butterfly", "whale", "turtle", "crab", "goat", "fox",
];
const NEWER = [
  "kangaroo", "camel", "panda", "koala", "hedgehog", "squirrel", "octopus",
  "dolphin", "parrot", "eagle", "seal", "snail", "ladybird", "deer", "wolf",
  "shark", "bat", "ant",
];

/**
 * Animals that would also be a fair answer, kept off a particular board.
 *
 * A general name has smaller names hiding inside it, and a child who knows
 * more is punished by the ones that do: an owl *is* a bird, a shark *is* a
 * fish, and a panda *is* a bear. Each of those would give a board two right
 * answers, so each of them is named here and never dealt beside its own
 * general word. The specific questions are safe in the other direction — a
 * bird is not an owl — so nothing is barred there.
 */
const NAMING_AVOIDS: Readonly<Record<string, readonly string[]>> = {
  bird: ["owl", "duck", "chicken", "penguin", "parrot", "eagle"],
  fish: ["shark"],
  bear: ["panda"],
};

function namingQuestion(name: string, level: 1 | 2 | 3): Question {
  const answer = ANIMALS[name];
  const barred = (NAMING_AVOIDS[name] ?? []).map((other) => ANIMALS[other]);
  return {
    level,
    ask: `Which one is ${aOrAn(name)}?`,
    answer,
    distractors: except(ANIMAL_TILES, answer, ...barred),
    because: `Yes! That is ${aOrAn(name)}.`,
    hint: "Look at each animal and picture the word in your head.",
    idea: `name:${name}`,
    family: "animal",
  };
}

export const animalRecognition = defineQuizActivity({
  id: "animal-names",
  activityType: "animal-recognition",
  ageRange: { min: 3, max: 6 },
  host: "foxy",
  questions: [
    ...FAMILIAR.map((name) => namingQuestion(name, 1)),
    ...KNOWN.map((name) => namingQuestion(name, 2)),
    ...NEWER.map((name) => namingQuestion(name, 3)),
  ],
});

/* -------------------------------------------------- which animal says moo? */

const SOUNDS = TABLE.filter((animal) => animal.sound);
const SOUND_TILES = SOUNDS.map(tileOf);

/** The ones a farmyard book teaches first get level one. */
const EASY_SOUNDS = new Set(["moo", "woof", "meow", "quack", "baa", "cluck"]);

/**
 * How familiar a sound is, which is the only ladder either form of this
 * objective has. Defined once here and read by both.
 */
export function soundLevelOf(animal: Animal): 1 | 2 | 3 {
  const sound = animal.sound as string;
  if (EASY_SOUNDS.has(sound)) return 1;
  return sound === "roar" || sound === "buzz" || sound === "tweet" ? 2 : 3;
}

/**
 * Every animal-to-sound fact in the table: the honest count of this
 * objective, and the pool the cards form in `match/sounds.ts` deals from.
 *
 * Exported rather than copied, so the two ways of playing it can never drift
 * apart. Every sound belongs to exactly one animal — the pack's test proves
 * it — which is what lets a whole board of them have exactly one solution.
 */
export const SOUND_FACTS: readonly Animal[] = SOUNDS;

/**
 * Sound-havers that would also be a fair answer, kept off a particular board.
 *
 * Each sound belongs to one animal in the table, but real animals are not so
 * tidy: a cat hisses as surely as a snake does, and a dog howls along with
 * the wolves. A child who knows that must never be marked wrong for it, so
 * each cross-true animal is named here and never dealt beside that sound.
 */
const SOUND_AVOIDS: Readonly<Record<string, readonly string[]>> = {
  snake: ["cat"],
  wolf: ["dog"],
};

export const animalSounds = defineQuizActivity({
  id: "animal-sounds",
  activityType: "animal-sounds",
  ageRange: { min: 3, max: 6 },
  host: "pip",
  questions: SOUNDS.map((animal): Question => {
    const answer = tileOf(animal);
    const sound = animal.sound as string;
    const barred = (SOUND_AVOIDS[animal.name] ?? []).map((other) => ANIMALS[other]);
    return {
      level: soundLevelOf(animal),
      ask: `Which animal says ${sound}?`,
      answer,
      distractors: except(SOUND_TILES, answer, ...barred),
      because: `${capitalise(aOrAn(animal.name))} says ${sound}!`,
      hint: "Say the sound out loud. Which animal do you picture?",
      idea: `sound:${sound}`,
      family: "animal",
    };
  }),
});

/* --------------------------------------------- whose baby is called a cub? */

const BABIES = TABLE.filter((animal) => animal.baby);
const BABY_TILES = BABIES.map(tileOf);

/**
 * Asked animal-first — "which animal has a baby called a puppy?" — so the
 * tiles stay pictures and a child who cannot read a word yet can still play.
 *
 * The table already guarantees the mapping runs one way only. Every `baby`
 * here belongs to exactly one animal in the pack, so no board can contain two
 * defensible answers.
 */
export const babyAnimals = defineQuizActivity({
  id: "baby-animals",
  activityType: "baby-animals",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  questions: BABIES.map((animal): Question => {
    const answer = tileOf(animal);
    const baby = animal.baby as string;
    return {
      level: baby === "puppy" || baby === "kitten" || baby === "chick" ? 1
        : baby === "tadpole" || baby === "joey" || baby === "caterpillar" ? 3
          : 2,
      ask: `Which animal has a baby called a ${baby}?`,
      answer,
      distractors: except(BABY_TILES, answer),
      because: `A baby ${animal.name} is called a ${baby}.`,
      hint: "Think of the grown-up animal that the little one turns into.",
      idea: `baby:${baby}`,
      family: "animal",
    };
  }),
});

/* --------------------------------------------- what does a rabbit like to eat? */

const EATERS = TABLE.filter((animal) => animal.eats);
const FOOD_TILES: readonly Sym[] = EATERS.map((animal) =>
  pic((animal.eats as { glyph: string }).glyph, (animal.eats as { name: string }).name),
);

/** The food tile an animal owns, for keeping it off another animal's board. */
const FOOD_OF: Readonly<Record<string, Sym>> = Object.fromEntries(
  EATERS.map((animal, index) => [animal.name, FOOD_TILES[index]]),
);

/**
 * Foods that are also true of the asker, named by the animal that owns them.
 *
 * Each food belongs to one animal *in the table*, but real animals are not so
 * tidy: a horse eats the cow's grass and the rabbit's carrot as surely as its
 * own hay, and a bear catches the cat's fish. A child who knows that must
 * never be marked wrong for it, so every cross-true food is kept off that
 * asker's board.
 */
const DIET_AVOIDS: Readonly<Record<string, readonly string[]>> = {
  cow: ["horse"], // cows eat hay too
  horse: ["cow", "rabbit"], // horses eat grass and carrots too
  chicken: ["bird"], // chickens pull up worms too
  rabbit: ["cow", "giraffe"], // rabbits nibble grass and leaves too
  bear: ["cat"], // bears catch fish too
};

/**
 * Asked food-first, because the *food* is what varies and the animal is what
 * the child already knows. Within the table every favourite food belongs to
 * one animal, so "a carrot" can only ever mean the rabbit — and where the
 * real world disagrees, `DIET_AVOIDS` keeps the second truth off the board.
 */
export const animalDiet = defineQuizActivity({
  id: "animal-diet",
  activityType: "animal-diet",
  ageRange: { min: 3, max: 6 },
  host: "foxy",
  questions: EATERS.map((animal, index): Question => {
    const food = animal.eats as { name: string; glyph: string };
    const answer = FOOD_TILES[index];
    const barred = (DIET_AVOIDS[animal.name] ?? []).map((owner) => FOOD_OF[owner]);
    return {
      level: index < 4 ? 1 : index < 8 ? 2 : 3,
      ask: `What does a ${animal.name} like to eat?`,
      answer,
      distractors: except(FOOD_TILES, answer, ...barred),
      because: `A ${animal.name} loves ${food.name}.`,
      hint: "Picture the animal at dinner time. What is on the plate?",
      idea: `eats:${animal.name}`,
      family: "food",
      display: [{ kind: "item", item: ANIMALS[animal.name].item }],
    };
  }),
});

/* ------------------------------------------- everybody's baby, all at once */

/**
 * The same thirteen facts, joined up instead of picked from.
 *
 * `babyAnimals` above asks one at a time and animal-first, which is the right
 * shape for a child meeting the idea. This is the same table asked as a whole
 * board: three, four or five animals down one side, their babies down the
 * other in the wrong order, and nothing said about where to start. Recognising
 * a fact and *sorting out a set of them* are different things to be able to
 * do, and the second one is what a child does with a family of animals.
 *
 * That is the pack's two-axis split doing its job twice over. The
 * `ActivityType` is `baby-animals` on both, so a session wanting to teach what
 * a lamb is can reach for either; the `ChallengeKind` differs, so `ChoiceStage`
 * draws one and `ConnectStage` the other. No engine was touched, no artwork
 * was drawn, and the facts were written down once.
 *
 * ## The babies are words
 *
 * The left column is the animal picture every other activity in this file
 * uses. The right column is the baby's *name*, on a text tile, and that is a
 * deliberate refusal rather than a gap: there is no picture of a lamb that a
 * child can tell apart from a picture of a sheep, and the emoji available for
 * a puppy, a kitten or a foal are the adult animal at a smaller size. A board
 * where two tiles are indistinguishable is a board with two right answers. So
 * the baby is written, spoken by its `label` for anyone using a screen reader,
 * and said out loud by the host in the prompt.
 *
 * ## How a level gets harder
 *
 * | | pairs | drawn from |
 * |-|-------|------------|
 * |1| 3 | puppy, kitten, chick, lamb, calf |
 * |2| 4 | the above, plus duckling, foal, cub |
 * |3| 5 | the whole table, and always one of the four a child meets last |
 *
 * More lines, a wider pool, and a guarantee at the top that the board contains
 * something genuinely new — a joey, a fawn, a tadpole or a caterpillar —
 * rather than five easy ones dealt over again.
 *
 * The brief this was built to asked for "sensible distractors" at level three,
 * and the honest answer is that a `connect` board cannot have any: a board is
 * a bijection, every tile is half of a real pair, and `validateChallenge`
 * rejects a spare node. So difficulty is carried by *which* pairs are on the
 * board instead. A fawn next to a calf is the distractor.
 */

/** How familiar the baby's name is, which is the only ladder here. */
const BABY_LEVEL: Record<string, 1 | 2 | 3> = {
  puppy: 1, kitten: 1, chick: 1, lamb: 1, calf: 1,
  duckling: 2, foal: 2, cub: 2,
  fawn: 3, joey: 3, tadpole: 3, caterpillar: 3,
};

/** The honest content count: how many animal-to-baby facts exist here. */
export const BABY_FACTS = BABIES.length;

const babyLevelOf = (animal: Animal): 1 | 2 | 3 =>
  BABY_LEVEL[animal.baby as string] ?? 3;

function babyPairsAtLevel(level: Level): number {
  if (level <= 1) return 3;
  if (level === 2) return 4;
  return 5;
}

function babyPoolAtLevel(level: Level): readonly Animal[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return BABIES.filter((animal) => babyLevelOf(animal) <= ceiling);
}

/**
 * Choose the animals for one board.
 *
 * No clash rule is needed and that is a property of the table rather than an
 * oversight: every `baby` in it belongs to exactly one animal — the koala, the
 * tiger and the goat were left without one precisely so that stayed true — so
 * any set of animals makes a board with exactly one solution. Level three
 * starts from an unfamiliar baby and fills up around it.
 */
function chooseBabies(level: Level, rng: Rng): Animal[] {
  const pool = babyPoolAtLevel(level);
  const count = babyPairsAtLevel(level);
  const newer = level >= 3 ? pool.filter((animal) => babyLevelOf(animal) === 3) : [];

  const start = newer.length > 0 ? [newer[rng.int(0, newer.length - 1)]] : [];
  const picked: Animal[] = [];

  for (const candidate of [...start, ...rng.shuffle(pool)]) {
    if (picked.length >= count) break;
    if (picked.includes(candidate)) continue;
    picked.push(candidate);
  }

  return picked;
}

/**
 * The order the babies are laid out in.
 *
 * Shuffled apart from the animals, and *deranged* from three lines up, so no
 * baby is ever left sitting opposite its own mother and joining straight
 * across is never accidentally right. Two would have only one derangement —
 * the swap — but no board here is ever smaller than three, so the plain
 * shuffle is a fallback that never runs.
 */
function displaceBabies(chosen: readonly Animal[], rng: Rng): Animal[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board: the *set* of facts it practises,
 * sorted, so the same five animals dealt down the columns another way is one
 * concept and not a hundred. `BABY_FACTS` is the number that means something
 * to a child; the boards are shuffles of it.
 */
function babyConceptOf(chosen: readonly Animal[]): string {
  const facts = chosen.map((animal) => `${animal.name}>${animal.baby}`).sort();
  return `concept:baby:${facts.join("+")}`;
}

const babyId = (animal: Animal) => `baby-${animal.baby}`;

export const babyPartners = defineGeneratedActivity({
  id: "animal-babies",
  packId: "general-knowledge",
  category: "general-knowledge",
  activityType: "baby-animals",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = chooseBabies(level, rng);

    /* MODE 1 on the left, MODE 3 on the right, on one board — and that is the
       activity rather than an inconsistency. The left column is a thing in the
       world, so it is drawn. The right column is the *name* of the baby, which
       is the whole objective: there is no picture that tells a lamb from a
       sheep, so a drawn right column would be a board a child could finish
       without ever meeting the word "lamb".

       The left column is all of it or none of it. Nothing here leaks an answer
       either way — the right column is words, so "join the drawn ones to the
       drawn ones" is not a strategy that exists — but a column with two
       drawings and three emoji in it is the mixture the visual system exists
       to refuse. So the board is drawn when the library knows every animal on
       it, which is every board at level one and the boards above it that
       happen to deal from the animals it knows. */
    const illustrated = boardIsDrawn(
      chosen.map((animal) => ANIMAL_ART[animal.name]),
    );

    const left: ConnectNode[] = chosen.map((animal) => ({
      id: `animal-${animal.name}`,
      item: animalItem(animal.name, illustrated),
    }));

    const right: ConnectNode[] = displaceBabies(chosen, rng).map((animal) => {
      const baby = animal.baby as string;
      return {
        id: babyId(animal),
        item: word(baby.toUpperCase(), aOrAn(baby)).item,
      };
    });

    const pairs: ConnectPair[] = chosen.map((animal) => ({
      leftId: `animal-${animal.name}`,
      rightId: babyId(animal),
    }));

    const example = chosen[0];

    return {
      level,
      prompt: { speech: "Can you help each animal find its baby?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `Every baby is home. A baby ${example.name} is called ${aOrAn(example.baby as string)}.`
        : "Every baby is home.",
      hint: "Think of the grown-up animal that the little one turns into.",
      meta: {
        objective: "joins each animal to the name of its baby",
        tags: ["family:animal", babyConceptOf(chosen)],
      },
    };
  },
});

export const ANIMAL_ACTIVITIES = [
  animalRecognition,
  animalSounds,
  babyAnimals,
  babyPartners,
  animalDiet,
];
