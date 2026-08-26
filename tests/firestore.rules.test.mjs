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
  deleteField,
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
/* A real door id: journeys may only ever name one KIDDO actually has. */
const DOOR = "counting.count-the-apples";
const DOOR2 = "words.word-discovery";
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
    await setDoc(doc(db, "children/alice-0"), {
      parentId: "alice",
      name: "Mia",
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(doc(db, "journeys/alice-0"), { completed: [DOOR], last: DOOR, updatedAt: 1 });
    await setDoc(doc(db, "children/bob-0"), {
      parentId: "bob",
      name: "Leo",
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(doc(db, "journeys/bob-0"), { completed: [], last: null, updatedAt: 1 });
  });
}

describe("unauthenticated", () => {
  it("reads and writes nothing", async () => {
    await seed();
    const db = nobody();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "children/alice-0")));
    await assertFails(getDoc(doc(db, "journeys/alice-0")));
    await assertFails(getDocs(collection(db, "children")));
    await assertFails(setDoc(doc(db, "users/alice"), { email: "x" }));
    await assertFails(setDoc(doc(db, "journeys/alice-0"), { completed: [], last: null }));
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
  });

  /* The user document carries the Stripe customer id and the subscription
     the webhook writes. A client that could delete it could throw away the
     billing identity of a subscription that keeps on renewing, and then
     start a second one — so nobody deletes it from a browser. Account
     deletion is POST /api/account/delete, which cancels Stripe first and
     removes everything with the Admin SDK, which does not read these
     rules at all. */
  it("cannot be deleted by its owner, by anyone else, or by a stranger", async () => {
    await seed();
    await assertFails(deleteDoc(doc(as(ALICE), "users/alice")));
    await assertFails(deleteDoc(doc(as(BOB), "users/alice")));
    await assertFails(deleteDoc(doc(nobody(), "users/alice")));

    /* Nor by any of the ways a delete can be spelled as a write. */
    await assertFails(setDoc(doc(as(ALICE), "users/alice"), {}));
    await assertFails(updateDoc(doc(as(ALICE), "users/alice"), { email: deleteField() }));

    /* It is still there, with everything the server put on it. */
    const snap = await assertSucceeds(getDoc(doc(as(ALICE), "users/alice")));
    if (!snap.exists()) throw new Error("the user document should have survived");

    /* And the server, which does not go through these rules, still can. */
    await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), "users/alice")));
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

  it("the rate-limit counters are closed to every client, signed in or not", async () => {
    // A client that could read these would know how much room it has left;
    // one that could write them would have no limit at all.
    for (const db of [as(ALICE), nobody()]) {
      await assertFails(setDoc(doc(db, "rateLimits/checkout__alice__1"), { count: 0 }));
      await assertFails(getDoc(doc(db, "rateLimits/checkout__alice__1")));
      await assertFails(getDocs(collection(db, "rateLimits")));
    }
  });

  it("the join notices are closed to every client, signed in or not", async () => {
    // A landing-page notice must be a purchase that really happened, so no
    // client may add one — and since a join is somebody else's purchase,
    // no client may read one either. The server serves them at
    // /api/social/recent, from two fields that identify nobody.
    for (const db of [as(ALICE), nobody()]) {
      await assertFails(setDoc(doc(db, "joinEvents/sub_1"), { at: 1, plan: "yearly" }));
      await assertFails(getDoc(doc(db, "joinEvents/sub_1")));
      await assertFails(getDocs(collection(db, "joinEvents")));
    }
  });
});

