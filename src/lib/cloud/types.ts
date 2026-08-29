import type { Plan, SubscriptionState } from "@/lib/billing/subscription";
import type { Journey } from "@/lib/journey/journey";

/**
 * The shape of "the cloud", as KIDDO sees it.
 *
 * Everything the product needs from Firebase fits in one small interface:
 * who the parent is, which child is theirs, and the child's journey. The
 * rest of the code talks to this, never to Firebase directly, which is what
 * lets the session and journey stores be tested with an in-memory backend
 * and lets the child's pages stay free of any SDK until a parent signs in.
 *
 * There is no child account anywhere in here. A child is a record owned by
 * a parent's account; the only credential in the system is the parent's.
 */

export interface ParentUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
}

/** Why a sign-in or sign-up did not go through, in words a parent can act on. */
export type AuthFailure =
  | "invalid-email"
  | "weak-password"
  | "email-in-use"
  | "wrong-password"
  | "no-account"
  | "too-many-attempts"
  | "offline"
  /** A password-reset or verification link that is wrong, used, or old. */
  | "bad-link"
  /** The server refused because the sign-in is not recent enough. */
  | "recent-login"
  /** The billing server is not set up on this deployment. */
  | "billing-unavailable"
  /**
   * The parent shut the Google window, or opened a second one. Not a
   * failure they need told about — `signInWithGoogle` in the session store
   * turns it back into "nothing happened".
   */
  | "popup-closed"
  /** The browser blocked the Google window before it could open. */
  | "popup-blocked"
  /**
   * The attempt was still unanswered after `AUTH_TIMEOUT_MS`, so the store
   * stopped waiting on it. Not a thing any server said — it is KIDDO's own
   * backstop against a sign-in that hangs instead of failing, which is
   * exactly what an installed iOS KIDDO used to do to every parent who
   * pressed the Google button. See `firebase/signInMethod.ts`.
   */
  | "timed-out"
  /**
   * That email already signs in a different way — a password here, or
   * another provider. Firebase keeps one account per address, so it will
   * not quietly make a second one.
   */
  | "different-sign-in"
  | "unknown";

export class CloudError extends Error {
  readonly reason: AuthFailure;
  constructor(reason: AuthFailure, message?: string) {
    super(message ?? reason);
    this.name = "CloudError";
    this.reason = reason;
  }
}

export interface CloudBackend {
  /** Fires once with the restored session, then on every change. */
  onAuth(listener: (user: ParentUser | null) => void): () => void;
  signUp(email: string, password: string): Promise<ParentUser>;
  signIn(email: string, password: string): Promise<ParentUser>;
  /**
   * Sign in with Google. Creates the account on first use, so it is both
   * halves of the card's job at once — there is no separate "sign up with
   * Google".
   *
   * A popup in every browser that can hold one open, which is all of them
   * but one: an installed iOS KIDDO, where Firebase hands the window to
   * Safari and the promise never settles. There the answer is `null` and
   * the browser is already on its way to Google — the account arrives on
   * the next page load, through `completeGoogleRedirect`. See
   * `firebase/signInMethod.ts` for why that is the only browser named.
   */
  signInWithGoogle(): Promise<ParentUser | null>;

  /**
   * Pick up an answer left by a Google redirect, if this page load is the
   * one coming back from it. `null` means it is not — which is every
   * ordinary page load, so this must be cheap and must never throw for
   * "nothing to collect".
   */
  completeGoogleRedirect(): Promise<ParentUser | null>;

  signOut(): Promise<void>;

  /** Creates or refreshes `users/{uid}`; idempotent. */
  ensureUser(user: ParentUser): Promise<void>;
  /** The parent's child, or null before onboarding. */
  findChild(parentId: string): Promise<ChildProfile | null>;
  createChild(parentId: string, name: string): Promise<ChildProfile>;
  updateChildName(childId: string, name: string): Promise<void>;

  /**
   * Watches `journeys/{childId}`. Called with `null` when no document exists
   * yet — the signal that a local journey may be migrated in.
   */
  watchJourney(childId: string, listener: (journey: Journey | null) => void): () => void;
  writeJourney(childId: string, journey: Journey): Promise<void>;

  /**
   * Removes the journey, the child, the user document and finally the
   * parent's sign-in, in that order, so nothing private is left behind.
   * When billing is set up this goes through the server, which also
   * cancels the Stripe subscription first.
   */
  deleteAccount(user: ParentUser): Promise<void>;

  /* ---- Password and email ------------------------------------------- */

  sendPasswordReset(email: string): Promise<void>;
  /** Checks a reset link's code; resolves to the email it is for. */
  verifyResetCode(code: string): Promise<string>;
  confirmPasswordReset(code: string, password: string): Promise<void>;
  sendVerification(): Promise<void>;
  /** Applies a verify-email link's code. */
  applyActionCode(code: string): Promise<void>;
  /** Re-reads the signed-in parent (after verifying an email). */
  reloadUser(): Promise<ParentUser | null>;

  /* ---- Billing --------------------------------------------------------- */

  /**
   * Watches `users/{uid}.subscription`. Fires with `NO_SUBSCRIPTION` when
   * the document or field does not exist, so the first call always comes.
   */
  watchSubscription(uid: string, listener: (state: SubscriptionState) => void): () => void;
  /** Asks the server for a Stripe Checkout URL; the caller navigates to it. */
  startCheckout(plan: Plan, returnTo: string): Promise<string>;
  /** Asks the server for a Stripe Customer Portal URL. */
  openPortal(returnTo: string): Promise<string>;
}
