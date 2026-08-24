import { shuffleWith } from "@/lib/games/shuffle";

/**
 * A small, seeded random number generator.
 *
 * Generated content needs randomness, and `Math.random` cannot give it to us
 * twice. Two places care:
 *
 * - **Hydration.** A page rendered on the server and again in the browser must
 *   produce the same sums, or React tears the markup down. Memory Match and
 *   Find It solve this by building an unshuffled first render and dealing on
 *   mount; a seed lets generated content skip that dance entirely — same seed,
 *   same challenges, both sides.
 * - **Reproducing a round.** A challenge that reads wrong can be looked at
 *   again from its seed instead of from a description of it.
 *
 * mulberry32: thirty-two bits of state, no dependency, more than random enough
 * for choosing which friend goes in which square.
 */
export interface Rng {
  /** A float in [0, 1), like `Math.random`. */
  next(): number;
  /** A whole number in [min, max], both ends included. */
  int(min: number, max: number): number;
  /** One item. Throws nothing on an empty list — returns undefined. */
  pick<T>(items: readonly T[]): T | undefined;
  /** `count` distinct items, or fewer if the pool is small. */
  some<T>(items: readonly T[], count: number): T[];
  /** A new array, never the input. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  /* Any seed, including 0 or a float, folded into a usable 32-bit state. */
  let state = Math.imul(Math.floor(Math.abs(seed)) ^ 0x6d2b79f5, 0x9e3779b1) >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => {
      const low = Math.ceil(Math.min(min, max));
      const high = Math.floor(Math.max(min, max));
      return low + Math.floor(next() * (high - low + 1));
    },
    pick: (items) => items[Math.floor(next() * items.length)],
    some: (items, count) =>
      rng.shuffle(items).slice(0, Math.max(0, Math.min(count, items.length))),
    shuffle: (items) => shuffleWith(items, next),
  };

  return rng;
}

/**
 * A seed for a real session. Call it in an effect, never during render — that
 * is the whole point of it being separate from `createRng`.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
