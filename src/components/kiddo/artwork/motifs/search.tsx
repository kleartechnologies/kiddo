import { getCharacter } from "@/data/characters";

import { bandCentre, PROPS, SceneMark, Tile, type MotifProps } from "../scene";

/**
 * Find It: three friends, and a magnifier over the one being looked for.
 *
 * The target tile is bigger, tinted and lifted, and the magnifier sits on its
 * corner — three separate signals saying "this one", because the whole game is
 * picking one thing out of several and the picture has to say so before the
 * title does. The other two stay plain paper: they are the crowd, not choices
 * the child is being asked to judge here.
 */

const TARGET = { width: 66, height: 80 } as const;
const OTHER = { width: 52, height: 62 } as const;
const GAP = 12;

export function SearchMotif({ motif, action }: MotifProps<"search">) {
  const centreY = bandCentre(action);
  const span = TARGET.width + OTHER.width * 2 + GAP * 2;
  const left = PROPS.centerX - span / 2;

  const targetX = left + OTHER.width + GAP;
  const rightX = targetX + TARGET.width + GAP;
  const otherY = centreY - OTHER.height / 2;

  return (
    <>
      {[left, rightX].map((x, index) => (
        <Tile key={x} x={x} y={otherY} width={OTHER.width} height={OTHER.height}>
          <SceneMark
            id={motif.others[index]}
            x={x + (OTHER.width - 38) / 2}
            y={otherY + (OTHER.height - 38) / 2}
            size={38}
          />
        </Tile>
      ))}

      <Tile
        x={targetX}
        y={centreY - TARGET.height / 2}
        width={TARGET.width}
        height={TARGET.height}
        tone={getCharacter(motif.target).accent}
      >
        <SceneMark
          id={motif.target}
          x={targetX + (TARGET.width - 52) / 2}
          y={centreY - TARGET.height / 2 + (TARGET.height - 52) / 2}
          size={52}
        />
      </Tile>

      {/* On the corner of the tile, clear of the face: the cue says which
          one, it does not cover the one it is pointing out. */}
      <Magnifier x={targetX + TARGET.width - 12} y={centreY + TARGET.height / 2 - 8} />
    </>
  );
}

/**
 * The search cue: a ring and a handle, in ink.
 *
 * Ink rather than an accent because it has to survive the card shrinking to a
 * third of a phone screen, and because a magnifier is an instrument, not one
 * of the coloured things being sorted.
 */
function Magnifier({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={19} fill="var(--color-paper)" opacity={0.5} />
      <circle
        r={19}
        fill="none"
        stroke="var(--color-ink-900)"
        strokeWidth={5.5}
      />
      <path
        d="M13.5 13.5 L27 27"
        fill="none"
        stroke="var(--color-ink-900)"
        strokeWidth={7}
        strokeLinecap="round"
      />
    </g>
  );
}
