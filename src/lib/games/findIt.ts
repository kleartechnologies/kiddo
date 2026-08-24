import { CHARACTER_LIST } from "@/data/characters";
import { shuffle } from "./shuffle";
import type { Accent, CharacterId } from "./types";

/**
 * Find It content.
 *
 * The engine below never looks past `id` and `label`: it picks a target,
 * picks distractors, shuffles, and asks whether the tapped `id` is the one.
 * Everything that says what a thing *looks like* sits under `kind`, and only
 * `FindItChoice` reads it. That is the whole trick — an animals, colours or
 * numbers pack is a new member of `FindItItem` plus a branch in that one
 * component. No rule, no round plan and no hook changes.
 */

interface FindItItemBase {
  /** Unique within a round. */
  id: string;
  /** What the child is asked to find, in the brand voice: FOXY, not Foxy. */
  label: string;
  /** Colour family, so a found choice can tint itself in the thing's own hue. */
  accent: Accent;
}

export interface FindItCharacterItem extends FindItItemBase {
  kind: "character";
  characterId: CharacterId;
}

/** V1 is character-only. The union is where `| FindItColourItem` will go. */
export type FindItItem = FindItCharacterItem;

export interface FindItRound {
  id: string;
  /** `id` of the item in `choices` the child is looking for. */
  targetId: string;
  choices: FindItItem[];
}

/** KIDDO & Friends, as findable things. */
export const FRIENDS_POOL: readonly FindItItem[] = CHARACTER_LIST.map(
  (character) => ({
    id: character.id,
    label: character.name,
    accent: character.accent,
    kind: "character" as const,
    characterId: character.id,
  }),
);

/**
 * How many choices each round shows, in order.
 *
 * Rounds get busier, never harder in any other way: the task is identical,
 * there is simply more to look at. The last two ask for six. The cast is
 * five and no round may show the same friend twice, so today those rounds
 * deal five — the whole family, the widest an honest character round can be.
 * `buildRounds` clamps rather than repeats, so the sixth choice arrives on
 * its own the day the pool grows.
 */
export const ROUND_PLAN: readonly number[] = [4, 4, 4, 6, 6];

/** How a list is laid out. `shuffle` for a real game, identity on the server. */
type Arrange = <T>(items: readonly T[]) => T[];

const inOrder: Arrange = (items) => [...items];

/**
 * Turn a pool and a plan into rounds.
 *
 * Targets are drawn from one arrangement of the pool, so with five friends
 * and five rounds every friend is asked for exactly once: no repeats, no
 * favourites, and never the same game twice.
 */
export function buildRounds(
  pool: readonly FindItItem[] = FRIENDS_POOL,
  plan: readonly number[] = ROUND_PLAN,
  arrange: Arrange = inOrder,
): FindItRound[] {
  const targets = arrange(pool);

  return plan.map((requested, index) => {
    const target = targets[index % targets.length];
    const others = arrange(pool.filter((item) => item.id !== target.id));
    /* Never more choices than there are distinct things to show. Two of the
       same friend in one round would make the question unanswerable. */
    const count = Math.min(requested, pool.length);

    return {
      id: `round-${index + 1}`,
      targetId: target.id,
      /* Arranged again, separately, so the answer's position owes nothing to
         the order the distractors were picked in. */
      choices: arrange([target, ...others.slice(0, count - 1)]),
    };
  });
}

/**
 * A real game: fresh targets, fresh distractors, fresh positions.
 *
 * Only ever called in the browser. The first render uses `buildRounds`
 * unshuffled so the server and the client agree on the markup, then the hook
 * deals properly on mount.
 */
export function dealRounds(
  pool: readonly FindItItem[] = FRIENDS_POOL,
  plan: readonly number[] = ROUND_PLAN,
): FindItRound[] {
  return buildRounds(pool, plan, shuffle);
}

/** The thing the child is looking for this round. */
export function targetOf(round: FindItRound): FindItItem {
  return round.choices.find((item) => item.id === round.targetId) ?? round.choices[0];
}
