import { hasAccess, LIFETIME_AMOUNT } from "@/lib/billing/access";
import { requireAppCheck } from "@/server/appCheck";
import { BillplzError, createBill } from "@/server/billplz";
import { entitlementOf, recordBill } from "@/server/entitlement";
import { billingUnavailable, json, problem, readJson, requireCaller, safePath, siteUrl, tooMany } from "@/server/http";
import { consume, LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/billplz/create  { returnTo?: string }
 * → { url }  a Billplz bill for the signed-in parent to pay.
 *
 * There is one thing to buy and one price, so the browser sends no plan and
 * no amount — it could not be trusted with either. The amount is
 * `LIFETIME_AMOUNT` from this server's own code, the email comes from the
 * verified ID token, and the account the bill belongs to is written into
 * `billplzBills/{id}` before the URL is handed back.
 *
 * Reaching the paid page grants nothing. Access appears when the callback
 * (or the parent's own `confirm` call) has asked Billplz whether the money
 * arrived and `settleBill` has written `users/{uid}.access.lifetime`.
 */

/** What Billplz prints on the bill. It insists on a non-blank name. */
const DESCRIPTION = "KIDDO Lifetime Access";

export async function POST(request: Request) {
  const down = billingUnavailable();
  if (down) return down;
  const attested = await requireAppCheck(request);
  if (attested) return attested;
  const caller = await requireCaller(request);
  if (caller instanceof Response) return caller;
  if (!caller.email) return problem(400, "no-email");

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const returnTo = safePath(body.returnTo, "/welcome");

  /* Keyed on the verified uid, not the IP: this is where a signed-in caller
     could otherwise make Billplz create bills all day. It sits after the
     token check so an unauthenticated flood never reaches it. */
  const budget = await consume(LIMITS.checkout, caller.uid);
  if (!budget.allowed) return tooMany(budget.retryAfterS);

  const base = siteUrl(request);
  if (!base) return problem(503, "site-url-not-configured");

  try {
    /* Sold once, so it can only be bought once. A parent who already owns
       KIDDO — however they came by it — is told so rather than charged
       again. */
    const entitlement = await entitlementOf(caller.uid);
    if (hasAccess(entitlement, Date.now())) return problem(409, "already-owned");

    const bill = await createBill({
      name: nameFor(caller.email),
      email: caller.email,
      amount: LIFETIME_AMOUNT,
      description: DESCRIPTION,
      callbackUrl: `${base}/api/billing/billplz/callback`,
      redirectUrl: `${base}${returnTo}`,
      uid: caller.uid,
    });
    if (!bill.id || !bill.url) return problem(502, "billplz-no-url");

    /* Before the URL leaves this function, and deliberately fatal if it
       fails: an unpaid bill nobody was sent to is harmless, whereas a paid
       bill with no recorded owner is a support ticket. */
    await recordBill(bill.id, {
      uid: caller.uid,
      email: caller.email,
      amount: LIFETIME_AMOUNT,
      createdAt: Date.now(),
    });

    return json({ url: bill.url, billId: bill.id });
  } catch (error) {
    console.error("[billing/billplz/create]", error instanceof Error ? error.message : error);
    return problem(error instanceof BillplzError ? 502 : 500, "billplz-error");
  }
}

/**
 * Billplz requires a payer name and KIDDO never asks for one — a parent
 * gives an email address and a child's first name, and the child's name is
 * not going on a receipt. The local part of the address is the closest
 * honest answer; anything unusable falls back to the product's own name.
 */
function nameFor(email: string): string {
  const local = email.split("@")[0]?.replace(/[^\p{L}\p{N} .'-]/gu, " ").trim() ?? "";
  return local.length >= 2 ? local.slice(0, 60) : "KIDDO";
}
