import { isPlan } from "@/lib/billing/subscription";
import { customerFor, liveSubscriptions } from "@/server/billing";
import { billingUnavailable, json, problem, readJson, requireCaller, safePath, siteUrl } from "@/server/http";
import { priceIds, stripe } from "@/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/checkout  { plan: "monthly" | "yearly", returnTo?: string }
 * → { url }  a Stripe Checkout session for the signed-in parent.
 *
 * The browser only ever learns a URL. The price comes from the server's
 * env, the customer from the user document, the parent from the ID token.
 * Completing Checkout grants nothing by itself: access appears when the
 * webhook has written `users/{uid}.subscription.status = "active"`.
 */
export async function POST(request: Request) {
  const down = billingUnavailable();
  if (down) return down;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;

  const body = await readJson(request);
  if (!isPlan(body.plan)) return problem(400, "bad-plan");
  const returnTo = safePath(body.returnTo, "/parents");

  try {
    const customer = await customerFor(caller.uid, caller.email);
    /* One subscription per parent. A retry after a failed first payment is
       fine (Stripe expires `incomplete` after a day and the parent can try
       again); an `active` or `past_due` one must not be doubled. */
    const live = await liveSubscriptions(customer);
    if (live.some((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due")) {
      return problem(409, "already-subscribed");
    }
    const base = siteUrl(request);
    const joiner = returnTo.includes("?") ? "&" : "?";
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: caller.uid,
      line_items: [{ price: priceIds()[body.plan], quantity: 1 }],
      success_url: `${base}${returnTo}${joiner}checkout=success`,
      cancel_url: `${base}${returnTo}${joiner}checkout=cancelled`,
      allow_promotion_codes: false,
      subscription_data: { metadata: { uid: caller.uid, plan: body.plan } },
      metadata: { uid: caller.uid, plan: body.plan },
    });
    if (!session.url) return problem(502, "stripe-no-url");
    return json({ url: session.url });
  } catch (error) {
    console.error("[billing/checkout]", error instanceof Error ? error.message : error);
    return problem(502, "stripe-error");
  }
}
