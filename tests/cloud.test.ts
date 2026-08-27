import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";

import {
  ACCOUNT_HINT_KEY,
  __resetSessionForTests,
  configureSession,
  createChildProfile,
  currentSession,
  deleteAccount,
  retrySession,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from "@/lib/cloud/session";
import {
  EMPTY_JOURNEY,
  continueTarget,
  markCompleted,
  markCompletedAt,
  markOpened,
  type Journey,
} from "@/lib/journey/journey";
import {
  JOURNEY_KEY,
  __resetJourneyStoreForTests,
  bindJourneyToCloud,
  currentJourney,
  currentSaveStatus,
  isJourneyCloudBound,
  recordCompleted,
  recordCompletedAt,
  recordOpened,
  resetJourney,
  retrySave,
  unbindJourney,
} from "@/lib/journey/useJourney";
import { en } from "@/lib/i18n/messages/en";
import { journeySummary, nextUp } from "@/lib/parents/dashboard";
import { CHILD_NAME_KEY } from "@/lib/profile/child";
import { __resetChildNameStoreForTests, setChildName } from "@/lib/profile/useChildName";
import { activitiesOf } from "@/lib/worlds/activities";

/**
 * Parent accounts and the cloud journey, checked without Firebase.
 *
 * `FakeCloud` is an in-memory `CloudBackend` that behaves like the real
 * one from the store's point of view: auth state arrives through a
 * listener, a journey watch fires with whatever is stored, and writes can
 * be made to fail. The session, journey and name stores are the real ones.
 */

import { CloudError } from "@/lib/cloud/types";
import { ACTIVE, FakeCloud, storage } from "./helpers/fakeCloud";

/* ---- Helpers ------------------------------------------------------------ */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const saveStatus = () => currentSaveStatus();
const readJourney = () => currentJourney();

const [apples, flowers] = activitiesOf("counting");
const [home] = activitiesOf("animals");
const PLAYED: Journey = markCompleted(markOpened(EMPTY_JOURNEY, apples.id), apples.id);

let cloud: FakeCloud;

/** Boot the app the way `CloudSession` does, with the fake behind it. */
async function boot() {
  configureSession(() => Promise.resolve(cloud));
  await settle();
}

beforeEach(() => {
  storage.clear();
  __resetSessionForTests();
  __resetJourneyStoreForTests();
  __resetChildNameStoreForTests();
  cloud = new FakeCloud();
});

/* ---- Auth state --------------------------------------------------------- */

test("without Firebase config the session is unavailable and the journey stays on the device", async () => {
  configureSession(null);
  assert.equal(currentSession().status, "unavailable");
  recordCompleted(apples.id);
  assert.equal(isJourneyCloudBound(), false);
  assert.equal(saveStatus(), "local");
  assert.ok(storage.getItem(JOURNEY_KEY)?.includes(apples.id));
});

test("a fresh device starts signed out without loading the backend", async () => {
  let loaded = 0;
  configureSession(() => {
    loaded += 1;
    return Promise.resolve(cloud);
  });
  await settle();
  assert.equal(currentSession().status, "signed-out");
  assert.equal(loaded, 0, "SDK is not fetched until a parent needs it");
});

test("a device that has signed in before restores the session on load", async () => {
  cloud.accounts.set("p@example.com", { uid: "uid-1", password: "secret1", verified: true });
  cloud.current = { uid: "uid-1", email: "p@example.com", emailVerified: true };
  cloud.subscriptions.set("uid-1", ACTIVE);
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  storage.setItem(ACCOUNT_HINT_KEY, "1");
  await boot();
  const s = currentSession();
  assert.equal(s.status, "ready");
  assert.equal(s.user?.email, "p@example.com");
  assert.equal(s.child?.name, "Mia");
});

test("sign-up moves the parent to onboarding; sign-out returns to signed-out and clears the hint", async () => {
  await boot();
  assert.equal(await signUp("p@example.com", "secret1"), null);
  await settle();
  assert.equal(currentSession().status, "needs-child");
  assert.equal(storage.getItem(ACCOUNT_HINT_KEY), "1");
  assert.ok(cloud.users.has("uid-1"), "users/{uid} is written on first sign-in");
  await signOut();
  assert.equal(currentSession().status, "signed-out");
  assert.equal(storage.getItem(ACCOUNT_HINT_KEY), null);
});

test("auth failures come back as reasons, never exceptions", async () => {
  await boot();
  assert.equal(await signUp("p@example.com", "123"), "weak-password");
  assert.equal(await signUp("p@example.com", "secret1"), null);
  await signOut();
  assert.equal(await signUp("p@example.com", "secret1"), "email-in-use");
  assert.equal(await signIn("nobody@example.com", "secret1"), "no-account");
  assert.equal(await signIn("p@example.com", "wrong!!"), "wrong-password");
  assert.equal(currentSession().status, "signed-out");
});

test("Google sign-in makes the account the first time and finds it after", async () => {
  await boot();
  assert.equal(await signInWithGoogle(), null);
  await settle();
  /* Google has already checked the address, so there is no "check your
     email" step waiting on the other side of it. */
  assert.equal(currentSession().status, "needs-child");
  assert.equal(currentSession().user?.emailVerified, true);
  const uid = currentSession().user?.uid;
  await signOut();

  assert.equal(await signInWithGoogle(), null);
  await settle();
  /* The same account, not a second one beside it. */
  assert.equal(currentSession().user?.uid, uid);
  assert.equal(cloud.accounts.size, 1);
});

test("a shut Google window is not an error, and a blocked one is", async () => {
  await boot();
  cloud.googleAnswer = new CloudError("popup-closed", "closed");
  /* The parent changed their mind. Saying nothing is the whole response. */
  assert.equal(await signInWithGoogle(), null);
  assert.equal(currentSession().status, "signed-out");

  cloud.googleAnswer = new CloudError("popup-blocked", "blocked");
  assert.equal(await signInWithGoogle(), "popup-blocked");
  assert.equal(currentSession().status, "signed-out");
});

test("an address that already has a password cannot gain a second Google account", async () => {
  await boot();
  assert.equal(await signUp("p@example.com", "secret1"), null);
  await signOut();
  cloud.googleAnswer = "p@example.com";
  assert.equal(await signInWithGoogle(), "different-sign-in");
  assert.equal(cloud.accounts.size, 1, "no second account for the same address");
  assert.equal(currentSession().status, "signed-out");
});

test("a Google account has no password, so the password form cannot reach it", async () => {
  await boot();
  await signInWithGoogle();
  await signOut();
  /* Not "no-account" and not a way in: the same sentence a wrong password
     gets, so the form still cannot sort addresses into accounts. */
  assert.equal(await signIn("parent@gmail.test", ""), "wrong-password");
  assert.equal(currentSession().status, "signed-out");
});

/* ---- Parent / child ownership ------------------------------------------ */

test("the child profile belongs to the parent who created it", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  assert.equal(await createChildProfile("  Noah Whitfield "), "Noah", "first name only");
  await settle();
  const s = currentSession();
  assert.equal(s.status, "ready");
  assert.equal(s.child?.parentId, "uid-1");
  assert.equal(s.child?.name, "Noah");
  assert.equal(storage.getItem(CHILD_NAME_KEY), "Noah", "the child's screens read the same name");
});

