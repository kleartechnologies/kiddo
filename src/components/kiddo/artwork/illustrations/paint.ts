/**
 * The colours an illustration is allowed to be drawn in.
 *
 * Every one of them is a token out of `globals.css`, reached by name rather
 * than by hex, so an illustration cannot drift from the rest of the product and
 * a palette change reaches the whole library at once. There is no brown, no
 * grey and no red in KIDDO, and there is none in here: a tree trunk is
 * `wood` — which is apricot-deep — and a wrong answer is never scarlet.
 *
 * The list is short on purpose. A drawing built from four flat fills reads at
 * 48px on a phone; one built from twelve does not, and the tile is the size the
 * child actually meets. Nothing here is a gradient, and nothing here is a
 * stroke around the outside — KIDDO's characters are drawn as flat shapes with
 * ink only for features, and the objects beside them follow the same rule so
 * that a cow and KIDDO look like they came out of the same box.
 */
export const PAINT = {
  /* Faces, features, the one near-black in the product. */
  ink: "var(--color-ink-900)",
  inkSoft: "var(--color-ink-700)",
  /* The grey a mouse and a cat are, so neither has to be a hue. */
  stone: "var(--color-ink-300)",

  paper: "var(--color-paper)",
  cream: "var(--color-cream-100)",
  edge: "var(--color-edge)",

  green: "var(--color-sprout-base)",
  greenSoft: "var(--color-sprout-soft)",
  greenDeep: "var(--color-sprout-deep)",
  blue: "var(--color-tide-base)",
  blueDeep: "var(--color-tide-deep)",
  blueSoft: "var(--color-tide-soft)",
  pink: "var(--color-blossom-base)",
  pinkDeep: "var(--color-blossom-deep)",
  pinkSoft: "var(--color-blossom-soft)",
  orange: "var(--color-apricot-base)",
  /* Trunks, barns, anything a child would call brown. */
  wood: "var(--color-apricot-deep)",
  yellow: "var(--color-honey-base)",
  yellowDeep: "var(--color-honey-deep)",
  yellowSoft: "var(--color-honey-soft)",
  sage: "var(--color-sage-base)",

  /** Cheeks only, and only at low opacity. The character rule, kept. */
  blush: "var(--color-blush)",
} as const;
