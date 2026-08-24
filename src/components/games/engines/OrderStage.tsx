"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { captionOf, spokenOf } from "@/lib/content/challenges";
import type { ChallengeEngineProps } from "@/lib/content/engine";
import type { ContentItem, OrderItem } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { springSoft } from "@/lib/motion";
import { ContentItemView } from "./ContentItemView";
import { PromptDisplay } from "./PromptDisplay";

/**
 * The engine for every `order` challenge there will ever be.
 *
 * The third of them, beside `ChoiceStage` and `ConnectStage`, and it makes the
 * same promise: handed a challenge, it cannot tell what the challenge is
 * about. Numbers smallest first, the letters of a word, four pictures of a
 * story, the days of the week — one board, one gesture, and no branch in here
 * for any of them. It draws a line and a tray, lets the child move a tile from
 * one to the other, and reports the arrangement. It never decides whether the
 * arrangement is right; `checkStep` does, in the content layer, once.
 *
 * It never reads `answerOrder`. That field is in the payload it is handed and
 * touching it would be the engine marking its own homework.
 *
 * ## The line and the tray
 *
 * The line is the answer being built, and it fills from the left, because that
 * is what `checkStep` can speak about for an ordering — see the long note in
 * `lib/games/engines/order.ts`. The tray is everything still waiting.
 *
 * A tile only ever travels one way. Nothing in the line was put there without
 * the content layer accepting it, so there is nothing in it to swap, drag
 * about or take back, and a child cannot undo their way into a mess.
 *
 * ## What it holds
 *
 * Which tile a finger is currently dragging, and where that finger is. Both
 * are facts about the screen, and both are gone the moment the pointer is up.
 * Everything that is a fact about the *game* — what is in hand, what is in the
 * line, what KIDDO is saying — lives in `lib/games/engines/order.ts` and
 * arrives here as props.
 */

interface Point {
  x: number;
  y: number;
}

/** A pointer part-way through carrying a tile. Screen state, not game state. */
interface Drag {
  pointerId: number;
  itemId: string;
  /** Where the finger is now, in board coordinates. */
  at: Point | null;
}

export interface OrderStageProps extends ChallengeEngineProps<"order"> {
  /** The line, in order. The tiles the content layer has accepted. */
  placed: readonly string[];
  /** The tile the child has picked up and not yet put down. */
  selectedId?: string | null;
  /** A tile being shown refused. Shown, then sent home when it leaves. */
  attemptId?: string | null;
  /**
   * One tile was picked up. Not an answer — a child who picks a tile up and
   * puts it back down has answered nothing — so it is reported apart from
   * `onAnswer`, and what having a tile in hand *means* stays in the reducer.
   */
  onSelect: (itemId: string) => void;
}

/**
 * How many places wide the line is drawn.
 *
 * Written out rather than composed, because Tailwind reads class names out of
 * the source and a `grid-cols-${n}` it never sees is a class that never ships.
 * Six is the widest a row of tiles stays comfortably tappable on the narrowest
 * phone; a longer ordering would want a different layout, not a smaller tile.
 */
const LINE_COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/**
 * The whole state of a tray tile, in words.
 *
 * Nothing here rests on colour: a tile says whether it is in hand and what to
 * do with it next, and a screen reader gets the same board a sighted child
 * does. `spokenOf` is what names the thing, so a numeral, a letter and a group
 * of dots all arrive already saying what they are.
 */
function trayLabelOf(
  item: ContentItem,
  place: number,
  total: number,
  selected: boolean,
): string {
  const name = spokenOf(item);
  if (selected) {
    return `${name}, chosen. Choose it again to put it in place ${place} of ${total}.`;
  }
  return `${name}, waiting. Choose it to move it.`;
}

/** The face of a tile: the thing itself, and its word when it needs one. */
function TileFace({
  item,
  scale,
}: {
  item: ContentItem;
  scale: "stage" | "tile";
}) {
  const caption = captionOf(item);
  return (
    <span className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-0.5">
      <ContentItemView item={item} scale={scale} />
      {caption ? (
        <span className="font-display text-ink-700 max-w-full truncate text-xs font-semibold sm:text-sm">
          {caption}
        </span>
      ) : null}
    </span>
  );
}

