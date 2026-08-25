import { BLUSH, HONEY, INK, LIGHT, creamOf, shadesOf } from "./canon";

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

/* --------------------------------------------------------------------------
   Paint

   Every rounded form is lit from one direction, which in SVG means a radial
   gradient, which means an id. The id is derived from the hue rather than
   from `useId` for two reasons: `Friend` is a server component and cannot
   call a hook, and a hue-keyed id means the server and the client always
   agree on the markup. Two characters of the same hue on one page therefore
   declare the same id twice — identical definitions, so a reference resolves
   to the same paint either way.

   Every fill names the flat hue as its fallback, so a part drawn into an SVG
   that forgot its `<Palette>` is a flat character rather than a black one.
   The cream is keyed the same way, because each character carries its own —
   see `creamOf` in the canon.
   ----------------------------------------------------------------------- */

const key = (hue: string) => hue.replace("#", "").toLowerCase();

/** The lit hue. Bodies, heads, ears — anything with mass. */
export const skin = (hue: string) => `url(#kd-skin-${key(hue)}) ${hue}`;

/** The lit cream for a hue. Bellies, muzzles and inner ears. */
export const cream = (hue: string) => `url(#kd-cream-${key(hue)}) ${creamOf(hue).light}`;

/**
 * The gradients one character needs. Render once per `<svg>`, before the
 * drawing. Cheap: two `<radialGradient>` elements, no filters.
 */
export function Palette({ hue }: HueProps) {
  const shade = shadesOf(hue);
  const tint = creamOf(hue);
  return (
    <defs>
      <radialGradient id={`kd-skin-${key(hue)}`} cx={LIGHT.cx} cy={LIGHT.cy} r={LIGHT.r}>
        <stop offset="0" stopColor={shade.light} />
        <stop offset="0.62" stopColor={shade.base} />
        <stop offset="1" stopColor={shade.deep} />
      </radialGradient>
      <radialGradient id={`kd-cream-${key(hue)}`} cx="38%" cy="26%" r="84%">
        <stop offset="0" stopColor={tint.light} />
        <stop offset="1" stopColor={tint.deep} />
      </radialGradient>
    </defs>
  );
}

/* --------------------------------------------------------------------------
   Body parts
   ----------------------------------------------------------------------- */

/** Contact shadow. Sits on the floor, never on the character. */
export function Shadow({ rx = 56, opacity = 0.07 }: { rx?: number; opacity?: number }) {
  return <ellipse cx={100} cy={231} rx={rx} ry={8} fill={INK} opacity={opacity} />;
}

/**
 * One ear. Split out of the body so it can trail the breathe by 120ms, which
 * is most of what makes the character read as alive rather than as a graphic.
 */
export function Ear({ side, hue }: HueProps & { side: "left" | "right" }) {
  const cx = side === "left" ? 55 : 145;
  return (
    <>
      <circle cx={cx} cy={45} r={24} fill={skin(hue)} />
      <circle cx={cx} cy={47} r={13} fill={cream(hue)} />
    </>
  );
}

/**
 * The torso: one soft-shouldered mass with a cream belly.
 *
 * Shared with the cast, because a fox and a bear cub are the same child-shaped
 * body under different heads — which is exactly why they read as a family.
 */
export function Torso({ hue }: HueProps) {
  return (
    <>
      <path
        d="M100,116 C143,116 160,148 160,180 C160,210 133,226 100,226 C67,226 40,210 40,180 C40,148 57,116 100,116 Z"
        fill={skin(hue)}
      />
      <ellipse cx={100} cy={188} rx={35} ry={31} fill={cream(hue)} />
    </>
  );
}

/**
 * The head, with the muzzle the face is built on.
 *
 * The head is 48% of the frame's width — the single biggest change from v1,
 * and the reason the eyes can be twice the size without crowding.
 */
export function Head({
  hue,
  muzzle = { rx: 28, ry: 20, cy: 115 },
}: HueProps & { muzzle?: { rx: number; ry: number; cy: number } | null }) {
  return (
    <>
      <circle cx={100} cy={90} r={58} fill={skin(hue)} />
      {muzzle ? (
        <ellipse cx={100} cy={muzzle.cy} rx={muzzle.rx} ry={muzzle.ry} fill={cream(hue)} />
      ) : null}
    </>
  );
}

/**
 * KIDDO's satchel, and the strap that carries it.
 *
 * The one identity marker on the brand character: a small bag with a star on
 * it, because KIDDO is going somewhere and collecting things on the way. It
 * keeps its own colour under a recolour — a satchel is a satchel.
 */
