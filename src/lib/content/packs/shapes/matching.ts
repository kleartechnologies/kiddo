import { tellableFrom, TELLABLE_PAIRS } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import { defineGeneratedActivity } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ShapeItem, ShapeName, ShapeSize } from "../../types";
import {
  ALL_SHAPES,
  board,
  canonical,
  colourWord,
  COLOURS,
  concept,
  lookalikesOf,
  MUTUAL_TRIO,
  pairWords,
  part,
  sceneSym,
  shapeItemOf,
  shapeSym,
  SIMPLE_SHAPES,
  type Sym,
} from "./shared";

/**
 * Matching, and telling apart — the two halves of one idea.
 *
 * `matching` holds a thing up and asks for another one like it: same shape, or
 * same colour, and never both at once. `same-or-different` puts two things in
 * a box and asks whether they match. A child who can do the first can usually
 * not yet do the second, which is why they are two activities and why the
 * second starts a level later in a round.
 *
 * Both are built so the *other* property cannot answer the question. Asked for
 * the same shape, the answer is deliberately a different colour from the thing
 * on the stage, and one of the wrong tiles is deliberately the same colour. A
 * child who matches by colour gets it wrong, gently, and looks again — which
 * is the whole lesson.
 */

/* --------------------------------------------------------------- matching */

const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

const POOL: LevelTable<readonly ShapeName[]> = {
  1: SIMPLE_SHAPES,
  2: ALL_SHAPES,
  3: ALL_SHAPES,
};

/**
 * Two colours that are certainly not each other.
 *
 * Used where a *shape* is the question: the stage and its answer must differ
 * in colour, or a child could match the hue and never look at the outline.
 * They come off the tellable list because a difference nobody can see is not a
 * difference.
 */
function twoColours(rng: Rng): [Accent, Accent] {
  const pair = rng.pick(TELLABLE_PAIRS) ?? TELLABLE_PAIRS[0];
  return rng.next() < 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]];
}

interface MatchBoard {
  stage: Sym;
  answer: Sym;
  distractors: Sym[];
  speech: string;
  explanation: string;
  hint: string;
  idea: readonly (string | number)[];
}

/** Same outline, different colour, with a colour trap standing beside it. */
function byShape(rng: Rng, level: Level, tiles: number): MatchBoard {
  const pool = forLevel(POOL, level, SIMPLE_SHAPES);
  const target = rng.pick(pool) ?? "circle";
  const [stageColour, answerColour] = twoColours(rng);

  const lookalikes = lookalikesOf(target);
  const twin = level >= 3 ? rng.pick(lookalikes) : undefined;
  const rest = pool.filter(
    (shape) => shape !== target && shape !== twin && !lookalikes.includes(shape),
  );
  const others = rng.some(rest, tiles - 1 - (twin ? 1 : 0));

  return {
    stage: shapeSym(target, { accent: stageColour }),
    answer: shapeSym(target, { accent: answerColour }),
    /* The first wrong tile wears the stage's own colour on purpose. */
    distractors: [
      ...(twin ? [shapeSym(twin, { accent: stageColour })] : []),
      ...others.map((shape, index) =>
        shapeSym(shape, {
          accent: index === 0 && !twin ? stageColour : answerColour,
        }),
      ),
    ],
    speech: "Which one is the same shape?",
    explanation: `Both of them are ${target}s.`,
    hint: "Look at the shape, not the colour.",
    idea: ["match-shape", target, twin ? `beside-${twin}` : "clear"],
  };
}

/** Same colour, different outline, with a shape trap standing beside it. */
function byColour(rng: Rng, level: Level, tiles: number): MatchBoard {
  const pool = forLevel(POOL, level, SIMPLE_SHAPES);
  const target = rng.pick(COLOURS) ?? "tide";
  const partners = tellableFrom(target);
  const shapes = rng.some(pool, tiles + 1);

  const [stageShape, answerShape, ...otherShapes] = shapes;

  return {
    stage: shapeSym(stageShape, { accent: target }),
    answer: shapeSym(answerShape, { accent: target }),
    /* The first wrong tile is the stage's own shape in another colour. */
    distractors: [
      shapeSym(stageShape, { accent: partners[0] ?? "tide" }),
      ...otherShapes
        .slice(0, tiles - 2)
        .map((shape, index) =>
          shapeSym(shape, {
            accent: partners[(index + 1) % partners.length] ?? "tide",
          }),
        ),
    ],
    speech: "Which one is the same colour?",
    explanation: `Both of them are ${colourWord(target)}.`,
    hint: "Look at the colour, not the shape.",
    idea: ["match-colour", target],
  };
}

export const matchingActivity = defineGeneratedActivity({
  id: "matching",
  packId: "shapes",
  category: "shapes",
  activityType: "matching",
  kind: "choice",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(TILES, level, 3);
    const built = rng.next() < 0.5 ? byShape(rng, level, tiles) : byColour(rng, level, tiles);

    return {
      level,
      prompt: { speech: built.speech, display: [part(built.stage.item)] },
      payload: board(built.answer, built.distractors, rng),
      explanation: built.explanation,
      hint: built.hint,
      meta: {
        objective: "matches one property and ignores the other",
        tags: ["matching", concept(...built.idea)],
      },
    };
  },
});

