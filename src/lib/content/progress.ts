import type { Challenge, ChallengeId } from "./types";

/**
 * Where the child is in a set of challenges.
 *
 * Data and pure functions only. No React, no store, no persistence — a run is
 * a value, so the hook that drives Math Quest can hold it in a reducer the
 * same way `useFindItGame` holds its rounds, and a test can drive a whole
 * round without rendering anything.
 *
 * The five things the brief asks a run to know — the current challenge, the
 * ones completed, the difficulty, the category and the activity type — are all
 * here, but only one of them is a field. A `Challenge` already carries its own
 * level, category, activity and pack, so `currentChallenge(run).level` is the
 * answer and a copy on the run would only be a second answer to disagree with.
 * That is also what lets a run hold challenges from several activities at
 * once, which is exactly what a ten-question Math Quest session is.
 *
 * Scoring is absent because KIDDO does not score. A wrong answer does not
 * appear here at all: it costs nothing, so there is nothing to record.
 */
export interface ChallengeRun {
  challenges: readonly Challenge[];
  /** Index into `challenges`. Equals `challenges.length` when the run is over. */
  index: number;
  /** Ids answered, in the order they were answered. */
  completed: readonly ChallengeId[];
}

/** A run over challenges already drawn. Deal them with `drawChallenges`. */
export function startRun(challenges: readonly Challenge[]): ChallengeRun {
  return { challenges, index: 0, completed: [] };
}

/** Null once the run is finished, and on an empty set. */
export function currentChallenge(run: ChallengeRun): Challenge | null {
  return run.challenges[run.index] ?? null;
}

export function isRunComplete(run: ChallengeRun): boolean {
  return run.index >= run.challenges.length;
}

/**
 * Done with this one: remember it and move on.
 *
 * Only ever called for a right answer, which is why it takes no result. In
 * KIDDO the only way past a question is to answer it.
 */
export function completeCurrent(run: ChallengeRun): ChallengeRun {
  const challenge = currentChallenge(run);
  if (!challenge) return run;

  return {
    ...run,
    index: run.index + 1,
    completed: run.completed.includes(challenge.id)
      ? run.completed
      : [...run.completed, challenge.id],
  };
}

/** Zero-based current and a total, which is what `ProgressDots` counts in. */
export function runProgress(run: ChallengeRun): {
  current: number;
  total: number;
} {
  return {
    current: Math.min(run.index, run.challenges.length),
    total: run.challenges.length,
  };
}

/** A fresh run over a fresh set. */
export function restartRun(
  run: ChallengeRun,
  challenges: readonly Challenge[] = run.challenges,
): ChallengeRun {
  return { ...run, challenges, index: 0, completed: [] };
}
