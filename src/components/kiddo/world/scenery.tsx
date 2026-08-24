import type { CSSProperties } from "react";

import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Accent } from "@/lib/games/types";
import type { GroundCover, Sparkle, WorldMotif } from "@/lib/world/themes";

/**
 * Everything KIDDO World is drawn out of.
 *
 * One file, one vocabulary: a cloud, a sun, a rainbow, a hill, a flower, a
 * leaf, a pebble and a faint subject mark. `KiddoWorldBackground` arranges
 * them; none of them knows where it is or what theme it belongs to, which is
 * what stops the scenery growing a per-screen special case.
 *
 * The rules every piece here follows, because the cards are the thing the
 * child is meant to look at:
 *
 * - Flat vector, rounded, no gradient inside a shape, no glow, no stroke
 *   darker than the fill it sits on. The same drawing language as the
 *   characters and the card artwork.
 * - Colour comes from the character palette only, through `ACCENT_VARS`.
 * - Opacity is applied to a whole `<g>`, never per shape, so overlapping
 *   parts of one cloud stay one flat cloud instead of darkening where they
 *   cross.
 * - Every piece is drawn in its own square-ish viewBox and sized by the
 *   caller in `clamp()` units, so it scales with the screen and never with a
 *   breakpoint.
 */

/**
 * Where a piece of scenery sits.
 *
 * Class names carry the parts of the placement that never change — the
 * positioning, the opacity, the drift — and `style` carries the parts the
 * scene computes: a percentage across its band and a `clamp()` width. Those
 * two cannot be Tailwind classes, because Tailwind only ships classes it can
 * read as literal strings, and a scene laid out from a list has none.
 */
interface Placed {
  className?: string;
  style?: CSSProperties;
}

/** A soft, flat-bottomed cloud. Three puffs and a base, in one flat white. */
export function Cloud({ className, style }: Placed) {
  return (
    <svg viewBox="0 0 120 62" className={className} style={style} aria-hidden>
      <g fill="var(--color-paper)">
        <rect x="6" y="34" width="108" height="26" rx="13" />
        <circle cx="38" cy="33" r="21" />
        <circle cx="70" cy="26" r="25" />
        <circle cx="97" cy="37" r="16" />
      </g>
    </svg>
  );
}

/**
 * The sun: a disc and two rings of light around it.
 *
 * Rings rather than rays — rays are the single fastest way to make a
 * children's background look like clip art — and no blur anywhere, because a
 * glow is the other way.
 */
export function Sun({ accent, className }: { accent: Accent; className?: string }) {
  const hue = ACCENT_VARS[accent];

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="54" fill={hue.soft} opacity="0.55" />
      <circle cx="60" cy="60" r="41" fill={hue.soft} />
      <circle cx="60" cy="60" r="29" fill={hue.base} opacity="0.42" />
    </svg>
  );
}

/**
 * A rainbow, as an arc of light rather than an object.
 *
 * Four bands, wide apart, no red — the palette has no red — and drawn at an
 * opacity where it reads as weather. The brief asked for "occasional rainbow
 * arcs" and specifically not for a giant rainbow, so this one is small
 * enough to sit over one shoulder of the sky and be half off the edge.
 */
