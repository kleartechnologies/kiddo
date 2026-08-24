import type { ReactNode } from "react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import {
  Illustration,
  hasIllustration,
} from "@/components/kiddo/artwork/illustrations";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { ArtId } from "@/lib/content/art";
import type {
  ContentItem,
  SceneItem,
  ShapeItem,
  ShapeName,
  ShapeSize,
  SpatialRelation,
} from "@/lib/content/types";
import type { Accent } from "@/lib/games/types";

/**
 * Draws one thing from a challenge.
 *
 * The single place in the product that knows what a `ContentItem` looks like,
 * the way `ItemArt` is that place for Find It. A new kind of item — a picture,
 * a shape, a word card — is a branch here and changes nothing else: not the
 * stage, not the tile, not a game.
 *
 * Three scales, because the same item appears in three sizes. `tile` is one of
 * the answers. `stage` is part of the question — the line that reads
 * `2 + 3 = ?`. `hero` is a question that is a *single thing to look at*: the
 * cow in "where does this live?", drawn big and alone, which is what
 * `Prompt.layout: "subject"` asks `PromptDisplay` for.
 *
 * `hero` is a size and never a style. It changes how large the item is drawn
 * and nothing else, so a picture, a word and a shape all still look like
 * themselves — and every branch below that has no hero-specific size falls
 * back to the stage one, because the alternative is a tile-sized subject.
 */

export type ItemScale = "stage" | "tile" | "hero";

/**
 * Whoever draws the board may wrap the members of a group, one at a time.
 *
 * Only a `count` item is a group — its pips are the whole of what it is — so
 * it is the only branch that hands anything out, and what it hands out is the
 * pip exactly as it would have drawn it. This file still decides nothing about
 * motion: `PromptDisplay` is the one caller, and what it wraps a pip in is its
 * business, the same way it already wraps a row of pictures without a line of
 * this file changing. A board that does not ask gets the same grid as ever.
 */
export type EachOf = (member: ReactNode, index: number) => ReactNode;

/**
 * How big a glyph gets, by how many of them there are.
 *
 * A numeral is one character and can be enormous. A word is not: BALL at the
 * size of a 4 is wider than a tile on the narrowest phone, and a row of tiles
 * that cannot shrink takes a horizontal scrollbar with it. So text steps down
 * as it lengthens — one or two characters keep the full size, which is every
 * letter and every numeral there will ever be.
 */
function textSize(text: string, scale: ItemScale): string {
  const length = [...text].length;

  if (scale === "tile") {
    if (length <= 2) return "text-4xl sm:text-5xl";
    if (length <= 4) return "text-2xl sm:text-4xl";
    return "text-xl sm:text-2xl";
  }

  /* A hero word is a subject rather than a line, so it gets one step more —
     capped against the viewport, because the thing above a row of tiles is the
     thing that pushes them off the bottom of a 640px phone. */
  if (scale === "hero") {
    if (length <= 2) return "text-[min(5rem,13dvh)] sm:text-[min(6rem,15dvh)]";
    if (length <= 4) return "text-[min(3.5rem,10dvh)] sm:text-[min(5rem,13dvh)]";
    return "text-[min(2.5rem,8dvh)] sm:text-[min(4rem,11dvh)]";
  }

  if (length <= 2) {
    return "text-5xl sm:text-6xl [@media(max-height:34rem)]:text-4xl";
  }
  if (length <= 4) {
    return "text-3xl sm:text-5xl [@media(max-height:34rem)]:text-2xl";
  }
  return "text-2xl sm:text-4xl [@media(max-height:34rem)]:text-xl";
}

