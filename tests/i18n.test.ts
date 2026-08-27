import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { ACTIVITIES } from "@/lib/content/registry";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  LOCALE_HTML_LANG,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type Locale,
} from "@/lib/i18n/locale";
import { around, fill, formatDay } from "@/lib/i18n/format";
import { ALL_CATALOGUES, translate, translator, type MessageKey } from "@/lib/i18n/messages";
import { en } from "@/lib/i18n/messages/en";
import { ms } from "@/lib/i18n/messages/ms";
import {
  characterBlurbKey,
  conceptKey,
  doorKey,
  rewardKey,
  tierKey,
  worldBlurbKey,
  worldLineKey,
  worldNameKey,
  type DoorVoice,
} from "@/lib/i18n/names";
import { LOCALE_KEY, readStoredLocale, resolveLocale, writeStoredLocale } from "@/lib/i18n/storage";
import { CHARACTERS } from "@/data/characters";
import { GAME_WORLDS } from "@/lib/worlds/worlds";
import { PLAYABLE_WORLDS, TIERS, WORLD_ACTIVITIES } from "@/lib/worlds/activities";

/**
 * KIDDO in two languages, checked as one product.
 *
 * The catalogue's own completeness is a *type* error — `ms` is declared
 * `Record<MessageKey, string>`, so a missing or invented Malay line does not
 * compile — and that is deliberately not what this file tests. What it tests
 * is everything the types cannot see:
 *
 *   - the keys that are **built from an id** rather than written out.
 *     `doorKey` and `conceptKey` both assert past the compiler, because a
 *     door slug and an activity id are open-ended strings. Their doc comments
 *     name this file as the thing that closes the hole, and the two sweeps
 *     below are it: ninety-five real keys, walked from the registries.
 *   - the **priority order** a language preference is resolved by (§3), which
 *     is a rule about people rather than about types.
 *   - the **switcher**, whose promises are all accessibility promises (§18):
 *     a state that is not colour alone, a target a thumb can hit, a key that
 *     closes it.
 *   - that a third language would be a dictionary rather than a fork (§9),
 *     which is a claim about every *other* file in the repo.
 *
 * Source-scanning where the thing being protected is a decision, in the house
 * style — there is no DOM in this suite. The content layer's own coverage is
 * a separate sweep with a separate shape: see `tests/contentI18n.test.ts`.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The same file with its prose taken out.
 *
 * KIDDO's source explains itself at length, and several of the sweeps below
 * ask whether a *component* holds a string — a question a doc comment
 * mentioning that string would answer wrongly for ever.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const KEYS = Object.keys(en) as MessageKey[];

/** The `{hole}` names a message has, in the order they could be filled. */
const holesIn = (message: string) => [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

/* ------------------------------------------------------- the catalogues -- */

/* 1 ---------------------------------------------------------------------- */
test("both catalogues say the same set of things", () => {
  /* The types already promise this. It is asserted anyway because the promise
     is only as good as the declaration in `ms.ts`, and a `as Record<…>` added
     in a hurry to land a translation would turn a compile error into a
     silently English screen. One line here notices that. */
  assert.equal(Object.keys(ms).length, KEYS.length);
  for (const key of KEYS) assert.ok(key in ms, `Malay has no line for ${key}`);
  for (const key of Object.keys(ms)) assert.ok(key in en, `${key} is Malay only`);
});

/* 2 ---------------------------------------------------------------------- */
test("every message is a sentence, in every language", () => {
  /* An empty line renders as a blank button rather than as an error, which is
     the failure nobody reports. One message is empty on purpose — the monthly
     plan has no badge where the yearly one says "Best value" — and it is
     empty in both languages, which is the shape a deliberate blank has. */
  const blanks = KEYS.filter((key) =>
    LOCALES.some((locale) => ALL_CATALOGUES[locale][key].trim() === ""),
  );
  assert.deepEqual(blanks, ["plan.monthly.note"]);
  for (const locale of LOCALES) {
    assert.equal(ALL_CATALOGUES[locale]["plan.monthly.note"], "");
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a translated message has the same holes as the English one", () => {
  /* The one failure mode `fill` cannot survive. A Malay line that drops
     `{name}` loses the child's name; one that invents `{nama}` renders the
     braces on screen. Both are invisible until the value is non-empty, which
     is to say until a real household is looking at it. */
  for (const key of KEYS) {
    assert.deepEqual(
      holesIn(ms[key]),
      holesIn(en[key]),
      `${key}: "${ms[key]}" does not fill the same holes as "${en[key]}"`,
    );
  }
});

/* 4 ---------------------------------------------------------------------- */
test("nothing is left in English but the things that are the same in both", () => {
  /* §19's "no major untranslated strings", from the only end it can be
     checked from: a Malay line identical to its English one is either a
     translation nobody wrote or a string that is not language at all. Nine
     are the second kind and every one of them is punctuation around holes —
     "{name} · {price}/{per}" reads the same in Kuala Lumpur either way — so
     they are listed rather than guessed at, and a tenth has to be argued for
     here before it can pass. */
  const shared = KEYS.filter((key) => en[key] === ms[key]);
  assert.deepEqual(shared.sort(), [
    /* An empty badge (see above). */
    "plan.monthly.note",
    /* Assembly, not prose: a hole, a separator, a hole. */
    "billing.planLine",
    "join.plan.option",
    "parents.next.line",
    "worlds.door.sr",
    "worlds.doorCard.sr",
    "worlds.doorCard.tier",
    "worlds.keepsake.sr",
    "worlds.tier.sr",
  ].sort());
});

/* 5 ---------------------------------------------------------------------- */
test("a missing line falls back to the default language rather than to nothing", () => {
  /* The runtime backstop under the type guarantee. It exists for the hour a
     translator has cleared a line to come back to it: a button with the
     English word on it is usable, a button with no word on it is not. */
  const gappy = { en, ms: { ...ms, "chrome.back": "" } } as Record<
    Locale,
    Record<MessageKey, string>
  >;
  assert.equal(gappy.ms["chrome.back"], "");
  assert.equal(translate("ms", "chrome.back"), ms["chrome.back"]);
  assert.notEqual(ms["chrome.back"].trim(), "");
  /* And an unknown locale is the default rather than a crash. */
  assert.equal(translate("zz" as Locale, "chrome.back"), ALL_CATALOGUES[DEFAULT_LOCALE]["chrome.back"]);
});

/* 6 ---------------------------------------------------------------------- */
test("t is bound to one language and cannot be talked out of it", () => {
  /* §13's mechanism, stated as a test. A component holds a `t` and never a
     locale, so it has no way to render half a screen in the other language. */
  for (const locale of LOCALES) {
    const t = translator(locale);
    assert.equal(t("chrome.back"), ALL_CATALOGUES[locale]["chrome.back"]);
    assert.equal(
      t("worlds.page.try", { door: "X" }),
      fill(ALL_CATALOGUES[locale]["worlds.page.try"], { door: "X" }),
    );
  }
});

/* 7 ---------------------------------------------------------------------- */
test("a hole nobody filled stays visible", () => {
  assert.equal(fill("{a} and {b}", { a: "one" }), "one and {b}");
  assert.equal(fill("{count} of {total}", { count: 3, total: 10 }), "3 of 10");
  assert.equal(fill("no holes"), "no holes");

  /* `around` is for the sentences that need markup in the middle of them,
     and a translation that drops the value must degrade to a whole sentence
     rather than to half of one. */
  const split = around("If there is an account for {email}, we sent a link.", "email");
  assert.equal(split.before, "If there is an account for ");
  assert.equal(split.after, ", we sent a link.");
  const whole = around("Hantar semula.", "email");
  assert.equal(whole.before, "Hantar semula.");
  assert.equal(whole.after, "");
});

/* 8 ---------------------------------------------------------------------- */
test("a date is written the way the reader's language writes it", () => {
  /* Malaysia either way, so the order never changes and only the month's name
     does — which is exactly why this goes through `Intl` rather than through
     a table of month names that could drift between the two catalogues. */
  const day = Date.UTC(2026, 2, 14, 12);
  assert.match(formatDay(day, "en"), /14/);
  assert.match(formatDay(day, "ms"), /14/);
  assert.match(formatDay(day, "ms"), /2026/);
  assert.notEqual(formatDay(day, "en"), formatDay(day, "ms"));
});

/* ------------------------------------------- the keys built from an id --- */

/* 9 ---------------------------------------------------------------------- */
test("every door in every world is named in both languages", () => {
  /* The hole `doorKey`'s cast leaves open, closed from the other side. A door
     slug is an open-ended string, so the compiler cannot check the key it
     builds; nine doors times four voices times two languages is seventy-two
     lines that have to be there, and this is what notices when a tenth door
     arrives with none of them. */
  const voices: readonly DoorVoice[] = ["title", "blurb", "intro", "done"];
  assert.ok(WORLD_ACTIVITIES.length >= 9, "the doors went missing");

  for (const activity of WORLD_ACTIVITIES) {
    for (const voice of voices) {
      const key = doorKey(activity, voice);
      for (const locale of LOCALES) {
        const said = ALL_CATALOGUES[locale][key];
        assert.ok(said !== undefined, `${locale} has no ${voice} for ${activity.id}`);
        assert.ok(said.trim().length > 0, `${locale} leaves ${key} blank`);
      }
      assert.notEqual(ms[key], en[key], `${key} is still English`);
    }
  }
});

/* 10 --------------------------------------------------------------------- */
test("every lesson in the content registry is named in both languages", () => {
  /* The same hole in `conceptKey`, closed the same way. These are the names
     the parent dashboard lists — "Counting", "Words That Rhyme" — and they
     are the words a *grown-up* reads under a heading they chose the language
     of, so a lesson list left in English is exactly the half-translated
     screen §13 rules out. The questions themselves carry no words at all:
     an activity's title is derived from its id, so there is one copy of it
     and it is in the catalogues. */
  assert.ok(ACTIVITIES.length >= 80, "the registry shrank");

  for (const activity of ACTIVITIES) {
    const key = conceptKey(activity.id);
    assert.equal(activity.title, key, `${activity.id} carries words of its own`);
    for (const locale of LOCALES) {
      const said = ALL_CATALOGUES[locale][key];
      assert.ok(said !== undefined, `${locale} has no name for ${activity.id}`);
      assert.ok(said.trim().length > 0, `${locale} leaves ${key} blank`);
    }
    assert.notEqual(ms[key], en[key], `${key} is still English`);
  }
});

/* 11 --------------------------------------------------------------------- */
test("every world, tier, keepsake and friend is named in both languages", () => {
  const keys: MessageKey[] = [];
  for (const world of GAME_WORLDS_IDS) keys.push(worldNameKey(world));
  for (const world of PLAYABLE_WORLDS) keys.push(worldLineKey(world), worldBlurbKey(world));
  for (const world of GAME_WORLDS_IDS) {
    keys.push(rewardKey(world, "one"), rewardKey(world, "many"), rewardKey(world, "earned"));
  }
  for (const tier of TIERS) keys.push(tierKey(tier));
  for (const id of Object.keys(CHARACTERS)) {
    keys.push(characterBlurbKey(id as keyof typeof CHARACTERS));
  }

  for (const key of keys) {
    for (const locale of LOCALES) {
      assert.ok(ALL_CATALOGUES[locale][key]?.trim(), `${locale} leaves ${key} blank`);
    }
  }
});

const GAME_WORLDS_IDS = Object.keys(GAME_WORLDS) as (keyof typeof GAME_WORLDS)[];

/* ---------------------------------------------- which language, and why -- */

/* 12 --------------------------------------------------------------------- */
test("KIDDO opens in Bahasa Melayu when nobody has said otherwise", () => {
  /* Not a technical default: a decision about who KIDDO is for. It is written
     for Malaysian parents, and the landing page they meet first is written in
     Bahasa Melayu, so that is the language of the prerendered file too. */
  assert.equal(DEFAULT_LOCALE, "ms");
  assert.equal(resolveLocale(null, null), "ms");
  assert.equal(resolveLocale(null), "ms");
});

/* 13 --------------------------------------------------------------------- */
test("the device does not get a vote", () => {
  /* KIDDO used to read `navigator.languages` and open in whatever the phone
     said. It no longer does, and deliberately: a Malaysian phone is usually
     set to English even in a household that speaks Malay all day, so the
     device setting is precisely the wrong thing to infer a household's
     language from. Nothing in the language layer reads it any more. */
  const storage = read("src/lib/i18n/storage.ts");
  assert.doesNotMatch(storage, /navigator/);
  assert.doesNotMatch(read("src/lib/i18n/locale.ts"), /navigator/);
  assert.doesNotMatch(read("src/lib/i18n/useLocale.ts"), /navigator\.languages/);

  /* Which leaves one tap in the header as the way to English — and it is on
     the landing page a parent lands on, not buried in a settings screen. */
  assert.match(read("src/components/landing/LandingHeader.tsx"), /LanguageSwitcher/);
});

/* 14 --------------------------------------------------------------------- */
test("an explicit choice outranks everything, for ever", () => {
  /* The rule the others exist to protect (§3). A household that switched to
     English once must never be handed back to Bahasa Melayu by a default —
     and a household that chose Bahasa Melayu on an account set to English
     must be left in Bahasa Melayu. */
  assert.equal(resolveLocale("en", "ms"), "en");
  assert.equal(resolveLocale("ms", "en"), "ms");

  /* An account preference outranks the default and loses to a choice made on
     this device — the second-phone case. */
  assert.equal(resolveLocale(null, "en"), "en");
  assert.equal(resolveLocale(null, null), "ms");
});

/* 15 --------------------------------------------------------------------- */
test("a choice is remembered, and rubbish in storage is not", () => {
  const store = new Map<string, string>();
  const globals = globalThis as Record<string, unknown>;
  const hadWindow = "window" in globals;
  globals.window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };

  try {
    assert.equal(readStoredLocale(), null, "nobody has chosen yet");

    assert.equal(writeStoredLocale("ms"), "ms");
    assert.equal(store.get(LOCALE_KEY), "ms");
    assert.equal(readStoredLocale(), "ms");
    assert.equal(resolveLocale(readStoredLocale(), "en"), "ms");

    /* A value from an older shape, a different product, or a typo. Null is
       the important answer: it hands the vote back to the account and then to
       the default rather than rendering a language that does not exist. */
    store.set(LOCALE_KEY, "bm");
    assert.equal(readStoredLocale(), null);
    store.set(LOCALE_KEY, "en-US");
    assert.equal(readStoredLocale(), null);

    /* Storage that throws — Safari in private mode, an iframe with site data
       off — is the mildest possible failure and never an error on screen. */
    globals.window = {
      localStorage: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {
          throw new Error("blocked");
        },
        removeItem() {
          throw new Error("blocked");
        },
      },
    };
    assert.equal(readStoredLocale(), null);
    assert.equal(writeStoredLocale("ms"), "ms", "it holds for this visit");
  } finally {
    if (hadWindow) globals.window = undefined;
    delete globals.window;
  }

  /* On the server there is no storage and no device, and asking is not an
     error either. */
  assert.equal(readStoredLocale(), null);
  assert.equal(writeStoredLocale("ms"), "ms");
  assert.equal(writeStoredLocale("klingon"), null);
});

