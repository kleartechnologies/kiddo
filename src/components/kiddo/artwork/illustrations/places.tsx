import { PAINT } from "./paint";
import { Shade } from "./shading";

/**
 * The places an animal can live in, on a level-one board.
 *
 * These are the only illustrations that are allowed to be *scenes* rather than
 * objects, because a place is not a thing you can hold — a farm drawn as a
 * single silhouette is a barn, and a barn is not where a cow lives. So each one
 * is a small composition with a ground line, and each is built so its silhouette
 * survives being 48px wide: the house is a roof over a door, the farm is a red
 * barn on green, the sea is blue with a wave in it.
 *
 * None of them contains an animal. `home-partners` puts the animal on the other
 * side of the board, and a farm that already has a cow in it would answer the
 * question before the child did.
 *
 * ## Where the light falls
 *
 * `Shade` is the product's one light direction, and here it goes on round
 * masses only — a canopy, a pond, an egg. A wall, a roof and a pine are already
 * two tones meeting at an edge, which is what a flat drawing does instead of a
 * ramp; putting a crescent on a triangle would read as a smudge rather than as
 * light. So the rule is the same rule, applied where a form is round enough for
 * it to mean anything.
 */

export function House() {
  return (
    <>
      <rect x="22" y="46" width="56" height="42" rx="4" fill={PAINT.cream} stroke={PAINT.stone} strokeWidth="2.5" />
      <path d="M50 12 L92 50 L8 50 Z" fill={PAINT.pinkDeep} />
      <rect x="42" y="60" width="16" height="28" rx="3" fill={PAINT.wood} />
      <circle cx="54" cy="74" r="2.5" fill={PAINT.yellow} />
      <rect x="26" y="58" width="12" height="12" rx="2" fill={PAINT.blueSoft} stroke={PAINT.stone} strokeWidth="2" />
      <rect x="62" y="58" width="12" height="12" rx="2" fill={PAINT.blueSoft} stroke={PAINT.stone} strokeWidth="2" />
    </>
  );
}

export function Farm() {
  return (
    <>
      <rect x="0" y="72" width="100" height="28" fill={PAINT.greenSoft} />
      {/* The barn: the one building a child names as a farm. */}
      <rect x="26" y="40" width="52" height="34" fill={PAINT.pinkDeep} />
      <path d="M52 16 L86 42 L18 42 Z" fill={PAINT.wood} />
      <path
        d="M40 74 L40 48 L64 48 L64 74 M40 48 L64 74 M64 48 L40 74"
        fill={PAINT.cream}
        stroke={PAINT.cream}
        strokeWidth="3"
      />
      {/* Fence, so the green is a field and not a lawn. */}
      <g stroke={PAINT.cream} strokeWidth="4" strokeLinecap="round">
        <path d="M6 74 L6 90 M16 74 L16 90 M2 80 H20" />
        <path d="M86 74 L86 90 M96 74 L96 90 M82 80 H100" />
      </g>
    </>
  );
}

export function Sea() {
  return (
    <>
      <rect x="0" y="30" width="100" height="70" rx="6" fill={PAINT.blue} />
      <path
        d="M0 30 q12 -12 25 0 t25 0 t25 0 t25 0 L100 30 Z"
        fill={PAINT.blueSoft}
      />
      <g fill="none" stroke={PAINT.paper} strokeWidth="4" strokeLinecap="round" opacity="0.8">
        <path d="M14 52 q10 -8 20 0 t20 0" />
        <path d="M40 74 q10 -8 20 0 t20 0" />
      </g>
      <path d="M0 30 q12 -12 25 0 t25 0 t25 0 t25 0" fill="none" stroke={PAINT.blueDeep} strokeWidth="3" />
    </>
  );
}

export function Pond() {
  return (
    <>
      <rect x="0" y="58" width="100" height="42" fill={PAINT.greenSoft} />
      <ellipse cx="52" cy="72" rx="42" ry="22" fill={PAINT.blue} />
      <Shade cx={52} cy={72} rx={42} ry={22} />
      {/* One ripple, so the blue is water and not a mirror. */}
      <path
        d="M32 70 q8 -6 16 0 t16 0"
        fill="none"
        stroke={PAINT.paper}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* A lily pad — the thing that says pond and not puddle. */}
      <ellipse cx="70" cy="82" rx="10" ry="6" fill={PAINT.greenDeep} />
      {/* Bulrushes at the bank. */}
      <g stroke={PAINT.greenDeep} strokeWidth="4" strokeLinecap="round">
        <path d="M14 62 V40" />
        <path d="M24 64 V46" />
      </g>
      <ellipse cx="14" cy="34" rx="4.5" ry="9" fill={PAINT.wood} />
      <ellipse cx="24" cy="41" rx="4" ry="8" fill={PAINT.wood} />
    </>
  );
}

