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

export function problem(status: number, error: string): Response {
  return json({ error }, status);
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
 * The only origin KIDDO sends a parent back to. A `returnTo` from the
 * client is accepted as a path on this site and nothing else, so a
 * tampered request cannot bounce a parent through Stripe to elsewhere.
 */
export function siteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return new URL(request.url).origin;
}

export function safePath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
