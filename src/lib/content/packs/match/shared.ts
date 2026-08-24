import type { Rng } from "../../rng";
import { bigLetter, letterId, littleLetter } from "../english/shared";
import type { ConnectNode } from "../../types";

/**
 * The pieces every match board is built from.
 *
 * ## Why a matching pack, and not more English
 *
 * English already teaches upper and lower case — `letterCaseActivity`, a
 * `choice` question: here is a big A, which of these four is its little one.
 * This pack asks the same thing with a different verb. A choice board hands
 * the child one question and four answers; a match board hands them five
 * questions at once, all of the answers, and no order to work through them
 * in. The child has to *find* rather than *select*, and that is a different
 * thing to be good at.
 *
 * So the pack is the matching strand, not the letters strand: the day it
 * grows a second activity — numerals to quantities, animals to homes — that
 * activity belongs here beside this one, and would look out of place in
 * English. The subject is the correspondence; letters are the first content
 * it is taught with.
 *
 * ## Why the letter cards come from the English pack
 *
 * `bigLetter`, `littleLetter` and `letterId` are imported rather than
 * rewritten. A capital A should be the same card in English Quest and in
 * Match Quest — same glyph, same spoken label, same id scheme where the case
 * is part of the id so `A` and `a` can never collide. Copying five lines here
 * would be a second answer to "how is a letter drawn", and second answers
 * drift. This is a shared primitive, not shared curriculum.
 */

/* ----------------------------------------------------------------- letters */

/**
 * The two letters no board may ever contain.
 *
 * A lower case `l` and a capital `I` are the same vertical stroke. English
 * excludes both from its case questions for exactly this reason, and the
 * reason is stronger here: on a match board every letter is on screen at
 * once, so an `I` and an `L` together give a child two defensible answers and
 * no way to tell which one KIDDO wanted.
 */
export const AMBIGUOUS = ["I", "L"] as const;

/**
 * The letters a four year old has usually met first — the start of the
 * alphabet, the letters in most names, and the ones whose two forms are
 * easiest to hold apart.
 */
const FAMILIAR = ["A", "B", "C", "D", "E", "F", "M", "O", "S", "T"] as const;

/** Familiar, plus the rest of the common consonants and vowels. */
const WIDER = [
  ...FAMILIAR,
  "G",
  "H",
  "K",
  "N",
  "P",
  "R",
  "U",
  "W",
] as const;

/** Every letter there is, less the two above. Twenty-four. */
const FULL = [...WIDER, "J", "Q", "V", "X", "Y", "Z"] as const;

export const LETTER_POOLS = { FAMILIAR, WIDER, FULL } as const;

/** Every correspondence this pack can ever teach. The honest concept count. */
export const TEACHABLE = FULL;

/* ------------------------------------------------------------ confusability */

/**
 * Which two letters are hard to tell apart **from each other**.
 *
 * Not the same question English's lookalike tables answer. Those are about
 * distractors: which wrong tile, standing beside the right one, makes a
 * choice question harder. This is about a whole board — every letter on it is
 * a candidate partner for every other, so what matters is which *pairs*
 * collide, and a `b` and a `d` on the same shelf are a real difficulty
 * whether or not either is anyone's answer.
 *
 * Mostly driven by the lower case forms, because the lower case shelf is the
 * one the child is searching. A few upper case collisions (E/F, O/Q, C/G,
 * P/R) are in as well, since a child who cannot read the question cannot
 * start it.
 */
const CONFUSABLE_PAIRS: readonly string[] = [
  /* Mirrors and rotations of the same bowl-and-stick. The classic four. */
  "B|D",
  "B|P",
  "D|P",
  "P|Q",
  "D|Q",
  /* Tails below the line. */
  "G|Q",
  "G|Y",
  "J|Y",
  /* Round lower case forms. */
  "A|O",
  "C|E",
  "C|O",
  "E|O",
  /* Humps and troughs. */
  "M|N",
  "M|W",
  "N|H",
  "N|U",
  /* Open wedges. */
  "U|V",
  "V|W",
  "V|Y",
  "W|Y",
  /* Odds and ends that still catch a beginner out. */
  "S|Z",
  "K|X",
  "F|T",
  /* Upper case only, but that is enough: the question is unreadable. */
  "E|F",
  "O|Q",
  "C|G",
  "P|R",
];

/** Order-free, so `pairKey("B", "D")` and `pairKey("D", "B")` are one entry. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Normalised on the way in, so the table above can be written in whichever
 * order reads best — `"N|H"` beside the other humps — without a lookup for
 * `H` and `N` quietly missing it. Alphabetising the literal by hand would
 * work exactly until the next line is added the other way round.
 */
const CONFUSABLE = new Set(
  CONFUSABLE_PAIRS.map((key) => {
    const [a, b] = key.split("|") as [string, string];
    return pairKey(a, b);
  }),
);

export function confusable(a: string, b: string): boolean {
  return CONFUSABLE.has(pairKey(a, b));
}

/** How many confusable pairs a board of these letters contains. */
export function confusions(letters: readonly string[]): number {
  let total = 0;
  for (let i = 0; i < letters.length; i += 1) {
    for (let j = i + 1; j < letters.length; j += 1) {
      if (confusable(letters[i], letters[j])) total += 1;
    }
  }
  return total;
}

/** Every confusable pair whose letters both live in this pool. */
export function confusablePairsWithin(
  pool: readonly string[],
): readonly (readonly [string, string])[] {
  const inPool = new Set(pool);
  return [...CONFUSABLE]
    .map((key) => key.split("|") as [string, string])
    .filter(([a, b]) => inPool.has(a) && inPool.has(b));
}

