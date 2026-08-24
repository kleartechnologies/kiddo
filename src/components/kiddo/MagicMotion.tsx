"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import {
  MAGIC_SPARKS,
  MAGIC_TIMING,
  magicMotion,
  type MagicMotionName,
} from "@/lib/magicMotion";

/**
 * Plays one motion from the Magic Motion vocabulary around whatever it wraps
 * — usually an `Illustration`, which itself never animates: the drawing stays
 * a still drawing and this wrapper is the thing that moves, exactly as a tile
 * moves around a subject today.
 *
 * The wrapper is invisible to a screen reader. It adds no role, no label and
 * no focusable surface, so a board sounds identical before, during and after
 * a motion plays.
 *
 * Reduced motion is decided here, once, in the house way: the subject is
 * placed at the motion's settled state instantly. A dog that would have
 * walked is already at the house; a thing that would have popped is simply
 * there. Nothing is hidden and nothing is lost.
 *
 * It is decided in `animate`, never in `initial`, because `initial` is the
 * style the server writes into the HTML and `useReducedMotion` is `false`
 * there — an `initial` that changed on a reduced-motion client would be a
 * hydration mismatch (measured as a console error on the reduced passes of
 * the measurement scripts). So both renders agree on where a motion starts,
 * and a reduced client goes from there to settled in no time at all.
 */
export function MagicMotion({
  motion: name,
  playKey = 0,
  distance,
  rise,
  delay,
  className,
  onDone,
  children,
}: {
  /** Which behaviour from the vocabulary. */
  motion: MagicMotionName;
  /**
   * 0 = not played yet: the subject rests, simply visible, at its start.
   * Raise it (1, 2, 3…) to play the motion; raise it again to replay.
   */
  playKey?: number;
  /** Travel in px, for `walk` and `slide`. */
  distance?: number;
  /** Vertical travel in px, for `walk` — down when positive, up when negative. */
  rise?: number;
  /** Seconds before starting, for "one by one" sequences. */
  delay?: number;
  className?: string;
  /** Fires when the motion settles. Never required to continue. */
  onDone?: () => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const spec = magicMotion(name, { distance, rise, delay });
  const played = playKey > 0;
  const animating = played && !reduced;
  const marks = (name === "sparkle" || name === "celebrate") && animating;

  return (
    <span data-magic={name} className={cn("relative inline-flex", className)}>
      <motion.span
        key={playKey}
        data-magic-subject=""
        className="inline-flex"
        /* `played`, not `animating`: the server and the client must write the
           same starting style — see the reduced-motion note above. */
        initial={played ? spec.initial : false}
        animate={animating ? spec.animate : played ? spec.settled : spec.idle}
        transition={animating ? undefined : { duration: 0 }}
        onAnimationComplete={animating ? onDone : undefined}
      >
        {children}
      </motion.span>
      {marks ? <Sparks playKey={playKey} delay={delay ?? 0} /> : null}
    </span>
  );
}

/**
 * Three honey diamonds — the character rig's own confetti marks, kept to the
 * rig's own rule: at most three, never a particle system. They live and die
 * in under a second and end invisible, so nothing is left to loop.
 */
function Sparks({ playKey, delay }: { playKey: number; delay: number }) {
  return (
    <>
      {MAGIC_SPARKS.map((spark, index) => (
        <motion.svg
          key={`${playKey}-${index}`}
          data-magic-spark=""
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 10 10"
          className="pointer-events-none absolute"
          style={{
            left: spark.left,
            top: spark.top,
            width: spark.size,
            height: spark.size,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: MAGIC_TIMING.spark,
            ease: "easeOut",
            delay: delay + spark.delay,
          }}
        >
          <rect
            x={1}
            y={1}
            width={8}
            height={8}
            rx={2}
            transform="rotate(45 5 5)"
            fill="var(--color-honey-base)"
          />
        </motion.svg>
      ))}
    </>
  );
}
