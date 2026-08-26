"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  useGameWorld,
  WorldReaction,
} from "@/components/games/world/GameWorld";
import { MagicMotion } from "@/components/kiddo/MagicMotion";
import { PawPrint } from "@/components/kiddo/world/scenery";
import { captionOf, spokenOf } from "@/lib/content/challenges";
import type { ChallengeEngineProps } from "@/lib/content/engine";
import type { ConnectNode, ConnectPair } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useLocale";
import { springSoft } from "@/lib/motion";
import { ContentItemView } from "./ContentItemView";
import { PromptDisplay } from "./PromptDisplay";

/**
 * The engine for every `connect` challenge there will ever be.
 *
 * The twin of `ChoiceStage`, and it makes the same promise: handed a
 * challenge, it cannot tell what the challenge is about. Three dots and a 3, a
 * letter and a word, an animal and where it lives — one board, one gesture,
 * and no branch in here for any of them. It draws two columns, lets the child
 * join one node to another, and reports the join. It never decides whether the
 * join was right; `checkStep` does, in the content layer, once.
 *
 * ## What is in the DOM and what is in the SVG
 *
 * Every node is a real `<button>`. The SVG is `aria-hidden`, takes no pointer
 * events, and draws lines and nothing else. That split is not a style
 * preference — it is what makes the board keyboard-operable, screen-readable,
 * responsive and hit-testable. A canvas would have had to reinvent all four,
 * badly, and would still not have a focus ring.
 *
 * Line ends are *measured* from the DOM rather than laid out, so nothing here
 * has a width or a height in it. The columns are told to be columns and the
 * lines follow whatever the browser decided that meant at 360px or at 1440.
 *
 * ## What it holds
 *
 * Where the nodes are, and which one a finger is currently dragging from.
 * Both are facts about the screen, and both are gone the moment the pointer is
 * up. Everything that is a fact about the *game* — what is selected, what is
 * joined, what KIDDO is saying — lives in `lib/games/engines/connect.ts` and
 * arrives here as props.
 *
 * ## `travel`: the left-hand thing goes to the right-hand thing
 *
 * A board that asks for it sends the picture on the left *to* its partner
 * when a join is right — the dog walks to the house — using `walk` from the
 * Magic Motion vocabulary. The engine still has no idea what a dog or a house
 * is: it moves whatever is drawn in the left node *into* the node it was
 * joined to, stopping where that node's own content begins, beside whatever
 * is drawn there — a distance read off the same measurement that already
 * places the lines. Inside the home's padding it is past the port and the
 * check mark, so nothing that says "right" is ever covered, and beside the
 * home's picture rather than on it: at 360px two stage pictures still leave
 * room to spare. The home does not move, a wrong join moves nothing, and
 * once the animal has arrived it stays; under reduced motion it is simply
 * there, in the home. The line, the check, the colours and the accessible
 * names say the join was right exactly as they did before — the walk is the
 * relationship shown, never the verdict. The left node stacks above its
 * neighbours while it can travel, so the picture is never painted over by
 * the card it walks into.
 */

type Side = "left" | "right";

interface Point {
  x: number;
  y: number;
}

/** A pointer part-way through drawing a line. Screen state, not game state. */
interface Drag {
  pointerId: number;
  side: Side;
  nodeId: string;
  /** Where the finger is now, in board coordinates. */
  at: Point | null;
}

export interface ConnectStageProps extends ChallengeEngineProps<"connect"> {
  /** The lines that are right and are staying. */
  connections: readonly ConnectPair[];
  /** The node waiting for a partner on each side, if any. */
  selectedLeftId?: string | null;
  selectedRightId?: string | null;
  /** A line being shown wrong. Drawn, then let go when it leaves. */
  attempt?: ConnectPair | null;
  /**
   * One node was chosen. Not an answer — a child who taps a dog and then taps
   * it again has answered nothing — so it is reported apart from `onAnswer`,
   * and what a selection *means* stays in the reducer.
   */
  onSelectLeft: (nodeId: string) => void;
  onSelectRight: (nodeId: string) => void;
  /**
   * When a join is right, the left node's picture walks to the edge of its
   * partner. Off unless asked for: most boards are read, and only the one
   * about *where something goes* is taught by watching it go. See the block
   * above.
   */
  travel?: boolean;
}

