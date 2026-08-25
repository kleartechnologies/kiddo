import { cn } from "@/lib/cn";
import {
  HUES,
  INK,
  MOUTH,
  TONGUE,
  VIEWBOX,
  VIEWBOX_COMPACT_FRIEND,
  shadesOf,
} from "./canon";
import {
  Arm,
  Cheeks,
  Leg,
  Palette,
  Shadow,
  Torso,
  cream,
  skin,
} from "./parts";

/**
 * FOXY, BIBI, PIP and WALLY.
 *
 * The four friends, transcribed from the same character sheet as KIDDO and
 * built from the same primitives: the torso, the arm and the leg are
 * literally the same three objects, only rotated and recoloured, and every
 * lighter form is that character's cream.
 *
 * That shared torso is not laziness — it is the reason a fox, a rabbit, a
 * frog and a whale read as one cast. Species lives above the shoulders and in
 * exactly one identity marker each: FOXY's bandana, BIBI's bow, PIP's bowtie,
 * WALLY's scarf.
 *
 * KIDDO is the brand mark and carries the full expression and pose rig. The
 * friends host the game worlds and ship with one canonical face each, held in
 * the wave the sheet draws them in. If a friend ever needs to emote, it gets
 * the same rig — the parts already fit.
 */

export type FriendId = "foxy" | "bibi" | "pip" | "wally";

/** The open eye, shared with KIDDO: ink circle, catchlight, dim glint. */
function Eye({ x, y, r = 15 }: { x: number; y: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x - r * 0.37} cy={y - r * 0.4} r={r * 0.347} fill="#FFFFFF" />
      <circle cx={x + r * 0.33} cy={y + r * 0.47} r={r * 0.167} fill="#FFFFFF" opacity={0.5} />
    </>
  );
}

/** One brow. Same stroke as KIDDO's, so the family shares one eyebrow. */
function Brow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
}

/** The open mouth, with the tongue. Same two shapes across the cast. */
function Mouth({ d, tongue }: { d: string; tongue: string }) {
  return (
    <>
      <path d={d} fill={MOUTH} />
      <path d={tongue} fill={TONGUE} />
    </>
  );
}

/**
 * The two arms in the sheet's wave: one down at the side, one raised.
 *
 * Written once rather than five times, because the friends all wave the same
 * way — and because the raised arm's angle is the one number that decides
 * whether a wave reads as a wave or as a shrug.
 */
function WavingArms({ hue, raise = -46 }: { hue: string; raise?: number }) {
  return (
    <>
      <g transform="translate(46,152)">
        <Arm hue={hue} />
      </g>
      <g transform={`translate(154,150) rotate(${raise})`}>
        <Arm hue={hue} />
      </g>
    </>
  );
}

/** The two legs, planted. Friends stand still; only KIDDO's legs move. */
function Legs({ hue }: { hue: string }) {
  return (
    <>
      <g transform="translate(80,188)">
        <Leg hue={hue} />
      </g>
      <g transform="translate(120,188)">
        <Leg hue={hue} />
      </g>
    </>
  );
}

/* --------------------------------------------------------------------------
   The identity markers.

   One per character, each in its own colour — the single exception to the
   one-hue rule, and the reason the four are told apart at 32px even in
   greyscale. Markers keep their colour under a content-pack recolour: a red
   bandana is a red bandana whatever colour the fox is.
   ----------------------------------------------------------------------- */

const MARKER = {
  scarf: "#E3543F",
  scarfKnot: "#C9422F",
  bow: "#EE7BA6",
  bowKnot: "#E0578C",
  bowtie: "#F5C33F",
  bowtieKnot: "#E0A81E",
};

/** A neckerchief with a tail hanging down. FOXY's, and WALLY's. */
function Scarf({ band, tail }: { band: string; tail: string }) {
  return (
    <>
      <path d={band} fill={MARKER.scarf} />
      <path d={tail} fill={MARKER.scarfKnot} />
    </>
  );
}

