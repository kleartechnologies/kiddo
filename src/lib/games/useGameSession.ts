"use client";

import { useCallback, useMemo, useReducer } from "react";

/**
 * The one piece of state every KIDDO game shares: where are we in the round,
 * how did the last answer go, and are we finished?
 *
 * Kept deliberately small and local. No store, no persistence, no analytics.
 * Individual games own their own puzzle state (cards, questions, ...) and call
 * into this for progress and feedback.
 */

export type Feedback = "idle" | "correct" | "retry";
export type SessionStatus = "playing" | "complete";

interface SessionState {
  step: number;
  totalSteps: number;
  correct: number;
  /** Result of the most recent answer, drives the visual feedback. */
  feedback: Feedback;
  status: SessionStatus;
}

type SessionAction =
  | { type: "correct" }
  | { type: "retry" }
  | { type: "clearFeedback" }
  | { type: "advance" }
  | { type: "restart" };

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "correct":
      return { ...state, feedback: "correct", correct: state.correct + 1 };
    case "retry":
      // Wrong answers never cost anything. We only note them to soften the
      // next hint; the child is never penalised.
      return { ...state, feedback: "retry" };
    case "clearFeedback":
      return { ...state, feedback: "idle" };
    case "advance": {
      const next = state.step + 1;
      return next >= state.totalSteps
        ? { ...state, feedback: "idle", status: "complete" }
        : { ...state, step: next, feedback: "idle" };
    }
    case "restart":
      return {
        step: 0,
        totalSteps: state.totalSteps,
        correct: 0,
        feedback: "idle",
        status: "playing",
      };
  }
}

export function useGameSession(totalSteps: number) {
  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    totalSteps,
    correct: 0,
    feedback: "idle" as Feedback,
    status: "playing" as SessionStatus,
  });

  const markCorrect = useCallback(() => dispatch({ type: "correct" }), []);
  const markRetry = useCallback(() => dispatch({ type: "retry" }), []);
  const clearFeedback = useCallback(() => dispatch({ type: "clearFeedback" }), []);
  const advance = useCallback(() => dispatch({ type: "advance" }), []);
  const restart = useCallback(() => dispatch({ type: "restart" }), []);

  return useMemo(
    () => ({ ...state, markCorrect, markRetry, clearFeedback, advance, restart }),
    [state, markCorrect, markRetry, clearFeedback, advance, restart],
  );
}
