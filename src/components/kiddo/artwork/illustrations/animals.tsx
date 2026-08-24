import { PAINT } from "./paint";

/**
 * The animals the level-one boards are built from.
 *
 * Every one is drawn face-on in the same 100-unit box, from flat shapes with
 * ink only for features, so a row of them reads as one family rather than nine
 * stickers. Nothing has an outline, nothing has a gradient, and nothing has a
 * shadow — the same three rules the character rig follows.
 *
 * The hues are chosen to be *tellable apart*, not to be accurate. A dog is
 * apricot and a cat is honey because a board can hold both, and two animals
 * that differ only in silhouette are two animals a child has to squint at on a
 * 48px tile. Where a real animal has no hue at all — a sheep, a cow, a mouse —
 * it is drawn in paper, cream or stone, which is the palette's way of saying
 * "no colour" without reaching outside it.
 *
 * Read `paint.ts` before adding one. Every fill in this file is a token.
 */

export function Cow() {
  return (
    <>
      {/* Ears first, so the head sits on top of them. */}
      <ellipse cx="16" cy="46" rx="12" ry="9" fill={PAINT.paper} />
      <ellipse cx="84" cy="46" rx="12" ry="9" fill={PAINT.paper} />
      <ellipse cx="16" cy="46" rx="6" ry="4" fill={PAINT.pinkSoft} />
      <ellipse cx="84" cy="46" rx="6" ry="4" fill={PAINT.pinkSoft} />
      {/* Horns. Small enough to read as a cow and not as a bull. */}
      <ellipse cx="32" cy="21" rx="7" ry="5" fill={PAINT.yellow} />
      <ellipse cx="68" cy="21" rx="7" ry="5" fill={PAINT.yellow} />
      <ellipse cx="50" cy="54" rx="33" ry="30" fill={PAINT.paper} />
      {/* The patch. The one thing that makes a white oval a cow. */}
      <ellipse cx="32" cy="36" rx="14" ry="10" fill={PAINT.inkSoft} />
      <ellipse cx="70" cy="33" rx="8" ry="6" fill={PAINT.inkSoft} />
      <ellipse cx="50" cy="70" rx="21" ry="14" fill={PAINT.pinkSoft} />
      <ellipse cx="42" cy="68" rx="3.5" ry="4.5" fill={PAINT.inkSoft} />
      <ellipse cx="58" cy="68" rx="3.5" ry="4.5" fill={PAINT.inkSoft} />
      <circle cx="38" cy="48" r="4" fill={PAINT.ink} />
      <circle cx="62" cy="48" r="4" fill={PAINT.ink} />
    </>
  );
}

export function Sheep() {
  return (
    <>
      {/* The fleece is six overlapping circles, because a cloud outline drawn
          as one path stops looking woolly the moment it is 48px wide. */}
      <g fill={PAINT.cream} stroke={PAINT.stone} strokeWidth="2.5">
        <circle cx="30" cy="42" r="17" />
        <circle cx="70" cy="42" r="17" />
        <circle cx="50" cy="32" r="19" />
        <circle cx="28" cy="62" r="16" />
        <circle cx="72" cy="62" r="16" />
        <circle cx="50" cy="60" r="20" />
      </g>
      {/* Drawn again with no stroke, so the seams between the circles vanish
          and the fleece reads as one body. */}
      <g fill={PAINT.cream}>
        <circle cx="30" cy="42" r="17" />
        <circle cx="70" cy="42" r="17" />
        <circle cx="50" cy="32" r="19" />
        <circle cx="28" cy="62" r="16" />
        <circle cx="72" cy="62" r="16" />
        <circle cx="50" cy="60" r="20" />
      </g>
      <ellipse cx="30" cy="58" rx="8" ry="6" fill={PAINT.inkSoft} transform="rotate(-20 30 58)" />
      <ellipse cx="70" cy="58" rx="8" ry="6" fill={PAINT.inkSoft} transform="rotate(20 70 58)" />
      <ellipse cx="50" cy="62" rx="15" ry="17" fill={PAINT.inkSoft} />
      <circle cx="44" cy="58" r="3.5" fill={PAINT.paper} />
      <circle cx="56" cy="58" r="3.5" fill={PAINT.paper} />
      <ellipse cx="50" cy="72" rx="5" ry="3.5" fill={PAINT.paper} />
    </>
  );
}

