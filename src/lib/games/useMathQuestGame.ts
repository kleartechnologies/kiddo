"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { currentChallenge } from "@/lib/content/progress";
import { createRng, randomSeed } from "@/lib/content/rng";
import {
  answerLabelOf,
  buildMathQuestSession,
  freshMathQuestState,
  mathQuestProgress,
  mathQuestReducer,
  MATH_QUEST_TIMING,
} from "./mathQuest";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * Math Quest, as React sees it.
 *
 * Its own state machine, not `useGameSession` and not Find It's: a wrong
 * answer here advances nothing, a question has to remember which tiles have
 * been ruled out, and the round opens with KIDDO saying hello. It returns the
 * same `feedback` / `status` vocabulary every KIDDO game speaks, so
 * `GameShell` cannot tell the three games apart.
 *
 * All the thinking is in `mathQuest.ts`, which is a pure reducer over plain
 * values. This file only owns the two things React has to own: when the timers
 * fire and when a real random seed is allowed to exist.
 */
export function useMathQuestGame() {
  /* The first render is the unseeded deal, because the server has to produce
     it too and `Math.random` would give the two different markup. The real
     round arrives on mount, below, while KIDDO is still saying hello. */
  const [state, dispatch] = useReducer(mathQuestReducer, undefined, () =>
    freshMathQuestState(buildMathQuestSession()),
  );

  const deal = useCallback((intro: boolean) => {
    dispatch({
      type: "deal",
      challenges: buildMathQuestSession(createRng(randomSeed())),
      intro,
    });
  }, []);

  useEffect(() => {
    deal(true);
  }, [deal]);

  /** A new round, straight into the questions: KIDDO has already said hello. */
  const restart = useCallback(() => deal(false), [deal]);

  const { phase } = state;

  /* One timer, owned by the phase that needs it, cancelled the moment that
     phase ends. Restarting mid-round cannot leave a stale clock behind. */
  useEffect(() => {
    if (phase !== "ready" && phase !== "correct" && phase !== "incorrect") {
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: "settle" }),
      MATH_QUEST_TIMING[phase === "incorrect" ? "retry" : phase],
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const begin = useCallback(() => dispatch({ type: "begin" }), []);
  const answer = useCallback(
    (optionId: string) => dispatch({ type: "answer", optionId }),
    [],
  );

  return useMemo(() => {
    const challenge = currentChallenge(state.run);

    const isNudged = (optionId: string) =>
      phase === "incorrect" && optionId === state.picked;

    return {
      /** Null only once the round is over. */
      challenge,
      phase,
      progress: mathQuestProgress(state),
      /** What the right answer is called, so KIDDO can say it out loud. */
      answerLabel: answerLabelOf(challenge),

      /* The shared vocabulary GameShell reads. KIDDO cheers or encourages;
         there is no third, unhappier value. */
      feedback: (phase === "correct"
        ? "correct"
        : phase === "incorrect"
          ? "retry"
          : "idle") as Feedback,
      status: (phase === "complete" ? "complete" : "playing") as SessionStatus,

      /** False while a question is landing or an answer is being shown. */
      accepting: phase === "awaitingAnswer",

      /** The answer, once it has been found. Nothing else is ever ticked. */
      isCorrect: (optionId: string) =>
        phase === "correct" && optionId === state.picked,
      /** The one just tapped that was not it, for the length of the nudge. */
      isNudged,
      /** Ruled out earlier this question. Still tappable, just quieter. */
      isTried: (optionId: string) =>
        state.tried.includes(optionId) && !isNudged(optionId),

      begin,
      answer,
      restart,
    };
  }, [state, phase, begin, answer, restart]);
}
