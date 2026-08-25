"use client";

import { motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { springSoft, springy } from "@/lib/motion";

/**
 * The universal "tap this to answer" surface.
 *
 * Find It uses it for pictures, Math Quest for numbers, and anything later can
 * put whatever it likes inside. Feedback is never colour alone: a correct tile
 * also gains a tick, and a tile to try again gains a magnifier.
 *
 * There is no cross anywhere in KIDDO. A wrong answer is not a verdict on the
 * child, it is an instruction to keep looking, and the badge says so.
 *
 * ## Why nothing shakes
 *
 * It used to. A tile that was not the answer threw itself left and right five
 * times over four hundred milliseconds, which is the universal web idiom for
 * "no" — a password field's idiom, borrowed for a four year old. It is the
 * wrong idiom twice over: it is the one piece of motion in the product that
 * exists to say a child got something wrong rather than to show them
 * something, and a sharp repeated movement is exactly what a child who is
 * sensitive to motion finds hardest to sit through.
 *
 * What replaced it is a *settle*: the tile eases down a hair and comes back,
 * once, and stops. It says the tap landed and the tile is still there to try
 * again, which is true, and it is a single continuous movement rather than an
 * oscillation. The magnifier and the apricot surface do the rest, and both of
 * them survive `prefers-reduced-motion`, where the settle does not run at all.
 */

export type ChoiceState = "idle" | "correct" | "wrong" | "tried" | "dimmed";

const STATES: Record<ChoiceState, string> = {
  idle: "bg-paper border-edge shadow-[0_5px_0_0_var(--color-edge)]",
  correct:
    "bg-yes-soft border-sprout-base shadow-[0_5px_0_0_var(--color-sprout-deep)]",
  wrong:
    "bg-retry-soft border-apricot-base shadow-[0_5px_0_0_var(--color-apricot-deep)]",
  /* Ruled out earlier and still on the board, because a choice that vanished
     would move everything else and lose the child's place. Quieter, never
     gone, and still perfectly tappable. */
  tried:
    "bg-paper/70 border-apricot-base/45 shadow-[0_5px_0_0_var(--color-edge)]",
  dimmed: "bg-paper/60 border-edge opacity-55 shadow-none",
};

/**
 * Square for a picture, wide for a numeral. A `4` in a square tile is a small
 * mark in a lot of nothing, and four square tiles need twice the height of
 * four wide ones — which is the whole of a phone's spare room.
 */
const SHAPES = {
  square: "aspect-square gap-2 p-4",
  wide: "aspect-[7/5] gap-1 p-3",
} as const;

export function ChoiceTile({
  children,
  label,
  srLabel,
  shape = "square",
  look = "tile",
  state = "idle",
  onSelect,
  disabled,
  className,
}: {
  children: ReactNode;
  /**
   * `sign` plants the tile on a post, for a world whose answers stand in
   * the ground. Same button, same states, same hit area; the post is
   * decoration below it and never part of the target.
   */
  look?: "tile" | "sign";
  /**
   * Shown under the illustration, and spoken unless `srLabel` overrides it.
   * Empty when the tile *is* its own caption — a numeral printed twice reads
   * as two answers — in which case `srLabel` has to carry the words.
   */
  label: string;
  /** What assistive technology hears: a whole instruction, not just a name. */
  srLabel?: string;
  shape?: keyof typeof SHAPES;
  state?: ChoiceState;
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const locked = disabled || state === "dimmed";

  return (
    <motion.button
      type="button"
      /* `aria-disabled` rather than the attribute, plus a guard. A tile that
         goes properly disabled under a child's finger throws keyboard focus
         back to the top of the page, and half the board locks every time an
         answer is being shown. */
      onClick={() => {
        if (locked) return;
        onSelect?.();
      }}
      aria-disabled={locked}
      aria-label={srLabel ?? label}
      whileHover={locked ? undefined : { y: -4 }}
      whileTap={locked ? undefined : { y: 3 }}
      /* The settle. One dip, back to rest, no repeat — and `scale` rather than
         `x` so it cannot fight the `y` that hover and tap are already using. */
      animate={{ scale: state === "wrong" ? [1, 0.965, 1] : 1 }}
      transition={
        state === "wrong"
          ? { duration: 0.32, ease: "easeOut", times: [0, 0.35, 1] }
          : springSoft
      }
      className={cn(
        "relative flex w-full flex-col items-center justify-center",
        "rounded-card border-2 transition-colors",
        SHAPES[shape],
        look === "sign" && "rounded-tile",
        locked ? "cursor-default" : "cursor-pointer",
        STATES[state],
        className,
      )}
    >
      {/* The post, for a world whose answers are planted rather than laid out.
          Two marks and no more: the post itself, starting at the sign's own
          edge so the two read as one object rather than a card hovering above
          a stick, and the patch of ground it goes into. Both sit outside the
          button's box, so neither is ever part of what a finger has to hit,
          and both stay inside the row's own `pb-4`. */}
      {look === "sign" ? (
        <>
          <span
            aria-hidden
            className="bg-honey-deep absolute top-full left-1/2 h-3 w-2.5 -translate-x-1/2 rounded-b-sm"
          />
          <span
            aria-hidden
            className="bg-ink-900/10 absolute top-[calc(100%+0.65rem)] left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full"
          />
        </>
      ) : null}
      {state === "correct" && <StateBadge tone="yes" />}
      {state === "wrong" && <StateBadge tone="retry" />}
      {state === "tried" && <StateBadge tone="tried" />}

      {/* `min-h-0` so the artwork inside is allowed to shrink. Without it the
          art's natural size becomes the tile's minimum height, `aspect-square`
          loses, and a tall thin tile pushes the board off a small phone. */}
      <span
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center transition-opacity",
          state === "tried" && "opacity-60",
        )}
      >
        {children}
      </span>
      {label ? (
        <span
          className={cn(
            "font-display text-ink-700 text-base font-semibold sm:text-lg",
            state === "tried" && "opacity-60",
          )}
        >
          {label}
        </span>
      ) : null}
    </motion.button>
  );
}

/**
 * Two shapes, so the state survives without colour: a tick for the answer, a
 * magnifier for "keep looking". The magnifier comes filled while the tile is
 * being nudged and pale once it is only a memory.
 */
function StateBadge({ tone }: { tone: "yes" | "retry" | "tried" }) {
  const Icon = tone === "yes" ? Check : Search;
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={springy}
      className={cn(
        "absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full",
        tone === "yes" && "bg-sprout-deep text-white",
        tone === "retry" && "bg-apricot-deep text-white",
        tone === "tried" &&
          "bg-apricot-soft text-apricot-ink border-apricot-base/50 border-2",
      )}
    >
      <Icon className="size-5" strokeWidth={3} />
    </motion.span>
  );
}
