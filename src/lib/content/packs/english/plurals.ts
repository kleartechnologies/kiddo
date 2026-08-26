import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import { board, part, wordId, wordItem } from "./shared";

/**
 * One and more than one.
 *
 * One CAT, two CATS. It looks like a spelling rule and it is a grammar one:
 * English marks *how many* on the end of the noun, and a child who has not
 * noticed that says "two foots" for a year. Noticing it is the objective, and
 * the three levels are the three things there are to notice — the rule, the
 * exception the rule needs after a hissing sound, and the handful of words
 * that ignore both.
 *
 * A `choice`, drawn by `ChoiceStage` with nothing new in it.
 *
 * ## Why one of the wrong tiles is not a word
 *
 * Because it is the mistake. Offered CATS, CAT and CATES, a child who taps CAT
 * has not yet noticed the marking; a child who taps CATES has noticed it and
 * reached for the wrong one. Both are answers worth being able to make, and
 * neither is punished — the tile simply does not settle, and the next tap
 * costs nothing.
 *
 * The wrong forms are generated from the entry rather than authored, so they
 * are always *this* word's plausible mistake and never a random string: the
 * singular itself, and the ending the other rule would have given it.
 *
 * ## How a level gets harder
 *
 * | | what is being learned |
 * |-|-----------------------|
 * |1| the rule: add S |
 * |2| the exception: add ES after S, X, SH and CH |
 * |3| the words that do neither: MOUSE and MICE, FOOT and FEET |
 *
 * Grammar, not speed. Nothing on this board is timed and nothing is counted.
 *
 * ## What is deliberately not here
 *
 * SHEEP and FISH, whose plural is the singular unchanged. They are real and
 * they are worth knowing, and they cannot be asked this way: the right answer
 * and the wrong one would be the same tile twice. They are written down in
 * `docs/content-universe.md` as something a later interaction could ask.
 */

/** A noun and the word for more than one of it. */
interface Plural {
  one: string;
  many: string;
  /** 1 adds S, 2 adds ES, 3 does neither. Also the level it is taught at. */
  level: 1 | 2 | 3;
}

const PLURALS: readonly Plural[] = [
  /* Level 1 — the rule. Add S. Every noun here ends in a consonant, so the
     wrong tile built from it (CATES, SOCKES) is plainly not a word. Nouns
     ending in E are not on this list: the mistake would come out TREEES. */
  { one: "CAT", many: "CATS", level: 1 },
  { one: "DOG", many: "DOGS", level: 1 },
  { one: "FROG", many: "FROGS", level: 1 },
  { one: "DUCK", many: "DUCKS", level: 1 },
  { one: "BIRD", many: "BIRDS", level: 1 },
  { one: "BOOK", many: "BOOKS", level: 1 },
  { one: "CUP", many: "CUPS", level: 1 },
  { one: "BALL", many: "BALLS", level: 1 },
  { one: "BOAT", many: "BOATS", level: 1 },
  { one: "FLAG", many: "FLAGS", level: 1 },
  { one: "DRUM", many: "DRUMS", level: 1 },
  { one: "SOCK", many: "SOCKS", level: 1 },
  { one: "HAND", many: "HANDS", level: 1 },
  { one: "TENT", many: "TENTS", level: 1 },

  /* Level 2 — the exception. A hissing sound at the end needs ES to be
     sayable at all: BOXS cannot be pronounced, BOXES can. */
  { one: "BOX", many: "BOXES", level: 2 },
  { one: "BUS", many: "BUSES", level: 2 },
  { one: "FOX", many: "FOXES", level: 2 },
  { one: "DISH", many: "DISHES", level: 2 },
  { one: "BRUSH", many: "BRUSHES", level: 2 },
  { one: "BENCH", many: "BENCHES", level: 2 },
  { one: "WATCH", many: "WATCHES", level: 2 },

  /* Level 3 — the ones that do neither. Old words, learned one at a time. */
  { one: "MOUSE", many: "MICE", level: 3 },
  { one: "FOOT", many: "FEET", level: 3 },
  { one: "TOOTH", many: "TEETH", level: 3 },
  { one: "CHILD", many: "CHILDREN", level: 3 },
  { one: "MAN", many: "MEN", level: 3 },
  { one: "WOMAN", many: "WOMEN", level: 3 },
  { one: "GOOSE", many: "GEESE", level: 3 },
];

/**
 * The honest content count: twenty-eight nouns and the word for more than one
 * of each. Not the boards — a board is one of these with two wrong tiles.
 */
export const PLURAL_WORDS: readonly Plural[] = PLURALS;

/** Which nouns a level may ask about. Exactly the ones authored for it. */
function poolAtLevel(level: Level): readonly Plural[] {
  const wanted = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return PLURALS.filter((entry) => entry.level === wanted);
}

/**
 * The mistakes worth offering for one noun.
 *
 * Always the singular — the child who has not noticed the marking at all —
 * and then the ending the rule this word does *not* follow would have given
 * it: CATES for a word that only wants S, BOXS for one that needs ES, MOUSES
 * for one that wants neither. Which forms come out is decided by the table
 * above rather than here: every noun on it was chosen so that its wrong form
 * is not also a real English word, which is why HAT (HATES) and CAR (CARES)
 * are not on the list.
 */
function mistakes(entry: Plural): string[] {
  /* The singular is always one of them. The other is the ending the rule this
     word does not follow would have given it. */
  const other = entry.level === 2 ? `${entry.one}S` : `${entry.one}ES`;
  const wrong = entry.level === 3 ? [entry.one, `${entry.one}S`] : [entry.one, other];

  return wrong.filter((word) => word !== entry.many);
}

/** Three tiles throughout: there are only ever two mistakes worth making. */
const TILES: LevelTable<number> = { 1: 3, 2: 3, 3: 3 };

export const pluralsActivity = defineGeneratedActivity({
  id: "plurals",
  packId: "english",
  category: "english",
  activityType: "singular-plural",
  kind: "choice",
  ageRange: { min: 5, max: 8 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const pool = poolAtLevel(level);
    const entry = pool[rng.int(0, pool.length - 1)];
    const tiles = forLevel(TILES, level, 3);
    const wrong = mistakes(entry).slice(0, tiles - 1);

    return {
      level,
      prompt: {
        /* The singular is shown and the question is said, so a child who
           cannot yet read the tiles still knows what is being asked. */
        speech: `Here is one ${entry.one}. What do we call more than one?`,
        display: [part(wordItem(entry.one))],
      },
      payload: board(entry.many, wrong, rng, wordItem, wordId),
      explanation: `One ${entry.one}, two ${entry.many}.`,
      hint: `Say it out loud: one ${entry.one}, two...?`,
      meta: {
        objective: `knows the word for more than one ${entry.one}`,
        tags: ["family:word", `concept:plural:${entry.one.toLowerCase()}`],
      },
    };
  },
});