/* 16 --------------------------------------------------------------------- */
test("the codes are the standard ones and only the label is Malaysian", () => {
  /* §2, and the one place the product is allowed to disagree with BCP 47.
     `BM` is what a Malaysian reads at a glance; `ms` is what `<html lang>`,
     `Intl` and every dictionary KIDDO will ever add already agree on. */
  assert.deepEqual([...LOCALES], ["ms", "en"]);
  assert.ok(!(LOCALES as readonly string[]).includes("bm"));
  assert.equal(LOCALE_SHORT.ms, "BM");
  assert.equal(LOCALE_SHORT.en, "EN");
  assert.equal(LOCALE_LABELS.ms, "Bahasa Melayu");
  assert.equal(LOCALE_LABELS.en, "English");
  assert.equal(LOCALE_HTML_LANG.ms, "ms");
  assert.equal(LOCALE_HTML_LANG.en, "en");

  assert.ok(isLocale("ms"));
  assert.ok(!isLocale("bm"));
  assert.ok(!isLocale("ms-MY"));
  assert.ok(!isLocale(undefined));
});

/* --------------------------------------------------------- the switcher -- */

/* 17 --------------------------------------------------------------------- */
test("the switcher offers every language KIDDO speaks and no other", () => {
  /* Not a hand-written list of two. The day `zh` is added to `LOCALES` the
     switcher grows a row without being edited, which is the whole claim §9
     makes about adding a language. */
  const source = code("src/components/i18n/LanguageSwitcher.tsx");
  assert.match(source, /LOCALES\.map\(\(option\)/);
  assert.doesNotMatch(source, /Bahasa Melayu/, "the names belong in one file");
  assert.doesNotMatch(source, /"BM"|"EN"/, "the short codes belong in one file");
  assert.match(source, /LOCALE_LABELS\[option\]/);
  assert.match(source, /LOCALE_SHORT\[option\]/);
});

/* 18 --------------------------------------------------------------------- */
test("the chosen language is never shown by colour alone", () => {
  /* §18, and the reason the tick is drawn `invisible` rather than not drawn:
     the row keeps its width either way, so choosing does not make the list
     jump. Three ways of saying which one is on — a tick, heavier type, and
     `aria-checked` — and not one of them is a hue. */
  const source = read("src/components/i18n/LanguageSwitcher.tsx");
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{active\}/);
  assert.match(source, /<Check/, "the state has no shape");
  assert.match(source, /active \? "text-sage-ink" : "invisible"/);
  assert.match(source, /font-semibold/);
  assert.match(source, /sr-only">\{t\("lang\.selected"\)\}/);

  for (const locale of LOCALES) {
    for (const key of ["lang.current", "lang.choose", "lang.selected"] as const) {
      assert.ok(ALL_CATALOGUES[locale][key].trim(), `${locale} has no ${key}`);
    }
    assert.ok(
      ALL_CATALOGUES[locale]["lang.current"].includes("{name}"),
      `${locale} does not say which language is on`,
    );
  }
});

/* 19 --------------------------------------------------------------------- */
test("the switcher can be opened, walked and closed without a mouse", () => {
  const source = read("src/components/i18n/LanguageSwitcher.tsx");
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /event\.key === "Escape"/, "Escape does not close it");
  assert.match(source, /close\(true\)/, "focus is not handed back");
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /pointerdown/, "a tap outside does not close it");
  assert.match(source, /min-h-12/, "a thumb cannot hit it");
  assert.match(source, /type="button"/, "a button in a form would submit it");
});

