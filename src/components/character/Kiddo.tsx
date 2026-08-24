"use client";

import { motion, useReducedMotion, type MotionStyle } from "framer-motion";

import { cn } from "@/lib/cn";
import {
  BODY_CENTRE,
  COMPACT_BELOW_PX,
  HUES,
  PIVOTS,
  REACTION,
  TIMING,
  VIEWBOX,
  VIEWBOX_COMPACT,
} from "./canon";
import { FACES, type Expression } from "./expressions";
import { Arm, Body, Cheeks, Ear, Effect, Leg, Shadow, type EffectId } from "./parts";
import { POSES, type Pose } from "./poses";
import { useBlink } from "./useBlink";

/**
 * KIDDO.
 *
 * One character, assembled from the layers in `parts.tsx`, wearing one of the
 * faces in `expressions.tsx`, held in one of the poses in `poses.ts`.
 *
 * The rig is the production character — not a placeholder for an export. An
 * expression costs a few shapes, a pose costs four numbers, and every pose can
 * tween into every other pose because they are all the same seven layers.
 *
 * Motion is deliberately quiet. KIDDO breathes and blinks and nothing else,
 * unless a pose asks for more. The mascot supports the screen; it never
 * becomes the screen.
 */

export interface KiddoProps {
  /** Which product moment. Carries a default expression and default motion. */
  pose?: Pose;
  /** Override the pose's face. */
  expression?: Expression;
  /** Any of the five character hues, or a content-pack recolour. */
  hue?: string;
  /** Rendered width in px. Below 64px the limbs drop away automatically. */
  size?: number;
  /** Force the full body or the head mark, instead of deciding from `size`. */
  variant?: "auto" | "full" | "compact";
  /** Breathing, blinking and ear lag. Turn off in dense grids. */
  alive?: boolean;
  /** Override the pose's atmosphere. `"none"` removes it. */
  effect?: EffectId | "none";
  /** Only pass this when the character carries meaning, e.g. "find KIDDO". */
  label?: string;
  className?: string;
}

/**
 * Rotation about a point in the drawing's own coordinates.
 *
 * `originX`/`originY` rather than `transformOrigin`: Motion rebuilds
 * `transform-origin` from its own value pipeline on every frame and falls back
 * to `50% 50%`, so a plain `transformOrigin` string is silently overwritten and
 * every limb ends up swinging around the centre of the viewBox.
 */
function pivotStyle(x: number, y: number): MotionStyle {
  return { transformBox: "view-box", originX: `${x}px`, originY: `${y}px` };
}

