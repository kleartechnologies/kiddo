import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { FIREBASE_PROJECT_ID } from "@/lib/firebase/config";

/**
 * Firebase Admin for KIDDO's route handlers. Server-only: the service
 * account never reaches a browser, and `server-only` makes a client import
 * a build error rather than a leak.
 *
 * Configured by one variable, `FIREBASE_SERVICE_ACCOUNT`: the JSON of a
 * service-account key (Firebase console → Project settings → Service
 * accounts → Generate new private key), either verbatim or base64-encoded
 * so it survives a one-line environment field in Netlify.
 *
 * Admin bypasses Firestore rules. That is the point — the webhook writes
 * `users/{uid}.subscription`, which the rules forbid to every client — and
 * also the reason the routes that use it check the caller's ID token first.
 */

let app: App | null = null;

export function adminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

function serviceAccount(): Record<string, string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set.");
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text) as Record<string, string>;
}

export function adminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) return (app = existing);
  const account = serviceAccount();
  app = initializeApp({
    credential: cert(account),
    projectId: account.project_id || FIREBASE_PROJECT_ID,
  });
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export interface Caller {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  /** Unix seconds of the sign-in that minted the token. */
  authTime: number;
}

/**
 * Who is calling, from `Authorization: Bearer <Firebase ID token>`. Returns
 * null for a missing, malformed, expired or revoked token — the route
 * answers 401 and nothing else happens.
 */
export async function callerFromRequest(request: Request): Promise<Caller | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  try {
    const token = await adminAuth().verifyIdToken(match[1], true);
    return {
      uid: token.uid,
      email: token.email ?? null,
      emailVerified: token.email_verified === true,
      authTime: token.auth_time,
    };
  } catch {
    return null;
  }
}
