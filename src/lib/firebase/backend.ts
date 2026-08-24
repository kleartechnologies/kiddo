import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  applyActionCode as firebaseApplyActionCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type Auth,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";

import { NO_SUBSCRIPTION, parseSubscription } from "@/lib/billing/subscription";
import { parseJourney } from "@/lib/journey/journey";
import type { CloudBackend, ParentUser } from "@/lib/cloud/types";
import { CloudError, type AuthFailure } from "@/lib/cloud/types";

import { firebaseConfig } from "./config";

/**
 * The real backend: Firebase Authentication for the parent, Firestore for
 * the child and the journey. This module is only ever loaded through a
 * dynamic import from the session store, so the child's pages do not carry
 * the SDK until a parent has actually signed in on the device.
 *
 * Data model (see `firestore.rules` for who may touch what):
 *
 *   users/{uid}          { email, createdAt, updatedAt, subscription? }
 *   children/{childId}   { parentId, name, createdAt, updatedAt }
 *   journeys/{childId}   { completed, last, updatedAt }
 *
 * `subscription` is written only by the server (Stripe webhook, Admin SDK);
 * this client reads it and the rules refuse to let it write it. Billing
 * actions — Checkout, the Customer Portal, account deletion — are requests
 * to KIDDO's own API routes, carrying the parent's Firebase ID token.
 *
 * A child document id is not the parent's uid so that a second child can
 * exist one day without changing the model; today `findChild` returns the
 * first (and only) one.
 */

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function services(): { auth: Auth; db: Firestore } {
  if (!auth || !db) {
    const config = firebaseConfig();
    if (!config) throw new CloudError("unknown", "Firebase is not configured on this build.");
    app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { auth, db };
}

const toParent = (user: User): ParentUser => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified,
});

function reasonOf(error: unknown): AuthFailure {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "invalid-email";
    case "auth/weak-password":
      return "weak-password";
    case "auth/email-already-in-use":
      return "email-in-use";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "wrong-password";
    case "auth/user-not-found":
      return "no-account";
    case "auth/too-many-requests":
      return "too-many-attempts";
    case "auth/network-request-failed":
    case "unavailable":
      return "offline";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "bad-link";
    case "auth/requires-recent-login":
      return "recent-login";
    default:
      return "unknown";
  }
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CloudError) throw error;
    throw new CloudError(reasonOf(error), error instanceof Error ? error.message : undefined);
  }
}

/** Firebase's own window for "recent login", with a little margin. */
const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

