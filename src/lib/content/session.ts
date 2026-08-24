import { challengeKey, drawChallenges } from "./challenges";
import type { Level } from "./difficulty";
import { getActivity } from "./registry";
import { createRng, type Rng } from "./rng";
import type { Activity, ActivityId, Challenge } from "./types";

/**
 * A round made of several activities.
 *
 * `drawChallenges` deals from one activity. A round of KIDDO is not one
 * activity: it counts, then compares, then adds, and it gets a little harder
 * as it goes. That shape is a list of slots — a level and the activities
 * allowed to fill it — and it is data, so a game describes its round rather
 * than writing a loop to build one.
 *
 * Nothing here is Math. The plan below happens to be Math Quest's; English
 * will hand the same function a different list.
 */

export interface SessionSlot {
  level: Level;
  /**
   * The activities allowed here, chosen between at random. More than one keeps
   * the round from being the same ten questions in the same ten places.
   */
  from: readonly ActivityId[];
}

export interface SessionPlan {
  slots: readonly SessionSlot[];
}

/** How many questions a slot asks for before accepting one already seen. */
const SLOT_ATTEMPTS = 6;

/**
 * What counts as "already asked".
 *
 * `challengeKey` — the default, and what Math, English and Logic use — means
 * "would a child notice this exact board again". A game may hand in
 * `conceptKey` instead, which means "is there anything new to learn here",
 * and is a stricter promise: two boards that teach the same idea in different
 * clothes are then also refused. Shapes & Colours makes that promise, because
 * its activities are small ideas dealt over big boards.
 *
 * Returning several keys means "refuse this if it repeats *any* of these".
 * Sameness is not always one measurement: a round can want no repeated idea
 * and no repeated spoken question, and those two are neither the same test nor
 * one stricter than the other.
 */
export type SessionKey = (challenge: Challenge) => string | readonly string[];

/** One key or several, always as several. */
function keysOf(keyOf: SessionKey, challenge: Challenge): readonly string[] {
  const key = keyOf(challenge);
  return typeof key === "string" ? [key] : key;
}

function fill(
  slot: SessionSlot,
  rng: Rng,
  seen: ReadonlySet<string>,
  keyOf: SessionKey,
): Challenge | undefined {
  const activities = slot.from
    .map((id) => getActivity(id))
    .filter((activity): activity is Activity => activity !== undefined);

  let fallback: Challenge | undefined;

  for (const activity of rng.shuffle(activities)) {
    for (let attempt = 0; attempt < SLOT_ATTEMPTS; attempt++) {
      const candidate = drawChallenges(activity, { level: slot.level, count: 1, rng })[0];
      if (!candidate) break;
      fallback ??= candidate;
      if (!keysOf(keyOf, candidate).some((key) => seen.has(key))) return candidate;
    }
  }

  return fallback;
}

/**
 * Deal one round.
 *
 * De-duplicates across the whole round, not just within an activity, so a
 * session never asks the same question twice however its slots are arranged.
 * `keyOf` decides what "the same" means — see `SessionKey`. Without an `rng`
 * the same round comes back every time, which is what a server render and a
 * test both want.
 */
export function drawSession(
  plan: SessionPlan,
  options: { rng?: Rng; keyOf?: SessionKey } = {},
): Challenge[] {
  const rng = options.rng ?? createRng(0);
  const keyOf = options.keyOf ?? challengeKey;
  const seen = new Set<string>();
  const drawn: Challenge[] = [];

  for (const slot of plan.slots) {
    const challenge = fill(slot, rng, seen, keyOf);
    if (!challenge) continue;

    for (const key of keysOf(keyOf, challenge)) seen.add(key);
    /* A generated id is only unique inside one draw, and two slots may land on
       the same activity. The slot number makes it unique inside the session,
       which is the scope a run and a React key both care about. */
    drawn.push({ ...challenge, id: `${challenge.id}@${drawn.length + 1}` });
  }

  return drawn;
}
