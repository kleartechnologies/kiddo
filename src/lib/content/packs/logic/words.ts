/**
 * The word groups Logic sorts and compares things by.
 *
 * Two activities need them — "which one is different?" and "which one is an
 * animal?" are the same knowledge asked from opposite ends — so they are
 * written once, here, and the rule engines read them.
 *
 * Three authoring rules hold the whole file up, and every one of them exists
 * to keep a question from having two right answers:
 *
 * 1. **A group is tight enough that any three of its members are alike.**
 *    That is why `animals` is fifteen mammals and not a bee, an owl and a
 *    tiger — with a bee on the board, "which one is different?" has an honest
 *    second answer that is not the one the rule intended.
 * 2. **No word is in two groups.** Checked by a test, not by hope.
 * 3. **Groups that overlap in meaning may never share a board.** There is
 *    exactly one such pair today and it is written out below with its reason.
 *
 * Every word is five letters or fewer, which is what fits a tile on the
 * narrowest phone, and every one of them is a word a five year old owns.
 */

export interface WordGroup {
  id: string;
  /** Completes "Which one is ...?" — "an animal". */
  asks: string;
  /** Completes "The others are all ...", plural — "animals". */
  all: string;
  /** Completes "A DOG is ..." — "an animal". */
  one: string;
  /**
   * The group's name as a single word, for boards that put it on a tile.
   *
   * `all` is the truthful name and it is often a phrase — "things that go",
   * "things you wear" — which reads as a sentence rather than a label on a
   * 96px tile. Where a group has an honest one-word name a child can read, it
   * is written here; where it does not, the group is simply not dealt to a
   * board that needs one. `vehicles` is the only such group today: CARS would
   * fit and would be a lie, because a bus is not a car.
   */
  tile?: string;
  /** The words themselves. Any three of them are alike. */
  words: readonly string[];
}

export const WORD_GROUPS: readonly WordGroup[] = [
  {
    id: "animals",
    tile: "ANIMALS",
    asks: "an animal",
    all: "animals",
    one: "an animal",
    /* Mammals only. A bird or an insect among them would be a second odd one
       out, and the child would be right and the answer key would be wrong. */
    words: [
      "DOG", "CAT", "FOX", "LION", "BEAR", "WOLF", "TIGER", "ZEBRA",
      "PANDA", "HORSE", "MOUSE", "GOAT", "SHEEP", "COW", "DEER",
    ],
  },
  {
    id: "fruit",
    tile: "FRUIT",
    asks: "a fruit",
    all: "fruit",
    one: "a fruit",
    words: ["APPLE", "PEAR", "PLUM", "GRAPE", "LEMON", "MANGO", "PEACH", "BERRY"],
  },
  {
    id: "food",
    tile: "FOOD",
    asks: "something to eat",
    all: "things to eat",
    one: "something to eat",
    words: ["CAKE", "BREAD", "RICE", "SOUP", "JAM", "EGG", "CORN", "HONEY"],
  },
  {
    id: "vehicles",
    asks: "something that goes",
    all: "things that go",
    one: "something that goes",
    words: ["BUS", "CAR", "VAN", "JEEP", "TRUCK", "BIKE", "TRAM", "TRAIN"],
  },
  {
    id: "toys",
    tile: "TOYS",
    asks: "a toy",
    all: "toys",
    one: "a toy",
    words: ["BALL", "DOLL", "DRUM", "KITE", "BLOCK", "ROBOT"],
  },
  {
    id: "clothes",
    tile: "CLOTHES",
    asks: "something you wear",
    all: "things you wear",
    one: "something you wear",
    words: ["HAT", "SOCK", "COAT", "SHOE", "SHIRT", "DRESS", "SCARF", "GLOVE"],
  },
];

/**
 * Groups that may never share a board, and why.
 *
 * An apple is a fruit *and* something to eat, so a board of CAKE, BREAD, SOUP
 * and APPLE has two defensible answers to "which one is different?" and none
 * at all to "which one is something to eat?". Every other pair below is
 * genuinely disjoint: nothing you wear is a toy, nothing that goes is an
 * animal, and a doll is not a mammal.
 */
const NEVER_TOGETHER: readonly (readonly [string, string])[] = [
  ["fruit", "food"],
];

export function canMix(a: WordGroup, b: WordGroup): boolean {
  if (a.id === b.id) return false;
  return !NEVER_TOGETHER.some(
    ([one, other]) =>
      (one === a.id && other === b.id) || (one === b.id && other === a.id),
  );
}

/** Every group this one is allowed to appear beside. */
export function groupsBeside(group: WordGroup): WordGroup[] {
  return WORD_GROUPS.filter((other) => canMix(group, other));
}

/** Every group with a one-word name, and so every group a tile can hold. */
export function nameableGroups(): WordGroup[] {
  return WORD_GROUPS.filter((group) => group.tile !== undefined);
}
