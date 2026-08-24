"use client";

/**
 * One number, held still for as long as the child is here.
 *
 * This is what makes the greeting vary between visits without wobbling
 * during one. `sessionStorage` is the right shape for it almost by
 * definition: per tab, cleared when the tab closes, and survives a reload —
 * so a child who drops the iPad and reopens it is greeted the same way they
 * were a minute ago, and greeted differently tomorrow.
 *
 * It is a seed and nothing else. No name, no id and nothing derived from
 * either goes in here; the number would be exactly as meaningful for a child
 * whose name has never been typed in.
 */

const VISIT_SEED_KEY = "kiddo.visit.seed";

/** How many different visits there are, as far as the greeting is concerned. */
const SEED_RANGE = 10_000;

let cached: number | null = null;

/**
 * The seed for this visit, creating it on the first ask.
 *
 * Zero on the server, where there is no visit yet — harmless, because the one
 * caller only reaches for a seed once it has a name, and a name only exists
 * on the client.
 */
export function visitSeed(): number {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return 0;

  try {
    const stored = Number.parseInt(
      window.sessionStorage.getItem(VISIT_SEED_KEY) ?? "",
      10,
    );

    if (Number.isInteger(stored) && stored >= 0) {
      cached = stored;
      return cached;
    }

    cached = Math.floor(Math.random() * SEED_RANGE);
    window.sessionStorage.setItem(VISIT_SEED_KEY, String(cached));
  } catch {
    /* Storage refused. A seed for this render is still better than none: the
       greeting simply re-picks on the next reload instead of being pinned. */
    cached = Math.floor(Math.random() * SEED_RANGE);
  }

  return cached;
}
