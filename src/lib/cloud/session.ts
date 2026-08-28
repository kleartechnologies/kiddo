"use client";

import { useSyncExternalStore } from "react";

import { reportCheckoutStarted } from "@/lib/analytics/events";
import { hasAccess, type Plan, type SubscriptionState } from "@/lib/billing/subscription";
import {
  bindJourneyToCloud,
  clearLocalJourney,
} from "@/lib/journey/useJourney";
import { CLOUD_CONFIGURED } from "@/lib/firebase/config";
import { normalizeChildName, readChildName } from "@/lib/profile/child";
import { bindChildNameToCloud, unbindChildName } from "@/lib/profile/useChildName";

import { CloudError, type AuthFailure, type ChildProfile, type CloudBackend, type ParentUser } from "./types";

/**
 * The parent's session, as a thing React can render.
 *
 * One store, the same shape as the journey and the name, holding the only
 * account-shaped state in KIDDO: whether Firebase is available on this
 * build, whether a parent is signed in, and which child is theirs. When a
 * child is known the store binds the journey and the name to the cloud;
 * when the parent signs out it unbinds them and wipes the device cache.
 *
 * The store also carries the parent's subscription, read from the cloud
 * and never decided here: `hasAccess` on what the server wrote is the only
 * thing that opens KIDDO. The gate comes before the child: a signed-in
 * parent without access is asked to subscribe before onboarding, and the
 * child's pages stay closed (see `PlayGate`) until the cloud says otherwise.
 *
 * Nothing on the child's side reads this except through the journey and
 * the name, which look the same to every screen whether the cloud is there
 * or not. The child never sees a sign-in, a price or a card.
 */

export type SessionStatus =
  /** First render, before Firebase has said whether someone is signed in. */
  | "loading"
  /** This build has no Firebase config: device-only mode, no account UI. */
  | "unavailable"
  | "signed-out"
  /** Signed in; the subscription and child profile are being looked up. */
  | "signed-in"
  /** Signed in, no active subscription: the subscription gate. */
  | "needs-subscription"
  /** Signed in, no child profile yet: onboarding. */
  | "needs-child"
  /** Signed in but the account could not be read (offline?): offer a retry. */
  | "trouble"
  /** Signed in and the child's journey is the cloud one. */
  | "ready";

export interface Session {
  status: SessionStatus;
  user: ParentUser | null;
  child: ChildProfile | null;
  /** What binding decided the first time this child's journey was loaded. */
  migration: "cloud" | "migrated" | "empty" | null;
  /** The server's word on billing; null until the first cloud read. */
  subscription: SubscriptionState | null;
}

const NONE = { user: null, child: null, migration: null, subscription: null } as const;
const SIGNED_OUT: Session = { status: "signed-out", ...NONE };
const LOADING: Session = { status: "loading", ...NONE };
const UNAVAILABLE: Session = { status: "unavailable", ...NONE };

const listeners = new Set<() => void>();
/* A build with no Firebase config is device-only from the first byte, so
   the server renders the dashboard straight away, as it did before accounts. */
let session: Session = CLOUD_CONFIGURED ? LOADING : UNAVAILABLE;
let backend: CloudBackend | null = null;
let loader: (() => Promise<CloudBackend>) | null = null;
let starting: Promise<CloudBackend> | null = null;
let stopAuth: (() => void) | null = null;
let stopSubscription: (() => void) | null = null;
/** Guards against an older sign-in finishing after a newer one. */
let generation = 0;

/** Whether the subscription the store knows about opens KIDDO right now. */
export function sessionHasAccess(s: Session = session): boolean {
  return hasAccess(s.subscription, Date.now());
}

/**
 * Set once a parent has signed in on this device, so the next visit knows
 * to load Firebase and restore the session before the child starts playing.
 * Holds no data — it is a hint, not a record.
 */
export const ACCOUNT_HINT_KEY = "kiddo.account.v1";

function hint(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(ACCOUNT_HINT_KEY, "1");
    else window.localStorage.removeItem(ACCOUNT_HINT_KEY);
  } catch {
    /* No storage: Firebase restores the session from its own store anyway
       once the parent area loads it. */
  }
}