export function Kiddo({
  pose = "idle",
  expression,
  hue = HUES.kiddo,
  size,
  variant = "auto",
  alive = true,
  effect,
  label,
  className,
}: KiddoProps) {
  const reduced = useReducedMotion();
  const moving = alive && !reduced;

  const spec = POSES[pose];
  const face = FACES[expression ?? spec.expression];
  const blinking = useBlink(moving && face.blinkable);

  const compact =
    variant === "compact" ||
    (variant === "auto" && size !== undefined && size < COMPACT_BELOW_PX);

  const box = compact ? VIEWBOX_COMPACT : VIEWBOX;
  const viewBox = compact
    ? `${box.x} ${box.y} ${box.width} ${box.height}`
    : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`;

  const [leftPivot, rightPivot] = spec.armPivots ?? [PIVOTS.leftArm, PIVOTS.rightArm];
  /* Pose atmosphere wins over the face's own, and either can be removed. */
  const shownEffect = effect === "none" ? undefined : (effect ?? spec.effect ?? face.effect);

  /* Idle: the body swells 2%, the ears follow 120ms later. Nothing else. */
  const breathe = moving
    ? { scale: [1, TIMING.breatheScale, 1] }
    : { scale: 1 };
  const breatheTransition = {
    duration: TIMING.breatheSeconds,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  /* Poses that leave the ground get a small bounce on top of the lift. */
  const bouncing = moving && (pose === "cheer" || pose === "celebrate");
  const lift = spec.lift ?? 0;

  const arms: { angle: number; pivot: { x: number; y: number }; key: string }[] = [
    { angle: spec.arms[0], pivot: leftPivot, key: "left" },
    { angle: spec.arms[1], pivot: rightPivot, key: "right" },
  ];

  const renderArm = ({
    angle,
    pivot,
    key,
  }: {
    angle: number;
    pivot: { x: number; y: number };
    key: string;
  }) => {
    /* Wave is the one continuous limb animation, and only one arm moves. */
    const waving = moving && pose === "wave" && key === "right";
    return (
      <motion.g
        key={key}
        style={pivotStyle(0, 0)}
        initial={false}
        animate={{
          x: pivot.x,
          y: pivot.y,
          rotate: waving ? [angle, angle - 18, angle] : angle,
        }}
        transition={
          waving
            ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
            : REACTION
        }
      >
        <Arm hue={hue} />
      </motion.g>
    );
  };

  const body = (
    <>
      {/* Legs first: always behind the body mass. Dropped on the icon crop. */}
      {!compact &&
        ([
          { angle: spec.legs[0], pivot: PIVOTS.leftLeg, key: "leftLeg" },
          { angle: spec.legs[1], pivot: PIVOTS.rightLeg, key: "rightLeg" },
        ] as const).map(({ angle, pivot, key }) => (
          <motion.g
            key={key}
            style={pivotStyle(0, 0)}
            initial={false}
            animate={{ x: pivot.x, y: pivot.y, rotate: angle }}
            transition={REACTION}
          >
            <Leg hue={hue} />
          </motion.g>
        ))}

      {/* Arms are always behind the core mass, at every angle. A raised arm
          reads as raised because of where the hand lands, never because it
          crosses the face. */}
      {!compact && arms.map(renderArm)}

      {/* Ears sit behind the body and trail its breathe. */}
      <motion.g
        style={pivotStyle(BODY_CENTRE.x, BODY_CENTRE.y)}
        animate={breathe}
        transition={{ ...breatheTransition, delay: TIMING.earLagSeconds }}
      >
        <Ear side="left" hue={hue} />
        <Ear side="right" hue={hue} />
      </motion.g>

      {/* The core: body and face breathe together so the face never drifts. */}
      <motion.g
        style={pivotStyle(BODY_CENTRE.x, BODY_CENTRE.y)}
        animate={breathe}
        transition={breatheTransition}
      >
        <Body hue={hue} />

        {/* The face layer. Swapping this is the whole expression system. */}
        <motion.g
          style={pivotStyle(100, face.eyeLine)}
          initial={false}
          animate={{ scaleY: blinking ? 0.1 : 1 }}
          transition={{ duration: TIMING.blinkSeconds, ease: "easeOut" }}
        >
          {face.eyes}
        </motion.g>
        {face.brows}
        {face.mouth}
        <Cheeks opacity={face.cheeks} />
      </motion.g>

    </>
  );

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size ? (size * box.height) / box.width : undefined}
      /* The full body lets its effect layer spill; the icon crop must not. */
      className={cn(compact ? "overflow-hidden" : "overflow-visible", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {!compact && <Shadow />}

      <motion.g
        style={
          spec.tilt
            ? pivotStyle(spec.tilt.x, spec.tilt.y)
            : pivotStyle(BODY_CENTRE.x, 180)
        }
        initial={false}
        animate={{
          rotate: spec.tilt?.deg ?? 0,
          y: bouncing ? [lift, lift - 7, lift] : lift,
        }}
        transition={
          bouncing
            ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
            : REACTION
        }
      >
        {body}
      </motion.g>

      {/* Atmosphere last, and never on the icon crop. */}
      {!compact && shownEffect && <Effect id={shownEffect} />}
    </svg>
  );
}

/** Kept for callers that only want the mark, e.g. a favicon or an avatar. */
export function KiddoMark({ size = 32, hue = HUES.kiddo, className }: {
  size?: number;
  hue?: string;
  className?: string;
}) {
  return (
    <Kiddo variant="compact" size={size} hue={hue} alive={false} className={className} />
  );
}
