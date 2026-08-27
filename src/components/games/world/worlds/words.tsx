import { OpenBook } from "@/components/kiddo/world/scenery";
import { cn } from "@/lib/cn";
import { GAME_WORLDS } from "@/lib/worlds/worlds";
import type { GameWorldDefinition } from "../definitions";

/**
 * Word World.
 *
 * An open storybook: two cream pages, a spine down the middle, a ribbon
 * marking the place. The words on the left page and the words on the right
 * page are the engine's own nodes — drawn as words on a page rather than as
 * cards — and a rhyme found is a ribbon drawn across the spine between them.
 *
 * The pages are plain: no ruled lines, because a rule under a word reads as
 * a place to write or a line to join, and neither is true here. The door's
 * book has them, and that is the only difference between the two — the book
 * itself is `OpenBook`, drawn once for both.
 *
 * Pictures `grow` onto the page as it opens; a pair found `bounce`s on the
 * left and `sparkle`s on the right. Nothing else moves.
 */

/**
 * What the book wears on a phone held sideways.
 *
 * The page's own margin is generous where there is height for it and most of
 * the round where there is not: on a 390px screen the margin, the picture at
 * the top of the page and the row under it add up to more than the screen.
 * `ChoiceStage` budgets `17rem` of chrome for a world that paints its own
 * page; this is the book keeping to it.
 *
 * Margin and the space between the two things on the page, nothing else. The
 * book, the spine and the ribbon are drawn by `OpenBook` from the shape of the
 * block they fill, so they follow it in.
 *
 * The `54rem` step is now written `and (min-height:34rem)` so the two cannot
 * both be true: two arbitrary variants on one property are resolved by the
 * order Tailwind emitted them, which is not a thing to build on. Written out
 * in full: Tailwind only ships classes it can find as literal text.
 */
const LANDSCAPE = {
  margin: cn(
    "[@media(max-height:33.9375rem)]:py-2",
    "[@media(max-height:33.9375rem)]:px-5",
  ),
  gap: "[@media(max-height:33.9375rem)]:gap-2",
} as const;

export const WORDS_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.words,
  backdrop: <OpenBook inset="tight" />,
  padding: cn("px-4 py-5 sm:px-7 sm:py-7", LANDSCAPE.margin),
  landscape: "open",
  /* The page turns: the book arrives from the side the next page is on. */
  entrance: {
    hidden: { opacity: 0, x: -24 },
    shown: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: "easeOut" },
  },
  composeChoice: ({ prompt, options }) => (
    <div
      className={cn(
        "flex flex-col items-center gap-6",
        "[@media(max-height:54rem)_and_(min-height:34rem)]:gap-4",
        LANDSCAPE.gap,
      )}
    >
      {prompt}
      {options}
    </div>
  ),
  composeConnect: ({ prompt, board }) => (
    <div className="flex flex-col items-center gap-5 [@media(max-height:54rem)]:gap-3">
      {prompt}
      {/* A picture book's pictures are a size up from a card's, where the
          page is tall enough to hold them. */}
      <div className="w-full sm:[@media(min-height:44rem)]:[zoom:1.25]">
        {board}
      </div>
    </div>
  ),
  /* The book lies open at the round's first page: the friend on the left
     page, the first board's pictures already printed on the right, and the
     button on the spine between them. */
  composeIntro: ({ friend, preview, begin }) => (
    <div className="flex flex-col items-center gap-5 text-center [@media(max-height:54rem)]:gap-3">
      <div className="flex w-full items-center justify-evenly gap-4">
        {friend}
        {preview}
      </div>
      {begin}
    </div>
  ),
};
