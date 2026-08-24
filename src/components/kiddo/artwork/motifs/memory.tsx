import { getCharacter } from "@/data/characters";
import { ACCENT_VARS } from "@/lib/accents";
import type { Accent, CharacterId } from "@/lib/games/types";

import { bandCentre, PROPS, SceneMark, Tile, type MotifProps } from "../scene";

/**
 * Memory Match: two of the same friend, and one still face down.
 *
 * The whole game in one picture. The pair is on the outside so that the two
 * identical cards are read as a pair rather than as a run, and the card
 * between them is the one turned over — the thing the child is about to do.
 * Nothing here is a portrait: the friend on the cards is *content*, and the
 * host beside them is the one playing.
 */

const CARD = { width: 60, height: 74, gap: 12 } as const;

export function MemoryMotif({ motif, action }: MotifProps<"memory">) {
  const centreY = bandCentre(action);
  const accent = getCharacter(motif.face).accent;
  const span = CARD.width * 3 + CARD.gap * 2;
  const left = PROPS.centerX - span / 2;
  const y = centreY - CARD.height / 2;

  const positions = [0, 1, 2].map(
    (index) => left + index * (CARD.width + CARD.gap),
  );

  return (
    <>
      {/* The pair. Tinted in the friend's own hue, the way a found pair is
          tinted inside the game, so "these two are the same" is carried by
          the colour as well as by the face. */}
      {[positions[0], positions[2]].map((x) => (
        <FaceUpCard key={x} x={x} y={y} face={motif.face} accent={accent} />
      ))}

      {/* The one still to turn. Tilted a few degrees so the row reads as
          cards on a table rather than as a chart. */}
      <g
        transform={`rotate(-5 ${positions[1] + CARD.width / 2} ${centreY})`}
      >
        <Tile
          x={positions[1]}
          y={y}
          width={CARD.width}
          height={CARD.height}
          tone="sage"
        >
          <Sparkle x={positions[1] + CARD.width / 2} y={centreY} />
        </Tile>
      </g>
    </>
  );
}

function FaceUpCard({
  x,
  y,
  face,
  accent,
}: {
  x: number;
  y: number;
  face: CharacterId;
  accent: Accent;
}) {
  return (
    <Tile x={x} y={y} width={CARD.width} height={CARD.height} tone={accent}>
      <SceneMark
        id={face}
        x={x + (CARD.width - 46) / 2}
        y={y + (CARD.height - 46) / 2}
        size={46}
      />
    </Tile>
  );
}

/**
 * The back of a card: the same paper disc and honey twinkle the real board
 * uses, so the face-down card here is the face-down card there.
 */
function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={19} fill="var(--color-paper)" opacity={0.85} />
      <path
        d="M0 -13.5C1.6 -4.7 4.7 -1.6 13.5 0C4.7 1.6 1.6 4.7 0 13.5C-1.6 4.7 -4.7 1.6 -13.5 0C-4.7 -1.6 -1.6 -4.7 0 -13.5Z"
        fill={ACCENT_VARS.honey.deep}
      />
    </g>
  );
}