describe("children", () => {
  it("is readable only by the owning parent, only via an owner-filtered query", async () => {
    await seed();
    const alice = as(ALICE);
    await assertSucceeds(getDoc(doc(alice, "children/alice-0")));
    await assertFails(getDoc(doc(alice, "children/bob-0")));
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
    await assertSucceeds(setDoc(doc(alice, "children/alice-1"), ok));
    await assertFails(setDoc(doc(alice, "children/alice-2"), { ...ok, parentId: "bob" }));
    await assertFails(setDoc(doc(alice, "children/alice-2"), { ...ok, name: "" }));
    await assertFails(setDoc(doc(alice, "children/alice-2"), { ...ok, name: "x".repeat(25) }));
    await assertFails(setDoc(doc(alice, "children/alice-2"), { ...ok, birthdate: "2019-01-01" }));
  });

  /* A child document is created by the browser, so the rules are the only
     limit on how many one sign-up can make. The cap is the id itself. */
  it("stops at the parent's own slots, and a deleted child frees one", async () => {
    const alice = as(ALICE);
    const ok = { parentId: "alice", name: "Mia", createdAt: 1, updatedAt: 1 };
    for (const slot of [0, 1, 2, 3, 4, 5]) {
      await assertSucceeds(setDoc(doc(alice, `children/alice-${slot}`), ok));
    }
    // A seventh has nowhere to go: not a further slot…
    await assertFails(setDoc(doc(alice, "children/alice-6"), ok));
    await assertFails(setDoc(doc(alice, "children/alice-60"), ok));
    // …not an id of the parent's own choosing…
    await assertFails(setDoc(doc(alice, "children/mia"), ok));
    await assertFails(setDoc(doc(alice, "children/alice-"), ok));
    // …and not one of somebody else's, even carrying her own parentId.
    await assertFails(setDoc(doc(alice, "children/bob-1"), ok));

    // Deleting gives the slot back, so the cap is "at once", not "ever".
    await assertSucceeds(deleteDoc(doc(alice, "children/alice-3")));
    await assertSucceeds(setDoc(doc(alice, "children/alice-3"), ok));
  });

  it("can be renamed but never re-parented, and only deleted by its parent", async () => {
    await seed();
    const alice = as(ALICE);
    await assertSucceeds(updateDoc(doc(alice, "children/alice-0"), { name: "Mimi", updatedAt: 2 }));
    await assertFails(updateDoc(doc(alice, "children/alice-0"), { parentId: "bob" }));
    await assertFails(updateDoc(doc(as(BOB), "children/alice-0"), { name: "Leo" }));
    await assertFails(deleteDoc(doc(as(BOB), "children/alice-0")));
    await assertSucceeds(deleteDoc(doc(alice, "children/alice-0")));
  });
});

describe("journeys", () => {
  it("follow the child's ownership", async () => {
    await seed();
    const alice = as(ALICE);
    const bob = as(BOB);
    await assertSucceeds(getDoc(doc(alice, "journeys/alice-0")));
    await assertFails(getDoc(doc(bob, "journeys/alice-0")));
    await assertFails(getDoc(doc(alice, "journeys/bob-0")));
    const journey = { completed: [DOOR, DOOR2], last: DOOR2, updatedAt: 2 };
    await assertSucceeds(setDoc(doc(alice, "journeys/alice-0"), journey));
    await assertFails(setDoc(doc(bob, "journeys/alice-0"), journey));
    await assertFails(setDoc(doc(alice, "journeys/nobodys-child"), journey));
    await assertFails(deleteDoc(doc(bob, "journeys/alice-0")));
    await assertSucceeds(deleteDoc(doc(alice, "journeys/alice-0")));
  });

  it("only accept the journey shape", async () => {
    await seed();
    const alice = as(ALICE);
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: DOOR, last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], last: 3, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], last: null, score: 9 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], medium: "x", last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], hard: 7, last: null, updatedAt: 2 }),
    );
    /* Only doors KIDDO actually has. This is what stops the journey from
       being used as free storage: rules cannot measure a document, but
       they can say exactly which values a list may hold. */
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: ["made-up.door"], last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: ["x".repeat(50000)], last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [DOOR, "made-up.door"], last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], medium: ["made-up.door"], last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], hard: [{ door: DOOR }], last: null, updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], last: "made-up.door", updatedAt: 2 }),
    );
    await assertFails(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], last: null, updatedAt: "x".repeat(50000) }),
    );

    /* The shape from before tiers existed still writes — migration by shape. */
    await assertSucceeds(
      setDoc(doc(alice, "journeys/alice-0"), { completed: [], last: null, updatedAt: 2 }),
    );
    await assertSucceeds(
      setDoc(doc(alice, "journeys/alice-0"), {
        completed: [DOOR],
        medium: [DOOR],
        hard: [],
        last: DOOR,
        updatedAt: 2,
      }),
    );
  });
});
