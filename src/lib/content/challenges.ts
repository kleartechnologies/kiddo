import { CHARACTERS } from "@/data/characters";
import { ACCENT_WORDS } from "@/lib/accents";
import type { Level } from "./difficulty";
import { resolveLevel } from "./difficulty";
import { createRng, type Rng } from "./rng";
import type {
  Activity,
  Answer,
  Challenge,
  ContentItem,
  PromptSymbol,
  ShapeSize,
  SpatialRelation,
} from "./types";

/**
 * Reading and dealing challenges.
 *
 * Everything here works on `Challenge` and `Activity` alone. Nothing in this
 * file knows whether the content it is holding was written by a person or made
 * up a millisecond ago, and that is the point.
 */

/** Symbol id to glyph. A lookup table for the same reason `ACCENTS` is one. */
export const SYMBOL_GLYPHS: Record<PromptSymbol, string> = {
  plus: "+",
  minus: "−",
  equals: "=",
  question: "?",
  less: "<",
  greater: ">",
  arrow: "\u2192",
};

/** How a size is said out loud. "medium circle" is nobody's description. */
const SIZE_WORDS: Record<ShapeSize, string> = {
  small: "small",
  medium: "middle-sized",
  large: "big",
};

/**
 * How a scene is said out loud: "the star **above the** square".
 *
 * Each one is the whole phrase rather than the bare word, because English does
 * not join them the same way — a thing is *beside the* box but *to the left of
 * the* box, and *far from* it rather than *far the* it.
 */
export const RELATION_WORDS: Record<SpatialRelation, string> = {
  above: "above the",
  below: "below the",
  left: "to the left of the",
  right: "to the right of the",
  beside: "beside the",
  inside: "inside the",
  outside: "outside the",
  near: "next to the",
  far: "far away from the",
};

/**
 * The words for a thing on a tile.
 *
 * A pre-reader gets the picture; everyone else — a screen reader, the caption
 * under the tile, KIDDO naming what was just tapped — gets this.
 */
export function labelOf(item: ContentItem): string {
  if (item.label) return item.label;
  switch (item.kind) {
    case "text":
      return item.text;
    case "number":
      return String(item.value);
    case "character":
      return CHARACTERS[item.characterId].name;
    case "swatch":
      return item.label;
    case "count":
      return String(item.value);
    case "picture":
      return item.label;
    /* The colour and the size are part of the name whenever there is one,
       because a board whose only difference is colour — or size — has to be
       answerable by ear too. */
    case "shape":
      return [
        item.size ? SIZE_WORDS[item.size] : "",
        item.accent ? ACCENT_WORDS[item.accent].toLowerCase() : "",
        item.shape,
      ]
        .filter(Boolean)
        .join(" ");

    case "scene":
      return `${labelOf(item.subject)} ${RELATION_WORDS[item.relation]} ${labelOf(item.anchor)}`;
  }
}

/**
 * A caption names something that cannot be read: a swatch, a friend.
 *
 * A numeral, a group of dots, a word and a shape are all already their own
 * caption — printing CAT under the word CAT reads as two answers, exactly as
 * printing 4 under a 4 does. A shape is the sharper case of the same rule:
 * "which one is different?" under four tiles labelled circle, circle, circle,
 * star is not a puzzle any more. A scene is the sharpest — "star above the
 * square" printed under a tile answers "which one shows the star above the
 * square?" outright.
 *
 * Their `label`, where they have one, is what a screen reader hears instead,
 * which is how "big A" and "little a" stay tellable apart, how a board that
 * turns on colour stays answerable, and how a child using one is told what a
 * scene shows without every other child being told the answer.
 *
 * This lives beside `labelOf` rather than in `ChoiceStage` because it is the
 * same kind of knowledge: what an item *is*, in words. An engine that had to
 * be edited every time a pack added an item kind would not be subject-agnostic.
 */
export function captionOf(item: ContentItem): string {
  switch (item.kind) {
    case "number":
    case "count":
    case "text":
    case "shape":
    case "scene":
    /* A picture is the last and least obvious member of the list, and it is
       here for the sharpest version of the same rule. "Which one is a rabbit?"
       under four pictures captioned rabbit, fox, duck, cow is not a question
       about the world any more — it is a reading test, and it is one the child
       who most needs the picture cannot pass. Every general-knowledge question
       is answered by knowing the thing, so the word for it stays where the
       word for a colour swatch does not: in the accessible name. */
    case "picture":
      return "";
    default:
      return labelOf(item);
  }
}

/**
 * What an item is called when it is read out rather than looked at.
 *
 * The same as `labelOf` for everything that is already a word. A group of dots
 * is the exception: `labelOf` gives the bare number, because a tile with four
 * dots drawn on it and a "4" printed underneath reads as two answers — but a
 * screen reader has only the words, so it gets the whole of what is on screen,
 * counted and pluralised. "1 dots" is nobody's transcription of anything.
 */