function hasHint(): boolean {
  try {
    return window.localStorage.getItem(ACCOUNT_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function set(next: Session): void {
  session = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => session, () => (CLOUD_CONFIGURED ? LOADING : UNAVAILABLE));
}

/** The session right now, for code that is not a component. */
export function currentSession(): Session {
  return session;
}

/**
 * Tell the session how to reach Firebase, once. `load` is a lazy import of
 * the real backend in production and a fake in tests; `null` means this
 * build has no Firebase config and the session is simply `unavailable`.
 *
 * The SDK is only fetched when it will be used: straight away if a parent
 * has signed in on this device before, otherwise not until the parent area
 * asks to sign in. A child playing device-only never downloads it.
 */
export function configureSession(load: (() => Promise<CloudBackend>) | null): void {
  if (loader) return;
  if (!load) {
    set(UNAVAILABLE);
    return;
  }
  loader = load;
  if (hasHint()) void start();
  else set(SIGNED_OUT);
}

/** Load the backend and begin listening to auth; idempotent. */
function start(): Promise<CloudBackend> {
  if (backend) return Promise.resolve(backend);
  if (starting) return starting;
  if (!loader) return Promise.reject(new CloudError("unknown", "No cloud on this build."));
  starting = loader().then((loaded) => {
    backend = loaded;
    stopAuth = loaded.onAuth((user) => {
      if (user) void attach(user);
      else detach();
    });
    return loaded;
  });
  starting.catch(() => {
    starting = null;
    set(SIGNED_OUT);
  });
  return starting;
}

async function attach(user: ParentUser): Promise<void> {
  if (!backend) return;
  const mine = ++generation;
  hint(true);
  set({ status: "signed-in", ...NONE, user });
  try {
    await backend.ensureUser(user);
    const subscription = await watchSubscription(user.uid, mine);
    if (mine !== generation) return;
    set({ ...session, user, subscription });
    if (!hasAccess(subscription, Date.now())) {
      set({ ...session, status: "needs-subscription" });
      return;
    }
    await lookUpChild(user, mine);
  } catch {
    if (mine !== generation) return;
    /* Firestore unreachable right after sign-in. Never guess "no child"
       here — that would invite a second profile — just offer to try again. */
    set({ status: "trouble", ...NONE, user, subscription: session.subscription });
  }
}

/**
 * Start watching `users/{uid}.subscription`; resolves with the first value.
 * Later values update the session in place — and when access arrives while
 * the parent is at the gate (the webhook landing after Checkout), carry on
 * to the child lookup as if they had just signed in.
 */
function watchSubscription(uid: string, mine: number): Promise<SubscriptionState> {
  stopSubscription?.();
  return new Promise((resolve, reject) => {
    let first = true;
    const timer = setTimeout(() => {
      if (first) {
        first = false;
        reject(new CloudError("offline", "subscription read timed out"));
      }
    }, SUBSCRIPTION_FIRST_READ_MS);
    stopSubscription = backend!.watchSubscription(uid, (state) => {
      if (mine !== generation) return;
      if (first) {
        first = false;
        clearTimeout(timer);
        resolve(state);
        return;
      }
      const hadAccess = sessionHasAccess();
      set({ ...session, subscription: state });
      if (!hadAccess && hasAccess(state, Date.now()) && session.status === "needs-subscription" && session.user) {
        void lookUpChild(session.user, mine);
      }
    });
  });
}

const SUBSCRIPTION_FIRST_READ_MS = 15_000;

async function lookUpChild(user: ParentUser, mine: number): Promise<void> {
  if (!backend) return;
  try {
    const child = await backend.findChild(user.uid);
    if (mine !== generation) return;
    if (!child) {
      set({ ...session, status: "needs-child", user, child: null, migration: null });
      return;
    }
    await adoptChild(user, child, mine);
  } catch {
    if (mine !== generation) return;
    set({ ...session, status: "trouble", user, child: null, migration: null });
  }
}

async function adoptChild(user: ParentUser, child: ChildProfile, mine: number): Promise<void> {
  if (!backend) return;
  bindChildNameToCloud(child.id, child.name, backend);
  const migration = await bindJourneyToCloud(child.id, backend);
  if (mine !== generation) return;
  set({ ...session, status: "ready", user, child, migration });
}

function detach(): void {
  generation += 1;
  hint(false);
  stopSubscription?.();
  stopSubscription = null;
  const wasSignedIn = session.user !== null;
  if (wasSignedIn) {
    /* A different parent may sign in on this device next. Their account
       must start from its own cloud journey, not from this one's cache. */
    clearLocalJourney();
    unbindChildName();
  }
  set(SIGNED_OUT);
}

/* ---- What a parent can do ---------------------------------------------- */

function failure(error: unknown): AuthFailure {
  return error instanceof CloudError ? error.reason : "unknown";
}

export async function signUp(email: string, password: string): Promise<AuthFailure | null> {
  try {
    await (await start()).signUp(email, password);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function signIn(email: string, password: string): Promise<AuthFailure | null> {
  try {
    await (await start()).signIn(email, password);
    return null;
  } catch (error) {
    return failure(error);
  }
}

/**
 * Sign in with Google. Both halves of the card's job at once: Firebase
 * makes the account the first time and finds it every time after.
 *
 * A shut popup comes back as `null` — nothing happened, so the card says
 * nothing. Every other reason is a sentence the parent should read.
 */
export async function signInWithGoogle(): Promise<AuthFailure | null> {
  try {
    await (await start()).signInWithGoogle();
    return null;
  } catch (error) {
    const reason = failure(error);
    return reason === "popup-closed" ? null : reason;
  }
}

/** After `trouble`: look the account up again. */
export function retrySession(): void {
  if (session.status === "trouble" && session.user) void attach(session.user);
}

/** Re-read the signed-in parent — after they verified their email. */
export async function refreshUser(): Promise<boolean> {
  if (!backend || !session.user) return false;
  try {
    const user = await backend.reloadUser();
    if (!user) return false;
    set({ ...session, user });
    return user.emailVerified;
  } catch {
    return false;
  }
}

export async function sendVerification(): Promise<AuthFailure | null> {
  if (!backend || !session.user) return "unknown";
  try {
    await backend.sendVerification();
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthFailure | null> {
  try {
    await (await start()).sendPasswordReset(email);
    return null;
  } catch (error) {
    return failure(error);
  }
}

/** The reset page: which email a link is for, or why it cannot be used. */
export async function checkResetLink(code: string): Promise<{ email: string } | { failure: AuthFailure }> {
  try {
    return { email: await (await start()).verifyResetCode(code) };
  } catch (error) {
    return { failure: failure(error) };
  }
}

export async function finishPasswordReset(code: string, password: string): Promise<AuthFailure | null> {
  try {
    await (await start()).confirmPasswordReset(code, password);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function finishEmailVerification(code: string): Promise<AuthFailure | null> {
  try {
    await (await start()).applyActionCode(code);
    await refreshUser();
    return null;
  } catch (error) {
    return failure(error);
  }
}

/* ---- Billing --------------------------------------------------------- */

/**
 * Ask the server for a Checkout URL and go there. Nothing about access
 * changes here; it changes when the webhook has written the subscription
 * and `watchSubscription` hears about it.
 */
export async function startCheckout(plan: Plan, returnTo = "/parents"): Promise<AuthFailure | null> {
  if (!backend || !session.user) return "unknown";
  /* Before the round trip, not after it: the redirect to Stripe would
     cancel a beacon still in flight, and what this records is the parent
     choosing to pay — which they did, whatever Stripe answers next. */
  reportCheckoutStarted(plan);
  try {
    const url = await backend.startCheckout(plan, returnTo);
    window.location.assign(url);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function openBillingPortal(returnTo = "/parents"): Promise<AuthFailure | null> {
  if (!backend || !session.user) return "unknown";
  try {
    const url = await backend.openPortal(returnTo);
    window.location.assign(url);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function signOut(): Promise<void> {
  if (!backend) return;
  await backend.signOut().catch(() => {});
  detach();
}

/**
 * Onboarding: give the signed-in parent their child. The name goes through
 * the same normaliser as the device-only name field, so "Noah Whitfield"
 * still becomes "Noah". Returns what was kept, or null if nothing usable.
 */
export async function createChildProfile(raw: unknown): Promise<string | null> {
  const name = normalizeChildName(raw);
  if (!name || !backend || !session.user) return null;
  const user = session.user;
  const mine = generation;
  const child = await backend.createChild(user.uid, name);
  if (mine !== generation) return name;
  await adoptChild(user, child, mine);
  return name;
}

/** A name already on this device, to offer as the answer during onboarding. */
export function suggestedChildName(): string | null {
  return readChildName();
}

/**
 * Delete everything: journey, child, user document, then the sign-in.
 * Firebase refuses the last step if the sign-in is old; the caller gets a
 * reason to show rather than an exception.
 */
export async function deleteAccount(): Promise<AuthFailure | null> {
  if (!backend || !session.user) return "unknown";
  try {
    await backend.deleteAccount(session.user);
    detach();
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/requires-recent-login/.test(message)) return "recent-login";
    return failure(error);
  }
}

/** Test-only. */
export function __resetSessionForTests(): void {
  stopAuth?.();
  stopAuth = null;
  stopSubscription?.();
  stopSubscription = null;
  backend = null;
  loader = null;
  starting = null;
  generation += 1;
  session = LOADING;
}
