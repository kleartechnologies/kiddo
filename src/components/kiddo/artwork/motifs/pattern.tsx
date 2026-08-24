import { ShapePath } from "@/components/games/engines/ContentItemView";
import { ACCENT_VARS } from "@/lib/accents";

import {
  bandCentre,
  PROPS,
  QuestionMark,
  Tile,
  slots,
  type MotifProps,
} from "../scene";

/**
 * Logic Quest: a pattern with the next piece missing.
 *
 * Circle, square, circle, and a slot. The three shapes sit on one strip so
 * the eye reads them as a run rather than as a set — the difference between
 * this card and the Shapes & Colours one, which shows the same vocabulary of
 * shapes arranged as a cluster.
 *
 * The shapes are drawn by the content layer's own `ShapePath`, in their house
 * colours, so the pattern on the card is made of the same pieces as the
 * pattern inside the game. Nothing here is confused or stuck: the picture is
 * a puzzle waiting, not a character struggling.
 */

const STRIP = { height: 74, radius: 24 } as const;
const SHAPE = 0.42;
const SLOT = 44;

export function PatternMotif({ motif, accent, action }: MotifProps<"pattern">) {
  const centreY = bandCentre(action);
  const centres = slots(4, PROPS.width - 24);

  return (
    <Tile
      x={PROPS.left}
      y={centreY - STRIP.height / 2}
      width={PROPS.width}
      height={STRIP.height}
      radius={STRIP.radius}
    >
      {motif.sequence.map((shape, index) => (
        <ShapePath
          key={`${shape}-${index}`}
          shape={shape}
          factor={SHAPE}
          at={{ x: centres[index], y: centreY }}
        />
      ))}

      {/* What comes next. The same dashed slot the sums and the spellings
          use, so "your turn" looks the same on every card in the library. */}
      <rect
        x={centres[3] - SLOT / 2}
        y={centreY - SLOT / 2}
        width={SLOT}
        height={SLOT}
        rx={13}
        fill={ACCENT_VARS[accent].soft}
        stroke={ACCENT_VARS[accent].deep}
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeLinecap="round"
      />
      <QuestionMark x={centres[3]} y={centreY} size={30} accent={accent} />
    </Tile>
  );
}