/** Where a line meets a node: the middle of the port, in board coordinates. */
const portKey = (side: Side, nodeId: string) => `${side}:${nodeId}`;

/** A node's, or its picture's, horizontal extent in board coordinates. */
interface Span {
  left: number;
  right: number;
  /** Where a node's content begins: its left edge plus its padding. */
  inner: number;
}

/**
 * How a join is drawn in each world. Only the paint: the line's ends are
 * measured the same way, the attempt line is the same apricot, and a drag
 * is the same dashed tide whatever the world.
 */
const JOIN_STROKES = {
  line: {
    stroke: "var(--color-sprout-deep)",
    width: 5,
    dash: undefined,
    curved: false,
  },
  /* A dotted path across the land. */
  path: {
    stroke: "var(--color-honey-deep)",
    width: 6,
    dash: "0.1 11",
    curved: false,
  },
  /* A ribbon across the spine of a book: a soft pastel, thinner than the
     words it sits between, and `curved` — it leaves one page sideways,
     bends through the spine and arrives at the other page sideways, so it
     never cuts across a word on its way. */
  ribbon: {
    stroke: "var(--color-blossom-base)",
    width: 5,
    dash: undefined,
    curved: true,
  },
} as const;

/**
 * The shape of a join from one port to the other.
 *
 * Straight for a line or a path. Curved for a ribbon: a cubic whose two
 * handles lie level with their own ends and halfway across the gutter, so
 * the ribbon sets off horizontally, does all its turning in the space
 * between the columns, and lands horizontally. When the two ports are level
 * the curve collapses to the same straight line it always was. Every number
 * here comes from the measured ports; nothing is assumed about the board.
 */
function joinPath(from: Point, to: Point, curved: boolean): string {
  if (!curved) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const reach = (to.x - from.x) / 2;
  return `M ${from.x} ${from.y} C ${from.x + reach} ${from.y}, ${to.x - reach} ${to.y}, ${to.x} ${to.y}`;
}

/**
 * How a node looks in each world, by state. The card is what every board
 * drew before there were worlds; the other two drop the card so the thing
 * inside stands in its own place — but never the border that says "chosen"
 * or "joined", and never the height.
 */
const NODE_LOOKS = {
  card: {
    idle: "bg-paper border-edge shadow-[0_4px_0_0_var(--color-edge)]",
    invited: "bg-paper border-tide-base/60 shadow-[0_4px_0_0_var(--color-edge)]",
    selected:
      "bg-paper border-tide-base shadow-[0_4px_0_0_var(--color-tide-deep)]",
    nudged:
      "bg-retry-soft border-apricot-base shadow-[0_4px_0_0_var(--color-apricot-deep)]",
    matched:
      "bg-yes-soft border-sprout-base shadow-[0_4px_0_0_var(--color-sprout-deep)]",
    caption: "text-base sm:text-lg",
  },
  creature: {
    idle: "bg-paper/60 border-paper/80",
    invited: "bg-paper/80 border-tide-base/50",
    selected:
      "bg-paper border-tide-base shadow-[0_4px_0_0_var(--color-tide-deep)]",
    nudged:
      "bg-retry-soft border-apricot-base shadow-[0_4px_0_0_var(--color-apricot-deep)]",
    matched: "bg-yes-soft/90 border-sprout-base",
    caption: "text-base sm:text-lg",
  },
  page: {
    idle: "bg-transparent border-transparent",
    invited: "bg-tide-soft/30 border-tide-base/50",
    selected: "bg-tide-soft/70 border-tide-base",
    nudged: "bg-retry-soft border-apricot-base",
    matched: "bg-yes-soft border-sprout-base",
    caption: "text-lg sm:text-xl tracking-wide",
  },
} as const;

/** The picture inside a left node, for `travel`. */
const artKey = (nodeId: string) => `art:${nodeId}`;

