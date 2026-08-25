import type { ReactNode } from "react";

import { EYE_LINE, EYE_X, INK, MOUTH, TONGUE } from "./canon";
import { Nose, type EffectId } from "./parts";

/**
 * KIDDO's expression library.
 *
 * The body never changes between these. Expression lives entirely in a
 * swappable face layer of at most six shapes, which is why a new emotion is
 * cheap and why every emotion is unmistakably the same character.
 *
 * Six of these are transcribed from the approved character sheet. The other
 * four were built afterwards from the same parts — the same eye circle, the
 * same closed-eye arc, the same brow stroke, the same open mouth — so they
 * sit in the sheet without redrawing anything.
 *
 * ## The v2 face
 *
 * The eyes went from an 11×13 ellipse to a circle of radius 15.5, and gained
 * a second highlight: a big catchlight up and to the left, where the light
 * is, and a small dim glint down and to the right, where the light bounces
 * back. That pair is most of what makes the eye read as wet rather than as a
 * dot, and it is the single change that does the most for warmth.
 *
 * Brows are their own layer now rather than part of the eye, because a brow
 * that can move independently is worth four expressions on its own. And the
 * default mouth is open: KIDDO's resting face is mid-delight, not polite.
 */

export type Expression =
  | "happy"
  | "curious"
  | "thinking"
  | "surprised"
  | "confused"
  | "encouraging"
  | "celebrating"
  | "wink"
  | "sleepy"
  | "excited";

export interface FaceSpec {
  label: string;
  /** The product moment this face is for. Keeps usage honest. */
  meaning: string;
  /** Y of the eye centres. Blinks squash around this line. */
  eyeLine: number;
  /** False when the eyes are already drawn closed. */
  blinkable: boolean;
  /** Blush opacity, 0.4–0.62. Intensity lives here, not in a new colour. */
  cheeks: number;
  /** Bigger cheeks for the two loudest faces. */
  cheekSize?: { rx: number; ry: number };
  /** Atmosphere that belongs with this face by default. */
  effect?: EffectId;
  eyes: ReactNode;
  brows?: ReactNode;
  /** Overridden only when the face is looking off to one side. */
  nose?: ReactNode;
  mouth: ReactNode;
}

/**
 * The open eye: one ink circle, one catchlight, one glint.
 *
 * Never a pupil and never an iris — a pupil small enough to read as a pupil
 * disappears at 24px, and a character whose gaze vanishes at icon size is a
 * character with two different faces.
 */
function OpenEye({ x, y, r = 15.5 }: { x: number; y: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x - r * 0.39} cy={y - r * 0.39} r={r * 0.348} fill="#FFFFFF" />
      <circle cx={x + r * 0.39} cy={y + r * 0.45} r={r * 0.168} fill="#FFFFFF" opacity={0.5} />
    </>
  );
}