export function Dog() {
  return (
    <>
      {/* Long ears, hanging past the jaw. The whole difference between this
          silhouette and the cat's. */}
      <ellipse cx="19" cy="56" rx="11" ry="22" fill={PAINT.wood} />
      <ellipse cx="81" cy="56" rx="11" ry="22" fill={PAINT.wood} />
      <circle cx="50" cy="50" r="31" fill={PAINT.orange} />
      <ellipse cx="50" cy="66" rx="19" ry="14" fill={PAINT.cream} />
      <ellipse cx="50" cy="59" rx="6.5" ry="5" fill={PAINT.ink} />
      <path
        d="M50 64 v6 M50 70 q-5 5 -9 1 M50 70 q5 5 9 1"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="38" cy="42" r="4" fill={PAINT.ink} />
      <circle cx="62" cy="42" r="4" fill={PAINT.ink} />
    </>
  );
}

export function Cat() {
  return (
    <>
      <path d="M24 36 L26 10 L48 26 Z" fill={PAINT.yellowDeep} />
      <path d="M76 36 L74 10 L52 26 Z" fill={PAINT.yellowDeep} />
      <path d="M30 32 L31 18 L43 27 Z" fill={PAINT.pinkSoft} />
      <path d="M70 32 L69 18 L57 27 Z" fill={PAINT.pinkSoft} />
      <circle cx="50" cy="54" r="31" fill={PAINT.yellowDeep} />
      {/* Stripes, so a ginger cat is a cat and not an orange ball. */}
      <g fill={PAINT.yellow}>
        <ellipse cx="50" cy="28" rx="4" ry="7" />
        <ellipse cx="34" cy="32" rx="3.5" ry="6" transform="rotate(-25 34 32)" />
        <ellipse cx="66" cy="32" rx="3.5" ry="6" transform="rotate(25 66 32)" />
      </g>
      <circle cx="38" cy="50" r="4.5" fill={PAINT.ink} />
      <circle cx="62" cy="50" r="4.5" fill={PAINT.ink} />
      <path d="M50 60 l-5 -4 h10 Z" fill={PAINT.pinkDeep} />
      <path
        d="M50 64 q-6 5 -11 1 M50 64 q6 5 11 1"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <g stroke={PAINT.inkSoft} strokeWidth="2" strokeLinecap="round">
        <path d="M28 60 H14 M28 66 H16" />
        <path d="M72 60 H86 M72 66 H84" />
      </g>
    </>
  );
}

export function Fish() {
  return (
    <>
      <path d="M72 50 L96 32 L96 68 Z" fill={PAINT.blueDeep} />
      <ellipse cx="47" cy="50" rx="34" ry="23" fill={PAINT.blue} />
      <path d="M40 28 q10 -12 20 0 Z" fill={PAINT.blueDeep} />
      <path d="M62 50 q-3 12 -14 16" fill="none" stroke={PAINT.blueDeep} strokeWidth="3" strokeLinecap="round" />
      <circle cx="29" cy="45" r="6" fill={PAINT.paper} />
      <circle cx="28" cy="45" r="3" fill={PAINT.ink} />
      <path d="M20 56 q6 4 12 1" fill="none" stroke={PAINT.blueDeep} strokeWidth="2.6" strokeLinecap="round" />
    </>
  );
}

export function Shark() {
  return (
    <>
      {/* The dorsal fin is the whole point: it is what a child names a shark
          by, and it is what keeps this from being a bigger fish. */}
      <path d="M44 34 L58 8 L68 34 Z" fill={PAINT.blueDeep} />
      <path d="M86 52 L99 30 L99 74 Z" fill={PAINT.blueDeep} />
      <ellipse cx="52" cy="52" rx="38" ry="21" fill={PAINT.blueDeep} />
      <path d="M4 54 L30 40 L30 66 Z" fill={PAINT.blueDeep} />
      <path d="M22 58 q28 14 60 4 q-28 8 -60 -4 Z" fill={PAINT.paper} />
      <path
        d="M18 58 q16 9 34 7"
        fill="none"
        stroke={PAINT.paper}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="48" r="3.6" fill={PAINT.ink} />
    </>
  );
}

