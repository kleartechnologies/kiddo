import type { Accent, GameCategory } from "@/lib/games/types";

/**
 * KIDDO World — the place the whole product is set in.
 *
 * Every screen looks out at the same world: a soft sky, a sun somewhere off
 * to one side, a few clouds, three rolling hills and some small things
 * growing on the near one. What changes from one corner of it to the next is
 * only *which* corner: Math's sky is a little bluer, English's a little
 * pinker, Logic's hills are limes rather than sages, and each has its own
 * quiet marks scattered in the distance.
 *
 * That is the whole point of describing it as data. A background that is
 * written per screen becomes seven backgrounds and then seven arguments about
 * which one is the real one. Written like this, a new subject is one entry
 * below, and every entry is provably built from the same handful of pieces —
 * so no corner of the world can drift away from the rest of it.
 *
 * Nothing here names a colour: a theme picks from the character palette, the
 * same six hues the cards and the friends are drawn in. That is why the
 * background always looks related to what is standing on it.
 */

/** The tiny things growing along the near hill. */
export type GroundCover = "flowers" | "leaves" | "pebbles";

/** What drifts between the clouds. Never more than a few. */
export type Sparkle = "stars" | "petals" | "none";

/**
 * The subject's own marks, drawn very faintly in the middle distance.
 *
 * A hint of what this corner of the world is about — a stray numeral over
 * Math, a letter over English — at an opacity where a child reads it as
 * texture rather than as something to look at. `none` is a real answer and
 * the honest one for a place that is about no single subject.
 */
export type WorldMotif =
  | "none"
  | "numbers"
  | "letters"
  | "geometry"
  | "globe"
  | "puzzle"
  | "cards";

export interface WorldTheme {
  /** The hue washed across the top of the sky. */
  sky: Accent;
  /** The warmer hue behind the sun, low on one side. */
  glow: Accent;
  /** Far ridge, middle ground and near hill, back to front. */
  hills: readonly [Accent, Accent, Accent];
  /** How many clouds this sky holds. Four is the most anyone gets. */
  clouds: number;
  sparkle: Sparkle;
  ground: GroundCover;
  motif: WorldMotif;
  /** An arc of light over one shoulder of the sky. Not every corner has one. */
  rainbow: boolean;
}

/**
 * Which corner of the world a screen is standing in.
 *
 * Keyed on `GameCategory` and nothing else, plus `world` for the home screen
 * and anywhere that is not a game. A game therefore never chooses a
 * background: it already said what it is about in the catalogue, and the
 * world reads that. Adding an eighth category stops this file compiling until
 * someone has decided what its sky looks like, which is the point.
 */
export type WorldThemeId = "world" | GameCategory;

/** The one every screen gets unless it says otherwise. */
export const DEFAULT_WORLD_THEME: WorldThemeId = "world";

export const WORLD_THEMES: Record<WorldThemeId, WorldTheme> = {
  /* Home. The warmest and the fullest, because it is the front door: blue
     sky, a honey sun, green hills, flowers and one soft rainbow. */
  world: {
    sky: "tide",
    glow: "honey",
    hills: ["tide", "sprout", "sage"],
    clouds: 4,
    sparkle: "petals",
    ground: "flowers",
    motif: "none",
    rainbow: true,
  },

  /* Math. The bluest sky in the world, and the tidiest ground. */
  numbers: {
    sky: "tide",
    glow: "tide",
    hills: ["tide", "tide", "sage"],
    clouds: 4,
    sparkle: "none",
    ground: "pebbles",
    motif: "numbers",
    rainbow: false,
  },

  /* English. Warm pink light and a meadow: the storybook corner. */
  letters: {
    sky: "blossom",
    glow: "blossom",
    hills: ["blossom", "sprout", "sage"],
    clouds: 3,
    sparkle: "petals",
    ground: "flowers",
    motif: "letters",
    rainbow: true,
  },

  /* Logic. Limes and mints, a clearer sky, and stars for thinking under. */
  patterns: {
    sky: "sprout",
    glow: "sage",
    hills: ["sprout", "sage", "sprout"],
    clouds: 2,
    sparkle: "stars",
    ground: "leaves",
    motif: "puzzle",
    rainbow: false,
  },

  /* Shapes & Colours. Sunny, and the one corner where the ground is made of
     shapes rather than growing things. */
  shapes: {
    sky: "honey",
    glow: "honey",
    hills: ["honey", "sprout", "sage"],
    clouds: 3,
    sparkle: "stars",
    ground: "pebbles",
    motif: "geometry",
    rainbow: true,
  },

  /* Colours. Shapes' twin, tipped towards pink. Kept separate because the
     category exists, not because a game uses it yet. */
  colours: {
    sky: "blossom",
    glow: "honey",
    hills: ["honey", "blossom", "sprout"],
    clouds: 3,
    sparkle: "petals",
    ground: "flowers",
    motif: "geometry",
    rainbow: true,
  },

  /* General Knowledge and Find It. Mint and sky: somewhere to look out from. */
  discovery: {
    sky: "sage",
    glow: "tide",
    hills: ["tide", "sage", "sprout"],
    clouds: 4,
    sparkle: "none",
    ground: "flowers",
    motif: "globe",
    rainbow: false,
  },

  /* Memory Match. Quiet and green, with the cards themselves in the sky. */
  memory: {
    sky: "sage",
    glow: "honey",
    hills: ["sage", "sprout", "sage"],
    clouds: 3,
    sparkle: "stars",
    ground: "leaves",
    motif: "cards",
    rainbow: false,
  },
};

export function getWorldTheme(id: WorldThemeId = DEFAULT_WORLD_THEME): WorldTheme {
  return WORLD_THEMES[id] ?? WORLD_THEMES[DEFAULT_WORLD_THEME];
}
