import type { Locale } from "@/lib/i18n/locale";
import { RELATION_WORDS } from "../challenges";
import { HEAD_NOUNS, word } from "./lexicon";

/**
 * Noun phrases, built out of the dictionary.
 *
 * `lexicon` knows words. What a board actually shows is rarely one word: it is
 * *a big blue circle*, *two red squares*, *the circle above the diamond*. Those
 * are not entries anyone could write out — nine shapes times six colours times
 * three sizes is already a hundred and sixty two of them before a relation is
 * added — but they are completely regular, so they are *derived* here instead.
 *
 * ## Malay puts the noun first
 *
 * English stacks its modifiers in front of the noun and Malay hangs them off
 * the back, in the mirror order: *big blue circle* is *bulatan biru besar*, and
 * *little green apple* is *epal hijau kecil*. Reversing the words is not a
 * trick, it is the rule, and it is why a phrase is worth deriving rather than
 * listing: one line here covers every shape the shape packs can deal.
 *
 * ## What it refuses to do
 *
 * `phrase` returns `null` the moment any part of what it was given is a word
 * the dictionary does not know. A half-translated noun phrase — *bulatan puce*
 * — is worse than an untranslated one, because the child cannot read past it
 * and the coverage test cannot see it. Null means "I cannot say this", and the
 * test prints it.
 */

/**
 * How many words a single phrase may be.
 *
 * Long enough for the longest thing a board shows in one breath: *the big
 * blue circle to the right of the little heart* is nine.
 */
const LONGEST = 9;

/**
 * The words that stay in front of the noun instead of moving behind it.
 *
 * Counts, mostly: *dua bulatan*, not *bulatan dua*. `baby` is here for the
 * same reason and not by accident — Malay says a young animal as *anak* plus
 * the animal, so *a baby dog* is *anak anjing*, which is the phrase reversed
 * everywhere except here.
 */
const LEADING: Record<string, string> = {
  a: "",
  an: "",
  the: "",
  one: "satu",
  two: "dua",
  three: "tiga",
  four: "empat",
  five: "lima",
  six: "enam",
  seven: "tujuh",
  eight: "lapan",
  nine: "sembilan",
  ten: "sepuluh",
  baby: "anak",
};

/**
 * A name rather than a word: a single letter, or a number.
 *
 * Neither is in the dictionary and neither needs to be — *C* is *C* in both
 * languages. They are here so that a phrase built around one can still be
 * said: *big O* is *O besar*, because *O* is the thing and *big* describes it.
 */
const NAME = /^(?:[A-Za-z]|\d+)$/;

/** The relation phrases, longest first, so "next to the" beats "to the". */
const RELATIONS: readonly string[] = Object.values(RELATION_WORDS).sort(
  (a, b) => b.length - a.length,
);

/** A bare count: "4", "12" — a number written as digits rather than spelled. */
const DIGITS = /^\d+$/;

/**
 * The count at the front of a phrase, said in Malay, or `undefined`.
 *
 * `LEADING` covers the words — *two circles*, *a baby dog* — but a count
 * reaches this engine as digits at least as often, because the packs count
 * with numbers: *4 dots*, *3 red squares*. A digit is not a dictionary word,
 * so without this it fell through to the reversal branch and came out behind
 * its noun as *titik 4*, which is not Malay for anything. Digits keep their
 * own form — Malay writes 4 as 4 — so the count is simply the digits back.
 */
function leadingCount(first: string): string | undefined {
  if (DIGITS.test(first)) return first;
  return LEADING[first.toLowerCase()];
}

/**
 * One noun phrase, said in `locale`, or `null` if some part of it is unknown.
 *
 * Tried in order: the dictionary as it stands (which is how multi-word entries
 * like *ice cream* and *police officer* win), then with a leading count peeled
 * off, then as a relation with a phrase on either side, then as a stack of
 * modifiers reversed onto its noun.
 */