export function Frog() {
  return (
    <>
      <circle cx="30" cy="28" r="14" fill={PAINT.green} />
      <circle cx="70" cy="28" r="14" fill={PAINT.green} />
      <circle cx="30" cy="27" r="8.5" fill={PAINT.paper} />
      <circle cx="70" cy="27" r="8.5" fill={PAINT.paper} />
      <circle cx="30" cy="28" r="4.5" fill={PAINT.ink} />
      <circle cx="70" cy="28" r="4.5" fill={PAINT.ink} />
      <ellipse cx="20" cy="76" rx="13" ry="8" fill={PAINT.greenDeep} />
      <ellipse cx="80" cy="76" rx="13" ry="8" fill={PAINT.greenDeep} />
      <ellipse cx="50" cy="58" rx="33" ry="26" fill={PAINT.green} />
      <ellipse cx="50" cy="66" rx="20" ry="15" fill={PAINT.greenSoft} />
      <path
        d="M32 56 q18 16 36 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </>
  );
}

export function Mouse() {
  return (
    <>
      <circle cx="24" cy="34" r="16" fill={PAINT.stone} />
      <circle cx="76" cy="34" r="16" fill={PAINT.stone} />
      <circle cx="24" cy="34" r="9.5" fill={PAINT.pinkSoft} />
      <circle cx="76" cy="34" r="9.5" fill={PAINT.pinkSoft} />
      {/* The tail, drawn before the body so it comes out from behind it. */}
      <path
        d="M78 72 q16 6 12 -12"
        fill="none"
        stroke={PAINT.stone}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="48" cy="58" rx="30" ry="27" fill={PAINT.stone} />
      <circle cx="37" cy="54" r="4" fill={PAINT.ink} />
      <circle cx="59" cy="54" r="4" fill={PAINT.ink} />
      <ellipse cx="48" cy="70" rx="6" ry="4.5" fill={PAINT.pinkDeep} />
      <g stroke={PAINT.inkSoft} strokeWidth="1.8" strokeLinecap="round">
        <path d="M42 72 H26 M43 78 H29" />
        <path d="M54 72 H70 M53 78 H67" />
      </g>
    </>
  );
}

export function Chicken() {
  return (
    <>
      {/* Comb and wattle. Without them a white bird is a duck, a goose or a
          dove; with them every child in the room says chicken. */}
      <g fill={PAINT.pinkDeep}>
        <circle cx="42" cy="20" r="7" />
        <circle cx="52" cy="16" r="8" />
        <circle cx="62" cy="20" r="7" />
        <ellipse cx="72" cy="48" rx="5" ry="8" />
      </g>
      {/* Tail, behind the body. */}
      <path d="M16 62 q-14 -22 -6 -34 q10 10 16 20 Z" fill={PAINT.stone} />
      <ellipse cx="44" cy="62" rx="30" ry="24" fill={PAINT.paper} stroke={PAINT.stone} strokeWidth="2.5" />
      <ellipse cx="38" cy="64" rx="15" ry="12" fill={PAINT.cream} />
      <ellipse cx="60" cy="36" rx="17" ry="16" fill={PAINT.paper} stroke={PAINT.stone} strokeWidth="2.5" />
      {/* Head drawn again without the stroke, so the neck seam disappears. */}
      <ellipse cx="60" cy="36" rx="15" ry="14" fill={PAINT.paper} />
      <path d="M75 38 L90 42 L75 46 Z" fill={PAINT.yellow} />
      <circle cx="64" cy="33" r="3.6" fill={PAINT.ink} />
      <g stroke={PAINT.yellowDeep} strokeWidth="3.5" strokeLinecap="round">
        <path d="M36 86 v8 M30 94 h12" />
        <path d="M54 86 v8 M48 94 h12" />
      </g>
    </>
  );
}

