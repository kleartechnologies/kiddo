import { PAINT } from "./paint";
import { Shade } from "./shading";

/**
 * Growing things, and the one in the sky.
 *
 * All three are countable — `math.counting-objects` deals rows of trees,
 * flowers and stars — so they follow the same discipline as `things.tsx`: one
 * compact object, no scene, nothing that splits into parts a child might count
 * separately.
 *
 * The sun is the one thing in the library with no `Shade` on it, for the
 * obvious reason: it is where the light is coming from.
 *
 * The star draws its own path rather than importing `ShapePath` from
 * `ContentItemView`. That import would be a cycle — `ContentItemView` imports
 * the registry that imports this file — and ten numbers are cheaper than the
 * cycle is.
 */

export function Tree() {
  return (
    <>
      <rect x="43" y="56" width="14" height="34" rx="4" fill={PAINT.wood} />
      <circle cx="50" cy="34" r="24" fill={PAINT.green} />
      <circle cx="30" cy="48" r="19" fill={PAINT.green} />
      <circle cx="70" cy="48" r="19" fill={PAINT.green} />
      <Shade cx={50} cy={34} r={24} />
      <circle cx="40" cy="30" r="9" fill={PAINT.greenSoft} opacity="0.5" />
    </>
  );
}

export function Flower() {
  return (
    <>
      <path
        d="M50 92 L50 54"
        fill="none"
        stroke={PAINT.green}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse cx="30" cy="70" rx="13" ry="7" fill={PAINT.greenDeep} transform="rotate(-20 30 70)" />
      <g fill={PAINT.pink}>
        <ellipse cx="50" cy="18" rx="12" ry="16" />
        <ellipse cx="50" cy="58" rx="12" ry="16" />
        <ellipse cx="30" cy="38" rx="16" ry="12" />
        <ellipse cx="70" cy="38" rx="16" ry="12" />
      </g>
      <circle cx="50" cy="38" r="13" fill={PAINT.yellow} />
    </>
  );
}

export function Star() {
  return (
    <path
      d="M50 8 L61 37 L92 39 L68 59 L76 90 L50 72 L24 90 L32 59 L8 39 L39 37 Z"
      fill={PAINT.yellow}
      stroke={PAINT.yellowDeep}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}

export function Sun() {
  return (
    <>
      {/* Eight round rays, then the face the reference sheet promised: a big
          friendly sun is the whole reason a child knows what S _ N says. */}
      <g stroke={PAINT.yellowDeep} strokeWidth="7" strokeLinecap="round">
        <path d="M50 6 V17" />
        <path d="M50 83 V94" />
        <path d="M6 50 H17" />
        <path d="M83 50 H94" />
        <path d="M19 19 L27 27" />
        <path d="M73 73 L81 81" />
        <path d="M81 19 L73 27" />
        <path d="M27 73 L19 81" />
      </g>
      <circle cx="50" cy="50" r="27" fill={PAINT.yellow} />
      <circle cx="35" cy="55" r="5" fill={PAINT.blush} opacity="0.3" />
      <circle cx="65" cy="55" r="5" fill={PAINT.blush} opacity="0.3" />
      <circle cx="41" cy="46" r="3.5" fill={PAINT.ink} />
      <circle cx="59" cy="46" r="3.5" fill={PAINT.ink} />
      <path
        d="M40 57 q10 9 20 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </>
  );
}