/**
 * How big a drawn thing is, by scale.
 *
 * One table, used for both jobs a picture has: the glyph's font size, and — via
 * `Illustration`, which is `1.15em` square — the illustration's box. That is
 * the point of sizing the drawing in `em`: a board does not change height when
 * a fact is promoted from an emoji to an illustration, so nothing that was
 * measured has to be measured again.
 *
 * The hero sizes are `min()` against `dvh` rather than a plain step on the type
 * scale. A subject is the tallest thing on the stage, `ChoiceStage` reserves a
 * fixed slab of chrome above its tile grid, and a 360x640 phone in portrait is
 * where that budget runs out first — so the picture is allowed to be large on a
 * tablet and quietly gives the height back on a small phone, instead of pushing
 * the answers off the bottom.
 */
function pictureSize(scale: ItemScale): string {
  if (scale === "tile") return "text-5xl sm:text-6xl";
  if (scale === "hero") {
    return "text-[min(4.5rem,15dvh)] sm:text-[min(6rem,18dvh)] [@media(max-height:34rem)]:text-[min(3rem,13dvh)]";
  }
  return "text-4xl sm:text-5xl [@media(max-height:34rem)]:text-3xl";
}

/** Dot grids stay under five across, so a count is read in rows a child can see. */
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export function ContentItemView({
  item,
  scale = "stage",
  eachOf,
}: {
  item: ContentItem;
  scale?: ItemScale;
  /** See `EachOf`. Used by a `count` item and ignored by every other kind. */
  eachOf?: EachOf;
}) {
  switch (item.kind) {
    case "number":
    case "text": {
      const text = item.kind === "number" ? String(item.value) : item.text;
      const word = (
        <span
          className={cn(
            "font-display text-ink-900 leading-none font-bold tabular-nums",
            /* `break-all` is the last line of defence: a word longer than
               anything authored today still wraps rather than overflows. */
            "max-w-full text-center break-all",
            textSize(text, scale),
          )}
        >
          {text}
        </span>
      );

      /* PICTURE + WORD, the middle rung of the ladder. The picture sits above
         the word and is deliberately a step smaller than a picture that *is*
         the item: the word is what is being learned here, and a drawing that
         out-weighed it would turn a reading tile into a picture tile. */
      const art = item.kind === "text" ? item.art : undefined;
      if (art && hasIllustration(art)) {
        return (
          <span className="flex max-w-full flex-col items-center gap-1 sm:gap-1.5">
            <Illustration id={art} className={anchorSize(scale)} />
            {word}
          </span>
        );
      }

      return word;
    }

    case "count":
      return (
        <Dots value={item.value} accent={item.accent} scale={scale} eachOf={eachOf} />
      );

    case "swatch":
      return (
        <span
          aria-hidden
          className={cn(
            "block rounded-full border-2 border-black/5",
            ACCENTS[item.accent].bgBase,
            scale === "tile" ? "size-12 sm:size-16" : "size-10 sm:size-14",
          )}
        />
      );

    case "picture":
      return <Picture glyph={item.glyph} art={item.art} scale={scale} />;

    case "shape":
      return (
        <ShapeGlyph
          shape={item.shape}
          accent={item.accent}
          size={item.size}
          scale={scale}
        />
      );

    case "scene":
      return <SceneView scene={item} scale={scale} />;

    case "character":
      /* `alive={false}`: KIDDO is the only rigged character, so a blinking
         KIDDO among still friends would quietly draw the eye to one answer. */
      return (
        <CharacterFigure
          id={item.characterId}
          size={scale === "tile" ? "tile" : "xs"}
          alive={false}
        />
      );
  }
}


/**
 * A picture of a thing, drawn.
 *
 * A glyph, in colour, as big as its box allows. There is no branch here for
 * what the picture is *of* — an animal, a vehicle, a toothbrush are one case,
 * which is the whole reason `PictureItem` was added to the content layer
 * rather than to a pack.
 *
 * `aria-hidden`, like every other drawing in this file: the words for it live
 * in the tile's accessible name, where they are part of a whole instruction
 * rather than a glyph read out on its own.
 *
 * The sizes are `em`-free on purpose. An emoji is square and has no
 * descender, so it is sized by the type scale and given `leading-none`; the
 * step down on a short screen is the same one the numerals take, so a board
 * of pictures and a board of numbers shrink together.
 */
