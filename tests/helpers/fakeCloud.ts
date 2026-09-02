import { LIFETIME_AMOUNT, NO_ACCESS, NO_ENTITLEMENT, type Entitlement } from "@/lib/billing/access";
import type { SubscriptionState } from "@/lib/billing/subscription";
import { NO_SUBSCRIPTION } from "@/lib/billing/subscription";
import type { ChildProfile, CloudBackend, ParentUser } from "@/lib/cloud/types";
import { CloudError } from "@/lib/cloud/types";
import type { Journey } from "@/lib/journey/journey";

/**
 * An in-memory `CloudBackend` that behaves like the real one from the
 * stores' point of view: auth state arrives through a listener, a journey
 * or entitlement watch fires with whatever is stored, writes can be made to
 * fail, and the trip to Billplz is recorded instead of navigating.
 *
 * The payment is modelled in the three separate steps the real one has, so
 * a test can put them in any order and see what the store does:
 *
 *   startPurchase   a bill exists; nobody has paid anything
 *   payBill         the parent paid at the bank; KIDDO has not been told
 *   deliverCallback the server heard, checked with Billplz, and granted
 *
 * `confirmPurchase` is the fourth: the browser asking the same question on
 * its way back. It grants on the same evidence the callback does and on no
 * other, which is the property the redirect leg has to have.
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

/** A parent who bought KIDDO. The ordinary state of a paid-up account. */
export const PAID: Entitlement = {
  access: {
    lifetime: true,
    grantedAt: 1_700_000_000_000,
    source: "billplz",
    billId: "bill_paid",
    amount: LIFETIME_AMOUNT,
  },
  subscription: NO_SUBSCRIPTION,
};

/** A subscription from before KIDDO was sold once, still paid up. */
export const ACTIVE: SubscriptionState = {
  status: "active",
  plan: "yearly",
  currentPeriodEnd: Date.now() + 300 * 24 * 60 * 60 * 1000,
  cancelAtPeriodEnd: false,
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
  eventCreated: 1_700_000_000,
};

/** That parent's whole entitlement: no purchase, one live subscription. */
export const LEGACY: Entitlement = { access: NO_ACCESS, subscription: ACTIVE };

/* ---- The fake cloud ----------------------------------------------------- */

export class FakeCloud implements CloudBackend {
  users = new Map<string, ParentUser>();
  children = new Map<string, ChildProfile>();
  journeys = new Map<string, Journey>();
  /** `password: null` is a Google account — no password can reach it. */
  accounts = new Map<string, { uid: string; password: string | null; verified: boolean }>();
  entitlements = new Map<string, Entitlement>();
  /**
   * Most account tests are about the child and the journey, not billing,
   * so by default every new account is treated as having bought KIDDO.
   * Billing tests turn this off and set `entitlements` by hand.
   */
  autoGrant = true;
  current: ParentUser | null = null;
  failWrites = false;
  writes = 0;
  /** What the fake "server" answers when asked for a bill, or why not. */
  purchaseAnswer: CloudError | null = null;
  portalAnswer: string | CloudError = "https://billing.stripe.test/portal";
  /** Every bill this fake has created, in order. */
  bills: Array<{ id: string; uid: string; returnTo: string; paid: boolean }> = [];
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
  private entitlementListeners = new Map<string, Set<(state: Entitlement) => void>>();

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
    if (this.autoGrant) this.entitlements.set(uid, PAID);
    const user = { uid, email, emailVerified: false };
    this.become(user);
    return user;
  }
  async signIn(email: string, password: string) {
    const account = this.accounts.get(email);
    if (!account) throw new CloudError("no-account", "none");
    if (account.password === null || account.password !== password) throw new CloudError("wrong-password", "wrong");
    if (this.autoGrant && !this.entitlements.has(account.uid)) this.entitlements.set(account.uid, PAID);
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
    if (this.autoGrant && !this.entitlements.has(uid)) this.entitlements.set(uid, PAID);
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
    if (this.autoGrant && !this.entitlements.has(uid)) this.entitlements.set(uid, PAID);
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
    /* Deleting the account deletes the user document, and `access` lives on
       it — so the lifetime purchase goes with it. See `deleteAccount` in
       `docs/kiddo-billing.md`. */
    this.entitlements.delete(user.uid);
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

  watchEntitlement(uid: string, listener: (state: Entitlement) => void) {
    const set = this.entitlementListeners.get(uid) ?? new Set();
    set.add(listener);
    this.entitlementListeners.set(uid, set);
    queueMicrotask(() => listener(this.entitlements.get(uid) ?? NO_ENTITLEMENT));
    return () => set.delete(listener);
  }

  /** What the server does: it writes, and the watch hears about it. */
  setEntitlement(uid: string, state: Entitlement) {
    this.entitlements.set(uid, state);
    for (const listener of this.entitlementListeners.get(uid) ?? []) listener(state);
  }

  /** Ask for a bill. Creating one is not paying for one. */
  async startPurchase(returnTo: string) {
    if (!this.current) throw new CloudError("no-account");
    if (this.purchaseAnswer) throw this.purchaseAnswer;
    const id = `bill_${this.bills.length + 1}`;
    this.bills.push({ id, uid: this.current.uid, returnTo, paid: false });
    return { url: `https://www.billplz-sandbox.test/bills/${id}`, billId: id };
  }

  /** The parent paid at the bank. KIDDO has not been told yet. */
  payBill(billId: string) {
    const bill = this.bills.find((one) => one.id === billId);
    if (bill) bill.paid = true;
  }

  /**
   * The server-side callback, arriving. Grants only for a bill that was
   * actually paid, and is safe to call as many times as Billplz sends it.
   */
  deliverCallback(billId: string): boolean {
    const bill = this.bills.find((one) => one.id === billId);
    if (!bill?.paid) return false;
    const before = this.entitlements.get(bill.uid) ?? NO_ENTITLEMENT;
    if (before.access.lifetime) return true;
    this.setEntitlement(bill.uid, {
      ...before,
      access: {
        lifetime: true,
        grantedAt: Date.now(),
        source: "billplz",
        billId,
        amount: LIFETIME_AMOUNT,
      },
    });
    return true;
  }

  /**
   * The browser, back from Billplz, asking the server whether that bill was
   * really paid. Answers for the caller's own bills only — an unknown bill
   * and somebody else's get the same "no", so ids cannot be fished for.
   */
  async confirmPurchase(billId: string): Promise<boolean> {
    if (!this.current) throw new CloudError("no-account");
    const bill = this.bills.find((one) => one.id === billId);
    if (!bill || bill.uid !== this.current.uid) return false;
    return this.deliverCallback(billId);
  }

  async openPortal(returnTo: string) {
    if (!this.current) throw new CloudError("no-account");
    if (this.portalAnswer instanceof CloudError) throw this.portalAnswer;
    return `${this.portalAnswer}?return=${encodeURIComponent(returnTo)}`;
  }
}
