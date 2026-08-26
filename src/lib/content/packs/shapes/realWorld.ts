import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair, ShapeName } from "../../types";
import {
  aOrAn,
  ALL_SHAPES,
  areLookalikes,
  board,
  capitalise,
  concept,
  part,
  shapeSym,
  type Sym,
} from "./shared";

/**
 * Shapes in the world.
 *
 * Every other activity in this pack asks about a shape that was drawn for the
 * question. This one asks about a door, a slice of pizza and an egg, which is
 * the whole reason a child learns shape names at all: a shape is not a tile,
 * it is what the things around you are made of. A child who can find the
 * triangle on a board and cannot see one in a tent has learned a word rather
 * than an idea.
 *
 * Two ways to play, one table of facts behind both:
 *
 * - `shapeObjects` is a `choice`. One picture on the stage, three or four
 *   shapes on the tiles. "What shape is a door?"
 * - `shapePartners` is a `connect`. Two, three or four things and all of
 *   their shapes, in the wrong order, with nothing said about where to start.
 *
 * The `ActivityType` is `shape-recognition` on both, so a session that wants
 * to teach shapes can reach for either; the `ChallengeKind` differs, so
 * `ChoiceStage` draws one and `ConnectStage` draws the other, and **neither
 * engine was touched to make it happen.** This is the first `connect` in the
 * pack and it needed no new machinery at all.
 *
 * ## Why the table is short
 *
 * Because a thing only earns a place on it if it is *plainly* that shape at
 * tile size, in every country, in every emoji font. A house is a square with a
 * triangle on top and belongs to neither; a wheel is a circle with another
 * circle in it; a phone is a rectangle with rounded corners that a child will
 * be told is not a rectangle by the next grown-up they ask. Fourteen things
 * survived that, and fourteen honest facts are worth more than forty arguable
 * ones.
 *
 * `avoid` is the same device `general-knowledge/habitats.ts` uses. A window is
 * a square in this table and rectangular in half the houses a child has been
 * in, so it says so, and no board ever offers it a rectangle to be wrong
 * against.
 *
 * ## How a level gets harder
 *
 * | | choice tiles / connect lines | what is added |
 * |-|------------------------------|---------------|
 * |1| 3 / 2 | circles, triangles and a book — shapes with nothing like them on the board |
 * |2| 3 / 3 | squares and ovals, and things named rather than held |
 * |3| 4 / 4 | a lookalike stands beside the answer: an oval against a circle, a square against a rectangle |
 *
 * The lever is what the wrong tiles are, never a clock. A child who wants to
 * count the corners of every tile on a level three board has all the time
 * there is.
 */

/* ------------------------------------------------------------------ facts */

interface Thing {
  /** The word for it, without an article. "door", "slice of pizza". */
  name: string;
  glyph: string;
  shape: ShapeName;
  /** Shapes this thing is also arguably drawn as, and so may never face. */
  avoid?: readonly ShapeName[];
  level: 1 | 2 | 3;
}

const THINGS: readonly Thing[] = [
  /* Level 1 — things a child has held, in shapes with nothing like them. */
  { name: "football", glyph: "⚽", shape: "circle", level: 1 },
  { name: "biscuit", glyph: "🍪", shape: "circle", level: 1 },
  { name: "slice of pizza", glyph: "🍕", shape: "triangle", level: 1 },
  { name: "book", glyph: "📕", shape: "rectangle", level: 1 },

  /* Level 2 — things named more often than handled, and two new shapes. */
  { name: "clock", glyph: "🕐", shape: "circle", level: 2 },
  { name: "orange", glyph: "🍊", shape: "circle", level: 2 },
  { name: "tent", glyph: "⛺", shape: "triangle", level: 2 },
  { name: "door", glyph: "🚪", shape: "rectangle", level: 2 },
  /* The waffle every platform draws is a *round* one, so round is the fact —
     a child answers about the picture in front of them, not the word. Plenty
     of real waffles are square, though, so — like the window and its
     rectangle — a square never stands against it. */
  { name: "waffle", glyph: "🧇", shape: "circle", avoid: ["square"], level: 2 },
  { name: "egg", glyph: "🥚", shape: "oval", level: 2 },

  /* Level 3 — the shapes that need looking at rather than recognising. */
  { name: "television", glyph: "📺", shape: "rectangle", level: 3 },
  /* Plenty of real windows are rectangular. The fact is still worth teaching
     and the argument is not, so a rectangle never stands against it. */
  { name: "window", glyph: "🪟", shape: "square", avoid: ["rectangle"], level: 3 },
  { name: "lemon", glyph: "🍋", shape: "oval", level: 3 },
  { name: "kite", glyph: "🪁", shape: "diamond", level: 3 },
];

/**
 * The honest content count: fourteen things a child can learn the shape of.
 *
 * Not the boards. Fourteen facts make hundreds of four-line connect boards,
 * and a board is an arrangement of facts rather than a fact. Both activities
 * below draw on this one list, so teaching the same fact two ways adds two
 * ways to practise and no new curriculum.
 */
export const SHAPE_OBJECT_FACTS: readonly Thing[] = THINGS;

/** The picture tile for a thing. The label is what a screen reader says. */
function pictureOf(thing: Thing): Sym {
  return {
    key: `thing-${thing.name.replace(/\s+/g, "-")}`,
    item: { kind: "picture", glyph: thing.glyph, label: aOrAn(thing.name) },
  };
}

/** Which things a level may ask about. Level three is the whole table. */
function poolAtLevel(level: Level): readonly Thing[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return THINGS.filter((thing) => thing.level <= ceiling);
}

