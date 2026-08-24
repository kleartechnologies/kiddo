"use client";

import { motion } from "framer-motion";

import { GameCard } from "./GameCard";
import { cn } from "@/lib/cn";
import { staggerChildren } from "@/lib/motion";
import type { Game } from "@/lib/games/types";

/**
 * The shelf: every game in the library, laid out as one.
 *
 * A real CSS grid, and the grid cell is the source of truth for the card. Not
 * the other way round — no card is ever measured, and nothing a card contains
 * can change its size. A long title, a long tagline, a picture with more in it:
 * none of them can make one card taller or wider than the card beside it,
 * because none of them is what decides.
 *
 * Two rules do all of that work:
 *
 * - `grid-cols-*` gives every column an equal share of the row, so the widths
 *   are equal by definition rather than by arithmetic that has to be kept in
 *   step with the gap.
 * - `grid-auto-rows: 1fr` makes every *row* the height of the tallest thing in
 *   the shelf — not the tallest thing in that row. This is the one that
 *   matters. Rows that size themselves independently are how a library ends up
 *   with a second row half an inch taller than the first, and it is invisible
 *   until the day a title wraps.
 *
 * Between them, every card is the same box on every row, and `min-w-0` on the
 * cell is the floor under the whole thing: without it one unbreakable word
 * would widen its track and pull the shelf out of square.
 *
 * ## Why the last row is not centred
 *
 * It used to be — wrapped flex rows, so a library of seven in rows of four sat
 * three centred under four. It read as a nicer arrangement of cards and a
 * worse shelf: the odd row lined up with nothing, and at three columns the
 * seventh game floated alone in the middle of the page looking like a mistake
 * rather than like the next one along. Filled left to right, a short last row
 * is obviously a shelf still being filled, and every card in the library sits
 * on the same left edge as the heading above it.
 *
 * Nothing here knows how many games there are. Adding one is a line in the
 * games data and nothing else.
 */

/** Gaps between cards, across and down. One value, so rows and columns match. */
const GAP = "gap-5 sm:gap-6";

/**
 * How many cards to a row: 1, then 2, 3 and 4.
 *
 * The steps are where a card would otherwise get too narrow to hold a two-line
 * title — not where a particular device happens to sit.
 */
const COLUMNS = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <motion.ul
      variants={staggerChildren(0.1, 0.15)}
      initial="hidden"
      animate="show"
      className={cn("grid [grid-auto-rows:1fr]", COLUMNS, GAP)}
    >
      {games.map((game) => (
        <li key={game.id} className="flex min-w-0">
          <GameCard game={game} />
        </li>
      ))}
    </motion.ul>
  );
}
