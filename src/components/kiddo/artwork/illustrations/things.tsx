import { PAINT } from "./paint";
import { Shade } from "./shading";

/**
 * The things that are not alive: two foods and three objects.
 *
 * Same rules as `animals.tsx` — one 100-unit box, flat token fills, no outline
 * and no gradient — with one extra job. Four of these five are also *countable*:
 * `math.counting-objects` draws a row of apples at level one, so each one has
 * to stay a single readable object when it is repeated five times across a
 * phone-width stage. That is why nothing here has a face, a scene or a part a
 * child could count twice, and why each sits inside the box rather than filling
 * it corner to corner: a row of them needs the air between.
 *
 * A round thing carries `Shade` — the product's one light direction, from
 * `shading.tsx` — on its largest form. A flat-sided one does not: a crescent
 * laid across a cardboard box reads as a smudge, and a box already has its two
 * tones where its two faces meet. The small bright ellipse an apple and an
 * orange wear is a different mark and stays: that is a shine on a wet skin, not
 * a stop in a ramp.
 */

export function Apple() {
  return (
    <>
      <path
        d="M50 32 q-4 -12 -14 -18"
        fill="none"
        stroke={PAINT.wood}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M52 30 q14 -12 22 -4 q-8 12 -22 4 Z" fill={PAINT.green} />
      {/* Two lobes rather than one circle, so an apple is not an orange. */}
      <circle cx="35" cy="58" r="27" fill={PAINT.pinkDeep} />
      <circle cx="65" cy="58" r="27" fill={PAINT.pinkDeep} />
      <rect x="35" y="31" width="30" height="54" fill={PAINT.pinkDeep} />
      <Shade cx={50} cy={58} rx={30} ry={25} />
      <ellipse cx="36" cy="48" rx="7" ry="10" fill={PAINT.pinkSoft} opacity="0.55" transform="rotate(-20 36 48)" />
    </>
  );
}

export function Egg() {
  return (
    <>
      {/* A cracked shell with a yolk showing, because a plain white oval at
          tile size is a stone. */}
      <path
        d="M50 14 C70 14 80 44 80 60 A30 34 0 0 1 20 60 C20 44 30 14 50 14 Z"
        fill={PAINT.paper}
        stroke={PAINT.stone}
        strokeWidth="2.5"
      />
      <path
        d="M20 56 L32 50 L40 58 L50 48 L60 58 L70 50 L80 56"
        fill="none"
        stroke={PAINT.stone}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="36" r="11" fill={PAINT.yellow} />
    </>
  );
}

export function Ball() {
  return (
    <>
      <circle cx="50" cy="50" r="34" fill={PAINT.paper} stroke={PAINT.stone} strokeWidth="2.5" />
      {/* The five-panel football, drawn as one centre pentagon and five around
          the rim: the pattern is what makes it a ball and not a moon. */}
      <path d="M50 32 L64 42 L59 58 L41 58 L36 42 Z" fill={PAINT.inkSoft} />
      <g fill={PAINT.inkSoft}>
        <path d="M50 16 L64 24 L64 42 Z" />
        <path d="M50 16 L36 24 L36 42 Z" />
        <path d="M82 54 L67 62 L59 58 L64 42 Z" />
        <path d="M18 54 L33 62 L41 58 L36 42 Z" />
        <path d="M50 84 L38 74 L41 58 L59 58 L62 74 Z" />
      </g>
      <Shade cx={50} cy={50} r={34} />
    </>
  );
}

export function Hat() {
  return (
    <>
      <ellipse cx="50" cy="70" rx="42" ry="12" fill={PAINT.blueDeep} />
      <path
        d="M28 68 L28 34 A22 22 0 0 1 72 34 L72 68 Z"
        fill={PAINT.blue}
      />
      <rect x="26" y="56" width="48" height="11" rx="3" fill={PAINT.yellow} />
    </>
  );
}

export function Car() {
  return (
    <>
      <path
        d="M32 46 L40 28 A4 4 0 0 1 44 26 L64 26 A4 4 0 0 1 68 29 L72 46 Z"
        fill={PAINT.blueSoft}
      />
      <rect x="10" y="44" width="80" height="26" rx="10" fill={PAINT.pinkDeep} />
      <rect x="42" y="28" width="4" height="18" fill={PAINT.pinkDeep} />
      <circle cx="30" cy="72" r="12" fill={PAINT.ink} />
      <circle cx="70" cy="72" r="12" fill={PAINT.ink} />
      <circle cx="30" cy="72" r="5" fill={PAINT.paper} />
      <circle cx="70" cy="72" r="5" fill={PAINT.paper} />
      <circle cx="84" cy="54" r="5" fill={PAINT.yellow} />
    </>
  );
}

export function Cake() {
  return (
    <>
      <ellipse cx="50" cy="88" rx="40" ry="6" fill={PAINT.edge} />
      <rect x="16" y="62" width="68" height="24" rx="7" fill={PAINT.pinkDeep} />
      <rect x="22" y="44" width="56" height="20" rx="6" fill={PAINT.pink} />
      <ellipse cx="50" cy="44" rx="28" ry="7" fill={PAINT.cream} />
      {/* One candle, because a cake with none is a pudding. */}
      <rect x="47" y="18" width="6" height="18" rx="3" fill={PAINT.blueSoft} />
      <ellipse cx="50" cy="14" rx="4" ry="6" fill={PAINT.yellow} />
      <g fill={PAINT.yellow}>
        <circle cx="32" cy="72" r="2.5" />
        <circle cx="50" cy="76" r="2.5" />
        <circle cx="68" cy="72" r="2.5" />
      </g>
    </>
  );
}