export function spokenOf(item: ContentItem): string {
  if (item.kind !== "count") return labelOf(item);
  return item.value === 1 ? "1 dot" : `${item.value} dots`;
}

/** The answer, as a thing rather than an id. Undefined only if content is broken. */
export function answerItemOf(challenge: Challenge): ContentItem | undefined {
  const { payload } = challenge;
  if (payload.kind !== "choice") return undefined;
  return payload.options.find((option) => option.id === payload.answerId)?.item;
}

/**
 * Is this it?
 *
 * Marking lives with the content, not the engine: an engine knows how to draw
 * four tiles and report which was tapped, and should never have to know what
 * makes an answer right.
 */
export function checkAnswer(challenge: Challenge, answer: Answer): boolean {
  const { payload } = challenge;
  if (payload.kind !== answer.kind) return false;

  switch (payload.kind) {
    case "choice":
      return answer.kind === "choice" && answer.optionId === payload.answerId;

    case "order":
      return (
        answer.kind === "order" &&
        answer.itemIds.length === payload.answerOrder.length &&
        payload.answerOrder.every((id, index) => answer.itemIds[index] === id)
      );

    case "match":
      /* Every pair found, each once. Order is not part of the question. */
      return (
        answer.kind === "match" &&
        new Set(answer.pairIds).size === payload.pairs.length &&
        payload.pairs.every((pair) => answer.pairIds.includes(pair.id))
      );

    case "connect":
      /* Every line drawn is a real one, and every one is drawn. The same two
         halves `checkStep` asks the first of, which is the whole relationship
         between the two functions: right so far, and finished. */
      return (
        answer.kind === "connect" &&
        checkStep(challenge, answer) &&
        answer.links.length === payload.pairs.length
      );
  }
}

/**
 * Is what the child has done *so far* still right?
 *
 * The same seam as `checkAnswer`, asked one question earlier, and it exists
 * because some gestures are finished in one move and some are not. A tap is
 * the whole of a `choice` answer, so for that kind the two functions are the
 * same question. Joining three pairs of things is three moves, and a child who
 * has drawn one line has neither answered the board nor got it wrong — a
 * distinction `checkAnswer` cannot make, because "not finished" and "wrong"
 * are both `false` to it.
 *
 * It is deliberately not `checkConnectAnswer`. Every multi-move gesture we can
 * see coming needs exactly this — is this letter in the right place yet, is
 * this shape in the right bucket, is this line a real pair — so the question
 * belongs to the seam rather than to one engine, and `order` and `match`
 * answer it here already for the day their engines exist.
 *
 * Marking still lives with the content: an engine calls this, it never
 * reimplements it.
 */
export function checkStep(challenge: Challenge, answer: Answer): boolean {
  const { payload } = challenge;
  if (payload.kind !== answer.kind) return false;

  switch (payload.kind) {
    case "choice":
      /* One move, so there is no "so far": the tap is the answer. */
      return answer.kind === "choice" && answer.optionId === payload.answerId;

    case "order":
      /* A prefix of the right order. Wrong the moment one is out of place. */
      return (
        answer.kind === "order" &&
        answer.itemIds.length <= payload.answerOrder.length &&
        answer.itemIds.every((id, index) => payload.answerOrder[index] === id)
      );

    case "match":
      return (
        answer.kind === "match" &&
        new Set(answer.pairIds).size === answer.pairIds.length &&
        answer.pairIds.every((id) =>
          payload.pairs.some((pair) => pair.id === id),
        )
      );

    case "connect":
      /* Each line joins two nodes the content says belong together, and no
         node is used twice. Nothing here knows why they belong together. */
      return (
        answer.kind === "connect" &&
        new Set(answer.links.map((link) => link.leftId)).size ===
          answer.links.length &&
        new Set(answer.links.map((link) => link.rightId)).size ===
          answer.links.length &&
        answer.links.every((link) =>
          payload.pairs.some(
            (pair) =>
              pair.leftId === link.leftId && pair.rightId === link.rightId,
          ),
        )
      );
  }
}

/**
 * What makes two challenges the same question to a child.
 *
 * Ids cannot answer that: a generator asked for twenty sums will happily make
 * `2 + 3` twice under two ids. This is the key `drawChallenges` de-duplicates
 * on, and it deliberately ignores where on the board the answer landed.
 *
 * Where the question lives depends on the challenge. When there is a display,
 * the display *is* the question — `2 + 3` asked twice is a repeat however the
 * distractors change. When there is not, as in "which one is different?", the
 * question is entirely in the tiles, so the tiles are the key.
 */
