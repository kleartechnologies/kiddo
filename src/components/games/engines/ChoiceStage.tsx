"use client";

import { motion } from "framer-motion";

import {
  useGameWorld,
  WorldReaction,
} from "@/components/games/world/GameWorld";
import { ChoiceTile, type ChoiceState } from "@/components/kiddo/ChoiceTile";
import { captionOf, spokenOf } from "@/lib/content/challenges";
import type { ChallengeEngineProps } from "@/lib/content/engine";
import type { ContentItem } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { popIn, staggerChildren } from "@/lib/motion";
import { ContentItemView } from "./ContentItemView";
import { PromptDisplay } from "./PromptDisplay";

/**
 * The engine for every `choice` challenge there will ever be.
 *
 * It is handed a challenge and cannot tell what it is about: a sum, a colour,
 * a letter, a pattern. It draws the line across the stage, draws the options,
 * and reports which one was tapped. It never decides whether that was right —
 * `checkAnswer` does, in the content layer, once.
 *
 * This is the component the whole content architecture exists to make
 * possible. Math Quest is its first caller; English will be its second, and
 * will need nothing added here.
 */

interface Layout {
  /** Caps the row by the height left over, so a board never pushes off screen. */
  wrap: string;
  /** How wide one option is. */
  item: string;
}

/**
 * Sized by how many tiles there are and how tall they are, because a square
 * tile needs the height a wide one does not. Every cap is `min(comfortable,
 * max(floor, what the height allows))`: the tiles get big on a desktop, shrink
 * on a phone held sideways, and never take a scrollbar with them.
 *
 * `18rem` is the chrome a game round wears — header, KIDDO's question, the
 * line on the stage and the padding between them.
 *
 * Written out in full rather than composed: Tailwind only ships classes it can
 * find as literal text, and a template interpolation is not literal text.
 */
const LAYOUTS: Record<"wide" | "square", Record<number, Layout>> = {
  wide: {
    2: {
      wrap: "max-w-[min(26rem,max(11rem,calc((100dvh_-_18rem)*2.8)))]",
      item: "basis-[calc(50%_-_0.375rem)]",
    },
    3: {
      wrap: "max-w-[min(34rem,max(14rem,calc((100dvh_-_18rem)*4.2)))]",
      item: "basis-[calc(33.333%_-_0.5rem)]",
    },
    4: {
      wrap: cn(
        "max-w-[min(24rem,max(12rem,calc((100dvh_-_18rem)*1.4)))]",
        "[@media(min-width:36rem)]:max-w-[min(46rem,max(18rem,calc((100dvh_-_18rem)*5.6)))]",
      ),
      item: cn(
        "basis-[calc(50%_-_0.375rem)]",
        "[@media(min-width:36rem)]:basis-[calc(25%_-_0.5625rem)]",
      ),
    },
  },
  square: {
    2: {
      wrap: "max-w-[min(22rem,max(10rem,calc((100dvh_-_18rem)*2)))]",
      item: "basis-[calc(50%_-_0.375rem)]",
    },
    3: {
      wrap: "max-w-[min(30rem,max(13rem,calc((100dvh_-_18rem)*3)))]",
      item: "basis-[calc(33.333%_-_0.5rem)]",
    },
    4: {
      wrap: cn(
        "max-w-[min(22rem,max(10rem,calc(100dvh_-_18rem)))]",
        "[@media(min-width:36rem)]:max-w-[min(40rem,max(16rem,calc((100dvh_-_18rem)*4)))]",
      ),
      item: cn(
        "basis-[calc(50%_-_0.375rem)]",
        "[@media(min-width:36rem)]:basis-[calc(25%_-_0.5625rem)]",
      ),
    },
  },
};

export interface ChoiceStageProps extends ChallengeEngineProps<"choice"> {
  /**
   * How each option should look right now. A UI concern, so it is a prop
   * rather than something the content layer knows about.
   */
  stateOf?: (optionId: string) => ChoiceState;
}

/** The whole instruction, with the state in words so nothing rests on colour. */
function srLabelOf(item: ContentItem, state: ChoiceState): string {
  const name = spokenOf(item);
  switch (state) {
    case "correct":
      return `${name}, that's the one`;
    case "wrong":
      return `${name}, not this one`;
    case "tried":
      return `Choose ${name}, already tried`;
    default:
      return `Choose ${name}`;
  }
}

export function ChoiceStage({
  challenge,
  onAnswer,
  accepting = true,
  stateOf,
}: ChoiceStageProps) {
  const { options } = challenge.payload;
  /* Every option, not the first: a board can mix kinds — "which one is a
     letter?" puts an A beside a shape — and one tile's kind is a poor guess at
     what the row wants. Wide tiles suit a row of glyphs; anything with a
     picture in it wants a square. */
  const tileShape = options.every(
    (option) => option.item.kind === "number" || option.item.kind === "text",
  )
    ? "wide"
    : "square";
  const layout = LAYOUTS[tileShape][options.length] ?? LAYOUTS[tileShape][3];

  /* The world this board is played in decides where the parts stand and what
     is painted around them — never what they are, what they say, or what
     happens when one is tapped. See `docs/kiddo-game-worlds.md`. */
  const world = useGameWorld();
  const { tiles, prompt: surface } = world.spec;

  const prompt = challenge.prompt.display ? (
    <PromptDisplay
      /* Keyed like the options below it, and for the same reason: a new
         question is a new board, so a group of things to count arrives
         afresh rather than being swapped under the child's eye.

         Not the *same* key as the options, though. A world composes the
         prompt and the row as siblings, and React reconciles siblings by
         key: two siblings sharing one key meant the old prompt was never
         matched for removal when the question changed, and stayed on the
         board under the new one — the "last question inside the next
         question" bug. Each part gets its own name. */
      key={`${challenge.id}:prompt`}
      parts={challenge.prompt.display}
      layout={challenge.prompt.layout}
      anchor={challenge.prompt.anchor}
      surface={surface}
    />
  ) : null;

  const row = (
    <motion.ul
      /* Remounts the row so a new question's options pop in rather than
         swap under the finger that just answered the last one. */
      key={`${challenge.id}:options`}
      variants={staggerChildren(0.05)}
      initial="hidden"
      animate="show"
      /* `flex-wrap` rather than a grid so a row that does not divide evenly
         centres its last line instead of stranding one tile on the left. */
      className={cn(
        "mx-auto flex w-full list-none flex-wrap items-center justify-center gap-3",
        layout.wrap,
      )}
    >
      {options.map((option) => {
        const state = stateOf?.(option.id) ?? "idle";
        return (
          <motion.li
            key={option.id}
            variants={popIn}
            /* A sign has a post under it; the row keeps room for the post. */
            className={cn(layout.item, tiles === "sign" && "pb-4")}
          >
            <WorldReaction
              moment="right"
              play={state === "correct"}
              className="flex w-full [&>[data-magic-subject]]:w-full"
            >
              <ChoiceTile
                shape={tileShape}
                look={tiles}
                label={captionOf(option.item)}
                srLabel={srLabelOf(option.item, state)}
                state={state}
                disabled={!accepting}
                onSelect={() =>
                  onAnswer({
                    challengeId: challenge.id,
                    answer: { kind: "choice", optionId: option.id },
                  })
                }
              >
                <ContentItemView item={option.item} scale="tile" />
              </ChoiceTile>
            </WorldReaction>
          </motion.li>
        );
      })}
    </motion.ul>
  );

  return <>{world.composeChoice({ prompt, options: row })}</>;
}
