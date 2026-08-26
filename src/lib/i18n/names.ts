import type { ActivityId } from "@/lib/content/types";
import type { CharacterId } from "@/lib/games/types";
import type { GameWorldId } from "@/lib/worlds/worlds";
import type { PlayableWorldId, Tier, WorldActivity } from "@/lib/worlds/activities";
import type { MessageKey } from "./messages";

/**
 * The message key for a piece of KIDDO's own furniture.
 *
 * Worlds, doors, tiers, rewards and characters are *data* — they live in
 * `lib/worlds` and `data/characters` and are read by the map, the doors, the
 * game shell, the parent area and the landing page alike. None of that data
 * moved into the catalogue, because a world is not a string: it has an
 * accent, a sky, a friend and a set of session plans, and only its name and
 * its one-liner are language. So the data keeps its shape and this file is
 * the join — an id in, a key out.
 *
 * ## Why these are functions and not a table
 *
 * A template literal type is doing the checking. `` `world.${id}.name` ``
 * where `id` is `GameWorldId` resolves to a union of four literal keys, and
 * TypeScript refuses it unless all four are in `MessageKey` — so adding a
 * world without translating it does not compile. That is the same guarantee
 * a hand-written `Record` would give, minus the hand-writing.
 *
 * The doors are the exception. `WorldActivityId` is `` `${GameWorldId}.${string}` ``
 * — the slug is open by design — so its template type is too wide to check
 * and `doorKey` has to assert. `tests/i18n.test.ts` closes that hole from the
 * other side: it walks `WORLD_ACTIVITIES` and fails if any of the four keys
 * for any real door is missing from either catalogue. A new door is caught by
 * a test rather than by the compiler, which is the same deal
 * `tests/journey.test.ts` already makes with the Firestore rules.
 */

export function worldNameKey(id: GameWorldId): MessageKey {
  return `world.${id}.name`;
}

export function worldLineKey(id: PlayableWorldId): MessageKey {
  return `world.${id}.line`;
}

export function worldBlurbKey(id: PlayableWorldId): MessageKey {
  return `world.${id}.blurb`;
}

/** What a door says, in one of its four voices. */
export type DoorVoice = "title" | "blurb" | "intro" | "done";

export function doorKey(activity: WorldActivity | string, voice: DoorVoice): MessageKey {
  const id = typeof activity === "string" ? activity : activity.id;
  return `door.${id}.${voice}` as MessageKey;
}

export function tierKey(tier: Tier): MessageKey {
  return `tier.${tier}`;
}

/** A world's keepsake: one of them, several of them, or the moment it is won. */
export type RewardVoice = "one" | "many" | "earned";

export function rewardKey(world: GameWorldId, voice: RewardVoice): MessageKey {
  return `reward.${world}.${voice}`;
}

export function characterBlurbKey(id: CharacterId): MessageKey {
  return `character.${id}.blurb`;
}

/**
 * What a content activity is called, for the grown-up reading the dashboard.
 *
 * The child never sees this — "Beginning sounds", "Smallest group first" — but
 * the parent area lists every lesson a world draws from, and a list of English
 * lesson names under a Malay heading is exactly the half-translated screen
 * §13 rules out.
 *
 * Derived from the id rather than stored beside the questions, so there is one
 * copy of the words and it is in the catalogues. `ActivityId` is
 * `` `${PackId}.${string}` ``, open at the tail like a door slug, so this
 * asserts for the same reason `doorKey` does and is closed the same way:
 * `tests/i18n.test.ts` walks the registry and fails if a real activity is
 * missing its key in either language.
 */
export function conceptKey(id: ActivityId): MessageKey {
  return `concept.${id}` as MessageKey;
}