export const firebaseBackend: CloudBackend = {
  onAuth(listener) {
    const { auth } = services();
    return onAuthStateChanged(auth, (user) => listener(user ? toParent(user) : null));
  },

  signUp: (email, password) =>
    guarded(async () => {
      const { auth } = services();
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return toParent(user);
    }),

  signIn: (email, password) =>
    guarded(async () => {
      const { auth } = services();
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      return toParent(user);
    }),

  signOut: () => guarded(() => firebaseSignOut(services().auth)),

  ensureUser: (user) =>
    guarded(async () => {
      const { db } = services();
      const ref = doc(db, "users", user.uid);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await updateDoc(ref, { email: user.email, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, { email: user.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }),

  findChild: (parentId) =>
    guarded(async () => {
      const { db } = services();
      const snap = await getDocs(
        query(collection(db, "children"), where("parentId", "==", parentId), limit(1)),
      );
      const first = snap.docs[0];
      if (!first) return null;
      const data = first.data();
      return { id: first.id, parentId, name: typeof data.name === "string" ? data.name : "" };
    }),

  createChild: (parentId, name) =>
    guarded(async () => {
      const { db } = services();
      const ref = await addDoc(collection(db, "children"), {
        parentId,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: ref.id, parentId, name };
    }),

  updateChildName: (childId, name) =>
    guarded(() => updateDoc(doc(services().db, "children", childId), { name, updatedAt: serverTimestamp() })),

  watchJourney(childId, listener) {
    const { db } = services();
    return onSnapshot(
      doc(db, "journeys", childId),
      (snap) => listener(snap.exists() ? parseJourney(snap.data()) : null),
      () => {
        /* A permission or network error mid-watch: say nothing rather than
           hand the store an empty journey it might treat as truth. */
      },
    );
  },

  writeJourney: (childId, journey) =>
    guarded(() =>
      setDoc(doc(services().db, "journeys", childId), {
        completed: [...journey.completed],
        medium: [...journey.medium],
        hard: [...journey.hard],
        last: journey.last,
        updatedAt: serverTimestamp(),
      }),
    ),

  deleteAccount: (user) =>
    guarded(async () => {
      const { auth, db } = services();
      const current = auth.currentUser;
      if (!current || current.uid !== user.uid) throw new CloudError("no-account");
      /* Deleting a sign-in needs a recent one (about five minutes), on the
         server and in the SDK alike. Check first, so a stale sign-in is
         reported before anything is removed and nothing is half-deleted. */
      const signedInAt = Date.parse(current.metadata.lastSignInTime ?? "");
      if (!Number.isFinite(signedInAt) || Date.now() - signedInAt > RECENT_SIGN_IN_MS) {
        throw new CloudError("recent-login", "auth/requires-recent-login");
      }
      /* Preferred: the server cancels Stripe first, then removes everything
         with the Admin SDK. Only a deployment with no server falls through
         to the client-side deletion below. */
      if (await deleteOnServer()) {
        await firebaseSignOut(auth).catch(() => {});
        return;
      }
      const child = await firebaseBackend.findChild(user.uid);
      if (child) {
        await deleteDoc(doc(db, "journeys", child.id));
        await deleteDoc(doc(db, "children", child.id));
      }
      await deleteDoc(doc(db, "users", user.uid));
      /* Last, because once the sign-in is gone the rules would refuse the
         deletes above. */
      await deleteUser(current);
    }),

  /* ---- Password and email ------------------------------------------- */

  sendPasswordReset: (email) =>
    guarded(() => sendPasswordResetEmail(services().auth, email.trim(), { url: actionReturnUrl() })),

  verifyResetCode: (code) => guarded(() => verifyPasswordResetCode(services().auth, code)),

  confirmPasswordReset: (code, password) =>
    guarded(() => firebaseConfirmPasswordReset(services().auth, code, password)),

  sendVerification: () =>
    guarded(async () => {
      const current = services().auth.currentUser;
      if (!current) throw new CloudError("no-account");
      await sendEmailVerification(current, { url: actionReturnUrl() });
    }),

  applyActionCode: (code) => guarded(() => firebaseApplyActionCode(services().auth, code)),

  reloadUser: () =>
    guarded(async () => {
      const current = services().auth.currentUser;
      if (!current) return null;
      await current.reload();
      return toParent(current);
    }),

  /* ---- Billing --------------------------------------------------------- */

  watchSubscription(uid, listener) {
    const { db } = services();
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => listener(snap.exists() ? parseSubscription(snap.data().subscription) : NO_SUBSCRIPTION),
      () => {
        /* Say nothing on error: the session keeps whatever it last knew. */
      },
    );
  },

  startCheckout: (plan, returnTo) =>
    guarded(async () => {
      const { url } = await callApi<{ url: string }>("/api/billing/checkout", { plan, returnTo });
      return url;
    }),

  openPortal: (returnTo) =>
    guarded(async () => {
      const { url } = await callApi<{ url: string }>("/api/billing/portal", { returnTo });
      return url;
    }),
};

/** Where a password-reset or verification email sends the parent back to. */
function actionReturnUrl(): string {
  return `${window.location.origin}/parents`;
}

/**
 * One of KIDDO's own routes, called with the parent's ID token. Answers are
 * small JSON objects; failures become `CloudError`s with a reason the UI
 * already knows how to word.
 */
async function callApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const current = services().auth.currentUser;
  if (!current) throw new CloudError("no-account");
  const token = await current.getIdToken();
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CloudError("offline");
  }
  if (response.ok) return (await response.json()) as T;
  const error = await response
    .json()
    .then((j: { error?: string }) => j.error ?? "")
    .catch(() => "");
  if (response.status === 503) throw new CloudError("billing-unavailable", error);
  if (response.status === 401) throw new CloudError("no-account", error);
  if (response.status === 403 && error === "recent-login-required") throw new CloudError("recent-login", error);
  throw new CloudError("unknown", error || `HTTP ${response.status}`);
}

/** True when the server handled the deletion; false when there is no server. */
async function deleteOnServer(): Promise<boolean> {
  try {
    await callApi("/api/account/delete", {});
    return true;
  } catch (error) {
    if (error instanceof CloudError && error.reason === "billing-unavailable") return false;
    throw error;
  }
}