export function Nest() {
  return (
    <>
      {/* The branch it sits on: the ground line of this scene. */}
      <path
        d="M2 78 Q50 68 98 78"
        fill="none"
        stroke={PAINT.wood}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Two eggs peeping over the rim. */}
      <ellipse cx="42" cy="46" rx="9" ry="11" fill={PAINT.blueSoft} />
      <ellipse cx="60" cy="46" rx="9" ry="11" fill={PAINT.cream} />
      <Shade cx={42} cy={46} rx={9} ry={11} />
      <Shade cx={60} cy={46} rx={9} ry={11} />
      {/* The bowl, woven from arcs of a warmer wood. */}
      <path d="M18 52 a32 26 0 0 0 64 0 Z" fill={PAINT.wood} />
      <g fill="none" stroke={PAINT.yellowDeep} strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <path d="M24 60 q26 14 52 0" />
        <path d="M30 68 q20 10 40 0" />
      </g>
    </>
  );
}

export function Burrow() {
  return (
    <>
      <rect x="0" y="72" width="100" height="28" fill={PAINT.greenSoft} />
      {/* The mound. */}
      <path d="M4 76 Q50 18 96 76 Z" fill={PAINT.green} />
      {/* The doorway a rabbit actually uses: an arch, not a pit. */}
      <path d="M32 76 a18 20 0 0 1 36 0 Z" fill={PAINT.inkSoft} />
      {/* Grass tufts and a flower, so the mound is a garden and not a cave. */}
      <g stroke={PAINT.greenDeep} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M16 70 v-8" />
        <path d="M22 68 v-10" />
        <path d="M80 70 v-9" />
      </g>
      <circle cx="72" cy="50" r="5" fill={PAINT.pink} />
      <circle cx="72" cy="50" r="2" fill={PAINT.yellow} />
    </>
  );
}

export function Jungle() {
  return (
    <>
      <rect x="0" y="74" width="100" height="26" fill={PAINT.greenSoft} />
      {/* Two trunks under a deep canopy: green up high is what says jungle
          rather than park. */}
      <rect x="26" y="40" width="8" height="36" rx="4" fill={PAINT.wood} />
      <rect x="64" y="48" width="7" height="28" rx="3.5" fill={PAINT.wood} />
      <ellipse cx="30" cy="34" rx="26" ry="16" fill={PAINT.greenDeep} />
      <ellipse cx="68" cy="42" rx="22" ry="14" fill={PAINT.green} />
      <ellipse cx="50" cy="24" rx="24" ry="14" fill={PAINT.green} />
      <Shade cx={50} cy={24} rx={24} ry={14} />
      {/* A hanging vine — the one thing only a jungle hangs. */}
      <path
        d="M50 36 q4 20 -6 38"
        fill="none"
        stroke={PAINT.greenDeep}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="42" cy="58" rx="5" ry="3" fill={PAINT.greenDeep} />
      <ellipse cx="47" cy="70" rx="5" ry="3" fill={PAINT.greenDeep} />
      {/* One big flower at the foot. */}
      <circle cx="82" cy="66" r="5" fill={PAINT.pink} />
      <circle cx="82" cy="66" r="2" fill={PAINT.yellow} />
    </>
  );
}

