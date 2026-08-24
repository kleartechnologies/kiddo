import { ShapePath } from "@/components/games/engines/ContentItemView";

import { bandCentre, type MotifProps } from "../scene";

/**
 * Shapes & Colours Quest: four shapes, four colours, nothing else.
 *
 * The only card in the family with no tiles and no slots. The shapes are the
 * whole picture — as big as the bed allows, in the house colours the game
 * itself uses — because "circle, square, triangle, star" is a thing a
 * three-year-old can name, and putting them on paper would only shrink them.
 *
 * Laid out as a block of four rather than as a row, which is what keeps it
 * instantly distinguishable from the Logic card's run of shapes.
 */

const SIZE = 0.72;
const COLUMNS = [199, 279] as const;
const ROWS = [-40, 40] as const;

export function ShapesMotif({ motif, action }: MotifProps<"shapes">) {
  const centreY = bandCentre(action);

  return (
    <>
      {motif.shapes.map((shape, index) => (
        <ShapePath
          key={`${shape}-${index}`}
          shape={shape}
          factor={SIZE}
          at={{
            x: COLUMNS[index % 2],
            y: centreY + ROWS[Math.floor(index / 2)],
          }}
        />
      ))}
    </>
  );
}
