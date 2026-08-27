"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { popIn, staggerChildren } from "@/lib/motion";
import type { MemoryCardData } from "@/lib/games/memory";
import { MemoryCard } from "./MemoryCard";

/**
 * The playfield. Presentation only: it is handed a deck and four predicates
 * and has no idea what any of them mean.
 *
 * Sizing is the whole job here. The board is two columns on a phone held
 * upright and four everywhere else — a phone on its side has the width for
 * four and nowhere near the height for eight rows — and its width is capped
 * by how much height is actually left, so the cards shrink to fit the screen
 * instead of running off the bottom of it. The cap has a floor: below roughly
 * 108px a card stops being something a four year old can hit, so past that
 * point the board keeps its size and the page scrolls a little instead.
 *
 * ## The three shapes are decided by height, and never overlap
 *
 * This used to be one query — "40rem wide *or* landscape" — which said four
 * columns and nothing about how much height four columns could have. A phone
 * on its side and a desktop both matched it and they do not wear the same
 * chrome, so the sideways phone was sized as if it had a desktop's header
 * above it and eight cards stood 158px past the bottom of the screen.
 *
 * So the same split `FindItBoard` uses: `33.9375rem` and below is a phone on
 * its side, `34rem` and up is everything taller, and the two cannot both be
 * true. Order between them stops mattering, which is the point — Tailwind's
 * order between two arbitrary variants is not a thing to build on.
 *
 * The sideways phone subtracts `11.5rem` against `15rem` on a screen with room
 * for the full chrome: `GameShell` stands KIDDO at icon scale there and asks
 * the question in a compact bubble, and the two rows of cards and the gap
 * between them account for the rest. Measured rather than guessed — at 390px of
 * height it comes out at 93px cards with the last row on the screen.
 *
 * Its floor is `25.5rem`, lower than the `30rem` a taller screen would insist on,
 * because this is the one board where being able to see all of it *is* the
 * game: a card the child has to scroll to is a card they cannot remember. So
 * the cards go a little smaller on a phone on its side rather than the bottom
 * row going under the fold. Below that floor — a 360px-tall phone — the board
 * keeps its size and the page scrolls a little, as before.
 */

export interface MemoryBoardProps {
  deck: MemoryCardData[];
  isFaceUp: (card: MemoryCardData) => boolean;
  isMatched: (card: MemoryCardData) => boolean;
  isMissed: (card: MemoryCardData) => boolean;
  /** False while a pair is being judged. */
  accepting: boolean;
  onTurn: (id: string) => void;
}

export function MemoryBoard({
  deck,
  isFaceUp,
  isMatched,
  isMissed,
  accepting,
  onTurn,
}: MemoryBoardProps) {
  return (
    <motion.div
      variants={staggerChildren(0.05)}
      initial="hidden"
      animate="show"
      className={cn(
        "mx-auto grid w-full grid-cols-2 gap-3",
        "max-w-[min(24rem,max(15rem,calc((100dvh_-_17rem)*0.5)))]",
        "[@media(max-height:33.9375rem)_and_(min-width:30rem)]:grid-cols-4",
        "[@media(max-height:33.9375rem)_and_(min-width:30rem)]:gap-3",
        "[@media(max-height:33.9375rem)_and_(min-width:30rem)]:max-w-[min(46rem,max(25.5rem,calc((100dvh_-_11.5rem)*2)))]",
        "[@media(min-width:40rem)_and_(min-height:34rem)]:grid-cols-4",
        "[@media(min-width:40rem)_and_(min-height:34rem)]:gap-4",
        "[@media(min-width:40rem)_and_(min-height:34rem)]:max-w-[min(46rem,max(34rem,calc((100dvh_-_15rem)*2)))]",
      )}
    >
      {deck.map((card, index) => (
        <motion.div key={card.id} variants={popIn}>
          <MemoryCard
            card={card}
            index={index}
            faceUp={isFaceUp(card)}
            matched={isMatched(card)}
            missed={isMissed(card)}
            interactive={accepting}
            onTurn={() => onTurn(card.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
