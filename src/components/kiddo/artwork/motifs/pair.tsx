import { ACCENT_VARS } from "@/lib/accents";

import {
  bandCentre,
  Glyph,
  PROPS,
  QuestionMark,
  Tile,
  type MotifProps,
} from "../scene";

/**
 * Match Quest: two cards that have found each other, and one still looking.
 *
 * The whole game in one picture, and the same sentence Memory Match's card
 * says with a different verb: there, two cards are the same and one is face
 * down; here, two cards *belong together* and one is waiting for its partner.
 *
 * The pair is tinted and joined by a short bar tucked behind both cards —
 * green because green is what a settled pair turns inside the game, so the
 * colour on the shelf is the colour on the card. The slot on its own keeps
 * the card's own hue, following the house rule the English card set: the one
 * accent-coloured thing in the picture is the thing the child is being asked
 * for.
 *
 * A and a, not two abstract marks, because the pack's whole content today is
 * capitals and their lower case partners — and a four year old who cannot yet
 * read the title can read the picture.
 */

const TILE = { width: 58, height: 72 } as const;
/** Almost touching: the pair has to read as one object, not as a row. */
const PAIR_GAP = 10;
/** Wide enough that the lone card is plainly not part of the pair. */
const GROUP_GAP = 30;

/** The colour a found pair turns on the board. */
const FOUND = "sprout";

export function PairMotif({ motif, accent, action }: MotifProps<"pair">) {
  const centreY = bandCentre(action);
  const span = TILE.width * 3 + PAIR_GAP + GROUP_GAP;
  const left = PROPS.centerX - span / 2;
  const y = centreY - TILE.height / 2;

  const second = left + TILE.width + PAIR_GAP;
  const lone = second + TILE.width + GROUP_GAP;

  return (
    <>
      {/* The join, drawn first so it passes behind both cards and reads as
          one link rather than as a third object between them. */}
      <rect
        x={left + TILE.width - 8}
        y={centreY - 5}
        width={PAIR_GAP + 16}
        height={10}
        rx={5}
        fill={ACCENT_VARS[FOUND].deep}
      />

      <Tile x={left} y={y} width={TILE.width} height={TILE.height} tone={FOUND}>
        <Glyph x={left + TILE.width / 2} y={centreY} size={42}>
          {motif.left}
        </Glyph>
      </Tile>

      <Tile x={second} y={y} width={TILE.width} height={TILE.height} tone={FOUND}>
        <Glyph x={second + TILE.width / 2} y={centreY} size={42}>
          {motif.right}
        </Glyph>
      </Tile>

      {/* The next one to find. Tilted a few degrees, the way Memory's
          face-down card is, so the row reads as cards on a table. */}
      <g transform={`rotate(-5 ${lone + TILE.width / 2} ${centreY})`}>
        <Tile
          x={lone}
          y={y}
          width={TILE.width}
          height={TILE.height}
          open
          accent={accent}
        >
          <QuestionMark
            x={lone + TILE.width / 2}
            y={centreY}
            size={42}
            accent={accent}
          />
        </Tile>
      </g>
    </>
  );
}
