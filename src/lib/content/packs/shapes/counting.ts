import { tellableFrom, TELLABLE_PAIRS } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import { defineGeneratedActivity } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ShapeName } from "../../types";
import {
  ALL_SHAPES,
  aOrAn,
  board,
  colourWord,
  COLOURS,
  concept,
  MUTUAL_TRIO,
  numberSym,
  strip,
  shapeSym,
  SIMPLE_SHAPES,
  type Sym,
} from "./shared";

/**
 * Counting a group by one of its properties, and finding a thing that has two.
 *
 * They live together because they are the same skill pointed in two
 * directions. "How many circles?" needs a child to hold *circle* in mind and
 * ignore everything else in the row; "which one is the blue star?" needs them
 * to hold two things in mind at once. Between them they are where recognising
 * a shape turns into using one.
 *
 * Counting by shape and counting by colour are one activity rather than two,
 * because they are one thing to learn: count the ones that match, ignore the
 * ones that do not. Which property is being matched on is a variation within
 * it, exactly as it is in `same-or-different`.
 */

/* --------------------------------------------------------------- counting */

/**
 * How many things are in the row, by level.
 *
 * The cap is six and it is a layout decision as much as a mathematical one:
 * `PromptDisplay` wraps rather than overflows, so a longer row would still be
 * readable — but a row that takes two lines on a 360px phone is a harder thing
 * to count than the same row on one, and nothing is learned by making it
 * harder in that particular way.
 */
const GROUP: LevelTable<readonly number[]> = {
  1: [3, 4],
  2: [4, 5],
  3: [5, 6],
};

const COUNT_TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/** The row, and what the child is being asked to pick out of it. */
interface Group {
  symbols: Sym[];
  answer: number;
  speech: string;
  explanation: string;
  hint: string;
  attribute: "shape" | "colour";
}

function byShape(rng: Rng, level: Level, size: number): Group {
  const pool = level >= 2 ? ALL_SHAPES : SIMPLE_SHAPES;
  const [target, ...rest] = rng.some(pool, level >= 2 ? 3 : 2);
  const answer = rng.int(1, Math.min(4, size - 1));

  const others = Array.from(
    { length: size - answer },
    (_, index) => rest[index % rest.length] ?? "square",
  );

  return {
    symbols: rng
      .shuffle([...Array.from({ length: answer }, () => target), ...others])
      .map((shape) => shapeSym(shape)),
    answer,
    speech: `How many ${target}s do you see?`,
    explanation: `There ${answer === 1 ? "is" : "are"} ${answer} ${target}${answer === 1 ? "" : "s"}.`,
    hint: `Touch each ${target} as you count it.`,
    attribute: "shape",
  };
}

function byColour(rng: Rng, level: Level, size: number): Group {
  /* One shape for the whole row, so colour is the only thing being counted —
     and a palette where every colour is tellable from every other one, or the
     row contains things a child cannot sort. */
  const shape = rng.pick(level >= 2 ? ALL_SHAPES : SIMPLE_SHAPES) ?? "circle";
  const palette: readonly Accent[] =
    level >= 2
      ? rng.shuffle(MUTUAL_TRIO)
      : rng.shuffle(rng.pick(TELLABLE_PAIRS) ?? TELLABLE_PAIRS[0]);

  const [target, ...rest] = palette;
  const answer = rng.int(1, Math.min(4, size - 1));
  const others = Array.from(
    { length: size - answer },
    (_, index) => rest[index % rest.length] ?? "tide",
  );

  const word = colourWord(target);
  return {
    symbols: rng
      .shuffle([...Array.from({ length: answer }, () => target), ...others])
      .map((accent) => shapeSym(shape, { accent })),
    answer,
    speech: `How many ${word} ones do you see?`,
    explanation: `There ${answer === 1 ? "is" : "are"} ${answer} ${word} one${answer === 1 ? "" : "s"}.`,
    hint: `Touch each ${word} one as you count it.`,
    attribute: "colour",
  };
}

/**
 * Numbers a child might genuinely have arrived at.
 *
 * The size of the whole row is always offered, because counting everything
 * instead of counting the matching ones is the mistake this question exists to
 * catch. The rest are its neighbours: a board of 3, 4 and 9 teaches a child to
 * pick the small numbers rather than to count.
 */
