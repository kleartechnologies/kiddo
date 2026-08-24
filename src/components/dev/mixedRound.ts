import type { ConnectLook } from "@/components/games/engines/ChallengeStage";
import type { Level } from "@/lib/content/difficulty";
import type { SessionPlan } from "@/lib/content/session";
import type { ActivityId } from "@/lib/content/types";

/**
 * One round made of four different things to do.
 *
 * Plain data, in a file of its own, so that the thing being proved can be
 * checked without a browser: `tests/mixed.test.ts` deals this round through
 * `drawSession` and reads the kinds that come back, and
 * `MixedPlayground.tsx` renders the same list. If the two ever disagree, one
 * of them is a fiction.
 *
 * It is not content and it is not a Quest. It is a reference round — the
 * smallest arrangement that makes the claim "a KIDDO round can change how the
 * child answers partway through" a thing you can watch happen.
 */

/** A slot in the round, plus the one thing a slot cannot say. */
export interface MixedStep {
  level: Level;
  from: readonly ActivityId[];
  /**
   * Which `connect` engine draws it. Not part of `SessionSlot` and should not
   * become part of it: `lines` or `cards` is a decision about how a board
   * looks, and the content layer has no opinions about looks.
   */
  look?: ConnectLook;
  /**
   * Whether a right join sends the left-hand picture to its partner — the
   * `travel` the connect engine offers. Same footing as `look`: a fact about
   * how a board behaves, which the content layer has no field for.
   */
  travel?: boolean;
  /** For the strip above the board. Internal, so it names the interaction. */
  label: string;
}

/**
 * Seven boards in the order Phase 3 named: choice, connect, order, choice,
 * match, connect, order.
 *
 * Every activity in it is real content out of a real pack — `animal-homes`
 * and `home-partners` are the same `animal-habitats` table asked two ways,
 * which is why they sit next to each other — and nothing was authored to make
 * the sequence possible.
 *
 * The fifth needs a word about what "match" means here. There is a `match`
 * *kind* in the content layer and no engine renders it; what a KIDDO round
 * calls a matching board is `match.letter-partners`, a `connect` drawn as two
 * shelves of cards. So the slot is a `connect` with `look: "cards"`, and the
 * sequence is honest: the child is handed four different things to do, and the
 * fifth of them is the one Match Quest is made of.
 *
 * Levels climb gently and then sit down again at each switch, because the
 * round is showing off interactions rather than difficulty, and a child
 * meeting a new gesture should meet it on an easy board.
 */
export const MIXED_ROUND: readonly MixedStep[] = [
  { level: 1, from: ["general-knowledge.animal-homes"], label: "choice" },
  { level: 1, from: ["general-knowledge.home-partners"], travel: true, label: "connect" },
  { level: 1, from: ["english.alphabet-order"], label: "order" },
  { level: 2, from: ["english.letter-recognition"], label: "choice" },
  { level: 1, from: ["match.letter-partners"], look: "cards", label: "match" },
  { level: 2, from: ["general-knowledge.home-partners"], travel: true, label: "connect" },
  { level: 2, from: ["english.alphabet-order"], label: "order" },
];

/**
 * The same round as the content layer already understands it.
 *
 * Note what is dropped on the way: `look` and `label`, because `SessionSlot`
 * has never had a field for either and does not need one. A slot names a level
 * and some activities; what kind they are, and what draws them, is nothing
 * `drawSession` has to be told.
 */
export const MIXED_PLAN: SessionPlan = {
  slots: MIXED_ROUND.map(({ level, from }) => ({ level, from })),
};
