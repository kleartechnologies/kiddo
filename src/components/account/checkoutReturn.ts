"use client";

import { useEffect, useState } from "react";

/**
 * What the `billplz[...]` parameters on a returning URL say about where the
 * parent just came from.
 *
 * Billplz appends `billplz[id]`, `billplz[paid]`, `billplz[paid_at]` and
 * `billplz[x_signature]` to the redirect it sends a parent back on. This
 * reads two of them and treats the answer as a hint about the *journey* —
 * that Billplz sent them back, and which bill it was about — never about
 * *access*. Access comes from what the server wrote after asking Billplz
 * itself; `billplz[paid]=true` is a string in an address bar and anybody can
 * type one.
 *
 * So `paid: true` only ever chooses which reassuring page to draw while the
 * real answer is fetched, and `billId` is only ever handed back to the
 * server to be checked. Nothing here opens KIDDO.
 *
 * The parameters are read once and then removed from the address bar, so a
 * reload, a bookmark or a shared link does not replay them.
 */
export interface CheckoutReturn {
  /** True when Billplz said the bill was paid. A hint, not a permission. */
  paid: boolean;
  /** The bill Billplz named, to ask the server about. */
  billId: string | null;
}

export function useCheckoutReturn(): CheckoutReturn | null {
  const [value, setValue] = useState<CheckoutReturn | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const keys = [...url.searchParams.keys()].filter((key) => /^billplz\[.+\]$/.test(key));
    if (keys.length === 0) return;

    const billId = url.searchParams.get("billplz[id]");
    const paid = url.searchParams.get("billplz[paid]") === "true";
    for (const key of keys) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    /* After the address bar is clean, so a render never sees both. */
    const timer = setTimeout(() => setValue({ paid, billId: billId || null }), 0);
    return () => clearTimeout(timer);
  }, []);
  return value;
}