function Picture({
  glyph,
  art,
  scale,
}: {
  glyph: string;
  art?: ArtId;
  scale: ItemScale;
}) {
  /* The promotion. An id with a drawing behind it is drawn; anything else —
     including an id from a pack written against a bigger library than this
     build ships — is the glyph, which is what every board showed before this
     file learned the word "illustration". A missing asset costs a child
     nothing. */
  if (art && hasIllustration(art)) {
    return <Illustration id={art} className={pictureSize(scale)} />;
  }

  return (
    <span
      aria-hidden
      className={cn(
        "block max-w-full text-center leading-none select-none",
        pictureSize(scale),
      )}
    >
      {glyph}
    </span>
  );
}

/**
 * How big the picture *above a word* is.
 *
 * One step under `pictureSize`, at every scale. A word with a drawing over it
 * is still a word tile: the child is meant to read `CAT` and use the cat to
 * check themselves, and the moment the cat is the bigger of the two they stop
 * reading. This is the difference between a scaffold and an answer.
 */
function anchorSize(scale: ItemScale): string {
  if (scale === "tile") return "text-3xl sm:text-4xl";
  if (scale === "hero") return "text-[min(3.5rem,12dvh)] sm:text-[min(4.5rem,14dvh)]";
  return "text-3xl sm:text-4xl [@media(max-height:34rem)]:text-2xl";
}

/**
 * Each shape's house colour.
 *
 * A rendering decision, not a content one: the name of a circle is "circle",
 * not "blue circle", so nothing in a pack has to agree with this table. It is
 * here so that a row of shapes is never a row of one hue, and so that two
 * different shapes always differ in colour as well as in outline.
 */
const SHAPE_ACCENTS: Record<ShapeName, Accent> = {
  circle: "tide",
  square: "blossom",
  triangle: "sprout",
  star: "honey",
  heart: "apricot",
  diamond: "sage",
  /* The three that arrived with Shapes & Colours take the house colour of the
     shape they are most like, on purpose: a blue oval beside a blue circle is
     a question about the *outline*, and giving the oval its own hue would let
     a child answer it without ever looking at the shape. */
  oval: "tide",
  rectangle: "blossom",
  hexagon: "sage",
};

/**
 * How each shape is drawn, in one 100-unit box.
 *
 * Corners are rounded by stroking the outline in the fill colour with a round
 * join, which is why the pointed shapes carry a `stroke` and the naturally
 * soft ones do not. It is the cheapest way to keep a triangle looking like it
 * belongs beside KIDDO rather than beside a worksheet.
 */
const SHAPE_PATHS: Record<
  ShapeName,
  { d: string; points?: string; stroke: number }
> = {
  circle: { d: "M10 50a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z", stroke: 0 },
  square: { d: "M32 14h36a18 18 0 0 1 18 18v36a18 18 0 0 1-18 18H32a18 18 0 0 1-18-18V32a18 18 0 0 1 18-18z", stroke: 0 },
  triangle: { d: "M50 18 84 78 16 78Z", stroke: 14 },
  diamond: { d: "M50 14 86 50 50 86 14 50Z", stroke: 12 },
  star: {
    d: "M50 14 59.7 38.7 86.1 40.3 65.7 57.1 72.3 82.7 50 68.5 27.7 82.7 34.3 57.1 13.9 40.3 40.3 38.7Z",
    stroke: 11,
  },
  heart: {
    d: "M50 86C46 82 14 60 14 38 14 24 25 15 36 15c7 0 12 4 14 8 2-4 7-8 14-8 11 0 22 9 22 23 0 22-32 44-36 48Z",
    stroke: 8,
  },
  /* Wider than it is tall, and rounded the same way the square is — the only
     difference between them is meant to be the one being asked about. */
  rectangle: {
    d: "M22 26h56a14 14 0 0 1 14 14v20a14 14 0 0 1-14 14H22A14 14 0 0 1 8 60V40a14 14 0 0 1 14-14z",
    stroke: 0,
  },
  oval: { d: "M8 50a42 29 0 1 0 84 0 42 29 0 1 0-84 0Z", stroke: 0 },
  hexagon: { d: "M88 50 69 82.9 31 82.9 12 50 31 17.1 69 17.1Z", stroke: 11 },
};

