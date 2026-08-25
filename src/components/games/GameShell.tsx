"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { GameWorld } from "@/components/games/world/GameWorld";
import { BackLink } from "@/components/kiddo/BackLink";
import { Celebration, type CelebrationMoment } from "@/components/kiddo/Celebration";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ProgressDots } from "@/components/kiddo/ProgressDots";
import { SoundToggle } from "@/components/kiddo/SoundToggle";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { WorldMusic } from "@/components/kiddo/WorldMusic";
import { Screen } from "@/components/ui/Screen";
import { useDuckedMusic, useSoundCue } from "@/lib/audio/useAudio";
import type { SoundId } from "@/lib/audio/tracks";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { riseIn, springSoft } from "@/lib/motion";
import type { Pose } from "@/components/character/poses";
import type { CharacterId, Game } from "@/lib/games/types";
import type { GameWorldId } from "@/lib/worlds/worlds";

/**
 * The frame every KIDDO game plays inside.
 *
 * It owns the chrome — exit, title, progress, the host character asking the
 * question, and the celebration at the end. A game supplies only its stage,
 * so Memory Match, Find It and Math Quest can look like one product without
 * agreeing on anything beyond these props.
 *
 * ## And it owns what the round sounds like
 *
 * `feedback` and `status` are already the whole vocabulary a KIDDO game uses
 * to say how it is going, and every game speaks it — Memory Match, which does
 * not even have questions, says the same two words as the five quests. So the
 * sound of a round is decided here, once, from those two props, rather than
 * six times inside six games that would each drift.
 *
 * There are exactly three cues, and none of them is a verdict: KIDDO cheers,
 * KIDDO invites you to try again, KIDDO celebrates the end. A game cannot
 * make a fourth noise because there is no fourth thing it can report.
 */

/** The host's line, and every line the bubble is sized against. One type. */
const PROMPT_TEXT = "font-display text-xl leading-snug font-semibold sm:text-2xl";

export interface GameShellProps {
  game: Game;
  /** The instruction, spoken by the host character. */
  prompt?: ReactNode;
  /**
   * Everything else the host may say about *this* question — the cheer, the
   * nudge, the hint. The bubble is sized to the tallest of them from the
   * start, so it does not change height when the prompt swaps and nothing
   * under it moves while the child is looking at it. See `SpeechBubble`.
   */
  promptReserve?: readonly ReactNode[];
  /** Which friend is hosting this round. Defaults to the game's lead. */
  host?: CharacterId;
  progress?: { current: number; total: number };
  /**
   * Drives the host's pose. This is the whole reason the mascot is rigged:
   * the child gets a reaction from a companion, not a green tick.
   * Only KIDDO reacts — the friends carry the worlds, not the feedback.
   */
  feedback?: "idle" | "correct" | "retry";
  status?: "playing" | "complete";
  celebration?: {
    title?: string;
    message?: string;
    onPlayAgain?: () => void;
    /** What the world gave back, if the round was played inside one. */
    reward?: ReactNode;
    /** The door after this one. */
    next?: { href: string; label: string };
    /** How big the finish was. See `CelebrationMoment`. */
    moment?: CelebrationMoment;
  };
  /**
   * Where the back arrow and the celebration's way out lead. KIDDO World by
   * default; a round played inside a world goes back to that world's map.
   */
  exit?: { href: string; label: string };
  /**
   * The world the board on the table is played in, and which board that is.
   * `world` paints the environment and frames the engine's parts; `stageKey`
   * is the challenge id, so one board leaves before the next arrives. Both
   * default to what every game did before there were worlds: no
   * environment, one stage. See `docs/kiddo-game-worlds.md`.
   */
  world?: GameWorldId;
  stageKey?: string;
  /**
   * The same thing in words, for a screen reader. A game that keys its stage
   * says it here rather than inside the playfield, so the live region is one
   * element for the whole round and never remounts with the board — a region
   * that arrives already full is not read out.
   */
  announce?: string;
  /** The playfield. */
  children: ReactNode;
}

