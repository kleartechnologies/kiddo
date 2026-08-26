import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { forLevel, type Level, type LevelTable } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { boardIsDrawn, narrowToDrawn } from "../../art";
import { wordPicture } from "../../vocabulary";
import { PHONICS_WORDS, SAME_SOUND, type PhonicsWord } from "./phonics";
import { letterId, namedLetter } from "./shared";

/**
 * Pictures and the letter each one starts with.
 *
 * The board form of `beginning-sounds`, and the same authored table read a
 * second way. The quiz shows one word and offers three letters; this lays four
 * pictures beside four letters, and every letter belongs to exactly one
 * picture — so a letter given to the wrong picture is a letter the right one
 * then cannot have, and the board closes only when all four sounds have
 * actually been heard.
 *
 * It also removes the last piece of reading from the question. The quiz shows
 * the word DOG and asks what it starts with; a child who can read has been
 * given the answer. A picture of a dog gives away nothing, so what is left is
 * the sound — which is the whole objective.
 *
 * Same `phonics` activity type as the quiz, because it is the same thing to
 * know. `ConnectStage` draws it and no engine was touched.
 *
 * ## The two rules that keep a board fair
 *
 * **Every picture is a thing a child would name with one word and no other.**
 * The pool is the words in `phonics.ts` that carry a `glyph`, and most do not:
 * RED is not a thing, JET is a plane to a four year old, and 🍯 is honey
 * however much it looks like JAM. A picture that could be named two ways is a
 * board with no right answer, so it is simply not in the pool.
 *
 * **No two letters on a board can say each other's sound.** `SAME_SOUND` is
 * the same table the quiz uses: C and K both say /k/, C and S both say /s/, G
 * and J both say /dʒ/. A board holding a cat and a sun could be finished by
 * joining C to the sun and being told it is wrong while being right, so the
 * chooser refuses it.
 *
 * ## How a level gets harder
 *
 * | | pairs | letters |
 * |-|-------|---------|
 * |1| 3 | the sounds a child meets first: B C D H M P S |
 * |2| 4 | and F G L N T |
 * |3| 5 | and R V W — all fifteen the pictures cover |
 *
 * More cards, and less familiar sounds. No clock, no streak: a line that is
 * not right does not stay, and the next try costs nothing.
 */

/** How many lines a board asks for. */
const PAIRS: LevelTable<number> = { 1: 3, 2: 4, 3: 5 };

/** The sounds each level may deal, in the order a child usually meets them. */
const FIRST = ["B", "C", "D", "H", "M", "P", "S"] as const;
const NEXT = ["F", "G", "L", "N", "T"] as const;
const REST = ["R", "V", "W"] as const;

function soundsAtLevel(level: Level): readonly string[] {
  if (level <= 1) return FIRST;
  if (level === 2) return [...FIRST, ...NEXT];
  return [...FIRST, ...NEXT, ...REST];
}

/**
 * Every picture word in the pack: the pool this activity deals from, and the
 * honest count of what a board can be made of.
 *
 * The facts learned here are the *sounds*, not the pictures — there are
 * fifteen of those — but a child who has met a dog, a duck and a door has met
 * /d/ three ways, so the pictures are worth counting too.
 */
export const PICTURE_WORDS: readonly PhonicsWord[] = PHONICS_WORDS.filter(
  (entry) => entry.glyph,
);

/** Could these two letters be confused for each other on one board? */
function clash(a: string, b: string): boolean {
  return a === b || (SAME_SOUND[a] ?? []).includes(b) || (SAME_SOUND[b] ?? []).includes(a);
}

/**
 * Choose the pictures for one board.
 *
 * One picture per sound, and no sound that could be answered by a letter
 * already on the board. Greedy over a shuffled pool with retries, the shape
 * `english/rhyming.ts` uses: a greedy walk can run out of usable sounds, and a
 * board one line short is merely easier where a clashing one is unfair.
 */
function chooseBoard(level: Level, rng: Rng, drawnOnly = false): PhonicsWord[] {
  const allowed = new Set(soundsAtLevel(level));
  const pool = PICTURE_WORDS.filter(
    (entry) =>
      allowed.has(entry.sound) &&
      (!drawnOnly || wordPicture(entry.word)?.art !== undefined),
  );
  const count = forLevel(PAIRS, level, 5);

  let best: PhonicsWord[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: PhonicsWord[] = [];
    const sounds: string[] = [];

    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (sounds.some((sound) => clash(sound, candidate.sound))) continue;
      sounds.push(candidate.sound);
      picked.push(candidate);
    }

    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/**
 * The order the letters are laid out in.
 *
 * Shuffled apart from the pictures and *deranged* from three lines up, so no
 * letter ever sits opposite its own picture and joining straight across is
 * never accidentally right.
 */
function displace(chosen: readonly PhonicsWord[], rng: Rng): PhonicsWord[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board: the *set* of sounds it practises,
 * sorted, so the same four pictures dealt down the columns another way is one
 * concept and not twenty-four.
 */
function conceptOf(chosen: readonly PhonicsWord[]): string {
  const facts = chosen.map((entry) => `${entry.word.toLowerCase()}>${entry.sound}`).sort();
  return `concept:begins-board:${facts.join("+")}`;
}

const pictureId = (entry: PhonicsWord) => `picture-${entry.word.toLowerCase()}`;

export const soundPartnersActivity = defineGeneratedActivity({
  id: "sound-partners",
  packId: "english",
  category: "english",
  activityType: "phonics",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "pip",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    /* The entry-level coin the other boards toss (`narrowToDrawn`) still
       decides which sounds level one is dealt from, so every sound is still
       dealt at every level it was dealt at before. What the board is drawn
       with is then read off the pictures that came out: all of them or none.

       Never half of each, even though the right column is letters and nothing
       here could leak. A column carrying two illustrations and three emoji is
       the mixture the visual system exists to refuse, whatever it does or does
       not give away. The letter column is never drawn over at all: the letter
       is the objective. */
    const wanted = forLevel(PAIRS, level, 5);
    let chosen = narrowToDrawn(level, rng) ? chooseBoard(level, rng, true) : [];
    if (chosen.length < wanted) chosen = chooseBoard(level, rng);

    const illustrated = boardIsDrawn(
      chosen.map((entry) => wordPicture(entry.word)?.art),
    );

    const left: ConnectNode[] = chosen.map((entry) => ({
      id: pictureId(entry),
      item: {
        kind: "picture",
        glyph: entry.glyph as string,
        label: entry.word.toLowerCase(),
        ...(illustrated ? { art: wordPicture(entry.word)?.art } : {}),
      },
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((entry) => ({
      id: letterId(entry.sound),
      item: namedLetter(entry.sound),
    }));

    const pairs: ConnectPair[] = chosen.map((entry) => ({
      leftId: pictureId(entry),
      rightId: letterId(entry.sound),
    }));

    const example = chosen[0];

    return {
      level,
      prompt: { speech: "Can you join each picture to the letter it starts with?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: example
        ? `Every picture found its letter. ${example.word} starts with ${example.sound}.`
        : "Every picture found its letter.",
      hint: "Say what the picture is out loud. What sound does it start with?",
      meta: {
        objective: "joins each picture to the letter its name starts with",
        tags: ["family:letter", conceptOf(chosen)],
      },
    };
  },
});
