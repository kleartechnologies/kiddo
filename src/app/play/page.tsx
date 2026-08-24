import type { Metadata } from "next";

import { GameGrid } from "@/components/kiddo/GameGrid";
import { UpcomingRow } from "@/components/kiddo/UpcomingRow";
import { WorldHeader } from "@/components/kiddo/WorldHeader";
import { WorldHero } from "@/components/kiddo/WorldHero";
import { WorldMusic } from "@/components/kiddo/WorldMusic";
import { Screen } from "@/components/ui/Screen";
import { ContinueAdventure } from "@/components/worlds/ContinueAdventure";
import { WorldMap } from "@/components/worlds/WorldMap";
import { GAMES } from "@/data/games";

export const metadata: Metadata = {
  title: "KIDDO World",
  description: "Pick a world and start the adventure.",
};

/**
 * KIDDO World — the child's home screen.
 *
 * Lives at `/play`. The public landing page at `/` is for parents; every
 * "Open KIDDO" and "Start the adventure" arrives here, and so does the
 * installed app (see `app/manifest.ts`).
 *
 * Read top to bottom the way a child reads it: KIDDO says hello; one big
 * button says where to go next; three doors stand open to the worlds; and
 * under them, the games that are not inside a world yet. Nothing here is a
 * chart, a streak or a total — the only number on the page is a row of
 * stickers, and only once there is one to show.
 */
export default function KiddoWorldPage() {
  return (
    <Screen width="shelf">
      {/* The front door is where the room starts having something warm
          happening in the corner of it. Nothing actually sounds until the
          child's first touch — see `lib/audio/engine`. */}
      <WorldMusic />

      <WorldHeader />

      <main className="flex flex-col">
        <WorldHero />

        <ContinueAdventure className="mb-10 sm:mb-12" />

        <section className="flex flex-col gap-6" aria-labelledby="worlds-heading">
          <h2 id="worlds-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            Pick a world
          </h2>
          <WorldMap />
        </section>

        <section className="mt-12 flex flex-col gap-6 sm:mt-16" aria-labelledby="games-heading">
          <h2 id="games-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            More games to play
          </h2>
          <GameGrid games={GAMES} />
        </section>
      </main>

      <UpcomingRow />
    </Screen>
  );
}
