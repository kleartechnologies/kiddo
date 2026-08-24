import {
  answerItemOf,
  checkAnswer,
  conceptKey,
  labelOf,
} from "@/lib/content/challenges";
import {
  completeCurrent,
  currentChallenge,
  isRunComplete,
  runProgress,
  startRun,
  type ChallengeRun,
} from "@/lib/content/progress";
import type { Rng } from "@/lib/content/rng";
import { drawSession, type SessionPlan, type SessionKey } from "@/lib/content/session";
import type { Challenge, ChoiceOption } from "@/lib/content/types";

/**
 * The rules of Shapes & Colours Quest. No JSX, no class names, no React.
 *
 * The content is shared — the same `drawSession` deals the round and the same
 * `checkAnswer` marks it, exactly as for Math, English and Logic — but a round
 * belongs to the game that runs it, so this is its own state machine and never
 * a flag on somebody else's.
 *
 * Two things are this game's own, and they are the reason this file is not a
 * copy of `logicQuest.ts`:
 *
 * **A round is de-duplicated by concept, not by board.** Eleven activities
 * built from small ideas — *this shape is a triangle*, *this one is inside
 * that one* — can deal thousands of different-looking boards from the same
 * handful of lessons. Refusing a repeated *board* would let a round ask "which
 * one is the circle?" three times in three different colours. Refusing a
 * repeated *concept* is the promise actually worth making, and `drawSession`
 * takes it as an argument. See `questKey` for the second half of that promise.
 *
 * **The board is given a beat longer to land.** A shape question is answered
 * by looking, and there is more to look at here than a letter or a sum: a
 * scene has two shapes and a relationship between them, a counting board has
 * up to six things on it. See `SHAPES_QUEST_TIMING`.
 */

/**
 * What a round of Shapes & Colours Quest is.
 *
 * Ten slots — three gentle, five middling, two harder — and every slot offers
 * a choice of two activities, so no two rounds run in the same order. Eleven
 * of the pack's fourteen activities are reachable, and most appear twice in
 * the offers, which is what stops a round from being the same three activities
 * every time. The three that are not — `shape-partners`, `size-order` and
 * `shape-objects` — are named, with their reasons, in
 * `tests/shapesColoursQuest.test.ts`; the first two are not choices and this
 * game only renders choices, and the third is a choice that a later batch
 * should deal, because editing a round's slots is a change to the game rather
 * than to the library.
 *
 * The two activities that only exist at levels 2 and 3 — sorting by shape *and*
 * colour at once, and mirror symmetry — are not offered in a level-one slot.
 * Nothing would break if they were (`resolveLevel` would snap them up to their
 * own lowest level) but the round's first three questions are meant to be the
 * easy ones, and a snapped-up challenge is not easy.
 *
 * The child is never shown any of these names. They just play.
 */
export const SHAPES_QUEST_PLAN: SessionPlan = {
  slots: [
    { level: 1, from: ["shapes.shape-names", "shapes.colour-names"] },
    { level: 1, from: ["shapes.matching", "shapes.counting"] },
    { level: 1, from: ["shapes.size", "shapes.position"] },
    { level: 2, from: ["shapes.same-different", "shapes.properties"] },
    { level: 2, from: ["shapes.patterns", "shapes.classify"] },
    { level: 2, from: ["shapes.colour-names", "shapes.symmetry"] },
    { level: 2, from: ["shapes.counting", "shapes.matching"] },
    { level: 2, from: ["shapes.position", "shapes.shape-names"] },
    { level: 3, from: ["shapes.classify", "shapes.patterns"] },
    { level: 3, from: ["shapes.symmetry", "shapes.properties"] },
  ],
};

/** Ten questions. Read from the plan so the two can never disagree. */
export const SHAPES_QUEST_LENGTH = SHAPES_QUEST_PLAN.slots.length;

/**
 * When this round has already asked something.
 *
 * Two answers, because there are two ways to bore a child here and neither one
 * catches the other:
 *
 * The **concept** — is there anything new to learn? This is the one that stops
 * a round asking about the circle three times in three colours.
 *
 * The **question and its answer, in words** — did KIDDO already say this? Two
 * boards can teach genuinely different things and still land as the same
 * moment: *which one is blue?* asked of four hexagons, and asked again of four
 * different shapes, are two ideas — telling colours apart, and telling colour
 * from shape — and one sentence, with the same blue thing tapped both times.
 * Measured over five hundred rounds, that happened in sixteen of them.
 *
 * The reverse case is why this is not simply a stricter concept key: *which
 * one comes next?* over two different patterns is one sentence and two real
 * puzzles, and refusing the second would cost a round its variety for nothing.
 * The answer is what separates them — the same words with a different answer
 * is a different question.
 */
