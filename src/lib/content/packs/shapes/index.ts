import type { Activity, ContentPack } from "../../types";
import { propertiesActivity, sizeActivity } from "./attributes";
import { classifyActivity, countingActivity } from "./counting";
import { matchingActivity, sameDifferentActivity } from "./matching";
import { patternsActivity } from "./patterns";
import { shapeObjectsActivity, shapePartnersActivity } from "./realWorld";
import { colourNamesActivity, shapeNamesActivity } from "./recognition";
import { sizeOrderActivity } from "./sizeOrder";
import { positionActivity, symmetryActivity } from "./space";

/**
 * The Shapes & Colours pack: fourteen activities, every one of them a rule
 * that makes questions rather than a list of them.
 *
 * Ordered the way a child meets them. Name a shape, name a colour, say what
 * shape a real thing is, find another one like this, decide whether two things
 * match, say which is bigger, put three in order by size, count the ones that
 * fit, find the thing that is both, say what a shape is made of, join a row of
 * things to their shapes, say where it is, finish a mirror, carry a pattern
 * on. The first two are three-year-old questions and the last three are
 * nearly-school ones, and the fourteen of them are one continuous slope rather
 * than three bands.
 *
 * Fourteen activities and no new engine. Twelve are a `choice`, one is an
 * `order` and one is a `connect`, and all three of those components were
 * already drawing other packs before this one asked for them. What the pack
 * needed from the content layer was vocabulary, not machinery: three more
 * shapes, a size on a shape, and a scene that can hold one shape inside
 * another. All three are subject-neutral, and nothing in the engine knows this
 * pack exists.
 *
 * `shapeObjectsActivity` and `shapePartnersActivity` are one table of facts
 * asked two ways — the same arrangement `general-knowledge` uses for animal
 * homes — so the pack gained fourteen facts and two ways to practise them,
 * rather than two curriculums.
 *
 * ## What is deliberately not here
 *
 * A `connect` board joining shapes to how many corners they have. It was
 * designed and cut, and the reason is in `SHAPE_FACTS`: a circle and an oval
 * have corners nobody counts, a star has ten and a heart has one, and square,
 * rectangle and diamond all have four. That leaves three, four and six as the
 * only corner counts a board could honestly use — so every such board would
 * hold three lines, at every level, for ever. `propertiesActivity` already
 * asks the same knowledge as a `choice`, where three answers is a board rather
 * than a ceiling.
 *
 * A `connect` board joining colours to their names is blocked by the palette
 * for the same shape of reason: only blue, pink and green can all be told
 * apart from each other at once, which caps such a board at three lines with
 * no level to climb. Both are written down in `docs/content-universe.md`.
 */
export const SHAPES_ACTIVITIES: readonly Activity[] = [
  shapeNamesActivity,
  colourNamesActivity,
  shapeObjectsActivity,
  matchingActivity,
  sameDifferentActivity,
  sizeActivity,
  sizeOrderActivity,
  countingActivity,
  classifyActivity,
  propertiesActivity,
  shapePartnersActivity,
  positionActivity,
  symmetryActivity,
  patternsActivity,
];

export const SHAPES_PACK: ContentPack = {
  id: "shapes",
  title: "Shapes & Colours",
  blurb: "Looking closely: shapes, colours, sizes and where things are.",
  accent: "honey",
  activities: SHAPES_ACTIVITIES,
};

export {
  classifyActivity,
  colourNamesActivity,
  countingActivity,
  matchingActivity,
  patternsActivity,
  positionActivity,
  propertiesActivity,
  sameDifferentActivity,
  shapeNamesActivity,
  shapeObjectsActivity,
  shapePartnersActivity,
  sizeActivity,
  sizeOrderActivity,
  symmetryActivity,
};
