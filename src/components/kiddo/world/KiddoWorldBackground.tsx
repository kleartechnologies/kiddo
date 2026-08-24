import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Accent } from "@/lib/games/types";
import {
  DEFAULT_WORLD_THEME,
  getWorldTheme,
  type WorldThemeId,
} from "@/lib/world/themes";

import {
  Bush,
  Cloud,
  GroundThing,
  Hills,
  MotifMark,
  Rainbow,
  SparkleMark,
  Sun,
} from "./scenery";

/**
 * KIDDO World, drawn behind everything.
 *
 * An environment rather than a wallpaper: sky at the top, hills at the
 * bottom, and the child's screen is a window looking out at it. Four layers
 * of depth, in this order and never any other —
 *
 *   1. the sky, a wash of two of the palette's palest hues over cream
 *   2. what is far away: the sun, a rainbow, clouds, a few drifting things
 *   3. the ground: three hills, and the small things growing on the near one
 *   4. the subject's own marks, scattered at roughly a tenth opacity
 *
 * and then a soft cream haze back over the middle, because the one rule this
 * background cannot break is that the game cards stay the brightest, busiest
 * thing on the screen. Everything below is pastel, flat and low-contrast on
 * purpose; a background a child notices is a background that has failed.
 *
 * ## Why it is `fixed`
 *
 * A world does not get taller because there are more games in it. Anchored to
 * the viewport, the horizon is in the same place on a 640px phone and a
 * 1440px desktop, and the sky is never a strip at the top of a page that is
 * four screens long. Nothing here scrolls, transforms the page or paints on
 * top of content, so this is the cheap kind of `fixed`.
 *
 * ## Why nothing is positioned in pixels
 *
 * Every piece is placed as a percentage of the band it belongs to and sized
 * with `clamp()`, so the scene composes itself at any viewport instead of
 * being laid out once and then rescued at breakpoints. The hills are the only
 * thing drawn to fill the width outright, and they are smooth curves with
 * nothing round in them, so stretching is invisible.
 */

/** How much of the screen is sky, and how much is ground. */
const SKY_BAND = "h-[clamp(13rem,50vh,34rem)]";
const GROUND_BAND = "h-[clamp(7.5rem,27vh,18rem)]";

/**
 * Where the clouds are, in the sky band's own coordinates.
 *
 * Ordered by how much each one earns its place: a theme asking for two gets
 * the first two, which are the two out at the edges. `drift` picks one of the
 * two speeds in `globals.css` so neighbouring clouds never move in lockstep.
 */
const CLOUDS = [
  { left: "-3%", top: "33%", width: "clamp(6rem,20vw,13rem)", opacity: 0.85, drift: 0 },
  { left: "71%", top: "11%", width: "clamp(4.5rem,15vw,10rem)", opacity: 0.7, drift: 1 },
  { left: "29%", top: "5%", width: "clamp(3.5rem,12vw,8rem)", opacity: 0.5, drift: 1 },
  { left: "49%", top: "54%", width: "clamp(3rem,10vw,6.5rem)", opacity: 0.36, drift: 0 },
] as const;

/** Small things in the air. Never in the middle, never more than five. */
const SPARKLES = [
  { left: "12%", top: "62%", size: "clamp(0.55rem,1.7vw,1rem)" },
  { left: "25%", top: "21%", size: "clamp(0.45rem,1.3vw,0.8rem)" },
  { left: "59%", top: "31%", size: "clamp(0.4rem,1.1vw,0.7rem)" },
  { left: "84%", top: "57%", size: "clamp(0.55rem,1.6vw,0.95rem)" },
  { left: "93%", top: "17%", size: "clamp(0.45rem,1.2vw,0.75rem)" },
] as const;

/**
 * The subject marks, placed across the whole window.
 *
 * Out at the sides and low down, where a phone's single column of cards is
 * not. On a narrow screen a card simply covers one, which is the right
 * outcome: the mark was texture, and the card is the point.
 */
