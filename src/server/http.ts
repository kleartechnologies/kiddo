import "server-only";

import { adminConfigured, callerFromRequest, type Caller } from "./firebaseAdmin";
import { stripeConfigured } from "./stripe";

/** Small helpers so every billing route answers the same way. */

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * A JSON answer the CDN in front of KIDDO is allowed to keep for a while.
 *
 * Only for responses that are the same for everybody — the join notices,
 * and nothing that depends on who is asking. `no-store` stays the default
 * above precisely so this has to be chosen on purpose.
 */
export function cachedJson(body: unknown, maxAgeS: number, staleS = maxAgeS * 5): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=0, s-maxage=${maxAgeS}, stale-while-revalidate=${staleS}`,
    },
  });
}

export function problem(status: number, error: string): Response {
  return json({ error }, status);
}

/** 429, with the header a well-behaved client actually waits on. */
export function tooMany(retryAfterS: number): Response {
  return new Response(JSON.stringify({ error: "rate-limited" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "retry-after": String(Math.max(1, Math.ceil(retryAfterS))),
    },
  });
}

/** 503 until the server has both Firebase Admin and Stripe configured. */
export function billingUnavailable(): Response | null {
  if (!adminConfigured() || !stripeConfigured()) return problem(503, "billing-not-configured");
  return null;
}

export async function requireCaller(request: Request): Promise<Caller | Response> {
  const caller = await callerFromRequest(request);
  return caller ?? problem(401, "unauthorized");
}

/**
 * The only origin KIDDO sends a parent back to.
 *
 * `NEXT_PUBLIC_SITE_URL` is the single answer in production, because every
 * other candidate is chosen by the caller. `Origin` is a request header: an
 * attacker who sends `Origin: https://evil.example` to `/api/billing/checkout`
 * would otherwise be handed a Stripe Checkout URL whose `success_url` points
 * at their own site — a page a parent reaches with a payment just completed
 * and every reason to trust it. `request.url` is no better behind a proxy
 * that honours `Host`.
 *
 * So in production there is no fallback. If the variable is missing the
 * answer is `null` and the route says so, which is a loud, safe failure a
 * deploy check catches — instead of a quiet one that ships a redirect an
 * attacker chose. Locally, where there is no such variable and no such
 * attacker, the request's own origin is used, and only if it is loopback.
 *
 * Both callers pass the result straight into a Stripe URL; see
 * `docs/SECURITY.md` for the deployment requirement.
 */
export function siteUrl(request: Request): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return null;
  const origin = new URL(request.url).origin;
  return LOOPBACK.test(origin) ? origin : null;
}

const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function safePath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/**
 * Every JSON body KIDDO accepts is a handful of short fields — a plan name
 * and a path. Four kilobytes is already far more than any of them, and is
 * small enough that a flood of large bodies is refused before the server
 * has spent memory holding one.
 *
 * The Stripe webhook is deliberately not a caller here: it must hash the
 * bytes exactly as Stripe sent them, so it reads `request.text()` itself.
 * Stripe events are also legitimately larger than this.
 */
export const MAX_BODY_BYTES = 4096;

/**
 * Read a JSON object body, or the response explaining why not.
 *
 * This used to answer `{}` for anything it could not parse, which let a
 * malformed or hostile body through to be silently treated as an empty
 * one. Now each failure has its own honest status: 415 for a body that
 * is not JSON, 413 for one that is too big, 400 for one that is not
 * valid JSON or is not an object.
 *
 * The size is checked twice on purpose. `content-length` is the cheap
 * check and refuses an announced flood before a byte is read; the stream
 * is then counted as it arrives, because a client is free to lie about
 * the header or omit it entirely with chunked encoding.
 */
export async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type.trim())) return problem(415, "unsupported-media-type");

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return problem(413, "body-too-large");

  let text: string;
  try {
    text = await readCapped(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof TooLarge) return problem(413, "body-too-large");
    return problem(400, "bad-body");
  }

  if (text.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return problem(400, "bad-json");
  }
  /* An array is a JSON object to `typeof`, and null is too. Neither is a
     body any route here knows how to read. */
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return problem(400, "bad-json");
  return parsed as Record<string, unknown>;
}

class TooLarge extends Error {}

/** Read the body as text, giving up the moment it passes `limit` bytes. */
async function readCapped(request: Request, limit: number): Promise<string> {
  const body = request.body;
  /* Not every Request carries a stream — a hand-built one in a test may
     hold a string instead — so fall back to reading it whole and checking
     the size afterwards. Such a body is already in memory either way. */
  if (!body) {
    const whole = await request.text();
    if (byteLength(whole) > limit) throw new TooLarge();
    return whole;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) throw new TooLarge();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    if (total > limit) await body.cancel().catch(() => {});
  }

  const joined = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
