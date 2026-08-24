"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useCallback, useState } from "react";

import { captionOf, spokenOf } from "@/lib/content/challenges";
import type { ConnectNode, ContentItem } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { springSoft } from "@/lib/motion";
import type { ConnectStageProps } from "./ConnectStage";
import { ContentItemView } from "./ContentItemView";
import { PromptDisplay } from "./PromptDisplay";

/**
 * A second renderer for `connect`: find the ones that belong together.
 *
 * ## Why this is not a new kind
 *
 * The `match` *kind* cannot hold this board. Its answer is `pairIds` — the
 * pairs the child *found* — and there is no id for a pairing nobody authored,
 * so a match answer cannot say "the child put the dog with the kitten". A
 * renderer built on it would have to work out that two cards belonged together
 * before it could report anything, which is the renderer marking its own
 * homework. `types.ts` says exactly this where it explains why `connect`
 * exists, and `engine.ts` sets the test: a kind has to be able to say what the
 * child did *including saying it wrongly*.
 *
 * So pairing two cards and joining two nodes are the same *answer*. They are a
 * different picture, and a picture is not a kind. Everything about whether a
 * pairing is right stays where it already was — `checkStep` and `checkAnswer`,
 * in the content layer, once — and this file cannot tell what the board is
 * about any more than `ConnectStage` can.
 *
 * ## How it differs from `ConnectStage`
 *
 * `ConnectStage` is two columns and a line drawn between them: the gesture is
 * the answer, and the line is the record of it. Nothing is drawn here at all.
 * The board is two shelves of cards, one above the other, and a pair that goes
 * together *leaves the queue* — both cards slide to the front of their shelf,
 * where they land in the same column, and lean in until they touch. The board
 * shrinks as it is solved, which is what a phone wanted anyway.
 *
 * No SVG, no measured coordinates, no `ResizeObserver`: with nothing to draw
 * between two points there is nothing to clip, and the layout is a grid the
 * browser is free to size however the screen turned out.
 *
 * ## What it holds
 *
 * Which card a finger is dragging from, and nothing else. That is a fact about
 * the screen and it is gone when the pointer is up. What is selected, what is
 * paired and what KIDDO is saying live in `lib/games/engines/connect.ts` and
 * arrive as props — the same reducer, the same hook, the same board state.
 */

/** Which shelf a card is on. The payload's two groups, named as they arrive. */
type Group = "left" | "right";

/** A pointer part-way through carrying a card. Screen state, not game state. */
interface Drag {
  pointerId: number;
  group: Group;
  nodeId: string;
}

export type MatchStageProps = ConnectStageProps;

/**
 * The whole state of a card, in words.
 *
 * Nothing here rests on colour or on position: a paired card says what it is
 * paired with, a chosen one says what to do next, and a screen reader gets the
 * same board a sighted child does. `spokenOf` names the thing, so a picture, a
 * numeral and a group of dots all arrive already saying what they are.
 */
function srLabelOf(
  node: ConnectNode,
  partner: ConnectNode | null,
  selected: boolean,
): string {
  const name = spokenOf(node.item);
  if (partner) return `${name}, matched with ${spokenOf(partner.item)}.`;
  if (selected) return `${name}, selected. Choose the item that matches it.`;
  return `${name}, not matched yet. Choose it.`;
}

/**
 * The face of a card: the thing, and its word underneath if it has one.
 *
 * `captionOf` gives a picture no caption on purpose — a board of pictures is
 * not a reading test — so the word appears only where the content meant it to.
 */