function Foxy({ compact }: DrawProps) {
  const hue = HUES.foxy;
  const shade = shadesOf(hue);
  return (
    <>
      {/* Ears: the one place the family uses a triangle. The dark tip and the
          cream inner are what make it a fox and not a cat. */}
      <path d="M46,64 L38,16 Q62,26 76,50 Z" fill={skin(hue)} />
      <path d="M154,64 L162,16 Q138,26 124,50 Z" fill={skin(hue)} />
      <path d="M44,32 L38,16 Q50,21 56,33 Z" fill={shade.deep} />
      <path d="M156,32 L162,16 Q150,21 144,33 Z" fill={shade.deep} />
      <path d="M52,44 L46,26 Q60,33 68,48 Z" fill={cream(hue)} />
      <path d="M148,44 L154,26 Q140,33 132,48 Z" fill={cream(hue)} />
      {/* The brush, curling round the left of the body with a cream tip. It
          hangs off the body rather than the head, so on the icon crop it
          would read as a loose blob beside the face. */}
      {!compact && (
        <>
          <path
            d="M46,192 Q6,182 14,146 Q20,120 44,124 Q30,150 40,166 Q48,178 58,180 Z"
            fill={skin(hue)}
          />
          <path d="M20,130 Q6,152 16,176 Q24,190 42,190 Q22,172 26,146 Z" fill={cream(hue)} />
          <Legs hue={hue} />
          <WavingArms hue={hue} raise={-52} />
          <Torso hue={hue} />
          <Scarf
            band="M62,126 Q100,146 138,126 Q126,152 100,154 Q74,152 62,126 Z"
            tail="M96,150 L104,150 L108,176 L100,170 L92,176 Z"
          />
        </>
      )}
      <circle cx={100} cy={90} r={57} fill={skin(hue)} />
      {/* The cream mask across the lower face — a fox's markings, not a muzzle. */}
      <path
        d="M100,140 Q60,132 52,100 Q76,110 100,108 Q124,110 148,100 Q140,132 100,140 Z"
        fill={cream(hue)}
      />
      <ellipse cx={100} cy={118} rx={25} ry={17} fill={cream(hue)} />
      <Cheeks x={44} y={110} rx={11.5} ry={8} opacity={0.5} />
      <Eye x={76} y={92} />
      <Eye x={124} y={92} />
      <Brow d="M64,68 Q75,60 86,66" />
      <Brow d="M114,66 Q125,60 136,68" />
      <ellipse cx={100} cy={110} rx={8} ry={6} fill={INK} />
      <Mouth d="M86,120 Q100,140 114,120 Z" tongue="M93,128 Q100,137 107,128 Z" />
    </>
  );
}

function Bibi({ compact }: DrawProps) {
  const hue = HUES.bibi;
  const shade = shadesOf(hue);
  return (
    <>
      {/* Two uprights, splayed a few degrees. The inner is the hue's own
          light stop rather than the cream, because a rabbit's ear is pink
          inside and cream would read as fur. */}
      <g transform="rotate(-8 73 46)">
        <rect x={60} y={8} width={27} height={76} rx={13.5} fill={skin(hue)} />
        <rect x={66} y={18} width={15} height={56} rx={7.5} fill={shade.light} />
      </g>
      <g transform="rotate(8 127 46)">
        <rect x={113} y={8} width={27} height={76} rx={13.5} fill={skin(hue)} />
        <rect x={119} y={18} width={15} height={56} rx={7.5} fill={shade.light} />
      </g>
      {/* The bow, tied at the base of the right ear. */}
      <path
        d="M126,20 Q112,10 116,24 Q104,20 112,32 Q124,38 132,30 Q142,36 144,24 Q148,12 134,20 Q130,10 126,20 Z"
        fill={MARKER.bow}
      />
      <circle cx={128} cy={25} r={4.5} fill={MARKER.bowKnot} />
      {!compact && (
        <>
          <Legs hue={hue} />
          <WavingArms hue={hue} />
          <Torso hue={hue} />
          {/* A sash and a satchel of her own: BIBI carries the storybook. */}
          <path
            d="M72,128 Q100,150 130,132"
            stroke={MARKER.bowKnot}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <rect x={52} y={158} width={34} height={30} rx={9} fill={MARKER.bow} />
          <path
            d="M69,180 Q60,172 63,167 Q66,163 69,168 Q72,163 75,167 Q78,172 69,180 Z"
            fill={cream(hue)}
          />
        </>
      )}
      <circle cx={100} cy={92} r={56} fill={skin(hue)} />
      <ellipse cx={100} cy={116} rx={26} ry={18} fill={cream(hue)} />
      <Cheeks x={43} y={110} rx={11.5} ry={8} opacity={0.5} />
      <Eye x={77} y={94} />
      <Eye x={123} y={94} />
      {/* Whiskers instead of brows: the one face in the cast without them. */}
      <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round">
        <path d="M63,84 L56,79" />
        <path d="M64,77 L58,71" />
        <path d="M137,84 L144,79" />
        <path d="M136,77 L142,71" />
      </g>
      <ellipse cx={100} cy={107} rx={7.5} ry={5.8} fill={INK} />
      <Mouth d="M87,118 Q100,137 113,118 Z" tongue="M94,126 Q100,134 106,126 Z" />
    </>
  );
}

