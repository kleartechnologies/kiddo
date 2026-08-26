/**
 * What a KIDDO API route accepts before it does any work.
 *
 * Every route but the Stripe webhook reads its body through `readJson`,
 * and the webhook is the exception on purpose: its signature is over the
 * bytes as sent. These tests are the guard on both halves of that — that
 * a hostile body is refused early and cheaply, and that the webhook is
 * never quietly converted to the shared parser.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { MAX_BODY_BYTES, readJson } from "@/server/http";
import { bucketId, clientIp, consume, LIMITS } from "@/server/rateLimit";

const URL_ = "https://kiddo.test/api/billing/portal";

function post(body: BodyInit | null, type: string | null = "application/json"): Request {
  return new Request(URL_, {
    method: "POST",
    headers: type ? { "content-type": type } : {},
    body,
  });
}

async function reason(response: Response): Promise<string> {
  return ((await response.json()) as { error?: string }).error ?? "";
}

test("a body that is not JSON is refused before it is read", async () => {
  for (const type of [null, "text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) {
    const answer = await readJson(post("{}", type));
    assert.ok(answer instanceof Response, `${type} should not be parsed`);
    assert.equal(answer.status, 415);
    assert.equal(await reason(answer), "unsupported-media-type");
  }
});

test("a body larger than the limit is refused, announced or not", async () => {
  const huge = JSON.stringify({ returnTo: "/parents", pad: "x".repeat(MAX_BODY_BYTES) });
  assert.ok(huge.length > MAX_BODY_BYTES);

  /* Announced: `content-length` is over the limit and nothing is read. */
  const announced = await readJson(post(huge));
  assert.ok(announced instanceof Response);
  assert.equal(announced.status, 413);
  assert.equal(await reason(announced), "body-too-large");

  /* Unannounced: a stream carries no length, so the count has to happen
     as the bytes arrive. This is the shape a real attacker sends. */
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(huge));
      controller.close();
    },
  });
  const chunked = new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  assert.equal(chunked.headers.get("content-length"), null, "the test's own premise");
  const counted = await readJson(chunked);
  assert.ok(counted instanceof Response);
  assert.equal(counted.status, 413);
});

test("malformed JSON is an error, not an empty object", async () => {
  for (const bad of ["{", "{\"plan\":}", "not json at all", "[1,2,3]", "null", '"monthly"', "7"]) {
    const answer = await readJson(post(bad));
    assert.ok(answer instanceof Response, `${bad} should be refused`);
    assert.equal(answer.status, 400);
    assert.equal(await reason(answer), "bad-json");
  }
});

test("an ordinary body still reads the way the routes expect", async () => {
  const answer = await readJson(post(JSON.stringify({ plan: "monthly", returnTo: "/parents" })));
  assert.ok(!(answer instanceof Response));
  assert.deepEqual(answer, { plan: "monthly", returnTo: "/parents" });

  /* `/api/account/delete` sends `{}`; an absent body means the same. */
  assert.deepEqual(await readJson(post("{}")), {});
  assert.deepEqual(await readJson(post(null)), {});
});

test("every route but the webhook reads its body through readJson", () => {
  const routes = [
    "../src/app/api/billing/checkout/route.ts",
    "../src/app/api/billing/portal/route.ts",
  ];
  for (const path of routes) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /const body = await readJson\(request\);/, path);
    assert.match(source, /if \(body instanceof Response\) return body;/, `${path} must return the refusal`);
    assert.doesNotMatch(source, /request\.json\(\)/, `${path} must not parse the body itself`);
  }

  const webhook = readFileSync(new URL("../src/app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  assert.match(webhook, /const raw = await request\.text\(\);/, "the signature is over the raw bytes");
  assert.match(webhook, /constructEvent\(raw, signature, webhookSecret\(\)\)/);
  assert.doesNotMatch(webhook, /readJson/, "parsing the webhook body would break verification");
  assert.match(webhook, /MAX_WEBHOOK_BYTES/, "an unsigned stranger can still open this connection");
});

test("the rate limiter fails closed when it cannot count", async () => {
  const saved = process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    const answer = await consume(LIMITS.checkout, "uid-1", 1_000_000);
    assert.equal(answer.allowed, false, "no counter means no permission");
    assert.equal(answer.failed, true, "and the route can tell that apart from a real limit");
    assert.ok(answer.retryAfterS > 0);
  } finally {
    if (saved !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT = saved;
  }

  const source = readFileSync(new URL("../src/server/rateLimit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /new Map\(|globalThis\./, "an in-process counter resets on every cold start");
  assert.match(source, /runTransaction/, "two instances must not both see the same count as free");
  assert.match(source, /expiresAt/, "the buckets have to be collectable");
});

test("one identity's budget is its own, and each window starts fresh", () => {
  const rule = LIMITS.social;
  /* Aligned to a window edge, so "still the same window" is a real claim. */
  const start = Math.ceil(1_700_000_000_000 / rule.windowMs) * rule.windowMs;
  assert.notEqual(bucketId(rule, "1.1.1.1", start), bucketId(rule, "2.2.2.2", start));
  assert.notEqual(bucketId(rule, "1.1.1.1", start), bucketId(LIMITS.checkout, "1.1.1.1", start));
  assert.equal(bucketId(rule, "1.1.1.1", start), bucketId(rule, "1.1.1.1", start + rule.windowMs - 1));
  assert.notEqual(bucketId(rule, "1.1.1.1", start), bucketId(rule, "1.1.1.1", start + rule.windowMs));

  /* A caller must not be able to steer which document is written: no
     slashes, no path traversal, no unbounded length. */
  const hostile = bucketId(rule, "../../users/victim/" + "z".repeat(5000), start);
  assert.doesNotMatch(hostile, /[/]/);
  assert.ok(hostile.length < 260, `id was ${hostile.length} characters`);
});

test("the caller's IP comes from the header a caller cannot set", () => {
  const netlify = new Request(URL_, {
    headers: { "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" },
  });
  assert.equal(clientIp(netlify), "9.9.9.9", "the connection wins over anything forwarded");

  const forwarded = new Request(URL_, { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
  assert.equal(clientIp(forwarded), "1.2.3.4", "the original client is the first entry");

  assert.equal(clientIp(new Request(URL_)), "unknown", "an unknown IP is a bucket, not a bypass");
});

test("the budgets are sized for a family, not for a load test", () => {
  assert.ok(LIMITS.checkout.limit <= 10, "each one creates a real Stripe session");
  assert.ok(LIMITS.accountDelete.limit <= 5, "an account is deleted once");
  assert.ok(LIMITS.social.limit <= 60, "the landing page asks once per visit");
  for (const rule of Object.values(LIMITS)) {
    assert.ok(rule.limit > 0 && rule.windowMs > 0, `${rule.name} must actually limit something`);
  }
});
