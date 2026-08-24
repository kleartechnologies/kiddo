import { checkAnswer, checkStep } from "@/lib/content/challenges";
import type { ChallengeOf } from "@/lib/content/types";

/**
 * The rules of putting things in order. No JSX, no class names, no React.
 *
 * The third of the interaction reducers, beside `connect.ts`, and it makes the
 * same promise: nothing in here is Math, English or numbers, and nothing in
 * here decides what order is the right one. Every correctness question goes to
 * `checkStep` and `checkAnswer` in the content layer, exactly once each.
 *
 * ## Why the line is built from the left
 *
 * This is not a style choice — it is what the content layer already decided.
 * `checkStep` for an `order` payload accepts a **prefix** of `answerOrder`:
 *
 * ```ts
 * answer.itemIds.every((id, index) => payload.answerOrder[index] === id)
 * ```
 *
 * That is the content layer's definition of "right so far" for an ordering,
 * and it can only speak about a run that starts at the beginning. A board
 * where the child drops a tile into the fourth place while the first three are
 * empty has no prefix to ask about, so an engine built that way would have to
 * invent a second notion of partial correctness — which is the one thing the
 * brief and `challenges.ts` both rule out. So the line grows from the left,
 * one tile at a time, and every placement is a question the seam can answer.
 *
 * A consequence worth naming: the line only ever holds tiles the content layer
 * has already accepted, so there is nothing in it to swap, reorder or take
 * back. A wrong tile never lands.
 *
 * ## No score, no lives, no clock
 *
 * There is nothing in this state to lose. A refused tile is not counted, does
 * not leave the tray, does not end anything: it is offered, it comes back, and
 * the child has another go. `feedback` is the whole record of it and it lasts
 * until the next `retry`.
 */

/** The three things a KIDDO round can be feeling. `GameShell`'s vocabulary. */
export type OrderFeedback = "idle" | "correct" | "retry";

export interface OrderState {
  challenge: ChallengeOf<"order">;
  /**
   * The line, in order. Always a prefix of `answerOrder`, because that is the
   * only thing `place` will ever add to it. Never shrinks.
   */
  placed: readonly string[];
  /** The tile the child has picked up and not yet put down. */
  selectedId: string | null;
  /** A tile shown refused: offered, not accepted, on its way back to the tray. */
  attemptId: string | null;
  feedback: OrderFeedback;
  /** Every tile placed. `checkAnswer` says so, not a count kept here. */
  completed: boolean;
}

/**
 * What the child did.
 *
 * `select` is a tile picked up; picking up the one already in hand puts it
 * down in the line, which is the tap-tap gesture. `place` is the same tile
 * arriving in the line in one move, which is the drag and the tap on the
 * insertion slot. Both end in the same place, so a board played with a finger,
 * a mouse and a keyboard is one state machine and not three.
 *
 * `place` carries the whole arrangement rather than one id because that is
 * what the child has built and what `Answer` is shaped to say. The reducer
 * checks it extends the line by exactly one, which is also what makes a stale
 * arrangement from a double tap fall on the floor.
 *
 * `retry` is the only way out of feedback, and it is called that in both
 * directions: KIDDO never says "wrong", it hands the board back.
 */
export type OrderAction =
  | { type: "select"; itemId: string }
  | { type: "place"; itemIds: readonly string[] }
  | { type: "retry" }
  | { type: "reset"; challenge?: ChallengeOf<"order"> };

export function freshOrderState(challenge: ChallengeOf<"order">): OrderState {
  return {
    challenge,
    placed: [],
    selectedId: null,
    attemptId: null,
    feedback: "idle",
    completed: false,
  };
}

/**
 * Is the board listening?
 *
 * False while feedback is showing, which is the whole defence against rapid
 * tapping — the same one `connectReducer` and `mathQuestReducer` use, and for
 * the same reason: a four year old's finger is still coming down when the last
 * tile landed. No counting, no debouncing, no timers in here.
 */
export function isOrderAccepting(state: OrderState): boolean {
  return state.feedback === "idle" && !state.completed;
}

/** Already in the line, and therefore no longer in the tray. */
export function isOrderPlaced(state: OrderState, itemId: string): boolean {
  return state.placed.includes(itemId);
}

/** Where this tile ended up, counting from one. Null while it is in the tray. */
export function orderPositionOf(state: OrderState, itemId: string): number | null {
  const index = state.placed.indexOf(itemId);
  return index === -1 ? null : index + 1;
}

/** The tiles still waiting, in the order the board dealt them. */
export function orderTray(state: OrderState) {
  return state.challenge.payload.items.filter(
    (item) => !state.placed.includes(item.id),
  );
}

/** Tiles placed out of tiles to place. What `ProgressDots` counts in. */
export function orderProgress(state: OrderState): {
  current: number;
  total: number;
} {
  return {
    current: state.placed.length,
    total: state.challenge.payload.items.length,
  };
}

/** Is this tile on the board at all? Guards a made-up id from any caller. */
function exists(state: OrderState, itemId: string): boolean {
  return state.challenge.payload.items.some((item) => item.id === itemId);
}

/**
 * A tile has been offered to the line. Does it belong there?
 *
 * The only place in the engine that asks, and it asks the content layer. An
 * accepted tile stays and the board is asked whether that finished it; a
 * refused one is held for as long as it takes to see it and then goes home.
 */
function judge(state: OrderState, next: readonly string[]): OrderState {
  const cleared = { ...state, selectedId: null };

  if (!checkStep(state.challenge, { kind: "order", itemIds: next })) {
    return { ...cleared, attemptId: next[next.length - 1] ?? null, feedback: "retry" };
  }

  return {
    ...cleared,
    placed: next,
    attemptId: null,
    feedback: "correct",
    /* Counting the tiles would be a second opinion to disagree with the
       content layer. There is only ever one. */
    completed: checkAnswer(state.challenge, { kind: "order", itemIds: next }),
  };
}

/**
 * The arrangement the child is proposing, checked for being a legal *move*
 * rather than a right one.
 *
 * It has to be the line as it stands plus exactly one tile from the tray.
 * Anything else — a stale arrangement from a second tap, a tile already in the
 * line, an id off some other board — is not a move the board can make, so it
 * is dropped without a word rather than judged and refused.
 */
function extendsLine(state: OrderState, next: readonly string[]): boolean {
  if (next.length !== state.placed.length + 1) return false;
  if (!state.placed.every((id, index) => next[index] === id)) return false;

  const added = next[next.length - 1];
  return exists(state, added) && !isOrderPlaced(state, added);
}

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case "select": {
      if (!isOrderAccepting(state)) return state;
      if (!exists(state, action.itemId)) return state;
      if (isOrderPlaced(state, action.itemId)) return state;

      /* The tile already in hand, chosen again, is the child putting it down.
         That is the second beat of the tap-tap gesture, and it is also the
         whole of the keyboard flow: Enter to pick up, Enter to place. */
      if (state.selectedId === action.itemId) {
        return judge(state, [...state.placed, action.itemId]);
      }

      /* Any other tile is a child changing their mind before committing to
         anything, which costs nothing and is the point of having a hand. */
      return { ...state, selectedId: action.itemId };
    }

    case "place": {
      if (!isOrderAccepting(state)) return state;
      if (!extendsLine(state, action.itemIds)) return state;
      return judge(state, action.itemIds);
    }

    /* Whatever KIDDO was saying, they have said it. The refused tile goes back
       to the tray and the board is handed over exactly as it was. */
    case "retry":
      return { ...state, attemptId: null, feedback: "idle" };

    case "reset":
      return freshOrderState(action.challenge ?? state.challenge);
  }
}
