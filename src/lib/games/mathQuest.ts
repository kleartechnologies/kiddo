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
 * The rules of Math Quest. No JSX, no class names, no React.
 *
 * Everything Math Quest knows about numbers it asks the content layer:
 * `drawSession` chooses the questions and `checkAnswer` marks them. What is
 * left here is the shape of a round — ten questions, a gentle ramp, a wrong
 * answer that costs nothing — which is a game decision, not a content one.
 *
 * The reducer is a plain function on plain values on purpose: a whole round
 * can be played in a test without rendering anything.
 */

/**
 * What a round of Math Quest is.
 *
 * Ten slots, three gentle, five middling, two harder, and every slot offering
 * a choice of activity so the same round is never dealt twice in the same
 * order. Adding, taking away, counting and comparing carry the round; the
 * sequence, pattern and recognition slots are the change of pace.
 *
 * This is data, and it is the only place the shape of a round is stated.
 */
export const MATH_QUEST_PLAN: SessionPlan = {
  slots: [
    /* The round opens in the Counting Garden: things to count, standing on
       the grass, before a numeral is asked for on its own. */
    { level: 1, from: ["math.counting-objects", "math.counting"] },
    { level: 1, from: ["math.counting", "math.counting-objects", "math.number-recognition"] },
    { level: 1, from: ["math.addition", "math.number-recognition"] },
    { level: 2, from: ["math.addition", "math.counting"] },
    { level: 2, from: ["math.comparison", "math.number-recognition"] },
    { level: 2, from: ["math.subtraction", "math.addition"] },
    { level: 2, from: ["math.number-sequence", "math.pattern"] },
    { level: 2, from: ["math.addition", "math.subtraction"] },
    { level: 3, from: ["math.missing-number", "math.number-sequence"] },
    { level: 3, from: ["math.addition", "math.subtraction", "math.comparison"] },
  ],
};

/** Ten questions. Read from the plan so the two can never disagree. */
export const MATH_QUEST_LENGTH = MATH_QUEST_PLAN.slots.length;

/**
 * Deal a round. Without an `rng` it deals the same round every time, which is
 * what the server's first render needs; the browser passes a seeded one.
 */
export function buildMathQuestSession(rng?: Rng): Challenge[] {
  return drawSession(MATH_QUEST_PLAN, { rng });
}

/**
 * `ready` exists for one reason: a four year old's finger is still coming down
 * when the next question appears. For a beat after one lands the board hears
 * nothing, so the tap that answered the last question cannot answer this one.
 */
export type MathQuestPhase =
  | "intro"
  | "ready"
  | "awaitingAnswer"
  | "correct"
  | "incorrect"
  | "complete";

/**
 * How long each locked phase lasts, in ms. Comprehension timings, not
 * animation timings: the child still has to see what happened, so these are
 * not shortened for reduced motion.
 */
export const MATH_QUEST_TIMING = {
  ready: 320,
  /** Held while KIDDO cheers and says what the answer was. */
  correct: 1000,
  /** Long enough to see the nudge, short enough to try again straight away. */
  retry: 850,
} as const;

export interface MathQuestState {
  run: ChallengeRun;
  phase: MathQuestPhase;
  /** Options tried and wrong, this question. Kept, so the choice narrows. */
  tried: readonly string[];
  /** The option just tapped, so one tile reacts rather than all of them. */
  picked: string | null;
}

export type MathQuestAction =
  /** A fresh round. `intro` is false on a replay: KIDDO has already said hello. */
  | { type: "deal"; challenges: readonly Challenge[]; intro: boolean }
  | { type: "begin" }
  | { type: "answer"; optionId: string }
  | { type: "settle" };

export function freshMathQuestState(
  challenges: readonly Challenge[],
  intro = true,
): MathQuestState {
  return {
    run: startRun(challenges),
    phase: intro ? "intro" : "ready",
    tried: [],
    picked: null,
  };
}

/** The options of the question being asked, or none if there is no question. */
export function currentOptions(state: MathQuestState): readonly ChoiceOption[] {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "choice" ? challenge.payload.options : [];
}

/** What the right answer is called, for KIDDO to say it out loud. */
export function answerLabelOf(challenge: Challenge | null): string {
  const item = challenge ? answerItemOf(challenge) : undefined;
  return item ? labelOf(item) : "";
}

export function mathQuestProgress(state: MathQuestState) {
  return runProgress(state.run);
}

export function mathQuestReducer(
  state: MathQuestState,
  action: MathQuestAction,
): MathQuestState {
  switch (action.type) {
    case "deal":
      return freshMathQuestState(action.challenges, action.intro);

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

        /* A wrong answer never ends the question, never costs anything and
           never moves the progress dots. It just hands the board back. */
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
          };
        }

        default:
          return state;
      }
  }
}
