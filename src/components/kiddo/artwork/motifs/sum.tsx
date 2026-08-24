import {
  bandCentre,
  Glyph,
  PROPS,
  QuestionMark,
  Tile,
  type MotifProps,
} from "../scene";

/**
 * Math Quest: a sum with its answer still missing.
 *
 * Two numbers, a sign, and an empty slot — the smallest thing that can be
 * read as "this is about numbers" from across a room, and still be a real
 * question a five-year-old could answer. The numerals are the biggest marks
 * on the card on purpose: at a third of a phone screen the tiles blur into
 * shapes and the digits are what survives.
 */

const TILE = { width: 56, height: 68 } as const;
const SIGN = 25;

export function SumMotif({ motif, accent, action }: MotifProps<"sum">) {
  const centreY = bandCentre(action);
  const span = TILE.width * 3 + SIGN * 2;
  const left = PROPS.centerX - span / 2;
  const y = centreY - TILE.height / 2;

  const first = left;
  const second = left + TILE.width + SIGN;
  const answer = second + TILE.width + SIGN;

  return (
    <>
      <Tile x={first} y={y} width={TILE.width} height={TILE.height} tone={accent}>
        <Glyph x={first + TILE.width / 2} y={centreY} size={42}>
          {motif.left}
        </Glyph>
      </Tile>

      <Glyph x={first + TILE.width + SIGN / 2} y={centreY} size={32}>
        {motif.operation}
      </Glyph>

      <Tile
        x={second}
        y={y}
        width={TILE.width}
        height={TILE.height}
        tone={accent}
      >
        <Glyph x={second + TILE.width / 2} y={centreY} size={42}>
          {motif.right}
        </Glyph>
      </Tile>

      <Glyph x={second + TILE.width + SIGN / 2} y={centreY} size={32}>
        =
      </Glyph>

      <Tile
        x={answer}
        y={y}
        width={TILE.width}
        height={TILE.height}
        open
        accent={accent}
      >
        <QuestionMark
          x={answer + TILE.width / 2}
          y={centreY}
          size={40}
          accent={accent}
        />
      </Tile>
    </>
  );
}
