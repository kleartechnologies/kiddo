"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { createRng, randomSeed } from "@/lib/content/rng";
import { useConnect } from "./engines/useConnect";
import {
  boardOf,
  buildMatchQuestSession,
  freshMatchQuestState,
  matchQuestProgress,
  matchQuestReducer,
  MATCH_QUEST_TIMING,
} from "./matchQuest";
import type { Feedback, SessionStatus } from "./useGameSession";

/**
 * Match Quest, as React sees it.
 *
 * Two state machines, stacked, and neither of them new. `useConnect` runs the
 * board on the table — which card is chosen, whether the pair holds, when the
 * cheer ends — exactly as it has since the Connect engine was written, and
 * `matchQuestReducer` runs the round the boards are dealt into. Nothing here
 * re-implements either. The whole file is the join between them: notice that a
 * board is finished, hold it for a beat, deal the next.
 *
 * That stacking is why `boardOf` never returns null. A hook cannot stop being
 * called because a round ended, so the last board stays on the table under the
 * celebration rather than the round handing React an empty hand.
 */
export function useMatchQuestGame() {
  /* The first render is the unseeded deal: the server renders it too, and
     `Math.random` would give the two different markup. The real round arrives
     on mount, below, while KIDDO is still saying hello. */
  const [state, dispatch] = useReducer(matchQuestReducer, undefined, () =>
    freshMatchQuestState(buildMatchQuestSession()),
  );

  useEffect(() => {
    dispatch({
      type: "deal",
      challenges: buildMatchQuestSession(createRng(randomSeed())),
    });
  }, []);

  const current = boardOf(state);
  const board = useConnect(current);
  const { phase } = state;

  /**
   * The board on the table is finished — and it is the board the round is
   * actually on.
   *
   * `useConnect` moves to a new board in an effect, so for exactly one commit
   * after the round advances its state still describes the board that was
   * just completed. Reading `status` alone in that commit finishes the new
   * board before the child has touched it: measured in a browser, every
   * second board of the ten was dealt and skipped in the same beat, and a
   * round of ten boards was over in five. Identity is the guard — the round
   * only listens to the engine while the engine is talking about the board
   * the round believes is out.
   */
  const solved = board.status === "complete" && board.challenge === current;

  /* A finished board tells the round it is finished, once. `useConnect` is
     still cheering the last pair at this point; the round only starts its own
     clock, and nothing on screen moves yet. */
  useEffect(() => {
    if (solved && phase === "playing") dispatch({ type: "solved" });
  }, [solved, phase]);

  /* One timer, owned by the phase that needs it, cancelled the moment that
     phase ends. Restarting mid-round cannot leave a stale clock behind. */
  useEffect(() => {
    if (phase !== "settling") return;
    const timer = setTimeout(
      () => dispatch({ type: "advance" }),
      MATCH_QUEST_TIMING.settle,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const begin = useCallback(() => dispatch({ type: "begin" }), []);

  const restart = useCallback(() => {
    dispatch({
      type: "restart",
      challenges: buildMatchQuestSession(createRng(randomSeed())),
    });
  }, []);

  return useMemo(
    () => ({
      phase,
      /** The board on the table. Never null; see `boardOf`. */
      challenge: board.challenge,
      /** How many boards in, out of how many. Not pairs — boards. */
      progress: matchQuestProgress(state),
      /** Pairs found on this board, out of how many it holds. */
      board: board.progress,
      /** True from the last pair landing until the next board is dealt. */
      solved: phase === "settling",

      /* The shared vocabulary GameShell reads. `feedback` is the board's,
         because pairing is the only thing that can go right or wrong; `status`
         is the round's, because one finished board is not a finished game. */
      feedback: board.feedback as Feedback,
      status: (phase === "complete" ? "complete" : "playing") as SessionStatus,

      /* Everything MatchStage needs, passed straight through. The stage is
         not adapted for this game and this game does not wrap it. */
      accepting: board.accepting && phase === "playing",
      connections: board.connections,
      selectedLeft: board.selectedLeft,
      selectedRight: board.selectedRight,
      attempt: board.attempt,
      selectLeft: board.selectLeft,
      selectRight: board.selectRight,
      connect: board.connect,

      begin,
      restart,
    }),
    [state, phase, board, begin, restart],
  );
}
