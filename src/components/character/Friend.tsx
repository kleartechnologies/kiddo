import { cn } from "@/lib/cn";
import { BLUSH, HUES, INK, OVERLAY, VIEWBOX, VIEWBOX_COMPACT_FRIEND } from "./canon";
import { Arm, Leg, Shadow } from "./parts";

/**
 * FOXY, BIBI, PIP and WALLY.
 *
 * The four friends, transcribed from the same character sheet as KIDDO and
 * built from the same primitives: the arm and the leg are literally the same
 * two objects, only rotated, and every lighter form is white over the one hue.
 *
 * KIDDO is the brand mark and carries the full expression and pose rig. The
 * friends host the game worlds and ship with one canonical face each. If a
 * friend ever needs to emote, it gets the same rig — the parts already fit.
 */

export type FriendId = "foxy" | "bibi" | "pip" | "wally";

/** The open eye, shared with KIDDO: one ink ellipse, one offset highlight. */
function Eye({ x, y, rx = 11.5, ry = 13.5, hr = 4 }: {
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  hr?: number;
}) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={INK} />
      <circle cx={x + 4.5} cy={y - 5.5} r={hr} fill="#FFFFFF" />
    </>
  );
}

function Cheeks({ x, y, r = 9.5, opacity }: { x: number; y: number; r?: number; opacity: number }) {
  return (
    <>
      <circle cx={100 - x} cy={y} r={r} fill={BLUSH} opacity={opacity} />
      <circle cx={100 + x} cy={y} r={r} fill={BLUSH} opacity={opacity} />
    </>
  );
}

function Foxy({ compact }: DrawProps) {
  const hue = HUES.foxy;
  return (
    <>
      {/* Tail, behind everything. It hangs off the body rather than the head,
          so on the icon crop it would read as a loose blob beside the face. */}
      {!compact && (
        <>
          <ellipse cx={170} cy={150} rx={20} ry={34} transform="rotate(-24 170 150)" fill={hue} />
          <ellipse cx={180} cy={122} rx={15} ry={17} transform="rotate(-24 180 122)" fill="#FFFFFF" opacity={OVERLAY.tailTip} />
        </>
      )}
      {/* Ears: the one place the family uses a triangle, rounded by stroke. */}
      <path d="M58 76 L72 22 L102 60 Z" fill={hue} stroke={hue} strokeWidth={12} strokeLinejoin="round" />
      <path d="M142 76 L128 22 L98 60 Z" fill={hue} stroke={hue} strokeWidth={12} strokeLinejoin="round" />
      <path d="M68 66 L74 40 L90 58 Z" fill="#FFFFFF" opacity={0.55} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={8} strokeLinejoin="round" />
      <path d="M132 66 L126 40 L110 58 Z" fill="#FFFFFF" opacity={0.55} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={8} strokeLinejoin="round" />
      {!compact && (
        <>
          <g transform="translate(54,114) rotate(22)"><Arm hue={hue} /></g>
          <g transform="translate(146,114) rotate(-22)"><Arm hue={hue} /></g>
          <g transform="translate(80,168)"><Leg hue={hue} /></g>
          <g transform="translate(120,168)"><Leg hue={hue} /></g>
        </>
      )}
      <ellipse cx={100} cy={120} rx={54} ry={52} fill={hue} />
      <ellipse cx={100} cy={143} rx={32} ry={26} fill="#FFFFFF" opacity={0.5} />
      <ellipse cx={100} cy={130} rx={24} ry={17} fill="#FFFFFF" opacity={OVERLAY.muzzle} />
      <Eye x={82} y={108} />
      <Eye x={118} y={108} />
      <ellipse cx={100} cy={126} rx={7.5} ry={6} fill={INK} />
      <path d="M100 133 Q92 142 84 137" fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M100 133 Q108 142 116 137" fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      <Cheeks x={41} y={126} opacity={0.3} />
    </>
  );
}

