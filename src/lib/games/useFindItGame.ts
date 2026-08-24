"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import {
  buildRounds,
  dealRounds,
  FRIENDS_POOL,
  ROUND_PLAN,
  targetOf,
  type FindItItem,
  type FindItRound,
} from "./findIt";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * The rules of Find It. No JSX, no class names.
 *
 * Find It is a sequential recognition game, so unlike Memory Match it really
 * is one question at a time — but it still keeps its own reducer rather than
 * leaning on `useGameSession`, because a wrong answer here does not advance
 * anything and the round has to remember which choices have been tried. It
 * returns the same `feedback` / `status` vocabulary every KIDDO game speaks,
 * so `GameShell` cannot tell the two games apart.
 *
 * There is no score, no lives, no timer and no failure state. The only way
 * out of a round is to find the friend.
 */

/**
 * `ready` exists for one reason: a four year old's finger is still coming
 * down when the next round appears. For a beat after a round lands the board
 * hears nothing, so the tap that answered the last question cannot answer
 * this one too.
 */
export type FindItPhase =
  | "ready"
  | "awaitingChoice"
  | "correct"
  | "incorrect"
  | "complete";

/**
 * How long each locked phase lasts, in ms. Comprehension timings, not
 * animation timings: the child still has to see what happened, so these are
 * not shortened for reduced motion.
 */
export const FIND_IT_TIMING = {
  /** The new round settles before it will listen. */
  ready: 320,
  /** The right answer is held while KIDDO cheers about it. */
  correct: 950,
  /** Long enough to see the nudge, short enough to try again straight away. */
  retry: 850,
} as const;

interface FindItState {
  rounds: FindItRound[];
  /** Which round is being played. Only a correct answer moves it. */
  index: number;
  phase: FindItPhase;
  /** Choices tried and not it, this round. Kept, so the search narrows. */
  tried: string[];
  /** The choice just tapped, so one tile can react rather than all of them. */
  picked: string | null;
}

type FindItAction =
  | { type: "deal"; rounds: FindItRound[] }
  | { type: "pick"; id: string }
  | { type: "settle" };

function freshState(rounds: FindItRound[]): FindItState {
  return { rounds, index: 0, phase: "ready", tried: [], picked: null };
}

function reducer(state: FindItState, action: FindItAction): FindItState {
  switch (action.type) {
    case "deal":
      return freshState(action.rounds);

    case "pick": {
      /* Every tap outside `awaitingChoice` falls on the floor. This is the
         whole defence against rapid tapping: no counting, no debouncing. */
      if (state.phase !== "awaitingChoice") return state;

      const round = state.rounds[state.index];
      if (!round) return state;
      if (!round.choices.some((item) => item.id === action.id)) return state;

      if (action.id === round.targetId) {
        return { ...state, phase: "correct", picked: action.id };
      }

      return {
        ...state,
        phase: "incorrect",
        picked: action.id,
        /* A choice tried twice is still one tried choice. Nothing is counted
           and nothing is spent — this list only dims what has been ruled out. */
        tried: state.tried.includes(action.id)
          ? state.tried
          : [...state.tried, action.id],
      };
    }

    case "settle":
      switch (state.phase) {
        case "ready":
          return { ...state, phase: "awaitingChoice" };

        /* A wrong answer never ends the round, never costs anything and never
           moves the progress dots. It just hands the board back. */
        case "incorrect":
          return { ...state, phase: "awaitingChoice", picked: null };

        case "correct": {
          const next = state.index + 1;
          return next >= state.rounds.length
            ? { ...state, phase: "complete", picked: null }
            : { ...state, index: next, phase: "ready", tried: [], picked: null };
        }

        default:
          return state;
      }
  }
}

export function useFindItGame(
  pool: readonly FindItItem[] = FRIENDS_POOL,
  plan: readonly number[] = ROUND_PLAN,
) {
  /* The first render is the unshuffled build, because the server has to
     produce it too and `Math.random` would give the two different markup.
     The real deal happens on mount, below. */
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    freshState(buildRounds(pool, plan)),
  );

  const restart = useCallback(
    () => dispatch({ type: "deal", rounds: dealRounds(pool, plan) }),
    [pool, plan],
  );

  useEffect(() => {
    restart();
  }, [restart]);

  const { phase } = state;

  /* One timer, owned by the phase that needs it, cancelled the moment that
     phase ends. Restarting mid-round cannot leave a stale clock behind. */
  useEffect(() => {
    if (phase !== "ready" && phase !== "correct" && phase !== "incorrect") {
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: "settle" }),
      FIND_IT_TIMING[phase === "incorrect" ? "retry" : phase],
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const pick = useCallback((id: string) => dispatch({ type: "pick", id }), []);

  return useMemo(() => {
    const round = state.rounds[state.index] ?? state.rounds[0];
    const target = targetOf(round);

    const isNudged = (item: FindItItem) =>
      phase === "incorrect" && item.id === state.picked;

    return {
      round,
      target,
      /** Zero-based, which is what `ProgressDots` counts in. */
      roundIndex: state.index,
      totalRounds: state.rounds.length,
      phase,
      /** The choice being nudged right now, so KIDDO can name it. */
      picked: round.choices.find((item) => item.id === state.picked) ?? null,

      /* The shared vocabulary GameShell reads. KIDDO cheers or encourages;
         there is no third, unhappier value. */
      feedback: (phase === "correct"
        ? "correct"
        : phase === "incorrect"
          ? "retry"
          : "idle") as Feedback,
      status: (phase === "complete" ? "complete" : "playing") as SessionStatus,

      /** False while a round is landing or an answer is being shown. */
      accepting: phase === "awaitingChoice",

      /** The target, once it has been found. Nothing else is ever marked. */
      isFound: (item: FindItItem) =>
        phase === "correct" && item.id === round.targetId,
      /** The one just tapped that was not it, for the length of the nudge. */
      isNudged,
      /** Ruled out earlier this round. Still tappable, just quieter. */
      isTried: (item: FindItItem) =>
        state.tried.includes(item.id) && !isNudged(item),

      pick,
      restart,
    };
  }, [state, phase, pick, restart]);
}
