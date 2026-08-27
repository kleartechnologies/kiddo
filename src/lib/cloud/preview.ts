import { NO_SUBSCRIPTION, type Plan, type SubscriptionState } from "@/lib/billing/subscription";
import type { Journey } from "@/lib/journey/journey";
import { parseJourney } from "@/lib/journey/journey";

import { CloudError, type ChildProfile, type CloudBackend, type ParentUser } from "./types";

/**
 * A pretend cloud, for looking at the account screens on a build that has
 * no Firebase and no Stripe — the browser measurements use it, and so can
 * a designer. Everything lives in one localStorage key on this device.
 *
 * Only loaded when the build is unconfigured AND the device has opted in
 * (`localStorage["kiddo.preview.cloud"] = "1"`); it is never part of a
 * configured build's path and grants nothing real. "Checkout" is a page on
 * this site, and the "webhook" is a timer.
 */

export const PREVIEW_FLAG_KEY = "kiddo.preview.cloud";
/** Who the pretend Google popup always comes back as. */
const PREVIEW_GOOGLE_EMAIL = "parent@example.com";
const STATE_KEY = "kiddo.preview.state.v1";
const WEBHOOK_DELAY_MS = 2500;

interface State {
  /**
   * `password: null` is a Google account: made by the pretend popup, and
   * unreachable through the password form — which is exactly how the real
   * one behaves.
   */
  accounts: Record<string, { uid: string; password: string | null; verified: boolean }>;
  current: string | null;
  children: Record<string, ChildProfile>;
  journeys: Record<string, Journey>;
  subscriptions: Record<string, SubscriptionState>;
  /** A Checkout that "Stripe" will confirm shortly. */
  pending: { uid: string; plan: Plan; at: number } | null;
  codes: Record<string, { email: string; kind: "reset" | "verify" }>;
}

const EMPTY: State = { accounts: {}, current: null, children: {}, journeys: {}, subscriptions: {}, pending: null, codes: {} };

