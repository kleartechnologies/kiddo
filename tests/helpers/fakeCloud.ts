import type { Plan, SubscriptionState } from "@/lib/billing/subscription";
import { NO_SUBSCRIPTION } from "@/lib/billing/subscription";
import type { ChildProfile, CloudBackend, ParentUser } from "@/lib/cloud/types";
import { CloudError } from "@/lib/cloud/types";
import type { Journey } from "@/lib/journey/journey";

/**
 * An in-memory `CloudBackend` that behaves like the real one from the
 * stores' point of view: auth state arrives through a listener, a journey
 * or subscription watch fires with whatever is stored, writes can be made
 * to fail, and Checkout "redirects" are recorded instead of navigating.
 *
 * Shared by the cloud (accounts) tests and the billing tests.
 */

/* ---- A browser, as far as the stores can tell -------------------------- */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}
export const storage = new MemoryStorage();
/** Session storage is where the Google-redirect marker lives. */
export const sessionStore = new MemoryStorage();
export const navigations: string[] = [];
(globalThis as unknown as { window: unknown }).window = {
  localStorage: storage,
  addEventListener() {},
  removeEventListener() {},
  sessionStorage: sessionStore,
  location: {
    origin: "https://kiddo.test",
    href: "https://kiddo.test/parents",
    assign(url: string) {
      navigations.push(url);
    },
  },
};

export const ACTIVE: SubscriptionState = {
  status: "active",
  plan: "yearly",
  currentPeriodEnd: Date.now() + 300 * 24 * 60 * 60 * 1000,
  cancelAtPeriodEnd: false,
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
  eventCreated: 1_700_000_000,
};

/* ---- The fake cloud ----------------------------------------------------- */

export class FakeCloud implements CloudBackend {
  users = new Map<string, ParentUser>();
  children = new Map<string, ChildProfile>();
  journeys = new Map<string, Journey>();
  /** `password: null` is a Google account — no password can reach it. */
  accounts = new Map<string, { uid: string; password: string | null; verified: boolean }>();
  subscriptions = new Map<string, SubscriptionState>();
  /**
   * Most account tests are about the child and the journey, not billing,
   * so by default every new account is treated as paid up. Billing tests
   * turn this off and set `subscriptions` by hand.
   */
  autoSubscribe = true;
  current: ParentUser | null = null;
  failWrites = false;
  writes = 0;
  /** What the fake "server" answers: a URL, or a failure reason. */
  checkoutAnswer: string | CloudError = "https://checkout.stripe.test/session";
  portalAnswer: string | CloudError = "https://billing.stripe.test/portal";
  checkouts: Array<{ uid: string; plan: Plan; returnTo: string }> = [];
  resetEmails: string[] = [];
  verificationEmails: string[] = [];
  /** Codes the fake will accept, mapped to the email they are for. */
  resetCodes = new Map<string, string>();
  verifyCodes = new Map<string, string>();
  deleted: string[] = [];
  /** Who the fake Google popup comes back as, or a failure to throw instead. */
  googleAnswer: string | CloudError = "parent@gmail.test";
  /**
   * How this fake browser answers Google: with a window it can hold open,
   * or by leaving the page. `"redirect"` is an installed iPhone, where
   * `signInWithGoogle` answers nothing and the account arrives on the next
   * load through `completeGoogleRedirect` instead.
   */
  googleRoad: "popup" | "redirect" = "popup";
  /** Set by a `"redirect"` sign-in, read by the load that comes back. */
  redirectWaiting = false;
  /** What that return leg finds — the answer, or a failure to throw. */
  redirectAnswer: string | CloudError | null = null;
  /** Every promise this fake has left unanswered, so tests can hang one. */
  hangGoogle = false;
  private authListeners = new Set<(user: ParentUser | null) => void>();
  private journeyListeners = new Map<string, Set<(journey: Journey | null) => void>>();
  private subscriptionListeners = new Map<string, Set<(state: SubscriptionState) => void>>();

