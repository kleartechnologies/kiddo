import {
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
 * Animal Adventure.
 *
 * A landscape the journey crosses: sky and sun above, far hills, a stretch of
 * land and a strip of water along the bottom. The animals stand on the land
 * on the left; the homes wait across the way on the right. The join is a
 * dotted path rather than a line, and the animal walks it — that walk is
 * `ConnectStage`'s own `travel`, unchanged; the world only gives it ground.
 *
 * The homes are drawn by the content (house, farm, sea) so the world draws
 * no home of its own. It draws the *between*.
 */

/** The sky. The land is laid under the board itself, whatever its height. */
function LandscapeBackdrop() {
  return (
    <div className="bg-tide-soft absolute inset-0 overflow-hidden rounded-hero border border-edge shadow-soft">
      <Sun
        accent="honey"
        className="absolute top-[5%] left-[6%] w-[clamp(2.25rem,9%,3.75rem)]"
      />
      <Cloud className="absolute top-[8%] right-[12%] w-[clamp(3rem,14%,5rem)] opacity-90" />
      <Cloud className="absolute top-[20%] left-[30%] w-[clamp(2rem,9%,3.25rem)] opacity-60" />
    </div>
  );
}

/** Matches the world's own padding, so the land runs edge to edge. */
const BLEED = "-mx-3 sm:-mx-5";

export const ANIMALS_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.animals,
  backdrop: <LandscapeBackdrop />,
  padding: "px-3 pt-4 sm:px-5 sm:pt-6",
  /* The land slides in from the side the animals are going. */
  entrance: {
    hidden: { opacity: 0, x: 28 },
    shown: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: "easeOut" },
  },
  composeChoice: ({ prompt, options }) => (
    <div className="flex flex-col items-center gap-6 [@media(max-height:54rem)]:gap-4">
      {prompt}
      {options}
    </div>
  ),
  composeConnect: ({ prompt, board }) => (
    <div className="flex flex-1 flex-col justify-end">
      {/* The question, if there is one, stands in the sky above the hills. */}
      <div
        className={cn("relative flex flex-col items-center px-2 pt-6", BLEED)}
      >
        <Hills
          hills={["sage", "sprout", "sprout"]}
          className="absolute inset-x-0 bottom-0 h-full max-h-20 w-full"
        />
        <div className="relative z-10">{prompt}</div>
        <Bush
          kind="tree"
          accent="sprout"
          className="relative z-10 mt-2 w-[clamp(2.5rem,10%,4rem)] self-start ml-[8%] translate-y-2"
        />
      </div>
      {/* The land the animals cross, with the water down by the sea's side. */}
      <div
        className={cn(
          "bg-sprout-soft rounded-b-hero relative overflow-hidden px-3 pt-4 pb-6 sm:px-5 sm:pt-6 sm:pb-8",
          BLEED,
        )}
      >
        <div className="bg-tide-base/35 absolute right-0 bottom-0 h-[clamp(1.25rem,18%,2.5rem)] w-[46%] rounded-tl-hero" />
        <GroundThing
          cover="flowers"
          accent="blossom"
          className="absolute bottom-1 left-[4%] w-[clamp(1.25rem,5%,1.75rem)]"
        />
        <GroundThing
          cover="pebbles"
          accent="sage"
          className="absolute bottom-2 left-[44%] w-[clamp(1.25rem,5%,1.75rem)]"
        />
        <Bush
          kind="bush"
          accent="sage"
          className="absolute top-1 right-[6%] w-[clamp(1.5rem,6%,2.5rem)] -translate-y-1/2"
        />
        <div className="relative">{board}</div>
      </div>
    </div>
  ),
  /* The way in is the same landscape the round is played on: the friend on
     the hilltop, and the animals of the first board already out on the land,
     so the child sees who the journey is for before the first question. */
  composeIntro: ({ friend, preview, begin }) => (
    <div className="flex flex-1 flex-col justify-end text-center">
      <div
        className={cn("relative flex flex-col items-center px-2 pt-6 pb-2", BLEED)}
      >
        <Hills
          hills={["sage", "sprout", "sprout"]}
          className="absolute inset-x-0 bottom-0 h-full max-h-20 w-full"
        />
        <div className="relative z-10">{friend}</div>
      </div>
      <div
        className={cn(
          "bg-sprout-soft rounded-b-hero relative overflow-hidden px-3 pt-4 pb-6 sm:px-5 sm:pt-6 sm:pb-8",
          BLEED,
        )}
      >
        <div className="bg-tide-base/35 absolute right-0 bottom-0 h-[clamp(1.25rem,18%,2.5rem)] w-[46%] rounded-tl-hero" />
        <GroundThing
          cover="flowers"
          accent="blossom"
          className="absolute bottom-1 left-[4%] w-[clamp(1.25rem,5%,1.75rem)]"
        />
        <Bush
          kind="bush"
          accent="sage"
          className="absolute top-1 right-[6%] w-[clamp(1.5rem,6%,2.5rem)] -translate-y-1/2"
        />
        <div className="relative flex flex-col items-center gap-4">
          {preview}
          {begin}
        </div>
      </div>
    </div>
  ),
};