/* 20 --------------------------------------------------------------------- */
test("the switcher is where the person who reads it is", () => {
  /* On the landing page and everywhere a grown-up signs up, pays or manages
     the account — and deliberately *not* on the child's header, where a four
     year old would be flipping a setting their parent chose on a screen with
     no way back to it. The reason is written on `WorldHeader`; this keeps it
     true. */
  for (const path of [
    "src/components/landing/LandingHeader.tsx",
    "src/app/join/page.tsx",
    "src/app/welcome/page.tsx",
    "src/app/parents/page.tsx",
    "src/app/parents/reset/page.tsx",
  ]) {
    assert.match(read(path), /<LanguageSwitcher/, `${path} has no way to change language`);
  }

  const header = read("src/components/kiddo/WorldHeader.tsx");
  assert.doesNotMatch(header, /LanguageSwitcher/);
  assert.match(header, /Why the language switcher is not here/);
});

/* 21 --------------------------------------------------------------------- */
test("the document's language follows the reader, in the same tick", () => {
  /* `lang` is what a screen reader picks a voice from. A page of Bahasa
     Melayu labelled English is read aloud in an English voice, which is
     worse than no label at all. Two writers, on purpose: `setLocale` for a
     switch mid-page, `HtmlLang` for the first load and for a change made in
     another tab. */
  const store = read("src/lib/i18n/useLocale.ts");
  assert.match(store, /document\.documentElement\.lang = LOCALE_HTML_LANG\[snapshot\]/);
  assert.match(store, /getServerSnapshot/, "the prerender and the hydration must agree");

  const attribute = read("src/components/i18n/HtmlLang.tsx");
  assert.match(attribute, /document\.documentElement\.lang = LOCALE_HTML_LANG\[locale\]/);
  assert.match(read("src/app/layout.tsx"), /<HtmlLang \/>/);
});

