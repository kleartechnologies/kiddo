/**
 * The rules that outlive the words.
 *
 * `i18n.test.ts` checks the interface catalogue and `contentI18n.test.ts`
 * deals the whole registry and reads it; between them they already say that
 * KIDDO speaks two languages. This file is narrower and meaner. It holds the
 * handful of invariants that were found by *breaking* — a count that ended up
 * behind its noun, an English head noun escaping inside a string labelled
 * Malay, a placeholder that would have shipped — plus the language-tag matrix
 * spelled out as a table, so the day somebody decides Indonesian is close
 * enough there is a line with their name on it.
 *
 * Nothing here duplicates a sweep. If a test could be written as "and the
 * whole corpus, too", it is in `contentI18n.test.ts` instead.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { drawChallenges, labelOf, spokenOf } from "@/lib/content/challenges";
import { localizeChallenge, localizeText } from "@/lib/content/i18n";
import { HEAD_NOUNS, word } from "@/lib/content/i18n/lexicon";
import { phrase } from "@/lib/content/i18n/phrase";
import { SENTENCES } from "@/lib/content/i18n/phrases";
import { ACTIVITIES } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Challenge, CountItem } from "@/lib/content/types";
import { DEFAULT_LOCALE, isLocale, LOCALES, negotiate } from "@/lib/i18n/locale";
import { ALL_CATALOGUES } from "@/lib/i18n/messages";
import { resolveLocale } from "@/lib/i18n/storage";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/* ------------------------------------------------ which language, exactly -- */

/* 1 ---------------------------------------------------------------------- */
test("every tag a device can send resolves to one language, and Indonesian is not it", () => {
  /* The matrix, written out rather than derived, because the interesting
     entries are the ones a rule would get wrong. `ms` is Bahasa Melayu as
     Malaysia writes it; `id` is Indonesian, which is close enough that a
     similarity check would fold it in and far enough that a Malaysian child
     would hear the difference in the first sentence. KIDDO would rather show
     an Indonesian family English than show them a language that is nearly
     theirs. */
  const matrix: [readonly string[] | undefined, "en" | "ms" | null][] = [
    [["en"], "en"],
    [["en-US"], "en"],
    [["en-GB"], "en"],
    [["ms"], "ms"],
    [["ms-MY"], "ms"],
    [["MS-my"], "ms"],
    [["id"], null],
    [["id-ID"], null],
    [["in"], null], // the pre-1989 code for Indonesian, still sent by old devices
    [["zxx"], null],
    [["not a language tag at all"], null],
    [[""], null],
    [[], null],
    [undefined, null],
  ];

  for (const [tags, expected] of matrix) {
    assert.equal(negotiate(tags), expected, `negotiate(${JSON.stringify(tags)})`);
    assert.equal(
      resolveLocale(null, null, tags),
      expected ?? DEFAULT_LOCALE,
      `resolveLocale(${JSON.stringify(tags)})`,
    );
  }

  /* And the codes themselves stay the standard ones. `bm` is what Malaysians
     call the language in conversation and is not a language tag; renaming the
     locale to it would break every stored preference and every `lang`
     attribute KIDDO writes. */
  assert.deepEqual([...LOCALES], ["en", "ms"]);
  for (const wrong of ["bm", "BM", "my", "ms-MY", "id", "en-US", "", null, undefined, 7]) {
    assert.equal(isLocale(wrong), false, `${String(wrong)} is not a locale`);
  }
});

/* ------------------------------------------------------- counts and names -- */

