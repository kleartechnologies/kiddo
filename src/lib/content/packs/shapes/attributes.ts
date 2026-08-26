import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ShapeSize } from "../../types";
import {
  aOrAn,
  ALL_SHAPES,
  board,
  canonical,
  capitalise,
  concept,
  numberSym,
  part,
  SHAPE_FACTS,
  SHAPE_HINTS,
  shapeSym,
  type Sym,
} from "./shared";

/**
 * The two properties a shape has that are not its name: how big it is, and
 * what it is made of.
 *
 * `size` is comparison — bigger, smaller, the same as this one — and it is
 * drawn rather than described: every tile is the same size, and the shape
 * inside it is not. That is the whole reason `ShapeItem` grew a `size` field
 * instead of the activity shipping three differently-sized components.
 *
 * `shape-properties` is the first genuinely analytical question in the pack.
 * "Which one has three corners?" cannot be answered by recognising a triangle
 * from memory — a child has to look at the thing and count. It is the level
 * the rest of the pack builds towards.
 */

/* ------------------------------------------------------------------- size */

const SIZES: readonly ShapeSize[] = ["small", "medium", "large"];

/**
 * How many sizes are on the board, and therefore how fine the comparison is.
 *
 * Two at level one, and they are the two furthest apart: a big shape is nearly
 * twice a small one across, which is a difference a three year old can see
 * from the other side of the room. Three tiles at level two brings in the
 * middle size, where "bigger" stops meaning "the obvious one".
 */
const SIZE_TILES: LevelTable<number> = { 1: 2, 2: 3, 3: 3 };

/** The two-tile board never asks about the middle size. See above. */
function sizesFor(tiles: number, rng: Rng): ShapeSize[] {
  if (tiles >= 3) return [...SIZES];
  return rng.next() < 0.5 ? ["small", "large"] : rng.some(SIZES, 2);
}

const ORDER: Record<ShapeSize, number> = { small: 0, medium: 1, large: 2 };

export const sizeActivity = defineGeneratedActivity({
  id: "size",
  packId: "shapes",
  category: "shapes",
  activityType: "size-comparison",
  kind: "choice",
  ageRange: { min: 3, max: 6 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(SIZE_TILES, level, 2);
    /* One shape and one colour across the whole board, so size is the only
       thing that moves. "Which is bigger, the star or the circle?" is not a
       question with an answer. */
    const shape = rng.pick(ALL_SHAPES) ?? "circle";
    const sizes = sizesFor(tiles, rng);

    /* Matching a size needs a stage to match *to*, and needs the shapes to
       differ so the child is comparing size rather than spotting a copy. */
    const matching = level >= 2 && rng.next() < 0.4;

    if (matching) {
      const target = rng.pick(sizes) ?? "large";
      const others = SIZES.filter((size) => size !== target);
      const shapes = rng.some(
        ALL_SHAPES.filter((other) => other !== shape),
        others.length + 1,
      );

      return {
        level,
        prompt: {
          speech: "Which one is the same size?",
          display: [part(shapeSym(shape, { size: target }).item)],
        },
        payload: board(
          shapeSym(shapes[0] ?? "circle", { size: target }),
          others.map((size, index) =>
            shapeSym(shapes[index + 1] ?? "square", { size }),
          ),
          rng,
        ),
        explanation: "Those two are just the same size.",
        hint: "Ignore the shape. Look at how much room each one takes up.",
        meta: {
          objective: "matches one thing to another by size",
          tags: ["size", concept("size", "same", target)],
        },
      };
    }

    const biggest = rng.next() < 0.5;
    const ranked = [...sizes].sort((a, b) => ORDER[a] - ORDER[b]);
    const answer = biggest ? ranked[ranked.length - 1] : ranked[0];

    return {
      level,
      prompt: {
        speech: biggest
          ? tiles > 2
            ? "Which one is the biggest?"
            : "Which one is bigger?"
          : tiles > 2
            ? "Which one is the smallest?"
            : "Which one is smaller?",
      },
      payload: board(
        shapeSym(shape, { size: answer }),
        ranked
          .filter((size) => size !== answer)
          .map((size) => shapeSym(shape, { size })),
        rng,
      ),
      explanation: biggest
        ? "That one takes up the most room."
        : "That one takes up the least room.",
      hint: "Hold your hands up around each one. Which needs the most space?",
      meta: {
        objective: "compares things by size",
        tags: [
          "size",
          concept("size", biggest ? "biggest" : "smallest", canonical(ranked)),
        ],
      },
    };
  },
});

/* ------------------------------------------------------------- properties */

/**
 * The four questions that can be asked about what a shape is made of.
 *
 * Each one is built from `SHAPE_FACTS` rather than from a list of boards, so
 * the answer is true by construction: a board asking for three corners is
 * assembled by *finding* the shapes with three corners, and every other tile
 * on it is a shape that provably has a different number.
 *
 * A star and a heart never answer a counting question. A star has ten corners
 * and nobody counts those; a heart has one point and two bumps, and "how many
 * corners does a heart have" is a question with no honest answer. Both are
 * marked `countable: false` and both are still perfectly good *distractors*,
 * because a child counting corners on a star arrives at "not three" long
 * before they arrive at ten.
 */
