import { requireAppCheck } from "@/server/appCheck";
import { subscriptionOf } from "@/server/billing";
import { adminAuth, adminConfigured, adminDb } from "@/server/firebaseAdmin";
import { json, problem, requireCaller, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";
import { stripe, stripeConfigured } from "@/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Firebase's own "recent login" window; the client asks for it first. */
export const RECENT_AUTH_S = 5 * 60;

/**
 * POST /api/account/delete — the signed-in parent deletes their account.
 *
 * Order matters and is server-side so it cannot be half-done from a tab
 * that closes:
 *  1. Stripe: cancel any live subscription now (no further charges) and
 *     delete the customer, so nothing keeps billing an account that is gone.
 *  2. Firestore: journeys, children, the user document, the event log that
 *     mentions them.
 *  3. Firebase Auth: the sign-in itself.
 *
 * Requires a token minted by a sign-in within the last five minutes, the
 * same rule Firebase applies to deleting a user from the client.
 */
export async function POST(request: Request) {
  if (!adminConfigured()) return problem(503, "accounts-not-configured");
  const attested = await requireAppCheck(request);
  if (attested) return attested;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;
  if (Math.floor(Date.now() / 1000) - caller.authTime > RECENT_AUTH_S) {
    return problem(403, "recent-login-required");
  }

  /* Deleting an account is irreversible and wanted once. A budget this
     small costs a real parent nothing and stops a stolen token from
     hammering Stripe and Firestore with cancel-and-delete work. */
  const budget = await consume(LIMITS.accountDelete, caller.uid);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  const uid = caller.uid;
  try {
    if (stripeConfigured()) {
      const state = await subscriptionOf(uid);
      if (state.stripeCustomerId) {
        const subs = await stripe().subscriptions.list({ customer: state.stripeCustomerId, status: "all", limit: 20 });
        for (const sub of subs.data) {
          if (["canceled", "incomplete_expired"].includes(sub.status)) continue;
          await stripe().subscriptions.cancel(sub.id);
        }
        await stripe().customers.del(state.stripeCustomerId);
      }
    }

    const db = adminDb();
    const children = await db.collection("children").where("parentId", "==", uid).get();
    const batch = db.batch();
    for (const child of children.docs) {
      batch.delete(db.collection("journeys").doc(child.id));
      batch.delete(child.ref);
    }
    batch.delete(db.collection("users").doc(uid));
    await batch.commit();

    await adminAuth().deleteUser(uid);
    return json({ deleted: true });
  } catch (error) {
    console.error("[account/delete]", error instanceof Error ? error.message : error);
    return problem(502, "delete-failed");
  }
}
