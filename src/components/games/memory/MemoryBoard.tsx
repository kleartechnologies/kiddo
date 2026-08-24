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
 * 112px a card stops being something a four year old can hit, so past that
 * point the board keeps its size and the page scrolls a little instead.
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
        "[@media(min-width:40rem),(orientation:landscape)]:grid-cols-4",
        "[@media(min-width:40rem),(orientation:landscape)]:gap-4",
        "[@media(min-width:40rem),(orientation:landscape)]:max-w-[min(46rem,max(34rem,calc((100dvh_-_15rem)*2)))]",
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
