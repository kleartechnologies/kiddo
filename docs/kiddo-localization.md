# KIDDO in two languages

KIDDO ships in Bahasa Melayu and English. Bahasa Melayu is the default,
because KIDDO is for Malaysian families. Not a translated marketing page
over an English product — both languages go all the way down: the landing
page, the pricing, signing up, paying, the parent dashboard, the worlds, the
games, and the questions, hints and explanations inside them.

This document is the map of how that is built, what may never be localized,
and what has to happen before a new game or a new word can ship.

```
src/lib/i18n/                  interface language — what KIDDO's screens say
  locale.ts                    LOCALES, DEFAULT_LOCALE, the labels
  storage.ts                   the one localStorage key, and resolveLocale()
  useLocale.ts                 the module store: useLocale(), setLocale()
  messages/{en,ms}.ts          the catalogue — every interface string, twice
  names.ts, format.ts          world/tier/keepsake names; dates and numbers
src/components/i18n/
  LanguageSwitcher.tsx         the switcher itself
  HtmlLang.tsx                 keeps <html lang> honest
  T.tsx                        a translated string in JSX

src/lib/content/i18n/          content language — what the questions say
  lexicon.ts                   word ⇄ word: nouns, colours, animals, verbs
  phrases.ts                   the sentence book: 850 whole English lines
  phrase.ts                    the engine that fits a sentence to its holes
  index.ts                     localizeChallenge(locale, challenge)
  useSaid.ts                   saying a challenge at the read instead
```

## Two layers, and why they are not one

**Interface strings** live in the catalogue and are read with `t()` or `<T>`.
Completeness is a **type error**: `ms.ts` is declared as the same keyed record
as `en.ts`, so a key added to English and forgotten in Malay does not compile.

**Content strings** — the words inside a dealt question — are not in the
catalogue and could not be. A question is generated: *"Which animal has a baby
called a chick?"* is assembled from a pack, a level and a seed, and there is no
finite key list to enumerate. So content is localized by parts: a **lexicon**
translates the nouns, and a **sentence book** holds the whole English line with
its variable parts punched out as holes. Completeness here is a **test sweep**,
not a type — `tests/contentI18n.test.ts` deals every activity at every level
and fails if a single word or line comes back unsaid.

The join between them is `localizeChallenge(locale, challenge)`. It is applied
**once**: either at the deal (`dealRound`, server) or at the read
(`useSaid`/`useSaidChallenge`, browser), never both. `localizeChallenge("en", c)`
returns `c` itself — English is the object it always was, not a copy of it.

### Holes

A sentence-book line marks its variable parts with glyphs:

| glyph | means | translated? |
| --- | --- | --- |
| `{}` | a noun phrase | yes, through the lexicon |
| `{#}` | a number | no — copied |
| `{@}` | a single letter | no — copied |
| `{~}` | a word being read | **never** — it is the thing being taught |

The Malay line refers to holes by position — `{1}`, `{2}`, `{3}` — so word
order is free. Malay may use fewer holes than the English line has: fourteen
of the 850 lines do, because a Malay sentence sometimes says naturally what
English needs a second noun for. That is allowed, and it is
[reviewed](kiddo-malay-review.md) rather than forced back into symmetry.

## What is never localized

Not as a style preference — as an invariant the tests hold:

- challenge `id`, `packId`, `activityId`, `activityType`, `meta.objective`
- every option `id`, and `answerId`
- the **order** answers were dealt in
- seeds, levels, tiers, node ids, item ids
- numerals on a tile, letters on a letter tile, and any word a child is
  being asked to *read* (`{~}`)
- progress: how many questions are done, how many are left, which are right

Concretely: switching language mid-round changes the words and nothing else.
The same answer is right, the same answers are wrong, the round does not
restart, and the progress bar does not move. `tests/contentI18n.test.ts` and
`scripts/measure-language.mjs` both assert exactly this, the second by driving
a real browser through all six quests and flipping the language from another
tab in the middle of a question.

## The language preference

One key, on one device: `kiddo.locale.v1` in `localStorage`, the same shape as
the child's name and the audio settings. **It is not stored in Firestore.**
`users/{uid}` accepts exactly `email`, `createdAt` and `updatedAt`, and
widening that rule to carry a UI preference is not a trade worth making. The
slot for an account-backed answer exists in `resolveLocale` and is documented,
tested and empty.