function nearNumbers(answer: number, size: number, count: number, rng: Rng): Sym[] {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2].filter(
    (value) => value >= 1 && value <= 9 && value !== answer,
  );
  const chosen = [
    ...(size !== answer ? [size] : []),
    ...rng.shuffle(near.filter((value) => value !== size)),
  ];
  return chosen.slice(0, count).map(numberSym);
}

export const countingActivity = defineGeneratedActivity({
  id: "counting",
  packId: "shapes",
  title: "How many?",
  category: "shapes",
  activityType: "counting",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const size = rng.pick(forLevel(GROUP, level, [3, 4])) ?? 4;
    const tiles = forLevel(COUNT_TILES, level, 3);
    const group = rng.next() < 0.5 ? byShape(rng, level, size) : byColour(rng, level, size);

    return {
      level,
      prompt: { speech: group.speech, display: strip(group.symbols) },
      payload: board(
        numberSym(group.answer),
        nearNumbers(group.answer, size, tiles - 1, rng),
        rng,
      ),
      explanation: group.explanation,
      hint: group.hint,
      meta: {
        objective: "counts the things in a group that match",
        tags: ["counting", concept("count", group.attribute, group.answer, size)],
      },
    };
  },
});

/* --------------------------------------------------------------- classify */

/**
 * Two properties at once: not a star, not a blue thing — the blue star.
 *
 * Every wrong tile is wrong in exactly one way, and that is the design. One
 * has the right shape and the wrong colour, one the right colour and the wrong
 * shape, and at level three one is wrong twice over. A child who is only
 * looking at colour will find a tile that satisfies them, and so will a child
 * who is only looking at shape — which is what makes the question about
 * holding both in mind rather than about either one.
 *
 * There is no level one here on purpose. Combining two properties is a level
 * two idea; a round asking for it at level one would only be asking a level
 * two question in a quieter voice.
 */
const CLASSIFY_POOL: LevelTable<readonly ShapeName[]> = {
  2: [...SIMPLE_SHAPES, "diamond"],
  3: ALL_SHAPES,
};

const CLASSIFY_TILES: LevelTable<number> = { 2: 3, 3: 4 };

export const classifyActivity = defineGeneratedActivity({
  id: "classify",
  packId: "shapes",
  title: "Shape and colour",
  category: "shapes",
  activityType: "classifying",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [2, 3],
  generate: ({ level, rng }) => {
    const pool = forLevel(CLASSIFY_POOL, level, CLASSIFY_POOL[2] ?? ALL_SHAPES);
    const tiles = forLevel(CLASSIFY_TILES, level, 3);

    const shape = rng.pick(pool) ?? "circle";
    const accent = rng.pick(COLOURS) ?? "tide";
    /* Every other colour on the board has to be one the child can see is not
       the answer's colour, or "the blue star" has two answers. */
    const partners = rng.shuffle(tellableFrom(accent));
    const otherShapes = rng.some(
      pool.filter((other) => other !== shape),
      2,
    );

    const distractors = [
      /* Right shape, wrong colour. */
      shapeSym(shape, { accent: partners[0] ?? "tide" }),
      /* Right colour, wrong shape. */
      shapeSym(otherShapes[0] ?? "square", { accent }),
      /* Wrong twice over — only once the board is big enough for it. */
      ...(tiles > 3
        ? [
            shapeSym(otherShapes[1] ?? "triangle", {
              accent: partners[1 % partners.length] ?? "tide",
            }),
          ]
        : []),
    ];

    const word = colourWord(accent);
    return {
      level,
      prompt: { speech: `Which one is the ${word} ${shape}?` },
      payload: board(shapeSym(shape, { accent }), distractors, rng),
      explanation: `That one is ${aOrAn(shape)}, and it is ${word}.`,
      hint: "Two things to check. Find the right shape, then the right colour.",
      meta: {
        objective: "finds the thing that matches two properties at once",
        tags: ["classifying", concept("classify", shape, accent)],
      },
    };
  },
});
