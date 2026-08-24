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
 * a place to write or a line to join, and neither is true here.
 *
 * Pictures `grow` onto the page as it opens; a pair found `bounce`s on the
 * left and `sparkle`s on the right. Nothing else moves.
 */

function BookBackdrop() {
  return (
    <div className="absolute inset-0 rounded-hero">
      {/* The cover, just showing round the pages. */}
      <div className="bg-honey-base/60 absolute inset-0 rounded-hero shadow-soft" />
      {/* Two pages. */}
      <div className="bg-paper absolute top-2 bottom-2 left-2 right-1/2 rounded-l-card rounded-r-sm" />
      <div className="bg-paper absolute top-2 right-2 bottom-2 left-1/2 rounded-r-card rounded-l-sm" />
      {/* The spine. */}
      <div className="bg-edge absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2" />
      <div className="bg-ink-900/5 absolute top-2 bottom-2 left-1/2 w-6 -translate-x-1/2 rounded-full" />
      {/* The ribbon keeping the place. */}
      <div className="bg-blossom-base absolute top-0 right-[10%] h-[18%] w-3 rounded-b-sm" />
    </div>
  );
}

export const WORDS_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.words,
  backdrop: <BookBackdrop />,
  padding: "px-4 py-5 sm:px-7 sm:py-7",
  /* The page turns: the book arrives from the side the next page is on. */
  entrance: {
    hidden: { opacity: 0, x: -24 },
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