export function Forest() {
  return (
    <>
      <rect x="0" y="76" width="100" height="24" fill={PAINT.greenSoft} />
      {/* Three pines, near and far: triangles are what make it a forest and
          not one tree. */}
      <rect x="21" y="64" width="8" height="18" rx="3" fill={PAINT.wood} />
      <path d="M25 10 L44 62 L6 62 Z" fill={PAINT.greenDeep} />
      <rect x="70" y="66" width="7" height="16" rx="3" fill={PAINT.wood} />
      <path d="M73 22 L90 64 L56 64 Z" fill={PAINT.green} />
      <path d="M50 42 L61 72 L39 72 Z" fill={PAINT.greenDeep} />
      {/* A toadstool at the foot of the near pine, so the floor is a forest
          floor. */}
      <rect x="84" y="78" width="6" height="10" rx="2.5" fill={PAINT.cream} />
      <path d="M76 80 a11 10 0 0 1 22 0 Z" fill={PAINT.pinkDeep} />
      <circle cx="83" cy="74" r="1.8" fill={PAINT.paper} />
      <circle cx="91" cy="75" r="1.8" fill={PAINT.paper} />
    </>
  );
}

export function Desert() {
  return (
    <>
      <rect x="0" y="72" width="100" height="28" fill={PAINT.yellowSoft} />
      {/* One rolling dune. */}
      <path d="M0 78 Q30 58 62 74 T100 72 L100 100 L0 100 Z" fill={PAINT.yellow} />
      <circle cx="80" cy="22" r="11" fill={PAINT.yellowDeep} />
      {/* The cactus: the one plant that says desert. */}
      <rect x="30" y="30" width="13" height="48" rx="6.5" fill={PAINT.green} />
      <rect x="14" y="36" width="9" height="20" rx="4.5" fill={PAINT.green} />
      <rect x="16" y="48" width="18" height="9" rx="4.5" fill={PAINT.green} />
      <rect x="48" y="44" width="9" height="16" rx="4.5" fill={PAINT.green} />
      <rect x="40" y="52" width="15" height="9" rx="4.5" fill={PAINT.green} />
      <circle cx="36" cy="28" r="4.5" fill={PAINT.pink} />
    </>
  );
}

export function Snow() {
  return (
    <>
      {/* A cold pale sky over white drifts — the one scene where the ground
          is paper on purpose. */}
      <rect x="0" y="0" width="100" height="100" rx="6" fill={PAINT.blueSoft} />
      <path d="M0 74 Q26 60 52 74 T100 70 L100 100 L0 100 Z" fill={PAINT.paper} />
      {/* A fir keeping its snow. */}
      <path d="M74 30 L93 70 L55 70 Z" fill={PAINT.greenDeep} />
      <path d="M74 30 L83 49 Q74 55 65 49 Z" fill={PAINT.paper} />
      {/* Falling flakes. */}
      <g fill={PAINT.paper}>
        <circle cx="16" cy="20" r="3" />
        <circle cx="38" cy="10" r="2.5" />
        <circle cx="28" cy="42" r="3" />
        <circle cx="52" cy="26" r="2.5" />
        <circle cx="10" cy="52" r="2.5" />
        <circle cx="44" cy="54" r="2.5" />
      </g>
    </>
  );
}

export function TreeHome() {
  return (
    <>
      <rect x="0" y="78" width="100" height="22" fill={PAINT.greenSoft} />
      <rect x="42" y="38" width="16" height="46" rx="7" fill={PAINT.wood} />
      <circle cx="50" cy="28" r="26" fill={PAINT.green} />
      <circle cx="29" cy="38" r="14" fill={PAINT.greenDeep} />
      <circle cx="71" cy="38" r="14" fill={PAINT.greenDeep} />
      <Shade cx={50} cy={28} r={26} />
      {/* The hollow: the doorway that makes this tree a home, and the whole
          difference between this scene and `nature.tree` the object. */}
      <ellipse cx="50" cy="66" rx="6.5" ry="8.5" fill={PAINT.inkSoft} />
      {/* Grass tufts, same hand as the burrow. */}
      <g stroke={PAINT.greenDeep} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M20 76 v-8" />
        <path d="M78 76 v-9" />
      </g>
    </>
  );
}

export function Mountain() {
  return (
    <>
      <rect x="0" y="80" width="100" height="20" fill={PAINT.greenSoft} />
      {/* A second peak behind, because one triangle is a tent. */}
      <path d="M4 84 L34 34 L60 84 Z" fill={PAINT.sage} />
      <path d="M28 86 L62 16 L98 86 Z" fill={PAINT.stone} />
      {/* The snow on top: the whole of what the question asks about. */}
      <path d="M62 16 L78 48 q-16 9 -32 0 Z" fill={PAINT.paper} />
      {/* One tree at the foot, for scale — a mountain is only tall next to
          something that is not. */}
      <path d="M14 80 L21 62 L28 80 Z" fill={PAINT.greenDeep} />
    </>
  );
}

