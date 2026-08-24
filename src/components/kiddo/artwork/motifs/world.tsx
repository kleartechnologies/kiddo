import { useId } from "react";

import { ACCENT_VARS } from "@/lib/accents";

import { bandCentre, type MotifProps } from "../scene";

/**
 * General Knowledge Quest: the world, being looked at.
 *
 * One object, as plainly as it can be drawn — a blue ball, green land and an
 * equator. That one line is what makes it a globe rather than a ball, and it
 * is the only line in the whole artwork system that exists to say what
 * something *is*: everything else here is a shape.
 *
 * The land is built the way the characters are: soft ellipses in one hue,
 * clipped to the ball so the continents run off its edge instead of stopping
 * politely short of it.
 */

const GLOBE = { x: 198, r: 56 } as const;

/** Continents. Ellipses only, per the cast's own construction rules. */
const LAND = [
  { x: -20, y: -20, rx: 25, ry: 16, rotate: -14 },
  { x: -34, y: 6, rx: 14, ry: 10, rotate: 0 },
  { x: 14, y: 16, rx: 26, ry: 17, rotate: 10 },
  { x: 27, y: -25, rx: 12, ry: 9, rotate: 0 },
] as const;

export function WorldMotif({ action }: MotifProps<"world">) {
  const clipId = useId();
  const centreY = bandCentre(action);

  return (
    <g transform={`translate(${GLOBE.x} ${centreY})`}>
      {/* Sits the ball in the scene, the same way the rig's own shadow sits
          a character on the ground. */}
      <ellipse
        cy={GLOBE.r + 12}
        rx={GLOBE.r * 0.8}
        ry={8}
        fill="var(--color-ink-900)"
        opacity={0.07}
      />

      <clipPath id={clipId}>
        <circle r={GLOBE.r} />
      </clipPath>

      <circle r={GLOBE.r} fill={ACCENT_VARS.tide.base} />

      <g clipPath={`url(#${clipId})`}>
        {LAND.map((land, index) => (
          <ellipse
            key={index}
            cx={land.x}
            cy={land.y}
            rx={land.rx}
            ry={land.ry}
            transform={`rotate(${land.rotate} ${land.x} ${land.y})`}
            fill={ACCENT_VARS.sprout.base}
          />
        ))}

        <ellipse
          rx={GLOBE.r}
          ry={18}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.38}
          strokeWidth={2.5}
        />
      </g>
    </g>
  );
}