/* ------------------------------------------------------- same or different */

/**
 * Which property the two things in a box differ by.
 *
 * Every board is built from a rule and a small set of values: three shapes,
 * three colours, three sizes. The board is then derived from the rule — one
 * tile showing a matching pair and the rest showing mismatched ones, or the
 * other way round — so "exactly one right answer" is a property of the
 * generator. A board is never assembled and then checked.
 */
type Attribute = "shape" | "colour" | "size";

const ATTRIBUTES: LevelTable<readonly Attribute[]> = {
  1: ["shape"],
  2: ["shape", "colour"],
  3: ["shape", "colour", "size"],
};

const PAIR_TILES: LevelTable<number> = { 1: 2, 2: 3, 3: 3 };

const SIZES: readonly ShapeSize[] = ["small", "medium", "large"];

/** The values a rule is written in, and the name that idea goes by. */
interface Values {
  /** Each value, as a tile-ready shape. */
  make: (index: number) => Sym;
  count: number;
  detail: string;
  hint: string;
}

function shapeValues(rng: Rng, level: Level): Values {
  const pool = forLevel(POOL, level, SIMPLE_SHAPES);
  /* At level three the two that could be confused are put in deliberately,
     so the question is genuinely "is a square a rectangle?". */
  const lookalike = level >= 3 && rng.next() < 0.6;
  const first = rng.pick(
    lookalike ? pool.filter((shape) => lookalikesOf(shape).length > 0) : pool,
  ) ?? "circle";
  const second = lookalike
    ? rng.pick(lookalikesOf(first)) ?? "square"
    : rng.pick(pool.filter((shape) => shape !== first && !lookalikesOf(first).includes(shape))) ??
      "square";
  const third =
    rng.pick(
      pool.filter(
        (shape) =>
          shape !== first && shape !== second && !lookalikesOf(first).includes(shape),
      ),
    ) ?? "triangle";

  const shapes = [first, second, third];
  return {
    make: (index) => shapeSym(shapes[index % shapes.length]),
    count: shapes.length,
    detail: lookalike ? "lookalike" : "clear",
    hint: "Look at the shapes in each box.",
  };
}

function colourValues(rng: Rng, tiles: number): Values {
  const shape = rng.pick(ALL_SHAPES) ?? "circle";
  /* Every colour on the board has to be tellable from every other one: two
     tiles that look the same colour would read as the same tile. */
  const palette =
    tiles >= 3
      ? rng.shuffle(MUTUAL_TRIO)
      : rng.shuffle(rng.pick(TELLABLE_PAIRS) ?? TELLABLE_PAIRS[0]);

  return {
    make: (index) => shapeSym(shape, { accent: palette[index % palette.length] }),
    count: palette.length,
    detail: canonical(palette),
    hint: "Look at the colours in each box.",
  };
}

function sizeValues(rng: Rng, tiles: number): Values {
  const shape = rng.pick(ALL_SHAPES) ?? "circle";
  const sizes = tiles >= 3 ? rng.shuffle(SIZES) : rng.some(SIZES, 2);

  return {
    make: (index) => shapeSym(shape, { size: sizes[index % sizes.length] }),
    count: sizes.length,
    detail: canonical(sizes),
    hint: "Look at how big each one is.",
  };
}

/** Two shapes side by side in one box, named the way a child would name them. */
function pair(a: Sym, b: Sym): Sym {
  const left = shapeItemOf(a);
  const right = shapeItemOf(b);
  return sceneSym(
    left,
    right,
    "beside",
    pairWords(left.item as ShapeItem, right.item as ShapeItem),
  );
}

export const sameDifferentActivity = defineGeneratedActivity({
  id: "same-different",
  packId: "shapes",
  category: "shapes",
  activityType: "same-or-different",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(PAIR_TILES, level, 2);
    const attribute = rng.pick(forLevel(ATTRIBUTES, level, ["shape"])) ?? "shape";
    const values =
      attribute === "shape"
        ? shapeValues(rng, level)
        : attribute === "colour"
          ? colourValues(rng, tiles)
          : sizeValues(rng, tiles);

    /* "Same" asks for the one matching pair among mismatched ones;
       "different" asks for the one mismatched pair among matching ones. Both
       are the same board turned inside out, so both are built the same way. */
    const asksSame = rng.next() < 0.5;
    const matched = (index: number) => pair(values.make(index), values.make(index));
    const mixed = (a: number, b: number) => pair(values.make(a), values.make(b));

    const answer = asksSame ? matched(0) : mixed(0, 1);
    const distractors = asksSame
      ? [mixed(1, 2 % values.count), mixed(2 % values.count, 0)]
      : [matched(1), matched(2 % values.count)];

    return {
      level,
      prompt: {
        speech: asksSame
          ? "Which box shows two that are the same?"
          : "Which box shows two that are different?",
      },
      payload: board(answer, distractors.slice(0, tiles - 1), rng),
      explanation: asksSame
        ? "Those two match each other."
        : "Those two are not the same.",
      hint: values.hint,
      meta: {
        objective: asksSame
          ? "spots two things that match"
          : "spots two things that do not match",
        tags: [
          "same-or-different",
          concept("same-diff", asksSame ? "same" : "different", attribute, values.detail),
        ],
      },
    };
  },
});
