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
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        e.g. kiddocares-b105e.firebaseapp.com
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID         defaults to kiddocares-b105e
 *   NEXT_PUBLIC_FIREBASE_APP_ID
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
