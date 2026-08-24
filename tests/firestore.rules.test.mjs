/**
 * Firestore security-rule tests, run against the local emulator:
 *
 *   npm run test:rules
 *
 * (`firebase emulators:exec` starts Firestore with `demo-kiddo`, a demo
 * project id that needs no login, runs this file, then shuts it down.)
 *
 * Each test speaks as a specific parent — or as nobody — and asserts what
 * the rules allow. The shape mirrors docs/kiddo-accounts.md: a parent reads
 * and writes only their own user document, only children whose parentId is
 * their uid, and only the journeys of those children.
 */
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-kiddo";
const ALICE = { uid: "alice", email: "alice@example.com" };
const BOB = { uid: "bob", email: "bob@example.com" };

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (user) =>
  env.authenticatedContext(user.uid, { email: user.email }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();

/** Seed data while rules are switched off — the world as it would exist. */
async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { email: ALICE.email, createdAt: 1, updatedAt: 1 });
    await setDoc(doc(db, "children/c-alice"), {
      parentId: "alice",
      name: "Mia",
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(doc(db, "journeys/c-alice"), { completed: ["a"], last: "a", updatedAt: 1 });
    await setDoc(doc(db, "children/c-bob"), {
      parentId: "bob",
      name: "Leo",
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(doc(db, "journeys/c-bob"), { completed: [], last: null, updatedAt: 1 });
  });
}

describe("unauthenticated", () => {
  it("reads and writes nothing", async () => {
    await seed();
    const db = nobody();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "children/c-alice")));
    await assertFails(getDoc(doc(db, "journeys/c-alice")));
    await assertFails(getDocs(collection(db, "children")));
    await assertFails(setDoc(doc(db, "users/alice"), { email: "x" }));
    await assertFails(setDoc(doc(db, "journeys/c-alice"), { completed: [], last: null }));
  });
});

describe("users", () => {
  it("a parent owns their own document and nobody else's", async () => {
    await seed();
    const alice = as(ALICE);
    await assertSucceeds(getDoc(doc(alice, "users/alice")));
    await assertFails(getDoc(doc(as(BOB), "users/alice")));
    await assertSucceeds(
      setDoc(doc(alice, "users/alice"), { email: ALICE.email, createdAt: 1, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(as(BOB), "users/alice"), { email: BOB.email, createdAt: 1, updatedAt: 2 }),
    );
  });

  it("a new document must carry the account's own email and nothing extra", async () => {
    const bob = as(BOB);
    await assertFails(
      setDoc(doc(bob, "users/bob"), { email: "other@example.com", createdAt: 1, updatedAt: 1 }),
    );
    await assertFails(
      setDoc(doc(bob, "users/bob"), {
        email: BOB.email,
        createdAt: 1,
        updatedAt: 1,
        parentName: "Bob",
      }),
    );
    await assertSucceeds(
      setDoc(doc(bob, "users/bob"), { email: BOB.email, createdAt: 1, updatedAt: 1 }),
    );
    await assertSucceeds(deleteDoc(doc(bob, "users/bob")));
  });
});

describe("subscription (server-owned)", () => {
  const ACTIVE = {
    status: "active",
    plan: "yearly",
    currentPeriodEnd: 4102444800000,
    cancelAtPeriodEnd: false,
    stripeCustomerId: "cus_x",
    stripeSubscriptionId: "sub_x",
    eventCreated: 1,
    updatedAt: 1,
  };

  it("the owner can read it but cannot create, add, change or remove it", async () => {
    await seed();
    const db = as(ALICE);
    // Cannot create a user document that already carries a subscription.
    await assertFails(
      setDoc(doc(db, "users/alice2"), { email: ALICE.email, createdAt: 1, updatedAt: 1, subscription: ACTIVE }),
    );
    // Cannot add one to an existing document.
    await assertFails(updateDoc(doc(db, "users/alice"), { subscription: ACTIVE }));
    await assertFails(setDoc(doc(db, "users/alice"), { subscription: ACTIVE }, { merge: true }));
    await assertFails(updateDoc(doc(db, "users/alice"), { "subscription.status": "active" }));

    // The server (rules off) writes it…
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), "users/alice"), { subscription: { ...ACTIVE, status: "past_due" } }),
    );
    // …the owner reads it…
    const snap = await assertSucceeds(getDoc(doc(db, "users/alice")));
    if (snap.data().subscription.status !== "past_due") throw new Error("owner should read the subscription");
    // …and cannot grant themselves access, nor strip the field.
    await assertFails(updateDoc(doc(db, "users/alice"), { "subscription.status": "active" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { subscription: ACTIVE }));
    await assertFails(updateDoc(doc(db, "users/alice"), { "subscription.currentPeriodEnd": 9999999999999 }));
    await assertFails(setDoc(doc(db, "users/alice"), { email: ALICE.email, createdAt: 1, updatedAt: 2 }));
    // The ordinary client update still works alongside it.
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { email: ALICE.email, updatedAt: 2 }));
    // Nobody else can read it.
    await assertFails(getDoc(doc(as(BOB), "users/alice")));
  });

  it("the webhook's event log is closed to every client", async () => {
    const db = as(ALICE);
    await assertFails(setDoc(doc(db, "stripeEvents/evt_1"), { type: "x", receivedAt: 1 }));
    await assertFails(getDoc(doc(db, "stripeEvents/evt_1")));
    await assertFails(getDocs(collection(db, "stripeEvents")));
  });
});

