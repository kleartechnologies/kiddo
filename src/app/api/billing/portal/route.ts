import { subscriptionOf } from "@/server/billing";
import { billingUnavailable, json, problem, readJson, requireCaller, safePath, siteUrl } from "@/server/http";
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
  const down = billingUnavailable();
  if (down) return down;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;

  const body = await readJson(request);
  const returnTo = safePath(body.returnTo, "/parents");
  const state = await subscriptionOf(caller.uid);
  if (!state.stripeCustomerId) return problem(404, "no-customer");

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: state.stripeCustomerId,
      return_url: `${siteUrl(request)}${returnTo}`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error("[billing/portal]", error instanceof Error ? error.message : error);
    return problem(502, "stripe-error");
  }
}
