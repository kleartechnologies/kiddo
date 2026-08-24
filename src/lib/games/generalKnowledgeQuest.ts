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
import { drawSession, type SessionKey, type SessionPlan } from "@/lib/content/session";
import type { Challenge, ChallengeOf, ChoiceOption } from "@/lib/content/types";

/**
 * The rules of General Knowledge Quest. No JSX, no class names, no React.
 *
 * The content is shared — the same `drawSession` deals the round and the same
 * `checkAnswer` marks it, exactly as for Math, English, Logic and Shapes — but
 * a round belongs to the game that runs it, so this is its own state machine
 * and never a flag on somebody else's.
 *
 * Two things are this game's own, and they are why this file is not a copy of
 * `shapesColoursQuest.ts`:
 *
 * **A round tours the world rather than drilling one corner of it.** The plan
 * below is grouped by *topic*, not by activity: the first slot is about
 * animals whichever activity fills it, the fifth is about people and places.
 * A child gets animals, then home, then outdoors, then bodies, then space —
 * one round, ten different corners — instead of four animal questions in a
 * row because the shuffle happened to land there.
 *
 * **The board is given the longest beat of any quest.** Every question here
 * is a sentence a child has to hear to the end before the pictures mean
 * anything — "which animal has a baby called a joey?" is not answerable from
 * the first three words the way "3 + 2" is answerable at a glance. See
 * `GENERAL_KNOWLEDGE_TIMING`.
 *
 * ## One board in the round is joined up rather than tapped
 *
 * The habitats slot offers `home-partners` beside `animal-homes`: the same
 * facts, asked as "help each animal find its home" with a line from the
 * animal to the place instead of one tile among four. The round does not
 * learn how to join things — `useConnect` has run a connect board since the
 * engine was written, and runs this one. What the round learns is only what
 * Match Quest's round knows about its boards: that one is on the table, and
 * that it has been finished (`solved`). A join that holds or does not is the
 * engine's cheer and the engine's nudge, exactly as in the playground; the
 * round only hears about a miss so it can offer the hint it offers after a
 * wrong tile (`missed`).
 */

/**
 * What a round of General Knowledge Quest is.
 *
 * Ten slots — three gentle, five middling, two harder — and every slot offers
 * a choice of three or four activities from the same corner of the world.
 * Twenty-eight activities and thirty-two offers, so every activity in the pack
 * is reachable and no round can run twice in the same order.
 *
 * The topic grouping is the point. Slot one is animals, slot two is the
 * kitchen and the wardrobe, slot three is out of the front door, slot six is
 * the pack's three sorting ideas, slot nine is the wide world. Whichever
 * activity fills a slot, the round walks the same path outward from a child's
 * own house — which is also the order the pack itself is written in.
 *
 * Tools of the job is the one activity with nothing at level one, so it is
 * only ever offered in a level-three slot. Nothing would break if it were
 * offered lower (`resolveLevel` snaps it up) but a snapped-up challenge is not
 * an easy one, and the first three questions are meant to be easy.
 *
 * The child is never shown any of these names. They just play.
 */
export const GENERAL_KNOWLEDGE_PLAN: SessionPlan = {
  slots: [
    /* Animals: what a child knew before they could talk. */
    {
      level: 1,
      from: [
        "general-knowledge.animal-names",
        "general-knowledge.animal-sounds",
        "general-knowledge.baby-animals",
      ],
    },
    /* Indoors: the kitchen, the toy box, the wardrobe. */
    {
      level: 1,
      from: [
        "general-knowledge.food-names",
        "general-knowledge.object-names",
        "general-knowledge.clothing",
      ],
    },
    /* Out of the front door. */
    {
      level: 1,
      from: [
        "general-knowledge.weather",
        "general-knowledge.vehicle-names",
        "general-knowledge.day-and-night",
        "general-knowledge.hot-or-cold",
      ],
    },
    /* Living things and where they live. `home-partners` is the same facts
       as `animal-homes`, joined up rather than tapped — the one board in the
       round where the child watches the animal go home. */
    {
      level: 2,
      from: [
        "general-knowledge.animal-homes",
        "general-knowledge.home-partners",
        "general-knowledge.animal-diet",
        "general-knowledge.plants",
      ],
    },
    /* People, and the places they work. */
    {
      level: 2,
      from: [
        "general-knowledge.community-helpers",
        "general-knowledge.places",
        "general-knowledge.body-parts",
      ],
    },
    /* The three sorting ideas: alive or not, grown or built, hot or cold. */
    {
      level: 2,
      from: [
        "general-knowledge.living-things",
        "general-knowledge.natural-or-made",
        "general-knowledge.hot-or-cold",
      ],
    },
    /* What things are for, and where they come from. */
    {
      level: 2,
      from: [
        "general-knowledge.object-uses",
        "general-knowledge.vehicle-travel",
        "general-knowledge.food-origins",
      ],
    },
    /* Your own body, and looking after it. */
    {
      level: 2,
      from: [
        "general-knowledge.senses",
        "general-knowledge.healthy-habits",
        "general-knowledge.safety",
      ],
    },
    /* The wide world, and the sky above it. */
    {
      level: 3,
      from: [
        "general-knowledge.space",
        "general-knowledge.land-and-water",
        "general-knowledge.seasons",
      ],
    },
    /* The last question, and the ones that need the most thinking. */
    {
      level: 3,
      from: [
        "general-knowledge.helper-tools",
        "general-knowledge.safety",
        "general-knowledge.living-things",
        "general-knowledge.natural-or-made",
      ],
    },
  ],
};

