import {
  Bush,
  Cloud,
  GroundThing,
  Hills,
  Sun,
} from "@/components/kiddo/world/scenery";
import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { PlayableWorldId } from "@/lib/worlds/activities";

/**
 * A world, seen from outside.
 *
 * The picture on a world's door and the banner at the top of its map are the
 * same picture, drawn from the same scenery the board is drawn from once the
 * child is inside — the garden's hills and flowers, the adventure's land and
 * water, the storybook's pages and ribbon. So the door looks like the place,
 * and walking through it is arriving somewhere you have already seen.
 *
 * Three scenes, each its own composition. They are deliberately not one
 * template with three tints: a garden is things growing up from the ground,
 * an adventure is land going away from you to the water, a book is two
 * pages lying flat. Nothing here moves; the door's lean on touch is the
 * card's, and the entry into the world is the map's.
 */
export function WorldScene({
  world,
  className,
}: {
  world: PlayableWorldId;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      data-world-scene={world}
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      {world === "counting" ? (
        <Garden />
      ) : world === "animals" ? (
        <Adventure />
      ) : (
        <Storybook />
      )}
    </div>
  );
}

/** Sky, hills, an apple tree full of apples, and flowers in the near grass. */
function Garden() {
  return (
    <div className="bg-tide-soft absolute inset-0">
      <Sun accent="honey" className="absolute top-[8%] right-[7%] w-[12%]" />
      <Cloud className="absolute top-[12%] left-[8%] w-[17%] opacity-90" />
      <Cloud className="absolute top-[30%] left-[38%] w-[11%] opacity-60" />
      <Hills
        hills={["sprout", "sage", "sprout"]}
        className="absolute inset-x-0 bottom-[22%] h-[45%] w-full"
      />
      {/* The near grass. */}
      <div className="bg-sprout-soft border-sprout-base/60 absolute inset-x-0 bottom-0 h-[24%] border-t-4" />
      <AppleTree className="absolute bottom-[18%] left-[12%] w-[30%]" />
      <Bush kind="bush" accent="sage" className="absolute right-[10%] bottom-[20%] w-[13%]" />
      <GroundThing cover="flowers" accent="blossom" className="absolute bottom-[6%] left-[44%] w-[7%]" />
      <GroundThing cover="flowers" accent="honey" className="absolute bottom-[4%] left-[58%] w-[8%]" />
      <GroundThing cover="flowers" accent="blossom" className="absolute bottom-[7%] right-[28%] w-[6%]" />
      <GroundThing cover="flowers" accent="apricot" className="absolute bottom-[3%] right-[8%] w-[7%]" />
    </div>
  );
}

function AppleTree({ className }: { className?: string }) {
  const leaf = ACCENT_VARS.sprout;
  const apple = ACCENT_VARS.apricot;
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <path d="M40,80 V48" stroke={leaf.deep} strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="30" r="24" fill={leaf.base} />
      <circle cx="22" cy="40" r="15" fill={leaf.base} />
      <circle cx="58" cy="40" r="15" fill={leaf.base} />
      <g fill={apple.deep}>
        <circle cx="30" cy="26" r="5" />
        <circle cx="48" cy="20" r="5" />
        <circle cx="52" cy="40" r="5" />
        <circle cx="24" cy="46" r="5" />
        <circle cx="40" cy="42" r="5" />
      </g>
    </svg>
  );
}

