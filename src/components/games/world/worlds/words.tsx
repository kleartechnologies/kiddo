import { OpenBook } from "@/components/kiddo/world/scenery";
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

export const WORDS_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.words,
  backdrop: <OpenBook inset="tight" />,
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
