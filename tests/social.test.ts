import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import {
  JOIN_WINDOW_MS,
  MAX_JOIN_NOTICES,
  noticeFor,
  parseJoinEvent,
  recentJoins,
  type JoinEvent,
} from "@/lib/social/joins";

/**
 * The purchase notices, checked for the one property that matters: they
 * cannot be made up.
 *
 * The claim KIDDO makes on the landing page is "another family joined".
 * That claim is only honest if every notice traces back to a Stripe
 * subscription that really became active — so these tests do not merely
 * check the formatting, they check the shape of the system: that the only
 * writer is the webhook, that nothing generates or samples an event, that
 * the document holds no fact about a person, and that "no events" renders
 * as no notices rather than as something reassuring.
 */

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const at = (msAgo: number): JoinEvent => ({ at: NOW - msAgo, plan: null });

test("an event is two facts, read back defensively, or it is not an event", () => {
  assert.deepEqual(parseJoinEvent({ at: NOW, plan: "yearly" }), { at: NOW, plan: "yearly" });
  assert.deepEqual(parseJoinEvent({ at: NOW, plan: "monthly" }), { at: NOW, plan: "monthly" });
  assert.deepEqual(parseJoinEvent({ at: NOW }), { at: NOW, plan: null });
  assert.deepEqual(parseJoinEvent({ at: NOW, plan: "lifetime" }), { at: NOW, plan: null });
  for (const bad of [null, undefined, "yesterday", 5, [], {}, { at: "now" }, { at: 0 }, { at: -1 }, { at: NaN }]) {
    assert.equal(parseJoinEvent(bad), null, `${JSON.stringify(bad)} parsed as an event`);
  }
  /* Anything else in the document is dropped rather than carried onward. */
  const extra = parseJoinEvent({ at: NOW, plan: "yearly", uid: "uid-1", email: "p@example.com", city: "Ipoh", amount: 5990 });
  assert.deepEqual(Object.keys(extra ?? {}).sort(), ["at", "plan"]);
});

test("only recent, real, newest-first events are shown, and only a handful", () => {
  const events = [at(3 * MINUTE), at(MINUTE), at(JOIN_WINDOW_MS + MINUTE), at(2 * MINUTE), at(4 * MINUTE), at(5 * MINUTE)];
  const shown = recentJoins(events, NOW);
  assert.equal(shown.length, MAX_JOIN_NOTICES, "a busy week does not become a ticker");
  assert.deepEqual(
    shown.map((e) => NOW - e.at),
    [MINUTE, 2 * MINUTE, 3 * MINUTE, 4 * MINUTE],
    "newest first, and the one outside the window is gone",
  );
  assert.deepEqual(recentJoins([at(-MINUTE)], NOW), [], "a future-dated event is a wrong clock, not news");
  assert.deepEqual(recentJoins([], NOW), [], "nothing in, nothing out");
});

test("a notice says a family joined and nothing about the family", () => {
  const sentences = [
    noticeFor({ at: NOW, plan: "yearly" }),
    noticeFor({ at: NOW, plan: "monthly" }),
    noticeFor({ at: NOW, plan: null }),
  ];
  assert.match(sentences[0], /Yearly plan/);
  for (const sentence of sentences) {
    assert.doesNotMatch(sentence, /\d/, `"${sentence}" carries a number`);
    assert.doesNotMatch(sentence, /@|\bfrom\b|RM/, `"${sentence}" carries a place, a name or an amount`);
    assert.ok(sentence.length < 60);
  }
  assert.equal(new Set(sentences).size, 3, "each plan reads differently, so the notice is about a real event");
});

test("nothing in KIDDO can invent a join: the webhook is the only writer", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
    );
  const src = new URL("../src", import.meta.url).pathname;
  const writers = walk(src).filter((file) => /collection\(JOINS\)|"joinEvents"/.test(readFileSync(file, "utf8")));
  assert.deepEqual(
    writers.map((f) => f.slice(src.length)),
    ["/server/billing.ts"],
    "joinEvents is touched somewhere other than the webhook's own module",
  );

  const billing = readFileSync(`${src}/server/billing.ts`, "utf8");
  assert.match(billing, /\.doc\(subscriptionId\)\.create\(\{ at, plan \}\)/, "a join must be one document per real subscription, created once");
  assert.match(billing, /status === "active" && !applied\.wasActive/, "a join is recorded on the transition into active, not on every event");

  /* No sample data, no generator, no clock that produces news by itself. */
  for (const file of [`${src}/lib/social/joins.ts`, `${src}/components/landing/JoinNotices.tsx`, `${src}/app/api/social/recent/route.ts`]) {
    /* Code only: a comment may promise there is no sample data. */
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code, /Math\.random|faker|sample|demo|placeholder/i, `${file} could produce an event nobody bought`);
  }

  /* Firestore hands joinEvents to no client, signed in or not. */
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/joinEvents\/\{subscriptionId\} \{\s*allow read, write: if false;/);
});

test("no events is answered with no notices, never with something reassuring", () => {
  const notices = readFileSync(new URL("../src/components/landing/JoinNotices.tsx", import.meta.url), "utf8");
  assert.match(notices, /if \(events\.length === 0\) return null;/, "an empty list must render nothing at all");
  assert.match(notices, /useState<JoinEvent\[\]>\(\[\]\)/, "the page starts with no notices and only a real fetch adds any");
  assert.doesNotMatch(notices, /<button|onClick/, "a notice is news, not something a parent has to dismiss");

  const route = readFileSync(new URL("../src/app/api/social/recent/route.ts", import.meta.url), "utf8");
  assert.match(route, /if \(!adminConfigured\(\)\) return quiet\(\[\]\);/);
  assert.match(
    route,
    /console\.error\("\[social\/recent\]".*\n\s*return quiet\(\[\]\);/,
    "a failing server answers with an empty list",
  );
  assert.match(
    route,
    /const events = await recentJoinEvents\(READ_LIMIT\);/,
    "every notice comes from Firestore; the route invents none",
  );
});

test("the route answers with an empty list, not an error, when billing is not configured", async () => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  const { GET } = await import("@/app/api/social/recent/route");
  const response = await GET(new Request("https://kiddo.test/api/social/recent"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { events: [] });
});
