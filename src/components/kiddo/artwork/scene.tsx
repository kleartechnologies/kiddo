import { getCharacter } from "@/data/characters";
import { Friend, type FriendId } from "@/components/character/Friend";
import { Kiddo } from "@/components/character/Kiddo";
import { VIEWBOX } from "@/components/character/canon";
import type { Pose } from "@/components/character/poses";
import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Accent, ArtAction, ArtMotif, CharacterId } from "@/lib/games/types";

/**
 * The stage every game card's picture is built on.
 *
 * One coordinate system for the whole illustration — the character and the
 * things it is handling are drawn in the same 360x200 box — because that is
 * what makes the composition survive a card that is 335px wide on a phone and
 * 347px on a desktop. Nothing here is sized in pixels or steps at a
 * breakpoint: the scene scales as a whole, so a hand that reaches a card at
 * one size reaches it at every size, and nothing can ever overflow the bed.
 *
 * The pieces below are the entire vocabulary a motif may draw with. A new
 * motif reaches for these; it does not invent a second kind of tile.
 */

/** The drawing area. Wider than it is tall, and bottom-weighted. */
export const SCENE = { width: 360, height: 200 } as const;

/**
 * Where the host stands: hard left, feet on the bed's own ground.
 *
 * Every card in the family uses this one spot, so the library reads as a
 * shelf of one product rather than seven loose illustrations.
 */
export const HOST = { x: 4, y: 26, height: 158 } as const;

/** A second character, further back and smaller, on the other side. */
export const COMPANION = { height: 98, x: 266 } as const;

/**
 * The space the game's own objects live in.
 *
 * It starts a few units inside the host, so the things overlap the character
 * rather than standing beside it — the whole difference between a friend
 * *holding* the cards and a friend photographed next to them. `centerY` is
 * KIDDO's shoulder line at this scale, which is why a pointing hand lands on
 * the row instead of above or below it.
 */
export const PROPS = {
  left: 130,
  right: 348,
  centerX: 239,
  centerY: 103,
  width: 218,
} as const;

/** KIDDO's poses, by what the card is showing. The friends ignore this. */
const HOST_POSES: Record<ArtAction, Pose> = {
  pointing: "point",
  holding: "hint",
};

/**
 * Held things sit a little lower than pointed-at things: at hand height for a
 * character whose arms are down, rather than at the shoulder a pointing arm
 * reaches along.
 */
export function bandCentre(action: ArtAction): number {
  return action === "holding" ? PROPS.centerY + 8 : PROPS.centerY;
}

/**
 * A character, in scene units.
 *
 * `CharacterFigure` is still the only place that decides how a character is
 * drawn on a *page*; this is the same decision made in SVG user space, which
 * a CSS-sized figure cannot be. It draws the same production rig, and honours
 * a hand-drawn override the same way, so nothing here can drift from the rest
 * of the product.
 */
export function SceneFigure({
  id,
  x,
  y,
  height,
  action,
}: {
  id: CharacterId;
  x: number;
  y: number;
  height: number;
  /** Only KIDDO acts it out. The friends have one canonical pose. */
  action?: ArtAction;
}) {
  const character = getCharacter(id);
  const width = (height * VIEWBOX.width) / VIEWBOX.height;

  if (character.art.src) {
    return (
      <image
        href={character.art.src}
        x={x}
        y={y}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMax meet"
      />
    );
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      {id === "kiddo" ? (
        /* No atmosphere on a card: confetti behind a title is noise. */
        <Kiddo
          size={width}
          pose={action ? HOST_POSES[action] : "idle"}
          effect="none"
        />
      ) : (
        <Friend id={id as FriendId} size={width} />
      )}
    </g>
  );
}

/**
 * A character's head mark, in scene units.
 *
 * The icon crop the rig already ships — ears, eyes, mouth and nothing else —
 * which is exactly what belongs on something as small as a card on a card.
 */
