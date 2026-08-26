import type { MessageKey } from "@/lib/i18n/messages";

/**
 * Shared vocabulary for KIDDO games and characters.
 *
 * Everything the child sees is described here as data so a new game or content
 * pack is a data change plus one component, never a rewrite of the shell.
 */

/**
 * Colour families defined in `globals.css`, named after the character palette.
 * Five character hues plus honey for rewards. There is deliberately no sixth
 * hue: a new accent would break the family.
 */
export type Accent =
  | "sage"
  | "apricot"
  | "blossom"
  | "sprout"
  | "tide"
  | "honey";

export type CharacterId = "kiddo" | "foxy" | "bibi" | "pip" | "wally";

export interface CharacterArt {
   /**
   * Path under `/public/characters` for exported artwork. Leave undefined and
   * the built-in vector rig is drawn instead, which is the normal case: the
   * rig is the production character, not a placeholder. Only fill this in for
   * a one-off illustration the rig cannot express.
   */
  src?: string;
  /** Intrinsic size of `src`, required by next/image once artwork exists. */
  width?: number;
  height?: number;
}

export interface Character {
  id: CharacterId;
  /** Display name, always upper case in the brand voice: KIDDO, FOXY... */
  name: string;
  /** One short line a child could understand, used in intros and hints. */
  blurb: string;
  /** Personality words from the character bible. Used in copy and reviews. */
  traits: string[];
  accent: Accent;
  art: CharacterArt;
}

export type GameCategory =
  | "memory"
  | "discovery"
  | "numbers"
  | "letters"
  | "shapes"
  | "colours"
  | "patterns";

export type Difficulty = "gentle" | "growing" | "clever";

export interface AgeRange {
  min: number;
  max: number;
}

export type GameAccess = "free" | "premium";

/** `ready` games are playable, `soon` games render a friendly holding screen. */
export type GameStatus = "ready" | "soon";

/**
 * One themed set of items inside a game, e.g. Memory Match with animals rather
 * than shapes. Themes are how the catalogue grows without new code.
 *
 * Not the same thing as a `ContentPack` in `lib/content/types.ts`: that is a
 * subject — Math, English — and this is a costume for a game that already
 * exists. They were both called a pack until the content architecture arrived
 * and one of them had to give the name up.
 */
export interface GameTheme {
  id: string;
  /** The chip's words, in the catalogue: `game.<gameId>.theme.<id>`. */
  title: MessageKey;
  accent: Accent;
  access: GameAccess;
}

/**
 * Card artwork.
 *
 * A game card's illustration is a snapshot of the game, not a portrait of the
 * cast: the child should know what they will *do* before they can read the
 * title. Everything below describes that picture as data, so a hundred games
 * are a hundred entries in the catalogue rather than a hundred drawings.
 *
 * The drawing itself lives in `components/kiddo/artwork`, and there is one
 * motif renderer per `ArtMotif` kind — never one per game.
 */

/**
 * The shapes the card artwork can draw.
 *
 * A subset of the content layer's `ShapeName`, written out here so the
 * catalogue does not have to depend on `lib/content`. The artwork renders
 * them with the content layer's own shape paths, which is what keeps the
 * circle on the Logic card and the circle inside Logic the same circle — so
 * adding a name here that the content layer does not draw is a type error
 * where the two meet, not a surprise on the card.
 */
export type ArtShape = "circle" | "square" | "triangle" | "star";

/**
 * What the host is doing with the game's things.
 *
 * KIDDO plays it as a pose, because KIDDO is the only rigged character. The
 * friends have one canonical pose each, so for them the action is carried by
 * the composition instead: the things sit in front of the character, at hand
 * height, rather than beside it.
 */
export type ArtAction = "pointing" | "holding";

/**
 * The one idea a card's picture is about, and the objects that say it.
 *
 * Keyed on what the child does — match, search, add, spell, continue a
 * pattern — for the same reason `ChallengeKind` is: the subject changes far
 * more often than the picture does. A second memory game is a new `memory`
 * motif with different faces, not a new drawing.
 */
export type ArtMotif =
  /** Two cards of the same friend, and one still face down. */
  | { kind: "memory"; face: CharacterId }
  /** One friend picked out of a line-up, under a magnifier. */
  | { kind: "search"; target: CharacterId; others: [CharacterId, CharacterId] }
  /** A sum with its answer still missing: 2 + 3 = ? */
  | { kind: "sum"; left: number; right: number; operation: "+" | "-" }
  /** A word with a letter missing: the pair either side of the gap, C _ T. */
  | { kind: "word"; letters: [string, string] }
  /** Two things that belong together, joined — and one still looking. */
  | { kind: "pair"; left: string; right: string }
  /** A repeating run of shapes, and the slot that continues it. */
  | { kind: "pattern"; sequence: [ArtShape, ArtShape, ArtShape] }
  /** Four unmistakable shapes, each in its own colour. */
  | { kind: "shapes"; shapes: [ArtShape, ArtShape, ArtShape, ArtShape] }
  /** The world itself, being looked at. */
  | { kind: "world" };

export interface GameArtwork {
  /** The friend the child will meet, and the one handling the objects. */
  host: CharacterId;
  action: ArtAction;
  /**
   * A second character, further back and smaller. Use it only when it says
   * something the motif cannot: one card, one idea.
   */
  companion?: CharacterId;
  /** The illustration bed's tint. Defaults to the game's own accent. */
  bed?: Accent;
  /** What the child will actually do, drawn. */
  motif: ArtMotif;
}

export interface Game {
  id: string;
  /**
   * Child-facing name. Short enough to read at a glance.
   *
   * A key rather than the words, because a child who chose Malay plays
   * "Jelajah Nombor". The words live in the message catalogue and nowhere
   * else, so a third language is a third catalogue and not a third copy of
   * this file — and the compiler will not let a game name a line that no
   * language has written.
   */
  title: MessageKey;
  /** One playful sentence spoken to the child, not a feature description. */
  tagline: MessageKey;
  /** Plain description for the eventual parent-facing catalogue. */
  parentSummary: MessageKey;
  category: GameCategory;
  ageRange: AgeRange;
  difficulty: Difficulty;
  accent: Accent;
  /** Characters that host this game. Drives the card artwork. */
  cast: CharacterId[];
  /**
   * How the card's illustration is composed. Without it the card falls back
   * to the cast standing in a row, which says who but never what.
   */
  artwork?: GameArtwork;
  /** Optional finished key art, under `/public/games`. Wins over `artwork`. */
  art?: CharacterArt;
  route: string;
  access: GameAccess;
  status: GameStatus;
  themes: GameTheme[];
}