const SATCHEL = { bag: "#5C9448", strap: "#5C9448" };

export function Satchel() {
  return (
    <>
      <path
        d="M70,126 Q101,152 132,130"
        stroke={SATCHEL.strap}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      <rect x={48} y={158} width={36} height={32} rx={10} fill={SATCHEL.bag} />
      <path
        d="M66,164 l3.4,6.8 7.6,1.1 -5.5,5.4 1.3,7.5 -6.8,-3.6 -6.8,3.6 1.3,-7.5 -5.5,-5.4 7.6,-1.1 Z"
        fill={HONEY}
      />
    </>
  );
}

/** The whole of KIDDO below the face: torso, satchel, head, muzzle. */
export function Body({ hue }: HueProps) {
  return (
    <>
      <Torso hue={hue} />
      <Satchel />
      <Head hue={hue} />
    </>
  );
}

/** Arm, authored around its shoulder pivot at (0,0). Shared with the cast. */
export function Arm({ hue }: HueProps) {
  return (
    <rect x={-12.5} y={-6} width={25} height={56} rx={12.5} fill={shadesOf(hue).limb} />
  );
}

/** Leg, authored around its hip pivot at (0,0). Shared with the cast. */
export function Leg({ hue }: HueProps) {
  return <rect x={-16} y={0} width={32} height={40} rx={16} fill={shadesOf(hue).deep} />;
}

/** Cheeks. The one warm thing on the face; opacity carries the intensity. */
export function Cheeks({
  opacity = 0.5,
  x = 45,
  y = 109,
  rx = 12,
  ry = 8.5,
}: {
  opacity?: number;
  /** Distance either side of the midline. */
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
}) {
  return (
    <>
      <ellipse cx={100 - x} cy={y} rx={rx} ry={ry} fill={BLUSH} opacity={opacity} />
      <ellipse cx={100 + x} cy={y} rx={rx} ry={ry} fill={BLUSH} opacity={opacity} />
    </>
  );
}

/**
 * The nose.
 *
 * Part of the face layer rather than the head, because it moves with the
 * gaze: when KIDDO looks off to one side the nose goes with the eyes, and a
 * nose welded to the muzzle is what makes a turned head look broken.
 */
export function Nose({
  cx = 100,
  cy = 106,
  rx = 8.5,
  ry = 6.4,
}: {
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} />;
}

/* ---------------------------------------------------------------------------
   Effect layers
   Optional, and always separate from the face, so an expression can be used
   with or without its atmosphere. Kept deliberately sparse: at most three
   marks, never a particle system.
   ------------------------------------------------------------------------ */

export type EffectId = "thought" | "sleep" | "sparkle" | "confetti" | "reward";

/**
 * A five-point star: the one reward mark, drawn once and scaled.
 *
 * The path is the star from the character sheet, verbatim, with its own top
 * tip at (40,58) and its optical centre at (40,66); the transform moves that
 * centre to (x,y) and scales it, so callers place a star by where it looks
 * like it is rather than by where its first point happens to be.
 */
const STAR =
  "M40,58 l2.6,5.2 5.8,0.9 -4.2,4.1 1,5.7 -5.2,-2.7 -5.2,2.7 1,-5.7 -4.2,-4.1 5.8,-0.9 Z";

function Star({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  const scale = size / 11.6;
  return (
    <path
      d={STAR}
      transform={`translate(${x},${y}) scale(${scale}) translate(-40,-66)`}
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
            { x: 162, y: 56, r: 4, o: 0.2 },
            { x: 176, y: 40, r: 6, o: 0.16 },
            { x: 191, y: 22, r: 8.5, o: 0.12 },
          ]}
        />
      );
    case "sleep":
      return (
        <Dots
          points={[
            { x: 158, y: 52, r: 5, o: 0.18 },
            { x: 172, y: 38, r: 7, o: 0.14 },
            { x: 187, y: 22, r: 9, o: 0.1 },
          ]}
        />
      );
    case "sparkle":
      return (
        <>
          <Star x={40} y={66} size={14} fill={HONEY} />
          <Star x={160} y={58} size={12} fill={HONEY} />
        </>
      );
    case "confetti":
      return (
        <>
          <Star x={34} y={48} size={15} fill={HONEY} />
          <Star x={168} y={38} size={12} fill="#F49BB4" />
          <Star x={148} y={14} size={11} fill="#62A6DC" />
        </>
      );
    case "reward":
      return <Star x={100} y={20} size={26} fill={HONEY} />;
  }
}
