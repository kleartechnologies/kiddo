import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { OrderItem, ShapeName, ShapeSize } from "../../types";
import { ALL_SHAPES, concept, shapeSym, SIMPLE_SHAPES } from "./shared";

/**
 * Smallest, middle, biggest.
 *
 * `sizeActivity` asks which of two shapes is bigger, which is a comparison.
 * This asks for all three at once in a row, which is *seriation* — holding an
 * order in your head while you build it, rather than answering one question
 * about one pair. It is the same knowledge and a genuinely later skill, and it
 * is the reason a child who confidently points at the bigger of two shapes can
 * still put three of them down in the wrong order.
 *
 * An `order`, drawn by `OrderStage`. Nothing new was built for it: the tray
 * that deals the alphabet and the number line deals this.
 *
 * ## Every card is the same shape, in the same colour
 *
 * On purpose, and for the reason `math/quantity-order` draws every group in
 * one accent: a row of a small circle, a middle square and a big star invites
 * a child to sort by *which shape it is* and teaches them that shape is part
 * of the question. It is not. The only thing that differs between these three
 * cards is how much room each takes up, which also means the board never needs
 * colour vision, and never needs a shape name, to be answered.
 *
 * ## How a level gets harder
 *
 * | | shapes it may use | the order asked for |
 * |-|-------------------|---------------------|
 * |1| the five a four year old knows | smallest first |
 * |2| all nine, including the ones with lookalikes | smallest first |
 * |3| all nine | **biggest** first |
 *
 * Level three is not a bigger board — there is no fourth size to add, and
 * inventing one would be inventing a size nobody can name. It is the same
 * board with the instruction turned around, which is the harder thing anyway:
 * a child who has done twenty smallest-first boards has to stop and listen.
 *
 * The three sizes are the three `ShapeSize` values the content model has. A
 * four-card version would want a fourth size on the tile, and a fourth size is
 * a rendering change rather than a content one, so it is written down in
 * `docs/content-universe.md` rather than hacked around here.
 */

/** Smallest to biggest. The order everything below is built from. */
const SIZES: readonly ShapeSize[] = ["small", "medium", "large"];

/** "the smallest", said the way the prompt and the explanation both say it. */
const WORDS: Record<ShapeSize, string> = {
  small: "smallest",
  medium: "middle-sized",
  large: "biggest",
};

/** Which shapes a level may draw. Level two opens the whole set. */
function shapesAtLevel(level: Level): readonly ShapeName[] {
  return level <= 1 ? SIMPLE_SHAPES : ALL_SHAPES;
}

/** Level three turns the instruction around. Nothing else changes. */
function biggestFirst(level: Level): boolean {
  return level >= 3;
}

/**
 * A card's id says which shape it is as well as how big it is.
 *
 * Not decoration. `challengeKey` reads the answer order off an `order`
 * payload, so an id of `size-large` alone would make every level-three board
 * in the pack the same question — the tray of circles and the tray of hexagons
 * would both key as "large, medium, small" and a round would deal what looks
 * to a child like the same board twice. The shape is part of what is on the
 * card, so it is part of the card's name.
 */
const cardId = (shape: ShapeName, size: ShapeSize) => `${shape}-${size}`;

/**
 * The fewest cards that may still be sitting where the child found them.
 *
 * The same rule `math/quantity-order` uses. On a three-card tray, level one
 * asks for two cards to have moved — enough that the answer is never already
 * on the table — and level two and three ask for all three, so no card is
 * where it belongs before the child touches it.
 */
function displacedAtLevel(level: Level): number {
  return level <= 1 ? 2 : 3;
}

/** The tray. Shuffled until enough has moved, then rotated as a fallback. */
function trayOrder(
  order: readonly ShapeSize[],
  rng: Rng,
  displaced: number,
): ShapeSize[] {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const shuffled = rng.shuffle(order);
    const moved = shuffled.filter((size, index) => size !== order[index]).length;
    if (moved >= displaced) return shuffled;
  }

  return [...order.slice(1), order[0]];
}

export const sizeOrderActivity = defineGeneratedActivity({
  id: "size-order",
  packId: "shapes",
  title: "Smallest to biggest",
  category: "shapes",
  activityType: "size-comparison",
  kind: "order",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const shapes = shapesAtLevel(level);
    const shape = shapes[rng.int(0, shapes.length - 1)];
    const reversed = biggestFirst(level);

    const answer = reversed ? [...SIZES].reverse() : [...SIZES];
    const first = WORDS[answer[0]];
    const last = WORDS[answer[answer.length - 1]];

    const items: OrderItem[] = trayOrder(answer, rng, displacedAtLevel(level)).map(
      (size) => ({
        id: cardId(shape, size),
        item: shapeSym(shape, { size }).item,
      }),
    );

    return {
      level,
      /* No display: the cards are the question, exactly as they are on a "put
         these numbers in order" board. */
      /* The shape is named, so the child hears what they are looking at and
         so two boards are two questions. Every shape name in `ALL_SHAPES`
         takes a plain S. */
      prompt: {
        speech: `Can you put these ${shape}s in order, starting with the ${first} one?`,
      },
      payload: {
        kind: "order",
        items,
        answerOrder: answer.map((size) => cardId(shape, size)),
      },
      explanation: `That's the right order — ${first}, then middle-sized, then ${last}.`,
      hint: "Look at how much room each one takes up.",
      meta: {
        objective: `puts three shapes in order by size, ${first} first`,
        tags: [
          "family:shape",
          concept("size-order", shape, reversed ? "biggest-first" : "smallest-first"),
        ],
      },
    };
  },
});
