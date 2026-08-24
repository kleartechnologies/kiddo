import type { Activity, ContentPack } from "../../types";
import { alphabetOrderActivity } from "./alphabetOrder";
import { endingSoundsActivity } from "./endingSounds";
import { letterCaseActivity, letterRecognitionActivity } from "./letters";
import { oppositesActivity } from "./opposites";
import { pluralsActivity } from "./plurals";
import { beginningSoundsActivity } from "./phonics";
import { rhymingPartnersActivity } from "./rhyming";
import { soundPartnersActivity } from "./soundPartners";
import { spellingActivity } from "./spelling";
import { wordBuildActivity } from "./wordBuild";

/**
 * The English pack: eleven activities, all of them a rule over authored
 * letters and words.
 *
 * Ordered the way a child meets them — know a letter, know its other shape,
 * know where it sits in the alphabet, hear what a word starts with, join a
 * picture to that sound, hear what a word ends with, hear which words finish
 * alike, put a letter back into a word, build a whole word out of its letters,
 * say how many of a thing there are, and hold one word against its opposite.
 *
 * Seven of the eleven are a `choice`, which is why English Quest could be
 * built without touching `ChoiceStage` beyond one caption rule. The other four
 * are not, and not one of them needed an engine.
 *
 * `alphabetOrderActivity` and `wordBuildActivity` are an `order`, and they are
 * here rather than in a pack of their own because what they teach is English:
 * putting `M N O P` right is the alphabet, not a sorting puzzle that happens
 * to use letters, and laying C A T out in that order is spelling.
 * `rhymingPartnersActivity` and `soundPartnersActivity` are a `connect`,
 * because hearing that words share a sound is something you do to a whole
 * board of them at once rather than one tile at a time.
 *
 * Three of the four share an `activityType` with a `choice` activity that
 * already teaches the same objective — `spelling`, `phonics` — which is the
 * two-axis split doing its job: what is learned and how it is answered are
 * different questions, and the second one is free.
 */
export const ENGLISH_ACTIVITIES: readonly Activity[] = [
  letterRecognitionActivity,
  letterCaseActivity,
  alphabetOrderActivity,
  beginningSoundsActivity,
  soundPartnersActivity,
  endingSoundsActivity,
  rhymingPartnersActivity,
  spellingActivity,
  wordBuildActivity,
  pluralsActivity,
  oppositesActivity,
];

export const ENGLISH_PACK: ContentPack = {
  id: "english",
  title: "English",
  blurb: "Letters, sounds and words. The alphabet as something to play with.",
  accent: "blossom",
  activities: ENGLISH_ACTIVITIES,
};

export {
  alphabetOrderActivity,
  beginningSoundsActivity,
  endingSoundsActivity,
  letterCaseActivity,
  letterRecognitionActivity,
  oppositesActivity,
  pluralsActivity,
  rhymingPartnersActivity,
  soundPartnersActivity,
  spellingActivity,
  wordBuildActivity,
};
