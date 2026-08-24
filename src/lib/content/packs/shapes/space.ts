import { defineGeneratedActivity } from "../../activity";
import { RELATION_WORDS } from "../../challenges";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { SpatialRelation } from "../../types";
import {
  ALL_SHAPES,
  board,
  canonical,
  concept,
  CONTAINER_SHAPES,
  gapAt,
  MUTUAL_TRIO,
  sceneSym,
  shapeItemOf,
  shapeSym,
  SIMPLE_SHAPES,
  type Sym,
} from "./shared";

/**
 * Where things are, and rows that read the same both ways.
 *
 * Two activities that both need something drawn rather than described.
 * `position` needs two shapes in one picture — a star cannot be *inside* a box
 * if the star and the box are two separate tiles sitting beside each other —
 * which is what `SceneItem` exists for. `symmetry` needs a row with a gap in
 * the middle of it, which is what `gapAt` exists for.
 *
 * Neither uses drag and drop. "Put the star above the box" is a lovely
 * activity and a terrible one to build for a four year old on a phone: a
 * finger that slips is an answer they did not mean, and a child cannot tell a
 * mistake in their thinking from a mistake in their hand. So the question is
 * asked the other way round — here are three pictures, which one shows it —
 * and the interaction stays the one tap the whole product is built on.
 */

/* --------------------------------------------------------------- position */

/**
 * Which relations may be offered against which.
 *
 * A family is a set of answers that differ *only* in the word being asked
 * about, so the board is a fair test of the word. They are also the fence
 * around a drawing problem: `beside` and `to the right of` put the same shape
 * in nearly the same place, so they are never offered together, and `near` and
 * `far` are only meaningful against each other. Both facts live here, in the
 * content, rather than in the renderer.
 */
const FAMILIES: readonly (readonly SpatialRelation[])[] = [
  ["above", "below"],
  ["above", "below", "beside"],
  ["left", "right"],
  ["left", "right", "above"],
  ["inside", "outside"],
  ["near", "far"],
];

/** Relations whose drawing needs an anchor with a middle to sit in. */
const NEEDS_CONTAINER: readonly SpatialRelation[] = ["inside", "outside"];

/**
 * Relations worth asking "which shape is there?" about.
 *
 * A scene holds two shapes, so *which shape is next to the box* has an answer
 * a child can reach without knowing what "next to" means — there is only one
 * other shape in the picture. `above`, `below`, `left` and `right` are asked
 * this way because the anchor is a genuine wrong answer to them; `near`, `far`
 * and `beside` are not.
 */
const NAMEABLE: readonly SpatialRelation[] = [
  "above",
  "below",
  "left",
  "right",
  "inside",
  "outside",
];

const POSITION_TILES: LevelTable<number> = { 1: 2, 2: 3, 3: 3 };

/** The two shapes a scene is built from, chosen so they cannot be confused. */
function actors(rng: Rng, relation: SpatialRelation, level: number) {
  const anchorPool = NEEDS_CONTAINER.includes(relation)
    ? CONTAINER_SHAPES
    : level >= 3
      ? ALL_SHAPES
      : SIMPLE_SHAPES;
  const anchor = rng.pick(anchorPool) ?? "square";
  const subject =
    rng.pick(
      (level >= 3 ? ALL_SHAPES : SIMPLE_SHAPES).filter(
        (shape) => shape !== anchor,
      ),
    ) ?? "star";

  return {
    anchor: shapeItemOf(shapeSym(anchor)),
    subject: shapeItemOf(shapeSym(subject)),
    anchorName: anchor,
    subjectName: subject,
  };
}

