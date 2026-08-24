"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { ChallengeOf } from "@/lib/content/types";
import {
  freshOrderState,
  isOrderAccepting,
  isOrderPlaced,
  orderPositionOf,
  orderProgress,
  orderReducer,
  orderTray,
  type OrderState,
} from "./order";
import type { Feedback, SessionStatus } from "../useGameSession";

/**
 * Order, as React sees it.
 *
 * The same division as `useConnect` and `connect.ts`: all the thinking is in
 * `order.ts`, which is a pure reducer over plain values, and this file owns
 * only the one thing React has to own — when the timer fires.
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
export const ORDER_TIMING = {
  /** Held while the tile lands in its place and KIDDO cheers. */
  correct: 700,
  /** Long enough to watch the tile go home, short enough to try straight away. */
  retry: 800,
} as const;

export interface OrderControls {
  state: OrderState;
  challenge: ChallengeOf<"order">;
  /** The line, in order. */
  placed: readonly string[];
  /** The tiles still waiting, in the order the board dealt them. */
  tray: ChallengeOf<"order">["payload"]["items"];
  selectedId: string | null;
  /** The tile being shown refused, for as long as it is on screen. */
  attemptId: string | null;
  feedback: Feedback;
  status: SessionStatus;
  progress: { current: number; total: number };
  /** False while a tile is landing or going home. */
  accepting: boolean;
  isPlaced: (itemId: string) => boolean;
  positionOf: (itemId: string) => number | null;
  select: (itemId: string) => void;
  place: (itemIds: readonly string[]) => void;
  reset: (challenge?: ChallengeOf<"order">) => void;
}

export function useOrder(challenge: ChallengeOf<"order">): OrderControls {
  const [state, dispatch] = useReducer(orderReducer, challenge, freshOrderState);

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
      ORDER_TIMING[feedback === "correct" ? "correct" : "retry"],
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  const select = useCallback(
    (itemId: string) => dispatch({ type: "select", itemId }),
    [],
  );
  const place = useCallback(
    (itemIds: readonly string[]) => dispatch({ type: "place", itemIds }),
    [],
  );
  const reset = useCallback(
    (next?: ChallengeOf<"order">) => dispatch({ type: "reset", challenge: next }),
    [],
  );

  return useMemo(
    () => ({
      state,
      challenge: state.challenge,
      placed: state.placed,
      tray: orderTray(state),
      selectedId: state.selectedId,
      attemptId: state.attemptId,
      /* `OrderFeedback` and `Feedback` are the same three words on purpose:
         KIDDO cheers, KIDDO invites another go, or KIDDO is waiting. */
      feedback: state.feedback as Feedback,
      status: (state.completed ? "complete" : "playing") as SessionStatus,
      progress: orderProgress(state),
      accepting: isOrderAccepting(state),
      isPlaced: (itemId: string) => isOrderPlaced(state, itemId),
      positionOf: (itemId: string) => orderPositionOf(state, itemId),
      select,
      place,
      reset,
    }),
    [state, select, place, reset],
  );
}
