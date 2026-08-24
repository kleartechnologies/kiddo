import type { Transition, Variants } from "framer-motion";

/**
 * KIDDO animation conventions.
 *
 * The rules: motion is soft, fast and always a response to something the child
 * did. Nothing loops in the background, nothing animates just to be seen.
 * Celebrations are the one place we allow ourselves to be expressive.
 */

/** Default for anything that moves in response to a tap or hover. */
export const springy: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.8,
};

/** Slower, rounder spring for larger elements entering the screen. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 24,
  mass: 1,
};

/** Loose, bouncy spring reserved for celebration moments. */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 14,
  mass: 0.7,
};

/** Fade + rise. Used for page and section entrances. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Pop in from slightly small. Used for cards, tiles and characters. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSoft },
};

/** Parent variant that plays children one after another. */
export function staggerChildren(stagger = 0.07, delay = 0.05): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

/**
 * The same variants, played in no time — the reduced-motion rendering.
 *
 * Reduced motion must never be decided in `initial`: `initial` is the style
 * the server writes into the HTML, and `useReducedMotion` is `false` there,
 * so an `initial` that changes on a reduced-motion client is a hydration
 * mismatch (measured as a console error on the reduced passes of the
 * measurement scripts). Both renders start from the same `hidden`; a reduced
 * client simply crosses to `show` in no time at all, children included.
 */
export function instantly(variants: Variants): Variants {
  const out: Variants = {};
  for (const [name, target] of Object.entries(variants)) {
    out[name] = {
      ...(target as object),
      transition: { duration: 0, delayChildren: 0, staggerChildren: 0 },
    };
  }
  return out;
}

/**
 * The shared "this is tappable" feel: lift on hover, sink on press.
 * Spread onto any `motion` element so every interactive surface agrees.
 */
export const tappable = {
  whileHover: { y: -4 },
  whileTap: { y: 1, scale: 0.98 },
  transition: springy,
} as const;

/** A gentler version for large surfaces such as game cards. */
export const tappableCard = {
  whileHover: { y: -6 },
  whileTap: { y: 0, scale: 0.985 },
  transition: springy,
} as const;
