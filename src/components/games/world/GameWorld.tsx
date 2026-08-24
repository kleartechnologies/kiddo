"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useContext, useState, type ReactNode } from "react";

import { MagicMotion } from "@/components/kiddo/MagicMotion";
import { cn } from "@/lib/cn";
import {
  GAME_WORLDS,
  type GameWorldId,
  type GameWorldSpec,
  type WorldMoment,
} from "@/lib/worlds/worlds";
import { WORLD_DEFINITIONS, type GameWorldDefinition } from "./definitions";

/**
 * The world a board is played in: the layer between `GameShell` and the
 * engines that is allowed to know what a board is *about*.
 *
 * ## What it does
 *
 * 1. Draws the world's **backdrop** behind the playfield, keyed on the world
 *    so it stays put between two questions in the same world and changes
 *    only when the child moves to a different one — which is the moment a
 *    child should notice they are somewhere new.
 * 2. Keys the **stage** on the challenge, inside `AnimatePresence
 *    mode="wait"`, so one board leaves before the next arrives and two boards
 *    are never interactive at once.
 * 3. Hands the engines a **context**: the world's look tokens and its
 *    `compose*` functions, which take the engine's own parts — the prompt it
 *    drew, the options it drew — and arrange them. The engine keeps every
 *    handler, every label and every state; the world only decides where the
 *    parts stand and what is painted around them.
 *
 * ## What it may not do
 *
 * Own a gesture, a selection, a verdict, a name, or a motion that is not one
 * of the eight. `WorldReaction` below is the whole of a world's access to
 * Magic Motion, and it can only play at the four moments in `WorldMoment`.
 */

const GameWorldContext = createContext<GameWorldDefinition>(
  WORLD_DEFINITIONS.meadow,
);

/** The world this board is in. The meadow when nobody said otherwise. */
export function useGameWorld(): GameWorldDefinition {
  return useContext(GameWorldContext);
}

/** The look tokens alone, for code that only needs to know a shape. */
export function useWorldSpec(): GameWorldSpec {
  return useContext(GameWorldContext).spec;
}

/**
 * A world's reaction at one engine moment, or nothing at all.
 *
 * `play` is a fact the engine already holds — this tile is the right one,
 * this node is joined — and the motion plays once when it becomes true and
 * stays settled. In a world with no reaction at that moment the children are
 * rendered bare, so the meadow's DOM is exactly what it was.
 */
export function WorldReaction({
  moment,
  play,
  delay,
  className,
  children,
}: {
  moment: WorldMoment;
  play: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const { spec } = useGameWorld();
  const name = spec.reactions[moment];
  if (!name) return <>{children}</>;
  return (
    <MagicMotion
      motion={name}
      playKey={play ? 1 : 0}
      delay={delay}
      className={className}
    >
      {children}
    </MagicMotion>
  );
}

export function GameWorld({
  id = "meadow",
  stageKey,
  className,
  children,
}: {
  id?: GameWorldId;
  /** The challenge on the table. A new key is a new board. */
  stageKey?: string;
  className?: string;
  children: ReactNode;
}) {
  const definition = WORLD_DEFINITIONS[id] ?? WORLD_DEFINITIONS.meadow;
  const reduced = useReducedMotion();

  /* The page arrives already drawn; only a board or a world that *replaces*
     another moves in. "Replaces" is "is not the one this frame opened with",
     remembered once — never `initial={false}` on the presence, which framer
     keeps for the whole subtree, so a pip that mounted later would never pop. */
  const [opening] = useState(() => ({ world: id, stage: stageKey }));
  const firstWorld = opening.world === id;
  const firstStage = opening.stage === stageKey;

  const { spec } = definition;
  const entrance = definition.entrance;

  return (
    <div
      data-world={spec.id}
      className={cn("relative flex flex-1 flex-col justify-center", className)}
    >
      <AnimatePresence mode="wait">
        {definition.backdrop ? (
          <motion.div
            key={spec.id}
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            initial={firstWorld || reduced ? false : entrance.hidden}
            animate={entrance.shown}
            exit={reduced ? { opacity: 0 } : entrance.hidden}
            transition={reduced ? { duration: 0 } : entrance.transition}
          >
            {definition.backdrop}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* The world's padding and its context ride *inside* the keyed stage:
          a board on its way out keeps the world it was played in until it
          has gone, rather than being re-laid-out under the next one while
          it fades. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stageKey ?? "stage"}
          className={cn(
            "flex min-h-0 flex-1 flex-col justify-center",
            definition.backdrop ? definition.padding : undefined,
          )}
          /* A crossfade and nothing else: a board's own parts arrive with
             their own motion (pips pop, animals walk) and Phase 2's rule is
             that nothing under them moves while they do. */
          initial={firstStage || reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
          }
        >
          <GameWorldContext.Provider value={definition}>
            {children}
          </GameWorldContext.Provider>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export { GAME_WORLDS };