/** Ten questions. Read from the plan so the two can never disagree. */
export const GENERAL_KNOWLEDGE_LENGTH = GENERAL_KNOWLEDGE_PLAN.slots.length;

/**
 * When this round has already asked something.
 *
 * Two answers, because there are two ways to bore a child here and neither
 * one catches the other:
 *
 * The **concept** — is there anything new to learn? A pack this size can deal
 * thousands of boards from one fact by varying which wrong answers stand
 * beside the right one, and "which animal says moo?" is the same lesson
 * whether the cow is beside a duck or beside an owl.
 *
 * The **sentence KIDDO says** — has the child heard this before? Sorting
 * questions repeat their wording by design: *which one is a fruit?* is asked
 * of an apple, of a banana and of a watermelon, and *which one is alive?* is
 * asked of eight different living things. Those are genuinely different facts
 * — the concept key is right to count them separately — but hearing the
 * identical sentence twice in ten questions makes a round feel like it is
 * going round in circles, whatever the tiles say.
 *
 * Shapes & Colours keys on the sentence *and its answer*, because there a
 * repeated sentence is often a fresh puzzle — "which one comes next?" over
 * two different patterns. Nothing here works like that: every question in
 * this pack is a fact rather than a puzzle, so the plain sentence is the
 * right measure and the stricter one costs nothing. Measured over five
 * hundred rounds, the looser key let a sentence repeat in thirty-seven of
 * them; this one lets it repeat in none.
 */
const questKey: SessionKey = (challenge) => [
  conceptKey(challenge),
  challenge.prompt.speech,
];

/**
 * Deal a round. Without an `rng` it deals the same round every time, which is
 * what the server's first render needs; the browser passes a seeded one.
 *
 * A `plan` other than this quest's own is how a world activity deals its
 * round: the same mixed choice-and-connect machine, the same timings and the
 * same hints, over five questions from one corner of one pack instead of
 * ten from the whole of General Knowledge. The machine never learns which.
 */
export function buildGeneralKnowledgeSession(
  rng?: Rng,
  plan: SessionPlan = GENERAL_KNOWLEDGE_PLAN,
): Challenge[] {
  return drawSession(plan, { rng, keyOf: questKey });
}

/**
 * `ready` exists for one reason: a four year old's finger is still coming down
 * when the next question appears. For a beat after one lands the board hears
 * nothing, so the tap that answered the last question cannot answer this one.
 */
export type GeneralKnowledgePhase =
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
 *
 * The longest `ready` of any quest, and the longest `correct`. Both for the
 * same reason: this is the only quest where the *question* carries the
 * content. A sum can be read off the stage in a glance and a shape board can
 * be looked over, but "which sign shows drivers that children cross the road
 * here?" has to be heard all the way to the end before a single tile means
 * anything — and the answer is followed by a fact worth staying still for.
 */
export const GENERAL_KNOWLEDGE_TIMING = {
  /** A whole spoken question has to land before the first tile can be tapped. */
  ready: 520,
  /** Held while KIDDO says the thing the question was really about. */
  correct: 1500,
  /** Long enough to hear "almost", short enough to try again straight away. */
  retry: 950,
} as const;

