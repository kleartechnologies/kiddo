import {
  bandCentre,
  Glyph,
  PROPS,
  QuestionMark,
  Tile,
  type MotifProps,
} from "../scene";

/**
 * English Quest: a word with a letter missing — C _ T.
 *
 * Three tiles, two letters and a gap. The two letters take different hues so
 * the card reads as "letters" rather than as "a word", which is the honest
 * description of a game that asks about single letters as often as about
 * whole words.
 */

const TILE = { width: 60, height: 72 } as const;
const GAP = 13;

/**
 * The two letters either side of the gap, each in its own hue.
 *
 * Neither is the card's own hue: the one accent-coloured thing in the picture
 * has to be the gap, because the gap is what the child is being asked for.
 */
const LETTER_TONES = ["tide", "honey"] as const;

export function WordMotif({ motif, accent, action }: MotifProps<"word">) {
  const centreY = bandCentre(action);
  const span = TILE.width * 3 + GAP * 2;
  const left = PROPS.centerX - span / 2;
  const y = centreY - TILE.height / 2;

  const middle = left + TILE.width + GAP;
  const last = middle + TILE.width + GAP;

  return (
    <>
      <Tile
        x={left}
        y={y}
        width={TILE.width}
        height={TILE.height}
        tone={LETTER_TONES[0]}
      >
        <Glyph x={left + TILE.width / 2} y={centreY} size={44}>
          {motif.letters[0]}
        </Glyph>
      </Tile>

      <Tile
        x={middle}
        y={y}
        width={TILE.width}
        height={TILE.height}
        open
        accent={accent}
      >
        <QuestionMark
          x={middle + TILE.width / 2}
          y={centreY}
          size={42}
          accent={accent}
        />
      </Tile>

      <Tile
        x={last}
        y={y}
        width={TILE.width}
        height={TILE.height}
        tone={LETTER_TONES[1]}
      >
        <Glyph x={last + TILE.width / 2} y={centreY} size={44}>
          {motif.letters[1]}
        </Glyph>
      </Tile>
    </>
  );
}