export function Rainbow({ className }: { className?: string }) {
  const bands: Accent[] = ["blossom", "honey", "sprout", "tide"];

  return (
    <svg viewBox="0 0 200 104" className={className} aria-hidden>
      <g fill="none" strokeWidth="11" strokeLinecap="round">
        {bands.map((accent, index) => {
          const radius = 92 - index * 13;
          return (
            <path
              key={accent}
              d={`M${100 - radius},100 A${radius},${radius} 0 0 1 ${100 + radius},100`}
              stroke={ACCENT_VARS[accent].base}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * The three hills, back to front.
 *
 * Drawn stretched (`preserveAspectRatio="none"`) on purpose. These are the
 * only shapes in the world that may be: they are long, smooth, organic
 * curves with nothing round or lettered in them, so a 360px phone and a
 * 1440px desktop both get a horizon that fills the width rather than a
 * horizon cropped to its middle third. Everything else in the scene keeps
 * its aspect and is placed as a percentage instead.
 *
 * Depth is opacity, not hue: the far ridge is the palest even when it is the
 * strongest colour, which is what makes it read as distance rather than as a
 * third stripe.
 */
const HILL_PATHS = [
  "M0,300 V168 C118,116 262,120 402,158 C556,200 700,110 878,120 C1016,128 1122,168 1200,148 V300 Z",
  "M0,300 V216 C142,176 302,236 470,216 C640,196 762,154 920,180 C1048,201 1140,226 1200,208 V300 Z",
  "M0,300 V258 C160,232 282,276 462,268 C640,260 820,236 1000,248 C1100,255 1160,270 1200,262 V300 Z",
] as const;

/**
 * Back to front. Pale distance, solid ground.
 *
 * The far ridge is kept under a seventh because a pastel that far down is
 * already close to neutral, and a grey band across the horizon is the one
 * thing the palette is not allowed to produce.
 */
const HILL_OPACITY = [0.13, 0.26, 0.4] as const;

export function Hills({
  hills,
  className,
}: {
  hills: readonly [Accent, Accent, Accent];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {HILL_PATHS.map((path, index) => (
        <path
          key={path}
          d={path}
          fill={ACCENT_VARS[hills[index]].base}
          opacity={HILL_OPACITY[index]}
        />
      ))}
    </svg>
  );
}

/**
 * One small thing growing on the near hill.
 *
 * A flower, a leaf or a pebble, depending on which corner of the world this
 * is. All three are drawn in the same 40x48 box and stand on the same
 * baseline, so a theme can swap one for another without the ground moving.
 */
export function GroundThing({
  cover,
  accent,
  className,
  style,
}: Placed & {
  cover: GroundCover;
  accent: Accent;
}) {
  const hue = ACCENT_VARS[accent];

  return (
    <svg viewBox="0 0 40 48" className={className} style={style} aria-hidden>
      {cover === "flowers" ? (
        <>
          <path
            d="M20,48 V26"
            stroke={ACCENT_VARS.sprout.deep}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M20,36 C14,36 10,32 10,28 C16,28 20,31 20,36 Z"
            fill={ACCENT_VARS.sprout.base}
          />
          <g fill={hue.base}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="20"
                cy="9"
                rx="6"
                ry="8"
                transform={`rotate(${angle} 20 17)`}
              />
            ))}
          </g>
          <circle cx="20" cy="17" r="5" fill={ACCENT_VARS.honey.base} />
        </>
      ) : cover === "leaves" ? (
        <g fill={ACCENT_VARS.sprout.base}>
          <path d="M20,48 C20,34 14,24 6,18 C6,32 11,42 20,48 Z" />
          <path
            d="M20,48 C20,30 26,20 34,14 C34,30 29,42 20,48 Z"
            fill={hue.base}
          />
        </g>
      ) : (
        <g fill={hue.base}>
          <ellipse cx="14" cy="42" rx="13" ry="6" />
          <ellipse cx="29" cy="44" rx="8" ry="4" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}

/**
 * Something growing in the middle distance.
 *
 * A round bush or a small round-headed tree, alternating by index. These sit
 * on the *middle* hill rather than the near one, and that is the whole reason
 * they exist: three flat ridges read as three stripes until something stands
 * on one of them, and then they read as a meadow going away from you. Drawn
 * small, in one flat hue, at the opacity the caller sets — a treeline you
 * notice is a treeline that has become the subject.
 */
export function Bush({
  kind,
  accent,
  className,
  style,
}: Placed & {
  /** Alternates along the ridge so a treeline is not five of one thing. */
  kind: "bush" | "tree";
  accent: Accent;
}) {
  const hue = ACCENT_VARS[accent];

  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      {kind === "tree" ? (
        <g>
          <path
            d="M20,40 V26"
            stroke={hue.deep}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="20" cy="16" r="13" fill={hue.base} />
          <circle cx="13" cy="21" r="8" fill={hue.base} />
          <circle cx="27" cy="21" r="8" fill={hue.base} />
        </g>
      ) : (
        <g fill={hue.base}>
          <circle cx="13" cy="29" r="10" />
          <circle cx="26" cy="27" r="12" />
          <rect x="3" y="32" width="34" height="8" rx="4" />
        </g>
      )}
    </svg>
  );
}

/** A four-point star or a petal: the only things allowed in the air. */
export function SparkleMark({
  kind,
  accent,
  className,
  style,
}: Placed & {
  kind: Exclude<Sparkle, "none">;
  accent: Accent;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      {kind === "stars" ? (
        <path
          d="M12,0 C13.2,7.4 16.6,10.8 24,12 C16.6,13.2 13.2,16.6 12,24 C10.8,16.6 7.4,13.2 0,12 C7.4,10.8 10.8,7.4 12,0 Z"
          fill={ACCENT_VARS[accent].base}
        />
      ) : (
        <ellipse
          cx="12"
          cy="12"
          rx="5"
          ry="9"
          transform="rotate(-28 12 12)"
          fill={ACCENT_VARS[accent].base}
        />
      )}
    </svg>
  );
}

/**
 * The subject's own mark, drawn in the far distance.
 *
 * One per `WorldMotif`, cycling through a few variations by index so five
 * marks scattered across a sky are not five copies of the same numeral. Each
 * is drawn in the same 32x32 box, in outline or in a single flat fill, and
 * the caller sets the opacity — down at roughly a tenth, where the eye reads
 * texture and not information.
 */
export function MotifMark({
  motif,
  index,
  accent,
  className,
  style,
}: Placed & {
  motif: Exclude<WorldMotif, "none">;
  index: number;
  accent: Accent;
}) {
  const colour = ACCENT_VARS[accent].deep;
  const outline = {
    fill: "none",
    stroke: colour,
    strokeWidth: 2.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("font-display", className)}
      style={style}
      aria-hidden
    >
      {motif === "numbers" || motif === "letters" ? (
        <text
          x="16"
          y="17"
          fontSize="30"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="central"
          fill={colour}
        >
          {(motif === "numbers"
            ? ["7", "3", "+", "5", "8"]
            : ["a", "B", "c", "M", "s"])[index % 5]}
        </text>
      ) : motif === "geometry" ? (
        [
          <circle key="c" cx="16" cy="16" r="12" {...outline} />,
          <rect key="s" x="4" y="4" width="24" height="24" rx="5" {...outline} />,
          <path key="t" d="M16,4 L29,27 H3 Z" {...outline} />,
          <path
            key="d"
            d="M16,3 L29,16 L16,29 L3,16 Z"
            {...outline}
          />,
          <path
            key="st"
            d="M16,3 L20,13 L30,13 L22,19 L25,29 L16,23 L7,29 L10,19 L2,13 L12,13 Z"
            {...outline}
          />,
        ][index % 5]
      ) : motif === "globe" ? (
        <g {...outline}>
          <circle cx="16" cy="16" r="12.5" />
          <path d="M3.5,16 H28.5" />
          <path d="M16,3.5 C21,8 21,24 16,28.5 C11,24 11,8 16,3.5 Z" />
        </g>
      ) : motif === "puzzle" ? (
        /* Three squares and a circle: the odd one out, which is what Logic
           spends most of its time asking about. */
        <g {...outline}>
          <rect x="3" y="3" width="11" height="11" rx="3" />
          <rect x="18" y="3" width="11" height="11" rx="3" />
          <rect x="3" y="18" width="11" height="11" rx="3" />
          <circle cx="23.5" cy="23.5" r="5.5" />
        </g>
      ) : (
        /* Memory: two cards, one turned. */
        <g {...outline}>
          <rect
            x="3"
            y="7"
            width="14"
            height="19"
            rx="4"
            transform="rotate(-9 10 16)"
          />
          <rect
            x="16"
            y="7"
            width="14"
            height="19"
            rx="4"
            transform="rotate(7 23 16)"
          />
        </g>
      )}
    </svg>
  );
}
