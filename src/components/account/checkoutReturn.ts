"use client";

import { useEffect, useState } from "react";

/**
 * What `?checkout=` on /parents says about where the parent just came from.
 * It is a hint about the *journey* (Stripe sent them back), never about
 * *access* — access comes from the subscription the server wrote. The
 * parameter is read once and then removed from the address bar, so a
 * reload or a bookmark does not replay it.
 */
export type CheckoutReturn = "success" | "cancelled" | null;

export function useCheckoutReturn(): CheckoutReturn {
  const [value, setValue] = useState<CheckoutReturn>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("checkout");
    if (raw !== "success" && raw !== "cancelled") return;
    url.searchParams.delete("checkout");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    /* After the address bar is clean, so a render never sees both. */
    const timer = setTimeout(() => setValue(raw), 0);
    return () => clearTimeout(timer);
  }, []);
  return value;
}
