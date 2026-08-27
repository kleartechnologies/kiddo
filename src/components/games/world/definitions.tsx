import type { TargetAndTransition, Transition } from "framer-motion";
import type { ReactNode } from "react";

import {
  GAME_WORLDS,
  type GameWorldId,
  type GameWorldSpec,
} from "@/lib/worlds/worlds";
import { ANIMALS_WORLD } from "./worlds/animals";
import { COUNTING_WORLD } from "./worlds/counting";
import { WORDS_WORLD } from "./worlds/words";

/**
 * What a world hands the engines, beyond its look tokens.
 *
 * The engine builds its parts — the prompt it always drew, the options it
 * always drew — and asks the world to arrange them. The parts arrive as
 * finished React nodes: every handler, label and state is already inside
 * them, and a world cannot reach in. It can only put them somewhere and paint
 * around them.
 */

export interface ChoiceParts {
  /** The line across the stage, or nothing if the question is spoken only. */
  prompt: ReactNode;
  /** The row of options. */
  options: ReactNode;
}

export interface ConnectParts {
  prompt: ReactNode;
  /** The two columns and the lines between them. */
  board: ReactNode;
}

/**
 * The way in: the world's friend, a glimpse of what the round is about, and
 * the button that starts it. The glimpse arrives as a finished node exactly
 * like an engine's parts do — the world decides where the three stand and
 * what is painted around them, never what is in them.
 */
export interface IntroParts {
  /** The world's friend, waving hello. */
  friend: ReactNode;
  /** A glimpse of the things the round is about, or nothing to glimpse. */
  preview: ReactNode;
  /** The start button, and under it whatever else the way in offers. */
  begin: ReactNode;
}

/** How a world's backdrop comes and goes when the child changes world. */
export interface WorldEntrance {
  hidden: TargetAndTransition;
  shown: TargetAndTransition;
  transition: Transition;
}

export interface GameWorldDefinition {
  spec: GameWorldSpec;
  /** Painted behind the playfield; keyed on the world, not the question. */
  backdrop: ReactNode | null;
  /** Room between the backdrop's edge and the board. Classes, literal. */
  padding: string;
  /**
   * How much of a short screen this world's painting costs, for the engines
   * that size a board by the height left over.
   *
   * `open` is a stage or a page: the board with a margin around it. `ground` is
   * a world that paints a band above the board and a band below it — sky and
   * near ground — which on a phone held sideways is most of the screen.
   *
   * A world cannot say this in CSS, because the engine has to know it before it
   * picks the class that caps the board. See `LAYOUTS` in `ChoiceStage`.
   */
  landscape: "open" | "ground";
  entrance: WorldEntrance;
  composeChoice: (parts: ChoiceParts) => ReactNode;
  composeConnect: (parts: ConnectParts) => ReactNode;
  composeIntro: (parts: IntroParts) => ReactNode;
}

/** Exactly the markup the engines drew before there were worlds. */
const STACK =
  "flex flex-col items-center gap-6 [@media(max-height:54rem)]:gap-4";

const CROSSFADE: WorldEntrance = {
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
  transition: { duration: 0.24 },
};

export const MEADOW_WORLD: GameWorldDefinition = {
  spec: GAME_WORLDS.meadow,
  backdrop: null,
  padding: "",
  landscape: "open",
  entrance: CROSSFADE,
  composeChoice: ({ prompt, options }) => (
    <div className={STACK}>
      {prompt}
      {options}
    </div>
  ),
  composeConnect: ({ prompt, board }) => (
    <div className={STACK}>
      {prompt}
      {board}
    </div>
  ),
  composeIntro: ({ friend, preview, begin }) => (
    <div className={`${STACK} text-center`}>
      {friend}
      {preview}
      {begin}
    </div>
  ),
};

export const WORLD_DEFINITIONS: Readonly<
  Record<GameWorldId, GameWorldDefinition>
> = {
  meadow: MEADOW_WORLD,
  counting: COUNTING_WORLD,
  animals: ANIMALS_WORLD,
  words: WORDS_WORLD,
};
