import type { Activity, ContentPack } from "../../types";
import { letterPartnersActivity } from "./letters";
import { oppositePartnersActivity } from "./opposites";
import { quantityPartnersActivity } from "./quantities";
import { soundPartnersActivity } from "./sounds";

/**
 * The Match pack: correspondences, learned by pairing rather than by picking.
 *
 * Four activities, and not one of them a new engine. Capitals and their lower
 * case forms; numerals and the quantities they mean; words and their
 * opposites; animals and the sounds they make. Everything specific to a
 * correspondence lives in its own file; `shared.ts` holds the parts every one
 * of them wants — how a board's contents are chosen so it is never
 * accidentally impossible, how the far shelf is displaced so it can never be
 * solved by position, and how a board names its own concept.
 *
 * ## Why a pack and not four files scattered across the subjects
 *
 * Because what these share is the *verb*, not the subject. Three of the four
 * teach an objective some other pack already teaches one tile at a time —
 * `english.letter-case`, `math.counting`, `general-knowledge.animal-sounds`,
 * `english.opposites` — and each keeps that pack's `activityType`, so the two
 * forms are one thing known and not two. What changes is that a whole board
 * must be held in the head at once, which is a different job from picking one
 * tile out of three, and is worth its own strand.
 *
 * Each activity's `category` is the subject it belongs to, so the pack never
 * distorts what a child is told they are practising: the quantity board says
 * Maths, the sounds board says General Knowledge.
 *
 * Every activity in this pack is and will stay a `connect` challenge. That is
 * the whole reason the pack exists as its own strand: `MatchStage` already
 * draws any of them, so a new one is data.
 */
export const MATCH_ACTIVITIES: readonly Activity[] = [
  letterPartnersActivity,
  quantityPartnersActivity,
  oppositePartnersActivity,
  soundPartnersActivity,
];

export const MATCH_PACK: ContentPack = {
  id: "match",
  title: "Matching",
  blurb: "Things that belong together, found two at a time.",
  accent: "tide",
  activities: MATCH_ACTIVITIES,
};

export {
  letterPartnersActivity,
  oppositePartnersActivity,
  quantityPartnersActivity,
  soundPartnersActivity,
};