export function challengeKey(challenge: Challenge): string {
  const { prompt, payload } = challenge;
  const display = (prompt.display ?? [])
    .map((part) =>
      part.kind === "item"
        ? labelOf(part.item)
        : part.kind === "symbol"
          ? SYMBOL_GLYPHS[part.symbol]
          : "_",
    )
    .join(" ");

  const answerItem = answerItemOf(challenge);
  const answer =
    payload.kind === "choice"
      ? (answerItem ? labelOf(answerItem) : "")
      : payload.kind === "order"
        ? payload.answerOrder.join(",")
        : payload.kind === "match"
          ? payload.pairs.map((pair) => pair.id).join(",")
          : /* Sorted, because which line was authored first is not the
               question — the set of joins is. */
            payload.pairs
              .map((pair) => `${pair.leftId}>${pair.rightId}`)
              .sort()
              .join(",");

  /* Sorted, so the same board shuffled twice is still the same board. */
  const board =
    display || payload.kind !== "choice"
      ? ""
      : payload.options
          .map((option) => labelOf(option.item))
          .sort()
          .join(",");

  return `${prompt.speech}|${display}|${board}|${answer}`;
}

/**
 * The prefix that marks a tag as a concept name. See `conceptKey`.
 */
const CONCEPT_TAG = "concept:";

/**
 * What makes two challenges the same *idea*.
 *
 * `challengeKey` asks whether a child would notice a repeat. This asks the
 * harder question: whether there is anything new to learn. They are not the
 * same question, and patterns are where they come apart — `A B A B ?` and
 * `B A B A ?` are two different boards and one single rule, and counting them
 * as two would be counting the shuffle rather than the content.
 *
 * So an activity that knows better may say so, by tagging a challenge
 * `concept:<name>`. Everything else falls back to `challengeKey`, which is the
 * right answer when every board really is its own question — `2 + 3` and
 * `4 + 1` are two sums however you count them.
 *
 * Nothing in the product reads this. It is how a pack's content is measured.
 */
export function conceptKey(challenge: Challenge): string {
  const tag = challenge.meta?.tags?.find((entry) => entry.startsWith(CONCEPT_TAG));
  return tag ? `${challenge.activityId}|${tag.slice(CONCEPT_TAG.length)}` : challengeKey(challenge);
}

/**
 * Move the answer around the board.
 *
 * Authored content is written answer-first, because that is how a question is
 * written down. Dealt that way it would teach a child to tap the left-hand
 * tile, so a seeded deal moves it. Generated content already shuffles its own
 * options; this is the same courtesy for content that could not.
 *
 * `challengeKey` sorts the board before comparing, so this never affects
 * de-duplication.
 */
function dealOptions(challenge: Challenge, rng: Rng): Challenge {
  const { payload } = challenge;
  if (payload.kind !== "choice") return challenge;
  return {
    ...challenge,
    payload: { ...payload, options: rng.shuffle(payload.options) },
  };
}

export interface DrawOptions {
  /** Snapped to the nearest level the activity offers. */
  level: Level;
  /** How many to deal. Static activities give fewer if they have fewer. */
  count: number;
  /**
   * Leave it out and every draw is the same, which is what the server wants.
   * Pass a seeded one on mount for a game that should differ each time.
   */
  rng?: Rng;
}

/** How hard we try before accepting a repeat from a small generator. */
const DEDUPE_ATTEMPTS = 8;

/**
 * Deal a set to play.
 *
 * The one call a game makes. Static content is filtered and shuffled;
 * generated content is run; both come back as the same array of challenges,
 * de-duplicated so the same sum never arrives twice in one round.
 */
export function drawChallenges(
  activity: Activity,
  options: DrawOptions,
): Challenge[] {
  const level = resolveLevel(options.level, activity.levels);
  const count = Math.max(0, Math.floor(options.count));
  if (count === 0) return [];

  /* No seed means "give me the same thing every time": a server render, a
     test, a screenshot. `drawChallenges` is never allowed to reach for
     `Math.random` itself — the caller decides whether a draw is repeatable. */
  const rng = options.rng ?? createRng(0);

  if (activity.source === "static") {
    const atLevel = activity.challenges.filter((c) => c.level === level);
    const pool = atLevel.length > 0 ? atLevel : activity.challenges;
    const dealt = (options.rng ? rng.shuffle(pool) : [...pool]).slice(0, count);
    return options.rng ? dealt.map((challenge) => dealOptions(challenge, rng)) : dealt;
  }

  const drawn: Challenge[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < count; index++) {
    let candidate = activity.generate({ level, rng, index });

    /* A generator with a small space — "which is bigger, 1 or 2?" — runs out
       of distinct questions. Try a few more times, then take the repeat
       rather than loop for ever or hand back a short round. */
    for (
      let attempt = 0;
      attempt < DEDUPE_ATTEMPTS && seen.has(challengeKey(candidate));
      attempt++
    ) {
      candidate = activity.generate({
        level,
        rng,
        index: index + (attempt + 1) * count,
      });
    }

    seen.add(challengeKey(candidate));
    drawn.push(candidate);
  }

  return drawn;
}
