import { hasAccess } from "@/lib/billing/access";
import { requireAppCheck } from "@/server/appCheck";
import { dealRound } from "@/server/content";
import { entitlementOf } from "@/server/entitlement";
import { adminConfigured } from "@/server/firebaseAdmin";
import { json, problem, readJson, requireCaller, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/round  { round, tier?, seed?, locale? } → { challenges }
 *
 * Ten questions, for a signed-in parent who has bought KIDDO. This is the
 * boundary KIDDO's paid content is meant to sit behind: the questions are
 * the product, and a product that ships in a public JavaScript chunk is not
 * being sold, it is being given away.
 *
 * Four checks, in the order that costs least:
 *  1. a Firebase ID token, verified — 401 without one;
 *  2. lifetime access in `users/{uid}`, which only the Billplz callback can
 *     write (or, for a parent from before the change, a subscription the
 *     Stripe webhook wrote) — 402 without either, and never a hint of the
 *     content;
 *  3. a per-account budget, because owning KIDDO is not entitlement to the
 *     whole corpus, only to playing — 429 past it;
 *  4. a round KIDDO actually has — 404 otherwise.
 *
 * `no-store`, always: this answer is one account's, and a CDN must never
 * hand it to anybody else.
 *
 * Honesty about what this is worth today: the game screens still deal their
 * own rounds from the bundle, so the packs are still in the browser and this
 * route is not yet the only way to them. See docs/SECURITY.md, "Paid content",
 * for exactly what is exposed and the plan for closing it.
 */
export async function POST(request: Request) {
  if (!adminConfigured()) return problem(503, "content-not-configured");
  const attested = await requireAppCheck(request);
  if (attested) return attested;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;

  const entitlement = await entitlementOf(caller.uid);
  if (!hasAccess(entitlement, Date.now())) return problem(402, "purchase-required");

  const budget = await consume(LIMITS.content, caller.uid);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  const body = await readJson(request);
  if (body instanceof Response) return body;

  /* The language is dealt with the round, not applied to it afterwards, and
     it is the caller's to state: the locale lives in the browser, and this
     route holds no session beyond the token it just verified. It can only
     change the words — see `dealRound`. */
  const challenges = dealRound(body.round, body.tier, body.seed, body.locale);
  if (!challenges) return problem(404, "unknown-round");
  return json({ challenges });
}
