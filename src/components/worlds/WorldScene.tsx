import { Friend } from "@/components/character/Friend";
import {
  AppleTree,
  Bush,
  Burrow,
  Cloud,
  GroundThing,
  Hills,
  OpenBook,
  PageRule,
  PathDots,
  PawPrint,
  Pond,
  Reed,
  Sun,
  WaterEdge,
} from "@/components/kiddo/world/scenery";
import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Accent } from "@/lib/games/types";
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
 * an adventure is land going away from you to the water, a book is two pages
 * lying flat. Nothing here moves; the door's lean on touch is the card's, and
 * the entry into the world is the map's.
 *
 * Someone lives in each one. WALLY is in the garden's pond, FOXY is out on
 * the adventure's land, BIBI is standing on the book's left page — the same
 * friend the child meets on the way into a round, already here on the door.
 * A place with nobody in it is a pattern; a place with somebody in it is
 * somewhere to go, and that is the whole job of this picture.
 *
 * Sizing note. These scenes are drawn into containers whose aspect goes from
 * 9:5 on a door to 9:2.5 on a short banner, so anything standing on the
 * ground is sized by *height* and lets its width follow. A prop sized by
 * width doubles in height when the frame gets wide, which is how an apple
 * tree ends up taller than the sky it is drawn in. Sky things — the sun and
 * the clouds — keep their width, because a wide sky is allowed a big sun.
 *
 * Things that must stay together — a pond and the whale in it, a trail and
 * the burrow it leads to — are grouped in a box with a fixed aspect, so the
 * group scales as one drawing and the pieces never drift apart.
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

/**
 * Sky, hills, an apple tree full of apples, flowers in the near grass, and
 * the pond in the corner with WALLY in it.
 *
 * The pond is drawn twice around him — the pool, then the water in front —
 * which is what puts him *in* it rather than on it.
 */
function Garden() {
  return (
    <div className="bg-tide-soft absolute inset-0">
      <Sun accent="honey" className="absolute top-[8%] right-[7%] w-[12%]" />
      <Cloud className="absolute top-[12%] left-[8%] w-[17%] opacity-90" />
      <Cloud className="absolute top-[30%] left-[38%] w-[11%] opacity-60" />
      <Hills
        hills={["sprout", "sage", "sprout"]}
        className="absolute inset-x-0 bottom-[20%] h-[46%] w-full"
      />
      {/* The near grass, with the hard top edge the garden is known by. */}
      <div className="bg-sprout-soft border-sprout-base/60 absolute inset-x-0 bottom-0 h-[26%] border-t-4" />
      <AppleTree className="absolute bottom-[19%] left-[8%] h-[46%] w-auto" />
      <Bush
        kind="bush"
        accent="sage"
        className="absolute bottom-[22%] left-[38%] h-[18%] w-auto"
      />
      <GroundThing
        cover="flowers"
        accent="blossom"
        className="absolute bottom-[5%] left-[16%] h-[16%] w-auto"
      />
      <GroundThing
        cover="flowers"
        accent="honey"
        className="absolute bottom-[3%] left-[30%] h-[15%] w-auto"
      />
      <GroundThing
        cover="flowers"
        accent="apricot"
        className="absolute bottom-[6%] left-[44%] h-[13%] w-auto"
      />
      {/* The pond, and who lives in it. One box, so the water and the whale
          keep the same relationship at every frame the scene is drawn into. */}
      <div className="absolute right-[4%] bottom-[3%] h-[36%] aspect-[7/4]">
        <Pond className="absolute inset-x-0 bottom-0 h-[42%] w-full" />
        <Friend
          id="wally"
          className="absolute bottom-[6%] left-1/2 h-[86%] w-auto -translate-x-1/2"
        />
        <Pond half="near" className="absolute inset-x-0 bottom-0 h-[42%] w-full" />
        <Reed className="absolute bottom-[24%] left-[-3%] h-[44%] w-auto" />
      </div>
    </div>
  );
}

/**
 * Sun, far hills, land going away to the water, and FOXY out on it with a
 * trail of paw prints behind them leading back to the burrow.
 *
 * The trail is `PathDots` and not a join: it is thinner and paler than
 * anything on a Connect board, and it goes from a mound to a fox rather than
 * between two things that look tappable.
 */
