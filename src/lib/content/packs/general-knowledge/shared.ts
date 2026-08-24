import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { ArtId } from "../../art";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type {
  ActivityType,
  ChoicePayload,
  ContentItem,
  GeneratedActivity,
  PromptPart,
} from "../../types";
import type { AgeRange, CharacterId } from "@/lib/games/types";

/**
 * The pieces every General Knowledge activity is built from.
 *
 * Math's `shared.ts` says "a number, a symbol, a blank, some tiles". Shapes'
 * says "a shape, a property, a place, some tiles". This one says the shortest
 * thing of the four: **a fact, and some things it is not true of.**
 *
 * That is the whole subject. "Where does a penguin live?" and "Which tool does
 * a firefighter use?" are not two kinds of question — they are one kind asked
 * about two corners of the world, and the only thing that changes between them
 * is which curated table the tiles come out of. So this file holds one
 * question shape (`Question`), one board builder (`board`), and one activity
 * definer (`defineQuizActivity`), and the twenty-eight activities in this pack
 * are twenty-eight tables of facts rather than twenty-eight generators.
 *
 * There is no new interaction anywhere in the pack. Every challenge it can
 * produce is a `choice`, drawn by the same `ChoiceStage` that draws a sum.
 * What the pack needed from the content layer was one new *noun* —
 * `PictureItem`, a thing in the world with a name — and that went in
 * `types.ts` as a subject-neutral item, not here.
 */

/* ------------------------------------------------------------------ tiles */

/** A thing on a tile, with the identity that makes two tiles the same thing. */
export interface Sym {
  key: string;
  item: ContentItem;
}

/**
 * A picture of a thing in the world.
 *
 * The key is the *name*, not the glyph, because the name is what makes two
 * tiles the same answer: a board must never show one thing twice, and two
 * tables that both happen to reach for 🐟 mean the same fish.
 *
 * `art` promotes the picture to a KIDDO illustration where one has been drawn.
 * It is optional and always will be: the pack knows thousands of things and the
 * library knows twenty, so the glyph is the floor and the drawing is the
 * ceiling. A fact that names an id nobody has drawn shows exactly what it shows
 * today.
 */
export function pic(glyph: string, label: string, art?: ArtId): Sym {
  return { key: label, item: { kind: "picture", glyph, label, art } };
}

/**
 * The same tile, promoted to an illustration.
 *
 * Every activity in this pack that wants a drawn board wants exactly this: keep
 * the tile it already had — same key, same label, same glyph underneath — and
 * add the drawing on top. Passing `undefined` gives the tile back untouched,
 * which is what an activity above its entry level does, so the promotion is one
 * expression rather than a branch:
 *
 * ```ts
 * drawn(ANIMALS[name], illustratedAtLevel(level) ? ANIMAL_ART[name] : undefined)
 * ```
 *
 * A tile that is not a picture is returned unchanged, because a word with a
 * drawing over it is a different thing and belongs to the pack that teaches
 * reading.
 */
export function drawn(sym: Sym, art: ArtId | undefined): ContentItem {
  if (!art || sym.item.kind !== "picture") return sym.item;
  return { ...sym.item, art };
}

/** A word on a tile, for the handful of answers that have no picture. */
export function word(text: string, label = text): Sym {
  return { key: label, item: { kind: "text", text, label } };
}

/** The thing being asked about, shown on the stage above the tiles. */
export function part(item: ContentItem): PromptPart {
  return { kind: "item", item };
}

/* ---------------------------------------------------------------- choices */

/**
 * The answer and its distractors, shuffled onto tiles.
 *
 * The same function Logic's and Shapes' `shared.ts` have, for the same reason:
 * generated content shuffles its own board so a challenge is right the moment
 * it is made, and ids come from the tile so two tiles can never collide.
 */
export function board(
  answer: Sym,
  distractors: readonly Sym[],
  rng: Rng,
): ChoicePayload {
  const unique = distractors.filter(
    (symbol, index, all) =>
      symbol.key !== answer.key &&
      all.findIndex((other) => other.key === symbol.key) === index,
  );
  const symbols = rng.shuffle([answer, ...unique]);
  return {
    kind: "choice",
    options: symbols.map((symbol) => ({ id: symbol.key, item: symbol.item })),
    answerId: answer.key,
  };
}

/* -------------------------------------------------------------- questions */

/**
 * One thing worth knowing, written down.
 *
 * A `Question` is not a challenge and not a board: it is the fact, the tile
 * that carries it, and a pool of tiles that carry the same *kind* of thing and
 * are plainly not the answer. `askQuestion` turns it into a board by sampling
 * that pool, which is where a hundred facts become thousands of boards without
 * a hundred facts becoming a hundred kinds of question.
 *
 * Everything an author has to get right is on this object, and a test checks
 * every field of every one of them.
 */
