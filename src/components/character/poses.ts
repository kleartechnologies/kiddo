import type { Expression } from "./expressions";
import type { EffectId } from "./parts";

/**
 * KIDDO's pose library.
 *
 * Each pose is the same rig at different rotations, so any two poses can be
 * tweened. A pose names a product moment, not a feeling — the feeling is the
 * expression, and it can be overridden.
 *
 * Angles are degrees around the fixed pivots in `canon.ts`. Positive rotates
 * the limb away from the body on the left and towards it on the right, which
 * is why the two arm values are usually mirrored.
 */

export type Pose =
  | "idle"
  | "wave"
  | "point"
  | "cheer"
  | "celebrate"
  | "reassure"
  | "think"
  | "receive"
  | "wonder"
  | "hint"
  | "rest";

export interface PoseSpec {
  label: string;
  /** Where this pose is used. If a moment isn't listed, use `idle`. */
  moment: string;
  /** The face this pose ships with. Override only with a good reason. */
  expression: Expression;
  /** [left, right] shoulder rotation in degrees. */
  arms: [number, number];
  /** [left, right] hip rotation in degrees. */
  legs: [number, number];
  /** Shoulder pivot overrides, when the arm needs to sit higher. */
  armPivots?: [{ x: number; y: number }, { x: number; y: number }];
  /** Whole-body lean: degrees, around a point low in the body. */
  tilt?: { deg: number; x: number; y: number };
  /** Whole-body lift, for poses that leave the ground. */
  lift?: number;
  /** Overrides the expression's own effect layer. */
  effect?: EffectId;
}

export const POSES: Record<Pose, PoseSpec> = {
  idle: {
    label: "Idle",
    moment: "The default on every screen. Breathing, blinking, nothing else.",
    expression: "happy",
    arms: [24, -24],
    legs: [0, 0],
  },

  wave: {
    label: "Wave",
    moment: "Onboarding and greetings. One arm up, and only one arm moves.",
    expression: "happy",
    arms: [20, -118],
    legs: [0, 0],
    armPivots: [
      { x: 54, y: 112 },
      { x: 150, y: 114 },
    ],
  },

  point: {
    label: "Point",
    moment: "Instructions. The arm goes straight out at the thing to tap.",
    expression: "curious",
    arms: [18, -88],
    legs: [0, 0],
  },

  cheer: {
    label: "Cheer",
    moment: "A correct answer. Held about 600ms, then back to idle.",
    expression: "excited",
    arms: [84, -84],
    legs: [-12, 12],
    armPivots: [
      { x: 54, y: 110 },
      { x: 146, y: 110 },
    ],
    lift: -4,
  },

  celebrate: {
    label: "Celebrate",
    moment: "A level or a streak finished. The biggest pose in the set.",
    expression: "celebrating",
    arms: [102, -102],
    legs: [-26, 20],
    armPivots: [
      { x: 54, y: 110 },
      { x: 146, y: 110 },
    ],
    lift: -8,
    effect: "confetti",
  },

  reassure: {
    label: "Reassure",
    moment: "A wrong answer. An open hand and a lean in: try the other one.",
    expression: "encouraging",
    arms: [34, -100],
    legs: [0, 0],
    tilt: { deg: -5, x: 100, y: 180 },
  },

  think: {
    label: "Think",
    moment: "Loading, and empty states. Looking off past the frame.",
    expression: "thinking",
    arms: [18, -122],
    legs: [0, 0],
    armPivots: [
      { x: 54, y: 112 },
      { x: 150, y: 114 },
    ],
    tilt: { deg: 4, x: 100, y: 180 },
  },

  receive: {
    label: "Receive",
    moment: "A reward unlocking. Both hands up, the reward drops between them.",
    expression: "surprised",
    arms: [132, -132],
    legs: [0, 0],
    armPivots: [
      { x: 58, y: 104 },
      { x: 142, y: 104 },
    ],
    effect: "reward",
  },

  wonder: {
    label: "Wonder",
    moment: "The child is stuck. The whole body tilts, and nothing else moves.",
    expression: "confused",
    arms: [24, -24],
    legs: [0, 0],
    tilt: { deg: 6, x: 100, y: 170 },
  },

  hint: {
    label: "Hint",
    moment: "A nudge before the child gives up. One arm half-raised.",
    expression: "wink",
    arms: [24, -74],
    legs: [0, 0],
  },

  rest: {
    label: "Rest",
    moment: "Session over. Signals the end of screen time, quietly.",
    expression: "sleepy",
    arms: [6, -6],
    legs: [0, 0],
    tilt: { deg: -10, x: 100, y: 195 },
  },
};

export const POSE_ORDER: Pose[] = [
  "idle",
  "wave",
  "point",
  "cheer",
  "celebrate",
  "reassure",
  "think",
  "receive",
  "wonder",
  "hint",
  "rest",
];