test("another parent signing in on the same device gets their own child, not the previous one", async () => {
  await boot();
  await signUp("a@example.com", "secret1");
  await settle();
  await createChildProfile("Mia");
  await settle();
  recordCompleted(apples.id);
  await settle();
  await signOut();
  assert.equal(storage.getItem(JOURNEY_KEY), null, "cache wiped on sign-out");
  assert.equal(storage.getItem(CHILD_NAME_KEY), null);

  await signUp("b@example.com", "secret1");
  await settle();
  assert.equal(currentSession().status, "needs-child");
  await createChildProfile("Leo");
  await settle();
  const s = currentSession();
  assert.equal(s.child?.parentId, "uid-2");
  assert.equal(s.migration, "empty", "nothing of Mia's migrated into Leo's account");
  assert.deepEqual(cloud.journeys.get("child-2") ?? EMPTY_JOURNEY, EMPTY_JOURNEY);
  assert.deepEqual(cloud.journeys.get("child-1"), PLAYED);
});

test("an unreadable account after sign-in asks to retry rather than inviting a second child", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await createChildProfile("Mia");
  await settle();
  await signOut();

  const realFind = cloud.findChild.bind(cloud);
  cloud.findChild = async () => {
    throw new CloudError("offline", "offline");
  };
  await signIn("p@example.com", "secret1");
  await settle();
  assert.equal(currentSession().status, "trouble");
  cloud.findChild = realFind;
  retrySession();
  await settle();
  assert.equal(currentSession().status, "ready");
  assert.equal(cloud.children.size, 1);
});

/* ---- Journey persistence ----------------------------------------------- */

test("a bound journey is written to the cloud and cached on the device", async () => {
  cloud.children.set("child-1", { id: "child-1", parentId: "uid-1", name: "Mia" });
  assert.equal(await bindJourneyToCloud("child-1", cloud), "empty");
  recordOpened(apples.id);
  assert.equal(saveStatus(), "saving");
  await settle();
  assert.equal(saveStatus(), "synced");
  assert.ok(recordCompleted(apples.id));
  await settle();
  assert.deepEqual(cloud.journeys.get("child-1"), PLAYED);
  assert.deepEqual(JSON.parse(storage.getItem(JOURNEY_KEY)!), PLAYED);
});