export interface GeneralKnowledgeState {
  run: ChallengeRun;
  phase: GeneralKnowledgePhase;
  /** Options tried and wrong, this question. Kept, so the choice narrows. */
  tried: readonly string[];
  /** The option just tapped, so one tile reacts rather than all of them. */
  picked: string | null;
  /**
   * Set by the first wrong answer, cleared by the right one.
   *
   * Once it is true KIDDO asks the question a different way — see
   * `generalKnowledgePrompt`. It is not a strike and it is not counted: one
   * wrong answer and ten wrong answers look exactly the same from here.
   */
  hinted: boolean;
}

export type GeneralKnowledgeAction =
  /** A fresh round. `intro` is false on a replay: KIDDO has already said hello. */
  | { type: "deal"; challenges: readonly Challenge[]; intro: boolean }
  | { type: "begin" }
  | { type: "answer"; optionId: string }
  /** A join on a connect board did not hold. The engine has already nudged. */
  | { type: "missed" }
  /** Every pair on a connect board is joined. The engine has already checked. */
  | { type: "solved" }
  | { type: "settle" };

export function freshGeneralKnowledgeState(
  challenges: readonly Challenge[],
  intro = true,
): GeneralKnowledgeState {
  return {
    run: startRun(challenges),
    phase: intro ? "intro" : "ready",
    tried: [],
    picked: null,
    hinted: false,
  };
}

/**
 * The connect board on the table, if the question being asked is one.
 *
 * Null for a tile question and once the round is over. `useConnect` has to be
 * given a board on every render, so the hook hands it `IDLE_BOARD` whenever
 * this is null.
 */
export function currentBoard(
  state: GeneralKnowledgeState,
): ChallengeOf<"connect"> | null {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "connect"
    ? (challenge as ChallengeOf<"connect">)
    : null;
}

/**
 * A connect board with nothing on it.
 *
 * `useConnect` runs one board for the life of the round, the way
 * `useMatchQuestGame` runs one, and a hook cannot be skipped on the renders
 * where the question is a tile question instead. So on those renders it runs
 * this: no animals, no homes, nothing to join, nothing that can be completed.
 * Its state is never read — the hook only listens to the engine while the
 * engine is on the board the round believes is out, and this is never that.
 */
export const IDLE_BOARD: ChallengeOf<"connect"> = {
  id: "general-knowledge.home-partners#idle",
  packId: "general-knowledge",
  activityId: "general-knowledge.home-partners",
  category: "general-knowledge",
  activityType: "animal-habitats",
  level: 1,
  ageRange: { min: 4, max: 7 },
  prompt: { speech: "" },
  payload: { kind: "connect", left: [], right: [], pairs: [] },
};

/** The options of the question being asked, or none if there is no question. */
export function currentOptions(
  state: GeneralKnowledgeState,
): readonly ChoiceOption[] {
  const challenge = currentChallenge(state.run);
  return challenge?.payload.kind === "choice" ? challenge.payload.options : [];
}

/** What the right answer is called, for KIDDO to say it out loud. */
export function answerLabelOf(challenge: Challenge | null): string {
  const item = challenge ? answerItemOf(challenge) : undefined;
  return item ? labelOf(item) : "";
}

export function generalKnowledgeProgress(state: GeneralKnowledgeState) {
  return runProgress(state.run);
}

/**
 * What KIDDO says while the board is waiting.
 *
 * Normally the question. After a wrong answer, the hint instead — because
 * asking a child the identical question they have just got wrong is asking
 * them to guess, and a hint asks them to think again, somewhere in particular:
 * *say the sound out loud*, *picture the animal at home*. The hint never
 * contains the answer.
 */
export function generalKnowledgePrompt(state: GeneralKnowledgeState): string {
  const challenge = currentChallenge(state.run);
  if (!challenge) return "";
  return (state.hinted && challenge.hint) || challenge.prompt.speech;
}

export function generalKnowledgeReducer(
  state: GeneralKnowledgeState,
  action: GeneralKnowledgeAction,
): GeneralKnowledgeState {
  switch (action.type) {
    case "deal":
      return freshGeneralKnowledgeState(action.challenges, action.intro);

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

    /* The engine has already shown the line let go; the round only softens
       the question, the way it does after a wrong tile. Nothing is counted. */
    case "missed": {
      if (state.phase !== "awaitingAnswer" || !currentBoard(state)) return state;
      return state.hinted ? state : { ...state, hinted: true };
    }

    /* The last pair landed. `useConnect` asked `checkAnswer`, not this file:
       the round is told the board is finished and does what it does after a
       right tile — holds it while KIDDO says why, then moves on. */
    case "solved": {
      if (state.phase !== "awaitingAnswer" || !currentBoard(state)) return state;
      return { ...state, phase: "correct" };
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
