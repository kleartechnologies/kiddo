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
import type { MessageKey, Translate } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useLocale";
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
  /** The same cap on a phone held sideways, where the height is the scarce one. */
  land: string;
  /** …and on a sideways phone with nothing above the row but the round itself. */
  landRoomy: string;
  /** How wide one option is. */
  item: string;
}

/**
 * Sized by how many tiles there are and how tall they are, because a square
 * tile needs the height a wide one does not. Every cap is `min(comfortable,
 * max(floor, what the height allows))`: the tiles get big on a desktop, shrink
 * on a phone held sideways, and never take a scrollbar with them.
 *
 * `18rem` is the chrome a game round wears on a screen with the height for it —
 * header, KIDDO's question, the line on the stage and the padding between them.
 * On a tall screen the width runs out first anyway, so that number only has to
 * be about right.
 *
 * ## A phone on its side is the case the height decides
 *
 * There, and only there, the cap is the whole game: 390px of height minus the
 * chrome leaves barely more than one tile, so a number that is about right puts
 * the last row under the fold. Two are measured rather than guessed, and which
 * one applies is decided by what is actually above the row:
 *
 *   • `landRoomy` — `13.5rem` — a plain stage asking a spoken question. The
 *     header, KIDDO at icon scale, and the row. Nothing else.
 *   • `land` — `17rem` — everything else: a line to read above the options, or
 *     a world that stands them on its own painted ground. Both cost about
 *     `3.5rem` more, and a world pays for it by compacting its own padding on a
 *     short screen — see `LANDSCAPE` in `worlds/counting`.
 *
 * They are picked in JavaScript rather than by a third media query, because two
 * arbitrary variants carrying the same query would be decided by the order
 * Tailwind emitted them in, which is not a thing to build on. One string or the
 * other reaches `className`; never both.
 *
 * The multipliers say how wide a row of N tiles is for one tile's height. A
 * wide tile measures about `1.25` across for every `1` down, so three of them
 * are `3.75`, not the `4.2` the tall-screen caps use — generous is free when
 * the width is what binds and costs a row off the bottom when the height is.
 *
 * The floors are higher there too — about `7rem` a tile — because a tile is
 * only as narrow as the word written under it. Cap the row below what the
 * words need and the last tile wraps to a second line, which costs the whole
 * height of a tile rather than the few pixels the cap was trying to save. On
 * the shortest screens the floor wins and the page scrolls a little; that is
 * the better of the two, and it is the same bargain `MemoryBoard` strikes.
 *
 * `33.9375rem` and below is that phone; `34rem` and up is everything taller.
 * The two are mutually exclusive on purpose, the way `FindItBoard` splits them,
 * so nothing depends on the order Tailwind emits two arbitrary variants in —
 * which is also why the four-option row says `and (min-height:34rem)` on the
 * branch that used to be width alone.
 *
 * Written out in full rather than composed: Tailwind only ships classes it can
 * find as literal text, and a template interpolation is not literal text.
 */
