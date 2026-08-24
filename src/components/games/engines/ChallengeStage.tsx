"use client";

import type { ChallengeOf } from "@/lib/content/types";
import { ChoiceStage, type ChoiceStageProps } from "./ChoiceStage";
import { ConnectStage, type ConnectStageProps } from "./ConnectStage";
import { MatchStage } from "./MatchStage";
import { OrderStage, type OrderStageProps } from "./OrderStage";

/**
 * Which engine draws this board.
 *
 * The only file under `engines/` that is not an engine. It renders nothing,
 * measures nothing, holds no state and knows no rule: it reads
 * `challenge.payload.kind`, hands every prop it was given straight to the
 * renderer that kind belongs to, and gets out of the way. Delete the switch
 * and each stage still works exactly as it does today, because none of them
 * has been touched.
 *
 * ## Why it exists
 *
 * Every game in the product picks its engine by *being written for one* —
 * Math Quest imports `ChoiceStage`, Match Quest imports `MatchStage` — so a
 * round has always been able to change its subject and never its interaction.
 * That is a limit of the games, not of the content: a session plan can already
 * name a `choice` activity and a `connect` activity in the same list, and
 * `drawSession` will happily deal both. There was simply nowhere to send the
 * second one.
 *
 * This is that somewhere, and it is deliberately the smallest thing that could
 * be. It is not a layout, not a wrapper, not a "stage host" with opinions
 * about padding. A component that decides which of four existing components to
 * render is the whole of it, and if it ever grows a branch that changes what a
 * board *looks* like, that branch belongs in the engine it is about.
 *
 * ## What it does not do
 *
 * It does not own the interaction. Each kind has a hook that holds what has
 * been tapped, joined or placed — `useConnect`, `useOrder` — and those stay
 * with the caller, because they are what a *game* is made of and this is not a
 * game. The props below are that hook's output, passed through unread.
 *
 * ## The kinds
 *
 * - `choice` → `ChoiceStage`
 * - `order` → `OrderStage`
 * - `connect` → `ConnectStage`, or `MatchStage` when `look` says `cards`.
 *   Two engines, one kind: joining two columns with a line and finding two
 *   cards that belong together are the same *answer* given by different
 *   gestures, which is why `MatchStageProps` is `ConnectStageProps` and why
 *   the choice between them is a prop rather than a kind.
 *
 * There is no `match` case, and its absence is the honest state of the
 * codebase rather than an omission. The fourth `ChallengeKind` describes a
 * deck of face-down cards, whose answer names pairs that were *found*; no
 * engine renders it yet and no content produces it. So it is left out of
 * `ChallengeStageProps` entirely, which means a `match` challenge cannot be
 * passed here at all — a compiler error the day somebody writes one, instead
 * of a blank board a child would meet first. `engine.ts` explains the kind.
 */

/** Which of the two `connect` engines draws the board. */
export type ConnectLook = "lines" | "cards";

/**
 * Exactly the props the chosen engine needs, and nothing else.
 *
 * A union rather than a bag of optional groups, so the type system does the
 * routing too: a `connect` challenge without `onSelectLeft` does not compile,
 * and neither does an `order` challenge handed `stateOf`. Nothing here is
 * new — each member is the engine's own props interface, imported.
 */
export type ChallengeStageProps =
  | ChoiceStageProps
  | OrderStageProps
  | (ConnectStageProps & { look?: ConnectLook });

/* A nested discriminant does not narrow the object that holds it, so each
   kind gets the one-line predicate `isKind` in `engine.ts` is the model for.
   Three predicates and no casts, rather than one cast per branch. */

function isChoice(props: ChallengeStageProps): props is ChoiceStageProps {
  return props.challenge.payload.kind === "choice";
}

function isOrder(props: ChallengeStageProps): props is OrderStageProps {
  return props.challenge.payload.kind === "order";
}

function isConnect(
  props: ChallengeStageProps,
): props is ConnectStageProps & { look?: ConnectLook } {
  return props.challenge.payload.kind === "connect";
}

export function ChallengeStage(props: ChallengeStageProps) {
  if (isChoice(props)) return <ChoiceStage {...props} />;
  if (isOrder(props)) return <OrderStage {...props} />;

  if (isConnect(props)) {
    const { look = "lines", ...rest } = props;
    return look === "cards" ? <MatchStage {...rest} /> : <ConnectStage {...rest} />;
  }

  /* Unreachable: `ChallengeStageProps` has a member for every kind that has a
     renderer, so anything else was refused at the call site. Returning an
     empty board rather than throwing, because the one thing worse than a
     missing engine in front of a five year old is a crash in front of one. */
  return null;
}

/** Narrow a challenge to the ones an engine exists for. */
export type RenderableChallenge = ChallengeOf<"choice" | "order" | "connect">;
