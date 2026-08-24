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