/**
 * How much of its box a shape fills, by size.
 *
 * The box never changes — a small circle and a big one sit on identically
 * sized tiles — so a size question is answered by looking at the drawing
 * rather than at the layout. The steps are wide (a big shape is nearly twice a
 * small one across) because "slightly bigger" is not a question worth asking a
 * four year old, and because a difference that survives a 360px phone has to
 * be a real one.
 */
const SIZE_FACTORS: Record<ShapeSize, number> = {
  small: 0.55,
  medium: 0.75,
  large: 1,
};

/** Keeps generated transforms out of float noise, so markup is stable. */
function round(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** Puts a 100-unit shape at a point, at a fraction of its size. */
function placement(cx: number, cy: number, factor: number): string {
  return `translate(${round(cx - 50 * factor)} ${round(cy - 50 * factor)}) scale(${round(factor)})`;
}

/**
 * A shape, drawn.
 *
 * Every shape has a house colour so that a pattern of circles and stars is
 * also a pattern of blue and yellow — two channels carrying the same answer,
 * which is what makes it readable to a child who cannot tell the two apart.
 * A challenge that is *about* colour passes its own `accent` and overrides it.
 */
function ShapeGlyph({
  shape,
  accent = SHAPE_ACCENTS[shape],
  size,
  scale,
}: {
  shape: ShapeName;
  accent?: Accent;
  size?: ShapeSize;
  scale: ItemScale;
}) {
  const factor = size ? SIZE_FACTORS[size] : 1;

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn(
        "block",
        scale === "tile" ? "size-12 sm:size-16" : "size-10 sm:size-14",
      )}
    >
      <ShapePath shape={shape} accent={accent} factor={factor} />
    </svg>
  );
}

/**
 * One shape inside somebody else's coordinate box.
 *
 * Shared by the glyph and the scene so that a circle is the same circle in
 * both, and so that "the small star" is small by the same amount wherever it
 * is drawn. `outline` hollows the shape out, which is the only way a thing
 * can be seen to be *inside* it.
 *
 * Exported because the game cards draw with it too: the shapes in a card's
 * illustration have to be the shapes the child then meets inside the game, or
 * the picture was a promise the game does not keep.
 */
