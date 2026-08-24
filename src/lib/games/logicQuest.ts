import { answerItemOf, checkAnswer, labelOf } from "@/lib/content/challenges";
import {
  completeCurrent,
  currentChallenge,
  isRunComplete,
  runProgress,
  startRun,
  type ChallengeRun,
} from "@/lib/content/progress";
import type { Rng } from "@/lib/content/rng";
import { drawSession, type SessionPlan } from "@/lib/content/session";
import type { Challenge, ChoiceOption } from "@/lib/content/types";

/**
 * The rules of Logic Quest. No JSX, no class names, no React.
 *
 * The content is shared — the same `drawSession` deals the questions and the
 * same `checkAnswer` marks them, exactly as it does for Math and English — but
 * a round belongs to the game that runs it, so this is its own state machine
 * and never a flag on somebody else's. Content travels between games; rules do
 * not.
 *
 * What is Logic Quest's own, and the reason this file is not a copy of
 * `englishQuest.ts`: **the hint**. A wrong letter usually means the letter was
 * not known yet and there is nothing to say about it. A wrong pattern means
 * the child looked at the wrong thing, and there is something very specific to
 * say — *count the dots*, *say the letters out loud*. So every Logic challenge
 * carries a hint, and the moment a child gets one wrong KIDDO stops asking the
 * question and starts pointing at where to look. Nothing else in KIDDO does
 * this, and nothing else needs to.
 */

/**
 * What a round of Logic Quest is.
 *
 * Ten slots, three gentle, five middling, two harder, and every slot offering
 * a choice of two activities so no two rounds run in the same order. All four
 * activities appear in all three bands — five slots each — so a child who
 * finds sequences hard still meets an easy one late in the round, and a child
 * who races through patterns still meets a hard one.
 *
 * The child is never shown any of these names. They just play.
 */
export const LOGIC_QUEST_PLAN: SessionPlan = {
  slots: [
    { level: 1, from: ["logic.patterns", "logic.odd-one-out"] },
    { level: 1, from: ["logic.sorting", "logic.sequences"] },
    { level: 1, from: ["logic.odd-one-out", "logic.patterns"] },
    { level: 2, from: ["logic.sequences", "logic.sorting"] },
    { level: 2, from: ["logic.patterns", "logic.sequences"] },
    { level: 2, from: ["logic.odd-one-out", "logic.sorting"] },
    { level: 2, from: ["logic.sorting", "logic.patterns"] },
    { level: 2, from: ["logic.sequences", "logic.odd-one-out"] },
    { level: 3, from: ["logic.patterns", "logic.sorting"] },
    { level: 3, from: ["logic.odd-one-out", "logic.sequences"] },
  ],
};

/** Ten questions. Read from the plan so the two can never disagree. */
export const LOGIC_QUEST_LENGTH = LOGIC_QUEST_PLAN.slots.length;

/**
 * Deal a round. Without an `rng` it deals the same round every time, which is
 * what the server's first render needs; the browser passes a seeded one.
 */
export function buildLogicQuestSession(rng?: Rng): Challenge[] {
  return drawSession(LOGIC_QUEST_PLAN, { rng });
}

/**
 * `ready` exists for one reason: a four year old's finger is still coming down
 * when the next question appears. For a beat after one lands the board hears
 * nothing, so the tap that answered the last question cannot answer this one.
 */
export type LogicQuestPhase =
  | "intro"
  | "ready"
  | "awaitingAnswer"
  | "correct"
  | "incorrect"
  | "complete";

/**
 * How long each locked phase lasts, in ms.
 *
 * Thinking time, not animation time, so reduced motion does not shorten them.
 * `ready` is the longest of any KIDDO game because a logic question has to be
 * *read across* before it can be answered — a row of five shapes is not taken
 * in at a glance the way a single letter is.
 */
export const LOGIC_QUEST_TIMING = {
  /** A whole pattern has to land before the first tile can be tapped. */
  ready: 460,
  /** Held while KIDDO says what the rule was. */
  correct: 1300,
  /** Long enough to hear "almost", short enough to try again straight away. */
  retry: 950,
} as const;

