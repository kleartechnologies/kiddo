"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { popIn, tappableCard } from "@/lib/motion";
import type { Game } from "@/lib/games/types";
import { GameArtwork } from "./artwork/GameArtwork";

/**
 * The thing a child taps to start playing.
 *
 * Four things, in this order and no others: the picture, the name, one short
 * invitation, and a play button. A child of four reads the first of those and
 * nothing else, which is why the picture is the largest part of the card and
 * why it shows the game rather than the cast.
 *
 * The entire card is one big link: there is no small "play" button to miss.
 * The illustration bed is sized for finished key art, so dropping a painted
 * scene in behind the character later will not move the layout.
 *
 * ## The card does not decide how big it is
 *
 * `GameGrid` does. The card fills its cell — `h-full w-full`, top to bottom —
 * and every measurement inside is either a ratio or a query against the card's
 * own width (`@container`), never against the viewport and never against its
 * own contents. That is what keeps the shelf level: cards are not the same
 * width at every breakpoint — one of four columns on a desktop is *narrower*
 * than the single column on a phone — so anything sized by `sm:` would step at
 * the wrong moments. Sized by the card, identical cards are identical
 * everywhere, in bed height, padding and type.
 *
 * The title and the tagline each keep two lines' worth of room whether they
 * need it or not, and the bottom row is pushed down by `mt-auto`. Between them
 * that fixes the one thing a shelf cannot tolerate: a long title dragging one
 * card taller than its neighbours, or nudging its play button out of line.
 *
 * ## The `data-kiddo-card-*` marks
 *
 * The geometry above is a promise — identical beds, identical padding, badges
 * and play buttons at one height across the whole library — and a promise
 * about layout is the kind that breaks silently. The marks are how it gets
 * measured in a real browser instead of being trusted. They carry no styling
 * and nothing reads them at runtime.
 *
 * ## Why the outer div is taken out of the tab order
 *
 * Framer Motion makes anything carrying `whileTap` keyboard-reachable, which
 * is the right default and the wrong one here: the control is the `Link`
 * inside, and the div around it only leans when you touch it. Left alone, a
 * child on a keyboard gets two stops per card — one that opens the game and
 * one, indistinguishable, that has nothing behind Enter. `tabIndex={-1}`
 * removes the empty stop and nothing else; the link keeps its own focus, its
 * own ring and its own place in the order.
 */
export function GameCard({ game }: { game: Game }) {
  const t = useT();
  const accent = ACCENTS[game.accent];

  return (
    <motion.div
      variants={popIn}
      {...tappableCard}
      data-kiddo-card={game.id}
      tabIndex={-1}
      className="@container h-full w-full"
    >
      <Link
        href={game.route}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-card",
          "bg-paper border border-edge shadow-soft",
          "transition-shadow hover:shadow-lift",
        )}
      >
        <GameCardArt game={game} />

        <div
          data-kiddo-card-body
          className="flex flex-1 flex-col gap-1.5 p-5 @min-[19.5rem]:p-6"
        >
          <h3
            data-kiddo-card-title
            className={cn(
              "font-display text-2xl leading-tight font-semibold",
              "@min-[19.5rem]:text-[1.75rem]",
              "line-clamp-2 min-h-[2lh]",
            )}
          >
            {t(game.title)}
          </h3>
          <p
            data-kiddo-card-tagline
            className={cn(
              "text-ink-500 text-base leading-snug",
              "@min-[19.5rem]:text-lg",
              "line-clamp-2 min-h-[2lh]",
            )}
          >
            {t(game.tagline)}
          </p>

          {/* Pushed to the floor of the card, so it is at one height across
              the row however much text sits above it. */}
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span
              data-kiddo-card-badge
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
                accent.bgSoft,
                accent.text,
              )}
            >
              {game.status === "ready"
                ? `Ages ${game.ageRange.min}-${game.ageRange.max}`
                : "Almost ready"}
            </span>

            {/* A full tap target's worth of play button — the same 3.5rem the
                rest of the product gives a small hand — even though the whole
                card is the link. It is the thing a child aims at, so it has to
                be the size of the thing a child can hit. */}
            <span
              aria-hidden
              data-kiddo-card-play
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-full",
                "transition-transform group-hover:scale-105",
                accent.bgBase,
                accent.textOnBase,
              )}
            >
              <Play className="size-7 translate-x-px" fill="currentColor" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * The illustration bed.
 *
 * Its size, tint and ground are the card's, and they do not change from game
 * to game — what changes is the picture inside it, which `GameArtwork` draws
 * from the game's own data. Hand-painted key art replaces the lot when
 * `game.art` is set.
 */
function GameCardArt({ game }: { game: Game }) {
  /* The artwork may name its own tint; almost nothing should, because a card
     that does not wear its game's colour breaks the shelf. */
  const accent = ACCENTS[game.artwork?.bed ?? game.accent];

  return (
    <div
      data-kiddo-card-art
      className={cn(
        /* A ratio, not a height: the scene is drawn 9:5, so the picture fills
           the bed exactly at every card width instead of being letterboxed at
           some of them. `shrink-0` keeps it that way if a card is ever asked
           to squeeze. */
        "relative flex aspect-[9/5] shrink-0 items-end justify-center overflow-hidden",
        accent.bgSoft,
      )}
    >
      {/* Soft ground so the characters feel like they are standing somewhere. */}
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-16 left-1/2 h-32 w-[130%] -translate-x-1/2 rounded-[50%]",
          accent.bgBase,
          "opacity-20",
        )}
      />

      {game.art?.src ? (
        <Image
          src={game.art.src}
          alt=""
          width={game.art.width ?? 640}
          height={game.art.height ?? 400}
          className="relative h-full w-full object-cover"
        />
      ) : (
        <GameArtwork game={game} />
      )}
    </div>
  );
}
