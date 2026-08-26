"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { useSaid } from "@/lib/content/i18n/useSaid";
import { currentChallenge } from "@/lib/content/progress";
import type { SessionPlan } from "@/lib/content/session";
import { createRng, randomSeed } from "@/lib/content/rng";
import { useConnect } from "./engines/useConnect";
import {
  answerLabelOf,
  buildGeneralKnowledgeSession,
  currentBoard,
  freshGeneralKnowledgeState,
  generalKnowledgeProgress,
  generalKnowledgePrompt,
  generalKnowledgeReducer,
  GENERAL_KNOWLEDGE_PLAN,
  GENERAL_KNOWLEDGE_TIMING,
  IDLE_BOARD,
} from "./generalKnowledgeQuest";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * General Knowledge Quest, as React sees it.
 *
 * Its own state machine, for the reasons set out in
 * `generalKnowledgeQuest.ts`: how long a child gets to hear a whole question,
 * and what KIDDO says after a wrong one, are this game's decisions rather than
 * borrowed from a game about shapes.
 *
 * What it returns is the shared vocabulary every KIDDO game speaks, so
 * `GameShell` still cannot tell the games apart. All the thinking is in the
 * pure reducer; this file owns the only two things React has to own — when the
 * timers fire, and when a real random seed is allowed to exist.
 *
 * ## The board that is joined up
 *
 * One slot in the round may deal a connect board, and for that board the
 * same stacking `useMatchQuestGame` uses is used here, unchanged in shape:
 * `useConnect` runs the board on the table — which animal is chosen, whether
 * the line holds, when its own cheer ends — and the round's reducer runs the
 * round. This file is the join between them: a miss is passed on so the
 * question softens, and a finished board is passed on once so the round can
 * hold it and move on. On every other question `useConnect` is running
 * `IDLE_BOARD`, which has nothing on it and is never listened to.
 */
export function useGeneralKnowledgeQuest(
  /** The round to deal. The quest's own ten questions unless a world says otherwise. */
  plan: SessionPlan = GENERAL_KNOWLEDGE_PLAN,
) {
  /* The first render is the unseeded deal: the server renders it too, and
     `Math.random` would give the two different markup. The real round arrives
     on mount, below, while KIDDO is still saying hello. */
  const [state, dispatch] = useReducer(generalKnowledgeReducer, undefined, () =>
    freshGeneralKnowledgeState(buildGeneralKnowledgeSession(undefined, plan)),
  );

  const deal = useCallback(
    (intro: boolean) => {
      dispatch({
        type: "deal",
        challenges: buildGeneralKnowledgeSession(createRng(randomSeed()), plan),
        intro,
      });
    },
    [plan],
  );

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
      GENERAL_KNOWLEDGE_TIMING[phase === "incorrect" ? "retry" : phase],
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const begin = useCallback(() => dispatch({ type: "begin" }), []);
  const answer = useCallback(
    (optionId: string) => dispatch({ type: "answer", optionId }),
    [],
  );

  /* The connect board on the table, or the empty one while there is not. */
  const current = currentBoard(state);
  const board = useConnect(current ?? IDLE_BOARD);

  /* `useConnect` moves to a new board in an effect, so for one commit after
     the round moves on its state still describes the last board. Identity is
     the guard, as in Match Quest: the round listens to the engine only while
     the engine is on the board the round believes is out. */
  const onBoard = current !== null && board.challenge === current;
  const solved = onBoard && board.status === "complete";
  const missed = onBoard && board.feedback === "retry";

  useEffect(() => {
    if (solved && phase === "awaitingAnswer") dispatch({ type: "solved" });
  }, [solved, phase]);

  useEffect(() => {
    if (missed && phase === "awaitingAnswer") dispatch({ type: "missed" });
  }, [missed, phase]);

  /* The round, said in the reader's language, on the way out — never on the
     way in. `useConnect` above stays on the English board it was handed, so a
     language change cannot move a board the child is halfway through, and the
     reducer never hears about it at all. See `useSaid`. */
  const said = useSaid(state);
  const saidBoard = currentBoard(said);

  return useMemo(() => {
    const challenge = currentChallenge(said.run);

    const isNudged = (optionId: string) =>
      phase === "incorrect" && optionId === said.picked;

    /* On a connect board the line is the only thing that can go right or
       wrong, so while the board is being played its feedback is the engine's;
       the round's own `correct` takes over once the board is finished. */
    const boardFeedback: Feedback =
      phase === "correct" ? "correct" : onBoard ? board.feedback : "idle";

    return {
      /** Null only once the round is over. */
      challenge,
      phase,
      progress: generalKnowledgeProgress(said),
      /** What the right answer is called, so KIDDO can say it out loud. */
      answerLabel: answerLabelOf(challenge),
      /** The question, or — once one has been got wrong — where to think. */
      question: generalKnowledgePrompt(said),
      /** True once this question has been missed, so KIDDO can soften. */
      hinted: said.hinted,

      /* The shared vocabulary GameShell reads. KIDDO cheers or encourages;
         there is no third, unhappier value. */
      feedback: (onBoard
        ? boardFeedback
        : phase === "correct"
          ? "correct"
          : phase === "incorrect"
            ? "retry"
            : "idle") as Feedback,
      status: (phase === "complete" ? "complete" : "playing") as SessionStatus,

      /** False while a question is landing or an answer is being shown. */
      accepting: phase === "awaitingAnswer" && (!onBoard || board.accepting),

      /** The answer, once it has been found. Nothing else is ever ticked. */
      isCorrect: (optionId: string) =>
        phase === "correct" && optionId === said.picked,
      /** The one just tapped that was not it, for the length of the nudge. */
      isNudged,
      /** Ruled out earlier this question. Still tappable, just quieter. */
      isTried: (optionId: string) =>
        said.tried.includes(optionId) && !isNudged(optionId),

      /**
       * The connect board, when the question is one. Everything
       * `ConnectStage` needs, passed straight through from the engine — the
       * stage is not adapted for this game and this game does not wrap it.
       */
      board: onBoard
        ? {
            challenge: saidBoard ?? current,
            connections: board.connections,
            selectedLeft: board.selectedLeft,
            selectedRight: board.selectedRight,
            attempt: board.attempt,
            /** Pairs joined on this board, out of how many it holds. */
            progress: board.progress,
            selectLeft: board.selectLeft,
            selectRight: board.selectRight,
            connect: board.connect,
          }
        : null,

      begin,
      answer,
      restart,
    };
  }, [said, phase, onBoard, current, saidBoard, board, begin, answer, restart]);
}
