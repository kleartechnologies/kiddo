/**
 * KIDDO — canonical character constants.
 *
 * Transcribed from the approved character sheet ("KIDDO Character System").
 * This file is the source of truth for the drawing. Nothing here is a
 * suggestion: changing a number here changes the character, so don't, unless
 * the character sheet changed first.
 *
 * Construction rules the whole cast obeys:
 *   RULE 01  One hue per character. Every lighter form (inner ear, belly,
 *            muzzle, tail tip) is white laid over that hue at a fixed
 *            opacity. No second colour, no gradients.
 *   RULE 02  Faces are always ink. Only the blush is warm.
 *   RULE 03  No outlines, and no detail that would vanish below 8px.
 */

/** The full-body drawing area. Everything below is in these user units. */
export const VIEWBOX = { x: 0, y: 0, width: 200, height: 230 } as const;

/**
 * Icon crop. Square, centred on the ears and the body mass: ears span x 39-161
 * and the body reaches y 172, so this holds both with a hair of breathing room
 * and nothing else. Used below 64px, where the limbs are dropped entirely.
 */
export const VIEWBOX_COMPACT = { x: 29, y: 33, width: 142, height: 142 } as const;

/**
 * Icon crop for the four friends. Their identity markers sit higher and wider
 * than KIDDO's — FOXY's ear points, BIBI's upright ears, PIP's eye bumps,
 * WALLY's spout — so the crop has to start at the top of the frame. Same rule,
 * a different box, because the silhouettes are genuinely different shapes.
 */
export const VIEWBOX_COMPACT_FRIEND = { x: 12, y: 2, width: 176, height: 176 } as const;

/** Below this width the character drops its limbs and becomes a head mark. */
export const COMPACT_BELOW_PX = 64;

/** One warm near-black, for every face and every piece of type. */
export const INK = "#2E2A32";

/** Cheeks only, drawn at 26–45%. Never a fill, never a surface. */
export const BLUSH = "#E88C74";

/** Rewards, stars and confetti. Not a character hue. */
export const HONEY = "#F6D189";

/** One hue per character. Recolour by changing exactly one of these. */
export const HUES = {
  kiddo: "#93C8A3", // Sage · brand primary
  foxy: "#EFA470", // Apricot
  bibi: "#EFA6AB", // Blossom
  pip: "#BCD37C", // Sprout
  wally: "#8FBAD9", // Tide
} as const;

/** White-overlay opacities. RULE 01: lighter forms are never a second hue. */
export const OVERLAY = {
  innerEar: 0.38,
  belly: 0.34,
  muzzle: 0.55,
  tailTip: 0.72,
} as const;

/**
 * The rig: four pivots, all fixed. Every pose in the library is these four
 * parts rotated around these points, which is why poses can be tweened.
 */
export const PIVOTS = {
  leftArm: { x: 54, y: 112 },
  rightArm: { x: 146, y: 112 },
  leftLeg: { x: 80, y: 166 },
  rightLeg: { x: 120, y: 166 },
} as const;

/** Body mass centre. Breathing scales around this point. */
export const BODY_CENTRE = { x: 100, y: 130 } as const;

/** Default eye line. Individual faces override it; blinks scale around it. */
export const EYE_LINE = 110;

/** Timings from the rig sheet. Everything else should derive from these. */
export const TIMING = {
  /** Idle breathe: 1.00 -> 1.02, ease-in-out, ears trail the body. */
  breatheSeconds: 2.4,
  breatheScale: 1.02,
  earLagSeconds: 0.12,
  /** Blink: eyes squash to 0.1 on y for 90ms, every 3-7s. */
  blinkSeconds: 0.09,
  blinkMinGap: 3,
  blinkMaxGap: 7,
  /** Pose change: 220ms with a small overshoot. Never a squash. */
  reactionSeconds: 0.22,
} as const;

/** Pose transition. Slight overshoot, no rubberiness. */
export const REACTION = {
  type: "spring",
  stiffness: 260,
  damping: 20,
  mass: 0.7,
} as const;
