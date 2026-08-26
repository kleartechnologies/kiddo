import { recentJoinEvents } from "@/server/billing";
import { adminConfigured } from "@/server/firebaseAdmin";
import { json } from "@/server/http";
import { MAX_JOIN_NOTICES, recentJoins } from "@/lib/social/joins";

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
 */

/** Read a few more than are shown, since the window may drop some. */
const READ_LIMIT = MAX_JOIN_NOTICES * 3;

export async function GET() {
  if (!adminConfigured()) return quiet();
  try {
    const events = recentJoins(await recentJoinEvents(READ_LIMIT), Date.now());
    return json({ events }, 200);
  } catch (error) {
    console.error("[social/recent]", error instanceof Error ? error.message : error);
    return quiet();
  }
}

function quiet(): Response {
  return json({ events: [] }, 200);
}
