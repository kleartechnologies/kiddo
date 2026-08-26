import "server-only";

import { adminApp, adminConfigured } from "./firebaseAdmin";
import { problem } from "./http";

/**
 * The server half of Firebase App Check.
 *
 * The browser sends `x-firebase-appcheck` with its own API calls (see
 * src/lib/firebase/appCheck.ts). This verifies it with the Admin SDK,
 * which is the only way the header means anything — an unverified header
 * is a string an attacker can type.
 *
 * Enforcement is a deliberate production switch, not a default. Set
 * APP_CHECK_ENFORCED=true only once the site key is configured and a real
 * browser has been seen to pass; until then a missing or bad token is
 * noted and allowed, so a misconfiguration cannot lock parents out of
 * their own account. Firestore and Firebase Auth are enforced separately,
 * in the Firebase console, and that is where App Check does most of its
 * work — this covers the routes KIDDO serves itself.
 *
 * Not for the Stripe webhook: Stripe is not a browser and has no App Check
 * token. Its authenticity comes from the signature over the raw body.
 */

export function appCheckEnforced(): boolean {
  return process.env.APP_CHECK_ENFORCED === "true";
}

/**
 * Returns a 401 when enforcement is on and the caller cannot prove it is
 * KIDDO; null when the request may continue.
 */
export async function requireAppCheck(request: Request): Promise<Response | null> {
  const token = request.headers.get("x-firebase-appcheck");
  if (!appCheckEnforced()) return null;
  if (!adminConfigured()) return null;
  if (!token) return problem(401, "app-check-required");
  try {
    const { getAppCheck } = await import("firebase-admin/app-check");
    await getAppCheck(adminApp()).verifyToken(token);
    return null;
  } catch {
    return problem(401, "app-check-failed");
  }
}
