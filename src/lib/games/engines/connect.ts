import { checkAnswer, checkStep } from "@/lib/content/challenges";
import type { ChallengeOf, ConnectPair } from "@/lib/content/types";

/**
 * The rules of joining things up. No JSX, no class names, no React.
 *
 * The twin of `mathQuest.ts`, one level down: that file is the rules of a
 * *game*, this is the rules of an *interaction*, and the difference is what
 * makes it reusable. Nothing here is Math, English or animals — and nothing
 * here decides what belongs with what either. Every correctness question goes
 * to `checkStep` and `checkAnswer` in the content layer, exactly as Math
 * Quest's reducer sends every one of its to `checkAnswer`.
 *
 * `ConnectStage` renders this and holds none of it. A different renderer — a
 * board of pipes, a row of wires, a test with no DOM at all — plays by the
 * same rules without a line of them changing.
 *
 * ## No score, no lives, no clock
 *
 * There is nothing in this state to lose. A wrong line is not counted, does
 * not narrow the board, does not end anything: it is drawn, it retracts, and
 * the child has another go. `feedback` is the whole record of it and it lasts
 * until the next `retry`.
 */

/** The three things a KIDDO round can be feeling. `GameShell`'s vocabulary. */
export type ConnectFeedback = "idle" | "correct" | "retry";

export interface ConnectState {
  challenge: ChallengeOf<"connect">;
  /** The left node waiting for a partner, if the child has chosen one. */
  selectedLeft: string | null;
  /** The right node waiting for a partner. A board can be worked either way. */
  selectedRight: string | null;
  /** The lines that are right and are staying. Never removed. */
  connections: readonly ConnectPair[];
  /**
   * The line being shown wrong: drawn, then retracted by `retry`. Separate
   * from `connections` because it is a thing on screen rather than an answer.
   */
  attempt: ConnectPair | null;
  feedback: ConnectFeedback;
  /** Every pair joined. `checkAnswer` says so, not a count kept here. */
  completed: boolean;
}

/**
 * What the child did.
 *
 * `selectLeft` / `selectRight` are one node chosen; choosing the second one
 * draws the line, which is the tap-tap gesture. `connect` is the same line
 * arriving in one move, which is the drag. Both end in the same place, so a
 * board played with a finger, a mouse and a keyboard is one state machine and
 * not three.
 *
 * `retry` is the only way out of feedback, and it is called that in both
 * directions: KIDDO never says "wrong", it hands the board back.
 */
export type ConnectAction =
  | { type: "selectLeft"; nodeId: string }
  | { type: "selectRight"; nodeId: string }
  | { type: "connect"; link: ConnectPair }
  | { type: "retry" }
  | { type: "reset"; challenge?: ChallengeOf<"connect"> };

export function freshConnectState(
  challenge: ChallengeOf<"connect">,
): ConnectState {
  return {
    challenge,
    selectedLeft: null,
    selectedRight: null,
    connections: [],
    attempt: null,
    feedback: "idle",
    completed: false,
  };
}

/**
 * Is the board listening?
 *
 * False while feedback is showing, which is the whole defence against rapid
 * tapping — the same one `mathQuestReducer` uses, and for the same reason: a
 * four year old's finger is still coming down when the last line landed. No
 * counting, no debouncing, no timers in here.
 */
export function isConnectAccepting(state: ConnectState): boolean {
  return state.feedback === "idle" && !state.completed;
}

/** Already joined, and therefore no longer in play. */
export function isConnectMatched(
  state: ConnectState,
  side: "left" | "right",
  nodeId: string,
): boolean {
  return state.connections.some((link) =>
    side === "left" ? link.leftId === nodeId : link.rightId === nodeId,
  );
}

/** The node this one was joined to, or none. What a label says out loud. */
export function connectedPartner(
  state: ConnectState,
  side: "left" | "right",
  nodeId: string,
): string | null {
  const link = state.connections.find((entry) =>
    side === "left" ? entry.leftId === nodeId : entry.rightId === nodeId,
  );
  if (!link) return null;
  return side === "left" ? link.rightId : link.leftId;
}

/** Lines drawn out of lines to draw. What `ProgressDots` counts in. */
export function connectProgress(state: ConnectState): {
  current: number;
  total: number;
} {
  return {
    current: state.connections.length,
    total: state.challenge.payload.pairs.length,
  };
}

/** Is this node on the board at all? Guards a made-up id from any caller. */
function exists(
  state: ConnectState,
  side: "left" | "right",
  nodeId: string,
): boolean {
  const nodes =
    side === "left" ? state.challenge.payload.left : state.challenge.payload.right;
  return nodes.some((node) => node.id === nodeId);
}

/**
 * A line has been drawn. Is it one of the right ones?
 *
 * The only place in the engine that asks, and it asks the content layer. Right
 * lines are kept and the board is asked whether that finished it; wrong ones
 * are held for as long as it takes to see them and then let go.
 */
function judge(state: ConnectState, link: ConnectPair): ConnectState {
  const cleared = { ...state, selectedLeft: null, selectedRight: null };

  const right = checkStep(state.challenge, { kind: "connect", links: [link] });

  if (!right) {
    return { ...cleared, attempt: link, feedback: "retry" };
  }

  const connections = [...state.connections, link];
  return {
    ...cleared,
    connections,
    attempt: null,
    feedback: "correct",
    /* Counting the lines would be a second opinion to disagree with the
       content layer. There is only ever one. */
    completed: checkAnswer(state.challenge, { kind: "connect", links: connections }),
  };
}

/** One node chosen. If the other side was already waiting, that is a line. */
function select(
  state: ConnectState,
  side: "left" | "right",
  nodeId: string,
): ConnectState {
  if (!isConnectAccepting(state)) return state;
  if (!exists(state, side, nodeId)) return state;
  if (isConnectMatched(state, side, nodeId)) return state;

  const waiting = side === "left" ? state.selectedRight : state.selectedLeft;

  if (waiting !== null) {
    return judge(
      state,
      side === "left"
        ? { leftId: nodeId, rightId: waiting }
        : { leftId: waiting, rightId: nodeId },
    );
  }

  /* The same node twice is a child changing their mind, not an error. */
  const chosen = (side === "left" ? state.selectedLeft : state.selectedRight) === nodeId
    ? null
    : nodeId;

  return side === "left"
    ? { ...state, selectedLeft: chosen }
    : { ...state, selectedRight: chosen };
}

export function connectReducer(
  state: ConnectState,
  action: ConnectAction,
): ConnectState {
  switch (action.type) {
    case "selectLeft":
      return select(state, "left", action.nodeId);

    case "selectRight":
      return select(state, "right", action.nodeId);

    case "connect": {
      if (!isConnectAccepting(state)) return state;

      const { leftId, rightId } = action.link;
      if (!exists(state, "left", leftId) || !exists(state, "right", rightId)) {
        return state;
      }
      /* A node already joined is out of play, from either end. This is also
         what makes drawing the same right line twice do nothing at all
         rather than cheer twice. */
      if (
        isConnectMatched(state, "left", leftId) ||
        isConnectMatched(state, "right", rightId)
      ) {
        return state;
      }

      return judge(state, action.link);
    }

    /* Whatever KIDDO was saying, they have said it. The wrong line goes and
       the board is handed back exactly as it was. */
    case "retry":
      return { ...state, attempt: null, feedback: "idle" };

    case "reset":
      return freshConnectState(action.challenge ?? state.challenge);
  }
}