type PropertyRule = "round" | "straight" | "corners" | "count";

const RULES: LevelTable<readonly PropertyRule[]> = {
  1: ["round"],
  2: ["round", "straight", "corners"],
  3: ["corners", "count"],
};

const ROUND_SHAPES = ALL_SHAPES.filter((shape) => SHAPE_FACTS[shape].round);
const ANGULAR_SHAPES = ALL_SHAPES.filter((shape) => !SHAPE_FACTS[shape].round);
/* Shapes whose sides really are straight as drawn. Not the same set as the
   angular ones: the heart has a corner but every side of it curves, so it
   must never be held up as the one with straight sides. */
const STRAIGHT_SHAPES = ALL_SHAPES.filter((shape) => SHAPE_FACTS[shape].sides > 0);
const COUNTABLE_SHAPES = ALL_SHAPES.filter((shape) => SHAPE_FACTS[shape].countable);

interface PropertyBoard {
  speech: string;
  answer: Sym;
  distractors: Sym[];
  display?: ReturnType<typeof part>[];
  explanation: string;
  hint: string;
  idea: readonly (string | number)[];
}

/** Round, against shapes with corners. Only ever one round tile on the board. */
function roundRule(rng: Rng, tiles: number): PropertyBoard {
  const answer = rng.pick(ROUND_SHAPES) ?? "circle";
  return {
    speech: "Which one is round?",
    answer: shapeSym(answer),
    distractors: rng.some(ANGULAR_SHAPES, tiles - 1).map((shape) => shapeSym(shape)),
    explanation: SHAPE_HINTS[answer],
    hint: "A round shape has no corners anywhere on it.",
    idea: ["round", answer],
  };
}

/** Straight sides, against the shapes in the pack drawn with none. */
function straightRule(rng: Rng, tiles: number): PropertyBoard {
  const answer = rng.pick(STRAIGHT_SHAPES) ?? "square";
  return {
    speech: "Which one has straight sides?",
    answer: shapeSym(answer),
    distractors: rng
      .some(ROUND_SHAPES, Math.min(tiles - 1, ROUND_SHAPES.length))
      .map((shape) => shapeSym(shape)),
    explanation: `${capitalise(aOrAn(answer))} has flat sides with corners between them.`,
    hint: "A straight side is flat. A round one curves the whole way.",
    idea: ["straight", answer],
  };
}

/** A number of corners, against shapes that provably have a different number. */
function cornersRule(rng: Rng, tiles: number): PropertyBoard {
  const answer = rng.pick(COUNTABLE_SHAPES) ?? "triangle";
  const corners = SHAPE_FACTS[answer].corners;
  const distractors = rng
    .some(
      ALL_SHAPES.filter((shape) => SHAPE_FACTS[shape].corners !== corners),
      tiles - 1,
    )
    .map((shape) => shapeSym(shape));

  return {
    speech: `Which one has ${corners} corners?`,
    answer: shapeSym(answer),
    distractors,
    explanation: `${capitalise(aOrAn(answer))} has ${corners} corners.`,
    hint: "A corner is where two sides meet. Touch each one as you count.",
    idea: ["corners", corners, answer],
  };
}

/** The same fact asked the other way round: here is a shape, count them. */
function countRule(rng: Rng, tiles: number): PropertyBoard {
  const shape = rng.pick(COUNTABLE_SHAPES) ?? "triangle";
  const sides = rng.next() < 0.5;
  const value = sides ? SHAPE_FACTS[shape].sides : SHAPE_FACTS[shape].corners;
  const near = [3, 4, 5, 6, 7].filter((other) => other !== value);

  return {
    speech: sides
      ? "How many sides does this one have?"
      : "How many corners does this one have?",
    display: [part(shapeSym(shape).item)],
    answer: numberSym(value),
    distractors: rng.some(near, tiles - 1).map(numberSym),
    explanation: sides
      ? `${capitalise(aOrAn(shape))} has ${value} sides.`
      : `${capitalise(aOrAn(shape))} has ${value} corners.`,
    hint: sides
      ? "Trace around the edge with your finger. Count each flat part."
      : "A corner is where two sides meet. Touch each one as you count.",
    idea: [sides ? "count-sides" : "count-corners", shape],
  };
}

const PROPERTY_TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

export const propertiesActivity = defineGeneratedActivity({
  id: "properties",
  packId: "shapes",
  category: "shapes",
  activityType: "shape-properties",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(PROPERTY_TILES, level, 3);
    const rule = rng.pick(forLevel(RULES, level, ["round"])) ?? "round";

    const built =
      rule === "round"
        ? roundRule(rng, tiles)
        : rule === "straight"
          ? straightRule(rng, tiles)
          : rule === "corners"
            ? cornersRule(rng, tiles)
            : countRule(rng, tiles);

    return {
      level,
      prompt: {
        speech: built.speech,
        ...(built.display ? { display: built.display } : {}),
      },
      payload: board(built.answer, built.distractors, rng),
      explanation: built.explanation,
      hint: built.hint,
      meta: {
        objective: "describes a shape by what it is made of",
        tags: ["shape-properties", concept(...built.idea)],
      },
    };
  },
});
