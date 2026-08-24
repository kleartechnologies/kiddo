import type { ReactNode } from "react";

import { INK } from "./canon";
import type { EffectId } from "./parts";

/**
 * KIDDO's expression library.
 *
 * The body never changes between these. Expression lives entirely in a
 * swappable face layer of at most six shapes, which is why a new emotion is
 * cheap and why every emotion is unmistakably the same character.
 *
 * Eight of these are transcribed from the approved character sheet. `wink`
 * and `confused` were built afterwards from the same parts — the same eye
 * ellipse, the same closed-eye arc, the same stroke weights — so they sit in
 * the sheet without redrawing anything.
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
  /** Blush opacity, 0.26–0.45. Intensity lives here, not in a new colour. */
  cheeks: number;
  /** Atmosphere that belongs with this face by default. */
  effect?: EffectId;
  eyes: ReactNode;
  brows?: ReactNode;
  mouth: ReactNode;
}

/** The open eye. One ink ellipse and one offset highlight, never a pupil. */
function OpenEye({
  x,
  y,
  rx = 11.5,
  ry = 13.5,
  hr = 4,
}: {
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  hr?: number;
}) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={INK} />
      <circle cx={x + 4.5} cy={y - 5.5} r={hr} fill="#FFFFFF" />
    </>
  );
}

