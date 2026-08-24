import { defineStaticActivity, type ChallengeSpec } from "../../activity";
import { labelOf } from "../../challenges";
import type { Level } from "../../difficulty";
import type { Accent, CharacterId } from "@/lib/games/types";
import type { ContentItem } from "../../types";
import { BLANK } from "./shared";

/**
 * Simple repeating patterns — the pack's one **authored** activity.
 *
 * Red, blue, red, blue is not derivable from a rule the way `2 + 3` is: which
 * colours go together, and which repeats a four-year-old can actually see, are
 * editorial decisions. So the twelve are written down, and `drawChallenges`
 * hands them back through exactly the same call as the generated seven.
 *
 * Patterns sit in the Math pack because spotting "and then it starts again" is
 * where a child first meets a rule, which is the whole of later arithmetic.
 */

interface Cell {
  id: string;
  item: ContentItem;
}

function swatch(id: string, accent: Accent, label: string): Cell {
  return { id, item: { kind: "swatch", accent, label } };
}

function friend(id: FriendCell): Cell {
  return { id, item: { kind: "character", characterId: id } };
}

type FriendCell = Extract<CharacterId, "kiddo" | "foxy" | "bibi" | "pip" | "wally">;

const BLUE = swatch("blue", "tide", "BLUE");
const PINK = swatch("pink", "blossom", "PINK");
const YELLOW = swatch("yellow", "honey", "YELLOW");
const ORANGE = swatch("orange", "apricot", "ORANGE");
const GREEN = swatch("green", "sprout", "GREEN");

const KIDDO = friend("kiddo");
const FOXY = friend("foxy");
const BIBI = friend("bibi");
const PIP = friend("pip");
const WALLY = friend("wally");

interface PatternDef {
  id: string;
  level: Level;
  /** The bit that repeats: two or three cells. */
  unit: readonly Cell[];
  /** How much of the run is shown before the gap. */
  shown: number;
  /** A wrong tile from outside the unit, so a two-colour pattern is not a coin toss. */
  extra?: Cell;
}

function pattern({ id, level, unit, shown, extra }: PatternDef): ChallengeSpec {
  const run = Array.from({ length: shown }, (_, i) => unit[i % unit.length]);
  const answer = unit[shown % unit.length];

  const options: Cell[] = [];
  for (const cell of [...unit, ...(extra ? [extra] : [])]) {
    if (!options.some((option) => option.id === cell.id)) options.push(cell);
  }

  return {
    id,
    level,
    prompt: {
      speech: "Which one comes next?",
      display: [...run.map((cell) => ({ kind: "item" as const, item: cell.item })), BLANK],
    },
    payload: {
      kind: "choice",
      options: options.map((cell) => ({ id: cell.id, item: cell.item })),
      answerId: answer.id,
    },
    explanation: `It goes ${unit.map((cell) => labelOf(cell.item)).join(", ")}, again and again.`,
    meta: {
      objective: "continues a repeating pattern",
      /* The unit that repeats is the whole idea. How much of the run is shown
         before the gap changes the board, not the thing being learned. */
      tags: ["pattern", `concept:pattern:${unit.map((cell) => cell.id).join("-")}`],
    },
  };
}

export const patternActivity = defineStaticActivity({
  id: "pattern",
  packId: "math",
  title: "What comes next in the pattern",
  category: "math",
  activityType: "patterns",
  kind: "choice",
  ageRange: { min: 4, max: 7 },
  challenges: [
    /* Level 2 — two-cell units, and the first three-cell ones. */
    pattern({ id: "blue-pink", level: 2, unit: [BLUE, PINK], shown: 4, extra: GREEN }),
    pattern({ id: "kiddo-foxy", level: 2, unit: [KIDDO, FOXY], shown: 4, extra: WALLY }),
    pattern({ id: "yellow-green", level: 2, unit: [YELLOW, GREEN], shown: 4, extra: BLUE }),
    pattern({ id: "pip-wally", level: 2, unit: [PIP, WALLY], shown: 4, extra: BIBI }),
    pattern({ id: "blue-blue-yellow", level: 2, unit: [BLUE, BLUE, YELLOW], shown: 5, extra: PINK }),
    pattern({ id: "green-pink-pink", level: 2, unit: [GREEN, PINK, PINK], shown: 5, extra: ORANGE }),

    /* Level 3 — three different cells, and units that start again mid-row. */
    pattern({ id: "bibi-foxy-foxy", level: 3, unit: [BIBI, FOXY, FOXY], shown: 4, extra: KIDDO }),
    pattern({ id: "blue-yellow-pink", level: 3, unit: [BLUE, YELLOW, PINK], shown: 5 }),
    pattern({ id: "kiddo-pip-wally", level: 3, unit: [KIDDO, PIP, WALLY], shown: 4 }),
    pattern({ id: "orange-orange-blue", level: 3, unit: [ORANGE, ORANGE, BLUE], shown: 4, extra: YELLOW }),
    pattern({ id: "green-orange-blue", level: 3, unit: [GREEN, ORANGE, BLUE], shown: 5 }),
    pattern({ id: "yellow-blue-blue", level: 3, unit: [YELLOW, BLUE, BLUE], shown: 5, extra: GREEN }),
  ],
});
