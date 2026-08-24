import type { TargetAndTransition } from "framer-motion";

import { springSoft } from "@/lib/motion";

/**
 * The Magic Motion vocabulary.
 *
 * Eight reusable behaviours that let a thing in KIDDO respond to what a child
 * did — "I did something… and the world responded." They sit beside the
 * springs in `lib/motion.ts` and go through the same `MotionProvider`.
 *
 * What this file is: how an object moves. What it is not: what an object
 * means. Nothing in here knows what a correct answer is, where an animal
 * lives, or what is being taught — the learning system keeps all of that.
 *
 * The house rules apply in full: every motion is short, settles, and
 * communicates one thing. Nothing here repeats forever — even `float`, the
 * one behaviour allowed to drift, drifts for a fixed while and then rests.
 */

export type MagicMotionName =
  | "pop"
  | "bounce"
  | "float"
  | "slide"
  | "walk"
  | "grow"
  | "sparkle"
  | "celebrate";

/** Written out by hand because a union cannot be enumerated at runtime. */
export const MAGIC_MOTIONS: readonly MagicMotionName[] = [
  "pop",
  "bounce",
  "float",
  "slide",
  "walk",
  "grow",
  "sparkle",
  "celebrate",
] as const;

export function isMagicMotion(name: string): name is MagicMotionName {
  return (MAGIC_MOTIONS as readonly string[]).includes(name);
}

export interface MagicMotionOptions {
  /**
   * How far a travelling motion goes, in px. `walk` moves this far right;
   * `slide` arrives from this far left. Ignored by every other motion.
   */
  distance?: number;
  /**
   * How far `walk` also travels down (up when negative), in px. A walk is a
   * journey to a *place*, and the place is not always level with the start:
   * without this, a walker could only ever arrive at whatever happened to sit
   * in its own row. Ignored by every other motion.
   */
  rise?: number;
  /** Seconds to wait before starting. How "one by one" is authored. */
  delay?: number;
}

export interface MagicMotionSpec {
  /** What the movement communicates. A motion that says nothing is cut. */
  says: string;
  /** What an unplayed subject looks like: simply there, at its start. */
  idle: TargetAndTransition;
  /** Where the played animation begins. */
  initial: TargetAndTransition;
  /** The played animation. Always ends exactly at `settled`. */
  animate: TargetAndTransition;
  /**
   * Where the animation ends — and the whole result under reduced motion,
   * applied instantly. The child never loses information: a dog that would
   * have walked is already at the house.
   */
  settled: TargetAndTransition;
}

/** Tween lengths in seconds, in one place so the tests can hold them down. */
export const MAGIC_TIMING = {
  bounce: 0.55,
  float: 12,
  walk: 1.6,
  sparkle: 0.5,
  celebrate: 0.6,
  /** One sparkle mark's whole life. */
  spark: 0.7,
} as const;

/** At most three marks, never a particle system — the character rig's rule. */
export const MAGIC_SPARKS = [
  { left: "-18%", top: "-8%", size: 10, delay: 0 },
  { left: "94%", top: "6%", size: 8, delay: 0.12 },
  { left: "76%", top: "88%", size: 7, delay: 0.22 },
] as const;

/**
 * The vocabulary, resolved. Unknown names throw rather than silently doing
 * nothing, so a typo is a failure and not a still object nobody notices.
 */
export function magicMotion(
  name: MagicMotionName,
  { distance, rise, delay = 0 }: MagicMotionOptions = {},
): MagicMotionSpec {
  const spring = { ...springSoft, delay };

  switch (name) {
    /* An object appearing: slightly small and clear, then simply there. */
    case "pop": {
      const settled = { scale: 1, opacity: 1 };
      return {
        says: "one more thing is here",
        idle: settled,
        initial: { scale: 0.9, opacity: 0 },
        animate: { ...settled, transition: spring },
        settled,
      };
    }

    /* One or two gentle hops that settle. Joy, not agitation. */
    case "bounce": {
      const settled = { y: 0 };
      return {
        says: "that felt good",
        idle: settled,
        initial: settled,
        animate: {
          y: [0, -10, 0, -4, 0],
          transition: {
            duration: MAGIC_TIMING.bounce,
            ease: "easeOut",
            times: [0, 0.3, 0.55, 0.75, 1],
            delay,
          },
        },
        settled,
      };
    }

    /* Decorative drift: 3px of sway, then still. Never near the answers. */
    case "float": {
      const settled = { y: 0 };
      return {
        says: "the world is quietly alive",
        idle: settled,
        initial: settled,
        animate: {
          y: [0, -3, 0, -3, 0],
          transition: { duration: MAGIC_TIMING.float, ease: "easeInOut", delay },
        },
        settled,
      };
    }

    /* Arriving from just offstage. Short, directional, predictable. */
    case "slide": {
      const settled = { x: 0, opacity: 1 };
      return {
        says: "this is arriving",
        idle: settled,
        initial: { x: -(distance ?? 24), opacity: 0 },
        animate: { ...settled, transition: spring },
        settled,
      };
    }

    /* Simple positional travel with a small bob — no frame animation. The
       bob rides on top of the vertical journey: with a `rise` of nothing the
       frames below are exactly the level walk they always were, and with one
       they carry the walker down (or up) to the place it was joined to, so
       the destination it reaches is the destination that was chosen — never
       merely whatever sat level with it. */
    case "walk": {
      const there = distance ?? 96;
      const down = rise ?? 0;
      return {
        says: "these belong together",
        idle: { x: 0, y: 0 },
        initial: { x: 0, y: 0 },
        animate: {
          x: there,
          y: [
            0,
            down / 6 - 2,
            down / 3,
            down / 2 - 2,
            (2 * down) / 3,
            (5 * down) / 6 - 2,
            down,
          ],
          transition: {
            x: { duration: MAGIC_TIMING.walk, ease: "easeInOut", delay },
            y: { duration: MAGIC_TIMING.walk, ease: "easeInOut", delay },
          },
        },
        settled: { x: there, y: down },
      };
    }

    /* Small becomes full, from the ground up. */
    case "grow": {
      const settled = { scale: 1, opacity: 1, originY: 1 };
      return {
        says: "this is becoming",
        idle: settled,
        initial: { scale: 0.4, opacity: 0, originY: 1 },
        animate: { ...settled, transition: spring },
        settled,
      };
    }

    /* An important discovery. The subject barely moves; the marks carry it. */
    case "sparkle": {
      const settled = { scale: 1 };
      return {
        says: "something special happened",
        idle: settled,
        initial: settled,
        animate: {
          scale: [1, 1.04, 1],
          transition: { duration: MAGIC_TIMING.sparkle, ease: "easeOut", delay },
        },
        settled,
      };
    }

    /* One joyful lift with marks. A moment, never a screen-filling storm. */
    case "celebrate": {
      const settled = { y: 0, scale: 1 };
      return {
        says: "you did it",
        idle: settled,
        initial: settled,
        animate: {
          y: [0, -8, 0],
          scale: [1, 1.06, 1],
          transition: {
            duration: MAGIC_TIMING.celebrate,
            ease: "easeOut",
            times: [0, 0.4, 1],
            delay,
          },
        },
        settled,
      };
    }

    default: {
      const never: never = name;
      throw new Error(`"${String(never)}" is not a magic motion`);
    }
  }
}
