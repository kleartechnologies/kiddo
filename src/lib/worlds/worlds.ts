import type { ActivityId, Challenge } from "@/lib/content/types";
import type { MagicMotionName } from "@/lib/magicMotion";

/**
 * Which world a challenge is played in. No JSX, no React.
 *
 * A world is a *presentation profile*: what is drawn around a board, how the
 * engine's parts are framed, and which of the eight Magic Motions plays at
 * which engine moment. It is chosen from `activityId` — the one fact every
 * quest already holds at render time — and it is never chosen by an engine.
 * Engines read the look tokens below and nothing else, so `ChoiceStage` still
 * cannot tell a garden from a meadow; it only knows whether a tile wants a
 * post under it. See `docs/kiddo-game-worlds.md`.
 */

export type GameWorldId = "meadow" | "counting" | "animals" | "words";

/** Does the line across the stage sit in a card, or stand in the open? */
export type PromptLook = "card" | "open";
/** A tile as today, or a sign planted on a post. */
export type TileLook = "tile" | "sign";
/** A bordered card, a creature standing in the open, or a word on a page. */
export type NodeLook = "card" | "creature" | "page";
/** A straight line, a dotted path across land, or a ribbon across a spine. */
export type JoinLook = "line" | "path" | "ribbon";

/**
 * The engine moments a world may react to. Four, and they all exist already:
 * a thing arriving on the board, a correct tile, the left and the right node
 * of a join the reducer accepted. A world cannot invent a fifth.
 */
export type WorldMoment = "arrive" | "right" | "joined" | "partner";

export interface GameWorldSpec {
  id: GameWorldId;
  /** Said to reviewers and tools, never to the child. */
  name: string;
  prompt: PromptLook;
  tiles: TileLook;
  nodes: NodeLook;
  join: JoinLook;
  /** Which Magic Motion plays at which moment. `null` is "nothing extra". */
  reactions: Readonly<Record<WorldMoment, MagicMotionName | null>>;
}

const QUIET: GameWorldSpec["reactions"] = {
  arrive: null,
  right: null,
  joined: null,
  partner: null,
};

export const GAME_WORLDS: Readonly<Record<GameWorldId, GameWorldSpec>> = {
  /* Every board that has not earned a world of its own: exactly today. */
  meadow: {
    id: "meadow",
    name: "Meadow",
    prompt: "card",
    tiles: "tile",
    nodes: "card",
    join: "line",
    reactions: QUIET,
  },
  /* Things to count stand on the grass; the numbers are signs in the ground.
     The things already `pop` in one at a time (PromptDisplay); the sign that
     is right sparkles. */
  counting: {
    id: "counting",
    name: "Counting Garden",
    prompt: "open",
    tiles: "sign",
    nodes: "card",
    join: "line",
    reactions: { ...QUIET, right: "sparkle" },
  },
  /* Animals on the land, homes across the way. An animal pops in, walks home
     when the join is right (ConnectStage's own `travel`), and the home
     sparkles to welcome it. */
  animals: {
    id: "animals",
    name: "Animal Adventure",
    prompt: "open",
    tiles: "tile",
    nodes: "creature",
    join: "path",
    reactions: { ...QUIET, arrive: "pop", partner: "sparkle" },
  },
  /* Two pages of a storybook. Pictures grow onto the page; a rhyme found
     bounces on the left and sparkles on the right. */
  words: {
    id: "words",
    name: "Word World",
    prompt: "open",
    tiles: "tile",
    nodes: "page",
    join: "ribbon",
    reactions: {
      ...QUIET,
      arrive: "grow",
      joined: "bounce",
      partner: "sparkle",
    },
  },
};

/**
 * Which activities play in which world. Everything not listed is the meadow.
 * An activity earns a line here when its *lesson* is a place — counting is
 * about things in a space, homes are about a journey, rhymes are about a page.
 */
export const WORLD_OF_ACTIVITY: Partial<Record<ActivityId, GameWorldId>> = {
  "math.counting-objects": "counting",
  "math.counting": "counting",
  "general-knowledge.home-partners": "animals",
  "general-knowledge.animal-homes": "animals",
  "english.rhyming-partners": "words",
  "english.sound-partners": "words",
};

export function worldOf(
  challenge: Pick<Challenge, "activityId"> | null | undefined,
): GameWorldId {
  if (!challenge) return "meadow";
  return WORLD_OF_ACTIVITY[challenge.activityId] ?? "meadow";
}
