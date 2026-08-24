import type { Difficulty } from "@/lib/games/types";

/**
 * How hard a challenge is.
 *
 * One number, five steps, and nothing else. The child never sees it: it exists
 * so an activity can be dealt gently first and get busier, and so a future
 * session can decide what to deal next without asking a game about its rules.
 *
 * 1 very easy · 2 easy · 3 medium · 4 harder · 5 advanced
 */
export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5] as const;

/**
 * Grown-up wording, for the eventual parent view and for authoring tools.
 * Never spoken to the child, who is only ever told to play.
 */
export const LEVEL_LABELS: Record<Level, string> = {
  1: "Very easy",
  2: "Easy",
  3: "Medium",
  4: "Harder",
  5: "Advanced",
};

/**
 * The catalogue's three-word difficulty, from a level.
 *
 * `Game.difficulty` in `lib/games/types.ts` is the shelf label a grown-up reads
 * on a card; `Level` is the dial content is dealt from. This is the one place
 * the two are allowed to meet, so they can never disagree.
 */
export function difficultyOf(level: Level): Difficulty {
  if (level <= 2) return "gentle";
  if (level <= 4) return "growing";
  return "clever";
}

/** Keeps arithmetic on levels inside the scale. */
export function clampLevel(value: number): Level {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as Level;
}

/** The next step up, stopping at the top rather than wrapping. */
export function nextLevel(level: Level): Level {
  return clampLevel(level + 1);
}

/** The nearest level an activity actually offers. Never returns undefined. */
export function resolveLevel(
  wanted: Level,
  offered: readonly Level[],
): Level {
  if (offered.length === 0) return wanted;
  if (offered.includes(wanted)) return wanted;
  return offered.reduce((best, level) =>
    Math.abs(level - wanted) < Math.abs(best - wanted) ? level : best,
  );
}

/* --------------------------------------------------------------- authoring */

/**
 * A value per level, for content whose levels differ only by a number.
 *
 * "How big do the numbers get", "how many tiles", "which pool of letters" are
 * all the same shape of decision, and every pack makes it. Partial on purpose:
 * an activity states the levels it offers and `forLevel` covers the rest.
 */
export type LevelTable<T> = Partial<Record<Level, T>>;

export function forLevel<T>(table: LevelTable<T>, level: Level, fallback: T): T {
  return table[level] ?? fallback;
}