/** Sun, far hills, land crossing to water, a path of steps and a tree. */
function Adventure() {
  const water = ACCENT_VARS.tide;
  return (
    <div className="bg-tide-soft absolute inset-0">
      <Sun accent="honey" className="absolute top-[7%] left-[7%] w-[12%]" />
      <Cloud className="absolute top-[10%] right-[14%] w-[17%] opacity-90" />
      <Hills
        hills={["sage", "sprout", "sprout"]}
        className="absolute inset-x-0 bottom-[30%] h-[40%] w-full"
      />
      {/* The land. */}
      <div className="bg-sprout-soft absolute inset-x-0 bottom-0 h-[32%]" />
      {/* The water, down one side. */}
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        className="absolute right-0 bottom-0 h-[26%] w-[46%]"
        aria-hidden
      >
        <path d="M8,0 C20,8 12,18 22,30 H100 V0 Z" fill={water.base} opacity="0.45" />
        <path d="M40,12 q6,-4 12,0 t12,0" stroke={water.deep} strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M62,22 q6,-4 12,0 t12,0" stroke={water.deep} strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
      {/* The path the animals take home. */}
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-x-[6%] bottom-[4%] h-[24%] w-[60%]" aria-hidden>
        <path d="M4,26 C24,20 30,8 56,10 S80,6 96,4" stroke={ACCENT_VARS.honey.deep} strokeWidth="2.2" strokeDasharray="0.1 6" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
      <Bush kind="tree" accent="sprout" className="absolute bottom-[28%] left-[14%] w-[15%]" />
      <Bush kind="bush" accent="sage" className="absolute bottom-[29%] left-[34%] w-[9%]" />
      <Paw className="absolute bottom-[10%] left-[7%] w-[8%] -rotate-12" />
      <Paw className="absolute bottom-[19%] left-[22%] w-[7%] rotate-6" />
      <Burrow className="absolute right-[52%] bottom-[6%] w-[16%]" />
    </div>
  );
}

function Paw({ className }: { className?: string }) {
  const hue = ACCENT_VARS.apricot;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <g fill={hue.deep} opacity="0.8">
        <ellipse cx="11" cy="12" rx="4" ry="5" />
        <ellipse cx="29" cy="12" rx="4" ry="5" />
        <ellipse cx="5" cy="22" rx="3.5" ry="4" />
        <ellipse cx="35" cy="22" rx="3.5" ry="4" />
        <path d="M20,18 C27,18 32,25 32,31 C32,35 28,37 24,36 C21,35 19,35 16,36 C12,37 8,35 8,31 C8,25 13,18 20,18 Z" />
      </g>
    </svg>
  );
}

function Burrow({ className }: { className?: string }) {
  const hue = ACCENT_VARS.honey;
  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden>
      <path d="M4,40 C4,18 20,6 40,6 C60,6 76,18 76,40 Z" fill={hue.base} />
      <path d="M22,40 C22,28 30,22 40,22 C50,22 58,28 58,40 Z" fill={ACCENT_VARS.honey.deep} opacity="0.8" />
    </svg>
  );
}

/** An open book: two pages, a spine, the ribbon, and letters on the page. */
function Storybook() {
  const ink = ACCENT_VARS.blossom;
  return (
    <div className="bg-honey-base/50 absolute inset-0">
      {/* Two pages. */}
      <div className="bg-paper absolute top-[8%] bottom-[8%] left-[6%] right-1/2 rounded-l-tile rounded-r-sm" />
      <div className="bg-paper absolute top-[8%] right-[6%] bottom-[8%] left-1/2 rounded-r-tile rounded-l-sm" />
      <div className="bg-edge absolute top-[8%] bottom-[8%] left-1/2 w-px -translate-x-1/2" />
      <div className="bg-ink-900/5 absolute top-[8%] bottom-[8%] left-1/2 w-[4%] -translate-x-1/2 rounded-full" />
      {/* Rules. */}
      <div className="border-edge/80 absolute top-[58%] right-[56%] left-[12%] border-b border-dashed" />
      <div className="border-edge/80 absolute top-[72%] right-[56%] left-[12%] border-b border-dashed" />
      <div className="border-edge/80 absolute top-[58%] right-[12%] left-[56%] border-b border-dashed" />
      <div className="border-edge/80 absolute top-[72%] right-[12%] left-[56%] border-b border-dashed" />
      {/* The ribbon. */}
      <div className="bg-blossom-base absolute top-0 right-[14%] h-[22%] w-[3.5%] rounded-b-sm" />
      {/* Letters on the pages. */}
      <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" aria-hidden>
        <g
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontWeight="700"
          fill={ink.deep}
        >
          <text x="15" y="30" fontSize="20">A</text>
          <text x="31" y="30" fontSize="20" fill={ACCENT_VARS.tide.deep}>b</text>
          <text x="60" y="30" fontSize="20" fill={ACCENT_VARS.sprout.deep}>C</text>
          <text x="76" y="30" fontSize="20" fill={ACCENT_VARS.apricot.deep}>d</text>
        </g>
      </svg>
      {/* A little picture growing on the page, the way they do inside. */}
      <GroundThing cover="flowers" accent="blossom" className="absolute bottom-[12%] left-[38%] w-[7%]" />
    </div>
  );
}
