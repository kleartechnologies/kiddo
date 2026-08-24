import type { AgeRange, CharacterId } from "@/lib/games/types";
import type { Level } from "./difficulty";
import type {
  Activity,
  ActivityId,
  Challenge,
  ChallengeKind,
  ChallengeMeta,
  ChallengePayload,
  ContentCategory,
  ActivityType,
  GenerateContext,
  GeneratedActivity,
  PackId,
  Prompt,
  StaticActivity,
} from "./types";

/**
 * How an activity is written.
 *
 * A `Challenge` carries nine fields an author would otherwise retype on every
 * one of a hundred questions, and get wrong on the ninety-first. So content is
 * authored as a `ChallengeSpec` — the parts that actually differ — and the
 * definers below stamp the rest on from the activity it belongs to.
 *
 * This is the ergonomic half of "a hundred challenges, not a hundred
 * components". The typed half is in `types.ts`.
 */

/** A question, minus everything it inherits. */
export interface ChallengeSpec {
  /**
   * Unique within the activity, and stable: it is how a completed challenge is
   * remembered. Optional only for generated content, which gets its index.
   */
  id?: string;
  level: Level;
  prompt: Prompt;
  payload: ChallengePayload;
  explanation?: string;
  /** A nudge for a child who has tried twice. Never the answer. */
  hint?: string;
  host?: CharacterId;
  meta?: ChallengeMeta;
  /** Narrows the activity's band for one unusually easy or hard question. */
  ageRange?: AgeRange;
}

/** What every activity declares about itself, however its content arrives. */
interface ActivityDefBase {
  /** Local id. `math` + `addition` becomes `math.addition`. */
  id: string;
  packId: PackId;
  title: string;
  category: ContentCategory;
  activityType: ActivityType;
  kind: ChallengeKind;
  ageRange: AgeRange;
  host?: CharacterId;
}

export interface StaticActivityDef extends ActivityDefBase {
  challenges: readonly ChallengeSpec[];
  /** Derived from the challenges when omitted, which is the normal case. */
  levels?: readonly Level[];
}

export interface GeneratedActivityDef extends ActivityDefBase {
  /** Which levels the rule below knows how to make. Ascending. */
  levels: readonly Level[];
  /**
   * The rule. Given a level and a seeded generator, return one question.
   *
   * Must be pure: the same context has to give the same challenge, or a page
   * rendered twice is two different pages. Take every random number from
   * `context.rng`, never from `Math.random`.
   */
  generate: (context: GenerateContext) => ChallengeSpec;
}

function activityIdOf(packId: PackId, id: string): ActivityId {
  return `${packId}.${id}`;
}

/** Ascending, no duplicates, and never empty. */
function tidyLevels(levels: readonly Level[]): readonly Level[] {
  const unique = [...new Set(levels)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [1];
}

/** Stamp an activity's identity onto one authored question. */
export function buildChallenge(
  activity: Pick<
    Activity,
    "id" | "packId" | "category" | "activityType" | "ageRange" | "host"
  >,
  spec: ChallengeSpec,
  fallbackId: string,
): Challenge {
  return {
    id: `${activity.id}#${spec.id ?? fallbackId}`,
    packId: activity.packId,
    activityId: activity.id,
    category: activity.category,
    activityType: activity.activityType,
    level: spec.level,
    ageRange: spec.ageRange ?? activity.ageRange,
    prompt: spec.prompt,
    payload: spec.payload,
    explanation: spec.explanation,
    hint: spec.hint,
    host: spec.host ?? activity.host,
    meta: spec.meta,
  };
}

/** Authored content: the specs become challenges once, at module load. */
export function defineStaticActivity(def: StaticActivityDef): StaticActivity {
  const identity = {
    id: activityIdOf(def.packId, def.id),
    packId: def.packId,
    category: def.category,
    activityType: def.activityType,
    ageRange: def.ageRange,
    host: def.host,
  };

  const challenges = def.challenges.map((spec, index) =>
    buildChallenge(identity, spec, String(index + 1)),
  );

  return {
    ...identity,
    title: def.title,
    kind: def.kind,
    levels: tidyLevels(def.levels ?? challenges.map((c) => c.level)),
    source: "static",
    challenges,
  };
}

/**
 * Derived content: the rule is wrapped once here, so callers get the same
 * `(context) => Challenge` signature whichever kind of activity they hold.
 */
export function defineGeneratedActivity(
  def: GeneratedActivityDef,
): GeneratedActivity {
  const identity = {
    id: activityIdOf(def.packId, def.id),
    packId: def.packId,
    category: def.category,
    activityType: def.activityType,
    ageRange: def.ageRange,
    host: def.host,
  };

  return {
    ...identity,
    title: def.title,
    kind: def.kind,
    levels: tidyLevels(def.levels),
    source: "generated",
    generate: (context) =>
      buildChallenge(
        identity,
        def.generate(context),
        `l${context.level}-${context.index + 1}`,
      ),
  };
}
