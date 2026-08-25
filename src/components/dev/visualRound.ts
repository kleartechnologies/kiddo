import type { SessionPlan } from "@/lib/content/session";
import type { MixedStep } from "./mixedRound";

/**
 * The upgraded activities, each shown at two levels: the one where its picture
 * is doing the most, and one above it.
 *
 * Same shape as `mixedRound.ts` and `batchRound.ts`, same page, same
 * `drawSession`, and — the point of the round — no new engine, no new stage and
 * no new content. Every board below is an activity that already existed, dealt
 * at a level that already existed. What changed is what it is drawn *with*.
 *
 * ## What it is for
 *
 * One question: **does the drawing reach as far as the library does?** The
 * round used to ask the opposite one — *does the picture go away at level two*
 * — on the theory that a drawing was a scaffold to be withdrawn. It is not:
 * an emoji cow and a drawn cow ask a child for exactly the same thing, so all
 * the withdrawal bought was a KIDDO board with the platform's emoji font on
 * top of it. So the pairs stayed and their meaning inverted. Where a board's
 * whole pool is in the library it is drawn at every level, and where it is not
 * the board is wholly glyph; `scripts/measure-visual.mjs` walks the round on
 * eight screens and fails if a covered board arrives plain.
 *
 * The rungs that *are* pedagogy are still visible in it — counting drops to a
 * block of pips at level three, alphabet-order widens its window — and those
 * take something away from the child rather than restyling it.
 *
 * ## Why home-partners appears twice at the same level
 *
 * Because `narrowToDrawn` is a coin, and it still is: about half of that
 * activity's level-one boards are dealt from the facts the library can draw
 * end to end and the rest from the whole level-one pool, so the monkey does
 * not lose its place at level one. What changed is what comes out of the two
 * halves — both are now drawn, because level one's whole pool turned out to be
 * covered either way. Two consecutive slots is still how you watch the coin,
 * and how a reviewer checks the thing that matters most, which is that a board
 * is never half drawn and half glyph.
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

  /* The whole ladder inside one activity: drawn things, more drawn things from
     a wider pool, then the pips — which are the rung that removes something. */
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

  /* The prompt anchor (Phase 9): the sun above `S _ N`. Drawn at both levels
     when the word is one the library knows — the anchor is context and never a
     scaffold — while the letter scaffold underneath it does still go. */
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
