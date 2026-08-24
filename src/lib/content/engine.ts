import type { Answer, Challenge, ChallengeKind, ChallengeOf } from "./types";

/**
 * The contract between content and the games that render it.
 *
 * A game engine receives a whole challenge and nothing else:
 *
 * ```tsx
 * <ChoiceStage challenge={challenge} onAnswer={handleAnswer} accepting />
 * ```
 *
 * never
 *
 * ```tsx
 * <MathGame question="2 + 3" answer="5" />
 * ```
 *
 * The difference is the whole architecture. The first form cannot tell whether
 * it is asking about a sum, a colour or a letter, so it never has to be
 * changed when a new subject arrives; the second form has to be rewritten for
 * every one.
 *
 * These are types only. The components live under `components/games`, because
 * `lib` has no JSX in it anywhere in this codebase and should not start.
 *
 * ## The engine vocabulary
 *
 * There are two axes and they are kept apart on purpose: `ActivityType` is
 * *what is being learned* and there will be dozens of them; `ChallengeKind` is
 * *how the child answers* and there should only ever be a handful. An engine
 * is a renderer for one `ChallengeKind`, so the list of engines is the list of
 * ways a KIDDO board can be touched, and nothing else. Two engines may share a
 * kind — `ConnectStage` and `MatchStage` do — because the same answer can be
 * given by more than one gesture; what may never happen is one engine deciding
 * for itself whether the answer was right.
 *
 * Built:
 *
 * - `ChoiceStage` — `choice`. Tap the one that is right.
 * - `ConnectStage` — `connect`. Join a thing on the left to a thing on the
 *   right, by tap-tap, by drag, or by keyboard.
 * - `OrderStage` — `order`. Put things in a sequence: 1 2 3, smallest to
 *   biggest, the letters of a word. It needed **no new `ChallengeKind`** and
 *   no new checking: `OrderPayload`, its `Answer` and `checkStep`'s prefix
 *   rule were already exactly the right shape, which is what the rule at the
 *   bottom of this note is for.
 * - `MatchStage` — `connect` again, and the first place two engines share a
 *   kind. "Find the friends that belong together" is two shelves of cards
 *   rather than two columns and a line, and a found pair leaves the queue
 *   instead of being joined to where it stood; but a child putting the dog
 *   with the puppy and a child drawing a line between them have given the
 *   *same answer*, and an answer shape is what a kind is. The `match` kind
 *   could not have held it: its `pairIds` name pairs that were *found*, so it
 *   has no way to say a pairing nobody authored, and a renderer built on it
 *   would have had to decide the pairing was right before it could report it.
 *   That is the test below, failed. `match` stays where it belongs — a deck of
 *   face-down cards, where turning two over and seeing they are the same *is*
 *   the game.
 *
 * Intended, in the order they are most likely to earn their place. None of
 * these exist yet and none should be built until content is actually waiting
 * for one:
 *
 * - `FindStage` — `choice`. "Where is the star?" is one right thing among
 *   many, which is exactly what a `choice` is; only the layout differs, and a
 *   layout is not a kind. Find It already plays this way with its own board.
 * - `SortStage` — likely `connect`. Dropping five things into two baskets is
 *   five links from an item to a bucket — a bucket as a right-hand node that
 *   several left-hand nodes point at. `ConnectPair` can *say* that, but the
 *   rules cannot yet play it: today every node sits in exactly one pair —
 *   `validateChallenge` insists and `checkStep` assumes — so the day sorting
 *   is wanted, those two widen first. If that is all it takes, a sort board
 *   is a different *renderer* for `connect`, not a new kind. It becomes one
 *   only if a bucket needs to accept an unordered set, which `ConnectPair`
 *   cannot say.
 * - `DragStage` — no new kind. Dragging is an input method, not a question:
 *   drag-to-answer is `choice`, drag-to-arrange is `order`, drag-to-join is
 *   `connect`. `ConnectStage` already treats a drag and a tap as the same
 *   event for this reason, and any future engine should too.
 * - `BuildStage` — the one that probably does need a new kind eventually.
 *   Making a thing rather than picking or arranging one — a tower, a face, a
 *   sentence from word cards — has an answer shape none of the four existing
 *   payloads can hold. Do not add it speculatively.
 *
 * The rule before writing any of them: look for an existing `ChallengeKind`
 * that already expresses the *answer* the child is giving, and only add a kind
 * when no existing one can say what they did — including saying it *wrongly*,
 * which is the test `connect` had to pass. A new renderer is cheap; a new kind
 * is a change to every validator, key, and check in the content layer.
 */

/**
 * What the child did. Not whether it was right: an engine reports the tap and
 * is told what to draw, and `checkAnswer` is the only place marking happens.
 */
export interface AnswerResult {
  challengeId: string;
  answer: Answer;
}

/**
 * @typeParam K The one payload shape this engine renders. A `choice` engine
 * gets `ChallengeEngineProps<"choice">` and its payload is already narrowed —
 * no branching, no impossible cases to handle.
 */
export interface ChallengeEngineProps<K extends ChallengeKind = ChallengeKind> {
  challenge: ChallengeOf<K>;
  /**
   * Report a tap. The engine never decides whether it was right — it hands the
   * answer up and is told what to draw. `checkAnswer` in `challenges.ts` is
   * the only place marking happens.
   */
  onAnswer: (result: AnswerResult) => void;
  /**
   * False while an answer is being shown or a round is landing. Every KIDDO
   * game has this: a four year old's finger is still coming down when the next
   * question appears, and that tap must fall on the floor.
   */
  accepting?: boolean;
}

/** Narrowing helper for a stage that has been handed an unknown challenge. */
export function isKind<K extends ChallengeKind>(
  challenge: Challenge,
  kind: K,
): challenge is ChallengeOf<K> {
  return challenge.payload.kind === kind;
}
