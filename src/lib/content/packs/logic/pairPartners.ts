import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { concept, type Sym } from "./shared";

/**
 * Things that go together.
 *
 * A key and a lock, a sock and a shoe, a bee and a flower. The child is not
 * being asked which group a thing belongs to — that is `sorting`, and the two
 * things here are usually in different groups entirely — but whether they
 * *work together in the world*. It is the first relational reasoning a child
 * does, and it is the one bit of Logic that cannot be got at by looking
 * carefully at the board: nothing about the picture of a key says lock.
 *
 * A `connect`, drawn by `ConnectStage`. Nothing new was built for it — the
 * board is the same bijection `home-partners` has been dealing for phases,
 * with a different table behind it.
 *
 * ## Why these pairs and not others
 *
 * Every pair below is *symmetric and exclusive*: the two things go with each
 * other and, on the board they are dealt to, with nothing else. That is
 * stricter than "these are related", and it is what `avoid` is for — a cat
 * goes with milk, a baby goes with a bottle, and a board holding both has two
 * defensible lines through it. A pair that could only be defended by a grown-up
 * explaining it is not on the list.
 *
 * Nothing here needs a culture to decode. A postbox is red in some countries
 * and yellow in others, and a letter still goes in it.
 *
 * ## How a level gets harder
 *
 * | | pairs | what is added |
 * |-|-------|---------------|
 * |1| 2 | pairs a three year old has handled: key, sock, bone, bottle, spoon |
 * |2| 3 | pairs from further off: rain, bees, a candle on a cake |
 * |3| 4 | pairs that need a small inference — sun to sunglasses, snow to gloves |
 *
 * Content, not clock. There is no timer on this board and nothing is taken
 * away for a line that does not hold: a line the child is unsure of can be
 * drawn, looked at, and drawn again.
 */

/* ------------------------------------------------------------------ tiles */

/** A picture and the word for it. The word is what a screen reader says. */
function pic(glyph: string, label: string): Sym {
  return { key: label, item: { kind: "picture", glyph, label } };
}

const THINGS = {
  key: pic("🔑", "a key"),
  lock: pic("🔒", "a lock"),
  sock: pic("🧦", "a sock"),
  shoe: pic("👟", "a shoe"),
  dog: pic("🐕", "a dog"),
  bone: pic("🦴", "a bone"),
  baby: pic("👶", "a baby"),
  bottle: pic("🍼", "a baby bottle"),
  bowl: pic("🥣", "a bowl"),
  spoon: pic("🥄", "a spoon"),
  pencil: pic("✏️", "a pencil"),
  paper: pic("📄", "a piece of paper"),
  umbrella: pic("☂️", "an umbrella"),
  rain: pic("🌧️", "rain"),
  bee: pic("🐝", "a bee"),
  flower: pic("🌼", "a flower"),
  cake: pic("🎂", "a birthday cake"),
  candle: pic("🕯️", "a candle"),
  ball: pic("⚽", "a football"),
  goal: pic("🥅", "a goal net"),
  sun: pic("☀️", "the sun"),
  sunglasses: pic("🕶️", "sunglasses"),
  snow: pic("❄️", "snow"),
  gloves: pic("🧤", "gloves"),
  letter: pic("✉️", "a letter"),
  postbox: pic("📮", "a postbox"),
  cat: pic("🐈", "a cat"),
  milk: pic("🥛", "milk"),
} as const;

type ThingKey = keyof typeof THINGS;

/* ------------------------------------------------------------------ facts */

interface Goes {
  /** The tile in the left column. */
  thing: ThingKey;
  /** The tile in the right column. The one it goes with. */
  partner: ThingKey;
  /** Read out when the board is finished. "A key opens a lock." */
  because: string;
  /** Pairs that must never share a board with this one, by `thing`. */
  avoid?: readonly ThingKey[];
  level: 1 | 2 | 3;
}

