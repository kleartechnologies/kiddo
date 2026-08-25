import {
  AppleTree,
  Bush,
  Cloud,
  GroundThing,
  Hills,
  Sun,
} from "@/components/kiddo/world/scenery";
import { cn } from "@/lib/cn";
import { GAME_WORLDS } from "@/lib/worlds/worlds";
import type { GameWorldDefinition } from "../definitions";

/**
 * The Counting Garden.
 *
 * The things to count stand on the grass rather than in a card, because
 * three apples in a garden are a *place with three apples in it*, and that is
 * the lesson. The tree at the edge is the garden's apple tree for the same
 * reason: the world says what it is about before the question does.
 *
 * The numbers are signs planted in the near ground, so the answer row is part
 * of the same picture. The sky, the far hills and the sun are the backdrop,
 * painted once per world; the field, the ground and the tree are part of the
 * composition, so they sit exactly where the board's own parts do, whatever
 * the board's height.
 *
 * Nothing here moves on its own. The apples `pop` in one at a time because
 * `PromptDisplay` already does that for a group of things; the sign that is
 * right `sparkle`s because the world asked for it at the `right` moment.
 */

const PANEL =
  "absolute inset-0 overflow-hidden rounded-hero border border-edge bg-tide-soft shadow-soft";

/** The sky: the only part painted once per world. The land is the board's. */
function GardenBackdrop() {
  return (
    <div className={PANEL}>
      <Sun
        accent="honey"
        className="absolute top-[6%] right-[5%] w-[clamp(2.25rem,9%,3.5rem)]"
      />
      <Cloud className="absolute top-[9%] left-[8%] w-[clamp(3rem,14%,5rem)] opacity-90" />
      <Cloud className="absolute top-[22%] right-[24%] w-[clamp(2.25rem,10%,3.5rem)] opacity-70" />
    </div>
  );
}

/** Matches the world's own padding, so the land runs edge to edge. */
const BLEED = "-mx-3 sm:-mx-5";

export const COUNTING_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.counting,
  backdrop: <GardenBackdrop />,
  padding: "px-3 pt-4 sm:px-5 sm:pt-6",
  /* The garden grows up out of the ground. */
  entrance: {
    hidden: { opacity: 0, scaleY: 0.92, originY: 1 },
    shown: { opacity: 1, scaleY: 1, originY: 1 },
    transition: { duration: 0.32, ease: "easeOut" },
  },
  composeChoice: ({ prompt, options }) => (
    <div className="flex flex-1 flex-col justify-end">
      {/* The things to count, standing on the horizon with the far hills
          behind them — and a size up where there is room, because a thing
          in a garden is a thing, not a glyph on a line. */}
      <div className={cn("relative flex justify-center px-2 pt-8", BLEED)}>
        <Hills
          hills={["sprout", "sage", "sprout"]}
          className="absolute inset-x-0 bottom-0 h-[70%] max-h-24 w-full"
        />
        <div className="relative z-10 [@media(min-height:44rem)]:[zoom:1.2] sm:[@media(min-height:44rem)]:[zoom:1.4]">
          {prompt}
        </div>
      </div>
      {/* The near ground, the signs planted in it, and the rest of the garden
          growing at its edge. */}
      <div
        className={cn(
          "bg-sprout-soft border-sprout-base/60 rounded-b-hero relative border-t-4 px-3 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5",
          BLEED,
        )}
      >
        <AppleTree className="absolute bottom-full left-[3%] w-[clamp(3rem,12%,5.5rem)] translate-y-1" />
        <Bush
          kind="bush"
          accent="sage"
          className="absolute right-[5%] bottom-full w-[clamp(1.75rem,6%,3rem)] translate-y-1"
        />
        <GroundThing
          cover="flowers"
          accent="blossom"
          className="absolute top-1 left-[14%] w-[clamp(1.25rem,5%,1.75rem)] -translate-y-1/2"
        />
        <GroundThing
          cover="flowers"
          accent="honey"
          className="absolute top-1 right-[16%] w-[clamp(1.25rem,5%,1.75rem)] -translate-y-1/2"
        />
        {options}
      </div>
    </div>
  ),
  composeConnect: ({ prompt, board }) => (
    <div className="flex flex-col items-center gap-6 [@media(max-height:54rem)]:gap-4">
      {prompt}
      {board}
    </div>
  ),
  /* The way in is the garden before the round: the friend on the horizon
     with the first board's things already growing there, and the start
     button planted in the near ground where the signs will stand. */
  composeIntro: ({ friend, preview, begin }) => (
    <div className="flex flex-1 flex-col justify-end text-center">
      <div
        className={cn(
          "relative flex flex-col items-center gap-3 px-2 pt-8 pb-2",
          BLEED,
        )}
      >
        <Hills
          hills={["sprout", "sage", "sprout"]}
          className="absolute inset-x-0 bottom-0 h-[70%] max-h-24 w-full"
        />
        <div className="relative z-10">{friend}</div>
        <div className="relative z-10">{preview}</div>
      </div>
      <div
        className={cn(
          "bg-sprout-soft border-sprout-base/60 rounded-b-hero relative border-t-4 px-3 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5",
          BLEED,
        )}
      >
        <AppleTree className="absolute bottom-full left-[3%] w-[clamp(3rem,12%,5.5rem)] translate-y-1" />
        <Bush
          kind="bush"
          accent="sage"
          className="absolute right-[5%] bottom-full w-[clamp(1.75rem,6%,3rem)] translate-y-1"
        />
        <div className="relative flex flex-col items-center gap-3">{begin}</div>
      </div>
    </div>
  ),
};
