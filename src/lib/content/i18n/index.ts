import { ACCENT_WORDS } from "@/lib/accents";
import type { Locale } from "@/lib/i18n/locale";
import { labelOf, spokenOf } from "../challenges";
import { isAction } from "./lexicon";
import type { Challenge, ContentItem, CountItem, Prompt } from "../types";
import { SENTENCES } from "./phrases";
import { longestPhrase, phrase } from "./phrase";

/**
 * Saying a dealt question in another language.
 *
 * ## Where this sits
 *
 * At the very end of the pipeline, and nowhere else. A pack generates its
 * questions in English — `1 and 2 make 3.`, `A cow says moo.` — because that
 * is where the *lesson* is written and because the whole content layer, every
 * validator and every existing test reads those sentences. This module takes
 * a finished `Challenge` and hands back the same challenge saying the same
 * thing in Malay.
 *
 * Crucially it is not a client-side pass over rendered UI. `localizeChallenge`
 * is called by whatever *deals* the round — the server's `dealRound`, a
 * game's opening draw — with the locale it was asked for, so a Malay round is
 * dealt as a Malay round. Nothing downstream of it ever sees English.
 *
 * ## What is guaranteed not to move
 *
 * Every id, and therefore every answer. `answerId`, `answerOrder`, `pairs`,
 * `left`/`right` node ids and the order options were dealt in are copied
 * across untouched, so `checkAnswer` gives the identical verdict on the Malay
 * challenge that it gives on the English one. Level, age band, activity and
 * pack are untouched too, so difficulty and scoring cannot move either. The
 * only things that change are the words a person reads.
 *
 * ## Sentences, not strings
 *
 * A dealt explanation is often several sentences glued together — one per pair
 * a child found — so the number of distinct *strings* explodes while the
 * number of distinct *sentences* stays small. Everything here therefore works
 * one sentence at a time: split, say each, join. That is what makes a phrase
 * book of a few hundred entries cover a few thousand strings.
 */

/** Splits on sentence end, keeping the punctuation with the sentence. */
const SENTENCE_END = /(?<=[.?!])\s+/;

/** Punctuation that may sit on the end of a word without being part of it. */
const TAIL = /[.,?!;:—]+$/;

/** A number, a single letter, and a word being taught to read. */
const NUMBER = /^\d+$/;
const LETTER = /^[A-Za-z]$/;
const SHOUTED = /^[A-Z][A-Z]+$/;

/**
 * The shouted words that are colours rather than reading.
 *
 * A word in capitals inside a KIDDO sentence is the name of a tile, and a tile
 * is one of two things: a word the child is learning to read — CAT, BALLS,
 * BIG, which must not move — or a colour swatch, whose name comes from
 * `ACCENT_WORDS` and which must. Five strings narrow it down, and
 * `tests/contentI18n.test.ts` checks that no pack ever teaches one of the five
 * as a reading word, which is the day this would start lying.
 *
 * Narrow it down, not settle it: `GREEN is spelled G, R, E, E, N.` shouts a
 * colour word that is being *read*, and translating it would spell a Malay
 * word with English letters. What separates the two is repetition — a swatch
 * pattern is a beat, so it always shows at least two swatches, and a word
 * being read is shown once. See `swatches` in `holed`.
 */
const SHOUTED_COLOURS: ReadonlySet<string> = new Set(Object.values(ACCENT_WORDS));

/**
 * A sentence with its variable parts lifted out.
 *
 * `shape` is what the sentence book is keyed on and `parts` is what goes back
 * into it. Four kinds of hole, and the glyph says which: `{}` is a noun phrase
 * the dictionary can say, `{#}` a number, `{@}` a single letter, `{~}` a word
 * the child is being taught to read. The last three are *copied*, never
 * translated — a sum must stay the sum it was and CAT must stay CAT.
 */
interface Holed {
  shape: string;
  /** The glyph of each hole, in the order the holes appear. */
  glyphs: string[];
  /** The English of each hole, in the order the holes appear. */
  parts: string[];
  /** Each hole already said in the locale, ready to be dropped in. */
  said: string[];
}

/**
 * Break a sentence into a shape and its holes.
 *
 * At every word, the longest noun phrase that starts there wins, so *ice
 * cream* is one hole and not two, and *the circle above the diamond* is one
 * hole and not five. Punctuation is left outside the hole — `{},` not `{,}` —
 * so a book entry reads the way the sentence does.
 *
 * Note that the shape depends on the dictionary: teaching `lexicon` a new word
 * can change the shape of a sentence that was already in the book, which will
 * show up as a coverage failure rather than as anything a child sees. That is
 * the trade for a book of a few hundred lines instead of a list of thousands.
 */