const GOES: readonly Goes[] = [
  /* Level 1 — pairs a child has handled with their own hands. */
  { thing: "key", partner: "lock", because: "A key opens a lock.", level: 1 },
  { thing: "sock", partner: "shoe", because: "A sock goes on before a shoe.", level: 1 },
  { thing: "dog", partner: "bone", because: "A dog loves a bone.", level: 1 },
  {
    thing: "baby",
    partner: "bottle",
    because: "A baby drinks from a bottle.",
    /* Both are somebody drinking milk. On one board they are two answers. */
    avoid: ["cat"],
    level: 1,
  },
  {
    thing: "bowl",
    partner: "spoon",
    because: "You eat from a bowl with a spoon.",
    /* A cat drinks its milk from a bowl too. */
    avoid: ["cat"],
    level: 1,
  },

  /* Level 2 — pairs from a little further off. */
  { thing: "pencil", partner: "paper", because: "A pencil writes on paper.", level: 2 },
  {
    thing: "umbrella",
    partner: "rain",
    because: "An umbrella keeps the rain off you.",
    /* Both are weather to be dressed for, and a child who joins the umbrella
       to the snow has not made a mistake worth marking. */
    avoid: ["snow"],
    level: 2,
  },
  { thing: "bee", partner: "flower", because: "A bee visits a flower.", level: 2 },
  { thing: "cake", partner: "candle", because: "A candle goes on top of a birthday cake.", level: 2 },
  { thing: "ball", partner: "goal", because: "You kick the ball into the goal.", level: 2 },

  /* Level 3 — pairs that need a small step of working out. */
  { thing: "sun", partner: "sunglasses", because: "Sunglasses keep the bright sun out of your eyes.", level: 3 },
  {
    thing: "snow",
    partner: "gloves",
    because: "Gloves keep your hands warm in the snow.",
    avoid: ["umbrella"],
    level: 3,
  },
  { thing: "letter", partner: "postbox", because: "A letter goes into a postbox.", level: 3 },
  {
    thing: "cat",
    partner: "milk",
    because: "A cat laps up milk.",
    avoid: ["baby", "bowl"],
    level: 3,
  },
];

/**
 * The honest content count: fourteen relationships a child can learn.
 *
 * Not the boards. Fourteen pairs make hundreds of four-line boards, and a
 * board is an arrangement of facts rather than a fact.
 */
export const PAIR_FACTS: readonly Goes[] = GOES;

/* ------------------------------------------------------------------ board */

/** Two lines, then three, then four. The only lever this activity has. */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/** Which pairs a level may deal from. Level three is the whole table. */
function poolAtLevel(level: Level): readonly Goes[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return GOES.filter((entry) => entry.level <= ceiling);
}

/**
 * Whether two pairs can share a board.
 *
 * Read from both sides, so a fact only has to be written once: the cat says it
 * clashes with the baby, and that keeps the baby away from the cat as well.
 * Tiles are checked too — a board can never show the same picture twice,
 * whichever column it would land in.
 */
function clash(a: Goes, b: Goes): boolean {
  if (a.avoid?.includes(b.thing)) return true;
  if (b.avoid?.includes(a.thing)) return true;

  const tiles = new Set<ThingKey>([a.thing, a.partner]);
  return tiles.has(b.thing) || tiles.has(b.partner);
}

/**
 * Choose the pairs for one board.
 *
 * Greedy over a shuffled pool, refusing anything that clashes with what is
 * already down, with a handful of passes because a greedy walk can corner
 * itself. The pack's test deals every level across thousands of seeds and
 * proves a short board never comes out, so the fallback is the best attempt
 * rather than a relaxed rule.
 */
function joinable(pool: readonly Goes[], count: number, rng: Rng): Goes[] {
  let best: Goes[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: Goes[] = [];
    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (picked.some((taken) => clash(taken, candidate))) continue;
      picked.push(candidate);
    }
    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/**
 * The order the right-hand column is laid out in.
 *
 * Shuffled on its own, and on three lines and up *deranged* as well, so no
 * partner is ever left facing its own thing and joining straight across is
 * never accidentally right. Two lines are shuffled plainly: the only
 * derangement of two is the swap, so deranging them would make the answer
 * always the crossed one — a pattern to learn instead of a fact.
 */
function displace(chosen: readonly Goes[], rng: Rng): Goes[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

/**
 * The name of the idea behind a board.
 *
 * The *set* of relationships it practises, sorted — so the same three pairs
 * dealt to different rows is one concept and not three boards' worth. It is
 * not a way of counting: `PAIR_FACTS` is the number that means something to a
 * child, and the pack's test counts that.
 */
function conceptOf(chosen: readonly Goes[]): string {
  const facts = chosen.map((entry) => `${entry.thing}>${entry.partner}`).sort();
  return concept("goes-with", facts.join("+"));
}

export const pairPartnersActivity = defineGeneratedActivity({
  id: "pair-partners",
  packId: "logic",
  title: "Things that go together",
  category: "logic",
  activityType: "goes-together",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "foxy",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const chosen = joinable(poolAtLevel(level), pairsAtLevel(level), rng);

    const left: ConnectNode[] = chosen.map((entry) => ({
      id: `thing-${entry.thing}`,
      item: THINGS[entry.thing].item,
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((entry) => ({
      id: `partner-${entry.partner}`,
      item: THINGS[entry.partner].item,
    }));

    const pairs: ConnectPair[] = chosen.map((entry) => ({
      leftId: `thing-${entry.thing}`,
      rightId: `partner-${entry.partner}`,
    }));

    return {
      level,
      prompt: { speech: "Can you join the two things that go together?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: chosen.map((entry) => entry.because).join(" "),
      hint: "Think about using one of them. What would you need with it?",
      meta: {
        objective: "joins two things that are used together",
        tags: ["family:thing", conceptOf(chosen)],
      },
    };
  },
});
