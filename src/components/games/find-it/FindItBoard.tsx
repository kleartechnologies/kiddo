"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { popIn, staggerChildren } from "@/lib/motion";
import type { FindItItem } from "@/lib/games/findIt";
import { FindItChoice } from "./FindItChoice";

/**
 * The line-up.
 *
 * Presentation only: it is handed the choices and three questions it can ask
 * about each one. It does not know what a target is.
 *
 * Layout is chosen by how many choices there are and how much room there is,
 * in three shapes:
 *
 *   • a phone held upright — two columns, because a row of five friends on a
 *     360px screen is a row of five thumbnails;
 *   • a phone on its side — one row, because there is width for six and
 *     nowhere near the height for two of anything;
 *   • a tablet or a desktop — two or three columns, so the characters get to
 *     be big instead of the row getting long.
 *
 * The two height queries are mutually exclusive on purpose — `33.9375rem` and
 * below is a phone on its side, `34rem` and up is everything taller — so
 * nothing depends on the order Tailwind happens to emit them in. Every width
 * is capped by the height left over, because a square tile that does not fit
 * downwards pushes the board off the screen.
 *
 * What is subtracted is the chrome the round wears above the board, and the
 * sideways phone now wears about `10rem` of it rather than `13rem`: KIDDO
 * stands at icon scale there and the bubble is a compact one. See `LANDSCAPE`
 * in `GameShell`. The 3rem is not saved, it is spent — on bigger characters
 * to point at.
 *
 * Written out in full rather than composed from a base string: Tailwind only
 * ships classes it can find as literal text, and a template interpolation is
 * not literal text.
 */

interface Layout {
  /** Gap and width caps on the row. */
  wrap: string;
  /** How wide one choice is, in each of the three shapes. */
  item: string;
}

const LAYOUTS: Record<number, Layout> = {
  4: {
    wrap: cn(
      "max-w-[min(26rem,max(16rem,calc(100dvh_-_16rem)))]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(46rem,max(28rem,calc((100dvh_-_10rem)*4)))]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:max-w-[min(34rem,max(22rem,calc(100dvh_-_17rem)))]",
    ),
    item: cn(
      "basis-[calc(50%_-_0.4rem)]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:basis-[calc(25%_-_0.8rem)]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:basis-[calc(50%_-_0.55rem)]",
    ),
  },
  5: {
    wrap: cn(
      "max-w-[min(26rem,max(15rem,calc((100dvh_-_16rem)*0.66)))]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(58rem,max(32rem,calc((100dvh_-_10rem)*5)))]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:max-w-[min(52rem,max(30rem,calc((100dvh_-_17rem)*1.5)))]",
    ),
    item: cn(
      "basis-[calc(50%_-_0.4rem)]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:basis-[calc(20%_-_0.85rem)]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:basis-[calc(33.33%_-_0.7rem)]",
    ),
  },
  6: {
    wrap: cn(
      "max-w-[min(26rem,max(15rem,calc((100dvh_-_16rem)*0.66)))]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(68rem,max(36rem,calc((100dvh_-_10rem)*6)))]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:max-w-[min(52rem,max(30rem,calc((100dvh_-_17rem)*1.5)))]",
    ),
    item: cn(
      "basis-[calc(50%_-_0.4rem)]",
      "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:basis-[calc(16.66%_-_0.9rem)]",
      "[@media(min-width:48rem)_and_(min-height:34rem)]:basis-[calc(33.33%_-_0.7rem)]",
    ),
  },
};

export interface FindItBoardProps {
  /** Remounts the row so a new round's choices pop in rather than swap. */
  roundId: string;
  choices: FindItItem[];
  isFound: (item: FindItItem) => boolean;
  isNudged: (item: FindItItem) => boolean;
  isTried: (item: FindItItem) => boolean;
  accepting: boolean;
  onPick: (id: string) => void;
}

export function FindItBoard({
  roundId,
  choices,
  isFound,
  isNudged,
  isTried,
  accepting,
  onPick,
}: FindItBoardProps) {
  const layout = LAYOUTS[choices.length] ?? LAYOUTS[6];

  return (
    <motion.ul
      key={roundId}
      variants={staggerChildren(0.05)}
      initial="hidden"
      animate="show"
      /* `flex-wrap` rather than a grid so a row that does not divide evenly —
         five choices in two columns — centres its last row instead of
         leaving one choice stranded against the left edge. */
      className={cn(
        "mx-auto flex w-full list-none flex-wrap items-center justify-center",
        "gap-3",
        "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:gap-4",
        "[@media(min-width:48rem)_and_(min-height:34rem)]:gap-4",
        layout.wrap,
      )}
    >
      {choices.map((item) => (
        <motion.li key={item.id} variants={popIn} className={layout.item}>
          <FindItChoice
            item={item}
            found={isFound(item)}
            nudged={isNudged(item)}
            tried={isTried(item)}
            interactive={accepting}
            onPick={() => onPick(item.id)}
          />
        </motion.li>
      ))}
    </motion.ul>
  );
}
