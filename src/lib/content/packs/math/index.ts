import type { Activity, ContentPack } from "../../types";
import { additionActivity, subtractionActivity } from "./arithmetic";
import { beforeAndAfterActivity } from "./beforeAfter";
import { countingObjectsActivity } from "./countingObjects";
import { numberOrderActivity } from "./numberOrder";
import { comparisonActivity, countingActivity, numberRecognitionActivity } from "./numbers";
import { patternActivity } from "./patterns";
import { quantityOrderActivity } from "./quantityOrder";
import { missingNumberActivity, numberSequenceActivity } from "./sequences";
import { sumPartnersActivity } from "./sumPartners";

/**
 * The Math pack: thirteen activities, twelve of them a rule rather than a list.
 *
 * Ordered the way a child meets them — count a group of pips, count a group of
 * real things, know the numeral, put groups in order by how many, compare two,
 * say what comes before and after, add, take away, join sums to their answers,
 * carry a rule along a row, and put a run of numbers back in order. A session
 * builder is free to ignore that order; it is here so the pack reads as a
 * curriculum rather than a bag.
 *
 * Ten of the thirteen are a `choice`, two are an `order` and one is a
 * `connect`, which is the point of the two-axis split rather than an
 * inconsistency. `numberOrderActivity` is an `order` because a sequence is
 * something you arrange; `quantityOrderActivity` is the same verb applied to
 * quantities, which is a harder thing than it looks because no numeral appears
 * on the board; and `sumPartnersActivity` is a `connect` because four sums and
 * four answers cannot be guessed the way one sum and three tiles can. None of
 * the three needed an engine — `OrderStage` and `ConnectStage` had both been
 * drawing other packs for phases already.
 */
export const MATH_ACTIVITIES: readonly Activity[] = [
  countingActivity,
  countingObjectsActivity,
  numberRecognitionActivity,
  quantityOrderActivity,
  comparisonActivity,
  beforeAndAfterActivity,
  additionActivity,
  subtractionActivity,
  sumPartnersActivity,
  numberSequenceActivity,
  missingNumberActivity,
  numberOrderActivity,
  patternActivity,
];

export const MATH_PACK: ContentPack = {
  id: "math",
  title: "Math",
  blurb: "Counting, comparing, adding and taking away. Numbers as something to play with.",
  accent: "tide",
  activities: MATH_ACTIVITIES,
};

export {
  additionActivity,
  beforeAndAfterActivity,
  comparisonActivity,
  countingActivity,
  countingObjectsActivity,
  missingNumberActivity,
  numberOrderActivity,
  numberRecognitionActivity,
  numberSequenceActivity,
  patternActivity,
  quantityOrderActivity,
  subtractionActivity,
  sumPartnersActivity,
};
