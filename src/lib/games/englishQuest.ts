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
 * The rules of English Quest. No JSX, no class names, no React.
 *
 * The content layer is shared with Math Quest and everything else — the same
 * `drawSession` chooses the questions and the same `checkAnswer` marks them —
 * but the rules of a round are the game's own, so this is its own reducer over
 * its own state and never a flag on somebody else's. What a round of English
 * Quest is, and how long a child gets to look at a word, are decisions this
 * file makes alone.
 *
 * That split is the point the pack is proving: content travels, games do not.
 */

/**
 * What a round of English Quest is.
 *
 * Ten slots, three gentle, four middling, three harder, and every slot
 * offering a choice of activity so the same round is never dealt twice in the
 * same order. All four activities this plan names appear in all three bands: a
 * child who finds spelling hard still meets letters they know at question
 * nine.
 *
 * Four, not eleven. The English pack has grown past this round — `word-build`
 * and `alphabet-order` are trays and `sound-partners` and `rhyming-partners`
 * are columns, none of which a `ChoiceStage` game can draw, and
 * `ending-sounds`, `plurals` and `opposites` are choices that could be dealt
 * tomorrow. They are absent because widening a round is a change to the game,
 * and the batch that wrote them was a change to the library. See
 * `docs/content-universe.md` §"What the Quests do not yet deal".
 *
 * This is data, and it is the only place the shape of a round is stated.
 */
export const ENGLISH_QUEST_PLAN: SessionPlan = {
  slots: [
    { level: 1, from: ["english.letter-recognition", "english.letter-case"] },
    { level: 1, from: ["english.letter-case", "english.beginning-sounds"] },
    { level: 1, from: ["english.beginning-sounds", "english.spelling"] },
    { level: 2, from: ["english.spelling", "english.letter-recognition"] },
    { level: 2, from: ["english.letter-case", "english.beginning-sounds"] },
    { level: 2, from: ["english.spelling", "english.beginning-sounds"] },
    { level: 2, from: ["english.letter-recognition", "english.letter-case"] },
    { level: 3, from: ["english.beginning-sounds", "english.spelling"] },
    { level: 3, from: ["english.letter-case", "english.letter-recognition"] },
    { level: 3, from: ["english.spelling", "english.beginning-sounds"] },
  ],
};

/** Ten questions. Read from the plan so the two can never disagree. */
export const ENGLISH_QUEST_LENGTH = ENGLISH_QUEST_PLAN.slots.length;

/**
 * Deal a round. Without an `rng` it deals the same round every time, which is
 * what the server's first render needs; the browser passes a seeded one.
 */
export function buildEnglishQuestSession(rng?: Rng): Challenge[] {
  return drawSession(ENGLISH_QUEST_PLAN, { rng });
}

/**
 * `ready` exists for one reason: a four year old's finger is still coming down
 * when the next question appears. For a beat after one lands the board hears
 * nothing, so the tap that answered the last question cannot answer this one.
 */
export type EnglishQuestPhase =
  | "intro"
  | "ready"
  | "awaitingAnswer"
  | "correct"
  | "incorrect"
  | "complete";

/**
 * How long each locked phase lasts, in ms.
 *
 * Longer than Math Quest's on purpose, and this is the one number in the game
 * that is really about English: a word has to be read before it can be
 * answered, and read again afterwards to see why it was right. Comprehension
 * timings, not animation timings, so reduced motion does not shorten them.
 */
export const ENGLISH_QUEST_TIMING = {
  ready: 380,
  /** Held while KIDDO cheers and spells the word out. */
  correct: 1200,
  /** Long enough to see the nudge, short enough to try again straight away. */
  retry: 900,
} as const;

export interface EnglishQuestState {
  run: ChallengeRun;
  phase: EnglishQuestPhase;
  /** Options tried and wrong, this question. Kept, so the choice narrows. */
  tried: readonly string[];
  /** The option just tapped, so one tile reacts rather than all of them. */
  picked: string | null;
}

export type EnglishQuestAction =
  /** A fresh round. `intro` is false on a replay: KIDDO has already said hello. */
  | { type: "deal"; challenges: readonly Challenge[]; intro: boolean }
  | { type: "begin" }
  | { type: "answer"; optionId: string }
  | { type: "settle" };

export function freshEnglishQuestState(
  challenges: readonly Challenge[],
  intro = true,
): EnglishQuestState {
  return {
    run: startRun(challenges),
    phase: intro ? "intro" : "ready",
    tried: [],
    picked: null,
  };
}

/** The options of the question being asked, or none if there is no question. */
export function currentOptions(state: EnglishQuestState): readonly ChoiceOption[] {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "choice" ? challenge.payload.options : [];
}

/** What the right answer is called, for KIDDO to say it out loud. */
export function answerLabelOf(challenge: Challenge | null): string {
  const item = challenge ? answerItemOf(challenge) : undefined;
  return item ? labelOf(item) : "";
}

export function englishQuestProgress(state: EnglishQuestState) {
  return runProgress(state.run);
}

export function englishQuestReducer(
  state: EnglishQuestState,
  action: EnglishQuestAction,
): EnglishQuestState {
  switch (action.type) {
    case "deal":
      return freshEnglishQuestState(action.challenges, action.intro);

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

        /* A wrong letter never ends the word, never costs anything and never
           moves the progress dots. It just hands the board back. */
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
