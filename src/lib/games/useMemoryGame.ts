"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { buildDeck, dealDeck, FRIENDS_PACK, type MemoryCardData } from "./memory";
import type { Feedback, SessionStatus } from "./useGameSession";
import type { CharacterId } from "./types";

/**
 * The rules of Memory Match. No JSX, no class names, no timers the caller has
 * to remember to clear — the board is a pure function of this state.
 *
 * It does not sit on top of `useGameSession`. That hook models a round as a
 * queue of questions answered one at a time, and Memory Match is not that
 * shape: pairs come out in any order and one attempt costs two taps. Trying
 * to keep the two in step would mean two clocks and one of them would drift.
 * Instead this returns the same `feedback` / `status` vocabulary every KIDDO
 * game speaks, so `GameShell` cannot tell the difference.
 */

/**
 * The turn cycle. `secondCardSelected` and `checking` exist so the board can
 * be deaf while a pair is being judged: a four year old taps faster than any
 * animation, and every one of those taps must fall on the floor.
 */
export type MemoryPhase =
  | "idle"
  | "firstCardSelected"
  | "secondCardSelected"
  | "checking"
  | "matched"
  | "complete";

/**
 * How long each locked phase lasts, in ms.
 *
 * These are comprehension timings, not animation timings, so they are not
 * shortened for reduced motion: the child still has to see the second card
 * before it is judged, and still has to memorise a wrong pair before it goes.
 */
export const MEMORY_TIMING = {
  /** The second card finishes turning before we say anything about it. */
  reveal: 420,
  /** A matched pair is held while KIDDO reacts to it. */
  match: 900,
  /** Long enough to memorise the two cards, short enough not to stall. */
  mismatch: 1100,
} as const;

interface MemoryState {
  deck: MemoryCardData[];
  phase: MemoryPhase;
  /** Face up but not yet resolved. Never more than two. */
  turned: string[];
  /** `pairId`s the child has found. These cards stay face up for good. */
  matchedPairs: string[];
  /** Pairs of taps taken. Counted, never spent: nothing is ever deducted. */
  attempts: number;
  /** Who was just found, so the UI can name them. Cleared on the next turn. */
  lastMatch: CharacterId | null;
}

type MemoryAction =
  | { type: "deal"; deck: MemoryCardData[] }
  | { type: "turn"; id: string }
  | { type: "evaluate" }
  | { type: "settle" };

function freshState(deck: MemoryCardData[]): MemoryState {
  return {
    deck,
    phase: "idle",
    turned: [],
    matchedPairs: [],
    attempts: 0,
    lastMatch: null,
  };
}

function reducer(state: MemoryState, action: MemoryAction): MemoryState {
  switch (action.type) {
    case "deal":
      return freshState(action.deck);

    case "turn": {
      /* Only two moments in the cycle accept a tap. Everything else — the
         pair being judged, the mismatch pause, the finished board — ignores
         it, which is what stops rapid tapping from breaking the round. */
      if (state.phase !== "idle" && state.phase !== "firstCardSelected") {
        return state;
      }

      const card = state.deck.find((item) => item.id === action.id);
      if (!card) return state;
      /* The same card twice, and anything already won, are both no-ops. */
      if (state.turned.includes(card.id)) return state;
      if (state.matchedPairs.includes(card.pairId)) return state;

      return state.phase === "idle"
        ? { ...state, turned: [card.id], phase: "firstCardSelected", lastMatch: null }
        : { ...state, turned: [...state.turned, card.id], phase: "secondCardSelected" };
    }

    case "evaluate": {
      if (state.phase !== "secondCardSelected") return state;

      const [first, second] = state.turned.map((id) =>
        state.deck.find((card) => card.id === id),
      );
      if (!first || !second) return state;

      const attempts = state.attempts + 1;

      return first.pairId === second.pairId
        ? {
            ...state,
            phase: "matched",
            attempts,
            matchedPairs: [...state.matchedPairs, first.pairId],
            lastMatch: first.characterId,
          }
        : { ...state, phase: "checking", attempts };
    }

    case "settle": {
      if (state.phase === "matched") {
        /* The matched cards stay face up because their pair is won, not
           because they are still in `turned`. */
        const done = state.matchedPairs.length === state.deck.length / 2;
        return { ...state, turned: [], phase: done ? "complete" : "idle" };
      }
      if (state.phase === "checking") {
        return { ...state, turned: [], phase: "idle", lastMatch: null };
      }
      return state;
    }
  }
}

/**
 * @param characters One entry per pair. Must be referentially stable — pass a
 * module constant, not an inline array, or the deck reshuffles under the child.
 */
export function useMemoryGame(characters: readonly CharacterId[] = FRIENDS_PACK) {
  /* The first deck is dealt in order, then shuffled on mount. Shuffling
     during render would give the server and the client two different boards
     and blow up hydration; every card is face down at this point, so the
     child never sees the unshuffled one. */
  const [state, dispatch] = useReducer(reducer, characters, (list) =>
    freshState(buildDeck(list)),
  );

  const restart = useCallback(
    () => dispatch({ type: "deal", deck: dealDeck(characters) }),
    [characters],
  );

  useEffect(() => {
    restart();
  }, [restart]);

  /* Every locked phase leaves itself. Keying the timer on the phase means it
     is cancelled automatically on unmount and on Play again, so a stale
     timeout can never land on a fresh board. */
  const { phase } = state;
  useEffect(() => {
    if (phase === "secondCardSelected") {
      const timer = setTimeout(() => dispatch({ type: "evaluate" }), MEMORY_TIMING.reveal);
      return () => clearTimeout(timer);
    }
    if (phase === "matched" || phase === "checking") {
      const timer = setTimeout(
        () => dispatch({ type: "settle" }),
        phase === "matched" ? MEMORY_TIMING.match : MEMORY_TIMING.mismatch,
      );
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const turn = useCallback((id: string) => dispatch({ type: "turn", id }), []);

  return useMemo(() => {
    const totalPairs = state.deck.length / 2;
    const pairsFound = state.matchedPairs.length;
    const accepting = phase === "idle" || phase === "firstCardSelected";

    const isMatched = (card: MemoryCardData) =>
      state.matchedPairs.includes(card.pairId);
    const isFaceUp = (card: MemoryCardData) =>
      state.turned.includes(card.id) || isMatched(card);

    return {
      deck: state.deck,
      phase,
      attempts: state.attempts,
      pairsFound,
      totalPairs,
      lastMatch: state.lastMatch,
      /* The shared vocabulary GameShell reads. KIDDO cheers or encourages;
         there is no third, unhappier value. */
      feedback: (phase === "matched"
        ? "correct"
        : phase === "checking"
          ? "retry"
          : "idle") as Feedback,
      status: (phase === "complete" ? "complete" : "playing") as SessionStatus,
      /** False while a pair is being judged: the board ignores taps. */
      accepting,
      isFaceUp,
      isMatched,
      /** True for the two cards being shown before they turn back. */
      isMissed: (card: MemoryCardData) =>
        phase === "checking" && state.turned.includes(card.id),
      turn,
      restart,
    };
  }, [state, phase, turn, restart]);
}