/** The closed eye: an arc bowing away from the ink. Happy, never sad. */
function ClosedEye({
  x,
  y,
  half = 11,
  rise = 7,
  width = 5.5,
}: {
  x: number;
  y: number;
  half?: number;
  rise?: number;
  width?: number;
}) {
  return (
    <path
      d={`M${x - half} ${y} Q${x} ${y - rise} ${x + half} ${y}`}
      fill="none"
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function Brow({ x, y, half, rise }: { x: number; y: number; half: number; rise: number }) {
  return (
    <path
      d={`M${x - half} ${y} Q${x} ${y - rise} ${x + half} ${y}`}
      fill="none"
      stroke={INK}
      strokeWidth={4.5}
      strokeLinecap="round"
    />
  );
}

function Smile({ d, width = 5.5 }: { d: string; width?: number }) {
  return (
    <path d={d} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" />
  );
}

/** Open mouth. The only place a tongue is allowed, and only in these two. */
function OpenMouth({
  d,
  tongue,
}: {
  d: string;
  tongue: { cy: number; rx: number; ry: number };
}) {
  return (
    <>
      <path d={d} fill={INK} />
      <ellipse cx={100} cy={tongue.cy} rx={tongue.rx} ry={tongue.ry} fill="#EFA6AB" />
    </>
  );
}

export const FACES: Record<Expression, FaceSpec> = {
  happy: {
    label: "Happy",
    meaning: "The default. Every screen KIDDO simply appears on.",
    eyeLine: 110,
    blinkable: true,
    cheeks: 0.32,
    eyes: (
      <>
        <OpenEye x={81} y={110} />
        <OpenEye x={119} y={110} />
      </>
    ),
    mouth: <Smile d="M87 139 Q100 152 113 139" />,
  },

  curious: {
    label: "Curious",
    meaning: "Asking a question, or pointing at what the child should tap.",
    eyeLine: 109,
    blinkable: true,
    cheeks: 0.32,
    eyes: (
      <>
        <OpenEye x={86} y={109} rx={11} ry={13} hr={3.8} />
        <OpenEye x={124} y={109} rx={11} ry={13} hr={3.8} />
      </>
    ),
    brows: <Brow x={123} y={88} half={11} rise={7} />,
    mouth: <ellipse cx={102} cy={142} rx={6.5} ry={7.5} fill={INK} />,
  },

  thinking: {
    label: "Thinking",
    meaning: "Loading, working something out, or an empty state.",
    eyeLine: 106,
    blinkable: true,
    cheeks: 0.32,
    effect: "thought",
    eyes: (
      <>
        <OpenEye x={79} y={106} rx={10} ry={11.5} hr={3.4} />
        <OpenEye x={117} y={106} rx={10} ry={11.5} hr={3.4} />
      </>
    ),
    brows: (
      <>
        <Brow x={78.5} y={86} half={12.5} rise={6} />
        <Brow x={117} y={85.5} half={12} rise={5.5} />
      </>
    ),
    mouth: <Smile d="M92 143 Q100 139 109 142" width={5} />,
  },

  surprised: {
    label: "Surprised",
    meaning: "Something new appeared. A reward, an unlock, a reveal.",
    eyeLine: 108,
    blinkable: false,
    cheeks: 0.32,
    eyes: (
      <>
        <circle cx={81} cy={108} r={15} fill={INK} />
        <circle cx={86} cy={102} r={5.5} fill="#FFFFFF" />
        <circle cx={119} cy={108} r={15} fill={INK} />
        <circle cx={124} cy={102} r={5.5} fill="#FFFFFF" />
      </>
    ),
    brows: (
      <>
        <Brow x={81} y={82} half={15} rise={8} />
        <Brow x={119} y={82} half={15} rise={8} />
      </>
    ),
    mouth: <ellipse cx={100} cy={145} rx={9.5} ry={12} fill={INK} />,
  },

  confused: {
    label: "Confused",
    meaning:
      "The child is stuck. Never a frown: KIDDO is puzzled with them, not at them.",
    eyeLine: 110,
    blinkable: true,
    cheeks: 0.3,
    eyes: (
      <>
        {/* One eye a touch smaller. A squint, not a scowl. */}
        <OpenEye x={84} y={111} rx={9.5} ry={10.5} hr={3.4} />
        <OpenEye x={122} y={108} />
      </>
    ),
    mouth: <Smile d="M88 141 Q95 135 101 141 Q107 147 114 141" width={5} />,
  },

  encouraging: {
    label: "Encouraging",
    meaning: "A wrong answer. The face the child sees most when they need it.",
    eyeLine: 110,
    blinkable: false,
    cheeks: 0.32,
    eyes: (
      <>
        <OpenEye x={81} y={110} />
        <ClosedEye x={119} y={110} />
      </>
    ),
    mouth: <Smile d="M86 137 Q100 151 112 137" />,
  },

  celebrating: {
    label: "Celebrating",
    meaning: "A level finished. The biggest face in the set, used sparingly.",
    eyeLine: 105,
    blinkable: false,
    cheeks: 0.45,
    eyes: (
      <>
        <ClosedEye x={81} y={113} rise={16} width={6.5} half={12} />
        <ClosedEye x={119} y={113} rise={16} width={6.5} half={12} />
      </>
    ),
    mouth: (
      <OpenMouth d="M79 131 Q100 166 121 131 Z" tongue={{ cy: 153, rx: 9, ry: 6 }} />
    ),
  },

  wink: {
    label: "Wink",
    meaning: "A hint, or a nudge towards the answer. Playful, never smug.",
    eyeLine: 110,
    blinkable: false,
    cheeks: 0.36,
    eyes: (
      <>
        <ClosedEye x={81} y={110} />
        <OpenEye x={119} y={110} />
      </>
    ),
    mouth: <Smile d="M86 138 Q100 154 114 138" />,
  },

  sleepy: {
    label: "Sleepy",
    meaning: "The session is over. Ends screen time without a warning tone.",
    eyeLine: 107,
    blinkable: false,
    cheeks: 0.26,
    effect: "sleep",
    eyes: (
      <>
        <ClosedEye x={81} y={107} rise={-12} width={5.5} half={12} />
        <ClosedEye x={119} y={107} rise={-12} width={5.5} half={12} />
      </>
    ),
    mouth: <ellipse cx={100} cy={141} rx={5.5} ry={6.5} fill={INK} />,
  },

  excited: {
    label: "Excited",
    meaning: "A correct answer. Held briefly, then back to idle.",
    eyeLine: 105,
    blinkable: false,
    cheeks: 0.4,
    effect: "sparkle",
    eyes: (
      <>
        <ClosedEye x={81} y={113} rise={16} width={6.5} half={12} />
        <ClosedEye x={119} y={113} rise={16} width={6.5} half={12} />
      </>
    ),
    mouth: (
      <OpenMouth d="M83 133 Q100 161 117 133 Z" tongue={{ cy: 150, rx: 7, ry: 5 }} />
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
