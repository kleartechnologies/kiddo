"use client";

import { useSyncExternalStore } from "react";

import { reportCheckoutStarted } from "@/lib/analytics/events";
import { hasAccess, type Entitlement } from "@/lib/billing/access";
import {
  bindJourneyToCloud,
  clearLocalJourney,
} from "@/lib/journey/useJourney";
import { CLOUD_CONFIGURED } from "@/lib/firebase/config";
import { clearRedirectPending, isRedirectPending } from "@/lib/firebase/signInMethod";
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
 * The store also carries the parent's entitlement, read from the cloud and
 * never decided here: `hasAccess` on what the server wrote is the only
 * thing that opens KIDDO. The gate comes before the child: a signed-in
 * parent who has not bought KIDDO is asked to before onboarding, and the
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
  /** Signed in; the entitlement and child profile are being looked up. */
  | "signed-in"
  /** Signed in, KIDDO not bought yet: the purchase gate. */
  | "needs-purchase"
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
  entitlement: Entitlement | null;
}

const NONE = { user: null, child: null, migration: null, entitlement: null } as const;
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
let stopEntitlement: (() => void) | null = null;
/** Guards against an older sign-in finishing after a newer one. */
let generation = 0;

/** Whether what the store knows about opens KIDDO right now. */
export function sessionHasAccess(s: Session = session): boolean {
  return hasAccess(s.entitlement, Date.now());
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
  /* Two reasons to load Firebase on a cold start, and the second one is new:
     a parent signing in with Google for the first time has no account hint
     yet, and their answer is arriving in this very page load. Without this
     they would come back from Google to an empty sign-in card. */
  if (hasHint() || isRedirectPending()) void start();
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
    /* Before anything else asks a question: this page load may be the
       second half of a sign-in that started on a different site. */
    void collectRedirect(loaded);
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
    const entitlement = await watchEntitlement(user.uid, mine);
    if (mine !== generation) return;
    set({ ...session, user, entitlement });
    if (!hasAccess(entitlement, Date.now())) {
      set({ ...session, status: "needs-purchase" });
      return;
    }
    await lookUpChild(user, mine);
  } catch {
    if (mine !== generation) return;
    /* Firestore unreachable right after sign-in. Never guess "no child"
       here — that would invite a second profile — just offer to try again. */
    set({ status: "trouble", ...NONE, user, entitlement: session.entitlement });
  }
}

/**
 * Start watching the billing half of `users/{uid}`; resolves with the first
 * value. Later values update the session in place — and when access arrives
 * while the parent is at the gate (the Billplz callback landing after a
 * payment), carry on to the child lookup as if they had just signed in.
 */
function watchEntitlement(uid: string, mine: number): Promise<Entitlement> {
  stopEntitlement?.();
  return new Promise((resolve, reject) => {
    let first = true;
    const timer = setTimeout(() => {
      if (first) {
        first = false;
        reject(new CloudError("offline", "entitlement read timed out"));
      }
    }, ENTITLEMENT_FIRST_READ_MS);
    stopEntitlement = backend!.watchEntitlement(uid, (state) => {
      if (mine !== generation) return;
      if (first) {
        first = false;
        clearTimeout(timer);
        resolve(state);
        return;
      }
      const hadAccess = sessionHasAccess();
      set({ ...session, entitlement: state });
      if (!hadAccess && hasAccess(state, Date.now()) && session.status === "needs-purchase" && session.user) {
        void lookUpChild(session.user, mine);
      }
    });
  });
}

const ENTITLEMENT_FIRST_READ_MS = 15_000;

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
  stopEntitlement?.();
  stopEntitlement = null;
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

/**
 * How long KIDDO will wait for an answer before deciding there isn't one.
 *
 * Not a tuning knob — a promise that never settles is what broke sign-in on
 * every installed iPhone, and the shape of that bug is worth refusing
 * structurally rather than fixing once. A card awaiting a promise has no way
 * to tell "still going" from "gone", so the store gives every attempt a last
 * moment past which it becomes a sentence the parent can read.
 *
 * Two numbers, because two very different things are being waited on. A
 * password is a round trip to Google's servers and back, and Firebase's own
 * network timeout is thirty seconds, so forty-five leaves it room to fail on
 * its own terms first — the parent should see "check your connection", not
 * KIDDO's backstop. The Google window has a *person* inside it, picking an
 * account and possibly fetching a phone for a code, and three minutes is
 * long enough that no real sign-in is ever cut short by it.
 */
export const AUTH_TIMEOUT_MS = 45_000;
export const GOOGLE_TIMEOUT_MS = 3 * 60_000;

function bounded<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CloudError("timed-out", `No answer in ${ms}ms`)), ms);
    const settle = (finish: () => void) => {
      clearTimeout(timer);
      finish();
    };
    work.then(
      (value) => settle(() => resolve(value)),
      (error) => settle(() => reject(error)),
    );
  });
}

/* ---- The answer a Google redirect leaves behind ------------------------ */

/**
 * A sign-in that leaves the page cannot reject into the button that started
 * it — the button, and the React tree around it, are gone. So the reason
 * comes back on the next page load through a store of its own, and the card
 * reads it wherever it happens to be mounted.
 *
 * Only failures live here. A redirect that worked needs no announcement: the
 * auth listener fires with the parent and the session moves on by itself.
 */