`resolveLocale` decides which language KIDDO opens in, in this order:

1. **What the parent explicitly chose** — for ever. A household that switched
   to English once is never handed back by a default, a new phone or a browser
   update.
2. **What the account remembers** — reserved, unfilled today.
3. **Bahasa Melayu**, because KIDDO is written for Malaysian parents and the
   landing page they meet first is written in Malay.

### The device does not get a vote

KIDDO used to read `navigator.languages` and open in whatever the phone said.
It no longer does, and the reason is worth writing down so nobody adds it
back: a Malaysian phone is usually set to English even in a household that
speaks Malay all day. The tags a device sends are a fact about the phone, not
about the family, and negotiating against them handed most Malaysian parents
an English page on a product built for them.

So there is no guess. Everyone opens in Bahasa Melayu, and the switcher sits
in the landing header — `BM | English`, one tap, first thing on the page — for
the parent who would rather read English. That also means the prerendered
landing HTML a CDN serves is Malay, with `<html lang="ms">` true before any
JavaScript runs.

Storage that throws — Safari private mode, a blocked iframe, site data off —
is not an error. It means KIDDO opens in Bahasa Melayu every visit instead of
the remembered choice, which is the mildest possible failure.

### `ms` means Malaysian Bahasa Melayu

The code is `ms` because that is what BCP 47, `<html lang>`, `Intl` and every
dictionary KIDDO will ever add already agree on. The switcher says **BM**,
because that is what a Malaysian reads at a glance. The two disagreeing is
deliberate and is the only place they are allowed to.

**Indonesian is not Malay.** The two are close enough that a machine would
fold them together and far enough apart that a Malaysian child would hear the
difference in the first sentence, which is why `id` never became an alias for
`ms` back when devices were consulted at all. When KIDDO has real Bahasa
Indonesia, `id` becomes its own entry in `LOCALES`.

### Adding a third language

Add the code to `LOCALES`, add a dictionary beside the two that exist. That is
the whole procedure — `Record<Locale, …>` stops compiling everywhere something
is missing, so a language cannot be half-added.

## Rules for new work

**A new game or activity is not shippable until it is localized.** Ship the
lexicon entries and sentence-book lines in the same change as the pack. The
sweep in `tests/contentI18n.test.ts` deals every activity at every level, so an
unlocalized pack fails the build rather than reaching a child as English inside
a Malay round.

**A new lexicon entry can silently kill a sentence-book line.** Adding a word
changes which spans of an existing English sentence become holes, so a line
written against the old spans stops matching and is never reached again. The
regression tests are what catch this — *"the sentence book has no line nothing
reaches"* and *"every word of every question can be said in Bahasa Melayu"*.
Run them, and read both failures as one fact: a hole moved.

**A new interface string goes in both catalogues.** The compiler insists.

**No screen holds a sentence of its own.** `tests/i18n.test.ts` scans the
shipped components for hardcoded English prose. The catalogue, the lexicon and
the sentence book are the only places words live.

**Malay lesson names still need a native speaker.** See
[kiddo-malay-review.md](kiddo-malay-review.md). The Malay in the repo was
written carefully, not natively, and the review list says so plainly rather
than pretending otherwise.

## Localization and paid content

Two languages do **not** change KIDDO's content-exposure position, and must not
be allowed to make it worse. See §7 of [SECURITY.md](SECURITY.md).

- There is **one** content path, not one per language. `dealRound(round, tier,
  seed, locale)` in `src/server/content.ts` sits behind `POST
  /api/content/round`, which requires a verified Firebase ID token, an active
  subscription (`hasAccess`) and passes a rate limit. `locale` is the last
  argument of the same call, not a second endpoint.
- `locale` is **not** an access decision. It is the caller's to state — the
  language lives in the browser — and an unrecognised value falls back to
  English rather than refusing to deal a round the parent has paid for. A
  locale can change the words; it can never change who may have them.
- Bahasa Melayu is **not** a second unauthenticated copy of the library. The
  Malay strings are a lexicon and a sentence book applied to the same dealt
  challenge; there is no `ms` content bundle, no `ms` route and no `ms` API.
- The exposure that does exist — the packs compiled into a public client chunk
  — is unchanged by this work and is still tracked in SECURITY.md §7. Adding a
  language neither fixes it nor doubles it.