/* --------------------------------------------------- one product, twice -- */

/* 22 --------------------------------------------------------------------- */
test("nothing outside the language layer knows a language exists", () => {
  /* §9 and §19's last item, as a sweep rather than as an argument. If a game,
     a stage, a screen or a pack ever branches on `"ms"`, then adding `zh`
     means editing that file too — and the day there are three languages and
     forty such branches, a language is a fork of the product rather than a
     dictionary beside it. The two i18n folders are where knowing is allowed;
     everywhere else asks `t` and is told. */
  const root = fileURLToPath(new URL("../src", import.meta.url));
  const allowed = ["lib/i18n", "lib/content/i18n"];
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      const where = relative(root, path).replaceAll("\\", "/");
      if (allowed.some((prefix) => where.startsWith(prefix))) continue;
      const source = readFileSync(path, "utf8");
      /* The literal, and the two shapes a branch on it takes. */
      if (/["']ms["']|locale === |locale !== /.test(source)) offenders.push(where);
    }
  };
  walk(root);

  assert.deepEqual(offenders, [], "these files would have to be edited to add a language");
});

/* 23 --------------------------------------------------------------------- */
test("adding a language is a dictionary and a line in one list", () => {
  /* The other half of the same claim, from the inside. Every `Record<Locale,
     …>` in the language layer is exhaustive by type, so a third entry in
     `LOCALES` breaks the build in exactly the places a translator has work to
     do — and nowhere else. */
  const locale = read("src/lib/i18n/locale.ts");
  assert.match(locale, /export const LOCALES = \["ms", "en"\] as const/);
  assert.match(locale, /Record<Locale, string> = \{/);

  const index = read("src/lib/i18n/messages/index.ts");
  assert.match(index, /Record<Locale, Record<MessageKey, string>>/);

  const catalogue = read("src/lib/i18n/messages/ms.ts");
  assert.match(
    catalogue,
    /Record<MessageKey, string>/,
    "a catalogue that is not typed against the keys can drift",
  );
});

/* 24 --------------------------------------------------------------------- */
test("no screen KIDDO ships holds a sentence of its own", () => {
  /* §13, swept rather than spot-checked. A string left in a component is the
     one bug this whole exercise exists to prevent: it reads correctly in
     English, so nobody sees it, and it is still English on a Malay screen. So
     every shipped `.tsx` is read for the two places a reader's words can hide
     — the text between two tags, and the handful of attributes a screen
     reader or a browser says out loud — and each one must have come from `t`.
     The internal design pages under `components/dev` are exempt: they are
     specimen sheets for the team, never routed to, and are written in English
     on purpose. */
  const root = fileURLToPath(new URL("../src", import.meta.url));

  /* Text between a closing `>` and an opening `<`, on one line, with no code
     punctuation in it. `{t("…")}` is an expression and so is skipped by the
     shape of the match itself, which is the point: what is left is literal. */
  const TEXT = />([^<>{}\n]{3,})</g;
  const CODE = /[;(){}=[\]|&/\\]/;
  const SPOKEN = /\b(aria-label|aria-description|placeholder|alt|title)="([^"]{3,})"/g;
  const WORDS = /\p{L}{2}/u;

  /* The one word KIDDO says the same in every language. */
  const BRAND = /^KIDDO$/;

  const offenders: string[] = [];
  let swept = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "dev") walk(path);
        continue;
      }
      if (!entry.endsWith(".tsx") || entry.endsWith(".dev.tsx")) continue;
      const where = relative(root, path).replaceAll("\\", "/");
      const source = code(`src/${where}`);
      swept++;

      for (const match of source.matchAll(TEXT)) {
        const text = match[1]!.trim();
        if (!text || CODE.test(text) || !WORDS.test(text) || BRAND.test(text)) continue;
        offenders.push(`${where}: ${text}`);
      }
      for (const match of source.matchAll(SPOKEN)) {
        const value = match[2]!;
        /* A `title` or `label` prop given a message key is a component being
           told what to look up, not a screen holding words. */
        if (KEYS.includes(value as MessageKey) || BRAND.test(value)) continue;
        offenders.push(`${where}: ${match[1]}="${value}"`);
      }
    }
  };
  walk(root);

  assert.deepEqual(offenders, [], "these words would stay English on a Malay screen");
  /* An empty answer is only good news if the sweep read anything. */
  assert.ok(swept > 60, `only ${swept} screens were read`);
});