export function phrase(locale: Locale, english: string): string | null {
  if (locale === "en") return english;
  const text = english.trim();
  if (text.length === 0) return null;

  const known = word(locale, text);
  if (known !== text) return known;

  const words = text.split(/\s+/);
  if (words.length === 1) return noun(locale, text);

  /* "circle above the diamond" — a relation is a whole phrase in the
     dictionary, and what sits either side of it is a noun phrase again.
     Tried before anything is measured, because a scene is the one phrase
     long enough to be two phrases. */
  for (const relation of RELATIONS) {
    const at = text.toLowerCase().indexOf(` ${relation} `);
    if (at < 0) continue;
    const subject = phrase(locale, text.slice(0, at));
    const anchor = phrase(locale, text.slice(at + relation.length + 2));
    if (subject === null || anchor === null) continue;
    return `${subject} ${word(locale, relation)} ${anchor}`;
  }

  /* A category and the name of one of its members — *letter C*, *number 3*.
     The name stays behind the noun in Malay as it does in English.

     The head noun still has to be *in* the dictionary. Without that check the
     branch happily returns `number 3` for Malay, because `word` hands back
     what it was given when it does not know a word — an English word inside a
     string the caller has been told is Malay, which `longestPhrase` would then
     accept as said. Unknown head, no phrase. */
  const head = words[0]!.toLowerCase();
  if (words.length === 2 && HEAD_NOUNS.has(head) && NAME.test(words[1]!)) {
    const said = word(locale, head);
    return said === head ? null : `${said} ${words[1]}`;
  }

  if (words.length > LONGEST) return null;

  /* "two red squares" — the count comes off, the rest is a noun phrase, and
     Malay says the number in front of the noun exactly as English does. */
  const count = leadingCount(words[0]!);
  if (count !== undefined) {
    const rest = phrase(locale, words.slice(1).join(" "));
    if (rest === null) return null;
    return count === "" ? rest : `${count} ${rest}`;
  }

  /* "big blue circle" — every word known, said back to front. */
  const said: string[] = [];
  for (const part of words) {
    const one = NAME.test(part) ? part : noun(locale, part);
    if (one === null) return null;
    said.unshift(one);
  }
  return said.join(" ");
}

/**
 * A single noun, with English's plural taken off first.
 *
 * Malay does not mark a plural on the noun — *dua bulatan*, not *dua bulatans*
 * — so "circles", "boxes" and "puppies" all have to reach the same entry that
 * "circle", "box" and "puppy" reach. A word that is already in the dictionary
 * as a plural (*grapes*, *scissors*, *leaves*) is found before any of this.
 */
function noun(locale: Locale, english: string): string | null {
  const said = word(locale, english);
  if (said !== english) return said;

  const lower = english.toLowerCase();
  const singulars = lower.endsWith("ies")
    ? [`${lower.slice(0, -3)}y`]
    : lower.endsWith("es")
      ? [lower.slice(0, -2), lower.slice(0, -1)]
      : lower.endsWith("s")
        ? [lower.slice(0, -1)]
        : [];
  for (const singular of singulars) {
    const one = word(locale, singular);
    if (one !== singular) return one;
  }
  return null;
}

/**
 * The longest phrase `phrase` can say starting at `words[from]`, or null.
 *
 * This is how a sentence is broken into holes: at every position, take the
 * most words that still make a phrase the dictionary can say. Longest-first
 * matters — *ice cream* must not be read as *ice* followed by *cream*, and
 * *police officer* must not become *polis pegawai*.
 */
export function longestPhrase(
  locale: Locale,
  words: readonly string[],
  from: number,
): { length: number; said: string } | null {
  for (let n = Math.min(LONGEST, words.length - from); n >= 1; n--) {
    const said = phrase(locale, words.slice(from, from + n).join(" "));
    if (said !== null) return { length: n, said };
  }
  return null;
}
