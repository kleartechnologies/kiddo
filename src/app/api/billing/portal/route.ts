import { requireAppCheck } from "@/server/appCheck";
import { subscriptionOf } from "@/server/billing";
import { legacyBillingUnavailable, json, problem, readJson, requireCaller, safePath, siteUrl, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";
import { stripe } from "@/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal  { returnTo?: string }  → { url }
 *
 * A Stripe Customer Portal session for the signed-in parent's own customer.
 * The customer id is read from the server's copy of the user document,
 * never from the request, so a parent can only ever open their own portal.
 */
export async function POST(request: Request) {
  const down = legacyBillingUnavailable();
  if (down) return down;
  const attested = await requireAppCheck(request);
  if (attested) return attested;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const returnTo = safePath(body.returnTo, "/parents");

  const budget = await consume(LIMITS.portal, caller.uid);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  const state = await subscriptionOf(caller.uid);
  if (!state.stripeCustomerId) return problem(404, "no-customer");

  const base = siteUrl(request);
  if (!base) return problem(503, "site-url-not-configured");

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: state.stripeCustomerId,
      return_url: `${base}${returnTo}`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error("[billing/portal]", error instanceof Error ? error.message : error);
    return problem(502, "stripe-error");
  }
}