function CardFace({ item }: { item: ContentItem }) {
  const caption = captionOf(item);
  return (
    <span className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-0.5">
      <ContentItemView item={item} scale="stage" />
      {caption ? (
        <span className="font-display text-ink-700 max-w-full truncate text-xs font-semibold sm:text-sm">
          {caption}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Whether this visit has paired cards before. A child who has never touched
 * a match board sees the whole top shelf wearing the `invited` look — the
 * same quiet "these are ready" the other shelf wears once a card is chosen —
 * so an untouched board answers "what do I do here?" before the first touch,
 * not after. The first selection anywhere puts it away for the rest of the
 * visit. Module state on purpose — it is a fact about the visit, not about
 * one board, and it starts `false` on the server and on every fresh load
 * alike, so the first paint always agrees with the HTML.
 */
let hasMatchedBefore = false;

export function MatchStage({
  challenge,
  onAnswer,
  accepting = true,
  connections,
  selectedLeftId = null,
  selectedRightId = null,
  attempt = null,
  onSelectLeft,
  onSelectRight,
}: MatchStageProps) {
  const { left, right } = challenge.payload;
  const reduced = useReducedMotion();

  const [drag, setDrag] = useState<Drag | null>(null);

  const isMatched = useCallback(
    (group: Group, nodeId: string) =>
      connections.some((link) =>
        group === "left" ? link.leftId === nodeId : link.rightId === nodeId,
      ),
    [connections],
  );

  /* An untouched board, seen by a child who has never paired anything this
     visit: the top shelf wears the invited look until the first selection
     lands. See `hasMatchedBefore`. */
  const untouched =
    connections.length === 0 &&
    selectedLeftId === null &&
    selectedRightId === null &&
    attempt === null;
  const welcoming = untouched && accepting && !hasMatchedBefore;

  /**
   * One card was chosen, however it was chosen.
   *
   * The single funnel every input arrives at. A tap, a keypress and the end of
   * a drag are the same event by the time they get here, which is why there is
   * no drag mode and no tap mode — there is a board, and it is being used.
   */
  const choose = useCallback(
    (group: Group, nodeId: string) => {
      if (!accepting || isMatched(group, nodeId)) return;
      hasMatchedBefore = true;

      const waiting = group === "left" ? selectedRightId : selectedLeftId;

      if (waiting !== null) {
        onAnswer({
          challengeId: challenge.id,
          answer: {
            kind: "connect",
            links: [
              group === "left"
                ? { leftId: nodeId, rightId: waiting }
                : { leftId: waiting, rightId: nodeId },
            ],
          },
        });
        return;
      }

      if (group === "left") onSelectLeft(nodeId);
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

  /** A whole pair in one move: press one card, let go over another. */
  const pair = useCallback(
    (from: Drag, toId: string) => {
      hasMatchedBefore = true;
      const link =
        from.group === "left"
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
    (group: Group, nodeId: string) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!accepting || isMatched(group, nodeId)) return;
      /* Capture, so a finger that leaves the card keeps sending us moves and
         we are told when it goes up wherever that happens to be. */
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ pointerId: event.pointerId, group, nodeId });
    };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const from = drag;
    if (from?.pointerId !== event.pointerId) return;
    setDrag(null);

    /* What is actually under the finger, which is not necessarily what the
       event was captured to. A tap and a drag differ only in the answer. */
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-match-card]");

    const group = target?.dataset.group as Group | undefined;
    const nodeId = target?.dataset.nodeId;
    if (!group || !nodeId) return;

    if (group !== from.group) {
      if (!isMatched(group, nodeId)) pair(from, nodeId);
      return;
    }

    /* Up on the card it started on: a tap, whatever the finger did between. */
    if (nodeId === from.nodeId) choose(group, nodeId);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag?.pointerId !== event.pointerId) return;
    setDrag(null);
  };

  const nodeOf = (group: Group, id: string) =>
    (group === "left" ? left : right).find((node) => node.id === id) ?? null;

  const partnerOf = (group: Group, nodeId: string): ConnectNode | null => {
    const link = connections.find((pairing) =>
      group === "left" ? pairing.leftId === nodeId : pairing.rightId === nodeId,
    );
    if (!link) return null;
    return group === "left"
      ? nodeOf("right", link.rightId)
      : nodeOf("left", link.leftId);
  };

  /**
   * The cards in the order they are shown: found pairs first, in the order
   * they were found, then whatever is still in play.
   *
   * Both shelves are ordered by the same list of connections, so a pair that
   * has been found lands at the same index on both — which is what puts the
   * two cards in one column with nothing positioning them. Reordering happens
   * inside one list with the keys unchanged, so the button a child just
   * pressed is the same DOM node afterwards and keeps its focus.
   */
  const ordered = (group: Group, nodes: readonly ConnectNode[]) => {
    const found = connections
      .map((link) =>
        nodes.find(
          (node) => node.id === (group === "left" ? link.leftId : link.rightId),
        ),
      )
      .filter((node): node is ConnectNode => node !== undefined);
    const rest = nodes.filter((node) => !found.includes(node));
    return [...found, ...rest];
  };

  /* One column per card, so the widest shelf sets the grid and both shelves
     agree. No width anywhere: the columns are equal fractions of whatever the
     screen turned out to be. */
  const columns = Math.max(left.length, right.length, 1);
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  const shelf = (group: Group, nodes: readonly ConnectNode[], label: string) => (
    <ul
      role="list"
      aria-label={label}
      className="grid list-none gap-1.5 sm:gap-2.5"
      style={gridStyle}
    >
      {ordered(group, nodes).map((node) => {
        const partner = partnerOf(group, node.id);
        const matched = partner !== null;
        const selected =
          (group === "left" ? selectedLeftId : selectedRightId) === node.id;
        const refused =
          attempt !== null &&
          (group === "left" ? attempt.leftId : attempt.rightId) === node.id;
        /* The *other* shelf is invited while a card waits — the whole of it,
           never the one card that would answer the question. And before
           anything has been chosen at all, on a child's very first board of
           the visit, the top shelf wears the same look: the untouched board
           points at where to begin the same way a waiting card points at
           where to finish. */
        const invited =
          !matched &&
          ((group === "left" ? selectedRightId : selectedLeftId) !== null ||
            (welcoming && group === "left"));

        return (
          <li key={node.id} className="flex min-w-0">
            <motion.button
              type="button"
              data-match-card=""
              data-group={group}
              data-node-id={node.id}
              data-state={matched ? "matched" : selected ? "selected" : "idle"}
              aria-pressed={matched ? undefined : selected}
              aria-disabled={matched || !accepting}
              aria-label={srLabelOf(node, partner, selected)}
              onPointerDown={handlePointerDown(group, node.id)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              /* Keyboard only. A pointer's click always follows its own
                 `pointerup`, which has already been dealt with above;
                 `detail === 0` is what a click from Enter or Space looks
                 like, and is the only one that gets this far. */
              onClick={(event) => {
                if (event.detail !== 0) return;
                choose(group, node.id);
              }}
              /* Sliding to the front of the shelf, gated: with reduced motion
                 the card is simply already there.
                 Where a card *rests* is `top` in the class list below rather
                 than an animated `y`, because a transform animation and a
                 layout animation fight over the same matrix: measured in a
                 browser, a card carried a 24px offset that never came back
                 when the speech bubble above the board changed height. */
              layout={reduced ? false : "position"}
              /* With reduced motion the hop is zeroed, not removed: a
                 gesture prop's *presence* reaches the server HTML (the press
                 gesture stamps `tabindex="0"` there), and `useReducedMotion`
                 is `false` on the server, so a prop that vanishes on the
                 client is a hydration mismatch. A hop of nothing is the same
                 stillness, and the colour, the ring and `aria-pressed`
                 already say everything the hop was saying. */
              whileHover={
                matched || !accepting
                  ? undefined
                  : { y: reduced ? 0 : selected ? -8 : -3 }
              }
              whileTap={
                matched || !accepting
                  ? undefined
                  : { y: reduced ? 0 : selected ? -2 : 2 }
              }
              transition={reduced ? { duration: 0 } : springSoft}
              className={cn(
                /* `touch-none`: a finger carrying a card across the board must
                   not also be a finger scrolling the page. Only the cards
                   claim it, so the space around them still scrolls. */
                "relative flex w-full min-w-0 touch-none flex-col items-center justify-center",
                "rounded-card border-2 px-1 py-1.5",
                /* 56px, the top of the comfortable band, and 48px — the floor
                   — only on a screen short enough that two shelves and a
                   prompt would otherwise need scrolling. Never smaller. */
                "min-h-14 sm:min-h-20 [@media(max-height:44rem)]:min-h-12",
                /* Where the card rests. A chosen one is picked up off the
                   shelf; a found pair leans in towards its partner in the
                   shelf below until the two of them nearly touch. The lift is
                   a response to a tap and goes when reduced motion is asked
                   for; the lean is what "found" *looks like*, so it stays —
                   it simply arrives with no animation. */
                matched
                  ? group === "left"
                    ? "top-1"
                    : "-top-1"
                  : selected && !reduced
                    ? "-top-1"
                    : "top-0",
                /* The seam: a found pair has no corners between its halves,
                   so the two cards read as one thing. */
                matched && group === "left" && "rounded-b-sm",
                matched && group === "right" && "rounded-t-sm",
                matched
                  ? group === "left"
                    ? "bg-yes-soft border-sprout-base shadow-none"
                    : "bg-yes-soft border-sprout-base shadow-[0_4px_0_0_var(--color-sprout-deep)]"
                  : refused
                    ? "bg-retry-soft border-apricot-base shadow-[0_4px_0_0_var(--color-apricot-deep)]"
                    : selected
                      ? "bg-paper border-tide-base shadow-[0_4px_0_0_var(--color-tide-deep)]"
                      : invited
                        ? "bg-paper border-tide-base border-dashed shadow-[0_4px_0_0_var(--color-edge)]"
                        : "bg-paper border-edge shadow-[0_4px_0_0_var(--color-edge)]",
                matched || !accepting ? "cursor-default" : "cursor-pointer",
              )}
            >
              <CardFace item={node.item} />

              {matched && group === "left" ? (
                <span
                  aria-hidden
                  className="bg-sprout-deep absolute -right-1.5 -bottom-3 z-10 flex size-6 items-center justify-center rounded-full text-white sm:size-7"
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : null}
            </motion.button>
          </li>
        );
      })}
    </ul>
  );

  /**
   * What just happened, for a child who is not looking at the colours.
   *
   * Derived from the board rather than remembered, so there is no second copy
   * of the game's state in here and no timer keeping it honest.
   */
  const announcement = (() => {
    if (attempt) {
      const from = nodeOf("left", attempt.leftId);
      const to = nodeOf("right", attempt.rightId);
      if (!from || !to) return "";
      return `${spokenOf(from.item)} and ${spokenOf(to.item)} do not go together. Try another one.`;
    }
    const last = connections[connections.length - 1];
    if (!last) return "";
    const from = nodeOf("left", last.leftId);
    const to = nodeOf("right", last.rightId);
    if (!from || !to) return "";
    const remaining = challenge.payload.pairs.length - connections.length;
    return remaining === 0
      ? `${spokenOf(from.item)} goes with ${spokenOf(to.item)}. You found them all!`
      : `${spokenOf(from.item)} goes with ${spokenOf(to.item)}. ${remaining} more to find.`;
  })();

  return (
    <div className="flex flex-col items-center gap-6 [@media(max-height:54rem)]:gap-4">
      {challenge.prompt.display ? (
        <PromptDisplay
          parts={challenge.prompt.display}
          layout={challenge.prompt.layout}
          anchor={challenge.prompt.anchor}
        />
      ) : null}

      <div
        role="group"
        aria-label={challenge.prompt.speech}
        /* A shelf of its own on a phone, wider on a tablet, and capped so a
           desktop gets a board rather than a stretched phone. No fixed
           anything: every number here is a ceiling, not a size. */
        className="mx-auto flex w-full max-w-[min(40rem,100%)] flex-col gap-3"
      >
        {shelf("left", left, "First set")}
        {shelf("right", right, "The set that goes with it")}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