const MOTIFS = [
  { left: "5%", top: "29%", size: "clamp(1.5rem,4vw,2.7rem)", rotate: -10 },
  { left: "89%", top: "23%", size: "clamp(1.2rem,3.2vw,2.1rem)", rotate: 8 },
  { left: "8%", top: "67%", size: "clamp(1.1rem,2.8vw,1.9rem)", rotate: 6 },
  { left: "87%", top: "71%", size: "clamp(1.4rem,3.6vw,2.4rem)", rotate: -6 },
  { left: "45%", top: "14%", size: "clamp(1rem,2.6vw,1.7rem)", rotate: 4 },
  { left: "66%", top: "86%", size: "clamp(1.2rem,3vw,2rem)", rotate: -9 },
] as const;

/**
 * The treeline on the middle hill, in the ground band's own coordinates.
 *
 * Uneven spacing and three sizes, because a row of evenly spaced identical
 * trees is a fence. Nothing in the middle: that is where a phone's single
 * column of cards comes down.
 */
const TREELINE = [
  { left: "2%", bottom: "38%", size: "clamp(1.6rem,4.4vw,2.8rem)", kind: "tree" },
  { left: "14%", bottom: "35%", size: "clamp(1.1rem,3vw,1.9rem)", kind: "bush" },
  { left: "23%", bottom: "40%", size: "clamp(1.4rem,3.8vw,2.4rem)", kind: "tree" },
  { left: "72%", bottom: "39%", size: "clamp(1.3rem,3.6vw,2.2rem)", kind: "bush" },
  { left: "82%", bottom: "36%", size: "clamp(1.7rem,4.6vw,2.9rem)", kind: "tree" },
  { left: "94%", bottom: "40%", size: "clamp(1.2rem,3.2vw,2rem)", kind: "bush" },
] as const;

/** What is growing on the near hill, in the ground band's own coordinates. */
const GROUND = [
  { left: "4%", bottom: "10%", size: "clamp(1.3rem,3.6vw,2.2rem)" },
  { left: "11%", bottom: "15%", size: "clamp(0.95rem,2.6vw,1.6rem)" },
  { left: "25%", bottom: "9%", size: "clamp(1.2rem,3.2vw,2rem)" },
  { left: "43%", bottom: "13%", size: "clamp(0.85rem,2.2vw,1.4rem)" },
  { left: "61%", bottom: "9%", size: "clamp(1.2rem,3.4vw,2.1rem)" },
  { left: "77%", bottom: "15%", size: "clamp(0.95rem,2.4vw,1.5rem)" },
  { left: "90%", bottom: "10%", size: "clamp(1.3rem,3.6vw,2.3rem)" },
] as const;

export interface KiddoWorldBackgroundProps {
  /** Which corner of the world this screen looks out at. */
  theme?: WorldThemeId;
  /**
   * `full` is the home screen: the whole world, weather included.
   *
   * `quiet` is what a game gets — the same sky and the same hills, so the
   * child has not left the place they were standing, minus everything that
   * was there to be looked at. A playfield is already the busiest thing
   * KIDDO draws and it does not need a meadow behind it.
   */
  detail?: "full" | "quiet";
}