/* 2 ---------------------------------------------------------------------- */
test("a count in front of a noun stays in front of it, spelled or in digits", () => {
  /* The regression. Malay stacks its modifiers behind the noun, so `phrase`
     reverses the words — and a count is the exception it has to keep in
     front. The exception was written for the *words* (`two circles`), which
     left the digits the packs actually count with falling through to the
     reversal and coming out as `titik 4`: a number where the adjective goes,
     which reads as a label rather than a quantity.
     
     A digit is not a dictionary word, so nothing else in the engine was ever
     going to catch it. */
  assert.equal(phrase("ms", "4 apples"), "4 epal");
  assert.equal(phrase("ms", "1 apple"), "1 epal");
  assert.equal(phrase("ms", "12 grapes"), "12 anggur");
  assert.equal(phrase("ms", "3 red squares"), "3 segi empat sama merah");
  assert.equal(phrase("ms", "10 blue circles"), "10 bulatan biru");

  /* The spelled forms, which always worked, and must go on working. */
  assert.equal(phrase("ms", "two red squares"), "dua segi empat sama merah");
  assert.equal(phrase("ms", "baby dog"), "anak anjing");
  assert.equal(phrase("ms", "a circle"), "bulatan");

  /* The property behind the examples: whatever the count, and whatever the
     noun, the count is the first thing said. Nothing here asserts a
     translation — only where the number went. */
  for (const noun of ["apple", "circle", "star", "red square", "big blue circle"]) {
    for (const count of [1, 2, 3, 4, 5, 9, 10, 11, 20, 100]) {
      const said = phrase("ms", `${count} ${noun}`);
      assert.ok(said !== null, `Malay cannot say "${count} ${noun}"`);
      assert.ok(
        said.startsWith(`${count} `),
        `"${count} ${noun}" came out as "${said}" — the count is not in front`,
      );
      assert.doesNotMatch(said, /\d\s*$/, `"${said}" ends on its count`);
    }
  }

  /* English is not touched by any of it: `phrase` hands English straight
     back, digits and all. */
  for (const english of ["4 apples", "two red squares", "number 3"]) {
    assert.equal(phrase("en", english), english);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a phrase KIDDO cannot say is refused, never returned in English", () => {
  /* `word` hands back what it was given when it does not know a word, which
     is right for a caller that is about to try something else and wrong for
     one that is about to return. The head-noun branch — *letter C*, *number
     3* — was returning, so an unknown head came out as an English word
     inside a string every caller above it treats as Malay, and
     `longestPhrase` accepted it as said.

     `letter` is in the dictionary and `number` is not, which is what made
     this visible; the test is written against the rule rather than against
     that fact, so filling the gap later cannot quietly delete it. */
  for (const head of HEAD_NOUNS) {
    const said = phrase("ms", `${head} 3`);
    const known = word("ms", head) !== head;
    if (known) {
      assert.equal(said, `${word("ms", head)} 3`, `${head} is known and must be said`);
    } else {
      assert.equal(said, null, `"${head} 3" was said in English`);
    }
  }
  assert.equal(phrase("ms", "letter C"), "huruf C");

  /* The general shape of it: nothing `phrase` returns for Malay may contain a
     word that is only an English dictionary key. Names — a letter, a numeral
     — are the exception, because they are the same in both languages. */
  const suspects = ["number 3", "letter C", "4 apples", "big O", "police officer"];
  for (const english of suspects) {
    const said = phrase("ms", english);
    if (said === null) continue;
    for (const part of said.split(/\s+/)) {
      if (/^(?:[A-Za-z]|\d+)$/.test(part)) continue;
      assert.ok(
        word("ms", part.toLowerCase()) === part.toLowerCase(),
        `"${said}" still carries the English word "${part}"`,
      );
    }
  }
});

/* 4 ---------------------------------------------------------------------- */
test("a group of dots is counted without a plural, at every count", () => {
  /* Malay marks no plural on the noun, so one form serves every count and
     *satu titik* through *dua puluh titik* are all `titik`. English needs
     two. `contentI18n.test.ts` reads the dots the packs actually deal; this
     reads the counts they might, because the failure being guarded against —
     deriving the Malay from the English by stripping an `s` — only shows up
     at 1, and 1 is the count a board of dots deals least often. */
  for (let value = 1; value <= 20; value++) {
    const board = counting(value);
    const said = localizeChallenge("ms", board);
    const [before] = board.payload.kind === "choice" ? board.payload.options : [];
    const [after] = said.payload.kind === "choice" ? said.payload.options : [];
    assert.ok(before && after);
    assert.equal(spokenOf(before.item), value === 1 ? "1 dot" : `${value} dots`);
    assert.equal(spokenOf(after.item), `${value} titik`, `${value} dots`);
    assert.equal(labelOf(after.item), labelOf(before.item), "the numeral on the tile moved");
    assert.equal(localizeChallenge("en", board), board, "English is untouched");
  }
});

/** One board of dots, built rather than dealt, so every count can be read. */
function counting(value: number): Challenge {
  const dots: CountItem = { kind: "count", value };
  return {
    id: `test.counting#${value}`,
    packId: "math",
    activityId: "math.counting",
    category: "math",
    activityType: "counting",
    level: 1,
    ageRange: { min: 3, max: 6 },
    prompt: { speech: "How many dots are there?" },
    payload: {
      kind: "choice",
      options: [{ id: "dots", item: dots }],
      answerId: "dots",
    },
  };
}

/* ------------------------------------------------------------- half-done -- */

/* 5 ---------------------------------------------------------------------- */
test("no Malay line is a note to a translator that shipped by accident", () => {
  /* Two catalogues and a sentence book are a lot of hand-written strings, and
     the way they go wrong is not a wrong word — it is a placeholder nobody
     came back to. None of these would fail the type checker, and a child
     would read every one of them out loud.

     The privacy page is the exception that proves it. It carries three
     `TODO(launch)` lines on purpose — the hosting region and the support
     address are not KIDDO's to invent — and they are *English* copy that
     happens to have been translated. So the rule is parity rather than
     absence: a placeholder in Malay is only allowed where English has the
     same one, which is exactly the case where it is an editorial note and
     not an untranslated line. */
  const placeholders = [
    /TODO/i, /FIXME/i, /XXX/, /\bTBD\b/i, /\?\?\?/,
    /\bTRANSLATE\b/i, /\bUNTRANSLATED\b/i, /\{\{/, /\bLorem\b/i,
  ];

  for (const [key, said] of Object.entries(ALL_CATALOGUES.ms)) {
    const english = ALL_CATALOGUES.en[key as keyof typeof ALL_CATALOGUES.en] ?? "";
    for (const pattern of placeholders) {
      if (!pattern.test(said)) continue;
      assert.match(english, pattern, `${key} is a placeholder Malay invented on its own`);
    }
  }

  /* The content layer has no editorial copy in it at all, so there the rule
     is absence. Read the sentences rather than the file: the prose around
     them talks *about* translating, and a test that greps a doc comment is a
     test that punishes writing one. */
  for (const locale of LOCALES) {
    for (const [english, said] of Object.entries(SENTENCES[locale])) {
      for (const pattern of placeholders) {
        assert.doesNotMatch(said, pattern, `the ${locale} book leaves "${english}" unwritten`);
      }
    }
  }

  /* And a blank line — the placeholder that leaves no word to grep for —
     goes the same way. `plan.monthly.note` is empty on purpose in both
     catalogues, because the monthly plan wears no badge; what must never
     happen is Malay being empty where English says something. */
  for (const [key, said] of Object.entries(ALL_CATALOGUES.ms)) {
    const english = ALL_CATALOGUES.en[key as keyof typeof ALL_CATALOGUES.en] ?? "";
    if (english.trim().length === 0) continue;
    assert.ok(said.trim().length > 0, `${key} is said in English and blank in Malay`);
  }
  for (const [english, said] of Object.entries(SENTENCES.ms)) {
    assert.ok(said.trim().length > 0, `the book leaves "${english}" blank`);
  }
});

/* 6 ---------------------------------------------------------------------- */
test("English content is the English it always was, word for word", () => {
  /* §13 of the brief in one assertion: adding a language changed nothing a
     child playing in English ever sees. `contentI18n.test.ts` proves the
     *object* is identical; this proves the *words* are, by taking every
     sentence the packs write and putting it through the layer that would
     translate it. The English pass has to be the identity function, not a
     careful copy of the identity function. */
  const seen = new Set<string>();
  for (const activity of ACTIVITIES) {
    for (const level of activity.levels) {
      for (const challenge of drawChallenges(activity, { level, count: 4, rng: createRng(3) })) {
        for (const sentence of sentencesOf(challenge)) {
          seen.add(sentence);
          assert.equal(localizeText("en", sentence), sentence);
        }
        assert.equal(localizeChallenge("en", challenge), challenge, activity.id);
      }
    }
  }
  assert.ok(seen.size > 500, `only ${seen.size} sentences reached — the sweep stopped`);
});

function sentencesOf(challenge: Challenge): string[] {
  const out: string[] = [];
  for (const part of [challenge.prompt.speech, challenge.prompt.display, challenge.explanation, challenge.hint]) {
    if (typeof part === "string" && part.length > 0) out.push(part);
  }
  return out;
}

/* ------------------------------------------------------------- the fence -- */

/* 7 ---------------------------------------------------------------------- */
test("a language is a set of words, never a way into the content", () => {
  /* The one thing localization must not have bought anybody. The round route
     reads `locale` last, after the token, the subscription and the budget, so
     there is no ordering in which a language string decides whether content
     is dealt — and there is no second route that deals it without them. */
  const route = read("../src/app/api/content/round/route.ts");
  const guard = route.indexOf("hasAccess(state");
  const budget = route.indexOf("consume(LIMITS.content");
  const locale = route.indexOf("body.locale");
  assert.ok(guard > 0 && budget > guard, "the subscription is checked before the budget");
  assert.ok(locale > budget, "the language is read after every check, or it is a bypass");

  /* `dealRound` treats a language it does not speak as English rather than as
     an error, so a bad `locale` can never be a way to make the route refuse a
     round a subscriber paid for. */
  const server = read("../src/server/content.ts");
  assert.match(server, /const said: Locale = isLocale\(locale\) \? locale : DEFAULT_LOCALE;/);

  /* And no route was added to serve the words on their own. A public
     translation endpoint would be the paid corpus with the prices filed off. */
  const routes = read("../src/app/api/content/round/route.ts");
  assert.match(routes, /requireCaller\(request\)/);
});
