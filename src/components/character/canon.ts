/**
 * KIDDO — canonical character constants.
 *
 * Transcribed from the approved character sheet ("KIDDO Character Family",
 * v2). This file is the source of truth for the drawing. Nothing here is a
 * suggestion: changing a number here changes the character, so don't, unless
 * the character sheet changed first.
 *
 * Construction rules the whole cast obeys:
 *   RULE 01  One hue per character, lit from one direction. Every form is
 *            that hue at one of its stops, and every cream form (belly,
 *            muzzle, inner ear) is that character's one cream. No second
 *            hue, no rim light. A character may carry exactly one identity
 *            marker in a colour of its own — a satchel, a bandana, a bow —
 *            and that is the only place another colour is allowed on a body.
 *   RULE 02  Faces are always ink. Only the blush and the tongue are warm.
 *   RULE 03  No outlines, and no detail that would vanish below 8px.
 *
 * ## What v2 changed, and why
 *
 * v1's RULE 01 forbade gradients and made every lighter form a white overlay
 * at a fixed opacity. That is what kept the cast flat, and flat is what the
 * approved sheet overturns: the head takes more of the frame, the eyes more
 * than double, the face gains a muzzle and an open mouth, and every form is
 * softly shaded from one light direction. The white overlay is gone because a
 * white overlay cannot make a cream belly — it can only make a paler hue.
 *
 * The rig itself is untouched in kind: four pivots, one pose table, one
 * expression table. Only the numbers moved, so every pose still tweens into
 * every other pose and no caller had to learn anything.
 */

/** The full-body drawing area. Everything below is in these user units. */
export const VIEWBOX = { x: 0, y: 0, width: 200, height: 240 } as const;

/**
 * Icon crop. Below 64px the limbs, the accessory and the shading all drop
 * away and the flat base hue carries the drawing, so the crop only has to
 * hold the head and the identity marker: ears span x 31-169 and the head
 * reaches y 32, and this box holds both with a hair of breathing room.
 */
export const VIEWBOX_COMPACT = { x: 34, y: 12, width: 132, height: 124 } as const;

/**
 * Icon crop for the four friends. Their identity markers sit lower and wider
 * than KIDDO's round ears — FOXY's ear points, BIBI's uprights, PIP's eye
 * bumps, WALLY's spout — so the box is square rather than short. Same rule, a
 * different box, because the silhouettes are genuinely different shapes.
 */
export const VIEWBOX_COMPACT_FRIEND = { x: 34, y: 12, width: 132, height: 132 } as const;

/** Below this width the character drops its limbs and becomes a head mark. */
export const COMPACT_BELOW_PX = 64;

/** One warm near-black, for every face and every piece of type. */
export const INK = "#2C2620";

/** The open mouth. Ink one step warmer, so the mouth is not a hole. */
export const MOUTH = "#3A2C28";

/** The tongue. The one warm thing inside the face. */
export const TONGUE = "#EE8095";

/** Cheeks only, drawn at 26–45%. Never a fill, never a surface. */
export const BLUSH = "#F0937C";

/** Rewards, stars and confetti. Not a character hue. */
export const HONEY = "#F7C55C";

/**
 * The default cream. Bellies, muzzles and inner ears.
 *
 * A real fill rather than white over the hue: a white overlay on orange is a
 * paler orange, and a fox's chest is not a paler fox.
 */
export const CREAM = { light: "#FBF2DA", deep: "#EDDCB4" } as const;

export interface Cream {
  light: string;
  deep: string;
}

/**
 * One cream per character, each warmed a step towards its own hue.
 *
 * These are near enough to read as one material across the cast — the whole
 * set sits inside a few Lab units of the default — but they are not one hex,
 * because a cream that ignores the fur around it turns yellow next to pink.
 * BIBI is the case that proves it: the default cream on a pink rabbit reads
 * as a stain rather than as a belly.
 *
 * Values are the character sheet's own, transcribed rather than derived: a
 * cream is chosen by eye against its hue, and no lightness rule gets it right
 * for five hues at once.
 */
