import "server-only";

import { adminConfigured, adminDb } from "./firebaseAdmin";

/**
 * A rate limiter that survives serverless.
 *
 * KIDDO runs on Netlify, where every request may land on a different
 * function instance and a cold start begins with an empty process. A
 * counter in a module-level `Map` is therefore not a rate limiter: it
 * fails open on the first request to every new instance, which is exactly
 * the condition an attacker creates by sending traffic quickly. The count
 * has to live somewhere all the instances can see.
 *
 * That somewhere is Firestore, which KIDDO already has, already trusts and
 * already pays for. The alternative — Upstash Redis — is a better fit for
 * very high volume and is a drop-in replacement for `consume()` below, but
 * it is a second external service and a second secret to rotate, and at
 * KIDDO's size it would buy nothing that this does not already do. The
 * seam is deliberate: only `consume()` would change.
 *
 * The window is fixed rather than sliding. A fixed window can let through
 * up to twice the limit across a boundary, which for the budgets KIDDO
 * uses — a handful of Checkout sessions an hour — is not worth a read of
 * a sorted set to avoid.
 *
 * Cost matters here, because a rate limiter that costs more than the thing
 * it protects is not a defence. Every call is one transaction: one read and
 * one write. That is why the callers check their cache *first* and only
 * reach the limiter when they are about to do something more expensive.
 */

const COLLECTION = "rateLimits";

export interface RateLimitRule {
  /** Namespaces the counter, so two routes never share a budget. */
  readonly name: string;
  /** How many requests one identity may make per window. */
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Requests left in this window; 0 once the limit is reached. */
  readonly remaining: number;
  /** Seconds until the window resets, for a `retry-after` header. */
  readonly retryAfterS: number;
  /**
   * True when the answer is "no" because the counter could not be read,
   * not because a budget ran out. Callers still must not proceed — that is
   * what failing closed means — but a public route can use this to stay
   * quiet about an outage instead of calling it rate limiting.
   */
  readonly failed: boolean;
}

/**
 * KIDDO's budgets, in one place so they can be read as a set.
 *
 * These are sized for a family, not for a load test. A parent subscribes
 * once, opens the portal when something changes, and deletes an account at
 * most once ever. Anything above these numbers is not a parent.
 */
export const LIMITS = {
  /** Public and unauthenticated, so keyed on IP and the loosest of them. */
  social: { name: "social", limit: 30, windowMs: 60_000 },
  /** Each call creates a real Stripe Checkout session. */
  checkout: { name: "checkout", limit: 8, windowMs: 60 * 60_000 },
  /** Each call creates a real Stripe Customer Portal session. */
  portal: { name: "portal", limit: 12, windowMs: 60 * 60_000 },
  /** Irreversible, and never wanted twice. */
  accountDelete: { name: "account-delete", limit: 3, windowMs: 60 * 60_000 },
  /** Paid content draws, per subscriber. Generous: a child plays a lot. */
  content: { name: "content", limit: 240, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * A Firestore document id for this identity and window. Firestore forbids
 * `/` in an id and dislikes very long ones, so the identity is encoded
 * rather than interpolated — an IPv6 address or a header a caller chose
 * must not be able to change which document is written.
 */
export function bucketId(rule: RateLimitRule, identity: string, now: number): string {
  const window = Math.floor(now / rule.windowMs);
  const safe = encodeURIComponent(identity).replace(/%/g, "_").slice(0, 200);
  return `${rule.name}__${safe}__${window}`;
}

/**
 * Count one request against `identity`, and say whether it may proceed.
 *
 * Fails **closed**: if Firestore cannot be reached the answer is "no". A
 * limiter that opens under load is not a limiter, and every caller here
 * needs Firestore for its real work anyway, so failing closed costs a
 * request that was going to fail one line later regardless.
 */
export async function consume(
  rule: RateLimitRule,
  identity: string,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowEnd = (Math.floor(now / rule.windowMs) + 1) * rule.windowMs;
  const retryAfterS = Math.max(1, Math.ceil((windowEnd - now) / 1000));

  if (!adminConfigured()) return { allowed: false, remaining: 0, retryAfterS, failed: true };

  const ref = adminDb().collection(COLLECTION).doc(bucketId(rule, identity, now));
  try {
    const count = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const previous = snap.exists ? snap.data()?.count : undefined;
      const next = (typeof previous === "number" && Number.isFinite(previous) ? previous : 0) + 1;
      /* `expiresAt` is what a Firestore TTL policy deletes on, so these
         documents do not accumulate the way `stripeEvents` did. Setting
         the policy is a console step; see docs/SECURITY.md. */
      tx.set(ref, { count: next, expiresAt: new Date(windowEnd + rule.windowMs) });
      return next;
    });
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterS,
      failed: false,
    };
  } catch (error) {
    console.error("[rateLimit]", error instanceof Error ? error.message : error);
    return { allowed: false, remaining: 0, retryAfterS, failed: true };
  }
}

/**
 * The caller's IP, as well as it can be known behind a CDN.
 *
 * Netlify sets `x-nf-client-connection-ip` from the connection itself, so
 * it is the one header here a client cannot choose. `x-forwarded-for` is
 * a fallback for local runs and other hosts, and its first entry is taken
 * because that is the original client when a trusted proxy appends.
 *
 * A caller who can forge these gets a *different bucket*, not a bypass of
 * the concept — which is why the routes that matter are keyed on a
 * verified uid instead, and only the public one falls back to IP.
 */
export function clientIp(request: Request): string {
  const netlify = request.headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