export function Duck() {
  return (
    <>
      {/* A curl of feathers on top, so a yellow circle reads as a duck and
          not as a chick. */}
      <path d="M50 14 q10 -8 16 2 q-8 -2 -10 5 Z" fill={PAINT.yellowDeep} />
      <circle cx="50" cy="52" r="31" fill={PAINT.yellow} />
      {/* The bill: wide, flat and orange — the one thing only a duck has. */}
      <ellipse cx="50" cy="66" rx="17" ry="9" fill={PAINT.orange} />
      <path
        d="M36 64 q14 7 28 0"
        fill="none"
        stroke={PAINT.wood}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="58" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="70" cy="58" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="38" cy="44" r="4" fill={PAINT.ink} />
      <circle cx="62" cy="44" r="4" fill={PAINT.ink} />
    </>
  );
}

export function Rabbit() {
  return (
    <>
      {/* The ears are the silhouette. Long, upright, pink inside. */}
      <ellipse cx="36" cy="26" rx="10" ry="22" fill={PAINT.cream} stroke={PAINT.stone} strokeWidth="2.5" />
      <ellipse cx="64" cy="26" rx="10" ry="22" fill={PAINT.cream} stroke={PAINT.stone} strokeWidth="2.5" />
      <ellipse cx="36" cy="28" rx="4.5" ry="14" fill={PAINT.pinkSoft} />
      <ellipse cx="64" cy="28" rx="4.5" ry="14" fill={PAINT.pinkSoft} />
      <circle cx="50" cy="62" r="28" fill={PAINT.cream} />
      <circle cx="32" cy="70" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="68" cy="70" r="6" fill={PAINT.blush} opacity="0.3" />
      <ellipse cx="50" cy="70" rx="5" ry="4" fill={PAINT.pink} />
      <path
        d="M50 74 v4 M50 78 q-5 5 -9 1 M50 78 q5 5 9 1"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="39" cy="56" r="4" fill={PAINT.ink} />
      <circle cx="61" cy="56" r="4" fill={PAINT.ink} />
    </>
  );
}

export function Bird() {
  return (
    <>
      {/* Wings out, mid-hop, so the circle is a bird and not a berry. */}
      <ellipse cx="16" cy="54" rx="13" ry="8" fill={PAINT.blueDeep} transform="rotate(-30 16 54)" />
      <ellipse cx="84" cy="54" rx="13" ry="8" fill={PAINT.blueDeep} transform="rotate(30 84 54)" />
      <path d="M50 12 q9 -6 13 3 q-7 -1 -9 5 Z" fill={PAINT.blueDeep} />
      <circle cx="50" cy="52" r="30" fill={PAINT.blue} />
      <ellipse cx="50" cy="68" rx="16" ry="11" fill={PAINT.blueSoft} />
      <path d="M42 52 L58 52 L50 63 Z" fill={PAINT.yellowDeep} />
      <circle cx="38" cy="42" r="4" fill={PAINT.ink} />
      <circle cx="62" cy="42" r="4" fill={PAINT.ink} />
    </>
  );
}