  /** The auth callback, as Firebase fires it: on subscribe and on change. */
  onAuth(listener: (user: ParentUser | null) => void) {
    this.authListeners.add(listener);
    queueMicrotask(() => listener(this.current));
    return () => this.authListeners.delete(listener);
  }
  private become(user: ParentUser | null) {
    this.current = user;
    for (const listener of this.authListeners) listener(user);
  }
  async signUp(email: string, password: string) {
    if (this.accounts.has(email)) throw new CloudError("email-in-use", "in use");
    if (password.length < 6) throw new CloudError("weak-password", "weak");
    const uid = `uid-${this.accounts.size + 1}`;
    this.accounts.set(email, { uid, password, verified: false });
    if (this.autoSubscribe) this.subscriptions.set(uid, ACTIVE);
    const user = { uid, email, emailVerified: false };
    this.become(user);
    return user;
  }
  async signIn(email: string, password: string) {
    const account = this.accounts.get(email);
    if (!account) throw new CloudError("no-account", "none");
    if (account.password === null || account.password !== password) throw new CloudError("wrong-password", "wrong");
    if (this.autoSubscribe && !this.subscriptions.has(account.uid)) this.subscriptions.set(account.uid, ACTIVE);
    const user = { uid: account.uid, email, emailVerified: account.verified };
    this.become(user);
    return user;
  }
  async signInWithGoogle(): Promise<ParentUser | null> {
    /* A promise that never settles: the exact shape of the bug an installed
       iPhone used to hit, so the card can be tested against it. */
    if (this.hangGoogle) return new Promise<ParentUser | null>(() => {});
    if (this.googleRoad === "redirect") {
      /* The browser is leaving. Nothing to return, and nothing thrown:
         the answer is collected on the way back. */
      this.redirectWaiting = true;
      this.redirectAnswer = this.googleAnswer;
      return null;
    }
    if (this.googleAnswer instanceof CloudError) throw this.googleAnswer;
    const email = this.googleAnswer;
    const existing = this.accounts.get(email);
    /* One account per email address, as Firebase does it: an address that
       already has a password cannot quietly gain a second account. */
    if (existing && existing.password !== null) throw new CloudError("different-sign-in", "password account");
    const uid = existing?.uid ?? `uid-${this.accounts.size + 1}`;
    if (!existing) this.accounts.set(email, { uid, password: null, verified: true });
    if (this.autoSubscribe && !this.subscriptions.has(uid)) this.subscriptions.set(uid, ACTIVE);
    /* Google has already checked the address, so the account arrives
       verified and never sees the "check your email" step. */
    const user = { uid, email, emailVerified: true };
    this.become(user);
    return user;
  }
  /** The return leg. `null` on every load that is not one. */
  async completeGoogleRedirect(): Promise<ParentUser | null> {
    if (!this.redirectWaiting) return null;
    this.redirectWaiting = false;
    const answer = this.redirectAnswer;
    this.redirectAnswer = null;
    if (answer === null) return null;
    if (answer instanceof CloudError) throw answer;
    const existing = this.accounts.get(answer);
    if (existing && existing.password !== null) throw new CloudError("different-sign-in", "password account");
    const uid = existing?.uid ?? `uid-${this.accounts.size + 1}`;
    if (!existing) this.accounts.set(answer, { uid, password: null, verified: true });
    if (this.autoSubscribe && !this.subscriptions.has(uid)) this.subscriptions.set(uid, ACTIVE);
    const user = { uid, email: answer, emailVerified: true };
    this.become(user);
    return user;
  }
  async signOut() {
    this.become(null);
  }
  async ensureUser(user: ParentUser) {
    this.users.set(user.uid, user);
  }
  async findChild(parentId: string) {
    for (const child of this.children.values()) if (child.parentId === parentId) return child;
    return null;
  }
  async createChild(parentId: string, name: string) {
    const child = { id: `child-${this.children.size + 1}`, parentId, name };
    this.children.set(child.id, child);
    return child;
  }
  async updateChildName(childId: string, name: string) {
    const child = this.children.get(childId);
    if (child) this.children.set(childId, { ...child, name });
  }
  watchJourney(childId: string, listener: (journey: Journey | null) => void) {
    const set = this.journeyListeners.get(childId) ?? new Set();
    set.add(listener);
    this.journeyListeners.set(childId, set);
    queueMicrotask(() => listener(this.journeys.get(childId) ?? null));
    return () => set.delete(listener);
  }
  async writeJourney(childId: string, journey: Journey) {
    this.writes += 1;
    if (this.failWrites) throw new CloudError("offline", "offline");
    this.journeys.set(childId, journey);
    for (const listener of this.journeyListeners.get(childId) ?? []) listener(journey);
  }
  async deleteAccount(user: ParentUser) {
    for (const [id, child] of this.children) {
      if (child.parentId !== user.uid) continue;
      this.journeys.delete(id);
      this.children.delete(id);
    }
    this.users.delete(user.uid);
    this.subscriptions.delete(user.uid);
    this.deleted.push(user.uid);
    for (const [email, account] of this.accounts) if (account.uid === user.uid) this.accounts.delete(email);
    this.become(null);
  }

