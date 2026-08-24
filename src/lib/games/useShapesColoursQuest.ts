"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { currentChallenge } from "@/lib/content/progress";
import { createRng, randomSeed } from "@/lib/content/rng";
import {
  answerLabelOf,
  buildShapesQuestSession,
  freshShapesQuestState,
  shapesQuestProgress,
  shapesQuestPrompt,
  shapesQuestReducer,
  SHAPES_QUEST_TIMING,
} from "./shapesColoursQuest";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * Shapes & Colours Quest, as React sees it.
 *
 * Its own state machine, for the reasons set out in `shapesColoursQuest.ts`:
 * how long a child gets to look a picture over, and what KIDDO says after a
 * wrong one, are this game's decisions rather than borrowed from a game about
 * letters.
 *
 * What it returns is the shared vocabulary every KIDDO game speaks, so
 * `GameShell` still cannot tell the games apart. All the thinking is in the
 * pure reducer; this file owns the only two things React has to own — when the
 * timers fire, and when a real random seed is allowed to exist.
 */
export function useShapesColoursQuest() {
  /* The first render is the unseeded deal: the server renders it too, and
     `Math.random` would give the two different markup. The real round arrives
     on mount, below, while KIDDO is still saying hello. */
  const [state, dispatch] = useReducer(shapesQuestReducer, undefined, () =>
    freshShapesQuestState(buildShapesQuestSession()),
  );

  const deal = useCallback((intro: boolean) => {
    dispatch({
      type: "deal",
      challenges: buildShapesQuestSession(createRng(randomSeed())),
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
      SHAPES_QUEST_TIMING[phase === "incorrect" ? "retry" : phase],
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
      progress: shapesQuestProgress(state),
      /** What the right answer is called, so KIDDO can say it out loud. */
      answerLabel: answerLabelOf(challenge),
      /** The question, or — once one has been got wrong — where to look. */
      question: shapesQuestPrompt(state),
      /** True once this question has been missed, so KIDDO can soften. */
      hinted: state.hinted,

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