const questKey: SessionKey = (challenge) => [
  conceptKey(challenge),
  `${challenge.prompt.speech}|${answerLabelOf(challenge)}`,
];

/**
 * Deal a round. Without an `rng` it deals the same round every time, which is
 * what the server's first render needs; the browser passes a seeded one.
 *
 * `questKey` is the whole reason this is not one line — see the note above.
 */
export function buildShapesQuestSession(rng?: Rng): Challenge[] {
  return drawSession(SHAPES_QUEST_PLAN, { rng, keyOf: questKey });
}

/**
 * `ready` exists for one reason: a four year old's finger is still coming down
 * when the next question appears. For a beat after one lands the board hears
 * nothing, so the tap that answered the last question cannot answer this one.
 */
export type ShapesQuestPhase =
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
 * `ready` matches Logic Quest's, and for the same reason turned sideways: a
 * logic row has to be read across before it can be answered, and a shapes
 * board has to be *looked over* — six shapes to count, or two shapes and the
 * space between them. Neither is taken in at the glance a single letter is.
 */
export const SHAPES_QUEST_TIMING = {
  /** A whole picture has to land before the first tile can be tapped. */
  ready: 460,
  /** Held while KIDDO says what made it the right one. */
  correct: 1300,
  /** Long enough to hear "almost", short enough to try again straight away. */
  retry: 950,
} as const;

export interface ShapesQuestState {
  run: ChallengeRun;
  phase: ShapesQuestPhase;
  /** Options tried and wrong, this question. Kept, so the choice narrows. */
  tried: readonly string[];
  /** The option just tapped, so one tile reacts rather than all of them. */
  picked: string | null;
  /**
   * Set by the first wrong answer, cleared by the right one.
   *
   * Once it is true KIDDO asks the question a different way — see
   * `shapesQuestPrompt`. It is not a strike and it is not counted: one wrong
   * answer and ten wrong answers look exactly the same from here.
   */
  hinted: boolean;
}

export type ShapesQuestAction =
  /** A fresh round. `intro` is false on a replay: KIDDO has already said hello. */
  | { type: "deal"; challenges: readonly Challenge[]; intro: boolean }
  | { type: "begin" }
  | { type: "answer"; optionId: string }
  | { type: "settle" };

export function freshShapesQuestState(
  challenges: readonly Challenge[],
  intro = true,
): ShapesQuestState {
  return {
    run: startRun(challenges),
    phase: intro ? "intro" : "ready",
    tried: [],
    picked: null,
    hinted: false,
  };
}

/** The options of the question being asked, or none if there is no question. */
export function currentOptions(state: ShapesQuestState): readonly ChoiceOption[] {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "choice" ? challenge.payload.options : [];
}

/** What the right answer is called, for KIDDO to say it out loud. */
export function answerLabelOf(challenge: Challenge | null): string {
  const item = challenge ? answerItemOf(challenge) : undefined;
  return item ? labelOf(item) : "";
}

export function shapesQuestProgress(state: ShapesQuestState) {
  return runProgress(state.run);
}

/**
 * What KIDDO says while the board is waiting.
 *
 * Normally the question. After a wrong answer, the hint instead — because
 * asking a child the identical question they have just got wrong is asking
 * them to guess, and a hint asks them to look again, somewhere in particular:
 * *look at the shape, not the colour*, *find the star first*. The hint never
 * contains the answer.
 */
export function shapesQuestPrompt(state: ShapesQuestState): string {
  const challenge = currentChallenge(state.run);
  if (!challenge) return "";
  return (state.hinted && challenge.hint) || challenge.prompt.speech;
}

export function shapesQuestReducer(
  state: ShapesQuestState,
  action: ShapesQuestAction,
): ShapesQuestState {
  switch (action.type) {
    case "deal":
      return freshShapesQuestState(action.challenges, action.intro);

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
