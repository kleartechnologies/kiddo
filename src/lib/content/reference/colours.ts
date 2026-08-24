import { defineStaticActivity, type ChallengeSpec } from "../activity";
import type { Accent } from "@/lib/games/types";
import type { Level } from "../difficulty";

/**
 * Colours — the reference **static** activity.
 *
 * Five questions, written out, because "which one is blue" cannot be derived
 * from anything. This is what authored content looks like: a `ChallengeSpec`
 * per question and nothing repeated between them.
 *
 * It is small on purpose. It exists so the architecture has a real static
 * activity to be typechecked, drawn from and validated against — the hundred
 * challenges come later, and they come as more entries in this array, not as
 * more code.
 *
 * `sage` is never used here. It is a mint green and `sprout` is the green a
 * child means, and a question with two right answers is not a question.
 */

const COLOURS: readonly { accent: Accent; name: string }[] = [
  { accent: "tide", name: "BLUE" },
  { accent: "blossom", name: "PINK" },
  { accent: "honey", name: "YELLOW" },
  { accent: "apricot", name: "ORANGE" },
  { accent: "sprout", name: "GREEN" },
];

/** One question: the named colour, plus the others as distractors. */
function ask(name: string, others: readonly string[], level: Level): ChallengeSpec {
  const answer = COLOURS.find((colour) => colour.name === name);
  const choices = [answer, ...others.map((o) => COLOURS.find((c) => c.name === o))]
    .filter((colour) => colour !== undefined)
    /* Written in a fixed order and dealt in a shuffled one. Authoring the
       position too would mean the answer is always first. */
    .map((colour) => ({
      id: colour.name.toLowerCase(),
      item: { kind: "swatch" as const, accent: colour.accent, label: colour.name },
    }));

  return {
    id: name.toLowerCase(),
    level,
    prompt: { speech: `Which one is ${name.toLowerCase()}?` },
    payload: { kind: "choice", options: choices, answerId: name.toLowerCase() },
    meta: { objective: "names a colour on sight", tags: ["colour"] },
  };
}

export const coloursActivity = defineStaticActivity({
  id: "colours",
  packId: "discovery",
  title: "Naming colours",
  category: "colours",
  activityType: "colours",
  kind: "choice",
  ageRange: { min: 4, max: 6 },
  host: "bibi",
  challenges: [
    ask("BLUE", ["PINK", "YELLOW"], 1),
    ask("YELLOW", ["GREEN", "BLUE"], 1),
    ask("PINK", ["ORANGE", "GREEN", "BLUE"], 2),
    ask("GREEN", ["YELLOW", "PINK", "ORANGE"], 2),
    ask("ORANGE", ["BLUE", "GREEN", "PINK", "YELLOW"], 3),
  ],
});