  /* ---- Password and email ------------------------------------------- */

  async sendPasswordReset(email: string) {
    if (!this.accounts.has(email)) throw new CloudError("no-account", "none");
    this.resetEmails.push(email);
    this.resetCodes.set(`code-${this.resetEmails.length}`, email);
  }
  async verifyResetCode(code: string) {
    const email = this.resetCodes.get(code);
    if (!email) throw new CloudError("bad-link", "expired");
    return email;
  }
  async confirmPasswordReset(code: string, password: string) {
    const email = this.resetCodes.get(code);
    if (!email) throw new CloudError("bad-link", "expired");
    if (password.length < 6) throw new CloudError("weak-password", "weak");
    const account = this.accounts.get(email)!;
    this.accounts.set(email, { ...account, password });
    this.resetCodes.delete(code);
  }
  async sendVerification() {
    if (!this.current) throw new CloudError("no-account");
    this.verificationEmails.push(this.current.email!);
    this.verifyCodes.set(`verify-${this.verificationEmails.length}`, this.current.email!);
  }
  async applyActionCode(code: string) {
    const email = this.verifyCodes.get(code);
    if (!email) throw new CloudError("bad-link", "expired");
    const account = this.accounts.get(email)!;
    this.accounts.set(email, { ...account, verified: true });
    this.verifyCodes.delete(code);
  }
  async reloadUser() {
    if (!this.current) return null;
    const account = this.accounts.get(this.current.email!);
    this.current = { ...this.current, emailVerified: account?.verified ?? false };
    return this.current;
  }

  /* ---- Billing --------------------------------------------------------- */

  watchSubscription(uid: string, listener: (state: SubscriptionState) => void) {
    const set = this.subscriptionListeners.get(uid) ?? new Set();
    set.add(listener);
    this.subscriptionListeners.set(uid, set);
    queueMicrotask(() => listener(this.subscriptions.get(uid) ?? NO_SUBSCRIPTION));
    return () => set.delete(listener);
  }
  /** What the webhook does: the server writes, the watch fires. */
  setSubscription(uid: string, state: SubscriptionState) {
    this.subscriptions.set(uid, state);
    for (const listener of this.subscriptionListeners.get(uid) ?? []) listener(state);
  }
  async startCheckout(plan: Plan, returnTo: string) {
    if (!this.current) throw new CloudError("no-account");
    if (this.checkoutAnswer instanceof CloudError) throw this.checkoutAnswer;
    this.checkouts.push({ uid: this.current.uid, plan, returnTo });
    return this.checkoutAnswer;
  }
  async openPortal(returnTo: string) {
    if (!this.current) throw new CloudError("no-account");
    if (this.portalAnswer instanceof CloudError) throw this.portalAnswer;
    return `${this.portalAnswer}?return=${encodeURIComponent(returnTo)}`;
  }
}
