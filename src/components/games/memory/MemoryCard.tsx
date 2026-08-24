"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { useSound } from "@/lib/audio/useAudio";
import { getCharacter } from "@/data/characters";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { springy } from "@/lib/motion";
import type { MemoryCardData } from "@/lib/games/memory";

/**
 * One card on the Memory Match board.
 *
 * A real `<button>`, so it is tabbable, pressable with Enter and Space, and
 * announced as a control without any of that being re-implemented. It is
 * never given the `disabled` attribute: half the board goes out of play while
 * a pair is being judged, and disabling the button under a child's finger
 * would throw keyboard focus back to the top of the page. `aria-disabled`
 * plus a guard in the parent locks it without moving anything.
 *
 * Turning one is the one tap in KIDDO that is not an answer — the board says
 * nothing about a single card — so this is where the soft tap sound belongs.
 * It plays only for a turn that actually happens: a card already face up, a
 * pair already won, and every tap that lands while a pair is being judged are
 * all silent, because a sound for a tap that did nothing teaches a child that
 * the sound means nothing. The pair itself is answered 400ms later, by
 * `GameShell`, well clear of this.
 *
 * The turn is a real rotation about the card's own vertical axis — two faces,
 * back to back, one of them always hidden. Reduced motion changes only how
 * long that rotation takes, never what is on the page: branching the markup
 * on a preference the server cannot know is how a card ends up with two
 * different trees and a hydration error.
 */

export interface MemoryCardProps {
  card: MemoryCardData;
  /** Position on the board, 0-based. Only used to name the card out loud. */
  index: number;
  faceUp: boolean;
  matched: boolean;
  /** Part of the pair that did not match, on its way back over. */
  missed: boolean;
  /** False while the board is judging a pair. Taps are ignored, not blocked. */
  interactive: boolean;
  onTurn: () => void;
}

export function MemoryCard({
  card,
  index,
  faceUp,
  matched,
  missed,
  interactive,
  onTurn,
}: MemoryCardProps) {
  const reduced = useReducedMotion();
  const play = useSound();
  const character = getCharacter(card.characterId);
  const locked = matched || !interactive;

  /* Everything the card is doing, said in words. Matching is never left to
     colour alone: a found pair says so here and wears a tick. */
  const label = matched
    ? `${character.name}, found`
    : missed
      ? `${character.name}, not a pair`
      : faceUp
        ? `${character.name}`
        : `Card ${index + 1}, face down`;

  const face = (
    <CardFace card={card} name={character.name} matched={matched} missed={missed} />
  );

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (locked || faceUp) return;
        play("tap");
        onTurn();
      }}
      aria-disabled={locked}
      aria-label={label}
      whileHover={locked ? undefined : { y: -5 }}
      whileTap={locked ? undefined : { y: 2, scale: 0.97 }}
      animate={
        reduced
          ? { x: 0, scale: 1 }
          : missed
            /* A settle, not a shake. `ChoiceTile` explains why the product has
               no "no" animation; two cards that did not match are turning back
               over anyway, and this is the pause before they do. */
            ? { x: 0, scale: [1, 0.965, 1] }
            : matched
              ? { x: 0, scale: [1, 1.05, 1] }
              : { x: 0, scale: 1 }
      }
      transition={
        missed
          ? { duration: 0.32, ease: "easeOut", times: [0, 0.35, 1] }
          : matched
            ? { duration: 0.45, ease: "easeOut" }
            : springy
      }
      className={cn(
        "relative aspect-square w-full min-h-14 min-w-14",
        "rounded-tile [perspective:900px]",
        locked ? "cursor-default" : "cursor-pointer",
      )}
    >
      <motion.span
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        /* Reduced motion still turns the card — it just arrives already
           turned, because the child needs the information either way. */
        transition={reduced ? { duration: 0 } : springy}
      >
        <span className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          <CardBack />
        </span>
        <span className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]">
          {face}
        </span>
      </motion.span>
    </motion.button>
  );
}

/**
 * The back. Identical on all eight cards, so nothing about the face-down
 * board is a clue. Sage and honey, the brand's own two colours, with no
 * character on it: a KIDDO head here would read as "this is the KIDDO card".
 */
function CardBack() {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-full items-center justify-center overflow-hidden",
        "rounded-tile border-2 border-sage-base/30 bg-sage-soft shadow-soft",
      )}
    >
      <span className="absolute -bottom-10 left-1/2 h-24 w-[150%] -translate-x-1/2 rounded-[50%] bg-sage-base/15" />
      <span className="bg-paper/80 relative flex size-12 items-center justify-center rounded-full sm:size-14">
        <Sparkles className="text-honey-deep size-6 sm:size-7" strokeWidth={2.5} />
      </span>
    </span>
  );
}

/** The revealed side: the friend, their name, and a tick once they are found. */
function CardFace({
  card,
  name,
  matched,
  missed,
}: {
  card: MemoryCardData;
  name: string;
  matched: boolean;
  missed: boolean;
}) {
  const accent = ACCENTS[getCharacter(card.characterId).accent];

  /* Two states, two shapes, so the difference survives without colour: a tick
     for a found pair, a turn-back arrow for two that were not one. Not the
     magnifier `ChoiceTile` uses for "keep looking" — nothing is hidden here,
     the two cards simply were not a pair, and the arrow says exactly that. */
  const badge = matched
    ? { Icon: Check, tint: "bg-sprout-deep" }
    : missed
      ? { Icon: RotateCcw, tint: "bg-apricot-deep" }
      : null;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-full flex-col items-center justify-center gap-0.5 p-1.5",
        "rounded-tile border-2 shadow-soft transition-colors",
        matched
          ? cn(accent.bgSoft, accent.border)
          /* A miss keeps the plain paper face and gains a ring, because
             `--color-retry-soft` is `--color-apricot-soft` — filling it would
             make every miss look exactly like a found FOXY. */
          : missed
            ? "bg-paper border-apricot-base"
            : "bg-paper border-edge",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute top-1.5 right-1.5 flex size-6 items-center justify-center",
            "rounded-full text-white sm:size-7",
            badge.tint,
          )}
        >
          <badge.Icon className="size-4 sm:size-5" strokeWidth={3.5} />
        </span>
      ) : null}

      {/* `alive={false}`: eight breathing characters would turn the board
          into a fidgeting wall. The host in the speech bubble is the one
          that moves. */}
      <CharacterFigure id={card.characterId} size="md" alive={false} />
      <span className="font-display text-ink-700 text-xs leading-none font-semibold sm:text-sm">
        {name}
      </span>
    </span>
  );
}