export function ShapePath({
  shape,
  accent = SHAPE_ACCENTS[shape],
  factor = 1,
  at,
  outline = false,
}: {
  shape: ShapeName;
  accent?: Accent;
  factor?: number;
  at?: { x: number; y: number };
  outline?: boolean;
}) {
  const { d, stroke } = SHAPE_PATHS[shape];
  const transform = at
    ? placement(at.x, at.y, factor)
    : placement(50, 50, factor);

  return (
    <g transform={transform}>
      <path
        d={d}
        className={cn(
          ACCENTS[accent].stroke,
          outline ? "fill-none" : ACCENTS[accent].fill,
        )}
        /* Divided by the scale, so an outline is the same weight however
           small the thing wearing it is. */
        strokeWidth={outline ? round(7 / factor) : stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Where the two shapes of a scene sit, per relation.
 *
 * All of it is one 100-unit box, which is what lets `inside` be drawn at all:
 * two separate glyphs sitting beside each other in a flex row can be near or
 * far or above, but one of them can never be *in* the other.
 *
 * `beside` and `right` deliberately land in nearly the same place — beside a
 * box and to the right of it are the same picture. That is a fact about the
 * words, not a bug in the table, and it is why content that asks about one
 * never offers the other. `near` and `far` are the same two shapes at two
 * distances, so they are only ever asked against each other.
 */
const SCENE_LAYOUTS: Record<
  SpatialRelation,
  {
    subject: { x: number; y: number; factor: number };
    anchor: { x: number; y: number; factor: number };
    /** Hollows the anchor, so a subject drawn on top of it stays visible. */
    contains?: boolean;
  }
> = {
  above: { subject: { x: 50, y: 24, factor: 0.36 }, anchor: { x: 50, y: 74, factor: 0.36 } },
  below: { subject: { x: 50, y: 76, factor: 0.36 }, anchor: { x: 50, y: 26, factor: 0.36 } },
  left: { subject: { x: 24, y: 50, factor: 0.36 }, anchor: { x: 74, y: 50, factor: 0.36 } },
  right: { subject: { x: 76, y: 50, factor: 0.36 }, anchor: { x: 26, y: 50, factor: 0.36 } },
  beside: { subject: { x: 72, y: 50, factor: 0.36 }, anchor: { x: 28, y: 50, factor: 0.36 } },
  /* Nearly touching, and deliberately not touching: at these factors a shape
     is about 29 units across, so 34 and 66 leave a visible sliver of daylight
     between them. Any closer and "near" reads as one merged blob. */
  near: { subject: { x: 66, y: 50, factor: 0.34 }, anchor: { x: 34, y: 50, factor: 0.34 } },
  far: { subject: { x: 86, y: 50, factor: 0.27 }, anchor: { x: 14, y: 50, factor: 0.27 } },
  inside: {
    subject: { x: 44, y: 50, factor: 0.26 },
    anchor: { x: 44, y: 50, factor: 0.66 },
    contains: true,
  },
  outside: {
    subject: { x: 85, y: 50, factor: 0.26 },
    anchor: { x: 44, y: 50, factor: 0.66 },
    contains: true,
  },
};

/**
 * Two shapes and the word between them, drawn.
 *
 * Square, and sized by the room it is given rather than by a fixed class: a
 * scene is the busiest thing a tile can hold, and on a 360px phone it needs
 * every pixel of the tile it is in. `viewBox` does the rest — the drawing
 * scales, it never crops.
 */
function SceneView({ scene, scale }: { scene: SceneItem; scale: ItemScale }) {
  const layout = SCENE_LAYOUTS[scene.relation];
  const sized = (item: ShapeItem, base: number) =>
    base * (item.size ? SIZE_FACTORS[item.size] : 1);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn(
        "block w-full",
        scale === "tile"
          ? "max-w-[6.5rem] sm:max-w-[8rem]"
          : "max-w-24 sm:max-w-32",
      )}
    >
      <ShapePath
        shape={scene.anchor.shape}
        accent={scene.anchor.accent}
        factor={sized(scene.anchor, layout.anchor.factor)}
        at={layout.anchor}
        outline={layout.contains}
      />
      <ShapePath
        shape={scene.subject.shape}
        accent={scene.subject.accent}
        factor={sized(scene.subject, layout.subject.factor)}
        at={layout.subject}
      />
    </svg>
  );
}

/** A quantity, drawn. The whole of visual maths before numerals mean anything. */
function Dots({
  value,
  accent = "tide",
  scale,
  eachOf = (pip) => pip,
}: {
  value: number;
  accent?: Accent;
  scale: ItemScale;
  eachOf?: EachOf;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center",
        scale === "tile" ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1.5",
        COLUMNS[Math.min(value, 5)] ?? COLUMNS[5],
      )}
    >
      {Array.from({ length: value }, (_, index) => (
        /* The key stays on the grid cell, so whatever a caller wraps a pip
           in is inside the cell rather than a sibling of it. */
        <span key={index} className="contents">
          {eachOf(
            <span
              className={cn(
                "block rounded-full",
                ACCENTS[accent].bgBase,
                scale === "tile" ? "size-2.5 sm:size-3.5" : "size-3.5 sm:size-5",
              )}
            />,
            index,
          )}
        </span>
      ))}
    </span>
  );
}
