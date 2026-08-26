import type { Accent, CharacterId, Game, GameCategory } from "@/lib/games/types";
import { doorKey, worldBlurbKey, worldLineKey, worldNameKey } from "@/lib/i18n/names";
import type { MessageKey } from "@/lib/i18n/messages";
import { activitiesOf, type PlayableWorldId, type WorldActivity } from "./activities";
import type { GameWorldId } from "./worlds";

/**
 * A world as a *place* a child can go — what the map calls it, who lives
 * there, which sky it stands under. No JSX, no React.
 *
 * `GAME_WORLDS` says how a board is framed once the child is inside;
 * this file says what the door looks like from outside. The two are keyed on
 * the same id and nothing else is shared, so a world can change its scenery
 * without the map noticing, and the map can be redrawn without a board
 * changing.
 */

export interface WorldPlace {
  id: PlayableWorldId;
  /**
   * What the map calls it — as a message key, like everything else in here
   * that is words. A place has an accent, a sky and a friend living in it,
   * and none of those are language; its name and its two lines are, so they
   * are looked up rather than stored. See `lib/i18n/names`.
   */
  name: MessageKey;
  /** What KIDDO says about the place. One line a four year old understands. */
  line: MessageKey;
  /** For a grown-up reading over a shoulder. */
  blurb: MessageKey;
  /** The sky: the same theme the world's own Quest plays under. */
  theme: GameCategory;
  accent: Accent;
  /** The friend who lives here. KIDDO still hosts every round. */
  friend: CharacterId;
  route: `/worlds/${string}`;
}

export const WORLD_PLACES: Readonly<Record<WorldPlace["id"], WorldPlace>> = {
  counting: {
    id: "counting",
    name: worldNameKey("counting"),
    line: worldLineKey("counting"),
    blurb: worldBlurbKey("counting"),
    theme: "numbers",
    accent: "sprout",
    friend: "wally",
    route: "/worlds/counting",
  },
  animals: {
    id: "animals",
    name: worldNameKey("animals"),
    line: worldLineKey("animals"),
    blurb: worldBlurbKey("animals"),
    theme: "discovery",
    accent: "apricot",
    friend: "foxy",
    route: "/worlds/animals",
  },
  words: {
    id: "words",
    name: worldNameKey("words"),
    line: worldLineKey("words"),
    blurb: worldBlurbKey("words"),
    theme: "letters",
    accent: "blossom",
    friend: "bibi",
    route: "/worlds/words",
  },
};

export function placeOf(world: GameWorldId): WorldPlace | null {
  return world === "meadow" ? null : WORLD_PLACES[world];
}

export function activityRoute(activity: WorldActivity): string {
  return `/worlds/${activity.world}/${activity.slug}`;
}

/**
 * The `Game` a world activity plays as, for `GameShell` — which reads a
 * title, a sky, an accent and a cast, and nothing else. Not a catalogue
 * entry: these never appear in `GAMES` and have no card of their own.
 */
export function worldGameFor(activity: WorldActivity): Game {
  const place = WORLD_PLACES[activity.world];
  return {
    id: activity.id,
    /* The door's own words, from the same keys the map and the parent
       dashboard read — so a door is called one thing everywhere. */
    title: doorKey(activity, "title"),
    tagline: doorKey(activity, "intro"),
    parentSummary: doorKey(activity, "blurb"),
    category: place.theme,
    ageRange: { min: 4, max: 7 },
    difficulty: "gentle",
    accent: place.accent,
    cast: ["kiddo", place.friend],
    route: activityRoute(activity),
    access: "free",
    status: "ready",
    themes: [],
  };
}

/** How many doors a world has, for the map. */
export function doorsOf(world: GameWorldId): number {
  return activitiesOf(world).length;
}
