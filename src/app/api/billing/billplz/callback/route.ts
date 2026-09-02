import { getBill, signatureKey, verifySignature } from "@/server/billplz";
import { billRecord, settleBill } from "@/server/entitlement";
import { billingUnavailable, problem, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/billplz/callback — the server-to-server word from
 * Billplz, and the only thing that is *expected* to open KIDDO.
 *
 * Billplz posts a form-encoded body naming a bill. That body is a hint,
 * never evidence: the route reads the bill id out of it, then asks Billplz
 * itself — over HTTPS, with KIDDO's secret key — what that bill's state
 * actually is. Nothing the caller wrote decides anything.
 *
 * Whose payment it is comes from `billplzBills/{id}`, written when the bill
 * was created from a verified ID token. The email on the callback is not
 * consulted, so a forged callback naming a real bill cannot move access to
 * someone else's account, and one naming an unknown bill does nothing at
 * all.
 *
 * The order below is deliberate: the ledger is read before Billplz is
 * called, so an unknown or already-settled bill costs one Firestore read
 * and no outbound request.
 *
 * Answers 200 to everything it has finished with — including refusals —
 * because a retry would produce the same answer, and 500 only when a retry
 * might genuinely help.
 */

/** A Billplz callback is a dozen short fields. */
const MAX_CALLBACK_BYTES = 8192;

export async function POST(request: Request) {
  const down = billingUnavailable();
  if (down) return down;

  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/x-www-form-urlencoded\b/i.test(type.trim())) {
    return problem(415, "unsupported-media-type");
  }

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_CALLBACK_BYTES) return problem(413, "body-too-large");

  let text: string;
  try {
    text = await request.text();
  } catch {
    return problem(400, "bad-body");
  }
  if (new TextEncoder().encode(text).byteLength > MAX_CALLBACK_BYTES) return problem(413, "body-too-large");

  const params = new URLSearchParams(text);
  const fields: Record<string, string> = {};
  for (const [key, value] of params) fields[key] = value;

  const billId = fields.id;
  if (!billId) return problem(400, "no-bill");

  /* A stranger who guesses the URL must not be able to make KIDDO ask
     Billplz about the same bill a thousand times. Keyed on the bill, so one
     caller cannot spend another parent's budget. */
  const budget = await consume(LIMITS.callback, billId);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  /* When the collection has an X-Signature key, an unsigned or wrongly
     signed callback is refused outright. Without one KIDDO still only
     believes `getBill`, so the callback is merely a prompt to go and look;
     `docs/kiddo-billing.md` says to set the key anyway. */
  const key = signatureKey();
  if (key && !verifySignature(fields, fields.x_signature, key)) {
    console.warn("[billing/billplz/callback] bad signature", billId);
    return problem(401, "bad-signature");
  }

  try {
    const record = await billRecord(billId);
    /* Not a bill KIDDO created — another product on the same Billplz
       account, or someone making things up. Nothing to do, and nothing
       worth retrying. */
    if (!record) return ok("unknown");
    if (record.settled) return ok("already");

    const bill = await getBill(billId);
    const settlement = await settleBill(bill);
    if (settlement.outcome === "granted") console.info("[billing/billplz/callback] granted", billId);
    return ok(settlement.outcome);
  } catch (error) {
    /* Billplz unreachable, or Firestore refusing a write. Both are worth
       Billplz trying again, and the parent's own return leg will ask the
       same question anyway. */
    console.error("[billing/billplz/callback]", error instanceof Error ? error.message : error);
    return problem(500, "callback-failed");
  }
}

function ok(outcome: string): Response {
  return new Response(outcome, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