/** The closed eye: an arc bowing away from the ink. Happy, never sad. */
function ClosedEye({
  x,
  y,
  half = 14,
  rise = 16,
  width = 7,
}: {
  x: number;
  y: number;
  half?: number;
  rise?: number;
  width?: number;
}) {
  return (
    <path
      d={`M${x - half},${y} Q${x},${y - rise} ${x + half},${y}`}
      fill="none"
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

/**
 * One brow, given as a path.
 *
 * Drawn as literal geometry rather than as an arc with a half-width and a
 * rise, because the whole point of the brow layer is that the two ends move
 * independently — a brow whose ends are forced level can only be surprised.
 */
function Brow({ d }: { d: string }) {
  return (
    <path d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
  );
}

/** A closed smile, drawn as a stroke. The quiet end of the mouth range. */
function Smile({ d, width = 5 }: { d: string; width?: number }) {
  return (
    <path d={d} fill="none" stroke={MOUTH} strokeWidth={width} strokeLinecap="round" />
  );
}

/**
 * The open mouth: an ink cavity with a tongue in it.
 *
 * The cavity is `MOUTH` rather than `INK` — a hair warmer — so that the
 * mouth reads as a mouth and not as a hole cut in the face.
 */
function OpenMouth({ d, tongue }: { d: string; tongue?: string }) {
  return (
    <>
      <path d={d} fill={MOUTH} />
      {tongue ? <path d={tongue} fill={TONGUE} /> : null}
    </>
  );
}

const [LX, RX] = [EYE_X.left, EYE_X.right];

export const FACES: Record<Expression, FaceSpec> = {
  happy: {
    label: "Happy",
    meaning: "The default. Every screen KIDDO simply appears on.",
    eyeLine: EYE_LINE,
    blinkable: true,
    cheeks: 0.5,
    eyes: (
      <>
        <OpenEye x={LX} y={EYE_LINE} />
        <OpenEye x={RX} y={EYE_LINE} />
      </>
    ),
    /* Level, soft, and a hair apart. The master sheet's resting brows: they
       do nothing on their own, which is the point — they are the baseline
       every other brow in the set is read against. */
    brows: (
      <>
        <Brow d="M65,68 Q76,60 87,65" />
        <Brow d="M113,65 Q124,60 135,68" />
      </>
    ),
    mouth: (
      <OpenMouth d="M85,117 Q100,138 115,117 Z" tongue="M92,125 Q100,135 108,125 Z" />
    ),
  },

  curious: {
    label: "Curious",
    meaning: "Asking a question, or pointing at what the child should tap.",
    eyeLine: EYE_LINE,
    blinkable: true,
    cheeks: 0.5,
    eyes: (
      <>
        <OpenEye x={LX} y={EYE_LINE} />
        <OpenEye x={RX} y={EYE_LINE} />
      </>
    ),
    /* One brow up. The whole of "I wonder", in a single stroke. */
    brows: (
      <>
        <Brow d="M63,64 Q76,54 89,62" />
        <Brow d="M113,68 Q124,63 135,70" />
      </>
    ),
    mouth: <ellipse cx={100} cy={122} rx={7} ry={6} fill={MOUTH} />,
  },

  thinking: {
    label: "Thinking",
    meaning: "Loading, working something out, or an empty state.",
    eyeLine: EYE_LINE,
    blinkable: true,
    cheeks: 0.46,
    effect: "thought",
    /* Both eyes and the nose shift right: KIDDO is looking off past the
       frame, which is what makes the thought dots read as thought. */
    eyes: (
      <>
        <OpenEye x={LX + 4} y={EYE_LINE} />
        <OpenEye x={RX + 4} y={EYE_LINE} />
      </>
    ),
    brows: (
      <>
        <Brow d="M64,72 Q77,62 90,68" />
        <Brow d="M116,66 Q129,61 140,68" />
      </>
    ),
    nose: <Nose cx={103} />,
    mouth: <Smile d="M92,122 L114,120" />,
  },

  surprised: {
    label: "Surprised",
    meaning: "Something new appeared. A reward, an unlock, a reveal.",
    eyeLine: EYE_LINE,
    blinkable: false,
    cheeks: 0.5,
    eyes: (
      <>
        <OpenEye x={LX} y={EYE_LINE} r={17.5} />
        <OpenEye x={RX} y={EYE_LINE} r={17.5} />
      </>
    ),
    brows: (
      <>
        <Brow d="M61,58 Q76,48 91,58" />
        <Brow d="M109,58 Q124,48 139,58" />
      </>
    ),
    mouth: <ellipse cx={100} cy={124} rx={9.5} ry={11} fill={MOUTH} />,
  },

  confused: {
    label: "Confused",
    meaning:
      "The child is stuck. Never a frown: KIDDO is puzzled with them, not at them.",
    eyeLine: EYE_LINE,
    blinkable: true,
    cheeks: 0.46,
    eyes: (
      <>
        {/* One eye a touch smaller. A squint, not a scowl. */}
        <OpenEye x={LX + 2} y={EYE_LINE} r={13} />
        <OpenEye x={RX} y={EYE_LINE} />
      </>
    ),
    brows: (
      <>
        <Brow d="M63,62 Q76,54 89,64" />
        <Brow d="M113,68 Q124,72 135,64" />
      </>
    ),
    mouth: <Smile d="M87,121 Q94,115 100,121 Q106,127 113,120" />,
  },

  encouraging: {
    label: "Encouraging",
    meaning: "A wrong answer. The face the child sees most when they need it.",
    eyeLine: EYE_LINE,
    blinkable: true,
    cheeks: 0.5,
    eyes: (
      <>
        <OpenEye x={LX} y={EYE_LINE} />
        <OpenEye x={RX} y={EYE_LINE} />
      </>
    ),
    /* Both brows soft and level, and a closed smile. Warm without being
       thrilled — anything louder reads as praise for a wrong answer. */
    brows: (
      <>
        <Brow d="M63,70 Q76,66 89,71" />
        <Brow d="M111,71 Q124,66 137,70" />
      </>
    ),
    mouth: <Smile d="M88,120 Q100,128 112,120" />,
  },

  celebrating: {
    label: "Celebrating",
    meaning: "A level finished. The biggest face in the set, used sparingly.",
    eyeLine: EYE_LINE,
    blinkable: false,
    cheeks: 0.62,
    cheekSize: { rx: 13, ry: 9.5 },
    eyes: (
      <>
        <ClosedEye x={LX} y={94} rise={20} />
        <ClosedEye x={RX} y={94} rise={20} />
      </>
    ),
    mouth: (
      <OpenMouth d="M78,114 Q100,148 122,114 Z" tongue="M89,128 Q100,140 111,128 Z" />
    ),
  },

  wink: {
    label: "Wink",
    meaning: "A hint, or a nudge towards the answer. Playful, never smug.",
    eyeLine: EYE_LINE,
    blinkable: false,
    cheeks: 0.54,
    eyes: (
      <>
        <ClosedEye x={LX} y={EYE_LINE} rise={13} />
        <OpenEye x={RX} y={EYE_LINE} />
      </>
    ),
    brows: <Brow d="M111,66 Q124,60 137,68" />,
    mouth: (
      <OpenMouth d="M85,116 Q100,136 115,116 Z" tongue="M92,126 Q100,134 108,126 Z" />
    ),
  },

  sleepy: {
    label: "Sleepy",
    meaning: "The session is over. Ends screen time without a warning tone.",
    eyeLine: EYE_LINE,
    blinkable: false,
    cheeks: 0.4,
    effect: "sleep",
    /* The one place the arc bows the other way. Drooping, not sad: the brows
       stay level above it, which is the whole difference. */
    eyes: (
      <>
        <ClosedEye x={LX} y={88} rise={-11} width={6} />
        <ClosedEye x={RX} y={88} rise={-11} width={6} />
      </>
    ),
    mouth: <ellipse cx={100} cy={122} rx={6} ry={7} fill={MOUTH} />,
  },

  excited: {
    label: "Excited",
    meaning: "A correct answer. Held briefly, then back to idle.",
    eyeLine: EYE_LINE,
    blinkable: false,
    cheeks: 0.62,
    cheekSize: { rx: 13, ry: 9.5 },
    effect: "sparkle",
    eyes: (
      <>
        <ClosedEye x={LX} y={92} />
        <ClosedEye x={RX} y={92} />
      </>
    ),
    mouth: (
      <OpenMouth d="M82,116 Q100,142 118,116 Z" tongue="M91,128 Q100,138 109,128 Z" />
    ),
  },
};

/** Display order for the expression sheet. */
export const EXPRESSION_ORDER: Expression[] = [
  "happy",
  "curious",
  "thinking",
  "surprised",
  "confused",
  "encouraging",
  "celebrating",
  "wink",
  "sleepy",
  "excited",
];
