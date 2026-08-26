import "server-only";

import { buildEnglishQuestSession } from "@/lib/games/englishQuest";
import { buildGeneralKnowledgeSession } from "@/lib/games/generalKnowledgeQuest";
import { buildLogicQuestSession } from "@/lib/games/logicQuest";
import { buildMatchQuestSession } from "@/lib/games/matchQuest";
import { buildMathQuestSession } from "@/lib/games/mathQuest";
import { buildShapesQuestSession } from "@/lib/games/shapesColoursQuest";
import { localizeRound } from "@/lib/content/i18n";
import { createRng } from "@/lib/content/rng";
import type { Challenge } from "@/lib/content/types";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locale";
import { findWorldActivity, TIERS, type Tier } from "@/lib/worlds/activities";

/**
 * Dealing a round, on the server.
 *
 * This is the access boundary for KIDDO's content: the questions themselves
 * are what a subscription buys, and the only honest way to keep them is to
 * hand out one round at a time to someone who has paid for it, rather than
 * shipping the whole shelf to every browser that loads the page.
 *
 * The seam is deliberately the one the games already have. Each game owns a
 * `build…Session(rng)` that turns a seed into ten questions; this file calls
 * exactly those functions, so the server deals the same round the client used
 * to deal for itself and nothing about how a round is composed moves or
 * changes. Migrating a game means replacing its one local call with a fetch.
 *
 * Only whole rounds are dealt. There is no "give me activity X" and no "give
 * me everything": a caller can ask for the next ten questions, and that plus
 * the per-account budget in `LIMITS.content` is what makes copying the corpus
 * expensive and attributable instead of one anonymous `curl`.
 *
 * See docs/SECURITY.md — until every game asks here, the packs are still in
 * the client bundle and this boundary is not yet the only way in.
 */

/** The rounds a caller may name. Anything else is a 404, not a guess. */
const QUESTS = {
  "math-quest": buildMathQuestSession,
  "english-quest": buildEnglishQuestSession,
  "logic-quest": buildLogicQuestSession,
  "shapes-quest": buildShapesQuestSession,
  "match-quest": buildMatchQuestSession,
  "general-knowledge-quest": buildGeneralKnowledgeSession,
} as const;

export type QuestRound = keyof typeof QUESTS;

/** A world door's round is named `world:<activity id>`, with a tier. */
const WORLD_PREFIX = "world:";

export function isTier(value: unknown): value is Tier {
  return TIERS.includes(value as Tier);
}

/**
 * The challenges for one round, or null if the round is not one KIDDO has.
 *
 * `seed` comes from the caller so a child who reloads mid-round gets the same
 * questions back. It decides nothing about *what* content exists, only the
 * order it is drawn in, so trusting the browser with it costs nothing.
 *
 * `locale` is part of dealing, not something done to a dealt round afterwards:
 * the round is composed, then said, and what leaves this function is already
 * in the language it was asked for. A caller that asked for Malay is never
 * sent English to translate. What the language cannot touch is which round
 * came out — the plan, the seed and every id are chosen before `localizeRound`
 * sees them, so the same seed deals the same ten questions with the same right
 * answers in either language, and only the words differ.
 *
 * A round that comes back from here is already said. It must not be passed
 * through `useSaid` as well; that hook is for the rounds a game still deals
 * for itself in the browser.
 */
export function dealRound(
  round: unknown,
  tier: unknown,
  seed: unknown,
  /* Optional: a caller that says nothing gets English, the same as a caller
     that says something KIDDO does not speak. */
  locale?: unknown,
): Challenge[] | null {
  if (typeof round !== "string") return null;
  const rng = createRng(typeof seed === "number" && Number.isFinite(seed) ? seed : 0);
  /* An unknown language is English, never an error: the content is what was
     paid for, and refusing to deal it over a bad `locale` string would be a
     new way to lock a child out of a round they own. */
  const said: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;

  if (round.startsWith(WORLD_PREFIX)) {
    const id = round.slice(WORLD_PREFIX.length);
    const [world, slug] = id.split(".");
    const activity = world && slug ? findWorldActivity(world, slug) : undefined;
    if (!activity) return null;
    const chosen: Tier = isTier(tier) ? tier : 1;
    return localizeRound(said, buildGeneralKnowledgeSession(rng, activity.plans[chosen]));
  }

  const quest = Object.hasOwn(QUESTS, round) ? QUESTS[round as QuestRound] : undefined;
  if (!quest) return null;
  return localizeRound(said, quest(rng));
}

/** Every quest round by name, for the route's errors and for its tests. */
export const ROUND_NAMES: readonly string[] = Object.keys(QUESTS);