export function previewEnabled(): boolean {
  try {
    return window.localStorage.getItem(PREVIEW_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function load(): State {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(state: State): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function mutate<T>(work: (state: State) => T): T {
  const state = load();
  const result = work(state);
  save(state);
  return result;
}

const authListeners = new Set<(user: ParentUser | null) => void>();
const journeyListeners = new Map<string, Set<(journey: Journey | null) => void>>();
const subscriptionListeners = new Map<string, Set<(state: SubscriptionState) => void>>();

function userOf(state: State): ParentUser | null {
  if (!state.current) return null;
  const account = state.accounts[state.current];
  return account ? { uid: account.uid, email: state.current, emailVerified: account.verified } : null;
}

function become(email: string | null): void {
  const user = mutate((state) => {
    state.current = email;
    return userOf(state);
  });
  for (const listener of authListeners) listener(user);
}

function settlePending(): void {
  const fired = mutate((state) => {
    const p = state.pending;
    if (!p || Date.now() < p.at) return null;
    state.pending = null;
    const sub: SubscriptionState = {
      status: "active",
      plan: p.plan,
      currentPeriodEnd: Date.now() + (p.plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      stripeCustomerId: `cus_preview_${p.uid}`,
      stripeSubscriptionId: `sub_preview_${p.uid}`,
      eventCreated: Math.floor(Date.now() / 1000),
    };
    state.subscriptions[p.uid] = sub;
    return { uid: p.uid, sub };
  });
  if (fired) for (const listener of subscriptionListeners.get(fired.uid) ?? []) listener(fired.sub);
}

/** Test hook: put the signed-in parent's subscription in a given state. */
export function previewSetSubscription(patch: Partial<SubscriptionState>): void {
  const fired = mutate((state) => {
    if (!state.current) return null;
    const uid = state.accounts[state.current]?.uid;
    if (!uid) return null;
    const sub = { ...(state.subscriptions[uid] ?? NO_SUBSCRIPTION), ...patch };
    state.subscriptions[uid] = sub;
    return { uid, sub };
  });
  if (fired) for (const listener of subscriptionListeners.get(fired.uid) ?? []) listener(fired.sub);
}

declare global {
  interface Window {
    /** Measurement hook (pretend cloud only): flip the parent's subscription. */
    __kiddoPreviewSetSubscription?: (patch: Partial<SubscriptionState>) => void;
  }
}

export const previewBackend: CloudBackend = {
  onAuth(listener) {
    if (typeof window !== "undefined") window.__kiddoPreviewSetSubscription = previewSetSubscription;
    authListeners.add(listener);
    queueMicrotask(() => listener(userOf(load())));
    return () => authListeners.delete(listener);
  },
  async signUp(email, password) {
    const key = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw new CloudError("invalid-email");
    if (password.length < 6) throw new CloudError("weak-password");
    mutate((state) => {
      if (state.accounts[key]) throw new CloudError("email-in-use");
      state.accounts[key] = { uid: `uid-${Object.keys(state.accounts).length + 1}`, password, verified: false };
    });
    become(key);
    return userOf(load())!;
  },
  async signIn(email, password) {
    const key = email.trim().toLowerCase();
    const account = load().accounts[key];
    if (!account) throw new CloudError("no-account");
    if (account.password === null || account.password !== password) throw new CloudError("wrong-password");
    become(key);
    return userOf(load())!;
  },
  async signInWithGoogle() {
    /* There is no Google here and nothing to ask. The pretend popup always
       comes back as the same person, so the screens behind sign-in can be
       looked at without an account existing anywhere. */
    const key = PREVIEW_GOOGLE_EMAIL;
    mutate((state) => {
      const existing = state.accounts[key];
      if (existing) {
        /* Same address, but it was made with a password: one account per
           email address, the same refusal the real backend gives. */
        if (existing.password !== null) throw new CloudError("different-sign-in");
        return;
      }
      state.accounts[key] = { uid: `uid-${Object.keys(state.accounts).length + 1}`, password: null, verified: true };
    });
    become(key);
    return userOf(load())!;
  },
  async signOut() {
    become(null);
  },
  async ensureUser() {},
  async findChild(parentId) {
    return Object.values(load().children).find((c) => c.parentId === parentId) ?? null;
  },
  async createChild(parentId, name) {
    return mutate((state) => {
      const child = { id: `child-${Object.keys(state.children).length + 1}`, parentId, name };
      state.children[child.id] = child;
      return child;
    });
  },
  async updateChildName(childId, name) {
    mutate((state) => {
      if (state.children[childId]) state.children[childId] = { ...state.children[childId], name };
    });
  },
  watchJourney(childId, listener) {
    const set = journeyListeners.get(childId) ?? new Set();
    set.add(listener);
    journeyListeners.set(childId, set);
    queueMicrotask(() => {
      const raw = load().journeys[childId];
      listener(raw ? parseJourney(raw) : null);
    });
    return () => set.delete(listener);
  },
  async writeJourney(childId, journey) {
    mutate((state) => {
      state.journeys[childId] = journey;
    });
    for (const listener of journeyListeners.get(childId) ?? []) listener(journey);
  },
  async deleteAccount(user) {
    mutate((state) => {
      for (const [id, child] of Object.entries(state.children)) {
        if (child.parentId !== user.uid) continue;
        delete state.children[id];
        delete state.journeys[id];
      }
      delete state.subscriptions[user.uid];
      for (const [email, account] of Object.entries(state.accounts)) if (account.uid === user.uid) delete state.accounts[email];
    });
    become(null);
  },

  async sendPasswordReset(email) {
    mutate((state) => {
      const key = email.trim().toLowerCase();
      if (!state.accounts[key]) throw new CloudError("no-account");
      state.codes[`preview-reset-${Object.keys(state.codes).length + 1}`] = { email: key, kind: "reset" };
    });
  },
  async verifyResetCode(code) {
    const entry = load().codes[code];
    if (!entry || entry.kind !== "reset") throw new CloudError("bad-link");
    return entry.email;
  },
  async confirmPasswordReset(code, password) {
    if (password.length < 6) throw new CloudError("weak-password");
    mutate((state) => {
      const entry = state.codes[code];
      if (!entry || entry.kind !== "reset") throw new CloudError("bad-link");
      state.accounts[entry.email] = { ...state.accounts[entry.email], password };
      delete state.codes[code];
    });
  },
  async sendVerification() {
    mutate((state) => {
      if (!state.current) throw new CloudError("no-account");
      state.codes[`preview-verify-${Object.keys(state.codes).length + 1}`] = { email: state.current, kind: "verify" };
    });
  },
  async applyActionCode(code) {
    mutate((state) => {
      const entry = state.codes[code];
      if (!entry || entry.kind !== "verify") throw new CloudError("bad-link");
      state.accounts[entry.email] = { ...state.accounts[entry.email], verified: true };
      delete state.codes[code];
    });
  },
  async reloadUser() {
    return userOf(load());
  },

  watchSubscription(uid, listener) {
    const set = subscriptionListeners.get(uid) ?? new Set();
    set.add(listener);
    subscriptionListeners.set(uid, set);
    queueMicrotask(() => listener(load().subscriptions[uid] ?? NO_SUBSCRIPTION));
    const pending = load().pending;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (pending && pending.uid === uid) timer = setTimeout(settlePending, Math.max(0, pending.at - Date.now()));
    return () => {
      set.delete(listener);
      if (timer) clearTimeout(timer);
    };
  },
  async startCheckout(plan, returnTo) {
    const user = userOf(load());
    if (!user) throw new CloudError("no-account");
    mutate((state) => {
      state.pending = { uid: user.uid, plan, at: Date.now() + WEBHOOK_DELAY_MS };
    });
    const joiner = returnTo.includes("?") ? "&" : "?";
    return `${returnTo}${joiner}checkout=success`;
  },
  async openPortal(returnTo) {
    return `${returnTo}?portal=preview`;
  },
};
