import { MAX_JOIN_NOTICES, recentJoins, type JoinEvent } from "@/lib/social/joins";
import { recentJoinEvents } from "@/server/billing";
import { adminConfigured } from "@/server/firebaseAdmin";
import { cachedJson, tooMany } from "@/server/http";
import { clientIp, consume, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/social/recent → { events: [{ at, plan }] }
 *
 * The handful of families who really did subscribe recently, as two facts
 * each and nothing else. The private half of a subscription — who, which
 * email, which customer, how much — is not in `joinEvents` at all, so this
 * route cannot leak it even by accident.
 *
 * On a build with no Firebase Admin, or when Firestore cannot be reached,
 * the answer is an empty list. KIDDO would rather show no notices than a
 * notice that did not happen, so there is no fallback and no sample data.
 *
 * This is the only route on KIDDO that answers a stranger, which made it
 * the only place an unauthenticated caller could spend Firestore reads at
 * will. Three layers now stand in front of the query, cheapest first:
 *
 *  1. The CDN is told it may keep the answer for a minute, so most repeat
 *     traffic never reaches a function at all.
 *  2. A per-instance cache of the same age answers what does reach one.
 *  3. Only a request that gets past both — one per instance per minute in
 *     the ordinary case — is counted against a durable per-IP budget, and
 *     only then does anything read Firestore.
 *
 * App Check is deliberately not one of the layers. The landing page does
 * not load the Firebase SDK — that is a whole bundle a visitor who never
 * signs in should not pay for — so there is no attestation to send, and
 * requiring one here would trade the notices for the protection. The
 * cache and the budget above are what stands here instead.
 *
 * So a flood costs at most one rate-limit transaction per window per IP,
 * rather than a dozen document reads per request. The cache is in memory
 * on purpose: it is an optimisation, and a stale or missing cache is
 * always safe. The *limit* is in Firestore precisely because in-memory
 * state would reset on every cold start, which is no limit at all.
 */

/** Read a few more than are shown, since the window may drop some. */
const READ_LIMIT = MAX_JOIN_NOTICES * 3;

/** How long the CDN and this process may reuse one answer. */
const CACHE_MS = 60_000;
const CACHE_S = CACHE_MS / 1000;

let cache: { at: number; events: readonly JoinEvent[] } | null = null;

export async function GET(request: Request) {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return quiet(recentJoins(cache.events, now));
  if (!adminConfigured()) return quiet([]);

  const budget = await consume(LIMITS.social, clientIp(request), now);
  if (!budget.allowed) {
    /* A Firestore outage is not the caller's fault, and the honest answer
       to "who joined recently" when KIDDO cannot tell is no notices. Real
       throttling gets a real 429; the client shows nothing either way. */
    return budget.failed ? quiet([]) : tooMany(budget.retryAfterS);
  }

  try {
    const events = await recentJoinEvents(READ_LIMIT);
    cache = { at: now, events };
    return quiet(recentJoins(events, now));
  } catch (error) {
    console.error("[social/recent]", error instanceof Error ? error.message : error);
    return quiet([]);
  }
}

/** Never fabricated: an empty list is the answer whenever KIDDO is unsure. */
function quiet(events: readonly JoinEvent[]): Response {
  return cachedJson({ events }, CACHE_S);
}
