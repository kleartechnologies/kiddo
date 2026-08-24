import type { ArtId } from "./art";

/**
 * The KIDDO word vocabulary — which words have a picture, and which words are
 * never used as examples at all.
 *
 * ## One table, every English activity
 *
 * Three activities show a child a word and ask about its letters — spelling,
 * beginning sounds, ending sounds — and until this phase all three showed the
 * word *bare*: `S _ N` and nothing else on the stage. A four year old who
 * cannot read yet was being asked to finish a word they had no way to see the
 * meaning of. The fix is `Prompt.anchor` (see `types.ts`), and the anchor for
 * a word comes from here, so DOG is the same dog whichever activity asks
 * about it and a word gains a picture in one line, once, for all of them.
 *
 * The shape follows `art.ts` exactly: the glyph is the floor, the drawing is
 * a promotion. A word this table does not know simply has no anchor, which is
 * precisely what every word had before — nothing breaks when a pack teaches a
 * word nobody has picked a picture for.
 *
 * Nothing here is abstract on purpose. FUN, BIG and YES have no entry because
 * an honest picture of them does not exist, and a decorative one would be
 * noise (`docs/kiddo-visual-system.md` §17: do not over-decorate).
 *
 * ## The barred words
 *
 * KIDDO's home is Malaysia, and its market is Southeast Asia. A pig is not a
 * picture or a word to hand a child there as a default teaching example, so
 * the pig family is barred outright — not filtered at render time, but kept
 * out of every content table, which `tests/safety.test.ts` proves by dealing
 * every activity at every level across hundreds of seeds and reading every
 * word the child could see or hear. The list is here rather than in the test
 * so that the rule is content the packs can read, not a trap they find later.
 */

export interface WordPicture {
  /** The emoji floor. Ships with every device, scales, already localised. */
  glyph: string;
  /** The KIDDO drawing, where the library has one. */
  art?: ArtId;
}

/**
 * Words a child is shown, and what they look like.
 *
 * Keys are uppercase because that is how every English pack spells its words.
 * Curated, not generated: every glyph was chosen so the picture is the word —
 * a JET is a plane in the air, a POT is a pot on a stove — and anything that
 * needed a caveat did not go in.
 */
export const WORD_PICTURES: Readonly<Record<string, WordPicture>> = {
  /* Animals. */
  CAT: { glyph: "🐱", art: "animal.cat" },
  DOG: { glyph: "🐶", art: "animal.dog" },
  HEN: { glyph: "🐔", art: "animal.chicken" },
  FOX: { glyph: "🦊", art: "animal.fox" },
  ANT: { glyph: "🐜" },
  BEE: { glyph: "🐝", art: "animal.bee" },
  FISH: { glyph: "🐟", art: "animal.fish" },
  FROG: { glyph: "🐸", art: "animal.frog" },
  DUCK: { glyph: "🦆", art: "animal.duck" },
  BIRD: { glyph: "🐦", art: "animal.bird" },
  CRAB: { glyph: "🦀" },
  SNAKE: { glyph: "🐍", art: "animal.snake" },
  MOUSE: { glyph: "🐭", art: "animal.mouse" },
  SHEEP: { glyph: "🐑", art: "animal.sheep" },
  COW: { glyph: "🐮", art: "animal.cow" },
  BEAR: { glyph: "🐻" },
  LION: { glyph: "🦁" },
  WHALE: { glyph: "🐳" },
  SEAL: { glyph: "🦭" },
  SNAIL: { glyph: "🐌" },
  OWL: { glyph: "🦉" },

  /* Sky and garden. */
  SUN: { glyph: "☀️", art: "nature.sun" },
  MOON: { glyph: "🌙" },
  STAR: { glyph: "⭐", art: "nature.star" },
  TREE: { glyph: "🌳", art: "nature.tree" },
  RAIN: { glyph: "🌧️" },
  LEAF: { glyph: "🍃" },

  /* Food. */
  EGG: { glyph: "🥚", art: "food.egg" },
  JAM: { glyph: "🍓" },
  CAKE: { glyph: "🍰", art: "food.cake" },
  MILK: { glyph: "🥛" },
  CORN: { glyph: "🌽" },
  RICE: { glyph: "🍚" },

  /* Things a child can point at. */
  BUS: { glyph: "🚌" },
  JET: { glyph: "✈️" },
  VAN: { glyph: "🚐" },
  CAR: { glyph: "🚗", art: "object.car" },
  BOAT: { glyph: "⛵" },
  TRAIN: { glyph: "🚂" },
  CUP: { glyph: "☕" },
  POT: { glyph: "🍲" },
  MAP: { glyph: "🗺️" },
  WEB: { glyph: "🕸️" },
  BOX: { glyph: "📦", art: "object.box" },
  BED: { glyph: "🛏️" },
  HAT: { glyph: "🎩", art: "object.hat" },
  BALL: { glyph: "⚽", art: "object.ball" },
  BOOK: { glyph: "📖" },
  BAG: { glyph: "👜" },
  FLAG: { glyph: "🚩" },
  DRUM: { glyph: "🥁" },
  SOCK: { glyph: "🧦" },
  CLOCK: { glyph: "🕐" },
  KITE: { glyph: "🪁" },
  RING: { glyph: "💍" },
  KEY: { glyph: "🔑" },
  PEN: { glyph: "🖊️" },
  NET: { glyph: "🥅" },
  HOUSE: { glyph: "🏠", art: "place.house" },
  DOOR: { glyph: "🚪" },
  WHEEL: { glyph: "🛞" },
  SPOON: { glyph: "🥄" },
  CROWN: { glyph: "👑" },

  /* The body. */
  LEG: { glyph: "🦵" },
  HAND: { glyph: "✋" },
  FEET: { glyph: "🦶" },
  EYE: { glyph: "👁️" },
} as const;

/** The picture for a word, or nothing — and nothing costs nothing. */
export function wordPicture(word: string): WordPicture | undefined {
  return WORD_PICTURES[word.toUpperCase()];
}

/**
 * Words that must never appear as teaching examples, anywhere, at any level.
 *
 * Checked as whole words, case-insensitively, against everything a challenge
 * can show or say. HAMSTER is fine; HAM is not.
 */
export const BARRED_WORDS: readonly string[] = [
  "pig",
  "pigs",
  "piglet",
  "piglets",
  "oink",
  "pork",
  "bacon",
  "ham",
];

const BARRED_PATTERN = new RegExp(
  `\\b(?:${BARRED_WORDS.join("|")})\\b`,
  "i",
);

/** Whether a piece of child-facing text contains a barred word. */
export function hasBarredWord(text: string): boolean {
  return BARRED_PATTERN.test(text);
}
