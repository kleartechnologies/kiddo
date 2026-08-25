import { PAINT } from "./paint";

/**
 * The two marks every drawing in this library shares: where the light comes
 * from, and what the thing is standing on.
 *
 * ## One light, for the whole product
 *
 * The character rig picks a direction — upper-left, `canon.ts`'s `LIGHT` — and
 * every form on KIDDO's face is lit from it. A cow drawn beside KIDDO with no
 * light at all reads as a sticker laid on top of a photograph, so the cow is
 * lit from the same place. `Shade` is that: the *unlit* face of a round form,
 * a crescent down its lower-right, and nothing else. There is no rim light and
 * there is no third stop, which is the design's rule stated twice over.
 *
 * ### Why it is a flat veil and not a gradient
 *
 * The rig can afford a radial ramp in a `<defs>` because a screen holds one
 * KIDDO. An
 * illustration is dealt eight to a board, at `1.15em` — eighteen pixels on a
 * phone — and each copy would carry its own `<defs>`, its own id, and its own
 * chance of colliding with the seven beside it. A flat veil of ink has no id,
 * costs one path, and at eighteen pixels is indistinguishable from the ramp it
 * stands in for. It is also the same mark the rest of the product already
 * makes: `bg-ink-900/10` is how a sign's ground patch is drawn.
 *
 * Ink rather than a darker tone of each hue, so that one helper works on green,
 * honey, tide and cream alike and the light stays provably the same everywhere.
 * Six percent is the whole of it — enough to turn a circle into a ball, not
 * enough to make a pale animal grey.
 *
 * ## Standing on something
 *
 * `Ground` is the other half. Before it, every animal in the library floated:
 * a head on nothing, in a tile, on a world made of land. A contact shadow is
 * the cheapest possible fix and the only honest one — it says *this is where
 * the thing meets the floor*, and it is drawn first so it is behind everything.
 *
 * It belongs to whatever stands. A fish does not stand, a bird in mid-hop does
 * not stand, and neither gets one; the drawings say so one by one rather than
 * this file guessing from a name.
 */

/** Two decimal places, so a path is a path and not a float dump. */
const n = (value: number) => Math.round(value * 100) / 100;

/**
 * How big the lit face is, in units of the form's own radius, and how far
 * toward the light its centre sits on each axis.
 *
 * These two numbers are the whole of the shading, so they are worth being
 * precise about. The lit face is a *larger* form than the one being shaded,
 * pushed up and to the left until its far edge cuts across the middle of the
 * shape — and what is left over on the far side is the crescent. That is what
 * makes it read as a ball rather than as an outline: a smaller form punched
 * out of a bigger one leaves ink all the way round the rim, however far it is
 * offset, and ink all the way round the rim is a stroke, which is the one
 * thing every drawing in this library is not allowed to have.
 *
 * The light is diagonal, so a shift of `TOWARD` on both axes moves the lit
 * face by `TOWARD * √2`. For the two edges to actually cross — a crescent
 * rather than nothing at all or a full ring — that distance has to land
 * between `REACH - 1` and `REACH + 1`. At 2.18 and 0.99 it is 1.4 against a
 * window of 1.18 to 3.18, which puts the terminator about a fifth of the way
 * in from the rim across roughly a hundred degrees of it — a shadow along one
 * side, which is what a ball has, rather than a shape lying on top of the
 * drawing, which is what a deeper crescent starts to look like at the size a
 * tile actually renders.
 */
const REACH = 2.18;
const TOWARD = 0.99;

/* Where the terminator meets the rim, in the space where the form is a unit
   circle and the light is at (-1, -1)/√2. Solved once, here, rather than
   typed in as two magic decimals that would quietly stop matching REACH and
   TOWARD the first time either moved. */
const SPAN = TOWARD * Math.SQRT2;
const ALONG = (SPAN * SPAN - REACH * REACH + 1) / (2 * SPAN);
const ACROSS = Math.sqrt(1 - ALONG * ALONG);
/** The far tip of the crescent, and — mirrored — the near one. */
const TIP_LONG = Math.SQRT1_2 * (ACROSS - ALONG);
const TIP_SHORT = Math.SQRT1_2 * (ACROSS + ALONG);

/**
 * The unlit face of a round form: everything inside it that the light misses.
 *
 * Two arcs and nothing else — out along the rim from one tip of the crescent
 * to the other, then back along the terminator. Because the shape is built
 * from the rim itself it cannot spill past the edge it belongs to, and because
 * it is a plain path it needs no clip, and therefore no id, and therefore
 * cannot collide with the seven copies of itself beside it on a board.
 *
 * Give it the same numbers as the shape it shades and place it immediately
 * after that shape, before the face.
 */
export function Shade(
  props: { cx: number; cy: number } & (
    | { r: number }
    | { rx: number; ry: number }
  ),
) {
  const { cx, cy } = props;
  const rx = "r" in props ? props.r : props.rx;
  const ry = "r" in props ? props.r : props.ry;

  const startX = n(cx + rx * TIP_LONG);
  const startY = n(cy - ry * TIP_SHORT);

  return (
    <path
      d={
        `M${startX} ${startY}` +
        `A${n(rx)} ${n(ry)} 0 0 1 ${n(cx - rx * TIP_SHORT)} ${n(cy + ry * TIP_LONG)}` +
        `A${n(rx * REACH)} ${n(ry * REACH)} 0 0 0 ${startX} ${startY}Z`
      }
      fill={PAINT.ink}
      opacity="0.06"
    />
  );
}

/**
 * Where the thing meets the floor.
 *
 * Wider than it is tall by a long way, because a shadow is a circle seen from
 * a child's eye height and not from above, and pale enough that it reads as
 * contact rather than as a second object. Draw it first.
 */
export function Ground({
  cx = 50,
  y,
  rx,
}: {
  cx?: number;
  /** The line the thing stands on. */
  y: number;
  rx: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={y}
      rx={rx}
      ry={n(rx * 0.17)}
      fill={PAINT.ink}
      opacity="0.08"
    />
  );
}
