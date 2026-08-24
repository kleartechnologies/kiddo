import type { Activity, ContentPack } from "../../types";
import { groupPartnersActivity } from "./groupPartners";
import { oddOneOutActivity } from "./oddOneOut";
import { pairPartnersActivity } from "./pairPartners";
import { patternsActivity } from "./patterns";
import { sequencesActivity } from "./sequences";
import { sortingActivity } from "./sorting";

/**
 * The Logic pack: six activities, every one of them a rule that makes
 * questions rather than a list of them.
 *
 * Ordered the way a child meets them — see a repeat, spot the one that does
 * not fit, name the group a thing belongs to, join several words to their
 * groups at once, carry a run one step on, and join the things that are used
 * together.
 *
 * Four are `choice` challenges and two are `connect`, which is why Logic Quest
 * could be built without a `PatternStage`, a `SortingStage` or a
 * `SequenceStage`: a pattern and a sum are the same gesture wearing different
 * content, and `ConnectStage` had been drawing other packs for phases before
 * `groupPartnersActivity` arrived.
 *
 * The two connects are not the same kind of addition. `groupPartners` teaches
 * nothing new — it is `sorting`'s knowledge asked in a way that cannot be done
 * one line at a time. `pairPartners` is new content: fourteen relationships
 * between two things, which is the one thing in this pack that cannot be
 * worked out by looking hard at the board.
 *
 * The one thing this pack adds to the content vocabulary is `ShapeItem`, and
 * it is a generic item like every other — `ContentItemView` grew a branch, and
 * nothing else in the product knows shapes exist.
 *
 * ## What is deliberately not here
 *
 * An `order` activity that arranges things by size. It was designed and cut:
 * `math.quantity-order` already asks for exactly that gesture with quantities,
 * and arranging three shapes small to large does not test the rule that made
 * them — the child reads the answer off the tiles. Size lives in Shapes &
 * Colours, where `size-order` asks it of shapes that were drawn for it.
 */
export const LOGIC_ACTIVITIES: readonly Activity[] = [
  patternsActivity,
  oddOneOutActivity,
  sortingActivity,
  groupPartnersActivity,
  sequencesActivity,
  pairPartnersActivity,
];

export const LOGIC_PACK: ContentPack = {
  id: "logic",
  title: "Logic",
  blurb: "Spotting, sorting and working out what comes next. Thinking games.",
  accent: "sprout",
  activities: LOGIC_ACTIVITIES,
};

export {
  groupPartnersActivity,
  oddOneOutActivity,
  pairPartnersActivity,
  patternsActivity,
  sequencesActivity,
  sortingActivity,
};