export function Banana() {
  return (
    <>
      {/* One thick crescent with a stalk: the shape is the whole word. */}
      <path
        d="M26 24 Q22 62 52 78 Q78 88 88 64 Q80 72 60 66 Q36 58 34 24 Z"
        fill={PAINT.yellow}
      />
      <path
        d="M52 78 Q78 88 88 64"
        fill="none"
        stroke={PAINT.yellowDeep}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* The stalk end a bunch hangs from. */}
      <rect x="24" y="15" width="12" height="12" rx="3" fill={PAINT.wood} />
    </>
  );
}

export function Strawberry() {
  return (
    <>
      {/* The leafy crown, then the berry: broad shoulders, one soft point. */}
      <ellipse cx="31" cy="30" rx="12" ry="6" fill={PAINT.green} transform="rotate(-24 31 30)" />
      <ellipse cx="69" cy="30" rx="12" ry="6" fill={PAINT.green} transform="rotate(24 69 30)" />
      <rect x="46" y="14" width="8" height="16" rx="4" fill={PAINT.green} />
      <path
        d="M50 90 C27 77 20 52 27 41 Q38 30 50 30 Q62 30 73 41 C80 52 73 77 50 90 Z"
        fill={PAINT.pinkDeep}
      />
      <Shade cx={50} cy={58} rx={22} ry={28} />
      {/* Seeds. */}
      <g fill={PAINT.yellowSoft}>
        <ellipse cx="40" cy="50" rx="2.2" ry="3.2" />
        <ellipse cx="60" cy="50" rx="2.2" ry="3.2" />
        <ellipse cx="50" cy="61" rx="2.2" ry="3.2" />
        <ellipse cx="38" cy="66" rx="2.2" ry="3.2" />
        <ellipse cx="62" cy="66" rx="2.2" ry="3.2" />
        <ellipse cx="50" cy="77" rx="2.2" ry="3.2" />
      </g>
    </>
  );
}

export function Orange() {
  return (
    <>
      <circle cx="50" cy="56" r="32" fill={PAINT.orange} />
      {/* Dimpled peel, so one circle is an orange and not a ball. */}
      <g fill={PAINT.yellowDeep} opacity="0.7">
        <circle cx="38" cy="50" r="2" />
        <circle cx="56" cy="42" r="2" />
        <circle cx="66" cy="60" r="2" />
        <circle cx="44" cy="68" r="2" />
        <circle cx="58" cy="74" r="2" />
        <circle cx="32" cy="64" r="2" />
      </g>
      <Shade cx={50} cy={56} r={32} />
      <ellipse cx="38" cy="42" rx="7" ry="9" fill={PAINT.yellowSoft} opacity="0.5" transform="rotate(-20 38 42)" />
      {/* Stem and one leaf. */}
      <rect x="47" y="16" width="6" height="11" rx="3" fill={PAINT.wood} />
      <path d="M53 22 q16 -12 26 -2 q-12 10 -26 2 Z" fill={PAINT.green} />
    </>
  );
}

export function Biscuit() {
  return (
    <>
      {/* A round biscuit: a darker baked rim, a lighter middle, and the
          chips that say biscuit rather than wheel. */}
      <circle cx="50" cy="52" r="33" fill={PAINT.yellowDeep} />
      <circle cx="50" cy="52" r="26" fill={PAINT.yellow} opacity="0.55" />
      <g fill={PAINT.wood}>
        <circle cx="38" cy="42" r="4.5" />
        <circle cx="60" cy="38" r="4" />
        <circle cx="66" cy="58" r="4.5" />
        <circle cx="46" cy="62" r="4" />
        <circle cx="34" cy="58" r="3.5" />
        <circle cx="55" cy="50" r="3" />
      </g>
      <Shade cx={50} cy={52} r={33} />
    </>
  );
}

export function Balloon() {
  return (
    <>
      <ellipse cx="50" cy="42" rx="27" ry="32" fill={PAINT.pink} />
      <Shade cx={50} cy={42} rx={27} ry={32} />
      <ellipse cx="40" cy="30" rx="7" ry="10" fill={PAINT.pinkSoft} opacity="0.7" transform="rotate(-18 40 30)" />
      {/* The knot, and a string with a little wave in it. */}
      <path d="M50 72 L44 82 L56 82 Z" fill={PAINT.pinkDeep} />
      <path
        d="M50 82 q-6 7 0 14"
        fill="none"
        stroke={PAINT.inkSoft}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

export function Box() {
  return (
    <>
      {/* An open cardboard box, flaps out: something could be kept in it. */}
      <path d="M20 40 L8 26 L36 26 L45 40 Z" fill={PAINT.yellowDeep} />
      <path d="M80 40 L92 26 L64 26 L55 40 Z" fill={PAINT.yellowDeep} />
      <rect x="24" y="32" width="52" height="8" fill={PAINT.inkSoft} />
      <rect x="18" y="40" width="64" height="44" rx="4" fill={PAINT.wood} />
      <rect x="18" y="40" width="64" height="8" fill={PAINT.yellowDeep} />
      {/* Tape down the front. */}
      <rect x="46" y="48" width="8" height="36" fill={PAINT.yellowSoft} opacity="0.8" />
    </>
  );
}
