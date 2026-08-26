import type { ComponentType } from "react";
import { notFound } from "next/navigation";

import { ComingSoonStage } from "@/components/games/ComingSoonStage";
import { EnglishQuestGame } from "@/components/games/english/EnglishQuestGame";
import { FindItGame } from "@/components/games/find-it/FindItGame";
import { GeneralKnowledgeQuestGame } from "@/components/games/general-knowledge/GeneralKnowledgeQuestGame";
import { GameShell } from "@/components/games/GameShell";
import { LogicQuestGame } from "@/components/games/logic/LogicQuestGame";
import { MatchQuestGame } from "@/components/games/match/MatchQuestGame";
import { MathQuestGame } from "@/components/games/math/MathQuestGame";
import { MemoryGame } from "@/components/games/memory/MemoryGame";
import { ShapesColoursQuestGame } from "@/components/games/shapes/ShapesColoursQuestGame";
import { GAMES, getGame } from "@/data/games";
import type { Game } from "@/lib/games/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

/**
 * The game route.
 *
 * Every game lives at `/play/<id>` and renders inside `<GameShell>`. A built
 * game claims its id in `PLAYFIELDS` and takes the shell over, because the
 * chrome — progress, the host's reactions, the celebration — has to move with
 * the game's own state. Anything not listed here still gets the real route
 * and the real shell, with the holding stage inside it.
 */
const PLAYFIELDS: Record<string, ComponentType<{ game: Game }>> = {
  "memory-match": MemoryGame,
  "find-it": FindItGame,
  "math-quest": MathQuestGame,
  "english-quest": EnglishQuestGame,
  "logic-quest": LogicQuestGame,
  "shapes-colours-quest": ShapesColoursQuestGame,
  "match-quest": MatchQuestGame,
  "general-knowledge-quest": GeneralKnowledgeQuestGame,
};

export function generateStaticParams() {
  return GAMES.map((game) => ({ gameId: game.id }));
}

export async function generateMetadata(props: PageProps<"/play/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGame(gameId);
  /* English, at build time, like every other page's metadata: the tab's
     name is not part of the language the child chose. See `app/page.tsx`. */
  return { title: game ? translate(DEFAULT_LOCALE, game.title) : "Play" };
}

export default async function PlayPage(props: PageProps<"/play/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGame(gameId);

  if (!game) notFound();

  const Playfield = PLAYFIELDS[game.id];
  if (Playfield) return <Playfield game={game} />;

  return (
    <GameShell game={game} prompt={game.tagline}>
      <ComingSoonStage game={game} />
    </GameShell>
  );
}