/**
 * A hint that sends the child back to looking.
 *
 * `SHAPE_HINTS` would be the obvious thing to reach for and it cannot be used
 * here: every one of those sentences names the shape it describes, and on this
 * board the shape's name is the answer. So the hint says where to look
 * instead, which is what a hint is for.
 */
const LOOK = "Look at the edges. Are they straight or round, and how many corners are there?";

/* --------------------------------------------- one thing, three or four shapes */

/** Three tiles, and four when a lookalike joins them. */
const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 4 };

/**
 * The wrong shapes for one board.
 *
 * Below level three every distractor is a shape the answer could not be
 * confused with, so the question is *do you know this shape*. At level three
 * one lookalike is put in on purpose — an oval against a circle, a rectangle
 * against a square — so the question becomes *can you tell these two apart*,
 * which is a later and harder thing. The `avoid` list is honoured at every
 * level, so a fact that has a genuine second answer never gets asked with it.
 */
function wrongShapes(thing: Thing, level: Level, count: number, rng: Rng): ShapeName[] {
  const barred = new Set<ShapeName>([thing.shape, ...(thing.avoid ?? [])]);
  const rest = ALL_SHAPES.filter((shape) => !barred.has(shape));

  const lookalikes = rest.filter((shape) => areLookalikes(shape, thing.shape));
  const plain = rest.filter((shape) => !areLookalikes(shape, thing.shape));

  if (level < 3 || lookalikes.length === 0) return rng.some(plain, count);

  const trap = rng.pick(lookalikes) ?? lookalikes[0];
  return rng.shuffle([trap, ...rng.some(plain, count - 1)]);
}

export const shapeObjectsActivity = defineGeneratedActivity({
  id: "shape-objects",
  packId: "shapes",
  category: "shapes",
  activityType: "shape-recognition",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const thing = pool[rng.int(0, pool.length - 1)];
    const tiles = forLevel(TILES, level, 3);

    return {
      level,
      prompt: {
        speech: `What shape is ${aOrAn(thing.name)}?`,
        display: [part(pictureOf(thing).item)],
      },
      payload: board(
        shapeSym(thing.shape),
        wrongShapes(thing, level, tiles - 1, rng).map((shape) => shapeSym(shape)),
        rng,
      ),
      explanation: `${capitalise(aOrAn(thing.name))} is ${aOrAn(thing.shape)}.`,
      hint: LOOK,
      meta: {
        objective: `knows what shape ${aOrAn(thing.name)} is`,
        tags: ["family:shape", concept("shape-of", thing.name.replace(/\s+/g, "-"))],
      },
    };
  },
});

/* ------------------------------------------- everything and its shape at once */

/** Two lines, then three, then four. The only lever this board has. */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/**
 * Whether two things can share a connect board.
 *
 * A connect board is a bijection — every thing joins to exactly one shape and
 * every shape takes exactly one thing — so two things of the same shape can
 * never both be on it, and neither can a pair where one could fairly claim the
 * other's shape. Read from both sides, so a fact is only written once.
 */
function clash(a: Thing, b: Thing): boolean {
  if (a.shape === b.shape) return true;
  if (a.avoid?.includes(b.shape)) return true;
  if (b.avoid?.includes(a.shape)) return true;
  return false;
}

/**
 * Choose the things for one board.
 *
 * Greedy over a shuffled pool, refusing anything that clashes with what is
 * already down, with a handful of passes because a greedy walk can corner
 * itself — take the biscuit, the football and the orange and three quarters of
 * the level-two pool is spoken for by one shape. The pack's test deals every
 * level across thousands of seeds and proves a short board never comes out.
 */
function joinable(pool: readonly Thing[], count: number, rng: Rng): Thing[] {
  let best: Thing[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: Thing[] = [];
    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (picked.some((taken) => clash(taken, candidate))) continue;
      picked.push(candidate);
    }
    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/**
 * The order the shapes are laid out in.
 *
 * Shuffled on its own, and *deranged* on three lines and up, so no shape is
 * ever left facing its own thing and joining straight across is never
 * accidentally right. Two lines are shuffled plainly: the only derangement of
 * two is the swap, so deranging them would make the crossed board the answer
 * every single time — a pattern to learn instead of a fact.
 */
function displace(chosen: readonly Thing[], rng: Rng): Thing[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board: the set of facts it practises, sorted.
 *
 * The same three things dealt to different rows is one concept, which is why
 * this is not a way of counting. `SHAPE_OBJECT_FACTS` is the number that means
 * something to a child, and the pack's test counts that.
 */
function conceptOf(chosen: readonly Thing[]): string {
  const facts = chosen
    .map((thing) => `${thing.name.replace(/\s+/g, "-")}>${thing.shape}`)
    .sort();
  return concept("shapes-of", facts.join("+"));
}

export const shapePartnersActivity = defineGeneratedActivity({
  id: "shape-partners",
  packId: "shapes",
  category: "shapes",
  activityType: "shape-recognition",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = joinable(poolAtLevel(level), pairsAtLevel(level), rng);

    const left: ConnectNode[] = chosen.map((thing) => ({
      id: pictureOf(thing).key,
      item: pictureOf(thing).item,
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((thing) => ({
      id: `shape-${thing.shape}`,
      item: shapeSym(thing.shape).item,
    }));

    const pairs: ConnectPair[] = chosen.map((thing) => ({
      leftId: pictureOf(thing).key,
      rightId: `shape-${thing.shape}`,
    }));

    return {
      level,
      prompt: { speech: "Can you join each thing to its shape?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: chosen
        .map((thing) => `${capitalise(aOrAn(thing.name))} is ${aOrAn(thing.shape)}.`)
        .join(" "),
      hint: LOOK,
      meta: {
        objective: "joins each everyday thing to the shape it is",
        tags: ["family:shape", conceptOf(chosen)],
      },
    };
  },
});
