import type { ReactNode } from "react";

import type { ArtId } from "@/lib/content/art";
import {
  Bee,
  Bird,
  Cat,
  Chicken,
  Cow,
  Dog,
  Duck,
  Fish,
  Fox,
  Frog,
  Ladybird,
  Monkey,
  Mouse,
  Rabbit,
  Shark,
  Sheep,
  Snake,
} from "./animals";
import { Flower, Star, Sun, Tree } from "./nature";
import {
  Burrow,
  Desert,
  Farm,
  Forest,
  House,
  Jungle,
  Nest,
  Pond,
  Sea,
  Snow,
  TreeHome,
} from "./places";
import {
  Apple,
  Ball,
  Balloon,
  Banana,
  Biscuit,
  Box,
  Cake,
  Car,
  Egg,
  Hat,
  Orange,
  Strawberry,
} from "./things";

/**
 * Where an `ArtId` becomes pixels — the only place in the product that knows
 * how a cow is drawn.
 *
 * The same shape as `lib/accents.ts`: content names a thing, one table turns
 * the name into the thing, and nothing in between learns the drawing. A pack
 * writes `art: "animal.cow"` on a fact it already had; `ContentItemView` asks
 * this file for it; no game, no engine and no stage is touched by either.
 *
 * ## Sized in `em`, on purpose
 *
 * An illustration has to be *interchangeable with an emoji*, because that is
 * the fallback and both appear on the same boards. `ContentItemView` already
 * sizes a picture by setting a font size — `text-4xl` on a stage, `text-5xl` on
 * a tile, and a viewport-relative cap where the stage is short — and every one
 * of those sizes was measured against a glyph. So the drawing is `1.15em`
 * square, which is about the box an emoji fills at the same font size, and the
 * two are swappable at every scale that exists today and every one added later.
 * There is no second sizing path to keep in step.
 *
 * ## Always decorative
 *
 * `aria-hidden`, without exception. The word for the thing lives in the item's
 * accessible name — `spokenOf` builds it, `PromptDisplay` and every tile put it
 * in an `sr-only` or an `aria-label` — and an illustration that announced
 * itself would say it twice. A screen reader hears the same board whether it
 * was drawn or glyphed, which is the test in `tests/visual.test.ts` that this
 * is here to pass.
 */

/**
 * Every drawing, by name.
 *
 * `Record<ArtId, …>` rather than a partial map, so adding an id to the union
 * without drawing it is a compiler error and never a blank tile in front of a
 * child. The values are components rather than elements so nothing is built
 * until something asks for it.
 */
export const ILLUSTRATIONS: Record<ArtId, () => ReactNode> = {
  "animal.cow": Cow,
  "animal.sheep": Sheep,
  "animal.dog": Dog,
  "animal.cat": Cat,
  "animal.fish": Fish,
  "animal.shark": Shark,
  "animal.frog": Frog,
  "animal.mouse": Mouse,
  "animal.chicken": Chicken,
  "animal.duck": Duck,
  "animal.rabbit": Rabbit,
  "animal.bird": Bird,
  "animal.snake": Snake,
  "animal.monkey": Monkey,
  "animal.fox": Fox,
  "animal.bee": Bee,
  "animal.ladybird": Ladybird,
  "food.apple": Apple,
  "food.egg": Egg,
  "food.cake": Cake,
  "food.banana": Banana,
  "food.strawberry": Strawberry,
  "food.orange": Orange,
  "food.biscuit": Biscuit,
  "object.ball": Ball,
  "object.hat": Hat,
  "object.car": Car,
  "object.balloon": Balloon,
  "object.box": Box,
  "nature.tree": Tree,
  "nature.flower": Flower,
  "nature.star": Star,
  "nature.sun": Sun,
  "place.house": House,
  "place.farm": Farm,
  "place.sea": Sea,
  "place.pond": Pond,
  "place.nest": Nest,
  "place.burrow": Burrow,
  "place.jungle": Jungle,
  "place.forest": Forest,
  "place.desert": Desert,
  "place.snow": Snow,
  "place.tree": TreeHome,
};

/**
 * Whether a name has a drawing behind it.
 *
 * The union means it always does — but the check is what lets a *runtime* value
 * be trusted: a fact loaded from a table, a playground query string, a pack
 * written against a newer library than the one that shipped. Content asks this
 * before promoting an item, and the answer being `false` costs the child
 * nothing, because the glyph is still there.
 */
export function hasIllustration(id: string): id is ArtId {
  return Object.hasOwn(ILLUSTRATIONS, id);
}

/**
 * One drawing, at the current font size.
 *
 * `block` because an inline SVG sits on the text baseline and leaves descender
 * space under it, which on a tile reads as the picture being pushed up. Nothing
 * here animates, nothing here has a transition, and nothing here reacts to
 * state: an illustration is the *subject* of a board, and the tile around it is
 * what changes when the board does.
 *
 * `data-art` is the measurement hook. `scripts/measure-visual.mjs` has to be
 * able to tell a drawing from an emoji on a real board — how big the subject of
 * a board actually is, and whether a level-two board still has pictures on it —
 * and an attribute is the only thing a browser can be asked that about. It is
 * read by nothing else, and it carries the id rather than a bare marker so a
 * failing measurement names the drawing that failed.
 */
export function Illustration({
  id,
  className,
}: {
  id: ArtId;
  className?: string;
}) {
  const Draw = ILLUSTRATIONS[id];

  return (
    <svg
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      data-art={id}
      className={`block h-[1.15em] w-[1.15em] shrink-0${className ? ` ${className}` : ""}`}
    >
      <Draw />
    </svg>
  );
}
