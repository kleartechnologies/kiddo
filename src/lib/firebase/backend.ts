import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  applyActionCode as firebaseApplyActionCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
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

import { NO_ENTITLEMENT, parseEntitlement } from "@/lib/billing/access";
import { parseJourney } from "@/lib/journey/journey";
import { childSlotIds } from "@/lib/cloud/children";
import type { CloudBackend, ParentUser } from "@/lib/cloud/types";
import { CloudError, type AuthFailure } from "@/lib/cloud/types";

import { appCheckHeader, startAppCheck } from "./appCheck";
import { firebaseConfig } from "./config";
import { googleSignInMethod, markRedirectPending, readSignInEnvironment } from "./signInMethod";

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
    /* Before anything else talks to Firebase: App Check attaches an
       attestation to the SDK's own calls, so the console can refuse the
       ones that did not come from KIDDO. A no-op when unconfigured. */
    startAppCheck(app);
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
    /* The parent shut the Google window, or clicked the button twice and
       the first window was cancelled. Neither is worth a sentence. */
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "popup-closed";
    case "auth/popup-blocked":
      return "popup-blocked";
    /* One account per email address: the address already signs in another
       way, and Firebase will not silently make a second account for it.
       (`auth/email-already-in-use` is the password form of the same thing
       and is answered above, where creating an account asks about it.) */
    case "auth/account-exists-with-different-credential":
      return "different-sign-in";
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

/**
 * What KIDDO asks Google for, on both roads.
 *
 * If a sign-in throws `auth/operation-not-allowed`, Google sign-in is
 * switched off for the project: Firebase console → Authentication → Sign-in
 * method. It reaches the parent as "something went wrong", which is all the
 * card can honestly say about a server setting.
 */
function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  /* KIDDO wants a name and an address to put the account under, and nothing
     else. `email` and `profile` are what Google grants by default; asking
     for them explicitly keeps the consent screen honest about the whole of
     it. */
  provider.addScope("email");
  provider.addScope("profile");
  /* Always offer the chooser. Without this a shared family laptop signs the
     parent straight back into whichever Google account the browser saw
     last, with no way to pick the other one. */
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}


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

  signInWithGoogle: () =>
    guarded(async () => {
      const { auth } = services();
      const provider = googleProvider();
      /* One line, and the only difference between an installed iPhone and
         every other browser in the world. `signInWithPopup` is unchanged
         where it works; where it cannot work it is not softened or retried,
         it is not used. See `signInMethod.ts` for the branch inside the SDK
         that makes this necessary. */
      if (googleSignInMethod(readSignInEnvironment()) === "redirect") {
        markRedirectPending();
        /* Resolves as the browser leaves. There is no user to return: the
           account arrives on the way back, in `completeGoogleRedirect`. */
        await signInWithRedirect(auth, provider);
        return null;
      }
      const { user } = await signInWithPopup(auth, provider);
      return toParent(user);
    }),

  completeGoogleRedirect: () =>
    guarded(async () => {
      const { auth } = services();
      /* Firebase answers `null` on every page load that is not the return
         leg, which is nearly all of them. The `sessionStorage` marker is
         cleared by the session store rather than here, because the store is
         the layer that runs on every cold start whatever this answers. */
      const result = await getRedirectResult(auth);
      return result ? toParent(result.user) : null;
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
      /* The id is not Firestore's to choose: `firestore.rules` only lets a
         parent create a child at one of their own slots, and that is what
         caps how many children one account can hold. Pick the first free
         one — a deleted child's slot comes back. */
      const mine = await getDocs(query(collection(db, "children"), where("parentId", "==", parentId)));
      const taken = new Set(mine.docs.map((existing) => existing.id));
      const id = childSlotIds(parentId).find((slot) => !taken.has(slot));
      /* Unreachable from KIDDO's own onboarding, which creates one child.
         A parent who really has six is told the same thing as any other
         write that could not happen, rather than nothing at all. */
      if (!id) throw new CloudError("unknown", "child-limit-reached");
      await setDoc(doc(db, "children", id), {
        parentId,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id, parentId, name };
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
      const { auth } = services();
      const current = auth.currentUser;
      if (!current || current.uid !== user.uid) throw new CloudError("no-account");
      /* Deleting a sign-in needs a recent one (about five minutes), on the
         server and in the SDK alike. Check first, so a stale sign-in is
         reported before anything is removed and nothing is half-deleted. */
      const signedInAt = Date.parse(current.metadata.lastSignInTime ?? "");
      if (!Number.isFinite(signedInAt) || Date.now() - signedInAt > RECENT_SIGN_IN_MS) {
        throw new CloudError("recent-login", "auth/requires-recent-login");
      }
      /* Deletion is the server's job and only the server's. It cancels the
         Stripe subscription and deletes the customer before removing
         anything, which a browser cannot do; and the user document holds
         the Stripe customer id, so a client able to delete it could throw
         away the billing identity of a subscription that keeps renewing.
         Firestore now refuses that delete (see firestore.rules), which
         means there is no client-side fallback to fall back to: if the
         server cannot do it, the honest answer is that it did not happen. */
      await callApi("/api/account/delete", {});
      await firebaseSignOut(auth).catch(() => {});
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

  watchEntitlement(uid, listener) {
    const { db } = services();
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => listener(snap.exists() ? parseEntitlement(snap.data()) : NO_ENTITLEMENT),
      () => {
        /* Say nothing on error: the session keeps whatever it last knew. */
      },
    );
  },

  startPurchase: (returnTo) =>
    guarded(async () => {
      /* No amount and no plan: there is one thing to buy, and its price is
         the server's to know. All the browser sends is where to come back. */
      return await callApi<{ url: string; billId: string }>("/api/billing/billplz/create", { returnTo });
    }),

  confirmPurchase: (billId) =>
    guarded(async () => {
      const { paid } = await callApi<{ paid: boolean }>("/api/billing/billplz/confirm", { billId });
      return paid === true;
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
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(await appCheckHeader()),
      },
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