export const positionActivity = defineGeneratedActivity({
  id: "position",
  packId: "shapes",
  title: "Where is it?",
  category: "shapes",
  activityType: "position",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(POSITION_TILES, level, 2);
    const family =
      rng.pick(FAMILIES.filter((group) => group.length <= tiles)) ?? FAMILIES[0];
    const relation = rng.pick(family) ?? "above";
    const cast = actors(rng, relation, level);

    /* From level two, the question is sometimes turned around: the picture
       becomes the question and the shapes become the answers. Same relation,
       same drawing, a different thing to work out. */
    const naming = level >= 2 && NAMEABLE.includes(relation) && rng.next() < 0.4;

    if (naming) {
      const others = rng.some(
        (level >= 3 ? ALL_SHAPES : SIMPLE_SHAPES).filter(
          (shape) => shape !== cast.subjectName && shape !== cast.anchorName,
        ),
        tiles - 2,
      );

      return {
        level,
        prompt: {
          speech: `Which shape is ${RELATION_WORDS[relation]} ${cast.anchorName}?`,
          display: [
            {
              kind: "item" as const,
              item: sceneSym(cast.subject, cast.anchor, relation).item,
            },
          ],
        },
        payload: board(
          shapeSym(cast.subjectName),
          [shapeSym(cast.anchorName), ...others.map((shape) => shapeSym(shape))],
          rng,
        ),
        explanation: `The ${cast.subjectName} is ${RELATION_WORDS[relation]} ${cast.anchorName}.`,
        hint: `Find the ${cast.anchorName} first. Then look ${RELATION_WORDS[relation].replace(/ the$/, "")} it.`,
        meta: {
          objective: "names the thing in a given place",
          tags: ["position", concept("which-shape", relation)],
        },
      };
    }

    const others = family.filter((other) => other !== relation);
    return {
      level,
      prompt: {
        speech: `Which one shows the ${cast.subjectName} ${RELATION_WORDS[relation]} ${cast.anchorName}?`,
      },
      payload: board(
        sceneSym(cast.subject, cast.anchor, relation),
        others.map((other) => sceneSym(cast.subject, cast.anchor, other)),
        rng,
      ),
      explanation: `That one has the ${cast.subjectName} ${RELATION_WORDS[relation]} ${cast.anchorName}.`,
      hint: `Find the ${cast.anchorName} in each box, then look at where the ${cast.subjectName} is.`,
      meta: {
        objective: "recognises where one thing is next to another",
        tags: ["position", concept("where", relation, canonical(others))],
      },
    };
  },
});

/* --------------------------------------------------------------- symmetry */

/**
 * A row that reads the same from either end, with one thing missing.
 *
 * `● ▲ ■ ▲ ●` with a gap. This is deliberately *not* Logic's repeating
 * pattern: a repeat is read left to right and continued off the end, and a
 * mirror is read from both ends towards the middle. The gap proves it. Logic's
 * gap is always at the end, because a repeat is a thing you continue; the gap
 * here moves, because a mirror is a thing you complete — and if the gap always
 * sat at the end, a child could answer every one of these by copying the tile
 * at the far end without ever seeing the middle.
 *
 * The middle of an odd row is the one place a gap never goes: `● ▲ ? ▲ ●` is
 * mirrored whatever sits in the gap, so it is not a question.
 */
type MirrorAttribute = "shape" | "colour";

interface Mirror {
  /** The row, written out. */
  keys: readonly number[];
  gaps: readonly number[];
}

/** `a b b a` and `a b c b a`, as indexes into a list of symbols. */
const FORMS: readonly Mirror[] = [
  { keys: [0, 1, 1, 0], gaps: [0, 1, 2, 3] },
  { keys: [0, 1, 2, 1, 0], gaps: [0, 1, 3, 4] },
];

const MIRROR_TILES: LevelTable<number> = { 2: 3, 3: 4 };

export const symmetryActivity = defineGeneratedActivity({
  id: "symmetry",
  packId: "shapes",
  title: "The same both ways",
  category: "shapes",
  activityType: "symmetry",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  host: "bibi",
  levels: [2, 3],
  generate: ({ level, rng }) => {
    const tiles = forLevel(MIRROR_TILES, level, 3);
    /* Level two mirrors the short row; level three brings in the long one,
       where the thing to be matched is no longer at the end. */
    const form = level >= 3 ? (rng.pick(FORMS) ?? FORMS[0]) : FORMS[0];
    const attribute: MirrorAttribute = rng.next() < 0.5 ? "shape" : "colour";
    const distinct = Math.max(...form.keys) + 1;

    /* Colour rows are one shape in mirrored colours, and every colour on the
       board is tellable from every other one — a mirror a child cannot see is
       not a mirror. */
    const shape = rng.pick(ALL_SHAPES) ?? "circle";
    const palette = rng.shuffle(MUTUAL_TRIO);
    const shapes = rng.some(
      level >= 3 ? ALL_SHAPES : SIMPLE_SHAPES,
      distinct + 1,
    );

    const symbolAt = (index: number): Sym =>
      attribute === "colour"
        ? shapeSym(shape, { accent: palette[index % palette.length] })
        : shapeSym(shapes[index] ?? "circle");

    const row = form.keys.map((key) => symbolAt(key));
    const gap = rng.pick(form.gaps) ?? 0;
    const answer = row[form.keys.length - 1 - gap];

    const pool = Array.from({ length: distinct + 1 }, (_, index) => symbolAt(index));
    const distractors = pool.filter((symbol) => symbol.key !== answer.key);

    return {
      level,
      prompt: {
        speech: "Which one makes both sides the same?",
        display: gapAt(row, gap),
      },
      payload: board(answer, distractors.slice(0, tiles - 1), rng),
      explanation: "Now it reads the same way from both ends.",
      hint: "Start at both ends and walk in. The two ends should match.",
      meta: {
        objective: "completes a row that is the same from both ends",
        tags: [
          "symmetry",
          concept("mirror", form.keys.length, gap, attribute),
        ],
      },
    };
  },
});