test("local progress migrates into an account that has no cloud journey yet", async () => {
  storage.setItem(JOURNEY_KEY, JSON.stringify(PLAYED));
  assert.equal(await bindJourneyToCloud("child-1", cloud), "migrated");
  await settle();
  assert.deepEqual(cloud.journeys.get("child-1"), PLAYED);
  assert.equal(saveStatus(), "synced");
});

test("an existing cloud journey wins over local state, which is never merged in", async () => {
  const inCloud = markOpened(EMPTY_JOURNEY, home.id);
  cloud.journeys.set("child-1", inCloud);
  storage.setItem(JOURNEY_KEY, JSON.stringify(PLAYED));
  assert.equal(await bindJourneyToCloud("child-1", cloud), "cloud");
  assert.deepEqual(readJourney(), inCloud);
  assert.deepEqual(cloud.journeys.get("child-1"), inCloud, "nothing written on bind");
  assert.deepEqual(JSON.parse(storage.getItem(JOURNEY_KEY)!), inCloud, "cache follows the cloud");
  assert.equal(cloud.writes, 0);
});

test("invalid local state is ignored, not migrated", async () => {
  storage.setItem(JOURNEY_KEY, '{"completed":"nope"}');
  assert.equal(await bindJourneyToCloud("child-1", cloud), "empty");
  assert.equal(cloud.writes, 0);
});

test("medium and hard finishes reach the cloud, migrate, and are never merged", async () => {
  /* Written up as they happen while bound... */
  assert.equal(await bindJourneyToCloud("child-1", cloud), "empty");
  recordCompleted(apples.id);
  assert.ok(recordCompletedAt(apples.id, 2));
  await settle();
  const tiered = cloud.journeys.get("child-1");
  assert.deepEqual(tiered?.medium, [apples.id]);
  assert.deepEqual(tiered?.hard, []);

  /* ...carried whole into an account that has no journey yet... */
  __resetJourneyStoreForTests();
  storage.clear();
  const local = markCompletedAt(
    markCompletedAt(markCompleted(EMPTY_JOURNEY, apples.id), apples.id, 2),
    apples.id,
    3,
  );
  storage.setItem(JOURNEY_KEY, JSON.stringify(local));
  assert.equal(await bindJourneyToCloud("child-2", cloud), "migrated");
  await settle();
  assert.deepEqual(cloud.journeys.get("child-2"), local);

  /* ...and dropped outright when the cloud already has one: tier lists are
     part of the journey, so cloud-wins means the cloud's tiers win too. */
  __resetJourneyStoreForTests();
  storage.clear();
  const inCloud = markCompletedAt(markCompleted(EMPTY_JOURNEY, home.id), home.id, 2);
  cloud.journeys.set("child-3", inCloud);
  storage.setItem(JOURNEY_KEY, JSON.stringify(local));
  cloud.writes = 0;
  assert.equal(await bindJourneyToCloud("child-3", cloud), "cloud");
  assert.deepEqual(readJourney(), inCloud);
  assert.equal(cloud.writes, 0, "nothing written on bind");
});

test("a journey cached before tiers existed binds with empty tier lists, not invented ones", async () => {
  storage.setItem(JOURNEY_KEY, JSON.stringify({ completed: [apples.id], last: apples.id }));
  assert.equal(await bindJourneyToCloud("child-1", cloud), "migrated");
  await settle();
  assert.deepEqual(cloud.journeys.get("child-1"), {
    completed: [apples.id],
    medium: [],
    hard: [],
    last: apples.id,
  });
});

test("a cloud update from elsewhere reaches the child's screens", async () => {
  await bindJourneyToCloud("child-1", cloud);
  await cloud.writeJourney("child-1", PLAYED);
  assert.deepEqual(readJourney(), PLAYED);
});

/* ---- Reset --------------------------------------------------------------- */

test("reset clears the cloud journey and the cache but keeps the child and the account", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await createChildProfile("Mia");
  await settle();
  recordCompleted(apples.id);
  recordCompletedAt(apples.id, 2);
  await settle();
  resetJourney();
  await settle();
  assert.deepEqual(cloud.journeys.get("child-1"), EMPTY_JOURNEY, "tier finishes reset with the rest");
  assert.deepEqual(JSON.parse(storage.getItem(JOURNEY_KEY)!), EMPTY_JOURNEY);
  assert.equal(currentSession().status, "ready");
  assert.equal(currentSession().child?.name, "Mia");
  assert.ok(cloud.users.has("uid-1"));
});

/* ---- Failed persistence -------------------------------------------------- */

