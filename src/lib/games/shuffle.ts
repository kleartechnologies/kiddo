/**
 * Fisher-Yates over any source of randomness.
 *
 * Split out so seeded content generation can shuffle the same way the games
 * do without either side owning the other's random number generator.
 * See `lib/content/rng.ts`.
 */
export function shuffleWith<T>(
  items: readonly T[],
  random: () => number,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Fisher-Yates. Returns a new array, never mutates the input. */
export function shuffle<T>(items: readonly T[]): T[] {
  return shuffleWith(items, Math.random);
}

/** Pick `count` distinct items at random. Returns fewer if the pool is small. */
export function pickSome<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
}
