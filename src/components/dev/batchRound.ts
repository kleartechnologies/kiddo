import type { ConnectLook } from "@/components/games/engines/ChallengeStage";
import type { SessionPlan } from "@/lib/content/session";
import type { MixedStep } from "./mixedRound";

/**
 * The twenty activities of this batch, in one round.
 *
 * Same shape as `mixedRound.ts` and the same job: plain data, so that what the
 * page renders can be checked without a browser, and so that the claim "the
 * new activities are registered well enough to be dealt alongside everything
 * else" is a thing you can watch happen rather than a thing a doc block says.
 *
 * Nothing here is content and nothing here is a Quest. `drawSession` deals it
 * knowing only the activity ids below, exactly as it deals the mixed round,
 * and no session architecture was touched to make that true.
 *
 * ## Why twenty, and why all at level three
 *
 * A round is normally something a child plays and so climbs; this one is
 * something a reviewer reads, and a reviewer needs the *widest* board each
 * activity can deal, not the friendliest. Level three is where a connect board
 * holds five lines, a word tray holds five letters and a choice board holds
 * four tiles, so level three is what the measurement script is pointed at. A
 * child's session would arrive here after nine easier questions.
 *
 * The sequence walks the subjects one at a time and changes engine as often as
 * the content allows — choice, connect, order through Shapes, Math and
 * English, then the two Logic boards, then General Knowledge, then the three
 * pairing decks last, because `look: "cards"` is the one thing on this page
 * that is a different renderer rather than a different subject.
 */
export const BATCH_ROUND: readonly MixedStep[] = [
  /* Shapes & Colours: the same fourteen facts asked three ways. */
  { level: 3, from: ["shapes.shape-objects"], label: "choice" },
  { level: 3, from: ["shapes.shape-partners"], label: "connect" },
  { level: 3, from: ["shapes.size-order"], label: "order" },

  /* Math: a question about neighbours, a board of sums, a tray of groups. */
  { level: 3, from: ["math.before-and-after"], label: "choice" },
  { level: 3, from: ["math.sum-partners"], label: "connect" },
  { level: 3, from: ["math.quantity-order"], label: "order" },

  /* English: sounds, letters and words. */
  { level: 3, from: ["english.ending-sounds"], label: "choice" },
  { level: 3, from: ["english.sound-partners"], label: "connect" },
  { level: 3, from: ["english.word-build"], label: "order" },
  { level: 3, from: ["english.plurals"], label: "choice" },
  { level: 3, from: ["english.opposites"], label: "choice" },

  /* Logic: the two boards that cannot be answered by looking hard. */
  { level: 3, from: ["logic.pair-partners"], label: "connect" },
  { level: 3, from: ["logic.group-partners"], label: "connect" },

  /* The world: two boards of facts and two runs. */
  { level: 3, from: ["general-knowledge.helper-partners"], label: "connect" },
  { level: 3, from: ["general-knowledge.body-partners"], label: "connect" },
  { level: 3, from: ["general-knowledge.day-order"], label: "order" },
  { level: 3, from: ["general-knowledge.life-cycles"], label: "order" },

  /* The pairing decks, which are connects wearing `MatchStage`. */
  {
    level: 3,
    from: ["match.quantity-partners"],
    look: "cards" as ConnectLook,
    label: "match",
  },
  {
    level: 3,
    from: ["match.opposite-partners"],
    look: "cards" as ConnectLook,
    label: "match",
  },
  {
    level: 3,
    from: ["match.sound-partners"],
    look: "cards" as ConnectLook,
    label: "match",
  },
];

/** The same round with the two fields `SessionSlot` has never had. */
export const BATCH_PLAN: SessionPlan = {
  slots: BATCH_ROUND.map(({ level, from }) => ({ level, from })),
};
