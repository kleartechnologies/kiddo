"use client";

import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Game } from "@/lib/games/types";
import { useT } from "@/lib/i18n/useLocale";
import { GameArtwork } from "@/components/kiddo/artwork/GameArtwork";
import { SectionIntro } from "./SectionIntro";

/**
 * The rest of the library, immediately after the three worlds.
 *
 * The worlds above are the deepest thing KIDDO has, and for a while they were
 * the only thing the page showed — which left a parent scrolling past it
 * believing they had seen the whole product. They had seen three of it. This
 * section is the correction and nothing more: the same games that stand on
 * the child's home screen at `/play`, drawn with the same artwork, named with
 * the same words from the same catalogue.
 *
 * Read from `data/games.ts` rather than listed here, so the page cannot
 * advertise a game the app does not have and cannot miss one it does. Only
 * `ready` games are shown: a card for something a child cannot open yet would
 * be a promise, and the page makes none.
 *
 * The cards are pictures, not doors. A parent has not paid yet and there is
 * nothing behind a tap for them, so nothing here is a link — the one way in
 * is still `#pricing`, said where the page already says it. That is also why
 * a card carries only what can be scanned in a second: the picture, the name,
 * and the line the child is told. The grown-up's paragraph about each game
 * lives in the app, where there is room for it.
 */
export function MoreGames({ games }: { games: readonly Game[] }) {
  const t = useT();
  /* Only what a child can actually open today. */
  const playable = games.filter((game) => game.status === "ready");

  return (
    <section aria-labelledby="more-heading" className="scroll-mt-24" id="games">
      <SectionIntro
        id="more-heading"
        eyebrow={t("landing.more.eyebrow")}
        title={t("landing.more.title")}
      >
        {t("landing.more.body", { count: playable.length })}
      </SectionIntro>

      {/* Tiles are sized by the grid and never by their own contents, so a
          long name cannot widen its column — the shelf rule, from `GameGrid`.
          Rows are *not* forced to one height here, which is where this shelf
          parts company with the child's: a card there has a badge and a play
          button pinned to its floor to fill a tall row, and a card here has
          two lines of text and would stand in a pool of white instead. */}
      <ul
        aria-label={t("landing.more.listAria")}
        className={cn(
          "mt-10 grid list-none sm:mt-12",
          "grid-cols-2 lg:grid-cols-4",
          "gap-4 sm:gap-6",
        )}
      >
        {playable.map((game) => (
          <li key={game.id} className="flex min-w-0">
            <GameTile game={game} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One game, as a parent sees it.
 *
 * The illustration bed is the card's own accent, so eight games arrive as
 * eight colours — which is the whole argument of the section, made before a
 * single title has been read.
 */
function GameTile({ game }: { game: Game }) {
  const t = useT();
  const accent = ACCENTS[game.artwork?.bed ?? game.accent];

  return (
    <article
      data-landing-game={game.id}
      className={cn(
        "@container bg-paper border-edge flex h-full w-full flex-col overflow-hidden",
        "rounded-card border shadow-soft",
      )}
    >
      <div
        className={cn(
          "relative flex aspect-[9/5] shrink-0 items-end justify-center overflow-hidden",
          accent.bgSoft,
        )}
      >
        {/* The same soft ground the child's cards stand on, so the friends
            look like they are somewhere rather than floating. */}
        <div
          aria-hidden
          className={cn(
            "absolute -bottom-16 left-1/2 h-32 w-[130%] -translate-x-1/2 rounded-[50%]",
            accent.bgBase,
            "opacity-20",
          )}
        />
        <GameArtwork game={game} />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4 @min-[16rem]:p-5">
        <h3 className="font-display text-lg leading-tight font-semibold text-pretty @min-[16rem]:text-xl">
          {t(game.title)}
        </h3>
        <p className="text-ink-500 text-sm leading-snug text-pretty @min-[16rem]:text-base">
          {t(game.tagline)}
        </p>
      </div>
    </article>
  );
}