const LAYOUTS: Record<"wide" | "square", Record<number, Layout>> = {
  wide: {
    2: {
      wrap: "max-w-[min(26rem,max(11rem,calc((100dvh_-_18rem)*2.8)))]",
      land: "[@media(max-height:33.9375rem)]:max-w-[min(26rem,max(15rem,calc((100dvh_-_17rem)*2.5)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)]:max-w-[min(26rem,max(15rem,calc((100dvh_-_13.5rem)*2.5)))]",
      item: "basis-[calc(50%_-_0.375rem)]",
    },
    3: {
      wrap: "max-w-[min(34rem,max(14rem,calc((100dvh_-_18rem)*4.2)))]",
      land: "[@media(max-height:33.9375rem)]:max-w-[min(34rem,max(22rem,calc((100dvh_-_17rem)*3.75)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)]:max-w-[min(34rem,max(22rem,calc((100dvh_-_13.5rem)*3.75)))]",
      item: "basis-[calc(33.333%_-_0.5rem)]",
    },
    4: {
      wrap: cn(
        "max-w-[min(24rem,max(12rem,calc((100dvh_-_18rem)*1.4)))]",
        "[@media(min-width:36rem)_and_(min-height:34rem)]:max-w-[min(46rem,max(18rem,calc((100dvh_-_18rem)*5.6)))]",
      ),
      land: "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(46rem,max(30rem,calc((100dvh_-_17rem)*5)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(46rem,max(30rem,calc((100dvh_-_13.5rem)*5)))]",
      item: cn(
        "basis-[calc(50%_-_0.375rem)]",
        "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:basis-[calc(25%_-_0.5625rem)]",
        "[@media(min-width:36rem)_and_(min-height:34rem)]:basis-[calc(25%_-_0.5625rem)]",
      ),
    },
  },
  square: {
    2: {
      wrap: "max-w-[min(22rem,max(10rem,calc((100dvh_-_18rem)*2)))]",
      land: "[@media(max-height:33.9375rem)]:max-w-[min(22rem,max(15rem,calc((100dvh_-_17rem)*2)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)]:max-w-[min(22rem,max(15rem,calc((100dvh_-_13.5rem)*2)))]",
      item: "basis-[calc(50%_-_0.375rem)]",
    },
    3: {
      wrap: "max-w-[min(30rem,max(13rem,calc((100dvh_-_18rem)*3)))]",
      land: "[@media(max-height:33.9375rem)]:max-w-[min(30rem,max(22rem,calc((100dvh_-_17rem)*3)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)]:max-w-[min(30rem,max(22rem,calc((100dvh_-_13.5rem)*3)))]",
      item: "basis-[calc(33.333%_-_0.5rem)]",
    },
    4: {
      wrap: cn(
        "max-w-[min(22rem,max(10rem,calc(100dvh_-_18rem)))]",
        "[@media(min-width:36rem)_and_(min-height:34rem)]:max-w-[min(40rem,max(16rem,calc((100dvh_-_18rem)*4)))]",
      ),
      land: "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(40rem,max(30rem,calc((100dvh_-_17rem)*4)))]",
      landRoomy:
        "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:max-w-[min(40rem,max(30rem,calc((100dvh_-_13.5rem)*4)))]",
      item: cn(
        "basis-[calc(50%_-_0.375rem)]",
        "[@media(max-height:33.9375rem)_and_(min-width:36rem)]:basis-[calc(25%_-_0.5625rem)]",
        "[@media(min-width:36rem)_and_(min-height:34rem)]:basis-[calc(25%_-_0.5625rem)]",
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

/**
 * What each state is called out loud. Exhaustive over `ChoiceState`, so a
 * sixth state cannot be added without deciding what it sounds like.
 *
 * `dimmed` is a tile that is out of the way rather than out of play, and to
 * someone listening it is still an ordinary choice — which is exactly what
 * the `default` branch this table replaced used to say.
 */
const CHOICE_WORDS: Record<ChoiceState, MessageKey> = {
  correct: "stage.choice.correct",
  wrong: "stage.choice.wrong",
  tried: "stage.choice.tried",
  dimmed: "stage.choice.idle",
  idle: "stage.choice.idle",
};

/** The whole instruction, with the state in words so nothing rests on colour. */
function srLabelOf(item: ContentItem, state: ChoiceState, t: Translate): string {
  return t(CHOICE_WORDS[state], { name: spokenOf(item) });
}

export function ChoiceStage({
  challenge,
  onAnswer,
  accepting = true,
  stateOf,
}: ChoiceStageProps) {
  const t = useT();
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

  /* How much of a sideways phone is left for the row. A world that paints its
     own ground stands the options on it, and a line to read takes the height
     above them; a stage or a page with a spoken question has neither, so its
     tiles get to stay big. The world says which it is. */
  const roomy = world.landscape === "open" && !challenge.prompt.display;

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
        /* One of the two, never both: see `LAYOUTS`. */
        roomy ? layout.landRoomy : layout.land,
      )}
    >
      {options.map((option) => {
        const state = stateOf?.(option.id) ?? "idle";
        return (
          <motion.li
            key={option.id}
            variants={popIn}
            /* Measurement hooks, the same pair `ConnectStage` and `OrderStage`
               already carry as `data-node-id` and `data-item-id`. The id is
               the answer's identity and must be the same word in every
               language; the state is what the board is saying about it. A
               browser cannot read either from a tile otherwise, so
               `scripts/measure-language.mjs` could not tell a round that was
               translated from a round that was dealt again. Nothing reads
               them at runtime. */
            data-option-id={option.id}
            data-option-state={state}
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
                srLabel={srLabelOf(option.item, state, t)}
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