function Pip({ compact }: DrawProps) {
  const hue = HUES.pip;
  const shade = shadesOf(hue);
  return (
    <>
      {/* Webbed back feet, splayed either side. PIP's are the one pair of
          limbs in the cast that aren't the shared leg. */}
      {!compact && (
        <>
          <path
            d="M42,196 Q22,204 20,222 Q20,230 32,230 L64,230 Q54,214 58,200 Z"
            fill={shade.deep}
          />
          <path
            d="M158,196 Q178,204 180,222 Q180,230 168,230 L136,230 Q146,214 142,200 Z"
            fill={shade.deep}
          />
        </>
      )}
      {!compact && (
        <>
          <WavingArms hue={hue} raise={-50} />
          <path
            d="M100,120 C144,120 162,150 162,182 C162,212 133,228 100,228 C67,228 38,212 38,182 C38,150 56,120 100,120 Z"
            fill={skin(hue)}
          />
          <ellipse cx={100} cy={192} rx={36} ry={30} fill={cream(hue)} />
        </>
      )}
      {/* The bowtie, worn where a frog has no neck to speak of. It stays on
          the crop: it is the marker, and it clears the chin. */}
      <path d="M76,132 L100,142 L124,132 L118,150 L82,150 Z" fill={MARKER.bowtie} />
      <circle cx={100} cy={141} r={6} fill={MARKER.bowtieKnot} />
      <circle cx={100} cy={96} r={55} fill={skin(hue)} />
      {/* Eye bumps sit on top of the mass rather than beside it. */}
      <circle cx={64} cy={56} r={27} fill={skin(hue)} />
      <circle cx={136} cy={56} r={27} fill={skin(hue)} />
      <circle cx={64} cy={58} r={20} fill="#FFFFFF" />
      <circle cx={136} cy={58} r={20} fill="#FFFFFF" />
      <circle cx={68} cy={60} r={11.5} fill={INK} />
      <circle cx={132} cy={60} r={11.5} fill={INK} />
      <circle cx={63} cy={55} r={4.2} fill="#FFFFFF" />
      <circle cx={127} cy={55} r={4.2} fill="#FFFFFF" />
      <Brow d="M42,32 Q56,22 72,28" />
      <Brow d="M128,28 Q144,22 158,32" />
      <Cheeks x={48} y={98} rx={12} ry={9} opacity={0.5} />
      <ellipse cx={92} cy={88} rx={3} ry={2.4} fill={INK} />
      <ellipse cx={108} cy={88} rx={3} ry={2.4} fill={INK} />
      <Mouth d="M68,98 Q100,140 132,98 Z" tongue="M86,116 Q100,132 114,116 Z" />
    </>
  );
}

