import { initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

/**
 * Firebase App Check — "this request came from KIDDO in a real browser".
 *
 * What it is for: KIDDO's Firebase project answers the open internet.
 * Anyone can read `NEXT_PUBLIC_FIREBASE_API_KEY` out of the page and then
 * talk to Firebase Auth and Firestore directly with a script — which is
 * how sign-up floods, password spraying and address enumeration are
 * actually done. Security rules say *what* a signed-in parent may touch;
 * App Check is the separate question of whether the caller is KIDDO at
 * all. reCAPTCHA answers it and Google's backends check the answer.
 *
 * What it protects, once enforcement is switched on in the Firebase
 * console (per product — see docs/SECURITY.md):
 *   • Firestore reads and writes from the client SDK.
 *   • Firebase Authentication: sign-up, sign-in, password reset.
 * and, because KIDDO sends the token on its own fetches too:
 *   • KIDDO's API routes, when APP_CHECK_ENFORCED is set on the server.
 *
 * What it does not protect, and what therefore still needs server-side
 * defences of its own:
 *   • The Stripe webhook, which is called by Stripe and not by a browser —
 *     that is what the signature check is for.
 *   • Anything a *real* KIDDO page can be made to do by a real signed-in
 *     parent. App Check attests the app, never the person, so ownership
 *     checks, the rate limits in src/server/rateLimit.ts and the Firestore
 *     rules all still carry their own weight.
 *   • A determined attacker who drives a real browser. App Check raises
 *     the cost of automation; it does not make it impossible.
 *
 * Off by default: with no site key configured — every local dev run, every
 * test, every build that has not been given one — this does nothing at all
 * and KIDDO behaves exactly as before.
 */

let started: AppCheck | null = null;

function siteKey(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY || null;
}

/** True when this build was given a reCAPTCHA site key for App Check. */
export function appCheckConfigured(): boolean {
  return siteKey() !== null;
}

/**
 * Starts App Check, once, if there is a key. Safe to call on every
 * `services()`; safe to call when there is no key, and on the server.
 */
export function startAppCheck(app: FirebaseApp): void {
  const key = siteKey();
  if (started || !key || typeof window === "undefined") return;

  /* A debug token is how a developer machine or a CI browser passes App
     Check without a real reCAPTCHA. It is registered in the console
     against this project and is not a secret in the Stripe sense, but it
     belongs in .env.local rather than in the repository. */
  const debug = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  if (debug) {
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = debug;
  }

  const enterprise = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER === "enterprise";
  try {
    started = initializeAppCheck(app, {
      provider: enterprise ? new ReCaptchaEnterpriseProvider(key) : new ReCaptchaV3Provider(key),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    /* Already initialised, or reCAPTCHA could not load. Neither is worth
       breaking a parent's sign-in over: the server still decides. */
  }
}

/**
 * The App Check token to send with a call to KIDDO's own API, or null.
 *
 * Null is an ordinary answer — no key configured, reCAPTCHA blocked by an
 * extension, offline. The server decides what to do about it, which is
 * "nothing" unless APP_CHECK_ENFORCED says otherwise.
 */
export async function appCheckHeader(): Promise<Record<string, string>> {
  if (!started) return {};
  try {
    const { token } = await getToken(started, false);
    return token ? { "x-firebase-appcheck": token } : {};
  } catch {
    return {};
  }
}
