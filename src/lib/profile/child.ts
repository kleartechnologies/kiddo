/**
 * The child's name — the only thing KIDDO knows about who is playing.
 *
 * This file is the single source of truth for that name, and it is
 * deliberately the smallest one that can exist. There is no account, no
 * session, no server and no child record: the product's promise to parents is
 * that nothing is collected about their child, and the way to keep a promise
 * like that is to have nowhere to collect anything to.
 *
 * So what is stored is one string, in one key, on one device, written by a
 * grown-up and read by one heading. If real profiles ever arrive, this file is
 * what changes — every screen goes through `useChildName`, so no component
 * needs to know where the answer came from.
 *
 * ## Why a first name and nothing else
 *
 * There is no field for a surname because a field is an invitation. The
 * normaliser below keeps the first word of whatever is typed and throws the
 * rest away, so a grown-up who fills the box in with "Noah Whitfield" has
 * still only ever stored "Noah". A child's screen cannot leak a full name that
 * was never kept.
 */

/**
 * Where the name lives.
 *
 * Namespaced because `localStorage` is shared across everything served from an
 * origin, and versioned because the day this shape changes is the day old
 * values have to be ignorable rather than migrated.
 */
export const CHILD_NAME_KEY = "kiddo.child.name.v1";

/**
 * The longest name we will keep.
 *
 * Long enough for the real ones — Bartholomew is eleven — and short enough
 * that the hero heading cannot be turned into a paragraph by someone pasting
 * a sentence into the box.
 */
export const MAX_CHILD_NAME_LENGTH = 24;

/**
 * Past this, a name only gets the two short greetings.
 *
 * "Yay, Bartholomew is here!" set at the hero's size wraps to three lines on a
 * 360px phone; "Hi, Bartholomew!" does not. The greeting bends around the
 * child rather than the child's name being cut to fit the greeting.
 */
const LONG_NAME = 9;

/** Values that mean "no name" however confidently they arrive as a string. */
const NOT_A_NAME = new Set(["undefined", "null", "nan", "none"]);

/**
 * What a name has to survive to be said out loud.
 *
 * Everything that reaches a screen goes through here, which is why the hero
 * cannot render "Hi, undefined!" — not because the hero checks, but because
 * there is no path by which that string could reach it. Takes `unknown` on
 * purpose: the input is a text box or a stale value out of storage, and
 * neither is really typed.
 *
 * Returns null for anything unusable, and null is the ordinary case — most
 * children playing KIDDO have never had a name typed in for them.
 */
export function normalizeChildName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  /* Control characters first: they are invisible, they survive trimming, and
     a name made only of them would otherwise pass every check below. */
  const cleaned = raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim();
  if (!cleaned) return null;

  /* The first word, and only the first word. See the note at the top. */
  const [first = ""] = cleaned.split(/\s+/);
  if (!first || first.length > MAX_CHILD_NAME_LENGTH) return null;

  /* A name a person could be called: at least one letter in it. Rules out
     "123", "!!!", and an emoji pasted in to see what happens. */
  if (!/\p{L}/u.test(first)) return null;
  if (NOT_A_NAME.has(first.toLowerCase())) return null;

  return first;
}

/** Long enough that only the shortest greetings will fit around it. */
export function isLongChildName(name: string): boolean {
  return name.length > LONG_NAME;
}

/**
 * Read the stored name, or null.
 *
 * Wrapped in a try because `localStorage` is not a guarantee: Safari in
 * private mode, an iframe with storage blocked and a parent who has turned
 * site data off all throw on access rather than returning nothing. None of
 * those is an error worth showing a child — they simply mean KIDDO says
 * "Hi!" instead of "Hi, Noah!".
 */
export function readChildName(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return normalizeChildName(window.localStorage.getItem(CHILD_NAME_KEY));
  } catch {
    return null;
  }
}

/**
 * Store a name, or clear it when there is nothing usable to store.
 *
 * Returns what was actually kept, so the caller can show the grown-up the
 * name KIDDO will really use rather than the one they typed.
 */
export function writeChildName(raw: unknown): string | null {
  const name = normalizeChildName(raw);
  if (typeof window === "undefined") return name;

  try {
    if (name) window.localStorage.setItem(CHILD_NAME_KEY, name);
    else window.localStorage.removeItem(CHILD_NAME_KEY);
  } catch {
    /* Storage refused. The name still works for this render; it just will not
       be there next time, which is the mildest possible failure. */
  }

  return name;
}