export function KiddoWorldBackground({
  theme: themeId = DEFAULT_WORLD_THEME,
  detail = "full",
}: KiddoWorldBackgroundProps) {
  const theme = getWorldTheme(themeId);
  const full = detail === "full";

  const sky = ACCENT_VARS[theme.sky];
  const glow = ACCENT_VARS[theme.glow];

  const clouds = CLOUDS.slice(0, full ? theme.clouds : Math.min(2, theme.clouds));
  /* Read off the theme once, so the checks below narrow inside the callbacks
     that draw them. */
  const { motif, sparkle } = theme;
  /* Flowers and pebbles are tinted from the theme's own two sky hues, so the
     ground always belongs to the same afternoon as the light above it. */
  const groundHues: readonly Accent[] = [theme.glow, theme.sky, theme.hills[0]];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1 — the sky itself. Two pale washes and cream underneath. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(130% 62% at 50% -12%, ${sky.soft} 0%, rgb(255 255 255 / 0) 66%)`,
            `radial-gradient(72% 46% at 86% 2%, ${glow.soft} 0%, rgb(255 255 255 / 0) 62%)`,
            "linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-cream-100) 62%)",
          ].join(", "),
        }}
      />

      {/* 2 — far away. */}
      <div className={cn("absolute inset-x-0 top-0", SKY_BAND)}>
        {/* Clear of the header: on a phone the corner it would naturally take
            is already the "For grown-ups" door. */}
        <Sun
          accent={theme.glow}
          className={cn(
            "absolute right-[7%] top-[13%] w-[clamp(4.5rem,15vw,10rem)]",
            full ? "opacity-90" : "opacity-60",
          )}
        />

        {clouds.map((cloud) => (
          <Cloud
            key={cloud.left}
            className={cn(
              "absolute",
              full && (cloud.drift === 0 ? "world-drift" : "world-drift-slow"),
            )}
            style={{
              left: cloud.left,
              top: cloud.top,
              width: cloud.width,
              opacity: cloud.opacity,
            }}
          />
        ))}

        {full && sparkle !== "none"
          ? SPARKLES.map((spark, index) => (
              <SparkleMark
                key={spark.left}
                kind={sparkle}
                accent={index % 2 === 0 ? theme.glow : theme.hills[0]}
                className="absolute opacity-50"
                style={{ left: spark.left, top: spark.top, width: spark.size }}
              />
            ))
          : null}
      </div>

      {/* An arc of light standing behind the hills, out on the left and half
          off the edge. Drawn before the ground on purpose: the hills cover
          its feet, so it comes up out of the landscape instead of ending in
          four blunt stripes in the middle of the sky. */}
      {full && theme.rainbow ? (
        <Rainbow className="absolute -left-[6%] bottom-[17%] w-[clamp(9rem,30vw,26rem)] opacity-[0.16]" />
      ) : null}

      {/* 3 — the ground. Hills fill the width; what grows on them does not. */}
      <div className={cn("absolute inset-x-0 bottom-0", GROUND_BAND)}>
        <Hills hills={theme.hills} className="absolute inset-0 h-full w-full" />

        {/* Distance, as haze rather than as a paler colour.
            Without this the far ridge ends in a hard edge, and a hard
            horizontal edge glimpsed through the gap between two cards reads
            as a stripe painted across the page rather than as a hill behind
            it. Cream over the top of the band dissolves that edge into the
            sky, which is also what distance actually looks like. It goes
            here, above the hills and below everything growing on them, so
            the near ground stays crisp. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-3/5"
          style={{
            backgroundImage:
              "linear-gradient(180deg, var(--color-cream-100) 0%, rgb(255 255 255 / 0) 100%)",
          }}
        />

        {full
          ? TREELINE.map((thing) => (
              <Bush
                key={thing.left}
                kind={thing.kind}
                accent={theme.hills[2]}
                className="absolute opacity-40"
                style={{
                  left: thing.left,
                  bottom: thing.bottom,
                  width: thing.size,
                }}
              />
            ))
          : null}

        {full
          ? GROUND.map((thing, index) => (
              <GroundThing
                key={thing.left}
                cover={theme.ground}
                accent={groundHues[index % groundHues.length]}
                className="absolute opacity-70"
                style={{
                  left: thing.left,
                  bottom: thing.bottom,
                  width: thing.size,
                }}
              />
            ))
          : null}
      </div>

      {/* 4 — what this corner of the world is about, barely said. */}
      {full && motif !== "none"
        ? MOTIFS.map((mark, index) => (
            <MotifMark
              key={mark.left}
              motif={motif}
              index={index}
              accent={theme.hills[0]}
              className="absolute opacity-[0.12]"
              style={{
                left: mark.left,
                top: mark.top,
                width: mark.size,
                rotate: `${mark.rotate}deg`,
              }}
            />
          ))
        : null}

      {/* The calm middle. A haze of the page's own cream over the centre of
          the window, so whatever the weather is doing out there, the shelf of
          cards is still the brightest thing in the room. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(58% 42% at 50% 44%, var(--color-cream-100) 0%, rgb(255 255 255 / 0) 74%)",
        }}
      />
    </div>
  );
}