function holed(locale: Locale, sentence: string): Holed {
  const words = sentence.split(" ");
  /* Whether the letters in this sentence are being *read*. English writes the
     article and the first letter of the alphabet the same way, so "A" alone is
     ambiguous — until some other letter is standing on its own beside it, and
     then the whole sentence is spelling something out: "T, R, A, I, N". */
  const spelling = words.some((one) => {
    const bare = one.replace(TAIL, "");
    return LETTER.test(bare) && bare.toLowerCase() !== "a";
  });
  /* How many colour swatches are being shown. Two or more and this sentence
     is a pattern, so the colour names are colours; one and the word is being
     read, so it stays exactly as it is written. */
  const swatches = words.filter((one) => SHOUTED_COLOURS.has(one.replace(TAIL, ""))).length;
  /* A word that is copied across rather than said. The three branches below
     take one each, and a phrase may not reach over any of them: `one DUCK` is
     not `satu itik`, it is the word DUCK with an English `one` in front of it,
     and the English is the whole point of the lesson. */
  const copied = (bare: string) =>
    NUMBER.test(bare) ||
    (SHOUTED.test(bare) && !(swatches > 1 && SHOUTED_COLOURS.has(bare))) ||
    (LETTER.test(bare) && (spelling || bare.toLowerCase() !== "a"));

  /* A verb is never a hole and never inside one: see `ACTION_WORDS`. */
  const stops = (bare: string) => copied(bare) || isAction(bare);

  const shape: string[] = [];
  const glyphs: string[] = [];
  const parts: string[] = [];
  const said: string[] = [];

  const take = (glyph: string, english: string, spoken: string, tail: string) => {
    shape.push(glyph + tail);
    glyphs.push(glyph);
    parts.push(english);
    said.push(spoken);
  };

  for (let at = 0; at < words.length; ) {
    const one = words[at]!;
    const tail = one.match(TAIL)?.[0] ?? "";
    const bare = one.slice(0, one.length - tail.length);

    if (NUMBER.test(bare)) {
      take("{#}", bare, bare, tail);
      at += 1;
      continue;
    }
    if (SHOUTED.test(bare) && !(swatches > 1 && SHOUTED_COLOURS.has(bare))) {
      take("{~}", bare, bare, tail);
      at += 1;
      continue;
    }
    /* "a" on its own is an article unless the sentence is spelling — see
       `spelling` above. Every other single letter is one being read out. */
    if (LETTER.test(bare) && (spelling || bare.toLowerCase() !== "a")) {
      take("{@}", bare, bare, tail);
      at += 1;
      continue;
    }

    if (isAction(bare)) {
      shape.push(one);
      at += 1;
      continue;
    }

    /* How far a phrase starting here may reach: never over punctuation, since
       a comma ends the thought and reading past one would join two of them,
       and never up to a word that is copied rather than said. */
    let reach = words.length;
    for (let i = at; i < words.length; i += 1) {
      const w = words[i]!;
      if (i > at && stops(w.replace(TAIL, ""))) {
        reach = i;
        break;
      }
      if (TAIL.test(w)) {
        reach = i + 1;
        break;
      }
    }
    const span = words.slice(at, reach).map((w) => w.replace(TAIL, ""));
    const found = longestPhrase(locale, span, 0);
    if (found) {
      const last = words[at + found.length - 1]!;
      const end = last.match(TAIL)?.[0] ?? "";
      take("{}", span.slice(0, found.length).join(" "), found.said, end);
      at += found.length;
      continue;
    }

    shape.push(one);
    at += 1;
  }

  return { shape: shape.join(" "), glyphs, parts, said };
}

/** `{1}`…`{9}`, and `{}` for "the next one". */
const SLOT = /\{(\d?)\}/g;