test("a failed write keeps the child's progress on screen and tells the parent, then retries", async () => {
  await bindJourneyToCloud("child-1", cloud);
  cloud.failWrites = true;
  recordCompleted(apples.id);
  await settle();
  assert.equal(saveStatus(), "error");
  assert.deepEqual(readJourney(), PLAYED, "UI state kept");
  assert.equal(cloud.journeys.get("child-1"), undefined, "never claimed saved");
  cloud.failWrites = false;
  retrySave();
  await settle();
  assert.equal(saveStatus(), "synced");
  assert.deepEqual(cloud.journeys.get("child-1"), PLAYED);
});

test("the parent's sync line never says saved while a write is failing", () => {
  const src = readFileSync(new URL("../src/components/account/AccountRow.tsx", import.meta.url), "utf8");
  /* The row picks a key from the status, and the catalogue holds the words:
     both halves are checked, so neither the branch nor the sentence can
     drift into claiming a save that did not happen — in either language. */
  assert.match(src, /status === "error"\s*\?\s*"account\.sync\.error"/);
  assert.match(src, /status === "synced"\s*\?\s*"account\.sync\.synced"/);
  assert.doesNotMatch(src, /"error"[^:]*:\s*"account\.sync\.synced"/);
  assert.equal(en["account.sync.error"], "The latest progress has not reached your account yet.");
  assert.equal(en["account.sync.synced"], "Progress is saved to your account.");
});

/* ---- Continue Adventure and ParentDashboard read the cloud journey ------ */

test("Continue Adventure and the dashboard point at the next door of the cloud journey", async () => {
  cloud.journeys.set("child-1", PLAYED);
  await bindJourneyToCloud("child-1", cloud);
  const journey = readJourney();
  assert.equal(continueTarget(journey)?.id, flowers.id);
  assert.equal(nextUp(journey)?.activity.id, flowers.id);
  assert.equal(journeySummary(journey).activitiesDone, 1);
});

test("the child's screens keep reading `useJourney`, whichever store backs it", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  for (const file of [
    "components/worlds/ContinueAdventure.tsx",
    "components/parents/ParentDashboard.tsx",
    "components/worlds/WorldActivityGame.tsx",
  ]) {
    assert.match(read(file), /from "@\/lib\/journey\/useJourney"/, file);
    assert.doesNotMatch(read(file), /firebase|@\/lib\/cloud/, `${file} knows nothing of the cloud`);
  }
});

/* ---- Parent access -------------------------------------------------------- */

test("the parent area gates on session state; /play and / do not", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const gate = read("components/account/ParentGate.tsx");
  for (const state of ["unavailable", "signed-out", "needs-child", "trouble", "ready"]) {
    assert.match(gate, new RegExp(`case "${state}"`), state);
  }
  assert.match(read("app/parents/page.tsx"), /<ParentGate \/>/);
  assert.doesNotMatch(read("app/play/page.tsx"), /session|ParentGate|firebase/i);
  assert.doesNotMatch(read("app/page.tsx"), /session|ParentGate|firebase/i);
});

test("the child never meets account words", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  for (const file of ["components/worlds/ContinueAdventure.tsx", "components/worlds/WorldActivityGame.tsx", "app/play/page.tsx"]) {
    assert.doesNotMatch(read(file), /password|sign in|sign up|log in|Firebase|your account/i, file);
  }
});

/* ---- Account deletion ----------------------------------------------------- */

test("deleting the account removes user, child and journey, leaving no orphans", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await createChildProfile("Mia");
  await settle();
  recordCompleted(apples.id);
  await settle();
  assert.equal(await deleteAccount(), null);
  await settle();
  assert.equal(cloud.users.size, 0);
  assert.equal(cloud.children.size, 0);
  assert.equal(cloud.journeys.size, 0);
  assert.equal(currentSession().status, "signed-out");
  assert.equal(storage.getItem(JOURNEY_KEY), null);
});

test("a stale sign-in is reported, not worked around", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  cloud.deleteAccount = async () => {
    throw new Error("auth/requires-recent-login");
  };
  assert.equal(await deleteAccount(), "recent-login");
  assert.equal(currentSession().status, "needs-child", "still signed in");
});

/* ---- Name ------------------------------------------------------------------ */

test("renaming the child from the dashboard reaches the cloud profile", async () => {
  await boot();
  await signUp("p@example.com", "secret1");
  await settle();
  await createChildProfile("Mia");
  await settle();
  setChildName("Mimi");
  await settle();
  assert.equal(cloud.children.get("child-1")?.name, "Mimi");
});

test("unbinding returns the journey to device-only mode", async () => {
  await bindJourneyToCloud("child-1", cloud);
  unbindJourney();
  assert.equal(isJourneyCloudBound(), false);
  assert.equal(saveStatus(), "local");
});