export function Beach() {
  return (
    <>
      {/* Sea behind, sand in front. Both are on the `land-and-water` board at
          once, so the two have to be told apart at tile size: the sea is water
          edge to edge, and the beach is water with a bank of sand across the
          bottom of it and something built on the sand. The water reaches the
          same height as the island's for the same reason — a band floating in
          the middle of a white box reads as a cropped photograph. */}
      <rect x="0" y="18" width="100" height="56" rx="6" fill={PAINT.blue} />
      <g fill="none" stroke={PAINT.paper} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
        <path d="M10 44 q9 -7 18 0 t18 0" />
        <path d="M54 58 q9 -7 18 0 t18 0" />
      </g>
      <path d="M0 70 Q50 60 100 72 L100 100 L0 100 Z" fill={PAINT.yellow} />
      {/* The sandcastle. A child names a beach by what you build on it. */}
      <rect x="22" y="76" width="30" height="18" fill={PAINT.yellowDeep} />
      <g fill={PAINT.yellowDeep}>
        <rect x="22" y="70" width="7" height="8" />
        <rect x="33" y="70" width="8" height="8" />
        <rect x="45" y="70" width="7" height="8" />
      </g>
      <path d="M37 70 V52" stroke={PAINT.wood} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M38 53 L54 58 L38 63 Z" fill={PAINT.pinkDeep} />
      {/* A bucket beside it, so the sand reads as sand you can dig. */}
      <path d="M70 80 L86 80 L83 94 L73 94 Z" fill={PAINT.blueDeep} />
      <path d="M70 80 q8 -9 16 0" fill="none" stroke={PAINT.blueDeep} strokeWidth="2.4" />
    </>
  );
}

export function Island() {
  return (
    <>
      {/* Water on every side, which is the answer to the only question this
          picture is ever asked. */}
      <rect x="0" y="16" width="100" height="84" rx="6" fill={PAINT.blue} />
      <g fill="none" stroke={PAINT.paper} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
        <path d="M6 32 q8 -7 16 0 t16 0" />
        <path d="M62 30 q8 -7 16 0 t16 0" />
        <path d="M12 92 q9 -7 18 0 t18 0" />
      </g>
      <ellipse cx="50" cy="80" rx="36" ry="13" fill={PAINT.yellow} />
      <Shade cx={50} cy={80} rx={36} ry={13} />
      {/* One palm, leaning the way every drawn palm leans. */}
      <path
        d="M52 78 q-5 -20 6 -32"
        fill="none"
        stroke={PAINT.wood}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g fill={PAINT.greenDeep}>
        <ellipse cx="42" cy="42" rx="16" ry="7" transform="rotate(-16 42 42)" />
        <ellipse cx="74" cy="42" rx="16" ry="7" transform="rotate(16 74 42)" />
        <ellipse cx="58" cy="34" rx="8" ry="13" />
      </g>
      <circle cx="52" cy="50" r="4" fill={PAINT.wood} />
      <circle cx="63" cy="51" r="3.5" fill={PAINT.wood} />
    </>
  );
}

export function Volcano() {
  return (
    <>
      <rect x="0" y="82" width="100" height="18" fill={PAINT.greenSoft} />
      {/* Flat-topped, where the mountain is pointed, and rock where the
          mountain wears snow. Drawn in stone rather than sage because a green
          cone is a hill with a chimney on it: what makes this a volcano is the
          rock, the flat top and the warm mouth, in that order. */}
      <path d="M10 86 L38 26 L62 26 L90 86 Z" fill={PAINT.stone} />
      <path d="M36 26 H64 L66 32 H34 Z" fill={PAINT.orange} />
      {/* A trickle down one side, and a puff over the top. Warm, small and
          never frightening — there is no red in KIDDO and none here. */}
      <path
        d="M44 32 q-3 12 2 20 q-4 10 -1 18"
        fill="none"
        stroke={PAINT.orange}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <g fill={PAINT.stone} opacity="0.75">
        <circle cx="50" cy="16" r="9" />
        <circle cx="63" cy="12" r="6.5" />
        <circle cx="39" cy="12" r="6" />
      </g>
    </>
  );
}