/** Put the holes back into a book entry. */
function fill(template: string, holed: Holed): string {
  let next = 0;
  const leading = template.match(SLOT)?.[0];
  const filled = template.replace(SLOT, (_, index: string) =>
    index === "" ? (holed.said[next++] ?? "") : (holed.said[Number(index) - 1] ?? ""),
  );
  if (!template.startsWith("{") || leading === undefined) return filled;
  /* A sentence that begins with a hole begins with a word the dictionary
     holds in lower case, and a sentence still starts with a capital — unless
     the hole is copied rather than said, because then its case is the lesson.
     `little e` is *e kecil*, and capitalising it would teach the wrong e. */
  const at = leading === "{}" ? 0 : Number(leading.slice(1, -1)) - 1;
  return holed.glyphs[at] === "{}" ? upperFirst(filled) : filled;
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Does the book cover this sentence, one way or the other?
 *
 * Not the same question as "did it change". Some English is *meant* to survive
 * the crossing — `jet`, `pen`, `van` are the words a child is sounding out,
 * and an entry that says so is a decision someone made, not a hole someone
 * missed. `gapsIn` asks this rather than comparing strings, so a deliberate
 * `"jet": "jet"` reads as covered and an untouched sentence still reads as a
 * gap.
 */
function covered(locale: Locale, sentence: string): boolean {
  const book = SENTENCES[locale];
  if (book === undefined) return false;
  if (book[sentence] !== undefined) return true;
  return book[holed(locale, sentence).shape] !== undefined;
}

/**
 * One English sentence, said in `locale`.
 *
 * The book as written first — a sentence with nothing variable in it is
 * translated whole, which is how it stays idiomatic. Then the same sentence
 * with its noun phrases and numbers lifted out, which is how one entry covers
 * every board the pack can deal. A sentence the book has neither way comes
 * back in English, and `gapsIn` is how the test finds it before a child does.
 */
function saySentence(locale: Locale, sentence: string): string {
  const book = SENTENCES[locale];
  if (book === undefined) return sentence;

  const whole = book[sentence];
  if (whole !== undefined) return whole;

  const parts = holed(locale, sentence);
  const template = book[parts.shape];
  if (template === undefined) return sentence;
  return fill(template, parts);
}

/** A whole run of text — a prompt, an explanation, a hint — in `locale`. */
export function localizeText(locale: Locale, text: string): string {
  if (locale === "en" || text.length === 0) return text;
  return text
    .split(SENTENCE_END)
    .map((sentence) => saySentence(locale, sentence))
    .join(" ");
}

/** One item's name — a label, a caption, what a screen reader says. */
export function localizeLabel(locale: Locale, label: string): string {
  if (locale === "en" || label.length === 0) return label;
  return phrase(locale, label) ?? saySentence(locale, label);
}

/**
 * The book key a sentence would be looked up under.
 *
 * What the coverage test prints when it finds a gap: not "I could not say
 * this", but the exact line the book is missing, ready to be written.
 */
export function shapeOf(locale: Locale, sentence: string): string {
  return holed(locale, sentence).shape;
}

/**
 * Which sentences and words a locale could not say.
 *
 * The coverage test's whole vocabulary: hand it everything a challenge has to
 * say and it comes back with what came out unchanged. Empty is the only
 * passing answer, and it is checked across every activity at every level.
 */
export function gapsIn(locale: Locale, challenge: Challenge): string[] {
  if (locale === "en") return [];
  const gaps: string[] = [];
  const text = (value: string | undefined) => {
    for (const sentence of (value ?? "").split(SENTENCE_END)) {
      if (sentence.length === 0) continue;
      /* A sentence with no letters in it — "3." — is already said. */
      if (!/\p{L}{2}/u.test(sentence)) continue;
      if (saySentence(locale, sentence) === sentence && !covered(locale, sentence)) {
        gaps.push(sentence);
      }
    }
  };
  text(challenge.prompt.speech);
  text(challenge.explanation);
  text(challenge.hint);
  for (const item of itemsOf(challenge)) {
    if (!isSaid(item)) continue;
    const name = labelOf(item);
    if (name.length === 0 || !/\p{L}{2}/u.test(name)) continue;
    if (localizeLabel(locale, name) === name && !covered(locale, name)) gaps.push(name);
  }
  return gaps;
}

/* ------------------------------------------------------------------ items */

/**
 * An item, named in `locale`.
 *
 * Only the name moves. A picture keeps its glyph, a swatch keeps its accent, a
 * shape keeps its shape and a `text` item keeps its text — that last one on
 * purpose and at length: see the header of `lexicon.ts`. What the item gains
 * is an explicit `label`, which is exactly the field `labelOf` reads first, so
 * every engine, every caption and every screen-reader line downstream says the
 * Malay name without knowing there was ever another one. A group of dots is
 * the one item that gains a second field, because it is the one item whose
 * spoken name is not its label — see `spokenOf`.
 */
function localizeItem(locale: Locale, item: ContentItem): ContentItem {
  if (!isSaid(item)) return item;
  if (item.kind === "scene") {
    /* A scene's name is built from its parts, so it is translated whole —
       Malay does not put a relation together the way English does, and
       `phrase` knows how it does. Its parts are renamed too, for the
       captions and the screen reader underneath. */
    return {
      ...item,
      label: localizeLabel(locale, labelOf(item)),
      subject: { ...item.subject, label: localizeLabel(locale, labelOf(item.subject)) },
      anchor: { ...item.anchor, label: localizeLabel(locale, labelOf(item.anchor)) },
    };
  }
  if (item.kind === "count") {
    /* A group of dots is the one tile whose spoken name is not its label —
       see `spokenOf`. Its label is a numeral and a numeral is the same in
       both languages; what has to be said is the counting word beside it. */
    return {
      ...item,
      label: localizeLabel(locale, labelOf(item)),
      spoken: sayDots(locale, item),
    };
  }
  return { ...item, label: localizeLabel(locale, labelOf(item)) };
}

/**
 * "4 dots", "4 titik".
 *
 * Small enough to write out and too irregular to derive. English marks a
 * plural on the noun and Malay marks none, so one Malay form serves every
 * count; a language that inflected on the number would get its own line here
 * rather than a rule bolted onto this one. Kept out of the dictionary on
 * purpose: `dot` as an entry would change which spans of every existing
 * sentence become holes, and the sentence book is written against the spans
 * it has.
 */
function sayDots(locale: Locale, item: CountItem): string {
  return locale === "ms" ? `${item.value} titik` : spokenOf(item);
}

/**
 * Is this item's name something KIDDO says, or something it shows?
 *
 * Two kinds of tile keep their English however the round is dealt. A friend is
 * a proper noun — PIP is PIP in every language, exactly as a child's own name
 * is. And a `text` tile with no label of its own *is* its text: CAT, BALLS,
 * BIG, the word the question is about. Where such a tile carries an explicit
 * label — "big A", "little a", "2 plus 2" — that label was written for a
 * screen reader rather than for the eye, and it is said, so it moves.
 */
function isSaid(item: ContentItem): boolean {
  if (item.kind === "character") return false;
  if (item.kind === "text") return item.label !== undefined;
  return true;
}

/** Every item a challenge shows, prompt and board alike. */
function itemsOf(challenge: Challenge): ContentItem[] {
  const items: ContentItem[] = [];
  for (const part of challenge.prompt.display ?? []) {
    if (part.kind === "item") items.push(part.item);
  }
  if (challenge.prompt.anchor) items.push(challenge.prompt.anchor);
  const payload = challenge.payload;
  switch (payload.kind) {
    case "choice":
      for (const option of payload.options) items.push(option.item);
      break;
    case "order":
      for (const entry of payload.items) items.push(entry.item);
      break;
    case "match":
      for (const pair of payload.pairs) items.push(pair.left, pair.right);
      break;
    case "connect":
      for (const node of payload.left) items.push(node.item);
      for (const node of payload.right) items.push(node.item);
      break;
  }
  return items;
}

function localizePrompt(locale: Locale, prompt: Prompt): Prompt {
  return {
    ...prompt,
    speech: localizeText(locale, prompt.speech),
    display: prompt.display?.map((part) =>
      part.kind === "item" ? { ...part, item: localizeItem(locale, part.item) } : part,
    ),
    anchor: prompt.anchor ? localizeItem(locale, prompt.anchor) : undefined,
  };
}

/* -------------------------------------------------------------- challenge */

/**
 * A dealt challenge, in `locale`.
 *
 * English returns the identical object — not a copy — so the language KIDDO
 * shipped in first costs nothing at all, and so every existing test that deals
 * a round and reads its English is testing exactly the object it always was.
 */
export function localizeChallenge(locale: Locale, challenge: Challenge): Challenge {
  if (locale === "en") return challenge;

  const payload = challenge.payload;
  const said: Challenge["payload"] =
    payload.kind === "choice"
      ? {
          ...payload,
          options: payload.options.map((o) => ({ ...o, item: localizeItem(locale, o.item) })),
        }
      : payload.kind === "order"
        ? {
            ...payload,
            items: payload.items.map((o) => ({ ...o, item: localizeItem(locale, o.item) })),
          }
        : payload.kind === "match"
          ? {
              ...payload,
              pairs: payload.pairs.map((p) => ({
                ...p,
                left: localizeItem(locale, p.left),
                right: localizeItem(locale, p.right),
              })),
            }
          : {
              ...payload,
              left: payload.left.map((n) => ({ ...n, item: localizeItem(locale, n.item) })),
              right: payload.right.map((n) => ({ ...n, item: localizeItem(locale, n.item) })),
            };

  return {
    ...challenge,
    prompt: localizePrompt(locale, challenge.prompt),
    payload: said,
    explanation:
      challenge.explanation === undefined
        ? undefined
        : localizeText(locale, challenge.explanation),
    hint: challenge.hint === undefined ? undefined : localizeText(locale, challenge.hint),
  };
}

/** A whole dealt round. */
export function localizeRound(
  locale: Locale,
  round: readonly Challenge[],
): Challenge[] {
  return round.map((challenge) => localizeChallenge(locale, challenge));
}
