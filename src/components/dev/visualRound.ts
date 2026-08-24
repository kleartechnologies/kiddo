import type { SessionPlan } from "@/lib/content/session";
import type { MixedStep } from "./mixedRound";

/**
 * The upgraded activities, each shown at the level where its picture is
 * doing the most and again at the level where it has gone.
 *
 * Same shape as `mixedRound.ts` and `batchRound.ts`, same page, same
 * `drawSession`, and — the point of the round — no new engine, no new stage and
 * no new content. Every board below is an activity that already existed, dealt
 * at a level that already existed. What changed is what it is drawn *with*.
 *
 * ## What it is for
 *
 * One question, which is the question the visual phase has to answer with
 * something other than a screenshot: **does the picture go away?** A scaffold
 * that stays is not a scaffold, and the only way to see the difference is to
 * put level one next to level two and look. So the round is arranged in pairs,
 * and `scripts/measure-visual.mjs` walks it on eight screens.
 *
 * ## Why home-partners appears twice at the same level
 *
 * Because `narrowToDrawn` is a coin. About half of that activity's level-one
 * boards are dealt from the facts the library can draw end to end and are
 * wholly illustrated; the rest are dealt from the whole level-one pool and are
 * wholly glyph, so the monkey does not lose its place at level one. Two
 * consecutive slots is how you watch both halves happen — and how a reviewer
 * checks the thing that actually matters, which is that a board is never half
 * of each.
 *
 * Nothing here is a game. It is not in `data/games.ts`, it has no route under
 * `/play`, and the home screen has never heard of it.
 */
export const VISUAL_ROUND: readonly MixedStep[] = [
  /* MODE 1, both columns. Zero reading on the board at all. */
  { level: 1, from: ["general-knowledge.home-partners"], travel: true, label: "connect · L1" },
  { level: 1, from: ["general-knowledge.home-partners"], travel: true, label: "connect · L1" },
  { level: 2, from: ["general-knowledge.home-partners"], travel: true, label: "connect · L2" },

  /* MODE 1 on the left, MODE 3 on the right: the word *is* the objective. */
  { level: 1, from: ["general-knowledge.animal-babies"], label: "connect · L1" },
  { level: 2, from: ["general-knowledge.animal-babies"], label: "connect · L2" },

  /* The whole ladder inside one activity: drawn things, then emoji, then pips. */
  { level: 1, from: ["math.counting-objects"], label: "choice · L1" },
  { level: 2, from: ["math.counting-objects"], label: "choice · L2" },
  { level: 3, from: ["math.counting-objects"], label: "choice · L3" },

  /* MODE 2: the letter is the item and the picture hangs above it. */
  { level: 1, from: ["english.alphabet-order"], label: "order · L1" },
  { level: 3, from: ["english.alphabet-order"], label: "order · L3" },

  /* MODE 2 again, and the most careful one: a picture cannot carry a sound. */
  { level: 1, from: ["english.rhyming-partners"], label: "connect · L1" },
  { level: 2, from: ["english.rhyming-partners"], label: "connect · L2" },

  /* MODE 1 on the left, letters on the right: the picture is heard, never
     read, and the letter is never drawn over. Twice at level one for the
     same reason home-partners deals twice — the coin has two sides. */
  { level: 1, from: ["english.sound-partners"], label: "connect · L1" },
  { level: 1, from: ["english.sound-partners"], label: "connect · L1" },
  { level: 2, from: ["english.sound-partners"], label: "connect · L2" },

  /* The prompt anchor (Phase 9): the sun above `S _ N`. Level one may draw
     the anchor; level two keeps its glyph, and the letter scaffold has gone. */
  { level: 1, from: ["english.spelling"], label: "choice · anchored L1" },
  { level: 2, from: ["english.spelling"], label: "choice · anchored L2" },

  /* Not one of the five. A quiz board, to show `layout: "subject"` — the
     question that is one thing to look at rather than a line to read. */
  { level: 1, from: ["general-knowledge.animal-homes"], label: "choice · subject" },
];

/** The same round with the two fields `SessionSlot` has never had. */
export const VISUAL_PLAN: SessionPlan = {
  slots: VISUAL_ROUND.map(({ level, from }) => ({ level, from })),
};