function Bibi({ compact }: DrawProps) {
  const hue = HUES.bibi;
  return (
    <>
      {/* Cotton tail. Same rule as FOXY's: a body marker, not a head one. */}
      {!compact && <circle cx={158} cy={156} r={15} fill="#FFFFFF" opacity={0.7} />}
      <g transform="translate(82,66) rotate(-11)">
        <rect x={-11} y={-60} width={22} height={66} rx={11} fill={hue} />
        <rect x={-5} y={-52} width={10} height={50} rx={5} fill="#FFFFFF" opacity={0.42} />
      </g>
      <g transform="translate(120,62) rotate(13)">
        <rect x={-11} y={-60} width={22} height={66} rx={11} fill={hue} />
        <rect x={-5} y={-52} width={10} height={50} rx={5} fill="#FFFFFF" opacity={0.42} />
      </g>
      {!compact && (
        <>
          <g transform="translate(56,118) rotate(23)"><Arm hue={hue} /></g>
          <g transform="translate(144,118) rotate(-23)"><Arm hue={hue} /></g>
          <g transform="translate(80,170)"><Leg hue={hue} /></g>
          <g transform="translate(120,170)"><Leg hue={hue} /></g>
        </>
      )}
      <ellipse cx={100} cy={124} rx={52} ry={50} fill={hue} />
      <ellipse cx={100} cy={146} rx={31} ry={25} fill="#FFFFFF" opacity={0.38} />
      <Eye x={82} y={115} />
      <Eye x={118} y={115} />
      <ellipse cx={100} cy={132} rx={6} ry={4.6} fill={INK} />
      <path d="M100 137 Q93 145 86 141" fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M100 137 Q107 145 114 141" fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      <Cheeks x={40} y={133} opacity={0.32} />
    </>
  );
}

function Pip({ compact }: DrawProps) {
  const hue = HUES.pip;
  return (
    <>
      {!compact && (
        <>
          <g transform="translate(52,130) rotate(32)"><Arm hue={hue} /></g>
          <g transform="translate(148,130) rotate(-32)"><Arm hue={hue} /></g>
          <g transform="translate(74,168) rotate(20)"><Leg hue={hue} /></g>
          <g transform="translate(126,168) rotate(-20)"><Leg hue={hue} /></g>
        </>
      )}
      {/* Eye bumps sit on top of the mass rather than beside it. */}
      <circle cx={70} cy={62} r={24} fill={hue} />
      <circle cx={130} cy={62} r={24} fill={hue} />
      <ellipse cx={100} cy={132} rx={56} ry={46} fill={hue} />
      <ellipse cx={100} cy={151} rx={34} ry={22} fill="#FFFFFF" opacity={0.4} />
      <Eye x={70} y={60} rx={12} ry={13.5} hr={4.2} />
      <Eye x={130} y={60} rx={12} ry={13.5} hr={4.2} />
      <path d="M68 126 Q100 154 132 126" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <Cheeks x={40} y={122} opacity={0.3} />
    </>
  );
}

function Wally({ compact }: DrawProps) {
  const hue = HUES.wally;
  return (
    <>
      {/* Fluke and fins, then the spout rising off the top of the frame. */}
      <ellipse cx={170} cy={112} rx={24} ry={12} transform="rotate(-32 170 112)" fill={hue} />
      <ellipse cx={170} cy={146} rx={24} ry={12} transform="rotate(30 170 146)" fill={hue} />
      {/* The two lower flippers are WALLY's limbs, so they drop on the crop.
          The fluke and the spout are identity and always stay. */}
      {!compact && (
        <>
          <ellipse cx={52} cy={152} rx={20} ry={11} transform="rotate(30 52 152)" fill={hue} />
          <ellipse cx={132} cy={166} rx={18} ry={11} transform="rotate(-22 132 166)" fill={hue} />
        </>
      )}
      <circle cx={96} cy={54} r={7} fill={hue} opacity={0.55} />
      <circle cx={88} cy={38} r={5} fill={hue} opacity={0.42} />
      <circle cx={102} cy={30} r={4} fill={hue} opacity={0.32} />
      <ellipse cx={98} cy={126} rx={58} ry={50} fill={hue} />
      <ellipse cx={98} cy={148} rx={36} ry={24} fill="#FFFFFF" opacity={0.36} />
      <Eye x={80} y={117} />
      <Eye x={116} y={117} />
      <path d="M76 142 Q98 158 120 142" fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
      <circle cx={56} cy={134} r={9.5} fill={BLUSH} opacity={0.28} />
      <circle cx={138} cy={134} r={9.5} fill={BLUSH} opacity={0.28} />
    </>
  );
}

interface DrawProps {
  /** Icon crop: the arms and legs are dropped, the species markers are not. */
  compact: boolean;
}

const FRIENDS: Record<FriendId, (props: DrawProps) => React.JSX.Element> = {
  foxy: Foxy,
  bibi: Bibi,
  pip: Pip,
  wally: Wally,
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
      {!compact && <Shadow />}
      <Draw compact={compact} />
    </svg>
  );
}