export function OrderStage({
  challenge,
  onAnswer,
  accepting = true,
  placed,
  selectedId = null,
  attemptId = null,
  onSelect,
}: OrderStageProps) {
  const { items } = challenge.payload;
  const total = items.length;
  const reduced = useReducedMotion();

  const boardRef = useRef<HTMLDivElement>(null);
  /**
   * The tile being carried. State rather than a ref because it is drawn, and
   * it is the only thing on this board a pointer alone can change.
   */
  const [drag, setDrag] = useState<Drag | null>(null);

  const itemOf = useCallback(
    (id: string): OrderItem | undefined => items.find((item) => item.id === id),
    [items],
  );

  const pointOf = useCallback((clientX: number, clientY: number): Point | null => {
    const board = boardRef.current;
    if (!board) return null;
    const origin = board.getBoundingClientRect();
    return { x: clientX - origin.left, y: clientY - origin.top };
  }, []);

  /** Hands the arrangement up. The engine's only opinion is that it changed. */
  const offer = useCallback(
    (itemId: string) => {
      onAnswer({
        challengeId: challenge.id,
        answer: { kind: "order", itemIds: [...placed, itemId] },
      });
    },
    [challenge.id, onAnswer, placed],
  );

  /**
   * One tile was chosen, however it was chosen.
   *
   * The single funnel every input method arrives at. A tap and the end of a
   * drag are the same event by the time they get here, which is why there is
   * no drag mode and no tap mode — there is a board, and it is being used.
   */
  const choose = useCallback(
    (itemId: string) => {
      if (!accepting || placed.includes(itemId)) return;
      /* Already in hand: this is the child putting it down. */
      if (selectedId === itemId) offer(itemId);
      else onSelect(itemId);
    },
    [accepting, offer, onSelect, placed, selectedId],
  );

  const handlePointerDown = (itemId: string) => (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!accepting || placed.includes(itemId)) return;
    /* Capture, so a finger that leaves the tile keeps sending us moves and we
       are told when it goes up wherever that happens to be. */
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      itemId,
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
    if (!accepting) return;

    /* What is actually under the finger, which is not necessarily what the
       event was captured to. A tap and a drag differ only in the answer. */
    const target = document.elementFromPoint(event.clientX, event.clientY);

    /* Anywhere on the line, not only the one empty place: there is a single
       insertion point, so the whole row is a generous target for it. */
    if (target?.closest("[data-order-line]")) {
      offer(from.itemId);
      return;
    }

    /* Up on the tile it started on: a tap, whatever the finger did between. */
    if (target?.closest<HTMLElement>("[data-order-tile]")?.dataset.itemId === from.itemId) {
      choose(from.itemId);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag?.pointerId !== event.pointerId) return;
    setDrag(null);
  };

  const tray = items.filter((item) => !placed.includes(item.id));
  const selectedItem = selectedId ? itemOf(selectedId) : undefined;
  const dragging = drag ? itemOf(drag.itemId) : undefined;
  /* The one empty place, which is where any tile the child offers will go. */
  const nextPlace = placed.length;
  const armed = accepting && selectedId !== null;

  return (
    <div className="flex flex-col items-center gap-5 [@media(max-height:44rem)]:gap-3">
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
        /* A column of its own on a phone, wider on a tablet, and capped so a
           desktop gets a board rather than a stretched phone. No fixed
           anything: every number here is a ceiling, not a size. */
        className="mx-auto w-full max-w-[min(46rem,100%)]"
      >
        <div
          ref={boardRef}
          className="relative flex flex-col gap-5 [@media(max-height:44rem)]:gap-3"
        >
          {/* ---- the line: the answer, being built ---------------------- */}
          <ol
            data-order-line=""
            className={cn(
              "grid list-none gap-2 sm:gap-3",
              LINE_COLUMNS[total] ?? LINE_COLUMNS[6],
            )}
          >
            {Array.from({ length: total }, (_, index) => {
              const filledId = placed[index];
              const filled = filledId ? itemOf(filledId) : undefined;
              const isNext = index === nextPlace;

              const face = filled ? (
                <motion.span
                  key={filled.id}
                  className="flex min-h-0 min-w-0 items-center justify-center"
                  /* It arrives, rather than appearing: the one bit of motion
                     that says "that went in". Nothing loops. */
                  initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={reduced ? { duration: 0 } : springSoft}
                >
                  <TileFace item={filled.item} scale="tile" />
                </motion.span>
              ) : (
                /* An empty place says which place it is. A number, not a
                   colour, so the board reads the same to everyone. */
                <span
                  aria-hidden
                  className={cn(
                    "font-display text-2xl font-bold sm:text-3xl",
                    isNext ? "text-tide-deep" : "text-ink-300",
                  )}
                >
                  {index + 1}
                </span>
              );

              const shell = cn(
                "relative flex min-h-16 w-full items-center justify-center rounded-card border-2 p-1",
                "sm:min-h-20 [@media(max-height:44rem)]:min-h-12",
                filled
                  ? "bg-yes-soft border-sprout-base shadow-[0_3px_0_0_var(--color-sprout-deep)]"
                  : isNext
                    ? cn(
                        "border-tide-base border-dashed",
                        /* Brightens when there is something to put in it. A
                           state change, never a loop. */
                        armed ? "bg-tide-soft" : "bg-tide-soft/40",
                      )
                    : "border-edge border-dashed bg-paper/60",
              );

              if (filled) {
                return (
                  <li key={index} className="min-w-0">
                    <div className={shell}>
                      {face}
                      <span
                        aria-hidden
                        className="bg-sprout-deep absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-white"
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      <span className="sr-only">
                        {`Place ${index + 1} of ${total}: ${spokenOf(filled.item)}.`}
                      </span>
                    </div>
                  </li>
                );
              }

              if (!isNext) {
                return (
                  <li key={index} className="min-w-0">
                    <div className={shell}>
                      {face}
                      <span className="sr-only">
                        {`Place ${index + 1} of ${total}, still empty.`}
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={index} className="min-w-0">
                  {/* The insertion point is a real button, so a big obvious
                      target exists for a finger that would rather aim at the
                      gap than tap the tile twice. */}
                  <button
                    type="button"
                    data-order-slot=""
                    className={cn(shell, "touch-none", armed ? "cursor-pointer" : "cursor-default")}
                    aria-disabled={!armed}
                    aria-label={
                      selectedItem
                        ? `Put ${spokenOf(selectedItem.item)} in place ${index + 1} of ${total}.`
                        : `Place ${index + 1} of ${total}, next to fill. Choose a tile first.`
                    }
                    onClick={(event) => {
                      /* Keyboard only. A pointer's click always follows its
                         own `pointerup`, which has already been dealt with
                         above; `detail === 0` is what a click from Enter or
                         Space looks like. */
                      if (event.detail !== 0) return;
                      if (armed && selectedId) offer(selectedId);
                    }}
                  >
                    {face}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* ---- the tray: everything still waiting --------------------- */}
          <ul
            role="list"
            className="flex list-none flex-wrap items-center justify-center gap-3 [@media(max-height:44rem)]:gap-2"
          >
            {tray.map((entry) => {
              const selected = selectedId === entry.id;
              const refused = attemptId === entry.id;
              const carried = drag?.itemId === entry.id;

              return (
                <li key={entry.id} className="min-w-0">
                  <motion.button
                    type="button"
                    data-order-tile=""
                    data-item-id={entry.id}
                    data-state={
                      refused ? "refused" : selected ? "selected" : "idle"
                    }
                    aria-pressed={selected}
                    aria-disabled={!accepting}
                    aria-label={trayLabelOf(
                      entry.item,
                      nextPlace + 1,
                      total,
                      selected,
                    )}
                    onPointerDown={handlePointerDown(entry.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onClick={(event) => {
                      if (event.detail !== 0) return;
                      choose(entry.id);
                    }}
                    /* Selected sits up on the board, so "in my hand" is a
                       height as well as a colour. */
                    animate={reduced ? undefined : { y: selected ? -6 : 0 }}
                    /* With reduced motion the hop is zeroed, not removed: a
                       gesture prop's *presence* reaches the server HTML (the
                       press gesture stamps `tabindex="0"` there), and
                       `useReducedMotion` is `false` on the server, so a prop
                       that vanishes on the client is a hydration mismatch. A
                       hop of nothing is the same stillness, and the colour,
                       the shadow and `aria-pressed` already say everything
                       the hop was saying. */
                    whileHover={
                      !accepting
                        ? undefined
                        : { y: reduced ? 0 : selected ? -8 : -3 }
                    }
                    whileTap={
                      !accepting
                        ? undefined
                        : { y: reduced ? 0 : selected ? -4 : 2 }
                    }
                    transition={reduced ? { duration: 0 } : springSoft}
                    className={cn(
                      /* `touch-none`: a finger carrying a tile across the
                         board must not also be a finger scrolling the page.
                         Only the tiles claim it, so the space around them
                         still scrolls. */
                      "relative flex touch-none items-center justify-center rounded-card border-2 px-2",
                      /* 64px, comfortably past the top of the touch band, and
                         48px — the floor — only on a screen short enough that
                         a five-tile board would otherwise need scrolling.
                         Never smaller than that, whatever the screen. */
                      "min-h-16 min-w-16 sm:min-h-20 sm:min-w-20",
                      "[@media(max-height:44rem)]:min-h-12 [@media(max-height:44rem)]:min-w-12",
                      carried && "opacity-40",
                      refused
                        ? "bg-retry-soft border-apricot-base shadow-[0_4px_0_0_var(--color-apricot-deep)]"
                        : selected
                          ? "bg-tide-soft border-tide-base shadow-[0_4px_0_0_var(--color-tide-deep)]"
                          : "bg-paper border-edge shadow-[0_4px_0_0_var(--color-edge)]",
                      accepting ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    <TileFace item={entry.item} scale="stage" />
                  </motion.button>
                </li>
              );
            })}
          </ul>

          {/* The tile under the finger. Direct manipulation, so it is never
              animated — it is where the finger is. */}
          {dragging && drag?.at ? (
            <div
              aria-hidden
              className="border-tide-base bg-tide-soft rounded-card pointer-events-none absolute z-20 flex size-16 items-center justify-center border-2 opacity-90"
              style={{
                left: drag.at.x,
                top: drag.at.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <TileFace item={dragging.item} scale="tile" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