/* -------------------------------------------------------------- the board */

/**
 * Choose the letters for one board.
 *
 * Greedy over a shuffled pool, refusing any letter that would push the board
 * past its allowance of confusable pairs. One pass, so it always terminates,
 * and seeded, so it always terminates the same way.
 *
 * `seed` is a pair the board must contain — how a hard level is made hard on
 * purpose rather than by luck. It is counted against the allowance like any
 * other collision.
 */
export function pickLetters(
  rng: Rng,
  pool: readonly string[],
  count: number,
  allowance: number,
  seed: readonly string[] = [],
): string[] {
  const picked: string[] = [...seed].slice(0, count);
  let used = confusions(picked);

  for (const letter of rng.shuffle(pool)) {
    if (picked.length >= count) break;
    if (picked.includes(letter)) continue;

    const added = picked.filter((other) => confusable(letter, other)).length;
    if (used + added > allowance) continue;

    picked.push(letter);
    used += added;
  }

  /* Only reachable if a pool ran out of letters that fit the allowance, which
     the pack's own test proves never happens at any authored level. Topping
     up rather than returning a short board, because a board with too few
     pairs is broken and a board one collision over budget is merely harder. */
  for (const letter of rng.shuffle(pool)) {
    if (picked.length >= count) break;
    if (!picked.includes(letter)) picked.push(letter);
  }

  return picked;
}

/**
 * The order the little letters are laid out in.
 *
 * A shuffle is not enough. Two independent shuffles line up by chance often
 * enough to matter — one board in six at three pairs — and a board where the
 * partners happen to face each other is a board the child can finish without
 * once looking at a letter. So the right hand shelf is *deranged*: no
 * position may hold the partner of the card facing it, ever.
 */
export function displace<T>(rng: Rng, left: readonly T[]): T[] {
  if (left.length < 2) return [...left];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(left);
    if (order.every((entry, index) => entry !== left[index])) return order;
  }

  /* A rotation by one displaces every position, whatever the length. */
  return [...left.slice(1), left[0]];
}

/**
 * Choose a set of things no two of which collide, greedily.
 *
 * The shape `pickLetters` has, with the letter-specific parts lifted out: a
 * pool, how many to take, how many collisions the level tolerates, an
 * optional pair planted on purpose, and a predicate saying which two things
 * collide at all. Quantities collide when they are one apart and words when
 * they mean nearly the same thing, and neither of those is a fact about
 * letters — but *how many collisions a level allows* is the same idea in all
 * three, and it is the thing that makes a hard board hard on purpose rather
 * than by luck.
 *
 * Seeded, and bounded at eight attempts, so it always terminates and always
 * terminates the same way. A greedy walk can paint itself into a corner — take
 * 2 first, from the numbers one to five, and there is no clean board left —
 * so it starts over rather than settling, and only tops a board up if eight
 * shuffles all failed. That is a pool with no board in it at all, which the
 * pack's test proves does not happen at any authored level.
 */
export function pickWithout<T>(
  rng: Rng,
  pool: readonly T[],
  count: number,
  allowance: number,
  collides: (a: T, b: T) => boolean,
  seed: readonly T[] = [],
): T[] {
  let best: T[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: T[] = [...seed].slice(0, count);
    let used = 0;
    for (let i = 0; i < picked.length; i += 1) {
      for (let j = i + 1; j < picked.length; j += 1) {
        if (collides(picked[i], picked[j])) used += 1;
      }
    }

    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (picked.includes(candidate)) continue;

      const added = picked.filter((other) => collides(candidate, other)).length;
      if (used + added > allowance) continue;

      picked.push(candidate);
      used += added;
    }

    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  /* Only reachable when a pool this small has no set of this size that fits
     the allowance at all, which the pack's own test proves does not happen at
     any authored level. Topping up with whatever collides least, rather than
     handing back a short board: a board one collision over budget is merely
     harder, and a board with too few pairs cannot be finished. */
  const topped = [...best];
  for (const candidate of rng.shuffle(pool)) {
    if (topped.length >= count) break;
    if (topped.includes(candidate)) continue;
    topped.push(candidate);
  }

  return topped;
}

/** The upper case shelf: one card per letter, in the order given. */
export function bigCards(letters: readonly string[]): ConnectNode[] {
  return letters.map((letter) => ({
    id: letterId(letter.toUpperCase()),
    item: bigLetter(letter),
  }));
}

/** The lower case shelf. Ids carry the case, so no card can collide. */
export function littleCards(letters: readonly string[]): ConnectNode[] {
  return letters.map((letter) => ({
    id: letterId(letter.toLowerCase()),
    item: littleLetter(letter),
  }));
}

/* --------------------------------------------------------------- concepts */

/**
 * The name of the idea behind a board, as a `meta` tag.
 *
 * Same rule as Logic's and Shapes': a concept is what the child has to know,
 * never the board it was drawn on. Here the concept names the *set* of
 * correspondences a board practises, sorted — so the same five letters dealt
 * to different shelves, in a different order, under a different one of
 * KIDDO's lines, is one concept and a session will only ever offer it once.
 *
 * What this is deliberately **not** is a way of counting. There are twenty
 * four correspondences in this pack and forty thousand five-letter sets of
 * them; the sets are boards, and calling them concepts would multiply the
 * pack's total by a number that means nothing to a child. The pack's test
 * counts the correspondences.
 */
export function concept(...parts: readonly (string | number)[]): string {
  return `concept:${parts.join(":")}`;
}

/** A set of things, named the same way however it was shuffled. */
export function canonical(values: readonly (string | number)[]): string {
  return [...values].map(String).sort().join("+");
}
