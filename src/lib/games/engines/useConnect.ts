"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { ChallengeOf, ConnectPair } from "@/lib/content/types";
import {
  connectProgress,
  connectReducer,
  freshConnectState,
  isConnectAccepting,
  isConnectMatched,
  connectedPartner,
  type ConnectState,
} from "./connect";
import type { Feedback, SessionStatus } from "../useGameSession";

/**
 * Connect, as React sees it.
 *
 * The same division as `useMathQuestGame` and `mathQuest.ts`: all the thinking
 * is in `connect.ts`, which is a pure reducer over plain values, and this file
 * owns only the one thing React has to own — when the timer fires.
 *
 * It returns the vocabulary every KIDDO game speaks, so a Quest built on this
 * hands `feedback` and `status` straight to `GameShell` and gets the cheer,
 * the nudge and the sound of the round without writing any of it.
 */

/**
 * How long each locked phase lasts, in ms. Comprehension timings, not
 * animation timings — the child still has to see what happened — so they are
 * not shortened for reduced motion.
 */
export const CONNECT_TIMING = {
  /** Held while the line lands and KIDDO cheers. */
  correct: 900,
  /** Long enough to watch the line let go, short enough to try straight away. */
  retry: 800,
} as const;

export interface ConnectControls {
  state: ConnectState;
  challenge: ChallengeOf<"connect">;
  connections: readonly ConnectPair[];
  selectedLeft: string | null;
  selectedRight: string | null;
  /** The line being shown wrong, for as long as it is on screen. */
  attempt: ConnectPair | null;
  feedback: Feedback;
  status: SessionStatus;
  progress: { current: number; total: number };
  /** False while a line is landing or letting go. */
  accepting: boolean;
  isMatched: (side: "left" | "right", nodeId: string) => boolean;
  partnerOf: (side: "left" | "right", nodeId: string) => string | null;
  selectLeft: (nodeId: string) => void;
  selectRight: (nodeId: string) => void;
  connect: (link: ConnectPair) => void;
  reset: (challenge?: ChallengeOf<"connect">) => void;
}

export function useConnect(challenge: ChallengeOf<"connect">): ConnectControls {
  const [state, dispatch] = useReducer(connectReducer, challenge, freshConnectState);

  /* A new board is a new game. The challenge is the identity of the round the
     same way `run` is Math Quest's, so changing it starts over. */
  useEffect(() => {
    dispatch({ type: "reset", challenge });
  }, [challenge]);

  const { feedback } = state;

  /* One timer, owned by the feedback that needs it, cancelled the moment that
     feedback ends. A board reset mid-cheer cannot leave a stale clock behind. */
  useEffect(() => {
    if (feedback === "idle") return;
    const timer = setTimeout(
      () => dispatch({ type: "retry" }),
      CONNECT_TIMING[feedback === "correct" ? "correct" : "retry"],
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  const selectLeft = useCallback(
    (nodeId: string) => dispatch({ type: "selectLeft", nodeId }),
    [],
  );
  const selectRight = useCallback(
    (nodeId: string) => dispatch({ type: "selectRight", nodeId }),
    [],
  );
  const connect = useCallback(
    (link: ConnectPair) => dispatch({ type: "connect", link }),
    [],
  );
  const reset = useCallback(
    (next?: ChallengeOf<"connect">) => dispatch({ type: "reset", challenge: next }),
    [],
  );

  return useMemo(
    () => ({
      state,
      challenge: state.challenge,
      connections: state.connections,
      selectedLeft: state.selectedLeft,
      selectedRight: state.selectedRight,
      attempt: state.attempt,
      /* `ConnectFeedback` and `Feedback` are the same three words on purpose:
         KIDDO cheers, KIDDO invites another go, or KIDDO is waiting. */
      feedback: state.feedback as Feedback,
      status: (state.completed ? "complete" : "playing") as SessionStatus,
      progress: connectProgress(state),
      accepting: isConnectAccepting(state),
      isMatched: (side: "left" | "right", nodeId: string) =>
        isConnectMatched(state, side, nodeId),
      partnerOf: (side: "left" | "right", nodeId: string) =>
        connectedPartner(state, side, nodeId),
      selectLeft,
      selectRight,
      connect,
      reset,
    }),
    [state, selectLeft, selectRight, connect, reset],
  );
}
