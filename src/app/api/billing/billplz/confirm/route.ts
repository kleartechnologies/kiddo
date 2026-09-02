import { requireAppCheck } from "@/server/appCheck";
import { BillplzError, getBill } from "@/server/billplz";
import { billRecord, settleBill } from "@/server/entitlement";
import { billingUnavailable, json, problem, readJson, requireCaller, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/billplz/confirm  { billId }  → { paid }
 *
 * The parent's own return leg, and the reason `/welcome` rarely has to sit
 * and wait. Billplz sends the browser back with the bill id in the query
 * string; the page hands that id here and this route asks Billplz — with
 * the secret key, from the server — whether the money arrived.
 *
 * It is worth being clear about what this is *not*. It is not the redirect
 * being believed: none of the `billplz[...]` parameters the browser carries
 * are read, and a caller who invents a bill id learns nothing. The answer
 * comes from `getBill` and the grant from `settleBill`, exactly as on the
 * callback path. This route only lets an impatient parent trigger that
 * check a few seconds earlier than Billplz's own callback would.
 *
 * The caller must own the bill. `billplzBills/{id}` records which account a
 * bill was created for, and a signed-in parent asking about somebody else's
 * bill gets the same 404 as one asking about a bill that does not exist.
 */
export async function POST(request: Request) {
  const down = billingUnavailable();
  if (down) return down;
  const attested = await requireAppCheck(request);
  if (attested) return attested;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const billId = typeof body.billId === "string" ? body.billId.trim() : "";
  if (!billId || billId.length > 128) return problem(400, "bad-bill");

  const budget = await consume(LIMITS.confirm, caller.uid);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  try {
    const record = await billRecord(billId);
    /* Same answer for "no such bill" and "not yours", so this cannot be
       used to find out which bill ids exist. */
    if (!record || record.uid !== caller.uid) return problem(404, "no-bill");
    if (record.settled) return json({ paid: true });

    const bill = await getBill(billId);
    const settlement = await settleBill(bill);
    return json({ paid: settlement.outcome === "granted" || settlement.outcome === "already" });
  } catch (error) {
    console.error("[billing/billplz/confirm]", error instanceof Error ? error.message : error);
    return problem(error instanceof BillplzError ? 502 : 500, "billplz-error");
  }
}
