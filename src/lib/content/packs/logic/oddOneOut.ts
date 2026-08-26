import { CHARACTERS } from "@/data/characters";
import { ACCENT_WORDS } from "@/lib/accents";
import { defineGeneratedActivity } from "../../activity";
import { forLevel, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ContentItem } from "../../types";
import {
  board,
  COLOUR_PAIRS,
  COLOURS,
  concept,
  dotWords,
  FRIENDS,
  SHAPES,
  wordSym,
  type Sym,
} from "./shared";
import { groupsBeside, WORD_GROUPS } from "./words";

/**
 * Odd one out — three things alike, one thing not.
 *
 * The rule always comes first. A board is never four things thrown together
 * and inspected afterwards for a difference; it is a rule — *these are all the
 * same shape except one* — with the tiles derived from it. That is the only
 * way "objectively defensible" can be a property of the activity rather than
 * an opinion about a particular board.
 *
 * Five rules, and each one is a single difference:
 *
 * - **shape** — same colour follows the shape, so the odd tile differs twice
 *   over. Deliberate: the difference must be visible to a child who cannot
 *   tell the colours apart, and to one who cannot yet name the shapes.
 * - **colour** — one shape, one hue for three tiles and another for the
 *   fourth, drawn from `COLOUR_PAIRS`: the pairs that survive protanopia,
 *   deuteranopia and tritanopia. Half the palette's pairs do not, and a board
 *   whose answer a child cannot see is not a question.
 * - **count** — one hue, one shape of pip, and a different number of them.
 * - **friend** — three of one, one of another.
 * - **words** — three from one group, one from another, out of `words.ts`.
 *
 * Nothing subjective can be expressed here. There is no rule for "which is
 * nicest" because there is no rule for it, and a board with no rule cannot be
 * built by a thing that starts from rules.
 */

type RuleId = "shape" | "colour" | "count" | "friend" | "words";

interface OddBoard {
  /** The answer. */
  odd: Sym;
  /** The three (or two) that belong together. */
  others: Sym[];
  explanation: string;
  hint: string;
  /** The parts of the concept name. See `concept` in `shared.ts`. */
  idea: readonly (string | number)[];
}

/**
 * The same thing, several times, on tiles that can still be told apart.
 *
 * Three identical circles need three different option ids or the board is
 * malformed, and they need three identical *labels* or `challengeKey` would
 * think two identical boards were different questions. So the copy number
 * lives in the id and nowhere else.
 */
function copies(item: ContentItem, key: string, count: number): Sym[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `${key}#${index + 1}`,
    item,
  }));
}

/* ------------------------------------------------------------------ rules */

function byShape(rng: Rng, others: number): OddBoard {
  const [majority, odd] = rng.some(SHAPES, 2);
  return {
    odd: { key: odd, item: { kind: "shape", shape: odd } },
    others: copies({ kind: "shape", shape: majority }, majority, others),
    explanation: `The others are all ${majority}s.`,
    hint: "Look at the shapes. Three of them are the same.",
    idea: ["oddoneout", "shape", majority, odd],
  };
}

function byColour(rng: Rng, others: number): OddBoard {
  /* One shape for the whole board, so colour is the only thing that moves. */
  const shape = rng.pick(SHAPES) ?? "circle";
  /* A pair off the safe list, either way round — see `COLOUR_PAIRS`. This is
     the one rule here whose answer is carried by colour and nothing else, so
     it is the one rule that has to care how the colours are seen. */
  const pair = rng.pick(COLOUR_PAIRS) ?? COLOUR_PAIRS[0];
  const [majority, odd] = rng.next() < 0.5 ? pair : [pair[1], pair[0]];
  const word = ACCENT_WORDS[majority].toLowerCase();

  return {
    odd: {
      key: `${shape}-${odd}`,
      item: { kind: "shape", shape, accent: odd },
    },
    others: copies(
      { kind: "shape", shape, accent: majority },
      `${shape}-${majority}`,
      others,
    ),
    explanation: `The others are all ${word}.`,
    hint: "Look at the colours. Three of them are the same.",
    idea: ["oddoneout", "colour", majority, odd],
  };
}