export function SceneMark({
  id,
  x,
  y,
  size,
}: {
  id: CharacterId;
  x: number;
  y: number;
  size: number;
}) {
  const character = getCharacter(id);

  if (character.art.src) {
    return (
      <image
        href={character.art.src}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      {id === "kiddo" ? (
        /* Still: a card in an illustration is a drawing of a card, and a
           blinking one would pull the eye off the game's own title. */
        <Kiddo variant="compact" size={size} alive={false} />
      ) : (
        <Friend id={id as FriendId} variant="compact" size={size} />
      )}
    </g>
  );
}

/**
 * One thing on the table: a card, a letter, a number.
 *
 * The same tactile toy surface `ChoiceTile` gives the child inside the game —
 * paper, a hairline edge, and a solid bottom lip — so the objects on the card
 * are recognisably the objects they will tap. `tone` tints the face; `open`
 * hollows it out into a slot that is waiting for an answer.
 */
export function Tile({
  x,
  y,
  width,
  height,
  tone,
  open = false,
  accent = "sage",
  radius = 12,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Accent whose `soft` step fills the face. Paper when left out. */
  tone?: Accent;
  /** Draws it as an empty slot: dashed, no lip, nothing decided yet. */
  open?: boolean;
  /** The hue an open slot is dashed in. */
  accent?: Accent;
  radius?: number;
  children?: React.ReactNode;
}) {
  if (open) {
    return (
      <>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={radius}
          fill={ACCENT_VARS[accent].soft}
          stroke={ACCENT_VARS[accent].deep}
          strokeWidth={3}
          strokeDasharray="9 7"
          strokeLinecap="round"
        />
        {children}
      </>
    );
  }

  return (
    <>
      {/* The lip. Same 4-unit solid edge every tappable surface in KIDDO has. */}
      <rect
        x={x}
        y={y + 5}
        width={width}
        height={height}
        rx={radius}
        fill="var(--color-edge)"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        fill={tone ? ACCENT_VARS[tone].soft : "var(--color-paper)"}
        stroke={tone ? ACCENT_VARS[tone].base : "var(--color-edge)"}
        strokeWidth={2.5}
      />
      {children}
    </>
  );
}

/**
 * A numeral, a letter or a sign, drawn.
 *
 * Display type, ink, centred on a point. Deliberately the only text the
 * artwork may contain: a picture that needs a sentence has already failed the
 * four-year-old it was drawn for.
 */
export function Glyph({
  x,
  y,
  size,
  tone,
  children,
  className,
}: {
  x: number;
  y: number;
  size: number;
  /** Ink unless a hue is named. Ink is right for almost everything. */
  tone?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
      fill={tone ?? "var(--color-ink-900)"}
      className={cn("font-display", className)}
    >
      {children}
    </text>
  );
}

/** The mark on a slot nothing has been put in yet. */
export function QuestionMark({
  x,
  y,
  size,
  accent,
}: {
  x: number;
  y: number;
  size: number;
  accent: Accent;
}) {
  return (
    <Glyph x={x} y={y} size={size} tone={ACCENT_VARS[accent].deep}>
      ?
    </Glyph>
  );
}

/**
 * Evenly spaced slot centres across the props zone.
 *
 * Every motif lays its things out with this, which is what gives the family
 * its shared rhythm: four shapes on the Logic card and three tiles on the
 * English card sit on the same grid and take up the same room.
 */
export function slots(
  count: number,
  span: number = PROPS.width,
  centre: number = PROPS.centerX,
) {
  const step = span / count;
  const start = centre - span / 2 + step / 2;
  return Array.from({ length: count }, (_, index) => start + index * step);
}

/**
 * What every motif is handed.
 *
 * One shape for all of them, so the dispatcher never has to know what a
 * particular picture needs: the objects to draw, the card's hue for the slot
 * that is still waiting for an answer, and whether the host is pointing at
 * the row or holding it.
 */
export interface MotifProps<K extends ArtMotif["kind"]> {
  motif: Extract<ArtMotif, { kind: K }>;
  accent: Accent;
  action: ArtAction;
}