describe("children", () => {
  it("is readable only by the owning parent, only via an owner-filtered query", async () => {
    await seed();
    const alice = as(ALICE);
    await assertSucceeds(getDoc(doc(alice, "children/c-alice")));
    await assertFails(getDoc(doc(alice, "children/c-bob")));
    await assertSucceeds(
      getDocs(query(collection(alice, "children"), where("parentId", "==", "alice"))),
    );
    await assertFails(getDocs(collection(alice, "children")));
    await assertFails(
      getDocs(query(collection(alice, "children"), where("parentId", "==", "bob"))),
    );
  });

  it("can only be created for oneself with a valid name", async () => {
    const alice = as(ALICE);
    const ok = { parentId: "alice", name: "Mia", createdAt: 1, updatedAt: 1 };
    await assertSucceeds(setDoc(doc(alice, "children/new"), ok));
    await assertFails(setDoc(doc(alice, "children/stolen"), { ...ok, parentId: "bob" }));
    await assertFails(setDoc(doc(alice, "children/blank"), { ...ok, name: "" }));
    await assertFails(setDoc(doc(alice, "children/long"), { ...ok, name: "x".repeat(25) }));
    await assertFails(setDoc(doc(alice, "children/extra"), { ...ok, birthdate: "2019-01-01" }));
  });

  it("can be renamed but never re-parented, and only deleted by its parent", async () => {
    await seed();
    const alice = as(ALICE);
    await assertSucceeds(updateDoc(doc(alice, "children/c-alice"), { name: "Mimi", updatedAt: 2 }));
    await assertFails(updateDoc(doc(alice, "children/c-alice"), { parentId: "bob" }));
    await assertFails(updateDoc(doc(as(BOB), "children/c-alice"), { name: "Leo" }));
    await assertFails(deleteDoc(doc(as(BOB), "children/c-alice")));
    await assertSucceeds(deleteDoc(doc(alice, "children/c-alice")));
  });
});

describe("journeys", () => {
  it("follow the child's ownership", async () => {
    await seed();
    const alice = as(ALICE);
    const bob = as(BOB);
    await assertSucceeds(getDoc(doc(alice, "journeys/c-alice")));
    await assertFails(getDoc(doc(bob, "journeys/c-alice")));
    await assertFails(getDoc(doc(alice, "journeys/c-bob")));
    const journey = { completed: ["a", "b"], last: "b", updatedAt: 2 };
    await assertSucceeds(setDoc(doc(alice, "journeys/c-alice"), journey));
    await assertFails(setDoc(doc(bob, "journeys/c-alice"), journey));
    await assertFails(setDoc(doc(alice, "journeys/nobodys-child"), journey));
    await assertFails(deleteDoc(doc(bob, "journeys/c-alice")));
    await assertSucceeds(deleteDoc(doc(alice, "journeys/c-alice")));
  });

  it("only accept the journey shape", async () => {
    await seed();
    const alice = as(ALICE);
    await assertFails(
      setDoc(doc(alice, "journeys/c-alice"), { completed: "a", last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/c-alice"), { completed: [], last: 3, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/c-alice"), { completed: [], last: null, score: 9 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/c-alice"), { completed: [], medium: "x", last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/c-alice"), { completed: [], hard: 7, last: null, updatedAt: 2 }),
    );
    /* The shape from before tiers existed still writes — migration by shape. */
    await assertSucceeds(
      setDoc(doc(alice, "journeys/c-alice"), { completed: [], last: null, updatedAt: 2 }),
    );
    await assertSucceeds(
      setDoc(doc(alice, "journeys/c-alice"), {
        completed: ["a"],
        medium: ["a"],
        hard: [],
        last: "a",
        updatedAt: 2,
      }),
    );
  });
});