/**
 * Whether this visit has joined boards before. A child who has never touched
 * a connect board sees the whole choose-from column wearing the `invited`
 * look — the same quiet "these are ready" the destinations wear once a side
 * is chosen — so an untouched board answers "what do I do here?" before the
 * first touch, not after. The first selection anywhere puts it away for the
 * rest of the visit: a child who has connected once does not need the hint
 * again on every question. Module state on purpose — it is a fact about the
 * visit, not about one board, and it starts `false` on the server and on
 * every fresh load alike, so the first paint always agrees with the HTML.
 */
let hasConnectedBefore = false;

/**
 * The whole state of a node, in words.
 *
 * Nothing here rests on colour: a joined node says what it is joined to, a
 * waiting one says it is waiting, and a screen reader gets the same board a
 * sighted child does. `spokenOf` is what names the thing, so a swatch, a
 * numeral and a group of dots all arrive already saying what they are.
 */
function srLabelOf(
  node: ConnectNode,
  partner: ConnectNode | null,
  selected: boolean,
  t: Translate,
): string {
  const name = spokenOf(node.item);
  if (partner)
    return t("stage.connect.joined", { name, partner: spokenOf(partner.item) });
  if (selected) return t("stage.connect.selected", { name });
  return t("stage.connect.idle", { name });
}