export function GameShell({
  game,
  prompt,
  promptReserve = [],
  host,
  progress,
  feedback = "idle",
  status = "playing",
  celebration,
  world,
  stageKey,
  announce,
  exit,
  children,
}: GameShellProps) {
  const accent = ACCENTS[game.accent];
  /* The playfield only ever comes back after a celebration, so "has this
     shell celebrated yet" is exactly "is this a return visit". */
  const [celebrated, setCelebrated] = useState(false);
  if (status === "complete" && !celebrated) setCelebrated(true);
  const speaker = host ?? game.cast[0] ?? "kiddo";

  /* The round, as one sound. Finishing outranks the answer that finished it:
     the last right answer has already cheered on its own, a beat earlier,
     while the game was still holding the correct tile up. */
  const cue: SoundId | null =
    status === "complete"
      ? "complete"
      : feedback === "correct"
        ? "correct"
        : feedback === "retry"
          ? "retry"
          : null;

  useSoundCue(cue);
  /* And the room quietens for the celebration, the way it would for anything
     else KIDDO says out loud. The bed comes back when the child plays again. */
  useDuckedMusic(status === "complete");

  /* Asking -> pointing at the choices. Right -> a cheer. Wrong -> a lean in
     and an open hand. There is no pose in the library for disappointed. */
  const hostPose: Pose =
    feedback === "correct" ? "cheer" : feedback === "retry" ? "reassure" : "point";

  return (
    /* The same world the child chose the game from, one corner along: the
       game's category picks the sky and the hills, and `quiet` takes the
       weather out of it. A playfield is busy enough without a meadow. */
    <Screen theme={game.category} detail="quiet">
      {/* The bed follows the child in. It is already playing if they came
          from the world; this is here for the child who was handed a link
          straight into a game. */}
      <WorldMusic />

      {/* ## Why this row is allowed to become two
          A phone has about 350px of header, and two 56px round controls, a
          game's name and ten progress dots do not fit in it. Asked to fit
          anyway, the flexible thing gives way — and the flexible thing is the
          title, which arrived at one letter and an ellipsis. So on a narrow
          screen the dots take a line of their own instead: nothing is dropped,
          nothing is truncated, and the row is back to holding what it can
          actually hold. From `sm` up there is room for all of it and the dots
          come back into line. */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
        <BackLink href={exit?.href} label={exit?.label} />

        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "font-display truncate text-xl font-semibold sm:text-2xl",
              accent.text,
            )}
          >
            {game.title}
          </h1>
        </div>

        {/* Same switch, same corner, on every screen a child can reach: the
            one who wants the music off mid-round should not have to leave the
            round to say so. */}
        <SoundToggle />

        {progress && status === "playing" ? (
          <ProgressDots
            total={progress.total}
            current={progress.current}
            className="order-last w-full justify-center sm:order-none sm:w-auto"
          />
        ) : null}
      </header>

      {/* The page arrives already drawn: the playfield must not rise in on
          first paint, only when it comes back after "Play again". That used
          to be `initial={false}` on AnimatePresence, which framer remembers
          for the whole life of the "playing" subtree — every motion element
          mounted inside it later (a counting pip popping in, an animal
          walking home) was started at its finished values. The rule now
          lives on the playfield itself, where it affects nothing below. */}
      <AnimatePresence mode="wait">
        {status === "complete" ? (
          <motion.main
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springSoft}
            /* The same short-screen rule the playfield below already follows.
               Measured at 360×640, the shortest phone in the sweep: a
               celebration with a two line message stood 60px taller than the
               screen, so the child had to scroll to reach "Play again" — the
               one moment in a game where nothing should be below the fold.
               The card is centred in whatever room is left, so this padding
               only ever decides whether the celebration fits; nothing moves
               on a screen where it already did. */
            className={cn(
              "flex flex-1 items-center justify-center py-10",
              "[@media(max-height:44rem)]:py-2",
            )}
          >
            <Celebration
              character={speaker}
              title={celebration?.title}
              message={celebration?.message}
              onPlayAgain={celebration?.onPlayAgain}
              reward={celebration?.reward}
              next={celebration?.next}
              moment={celebration?.moment}
              backHref={exit?.href}
              backLabel={exit?.label}
            />
          </motion.main>
        ) : (
          /* The playfield is what this page is for, so it says so: a screen
             reader jumping by landmark lands on the board rather than on the
             header it just left. */
          <motion.main
            key="playing"
            variants={riseIn}
            initial={celebrated ? "hidden" : false}
            animate="show"
            exit={{ opacity: 0 }}
            /* Anything shorter than a large phone gives the chrome's
               breathing room back to the playfield. On a phone — upright or
               on its side — that is the difference between seeing a whole
               board and scrolling for it. */
            className={cn(
              "flex flex-1 flex-col gap-8 py-6 sm:py-8",
              "[@media(max-height:54rem)]:gap-4 [@media(max-height:54rem)]:py-3",
            )}
          >
            {prompt ? (
              <div className="flex items-start gap-3 sm:gap-4">
                <CharacterFigure id={speaker} size="md" pose={hostPose} />
                <SpeechBubble
                  className="max-w-2xl flex-1"
                  tail="left"
                  /* Every line that can be said, at its full height — and
                     no clamp on the invisible copies. A clamp here was tried
                     and measured: holding two lines open while a hint renders
                     at four is a bubble that changes height the moment a
                     child gets something wrong, which is the one thing this
                     reserve exists to prevent. `measure-quest-magic.mjs`
                     catches it as "bubble grew 27.5px on a miss". The dead
                     space under a short question is the price of a bubble
                     that never moves, and it is the right way round: a hint
                     written shorter is a content fix, not a layout one. */
                  reserve={promptReserve.map((line, index) => (
                    <p key={index} className={PROMPT_TEXT}>
                      {line}
                    </p>
                  ))}
                >
                  <p className={PROMPT_TEXT}>{prompt}</p>
                </SpeechBubble>
              </div>
            ) : null}

            <GameWorld id={world} stageKey={stageKey}>
              {children}
            </GameWorld>

            {announce !== undefined ? (
              <p role="status" aria-live="polite" className="sr-only">
                {announce}
              </p>
            ) : null}
          </motion.main>
        )}
      </AnimatePresence>
    </Screen>
  );
}