function byCount(rng: Rng, others: number, gap: number): OddBoard {
  const accent = rng.pick(COLOURS) ?? "tide";
  const majority = rng.int(1, 5);
  const choices = [1, 2, 3, 4, 5].filter(
    (value) => Math.abs(value - majority) >= gap,
  );
  const odd = rng.pick(choices) ?? (majority === 5 ? 1 : 5);

  return {
    odd: { key: `count-${odd}`, item: { kind: "count", value: odd, accent } },
    others: copies(
      { kind: "count", value: majority, accent },
      `count-${majority}`,
      others,
    ),
    explanation: `The others all have ${dotWords(majority)}.`,
    hint: "Count the dots on each one.",
    idea: ["oddoneout", "count", majority, odd],
  };
}

function byFriend(rng: Rng, others: number): OddBoard {
  const [majority, odd] = rng.some(FRIENDS, 2);
  return {
    odd: { key: `friend-${odd}`, item: { kind: "character", characterId: odd } },
    others: copies(
      { kind: "character", characterId: majority },
      `friend-${majority}`,
      others,
    ),
    explanation: `The others are all ${CHARACTERS[majority].name}.`,
    hint: "Look at the friends. Three of them are the same one.",
    idea: ["oddoneout", "friend", majority, odd],
  };
}

function byWords(rng: Rng, others: number): OddBoard {
  const majority = rng.pick(WORD_GROUPS) ?? WORD_GROUPS[0];
  const beside = groupsBeside(majority);
  const oddGroup = rng.pick(beside) ?? beside[0];

  const oddWord = rng.pick(oddGroup.words) ?? oddGroup.words[0];

  return {
    odd: wordSym(oddWord),
    others: rng.some(majority.words, others).map(wordSym),
    explanation: `The others are all ${majority.all}.`,
    hint: "Think about what each one is. Three of them go together.",
    idea: ["oddoneout", "words", majority.id, oddWord],
  };
}

/* --------------------------------------------------------------- activity */

/**
 * Which rules each level may use.
 *
 * Level 1 is entirely visual: a four year old who cannot read yet can answer
 * every board it can deal. Words arrive at level 2 alongside the pictures, and
 * level 3 keeps the two rules that need real looking — a colour among colours,
 * and counts a single pip apart — plus the words.
 */
const RULES: LevelTable<readonly RuleId[]> = {
  1: ["shape", "count", "friend"],
  2: ["shape", "colour", "count", "friend", "words"],
  3: ["colour", "count", "words"],
};

const TILES: LevelTable<number> = { 1: 3, 2: 4, 3: 4 };

/** How far apart the counts must be. One pip apart is a level 3 question. */
const COUNT_GAP: LevelTable<number> = { 1: 2, 2: 2, 3: 1 };

export const oddOneOutActivity = defineGeneratedActivity({
  id: "odd-one-out",
  packId: "logic",
  category: "logic",
  activityType: "odd-one-out",
  kind: "choice",
  ageRange: { min: 4, max: 8 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }) => {
    const rules = forLevel(RULES, level, RULES[1] ?? ["shape"]);
    const rule = rng.pick(rules) ?? "shape";
    const others = forLevel(TILES, level, 3) - 1;

    const built =
      rule === "shape"
        ? byShape(rng, others)
        : rule === "colour"
          ? byColour(rng, others)
          : rule === "count"
            ? byCount(rng, others, forLevel(COUNT_GAP, level, 2))
            : rule === "friend"
              ? byFriend(rng, others)
              : byWords(rng, others);

    return {
      level,
      prompt: { speech: "Which one is different?" },
      payload: board(built.odd, built.others, rng),
      explanation: built.explanation,
      hint: built.hint,
      meta: {
        objective: "spots the one that does not belong",
        tags: ["odd-one-out", concept(...built.idea)],
      },
    };
  },
});
