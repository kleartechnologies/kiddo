/**
 * Firebase web configuration, read from the build environment.
 *
 * These values are the public "web app" config from the Firebase console
 * (Project settings → Your apps → Web app). They identify the project; they
 * are not secrets and are safe in client code — access is controlled by
 * Firestore security rules (`firestore.rules`), never by hiding these.
 *
 * Configure them in Netlify (Site configuration → Environment variables) and
 * in `.env.local` for development:
 *
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        kiddocares.com in production
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID         defaults to kiddocares-b105e
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * `authDomain` is the host Firebase serves the sign-in handler from, and so
 * the host Google's account chooser shows the parent. In production it is
 * KIDDO's own domain: `netlify.toml` proxies `/__/auth/*` through to
 * Firebase Hosting, so `kiddocares.com/__/auth/handler` is the real handler
 * served from KIDDO's own origin, with no second hostname anywhere.
 *
 * That is not cosmetic. `signInWithRedirect` — which an installed iOS KIDDO
 * has no choice but to use (see `signInMethod.ts`) — parks the half-finished
 * sign-in in the handler's storage while the parent is away at Google, and a
 * handler on a third-party origin loses it to Safari's storage partitioning.
 * Same origin, no partition, no lost sign-in.
 *
 * Whatever this is set to must also be listed in Firebase Authentication's
 * authorized domains, in the Google OAuth client's authorized redirect URIs
 * as `https://<authDomain>/__/auth/handler`, and in `frame-src` in
 * `next.config.ts`. Unset, it falls back to the project's own domain: the
 * popup still works there, which is every browser but an installed iPhone.
 *
 * Without the API key and app id KIDDO runs in device-only mode: everything
 * plays as before, and the parent area explains that accounts are not set up
 * on this build instead of failing.
 */

export const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kiddocares-b105e";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export function firebaseConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !appId) return null;
  return {
    apiKey,
    appId,
    projectId: FIREBASE_PROJECT_ID,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  };
}

/** True when this build was given a Firebase web config. */
export const CLOUD_CONFIGURED = firebaseConfig() !== null;