function Wally({ compact }: DrawProps) {
  const hue = HUES.wally;
  const shade = shadesOf(hue);
  return (
    <>
      {/* The spout: two drops rising off the top of the frame. */}
      <path d="M100,14 Q92,26 100,34 Q108,26 100,14 Z" fill={shade.base} />
      <circle cx={86} cy={24} r={5} fill={shade.light} />
      <circle cx={115} cy={20} r={6.5} fill={shade.light} />
      {/* The fluke, and flippers rather than arms: the same gesture, a
          different shape. Both are limbs, so both go on the crop. */}
      {!compact && (
        <>
          <path d="M40,214 Q16,206 8,220 Q22,232 46,226 Z" fill={shade.limb} />
          <path d="M160,214 Q184,206 192,220 Q178,232 154,226 Z" fill={shade.limb} />
          <path d="M46,152 Q18,150 14,178 Q12,198 34,200 Q30,176 50,164 Z" fill={shade.limb} />
          <g transform="rotate(-38 154 160)">
            <path
              d="M154,146 Q186,132 194,158 Q198,178 174,182 Q168,160 148,158 Z"
              fill={shade.limb}
            />
          </g>
        </>
      )}
      {/* One tall mass: a whale has no waist, so the shared torso would lie. */}
      <path
        d="M100,42 C148,42 168,86 168,140 C168,196 140,228 100,228 C60,228 32,196 32,140 C32,86 52,42 100,42 Z"
        fill={skin(hue)}
      />
      <path
        d="M100,132 C130,132 148,158 148,186 C148,212 126,228 100,228 C74,228 52,212 52,186 C52,158 70,132 100,132 Z"
        fill={cream(hue)}
      />
      <Scarf
        band="M56,124 Q100,146 144,124 Q134,150 100,152 Q66,150 56,124 Z"
        tail="M96,148 L104,148 L108,174 L100,168 L92,174 Z"
      />
      {/* Whale eyes are white-backed, so they read at sea-blue against blue. */}
      <circle cx={74} cy={98} r={17} fill="#FFFFFF" />
      <circle cx={126} cy={98} r={17} fill="#FFFFFF" />
      <circle cx={77} cy={100} r={10} fill={INK} />
      <circle cx={123} cy={100} r={10} fill={INK} />
      <circle cx={73} cy={95} r={3.6} fill="#FFFFFF" />
      <circle cx={119} cy={95} r={3.6} fill="#FFFFFF" />
      <Brow d="M58,72 Q74,64 90,71" />
      <Brow d="M110,71 Q126,64 142,72" />
      <Cheeks x={48} y={116} rx={12} ry={8.5} opacity={0.5} />
      <Mouth d="M82,116 Q100,140 118,116 Z" tongue="M91,127 Q100,136 109,127 Z" />
    </>
  );
}

interface DrawProps {
  /** Icon crop: the limbs are dropped, the species markers are not. */
  compact: boolean;
}

const FRIENDS: Record<FriendId, (props: DrawProps) => React.JSX.Element> = {
  foxy: Foxy,
  bibi: Bibi,
  pip: Pip,
  wally: Wally,
};

/**
 * How wide each friend's contact shadow is. A whale's mass reaches further
 * than a rabbit's, and one shadow width for all four is how a cast starts to
 * look like the same body in four hats.
 */
const SHADOW_RX: Record<FriendId, number> = {
  foxy: 54,
  bibi: 52,
  pip: 54,
  wally: 56,
};

export function Friend({
  id,
  size,
  variant = "auto",
  label,
  className,
}: {
  id: FriendId;
  size?: number;
  variant?: "auto" | "full" | "compact";
  label?: string;
  className?: string;
}) {
  const Draw = FRIENDS[id];
  const compact = variant === "compact" || (variant === "auto" && size !== undefined && size < 64);
  const box = compact ? VIEWBOX_COMPACT_FRIEND : VIEWBOX;

  return (
    <svg
      viewBox={
        compact
          ? `${box.x} ${box.y} ${box.width} ${box.height}`
          : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`
      }
      width={size}
      height={size ? (size * box.height) / box.width : undefined}
      className={cn(compact ? "overflow-hidden" : "overflow-visible", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Palette hue={HUES[id]} />
      {!compact && <Shadow rx={SHADOW_RX[id]} />}
      <Draw compact={compact} />
    </svg>
  );
}