let redirectFailure: AuthFailure | null = null;
const redirectListeners = new Set<() => void>();

function subscribeRedirect(listener: () => void): () => void {
  redirectListeners.add(listener);
  return () => redirectListeners.delete(listener);
}

function setRedirectFailure(reason: AuthFailure | null): void {
  redirectFailure = reason;
  for (const listener of redirectListeners) listener();
}

/** Why the last trip to Google came back empty-handed, if it did. */
export function useGoogleRedirectFailure(): AuthFailure | null {
  return useSyncExternalStore(subscribeRedirect, () => redirectFailure, () => null);
}

/** The card has shown it; it is not news twice. */
export function clearGoogleRedirectFailure(): void {
  if (redirectFailure !== null) setRedirectFailure(null);
}

/**
 * Collect whatever a Google redirect left, on every cold start.
 *
 * Cheap and silent on the overwhelming majority of page loads, which are not
 * return legs: Firebase answers `null` and nothing happens. It runs
 * unconditionally rather than only when the marker is set, because the
 * marker lives in `sessionStorage` and a browser that refused to write it
 * would otherwise strand a parent who did sign in successfully.
 */
async function collectRedirect(loaded: CloudBackend): Promise<void> {
  try {
    await bounded(loaded.completeGoogleRedirect(), AUTH_TIMEOUT_MS);
    /* Success needs no announcement — `onAuth` has already fired. */
  } catch (error) {
    const reason = failure(error);
    /* A parent who backed out of Google's chooser did not fail at anything,
       and should not be told they did. */
    if (reason !== "popup-closed") setRedirectFailure(reason);
    /* Nothing came back and nothing is coming: if this load was only
       waiting on the redirect, stop waiting. */
    if (session.status === "loading" && !hasHint()) set(SIGNED_OUT);
  } finally {
    /* Asked and answered, whatever the answer was. The marker exists to make
       *this* page load wait for a redirect; leaving it set would make every
       future launch load Firebase for an answer that has already been
       collected — or, worse, for one that never existed because a parent
       backed out of Google's chooser. One writer, one clearer. */
    clearRedirectPending();
  }
}

export async function signUp(email: string, password: string): Promise<AuthFailure | null> {
  try {
    await bounded((await start()).signUp(email, password), AUTH_TIMEOUT_MS);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function signIn(email: string, password: string): Promise<AuthFailure | null> {
  try {
    await bounded((await start()).signIn(email, password), AUTH_TIMEOUT_MS);
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
 *
 * On an installed iPhone this leaves the page rather than opening a window,
 * so `null` there means "we are on our way to Google" and the card will be
 * unmounted a moment later. Both nulls are the same instruction to the
 * card — say nothing — which is why the difference does not need naming.
 */
export async function signInWithGoogle(): Promise<AuthFailure | null> {
  try {
    await bounded((await start()).signInWithGoogle(), GOOGLE_TIMEOUT_MS);
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
 * Ask the server for a Billplz bill and go there. Nothing about access
 * changes here; it changes when the server has asked Billplz whether the
 * money arrived and `watchEntitlement` hears what it wrote.
 */
export async function startPurchase(returnTo = "/welcome"): Promise<AuthFailure | null> {
  if (!backend || !session.user) return "unknown";
  /* Before the round trip, not after it: the redirect to Billplz would
     cancel a beacon still in flight, and what this records is the parent
     choosing to pay — which they did, whatever Billplz answers next. */
  reportCheckoutStarted();
  try {
    const { url, billId } = await backend.startPurchase(returnTo);
    /* So the return leg can name the bill even if Billplz sends the browser
       back without its query string. A bill id is not a credential — the
       server checks it belongs to the caller before answering. */
    rememberBill(billId);
    window.location.assign(url);
    return null;
  } catch (error) {
    return failure(error);
  }
}

/**
 * Ask the server whether a bill has been paid. Used by `/welcome` on the way
 * back from Billplz so a parent is not left watching a spinner until the
 * callback lands — but the answer is the server's, made by re-reading the
 * bill from Billplz, never the browser's own reading of the redirect.
 */
export async function confirmPurchase(billId: string): Promise<boolean> {
  if (!backend || !session.user) return false;
  try {
    return await backend.confirmPurchase(billId);
  } catch {
    return false;
  }
}

/** Where `startPurchase` leaves the bill id for the return leg to find. */
export const PENDING_BILL_KEY = "kiddo.billplz.pending.v1";

function rememberBill(billId: string): void {
  try {
    window.sessionStorage.setItem(PENDING_BILL_KEY, billId);
  } catch {
    /* No storage. The redirect carries the id in its query string too. */
  }
}

export function pendingBill(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_BILL_KEY);
  } catch {
    return null;
  }
}

export function forgetPendingBill(): void {
  try {
    window.sessionStorage.removeItem(PENDING_BILL_KEY);
  } catch {
    /* Nothing to forget. */
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
  stopEntitlement?.();
  stopEntitlement = null;
  backend = null;
  loader = null;
  starting = null;
  generation += 1;
  session = LOADING;
  redirectFailure = null;
}
