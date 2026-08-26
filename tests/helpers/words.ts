import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { ALL_CATALOGUES, type MessageKey } from "@/lib/i18n/messages";

/**
 * The words KIDDO never says to a four year old — in every language it
 * speaks.
 *
 * These promises used to be kept by grepping a component for the English
 * sentence it held. The sentences now live in the catalogues, so a grep of
 * the component would pass forever without reading a single word a child
 * hears. Worse, it would say nothing at all about the Malay half of the
 * product: a game could cheer in English and scold in Malay and every test
 * would stay green. So the promise moved to where the words are, and it is
 * now kept twice.
 *
 * Each list is what *that* language would use to tell a child they are no
 * good, not a translation of the other. English "no," is unkind at the start
 * of an answer; Malay *bukan* is the ordinary way to say "not this one" and
 * is not on the list. What is on the Malay list is *salah* — the flat verdict
 * "wrong" a Malaysian school report uses — along with *gagal*, *teruk*,
 * *bodoh* and *lemah*.
 */
export const NEVER_SAID: Readonly<Record<Locale, readonly RegExp[]>> = {
  en: [
    /\bwrong\b/i,
    /\bincorrect\b/i,
    /\bfailed?\b/i,
    /\bfailure\b/i,
    /\bbad\b/i,
    /\boops\b/i,
    /\bno good\b/i,
    /\btry harder\b/i,
    /\bnope\b/i,
    /\bsorry\b/i,
    /\bno,/i,
  ],
  ms: [
    /\bsalah\b/i,
    /\bgagal\b/i,
    /\bteruk\b/i,
    /\bbodoh\b/i,
    /\blemah\b/i,
    /\bdungu\b/i,
    /\btak pandai\b/i,
    /\bmaaf,/i,
  ],
};

/** One line KIDDO says, and which language it says it in. */
export interface Said {
  locale: Locale;
  key: MessageKey;
  line: string;
}

/**
 * Every line under any of these key prefixes, in every language.
 *
 * A test names the part of the product it is speaking for — `"quest."`,
 * `"game.logic-quest."` — and gets back the sentences a child would actually
 * hear there, both catalogues at once.
 */
export function saidUnder(...prefixes: readonly string[]): Said[] {
  const out: Said[] = [];
  for (const locale of LOCALES) {
    const words = ALL_CATALOGUES[locale];
    for (const key of Object.keys(words) as MessageKey[]) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        out.push({ locale, key, line: words[key] });
      }
    }
  }
  return out;
}

/** Asserts nothing under these prefixes scolds, in any language KIDDO speaks. */
export function assertNothingScolds(
  assert: { ok(value: unknown, message?: string): void },
  ...prefixes: readonly string[]
): Said[] {
  const lines = saidUnder(...prefixes);
  assert.ok(lines.length > 0, `no lines found under ${prefixes.join(", ")}`);
  for (const { locale, key, line } of lines) {
    for (const unkind of NEVER_SAID[locale]) {
      assert.ok(!unkind.test(line), `${key} (${locale}) says "${line}" to a four year old`);
    }
  }
  return lines;
}

/* ---- The states a tile can be in, said rather than coloured ------------- */

/** Every state `ChoiceStage` can put a tile in, and the key that says it. */
export const CHOICE_STATE_KEYS: Readonly<Record<string, MessageKey>> = {
  correct: "stage.choice.correct",
  wrong: "stage.choice.wrong",
  tried: "stage.choice.tried",
  idle: "stage.choice.idle",
};

/**
 * Nothing on a choice board rests on colour alone.
 *
 * Two halves, because the promise now has two homes. The stage has to *reach*
 * for a different sentence in each state — that is the part a refactor could
 * quietly drop — and each catalogue has to *hold* a sentence that is different
 * from its neighbours and names the tile it is about. A tile whose Malay name
 * was the same in every state would be exactly the regression this guards,
 * and grepping the component for English would never see it.
 */
export function assertChoiceStatesAreSaid(
  assert: {
    match(value: string, pattern: RegExp, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
  },
  stage: string,
): void {
  assert.match(stage, /t\(CHOICE_WORDS\[state\], \{ name: spokenOf\(item\) \}\)/);
  for (const [state, key] of Object.entries(CHOICE_STATE_KEYS)) {
    assert.match(stage, new RegExp(`${state}: "${key}"`), `no words for a ${state} tile`);
  }
  const keys = Object.values(CHOICE_STATE_KEYS);
  for (const locale of LOCALES) {
    const said = keys.map((key) => ALL_CATALOGUES[locale][key]);
    assert.equal(new Set(said).size, said.length, `${locale} says two states the same way`);
    for (const line of said) assert.ok(line.includes("{name}"), `${locale} leaves a tile unnamed`);
  }
}