export function ConnectStage({
  challenge,
  onAnswer,
  accepting = true,
  connections,
  selectedLeftId = null,
  selectedRightId = null,
  attempt = null,
  onSelectLeft,
  onSelectRight,
  travel = false,
}: ConnectStageProps) {
  const t = useT();
  const { left, right } = challenge.payload;
  const reduced = useReducedMotion();

  /* The world this board is played in: whether a node is a card, a creature
     standing in the open or a word on a page, whether a join is a line, a
     path or a ribbon, and where the parts stand. It decides nothing about
     what a node is, says, or does when pressed. See `docs/kiddo-game-worlds.md`. */
  const world = useGameWorld();
  const { nodes: nodeLook, join: joinLook, trace: traceLook } = world.spec;
  const stroke = JOIN_STROKES[joinLook];

  const boardRef = useRef<HTMLDivElement>(null);

  /** Where every port is, in board coordinates. Measured, never assumed. */
  const [ports, setPorts] = useState<Record<string, Point>>({});
  /**
   * How wide every node is, and every left-hand picture, so a `travel` knows
   * how far the picture has to go. Read in the same pass as the ports, from
   * the wrapper that stays put rather than the thing that moves.
   */
  const [spans, setSpans] = useState<Record<string, Span>>({});
  /**
   * The line being dragged. State rather than a ref because it is drawn, and
   * it is the only thing on this board that a pointer alone can change.
   */
  const [drag, setDrag] = useState<Drag | null>(null);

  /* Measured after layout, and again whenever the board changes size — a
     rotation, a keyboard opening, a desktop window dragged narrower. The
     board is the coordinate space, so a page scroll moves nothing. */
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const measure = () => {
      const origin = board.getBoundingClientRect();
      /* A world may `zoom` the board (Word World does, on a tall screen).
         `getBoundingClientRect` answers in screen pixels, but the lines are
         drawn in the board's own pixels, so every measurement is brought
         back by the zoom — read from the board, not assumed. 1 elsewhere. */
      const zoom = board.offsetWidth ? origin.width / board.offsetWidth : 1;
      const next: Record<string, Point> = {};
      for (const port of board.querySelectorAll<HTMLElement>("[data-port]")) {
        const box = port.getBoundingClientRect();
        next[port.dataset.port ?? ""] = {
          x: (box.left + box.width / 2 - origin.left) / zoom,
          y: (box.top + box.height / 2 - origin.top) / zoom,
        };
      }
      setPorts(next);

      const extents: Record<string, Span> = {};
      for (const node of board.querySelectorAll<HTMLElement>(
        "[data-connect-node]",
      )) {
        const box = node.getBoundingClientRect();
        const id = node.dataset.nodeId ?? "";
        const padding = parseFloat(getComputedStyle(node).paddingLeft) || 0;
        extents[portKey((node.dataset.side as Side) ?? "left", id)] = {
          left: (box.left - origin.left) / zoom,
          right: (box.right - origin.left) / zoom,
          inner: (box.left - origin.left) / zoom + padding,
        };
        const art = node.querySelector("[data-magic]");
        if (art) {
          const artBox = art.getBoundingClientRect();
          extents[artKey(id)] = {
            left: (artBox.left - origin.left) / zoom,
            right: (artBox.right - origin.left) / zoom,
            inner: (artBox.left - origin.left) / zoom,
          };
        }
      }
      setSpans(extents);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(board);
    for (const node of board.querySelectorAll("[data-connect-node]")) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [challenge.id, left, right]);

  const pointOf = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const board = boardRef.current;
      if (!board) return null;
      const origin = board.getBoundingClientRect();
      const zoom = board.offsetWidth ? origin.width / board.offsetWidth : 1;
      return {
        x: (clientX - origin.left) / zoom,
        y: (clientY - origin.top) / zoom,
      };
    },
    [],
  );

  const isMatched = useCallback(
    (side: Side, nodeId: string) =>
      connections.some((link) =>
        side === "left" ? link.leftId === nodeId : link.rightId === nodeId,
      ),
    [connections],
  );

  /* An untouched board, seen by a child who has never joined anything this
     visit: the choose-from column wears the invited look until the first
     selection lands. See `hasConnectedBefore`. */
  const untouched =
    connections.length === 0 &&
    selectedLeftId === null &&
    selectedRightId === null &&
    attempt === null;
  const welcoming = untouched && accepting && !hasConnectedBefore;

  /**
   * One node was chosen, however it was chosen.
   *
   * The single funnel every input method arrives at. A tap and the end of a
   * drag are the same event by the time they get here, which is why there is
   * no drag mode and no tap mode — there is a board, and it is being used.
   */
  const choose = useCallback(
    (side: Side, nodeId: string) => {
      if (!accepting || isMatched(side, nodeId)) return;
      hasConnectedBefore = true;

      const waiting = side === "left" ? selectedRightId : selectedLeftId;

      if (waiting !== null) {
        onAnswer({
          challengeId: challenge.id,
          answer: {
            kind: "connect",
            links: [
              side === "left"
                ? { leftId: nodeId, rightId: waiting }
                : { leftId: waiting, rightId: nodeId },
            ],
          },
        });
        return;
      }

      if (side === "left") onSelectLeft(nodeId);
      else onSelectRight(nodeId);
    },
    [
      accepting,
      challenge.id,
      isMatched,
      onAnswer,
      onSelectLeft,
      onSelectRight,
      selectedLeftId,
      selectedRightId,
    ],
  );

  /** A whole line in one move: press one node, let go over another. */
  const join = useCallback(
    (from: Drag, toId: string) => {
      hasConnectedBefore = true;
      const link =
        from.side === "left"
          ? { leftId: from.nodeId, rightId: toId }
          : { leftId: toId, rightId: from.nodeId };
      onAnswer({
        challengeId: challenge.id,
        answer: { kind: "connect", links: [link] },
      });
    },
    [challenge.id, onAnswer],
  );

  const handlePointerDown =
    (side: Side, nodeId: string) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!accepting || isMatched(side, nodeId)) return;
      /* Capture, so a finger that leaves the node keeps sending us moves and we
       are told when it goes up wherever that happens to be. */
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({
        pointerId: event.pointerId,
        side,
        nodeId,
        at: pointOf(event.clientX, event.clientY),
      });
    };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag?.pointerId !== event.pointerId) return;
    setDrag({ ...drag, at: pointOf(event.clientX, event.clientY) });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const from = drag;
    if (from?.pointerId !== event.pointerId) return;
    setDrag(null);

    /* What is actually under the finger, which is not necessarily what the
       event was captured to. A tap and a drag differ only in the answer. */
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-connect-node]");

    const side = target?.dataset.side as Side | undefined;
    const nodeId = target?.dataset.nodeId;
    if (!side || !nodeId) return;

    if (side !== from.side) {
      if (!isMatched(side, nodeId)) join(from, nodeId);
      return;
    }

    /* Up on the node it started on: a tap, whatever the finger did between. */
    if (nodeId === from.nodeId) choose(side, nodeId);
  };

  const handlePointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (drag?.pointerId !== event.pointerId) return;
    setDrag(null);
  };

  const nodeOf = (side: Side, id: string) =>
    (side === "left" ? left : right).find((node) => node.id === id) ?? null;

  /**
   * How far a left-hand picture walks to reach its partner: from where it
   * stands to where the partner's content begins, so it arrives *in* the
   * home, past the port and the check, beside what is drawn there. Zero
   * until the board has been measured, which happens before a child could
   * have joined anything.
   */
  const travelOf = (leftId: string, rightId: string): number => {
    const art = spans[artKey(leftId)];
    const home = spans[portKey("right", rightId)];
    if (!art || !home) return 0;
    const gap = home.inner - art.left;
    return gap > 0 ? gap : 0;
  };

  /**
   * And how far it climbs or drops on the way: the vertical gap between its
   * own node's port and its partner's, read off the same measurement that
   * places the lines. Without this a walker could only travel level — into
   * whichever node happened to share its row, which is not necessarily the
   * one the join was made to. The ports sit at the vertical middle of their
   * nodes, so arriving level with the partner's port is arriving level with
   * the partner.
   */
  const riseOf = (leftId: string, rightId: string): number => {
    const from = ports[portKey("left", leftId)];
    const home = ports[portKey("right", rightId)];
    if (!from || !home) return 0;
    return home.y - from.y;
  };

  const column = (side: Side, nodes: readonly ConnectNode[]) => (
    <ul
      role="list"
      className="flex list-none flex-col gap-3 [@media(max-height:44rem)]:gap-2"
    >
      {nodes.map((node, index) => {
        const partnerId =
          connections.find((link) =>
            side === "left"
              ? link.leftId === node.id
              : link.rightId === node.id,
          )?.[side === "left" ? "rightId" : "leftId"] ?? null;
        const partner = partnerId
          ? nodeOf(side === "left" ? "right" : "left", partnerId)
          : null;
        const selected =
          (side === "left" ? selectedLeftId : selectedRightId) === node.id;
        const nudged =
          attempt !== null &&
          (side === "left" ? attempt.leftId : attempt.rightId) === node.id;
        const matched = partner !== null;
        /* The walk goes to the joined home's *row*, which can be below —
           under a sibling card that stacks just as high — so each join made
           stands a step above the joins before it, and the picture out
           walking (always the newest join) crosses nothing that could paint
           over it. */
        const joined =
          travel && side === "left"
            ? connections.findIndex((link) => link.leftId === node.id)
            : -1;
        /* The affordance a fresh board was missing: the moment something is
           chosen on the other side, every open node here wakes up — border
           and port turning toward the blue the chosen one already has. The
           board answers "now what?" by pointing at every legal destination,
           without a word of instruction and without anything moving. And
           before anything has been chosen at all, on a child's very first
           board of the visit, the choose-from column wears the same look —
           the untouched board points at where to begin the same way a
           half-made join points at where to finish. */
        const opposite = side === "left" ? selectedRightId : selectedLeftId;
        const invited =
          !matched &&
          !selected &&
          accepting &&
          (opposite !== null || (welcoming && side === "left"));

        return (
          <li key={node.id} className="min-w-0">
            <motion.button
              type="button"
              data-connect-node=""
              data-side={side}
              data-node-id={node.id}
              data-state={
                matched
                  ? "matched"
                  : selected
                    ? "selected"
                    : invited
                      ? "invited"
                      : "idle"
              }
              aria-pressed={matched ? undefined : selected}
              aria-disabled={matched || !accepting}
              aria-label={srLabelOf(node, partner, selected, t)}
              style={joined >= 0 ? { zIndex: 20 + joined } : undefined}
              onPointerDown={handlePointerDown(side, node.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              /* Keyboard only. A pointer's click always follows its own
                 `pointerup`, which has already been dealt with above;
                 `detail === 0` is what a click from Enter or Space looks
                 like, and is the only one that gets this far. */
              onClick={(event) => {
                if (event.detail !== 0) return;
                choose(side, node.id);
              }}
              /* With reduced motion the lift is zeroed, not removed: a
                 gesture prop's *presence* reaches the server HTML (the press
                 gesture stamps `tabindex="0"` there), and `useReducedMotion`
                 is `false` on the server, so a prop that vanishes on the
                 client is a hydration mismatch. A distance of nothing is the
                 same stillness, and the border and label already carry the
                 state. */
              whileHover={
                matched || !accepting ? undefined : { y: reduced ? 0 : -3 }
              }
              whileTap={
                matched || !accepting ? undefined : { y: reduced ? 0 : 2 }
              }
              transition={springSoft}
              className={cn(
                /* `touch-none`: a finger drawing a line across the board must
                   not also be a finger scrolling the page. Only the nodes
                   claim it, so the space around them still scrolls. */
                "relative flex w-full touch-none items-center gap-2 rounded-card border-2 px-3 py-2",
                /* 56px, the top of the comfortable band, and 48px — the floor
                   — only on a screen short enough that a four-line board
                   would otherwise need scrolling to reach the bottom node.
                   Never smaller than that, whatever the screen. */
                "min-h-14 sm:min-h-16 [@media(max-height:44rem)]:min-h-12 [@media(max-height:44rem)]:py-1",
                side === "left" ? "justify-start pr-6" : "justify-end pl-6",
                /* A travelling picture crosses into a node drawn after it:
                   its own node stacks above the rest so it is never painted
                   over on the way, or on arrival. */
                travel && side === "left" && "z-10",
                NODE_LOOKS[nodeLook][
                  matched
                    ? "matched"
                    : nudged
                      ? "nudged"
                      : selected
                        ? "selected"
                        : invited
                          ? "invited"
                          : "idle"
                ],
                matched || !accepting ? "cursor-default" : "cursor-pointer",
              )}
            >
              {/* The world's reaction to a join that held — the left node's
                  and the right node's are different moments — around the
                  whole of what is drawn. In the meadow this is the bare span.
                  A `travel` board's walk stays the first `[data-magic]` in
                  the node, which is what the measurement above looks for, so
                  a world that travels must not react at `joined`. */}
              <WorldReaction
                moment={side === "left" ? "joined" : "partner"}
                play={matched}
                className="flex min-h-0 min-w-0 flex-1 [&>[data-magic-subject]]:min-w-0 [&>[data-magic-subject]]:flex-1"
              >
                <span
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 items-center gap-2",
                    side === "left" ? "justify-start" : "justify-end",
                  )}
                >
                  {travel && side === "left" ? (
                    /* The walk, and the mark it leaves. The mark sits in a
                       wrapper that does not move — the picture inside the
                       walk is carried by a transform, so the wrapper keeps
                       the box the measurement pass reads — and it is drawn
                       *behind*, so nothing about the journey changes.

                       Why there is anything here at all: once four animals
                       have walked home, four empty capsules are left sitting
                       on the land. A print where each one stood turns them
                       from four things that went missing into four journeys
                       that were made. It is never a join: it is a still,
                       faint mark inside a node rather than anything in the
                       space between the columns. */
                    <span className="relative inline-flex">
                      {matched && traceLook === "paw" ? (
                        <PawPrint
                          accent="sage"
                          className="pointer-events-none absolute bottom-0 left-1/2 h-[38%] w-auto -translate-x-1/2 opacity-40"
                        />
                      ) : null}
                      {/* Plays once, when the join lands, and then stays: a
                          `playKey` of 1 is "has arrived" for the rest of the
                          board. */}
                      <MagicMotion
                        motion="walk"
                        playKey={matched ? 1 : 0}
                        distance={partnerId ? travelOf(node.id, partnerId) : 0}
                        rise={partnerId ? riseOf(node.id, partnerId) : 0}
                      >
                        <WorldReaction moment="arrive" play delay={index * 0.08}>
                          <ContentItemView item={node.item} scale="stage" />
                        </WorldReaction>
                      </MagicMotion>
                    </span>
                  ) : (
                    <WorldReaction moment="arrive" play delay={index * 0.08}>
                      <ContentItemView item={node.item} scale="stage" />
                    </WorldReaction>
                  )}
                  {captionOf(node.item) ? (
                    <span
                      className={cn(
                        "font-display text-ink-700 truncate font-semibold",
                        NODE_LOOKS[nodeLook].caption,
                      )}
                    >
                      {captionOf(node.item)}
                    </span>
                  ) : null}
                </span>
              </WorldReaction>

              {matched ? (
                <span
                  aria-hidden
                  className="bg-sprout-deep absolute -top-2 flex size-7 items-center justify-center rounded-full text-white"
                  style={
                    side === "left" ? { right: "-0.5rem" } : { left: "-0.5rem" }
                  }
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : null}

              {/* Where the line lands. Half outside the node, so a line
                  appears to plug into it rather than to stop short. */}
              <span
                aria-hidden
                data-port={portKey(side, node.id)}
                className={cn(
                  "absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 transition-colors",
                  side === "left"
                    ? "right-0 translate-x-1/2"
                    : "left-0 -translate-x-1/2",
                  matched
                    ? "bg-sprout-deep border-sprout-deep"
                    : selected
                      ? "bg-tide-deep border-tide-deep"
                      : invited
                        ? "bg-tide-soft border-tide-base"
                        : "bg-paper border-edge",
                )}
              />
            </motion.button>
          </li>
        );
      })}
    </ul>
  );

  const dragFrom = drag ? ports[portKey(drag.side, drag.nodeId)] : undefined;

  const prompt = challenge.prompt.display ? (
    <PromptDisplay
      parts={challenge.prompt.display}
      layout={challenge.prompt.layout}
      anchor={challenge.prompt.anchor}
      surface={world.spec.prompt}
    />
  ) : null;

  const board = (
    <div
      role="group"
      aria-label={challenge.prompt.speech}
      /* A column of its own on a phone, wider on a tablet, and capped so a
           desktop gets a board rather than a stretched phone. No fixed
           anything: every number here is a ceiling, not a size. */
      className="mx-auto w-full max-w-[min(46rem,100%)]"
    >
      <div
        ref={boardRef}
        className="relative grid grid-cols-2 gap-x-10 sm:gap-x-20"
      >
        {/* Drawn under the nodes on purpose: a line runs to the middle of a
              port and the node covers the last few pixels of it, which is
              what makes it look plugged in. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <AnimatePresence>
            {connections.map((link) => {
              const from = ports[portKey("left", link.leftId)];
              const to = ports[portKey("right", link.rightId)];
              if (!from || !to) return null;
              return (
                <motion.path
                  key={`${link.leftId}>${link.rightId}`}
                  data-connect-line=""
                  d={joinPath(from, to, stroke.curved)}
                  fill="none"
                  stroke={stroke.stroke}
                  strokeWidth={stroke.width}
                  strokeDasharray={stroke.dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  /* Reduced motion: it is simply there. No drawing, no
                       retracting, nothing travelling across the screen. */
                  initial={reduced ? false : { pathLength: 0, opacity: 0.6 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.32 }}
                />
              );
            })}

            {attempt
              ? (() => {
                  const from = ports[portKey("left", attempt.leftId)];
                  const to = ports[portKey("right", attempt.rightId)];
                  if (!from || !to) return null;
                  return (
                    <motion.line
                      key="attempt"
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="var(--color-apricot-deep)"
                      strokeWidth={5}
                      strokeLinecap="round"
                      initial={reduced ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      /* Gently let go, rather than blinked out. */
                      exit={reduced ? { opacity: 0 } : { pathLength: 0 }}
                      transition={
                        reduced ? { duration: 0 } : { duration: 0.28 }
                      }
                    />
                  );
                })()
              : null}
          </AnimatePresence>

          {/* The line following the finger. Direct manipulation, so it is
                never animated — it is where the finger is. */}
          {dragFrom && drag?.at ? (
            <line
              x1={dragFrom.x}
              y1={dragFrom.y}
              x2={drag.at.x}
              y2={drag.at.y}
              stroke="var(--color-tide-deep)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="2 10"
            />
          ) : null}
        </svg>

        {column("left", left)}
        {column("right", right)}
      </div>
    </div>
  );

  return <>{world.composeConnect({ prompt, board })}</>;
}
