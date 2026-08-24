import { conceptKey } from "@/lib/content/challenges";
import type { Level } from "@/lib/content/difficulty";
import { isKind } from "@/lib/content/engine";
import { letterPartnersActivity } from "@/lib/content/packs/match";
import {
  completeCurrent,
  currentChallenge,
  isRunComplete,
  restartRun,
  runProgress,
  startRun,
  type ChallengeRun,
} from "@/lib/content/progress";
import type { Rng } from "@/lib/content/rng";
import { drawSession, type SessionPlan } from "@/lib/content/session";
import type { Challenge, ChallengeOf } from "@/lib/content/types";

/**
 * Match Quest — the rules, with no React in them.
 *
 * The same division every Quest is built on: this file is a plan, a value and
 * a pure function over it, and `useMatchQuestGame` owns the one thing React
 * has to own — when the clock fires.
 *
 * What is different here is what a "question" is. Logic Quest asks ten
 * questions and each one is answered once. Match Quest deals ten *boards*,
 * and each board is three to five pairings the child finds in whatever order
 * they like. The pairing itself is already solved: `useConnect` runs one board
 * — selection, marking, the cheer, the nudge — and has done since the engine
 * was written. So there is deliberately nothing about pairing below. This
 * file knows only which board is on the table and what happens when it is
 * finished, which is exactly the part `useConnect` does not do.
 */

/**
 * Ten boards, and the shape of the climb: three gentle, five in the middle,
 * two harder. It is the brief's mix and it is also what the other Quests
 * already deal, so a child moving between them meets the same curve.
 *
 * Every slot offers the one activity the pack has. That is not a limitation
 * of the plan — a slot's `from` is a list, and the day the pack grows a second
 * activity it joins these lines and the session mixes them.
 */
const LEVELS: readonly Level[] = [1, 1, 1, 2, 2, 2, 2, 2, 3, 3];

export const MATCH_QUEST_PLAN: SessionPlan = {
  slots: LEVELS.map((level) => ({
    level,
    from: [letterPartnersActivity.id],
  })),
};

export const MATCH_QUEST_LENGTH = MATCH_QUEST_PLAN.slots.length;

/**
 * Deal a session.
 *
 * Keyed on `conceptKey`, so no two boards in a round practise the same set of
 * letters. One key is enough here, and that is worth saying because Shapes &
 * Colours passes two: `challengeKey` for a `connect` payload already sorts its
 * pairs, so a board reshuffled is already the same board to it, and the
 * concept tag is the same set of letters again with KIDDO's varying line
 * stripped off. A second key would only be the first one wearing a hat.
 *
 * Without an `rng` the same ten boards come back every time, which is what
 * makes a server render and a first client render agree.
 */
export function buildMatchQuestSession(rng?: Rng): Challenge[] {
  return drawSession(MATCH_QUEST_PLAN, { rng, keyOf: conceptKey }).filter(
    (challenge) => isKind(challenge, "connect"),
  );
}

/**
 * Where a round is.
 *
 * `settling` is the beat after the last pair lands: the board is finished, the
 * cards are still on screen, KIDDO is still cheering, and nothing has moved
 * yet. Without it a completed board would vanish under the next one before a
 * four year old had seen themselves finish it.
 */
export type MatchQuestPhase = "intro" | "playing" | "settling" | "complete";

export interface MatchQuestState {
  run: ChallengeRun;
  phase: MatchQuestPhase;
}

export type MatchQuestAction =
  | { type: "deal"; challenges: readonly Challenge[] }
  | { type: "begin" }
  | { type: "solved" }
  | { type: "advance" }
  | { type: "restart"; challenges: readonly Challenge[] };

/** How long each locked phase lasts, in ms. */
export const MATCH_QUEST_TIMING = {
  /**
   * The finished board, held. Longer than the engine's own 900ms cheer on
   * purpose: the cheer is about one pair, and this is about the whole board.
   */
  settle: 1400,
} as const;

export function freshMatchQuestState(
  challenges: readonly Challenge[],
): MatchQuestState {
  return { run: startRun(challenges), phase: "intro" };
}

export function matchQuestReducer(
  state: MatchQuestState,
  action: MatchQuestAction,
): MatchQuestState {
  switch (action.type) {
    /* A new set of boards, still behind the front door. Dealing is what the
       seeded draw on mount does, and it must not skip KIDDO saying hello. */
    case "deal":
      return { run: startRun(action.challenges), phase: state.phase };

    case "begin":
      return state.phase === "intro" ? { ...state, phase: "playing" } : state;

    case "solved":
      return state.phase === "playing" ? { ...state, phase: "settling" } : state;

    case "advance": {
      if (state.phase !== "settling") return state;
      const run = completeCurrent(state.run);
      return { run, phase: isRunComplete(run) ? "complete" : "playing" };
    }

    case "restart":
      return {
        run: restartRun(state.run, action.challenges),
        phase: "playing",
      };
  }
}

/**
 * The board on the table.
 *
 * Never null, which is the whole reason it is a function rather than
 * `currentChallenge`. A run that has just finished has no current challenge,
 * but the last board is still on screen underneath the celebration, and a
 * React hook cannot stop being called because a round ended.
 */
export function boardOf(state: MatchQuestState): ChallengeOf<"connect"> {
  const challenge =
    currentChallenge(state.run) ??
    state.run.challenges[state.run.challenges.length - 1];

  /* Provable, not hopeful: `buildMatchQuestSession` filters the draw to
     `connect`, and the plan names one activity whose kind is `connect`. */
  return challenge as ChallengeOf<"connect">;
}

/** Zero-based board and a total, which is what `ProgressDots` counts in. */
export function matchQuestProgress(state: MatchQuestState): {
  current: number;
  total: number;
} {
  return runProgress(state.run);
}