const CREAMS: Readonly<Record<string, Cream>> = {
  "#86BE7C": { light: "#FBF2DA", deep: "#EDDCB4" },
  "#F08A3C": { light: "#FDF4E2", deep: "#F0E1C0" },
  "#F49BB4": { light: "#FEF6F2", deep: "#F7E2DE" },
  "#A8CE4F": { light: "#FBF3D6", deep: "#EDDFAC" },
  "#62A6DC": { light: "#FBF5E6", deep: "#EAE0C6" },
};

/** The cream for a hue, or the default cream if it has none. */
export function creamOf(hue: string): Cream {
  return CREAMS[hue.toUpperCase()] ?? CREAM;
}

/** One hue per character. Recolour by changing exactly one of these. */
export const HUES = {
  kiddo: "#86BE7C", // Sage · brand primary
  foxy: "#F08A3C", // Apricot
  bibi: "#F49BB4", // Blossom
  pip: "#A8CE4F", // Sprout
  wally: "#62A6DC", // Tide
} as const;

/**
 * The stops each hue is drawn at.
 *
 * One rule for the whole cast, which is what makes them a family. Every stop
 * is the base moved along lightness alone, in CIE Lab, at constant chroma, so
 * every character is lit exactly as hard as every other one:
 *
 *   light  +9   the lit face of a form
 *   base    0   the form itself
 *   limb    -5  arms and legs, which sit behind the mass
 *   deep   -10  the shaded face, and the pressed edge of a control
 *
 * `limb` is not a fourth way to shade a form — it is the one tone the parts
 * behind the silhouette are drawn in, so that an arm reads as an arm against
 * a body rather than dissolving into it. Nothing else may use it.
 *
 * The rule reproduces the approved sheet's own hand-picked stops for all five
 * characters to within two Lab units, which is why it is a rule and not five
 * decisions. The hex codes below are its output, written out so that a
 * drawing never does colour arithmetic at render time.
 *
 * A content pack may recolour a character to any hue — `shadesOf` falls back
 * to the flat hue at every stop, which reads as v1 did and never as a wrong
 * light.
 */
const SHADES: Readonly<Record<string, Omit<Shades, "base">>> = {
  "#86BE7C": { light: "#9ED794", limb: "#79B06F", deep: "#6CA363" },
  "#F08A3C": { light: "#FFA253", limb: "#E07D2F", deep: "#D17022" },
  "#F49BB4": { light: "#FFB4CD", limb: "#E58EA7", deep: "#D78099" },
  "#A8CE4F": { light: "#C2E767", limb: "#9AC041", deep: "#8CB234" },
  "#62A6DC": { light: "#7CBEF6", limb: "#5399CE", deep: "#448CC0" },
};

export interface Shades {
  light: string;
  base: string;
  limb: string;
  deep: string;
}

/** The stops for a hue, or the flat hue at every stop if it has none. */
export function shadesOf(hue: string): Shades {
  const shade = SHADES[hue.toUpperCase()];
  return shade
    ? { light: shade.light, base: hue, limb: shade.limb, deep: shade.deep }
    : { light: hue, base: hue, limb: hue, deep: hue };
}

/**
 * The one light direction, for the whole product: upper-left, 34% / 24%.
 *
 * Written here rather than in each `<radialGradient>` so that a scene, an
 * illustration and a character cannot disagree about where the sun is.
 */
export const LIGHT = { cx: "34%", cy: "24%", r: "86%" } as const;

/**
 * The rig: four pivots, all fixed. Every pose in the library is these four
 * parts rotated around these points, which is why poses can be tweened.
 *
 * v2 moved them down the frame with the body — the shoulders sit at the
 * belly line's shoulder and the hips at its hip — but they are still four
 * points and the pose table still reads in degrees around them.
 */
export const PIVOTS = {
  leftArm: { x: 46, y: 150 },
  rightArm: { x: 154, y: 150 },
  leftLeg: { x: 80, y: 188 },
  rightLeg: { x: 120, y: 188 },
} as const;

/** Body mass centre. Breathing scales around this point. */
export const BODY_CENTRE = { x: 100, y: 150 } as const;

/** Where the whole body leans and lifts from: the ground under its feet. */
export const GROUND = 228;

/** Default eye line. Individual faces override it; blinks scale around it. */
export const EYE_LINE = 92;

/** Eye centres, either side of the midline. Spacing 48, from the sheet. */
export const EYE_X = { left: 76, right: 124 } as const;

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