export interface Question {
  /** 1 obvious · 2 needs knowing · 3 needs thinking. Never above 3. */
  level: Level;
  /** What KIDDO says. A question a four year old could be asked out loud. */
  ask: string;
  /** The tile that is right. Exactly one, always. */
  answer: Sym;
  /**
   * Tiles that are the same kind of thing and are plainly *not* the answer.
   *
   * Same kind of thing is the rule that makes the question worth asking: an
   * animal question is answered against other animals, a tool question
   * against other tools. Three at the very least, because a level-three board
   * is four tiles; five or more is what makes two draws of the same fact look
   * like two different boards.
   */
  distractors: readonly Sym[];
  /** Said after a right answer. The fact itself, in one warm sentence. */
  because: string;
  /**
   * Said after a wrong one. Where to think, never what to tap — a hint that
   * contains the answer is not a hint, it is the answer arriving late.
   */
  hint: string;
  /**
   * What makes this a different thing to know. Unique within its activity,
   * and what `conceptKey` counts. Two questions that teach the same fact in
   * different words share an idea and are counted once.
   */
  idea: string;
  /**
   * The curated group every tile on this board comes from — "animal",
   * "food", "vehicle". Named rather than derived, so a test can check that
   * nothing foreign wandered onto a board.
   */
  family: string;
  /** Shown on the stage above the tiles, when the question needs a subject. */
  display?: readonly PromptPart[];
}

/** How many tiles a board carries, by level. Three, then four. */
const TILES: LevelTable<number> = { 1: 3, 2: 4, 3: 4 };

/**
 * A fact, dealt as a board.
 *
 * The distractors are *sampled*, not taken whole, which is the pack's only
 * source of board variation and is deliberately the only one: a question
 * repeated with a different set of wrong answers is the same thing to learn,
 * and `conceptKey` says so.
 */
export function askQuestion(
  question: Question,
  rng: Rng,
  tiles: number,
): ChallengeSpec {
  return {
    level: question.level,
    prompt: {
      speech: question.ask,
      ...(question.display ? { display: question.display } : {}),
      /* A question with exactly one thing above it is a *subject*, not a line:
         "where does this live?" over a single cow. `PromptDisplay` draws it
         large and alone, which is the difference between a child seeing a
         question and a child seeing an animal. Two or more parts stay a line,
         because that is what they are. */
      ...(question.display?.length === 1 && question.display[0].kind === "item"
        ? { layout: "subject" as const }
        : {}),
    },
    payload: board(
      question.answer,
      rng.some(question.distractors, Math.max(1, tiles - 1)),
      rng,
    ),
    explanation: question.because,
    hint: question.hint,
    meta: {
      objective: question.idea,
      tags: [`family:${question.family}`, `concept:${question.idea}`],
    },
  };
}

export interface QuizDef {
  /** Local id. Becomes `general-knowledge.<id>`. */
  id: string;
  /** Grown-up facing. The child is never shown it. */
  title: string;
  activityType: ActivityType;
  ageRange: AgeRange;
  host?: CharacterId;
  /** Every fact this activity can ask. One per idea, and each one unique. */
  questions: readonly Question[];
  /** Overrides the three-then-four default, for a board that needs it. */
  tiles?: LevelTable<number>;
}

/**
 * An activity made of facts.
 *
 * Every activity in this pack is one call to this, and the levels it offers
 * are read off the questions rather than declared — so an activity cannot
 * claim a level it has nothing to ask at, and `resolveLevel` snaps 4 and 5
 * down to whatever it really has. No fake difficulty, and no way to write any.
 */
export function defineQuizActivity(def: QuizDef): GeneratedActivity {
  const byLevel = new Map<Level, Question[]>();
  for (const question of def.questions) {
    const at = byLevel.get(question.level);
    if (at) at.push(question);
    else byLevel.set(question.level, [question]);
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return defineGeneratedActivity({
    id: def.id,
    packId: "general-knowledge",
    title: def.title,
    category: "general-knowledge",
    activityType: def.activityType,
    kind: "choice",
    ageRange: def.ageRange,
    host: def.host,
    levels,
    generate: ({ level, rng }) => {
      const pool = byLevel.get(level) ?? def.questions;
      const question = rng.pick(pool) ?? def.questions[0];
      return askQuestion(question, rng, forLevel(def.tiles ?? TILES, level, 3));
    },
  });
}

/* ------------------------------------------------------------------ words */

/** "a rabbit", "an owl". Said wrong, a question stops sounding like KIDDO. */
export function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

/** "a rabbit" -> "A rabbit". Explanations are sentences, not fragments. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Everything in a list except the ones named.
 *
 * The commonest move in the pack: the distractors for "which animal says
 * moo?" are the animals that say something else, and they are found by taking
 * them away rather than by writing them out — a list written out is a list
 * that goes stale the day an animal is added.
 */
export function except<T extends Sym>(pool: readonly T[], ...taken: Sym[]): T[] {
  const keys = new Set(taken.map((symbol) => symbol.key));
  return pool.filter((symbol) => !keys.has(symbol.key));
}