function Adventure() {
  return (
    <div className="bg-tide-soft absolute inset-0">
      <Sun accent="honey" className="absolute top-[8%] right-[9%] w-[12%]" />
      <Cloud className="absolute top-[13%] left-[32%] w-[17%] opacity-90" />
      <Hills
        hills={["sage", "sprout", "sprout"]}
        className="absolute inset-x-0 bottom-[30%] h-[40%] w-full"
      />
      {/* The land. */}
      <div className="bg-sprout-soft absolute inset-x-0 bottom-0 h-[32%]" />
      {/* The water, down one side, with reeds where it meets the grass. */}
      <WaterEdge className="absolute right-0 bottom-0 h-[26%] w-[46%]" />
      <Reed className="absolute right-[38%] bottom-[14%] h-[17%] w-auto" />
      <Bush
        kind="tree"
        accent="sprout"
        className="absolute bottom-[30%] left-[14%] h-[22%] w-auto"
      />
      <Bush
        kind="bush"
        accent="sage"
        className="absolute bottom-[31%] left-[32%] h-[13%] w-auto"
      />
      {/* Where FOXY came from: the burrow, and the way back to it. */}
      <div className="absolute bottom-[3%] left-[4%] h-[22%] aspect-[9/4]">
        <PathDots className="absolute inset-x-[6%] bottom-[8%] h-[62%] w-[88%]" />
        <Burrow className="absolute bottom-[52%] left-[2%] h-[38%] w-auto" />
        <PawPrint className="absolute bottom-[34%] left-[38%] h-[26%] w-auto rotate-6" />
        <PawPrint className="absolute right-[2%] bottom-[6%] h-[28%] w-auto -rotate-12" />
      </div>
      <Friend id="foxy" className="absolute bottom-[7%] left-[36%] h-[36%] w-auto" />
    </div>
  );
}

/** An open book, letters on the right page, and BIBI standing on the left. */
function Storybook() {
  return (
    <div className="absolute inset-0">
      <OpenBook />
      {/* The rules: two to write on, and one under BIBI's feet that reads as
          the ground she is standing on. */}
      <PageRule className="top-[58%] right-[12%] left-[56%]" />
      <PageRule className="top-[72%] right-[12%] left-[56%]" />
      <PageRule className="top-[80%] right-[56%] left-[12%]" />
      {/* Letters, printed on the page rather than floating over it. Three
          separate drawings rather than one lettered sheet, so none of them
          drifts when the frame gets wide.

          Sized by the page's *width* rather than its height, which is the
          one dimension that keeps them on the page: they live between the
          ruled lines' two ends (56% and 88%), and a height-sized letter in
          a tall frame — the 4:5 card on the social image — grows wider than
          that whole span and the "c" is clipped off the edge. Width-sized,
          the three of them fill the rules at every shape the scene is drawn
          into. */}
      <Letter char="A" accent="blossom" className="absolute top-[26%] left-[57%] w-[9%]" />
      <Letter char="b" accent="tide" className="absolute top-[26%] left-[68%] w-[9%]" />
      <Letter char="c" accent="sprout" className="absolute top-[26%] left-[79%] w-[9%]" />
      {/* A small picture on the page, the way they are printed inside. */}
      <GroundThing
        cover="flowers"
        accent="blossom"
        className="absolute right-[16%] bottom-[11%] h-[15%] w-auto"
      />
      <Friend id="bibi" className="absolute bottom-[20%] left-[14%] h-[54%] w-auto" />
    </div>
  );
}

/**
 * One letter, printed on a page.
 *
 * A letter each rather than one lettered layer, because a single SVG spanning
 * the scene is laid out by `preserveAspectRatio` rather than by the page, and
 * a banner three and a half times as wide as it is tall pulls the letters off
 * the ruled line they were drawn on. Drawn in the display face at the weight
 * the alphabet tiles use, so the letters on the door are the same letters the
 * child meets inside.
 */
function Letter({
  char,
  accent,
  className,
}: {
  char: string;
  accent: Accent;
  className?: string;
}) {
  return (
    /* No sizing of its own: `cn` joins rather than merges, so a base
       `w-auto` here would be emitted alongside the caller's width and the
       winner would be whichever Tailwind ordered last. */
    <svg viewBox="0 0 44 50" className={className} aria-hidden>
      <text
        x="22"
        y="25"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontWeight="700"
        fontSize="46"
        textAnchor="middle"
        dominantBaseline="central"
        fill={ACCENT_VARS[accent].deep}
      >
        {char}
      </text>
    </svg>
  );
}
