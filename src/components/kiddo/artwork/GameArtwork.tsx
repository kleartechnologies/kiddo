import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import type { ArtMotif, Game } from "@/lib/games/types";

import { MemoryMotif } from "./motifs/memory";
import { PairMotif } from "./motifs/pair";
import { PatternMotif } from "./motifs/pattern";
import { SearchMotif } from "./motifs/search";
import { ShapesMotif } from "./motifs/shapes";
import { SumMotif } from "./motifs/sum";
import { WordMotif } from "./motifs/word";
import { WorldMotif } from "./motifs/world";
import { COMPANION, HOST, SCENE, SceneFigure, type MotifProps } from "./scene";

/**
 * A game card's illustration.
 *
 * Every card answers two questions before the child can read the title: which
 * friend lives in this game, and what the child will actually do in it. The
 * friend is drawn by the same rig as everywhere else; the doing is the motif,
 * and the motif is the bigger of the two on purpose.
 *
 * The whole picture is one SVG so the composition is fixed in its own
 * coordinates rather than in pixels: the row of cards the host is holding is
 * held at exactly the same place on a phone card and on a desktop one, and
 * nothing can grow past the bed it is drawn in.
 *
 * Adding artwork for a new game is an `artwork` entry in `data/games.ts`. A
 * new *kind* of picture — the day a game asks the child to do something none
 * of the seven motifs describe — is one file in `motifs/` and one branch
 * below. Never a new game card.
 */
export function GameArtwork({ game }: { game: Game }) {
  const artwork = game.artwork;

  if (!artwork) {
    return <CastLineUp game={game} />;
  }

  const accent = artwork.bed ?? game.accent;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      /* Bottom-aligned: however the card is proportioned, the characters keep
         their feet on the ground the bed already draws. */
      preserveAspectRatio="xMidYMax meet"
      className="relative size-full"
    >
      {/* Furthest back first. The host stands behind the things it is
          handling, which is what makes it look like it is handling them. */}
      {artwork.companion ? (
        <SceneFigure
          id={artwork.companion}
          x={COMPANION.x}
          y={HOST.y + HOST.height - COMPANION.height}
          height={COMPANION.height}
        />
      ) : null}

      <SceneFigure
        id={artwork.host}
        x={HOST.x}
        y={HOST.y}
        height={HOST.height}
        action={artwork.action}
      />

      <Motif motif={artwork.motif} accent={accent} action={artwork.action} />
    </svg>
  );
}

/**
 * The game's own things, drawn.
 *
 * One branch per `ArtMotif` kind and no default case, so the day a kind is
 * added to the vocabulary this stops compiling until it has a picture.
 */
function Motif({
  motif,
  accent,
  action,
}: {
  motif: ArtMotif;
  accent: MotifProps<ArtMotif["kind"]>["accent"];
  action: MotifProps<ArtMotif["kind"]>["action"];
}) {
  const shared = { accent, action };

  switch (motif.kind) {
    case "memory":
      return <MemoryMotif motif={motif} {...shared} />;
    case "search":
      return <SearchMotif motif={motif} {...shared} />;
    case "sum":
      return <SumMotif motif={motif} {...shared} />;
    case "word":
      return <WordMotif motif={motif} {...shared} />;
    case "pair":
      return <PairMotif motif={motif} {...shared} />;
    case "pattern":
      return <PatternMotif motif={motif} {...shared} />;
    case "shapes":
      return <ShapesMotif motif={motif} {...shared} />;
    case "world":
      return <WorldMotif motif={motif} {...shared} />;
  }
}

/**
 * The fallback, for a game with no artwork yet: the cast, standing in a row.
 *
 * It says who but never what, which is exactly why it is a fallback. A game
 * that is still `soon` has nothing to preview, and this is the honest picture
 * of that.
 */
function CastLineUp({ game }: { game: Game }) {
  return (
    <div className="relative flex -space-x-4 pb-4 sm:-space-x-5">
      {game.cast.map((id, index) => (
        <CharacterFigure
          key={id}
          id={id}
          size="md"
          className={index % 2 === 0 ? "" : "translate-y-2"}
        />
      ))}
    </div>
  );
}