export interface LogicQuestState {
  run: ChallengeRun;
  phase: LogicQuestPhase;
  /** Options tried and wrong, this question. Kept, so the choice narrows. */
  tried: readonly string[];
  /** The option just tapped, so one tile reacts rather than all of them. */
  picked: string | null;
  /**
   * Set by the first wrong answer, cleared by the right one.
   *
   * Once it is true KIDDO asks the question a different way — see
   * `logicQuestPrompt`. It is not a strike and it is not counted: one wrong
   * answer and ten wrong answers look exactly the same from here.
   */
  hinted: boolean;
}

export type LogicQuestAction =
  /** A fresh round. `intro` is false on a replay: KIDDO has already said hello. */
  | { type: "deal"; challenges: readonly Challenge[]; intro: boolean }
  | { type: "begin" }
  | { type: "answer"; optionId: string }
  | { type: "settle" };

export function freshLogicQuestState(
  challenges: readonly Challenge[],
  intro = true,
): LogicQuestState {
  return {
    run: startRun(challenges),
    phase: intro ? "intro" : "ready",
    tried: [],
    picked: null,
    hinted: false,
  };
}

/** The options of the question being asked, or none if there is no question. */
export function currentOptions(state: LogicQuestState): readonly ChoiceOption[] {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "choice" ? challenge.payload.options : [];
}

/** What the right answer is called, for KIDDO to say it out loud. */
export function answerLabelOf(challenge: Challenge | null): string {
  const item = challenge ? answerItemOf(challenge) : undefined;
  return item ? labelOf(item) : "";
}

export function logicQuestProgress(state: LogicQuestState) {
  return runProgress(state.run);
}

/**
 * What KIDDO says while the board is waiting.
 *
 * Normally the question. After a wrong answer, the hint instead — because
 * asking a child the identical question they have just got wrong is asking
 * them to guess, and a hint asks them to look. The hint never contains the
 * answer; it names the thing to look at.
 *
 * Falls back to the question for any challenge with no hint written, which is
 * why this is safe to call for every activity in the pack and any added later.
 */
export function logicQuestPrompt(state: LogicQuestState): string {
  const challenge = currentChallenge(state.run);
  if (!challenge) return "";
  return (state.hinted && challenge.hint) || challenge.prompt.speech;
}

export function logicQuestReducer(
  state: LogicQuestState,
  action: LogicQuestAction,
): LogicQuestState {
  switch (action.type) {
    case "deal":
      return freshLogicQuestState(action.challenges, action.intro);

    case "begin":
      return state.phase === "intro" ? { ...state, phase: "ready" } : state;

    case "answer": {
      /* Every tap outside `awaitingAnswer` falls on the floor. This is the
         whole defence against rapid tapping: no counting, no debouncing. */
      if (state.phase !== "awaitingAnswer") return state;

      const challenge = currentChallenge(state.run);
      if (!challenge || challenge.payload.kind !== "choice") return state;
      if (!challenge.payload.options.some((o) => o.id === action.optionId)) {
        return state;
      }

      /* The one question the game never answers for itself. */
      const correct = checkAnswer(challenge, {
        kind: "choice",
        optionId: action.optionId,
      });

      if (correct) return { ...state, phase: "correct", picked: action.optionId };

      return {
        ...state,
        phase: "incorrect",
        picked: action.optionId,
        hinted: true,
        /* An option tried twice is still one tried option. Nothing is counted
           and nothing is spent — this list only dims what is ruled out. */
        tried: state.tried.includes(action.optionId)
          ? state.tried
          : [...state.tried, action.optionId],
      };
    }

    case "settle":
      switch (state.phase) {
        case "ready":
          return { ...state, phase: "awaitingAnswer" };

        /* A wrong tile never ends the question, never costs anything and never
           moves the progress dots. It hands the board back, with a hint. */
        case "incorrect":
          return { ...state, phase: "awaitingAnswer", picked: null };

        case "correct": {
          const run = completeCurrent(state.run);
          return {
            ...state,
            run,
            phase: isRunComplete(run) ? "complete" : "ready",
            tried: [],
            picked: null,
            hinted: false,
          };
        }

        default:
          return state;
      }
  }
}