export function Snake() {
  return (
    <>
      {/* The body is one green wave, thick enough to be a shape rather than
          a line, with the head raised at its end. */}
      <path
        d="M12 82 q14 -18 28 0 t28 0 q8 -8 6 -20"
        fill="none"
        stroke={PAINT.green}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="74" cy="46" r="17" fill={PAINT.green} />
      <circle cx="30" cy="74" r="4" fill={PAINT.greenDeep} />
      <circle cx="56" cy="74" r="4" fill={PAINT.greenDeep} />
      <circle cx="68" cy="42" r="3.5" fill={PAINT.ink} />
      <circle cx="80" cy="42" r="3.5" fill={PAINT.ink} />
      <path
        d="M69 52 q5 5 10 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

export function Monkey() {
  return (
    <>
      {/* Ears wide out to the sides: the monkey silhouette. */}
      <circle cx="16" cy="50" r="11" fill={PAINT.wood} />
      <circle cx="84" cy="50" r="11" fill={PAINT.wood} />
      <circle cx="16" cy="50" r="5.5" fill={PAINT.cream} />
      <circle cx="84" cy="50" r="5.5" fill={PAINT.cream} />
      {/* A tuft, so the circle is a monkey and not a bear. */}
      <path d="M50 14 q9 -7 14 2 q-7 0 -9 6 Z" fill={PAINT.wood} />
      <circle cx="50" cy="52" r="31" fill={PAINT.wood} />
      {/* The pale face patch every cartoon monkey wears. */}
      <path
        d="M50 78 C31 78 25 62 30 47 A15 15 0 0 1 50 41 A15 15 0 0 1 70 47 C75 62 69 78 50 78 Z"
        fill={PAINT.cream}
      />
      <circle cx="31" cy="63" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="69" cy="63" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="40" cy="53" r="4" fill={PAINT.ink} />
      <circle cx="60" cy="53" r="4" fill={PAINT.ink} />
      <ellipse cx="50" cy="63" rx="3" ry="2.2" fill={PAINT.ink} />
      <path
        d="M43 69 q7 6 14 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

export function Fox() {
  return (
    <>
      {/* The pointed ears are the silhouette. */}
      <path d="M20 44 L25 10 L48 32 Z" fill={PAINT.orange} />
      <path d="M80 44 L75 10 L52 32 Z" fill={PAINT.orange} />
      <path d="M28 33 L30 19 L41 30 Z" fill={PAINT.pinkSoft} />
      <path d="M72 33 L70 19 L59 30 Z" fill={PAINT.pinkSoft} />
      <circle cx="50" cy="56" r="29" fill={PAINT.orange} />
      {/* The white muzzle that makes a fox a fox and not an orange cat. */}
      <ellipse cx="50" cy="72" rx="20" ry="13" fill={PAINT.cream} />
      <circle cx="29" cy="61" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="71" cy="61" r="6" fill={PAINT.blush} opacity="0.3" />
      <circle cx="39" cy="50" r="4" fill={PAINT.ink} />
      <circle cx="61" cy="50" r="4" fill={PAINT.ink} />
      <path d="M46 65 h8 l-4 5.5 Z" fill={PAINT.ink} />
      <path
        d="M50 71 v4 M50 75 q-5 4 -9 1 M50 75 q5 4 9 1"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

export function Bee() {
  return (
    <>
      {/* Wings first, so the body sits over them. */}
      <ellipse cx="30" cy="22" rx="14" ry="9" fill={PAINT.blueSoft} transform="rotate(-24 30 22)" />
      <ellipse cx="70" cy="22" rx="14" ry="9" fill={PAINT.blueSoft} transform="rotate(24 70 22)" />
      {/* Antennae. */}
      <path
        d="M42 28 q-4 -9 -11 -12 M58 28 q4 -9 11 -12"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="54" r="30" fill={PAINT.yellow} />
      {/* The stripes: what makes a yellow circle a bee. */}
      <path
        d="M22 63 q28 13 56 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M34 78 q16 7 32 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="31" cy="52" r="5.5" fill={PAINT.blush} opacity="0.3" />
      <circle cx="69" cy="52" r="5.5" fill={PAINT.blush} opacity="0.3" />
      <circle cx="40" cy="44" r="4" fill={PAINT.ink} />
      <circle cx="60" cy="44" r="4" fill={PAINT.ink} />
      <path
        d="M44 53 q6 5 12 0"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

export function Ladybird() {
  return (
    <>
      {/* Antennae, then the head, then the shell over its shoulders. */}
      <path
        d="M41 16 q-5 -7 -13 -8 M59 16 q5 -7 13 -8"
        fill="none"
        stroke={PAINT.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="26" r="13" fill={PAINT.ink} />
      <circle cx="45" cy="23" r="3.4" fill={PAINT.paper} />
      <circle cx="55" cy="23" r="3.4" fill={PAINT.paper} />
      <circle cx="45.8" cy="23.6" r="1.7" fill={PAINT.ink} />
      <circle cx="55.8" cy="23.6" r="1.7" fill={PAINT.ink} />
      {/* The shell: a dome of spots, split down the middle. */}
      <circle cx="50" cy="60" r="30" fill={PAINT.pinkDeep} />
      <path d="M50 32 V90" stroke={PAINT.ink} strokeWidth="3" />
      <g fill={PAINT.ink}>
        <circle cx="36" cy="50" r="5" />
        <circle cx="64" cy="50" r="5" />
        <circle cx="32" cy="70" r="5" />
        <circle cx="68" cy="70" r="5" />
      </g>
    </>
  );
}
