import { TELLABLE_PAIRS, tellableFrom } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ShapeName } from "../../types";
import {
  aOrAn,
  ALL_SHAPES,
  board,
  canonical,
  COLOUR_HINTS,
  colourWord,
  COLOURS,
  concept,
  lookalikesOf,
  MUTUAL_TRIO,
  SHAPE_HINTS,
  shapeSym,
  SIMPLE_SHAPES,
  type Sym,
} from "./shared";

/**
 * Naming things — the two questions everything else in this pack rests on.
 *
 * `shape-names` asks *which one is a triangle*, `colour-names` asks *which one
 * is yellow*, and between them they are the whole of what "recognition" means
 * at four years old. They are separate activities because they are separate
 * skills: a child who can name every shape may not yet have the colour words,
 * and a round that mixed them into one activity could not tell.
 */

/* ------------------------------------------------------------- shape names */

const SHAPE_TILES: LevelTable<number> = { 1: 3, 2: 4, 3: 4 };

/**
 * Which shapes each level draws from, and whether a lookalike is allowed on
 * the board.
 *
 * This is the entire difficulty curve of the activity, and it is a content
 * decision rather than a rendering one: the same five shapes at level one, all
 * nine at level two, and at level three the board is built *around* the
 * confusion — a square offered beside a rectangle, a circle beside an oval.
 * "Harder" here means a question that needs a closer look, never a question
 * asked faster or worth fewer points.
 */
const SHAPE_POOL: LevelTable<readonly ShapeName[]> = {
  1: SIMPLE_SHAPES,
  2: ALL_SHAPES,
  3: ALL_SHAPES,
};

export const shapeNamesActivity = defineGeneratedActivity({
  id: "shape-names",
  packId: "shapes",
  category: "shapes",
  activityType: "shape-recognition",
  kind: "choice",
  ageRange: { min: 3, max: 6 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const pool = forLevel(SHAPE_POOL, level, SIMPLE_SHAPES);
    const tiles = forLevel(SHAPE_TILES, level, 3);
    const confusing = level >= 3;

    /* At level three the target has to *have* a lookalike, or there is no
       harder question to ask; every shape in the nine-shape pool that has one
       is fair game. */
    const targets = confusing
      ? pool.filter((shape) => lookalikesOf(shape).length > 0)
      : pool;
    const target = rng.pick(targets) ?? "circle";

    const lookalikes = lookalikesOf(target);
    const twin = confusing ? rng.pick(lookalikes) : undefined;

    /* Everything else on the board is a shape nobody could mistake for the
       answer, so the one hard comparison at level three is the one the
       challenge is about rather than an accident of the deal. */
    const rest = pool.filter(
      (shape) =>
        shape !== target && shape !== twin && !lookalikes.includes(shape),
    );

    const distractors = [
      ...(twin ? [twin] : []),
      ...rng.some(rest, tiles - 1 - (twin ? 1 : 0)),
    ].map((shape) => shapeSym(shape));

    return {
      level,
      prompt: { speech: `Which one is ${aOrAn(target)}?` },
      payload: board(shapeSym(target), distractors, rng),
      explanation: `Yes! That one is ${aOrAn(target)}.`,
      hint: SHAPE_HINTS[target],
      meta: {
        objective: "names a shape by its outline",
        tags: [
          "shapes",
          concept("find-shape", target, twin ? `beside-${twin}` : "clear"),
        ],
      },
    };
  },
});

/* ------------------------------------------------------------ colour names */

/**
 * How a colour board is built, and why there are two ways.
 *
 * **One shape, every tile.** Nothing but the colour moves, which is the purest
 * form of the question — and it costs something: every tile has to be tellable
 * from every *other* tile, not just from the answer, or the board appears to
 * show the same tile twice. Only blue, pink and green manage that as a trio,
 * so a one-shape board is two or three tiles and no more.
 *
 * **A different shape on every tile.** Now two tiles that share a hue are
 * still visibly two tiles, so the rule relaxes to the one that actually
 * matters: every distractor must be a colour the child can see is *not* the
 * answer. That is what lets yellow and orange be asked about at all — yellow
 * has exactly one partner in the whole palette that survives colour-blindness,
 * and a board of one yellow star and three blue things is a fair question
 * where a board of yellow, green and orange is not.
 */
type ColourForm = "one-shape" | "many-shapes";

const COLOUR_FORMS: LevelTable<readonly ColourForm[]> = {
  1: ["one-shape"],
  2: ["one-shape", "many-shapes"],
  3: ["many-shapes"],
};

const COLOUR_TILES: LevelTable<number> = { 1: 2, 2: 3, 3: 4 };

/** One shape, two or three colours, all of them tellable from each other. */
function oneShapeBoard(
  rng: Rng,
  tiles: number,
): { target: Accent; symbols: Sym[]; others: Accent[] } {
  const shape = rng.pick(ALL_SHAPES) ?? "circle";
  const palette =
    tiles >= 3
      ? rng.shuffle(MUTUAL_TRIO)
      : rng.shuffle(rng.pick(TELLABLE_PAIRS) ?? TELLABLE_PAIRS[0]);

  const [target, ...others] = palette;
  return {
    target,
    others,
    symbols: [target, ...others].map((accent) => shapeSym(shape, { accent })),
  };
}

/** A different shape on every tile, and every colour tellable from the answer. */
function manyShapeBoard(
  rng: Rng,
  tiles: number,
): { target: Accent; symbols: Sym[]; others: Accent[] } {
  const target = rng.pick(COLOURS) ?? "tide";
  const partners = tellableFrom(target);
  const shapes = rng.some(ALL_SHAPES, tiles);

  const others = Array.from(
    { length: tiles - 1 },
    (_, index) => partners[index % partners.length] ?? "tide",
  );

  return {
    target,
    others,
    symbols: [target, ...others].map((accent, index) =>
      shapeSym(shapes[index] ?? "circle", { accent }),
    ),
  };
}

export const colourNamesActivity = defineGeneratedActivity({
  id: "colour-names",
  packId: "shapes",
  category: "colours",
  activityType: "colour-recognition",
  kind: "choice",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const form = rng.pick(forLevel(COLOUR_FORMS, level, ["one-shape"])) ?? "one-shape";
    const tiles = forLevel(COLOUR_TILES, level, 2);

    const built =
      form === "one-shape" ? oneShapeBoard(rng, tiles) : manyShapeBoard(rng, tiles);

    const [answer, ...distractors] = built.symbols;
    const word = colourWord(built.target);

    return {
      level,
      prompt: { speech: `Which one is ${word}?` },
      payload: board(answer, distractors, rng),
      explanation: `That one is ${word}.`,
      hint: COLOUR_HINTS[built.target],
      meta: {
        objective: "names a colour",
        tags: [
          "colours",
          concept("find-colour", form, built.target, canonical([...new Set(built.others)])),
        ],
      },
    };
  },
});
