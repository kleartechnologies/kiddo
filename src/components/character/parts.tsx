import { BLUSH, HONEY, INK, OVERLAY } from "./canon";

/**
 * The reusable character layers.
 *
 * One character, drawn as separable parts, so a new emotion costs a few
 * shapes rather than a new illustration. Every part is authored around its
 * own pivot at (0,0) where it rotates, or in absolute body coordinates where
 * it does not.
 *
 * These are plain SVG fragments with no motion and no state, so they can be
 * rendered from a server component. `Kiddo` is what animates them.
 */

interface HueProps {
  hue: string;
}

/** Contact shadow. Sits on the floor, never on the character. */
export function Shadow({ opacity = 0.07 }: { opacity?: number }) {
  return <ellipse cx={100} cy={212} rx={46} ry={8} fill={INK} opacity={opacity} />;
}

/**
 * One ear. Split out of the body so it can trail the breathe by 120ms, which
 * is most of what makes the character read as alive rather than as a graphic.
 */
export function Ear({ side, hue }: HueProps & { side: "left" | "right" }) {
  const cx = side === "left" ? 62 : 138;
  return (
    <>
      <circle cx={cx} cy={60} r={23} fill={hue} />
      <circle cx={cx} cy={60} r={11} fill="#FFFFFF" opacity={OVERLAY.innerEar} />
    </>
  );
}

/** The core mass with its belly overlay. One shape, not a head on a body. */
export function Body({ hue }: HueProps) {
  return (
    <>
      <ellipse cx={100} cy={118} rx={56} ry={54} fill={hue} />
      <ellipse cx={100} cy={140} rx={33} ry={27} fill="#FFFFFF" opacity={OVERLAY.belly} />
    </>
  );
}

/** Arm, authored around its shoulder pivot at (0,0). Shared with the cast. */
export function Arm({ hue }: HueProps) {
  return (
    <>
      <rect x={-10} y={-8} width={20} height={44} rx={10} fill={hue} />
      <circle cx={0} cy={40} r={12.5} fill={hue} />
    </>
  );
}

/** Leg, authored around its hip pivot at (0,0). Shared with the cast. */
export function Leg({ hue }: HueProps) {
  return (
    <>
      <rect x={-12} y={-10} width={24} height={32} rx={12} fill={hue} />
      <ellipse cx={0} cy={28} rx={17} ry={12} fill={hue} />
    </>
  );
}

/** Cheeks. The one warm thing on the face; opacity carries the intensity. */
export function Cheeks({ opacity = 0.32, r = 10 }: { opacity?: number; r?: number }) {
  return (
    <>
      <circle cx={58} cy={130} r={r} fill={BLUSH} opacity={opacity} />
      <circle cx={142} cy={130} r={r} fill={BLUSH} opacity={opacity} />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Effect layers
   Optional, and always separate from the face, so an expression can be used
   with or without its atmosphere. Kept deliberately sparse: at most three
   marks, never a particle system.
   ------------------------------------------------------------------------ */

export type EffectId = "thought" | "sleep" | "sparkle" | "confetti" | "reward";

/** A confetti/sparkle mark: one rounded square on its corner. */
function Diamond({
  x,
  y,
  size,
  fill,
}: {
  x: number;
  y: number;
  size: number;
  fill: string;
}) {
  const half = size / 2;
  return (
    <rect
      x={-half}
      y={-half}
      width={size}
      height={size}
      rx={size / 4}
      transform={`translate(${x},${y}) rotate(45)`}
      fill={fill}
    />
  );
}

/** Rising dots. Three sizes, three opacities, no text and no "?" glyph. */
function Dots({
  points,
}: {
  points: { x: number; y: number; r: number; o: number }[];
}) {
  return (
    <>
      {points.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={p.r} fill={INK} opacity={p.o} />
      ))}
    </>
  );
}

export function Effect({ id }: { id: EffectId }) {
  switch (id) {
    case "thought":
      return (
        <Dots
          points={[
            { x: 156, y: 74, r: 4, o: 0.2 },
            { x: 170, y: 58, r: 6, o: 0.16 },
            { x: 186, y: 40, r: 8.5, o: 0.12 },
          ]}
        />
      );
    case "sleep":
      return (
        <Dots
          points={[
            { x: 152, y: 70, r: 5, o: 0.18 },
            { x: 166, y: 56, r: 7, o: 0.14 },
            { x: 182, y: 40, r: 9, o: 0.1 },
          ]}
        />
      );
    case "sparkle":
      return (
        <>
          <Diamond x={40} y={84} size={10} fill={HONEY} />
          <Diamond x={164} y={70} size={8} fill={HONEY} />
        </>
      );
    case "confetti":
      return (
        <>
          <Diamond x={34} y={60} size={10} fill={HONEY} />
          <Diamond x={172} y={48} size={8} fill="#EFA6AB" />
          <Diamond x={150} y={22} size={8} fill="#8FBAD9" />
        </>
      );
    case "reward":
      return <Diamond x={100} y={22} size={20} fill={HONEY} />;
  }
}
