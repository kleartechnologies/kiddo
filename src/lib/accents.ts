import type { Accent } from "@/lib/games/types";

/**
 * Accent -> Tailwind classes.
 *
 * Written out in full rather than composed as `bg-${accent}-soft`, because
 * Tailwind only ships classes it can find as literal strings in the source.
 *
 * Every hue is a pastel, so text on `base` is always ink. White on these
 * fills would fail contrast and read as cheap.
 */
interface AccentClasses {
  /** Pale tint, for illustration beds and chips. */
  bgSoft: string;
  /** The character's own hex. Used for filled buttons and badges. */
  bgBase: string;
  /** Pressed / bottom-edge colour. */
  bgDeep: string;
  /** Readable text colour on `bgSoft`. */
  text: string;
  /** Text on `bgBase`. Always ink, always checked for contrast. */
  textOnBase: string;
  border: string;
  /** Solid bottom edge that gives buttons their tactile "toy" feel. */
  shadowDeep: string;
  fill: string;
  /** The twin of `fill`, for shape outlines drawn in the same hue. */
  stroke: string;
}

/**
 * Accent -> the colour a child would call it.
 *
 * Brand names are for us. "Which one is tide?" is not a question anyone can
 * answer, so anything that has to *say* a colour — a screen reader label, a
 * caption, KIDDO naming the answer out loud — says one of these instead.
 *
 * `sage` and `sprout` both come out GREEN, because they both are. Content
 * that turns on telling colours apart must therefore never offer both; the
 * Discovery colours activity and the Logic pack each say so where they pick.
 */
export const ACCENT_WORDS: Record<Accent, string> = {
  sage: "GREEN",
  apricot: "ORANGE",
  blossom: "PINK",
  sprout: "GREEN",
  tide: "BLUE",
  honey: "YELLOW",
};

/**
 * The pairs of accents a child can actually be asked to tell apart.
 *
 * `ACCENT_WORDS` says which colours have names. This says which two of them
 * look different to *everyone* — and it is a much shorter list, because the
 * KIDDO palette was chosen to sit together prettily rather than to be pulled
 * apart.
 *
 * Simulating protanopia, deuteranopia and tritanopia across the palette and
 * measuring what distance is left in CIE Lab, half of the named pairs
 * collapse:
 *
 * - honey / sprout    5.5   yellow and green, gone under protanopia
 * - apricot / sprout  5.8   orange and green, gone under both red-green types
 * - blossom / apricot 9.8   pink and orange, gone under tritanopia
 * - honey / apricot  10.5   yellow and orange, nearly gone under either
 * - blossom / honey  11.1   pink and yellow, gone under tritanopia
 *
 * The five below all keep at least 25, which is a difference anyone can see.
 * `sage` appears in none of them: it and `sprout` are both GREEN, so no
 * question can be asked with both, and every board that needs a green picks
 * `sprout`.
 *
 * A board is not a fair question if the answer is invisible to the child
 * holding it, and "look harder" is not an answer to that. Any content whose
 * answer rests on colour alone must be built from this list — Logic's
 * odd-one-out and every colour rule in Shapes & Colours are, and their tests
 * check it rather than trusting it.
 */
export const TELLABLE_PAIRS: readonly (readonly [Accent, Accent])[] = [
  ["tide", "apricot"],
  ["tide", "honey"],
  ["tide", "blossom"],
  ["tide", "sprout"],
  ["blossom", "sprout"],
];

/** Could a child tell these two apart? Order does not matter. */
export function isTellableApart(a: Accent, b: Accent): boolean {
  return TELLABLE_PAIRS.some(
    ([left, right]) =>
      (left === a && right === b) || (left === b && right === a),
  );
}

/**
 * Every accent that can safely stand beside this one on a colour board.
 *
 * The distractor list for "which one is blue?", written once. Blue has four
 * partners and yellow has one, which is exactly why a generator has to ask
 * rather than assume.
 */
export function tellableFrom(accent: Accent): readonly Accent[] {
  return TELLABLE_PAIRS.flatMap(([left, right]) =>
    left === accent ? [right] : right === accent ? [left] : [],
  );
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  sage: {
    bgSoft: "bg-sage-soft",
    bgBase: "bg-sage-base",
    bgDeep: "bg-sage-deep",
    text: "text-sage-ink",
    textOnBase: "text-ink-900",
    border: "border-sage-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-sage-deep)]",
    fill: "fill-sage-base",
    stroke: "stroke-sage-base",
  },
  apricot: {
    bgSoft: "bg-apricot-soft",
    bgBase: "bg-apricot-base",
    bgDeep: "bg-apricot-deep",
    text: "text-apricot-ink",
    textOnBase: "text-ink-900",
    border: "border-apricot-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-apricot-deep)]",
    fill: "fill-apricot-base",
    stroke: "stroke-apricot-base",
  },
  blossom: {
    bgSoft: "bg-blossom-soft",
    bgBase: "bg-blossom-base",
    bgDeep: "bg-blossom-deep",
    text: "text-blossom-ink",
    textOnBase: "text-ink-900",
    border: "border-blossom-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-blossom-deep)]",
    fill: "fill-blossom-base",
    stroke: "stroke-blossom-base",
  },
  sprout: {
    bgSoft: "bg-sprout-soft",
    bgBase: "bg-sprout-base",
    bgDeep: "bg-sprout-deep",
    text: "text-sprout-ink",
    textOnBase: "text-ink-900",
    border: "border-sprout-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-sprout-deep)]",
    fill: "fill-sprout-base",
    stroke: "stroke-sprout-base",
  },
  tide: {
    bgSoft: "bg-tide-soft",
    bgBase: "bg-tide-base",
    bgDeep: "bg-tide-deep",
    text: "text-tide-ink",
    textOnBase: "text-ink-900",
    border: "border-tide-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-tide-deep)]",
    fill: "fill-tide-base",
    stroke: "stroke-tide-base",
  },
  honey: {
    bgSoft: "bg-honey-soft",
    bgBase: "bg-honey-base",
    bgDeep: "bg-honey-deep",
    text: "text-honey-ink",
    textOnBase: "text-ink-900",
    border: "border-honey-base/40",
    shadowDeep: "shadow-[0_5px_0_0_var(--color-honey-deep)]",
    fill: "fill-honey-base",
    stroke: "stroke-honey-base",
  },
};

/** CSS custom-property names, for places that need a raw colour value. */
export const ACCENT_VARS: Record<
  Accent,
  { base: string; deep: string; soft: string }
> = {
  sage: {
    base: "var(--color-sage-base)",
    deep: "var(--color-sage-deep)",
    soft: "var(--color-sage-soft)",
  },
  apricot: {
    base: "var(--color-apricot-base)",
    deep: "var(--color-apricot-deep)",
    soft: "var(--color-apricot-soft)",
  },
  blossom: {
    base: "var(--color-blossom-base)",
    deep: "var(--color-blossom-deep)",
    soft: "var(--color-blossom-soft)",
  },
  sprout: {
    base: "var(--color-sprout-base)",
    deep: "var(--color-sprout-deep)",
    soft: "var(--color-sprout-soft)",
  },
  tide: {
    base: "var(--color-tide-base)",
    deep: "var(--color-tide-deep)",
    soft: "var(--color-tide-soft)",
  },
  honey: {
    base: "var(--color-honey-base)",
    deep: "var(--color-honey-deep)",
    soft: "var(--color-honey-soft)",
  },
};
