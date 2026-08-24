"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { currentChallenge } from "@/lib/content/progress";
import { createRng, randomSeed } from "@/lib/content/rng";
import {
  answerLabelOf,
  buildEnglishQuestSession,
  englishQuestProgress,
  englishQuestReducer,
  freshEnglishQuestState,
  ENGLISH_QUEST_TIMING,
} from "./englishQuest";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * English Quest, as React sees it.
 *
 * Its own state machine — not `useMathQuestGame`, not `useGameSession`, not
 * Find It's — because English Quest's rules are its own: how long a word stays
 * on screen before it can be answered is a decision about reading, and it is
 * made in `englishQuest.ts` rather than shared with a game about numbers.
 *
 * What it returns is the shared vocabulary every KIDDO game speaks, so
 * `GameShell` still cannot tell the games apart. All the thinking is in the
 * pure reducer; this file owns the only two things React has to own — when
 * the timers fire, and when a real random seed is allowed to exist.
 */
export function useEnglishQuest() {
  /* The first render is the unseeded deal: the server renders it too, and
     `Math.random` would give the two different markup. The real round arrives
     on mount, below, while KIDDO is still saying hello. */
  const [state, dispatch] = useReducer(englishQuestReducer, undefined, () =>
    freshEnglishQuestState(buildEnglishQuestSession()),
  );

  const deal = useCallback((intro: boolean) => {
    dispatch({
      type: "deal",
      challenges: buildEnglishQuestSession(createRng(randomSeed())),
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
      ENGLISH_QUEST_TIMING[phase === "incorrect" ? "retry" : phase],
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
      progress: englishQuestProgress(state),
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
