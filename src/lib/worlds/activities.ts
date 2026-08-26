import type { SessionPlan } from "@/lib/content/session";
import type { GameWorldId } from "./worlds";

/**
 * What a child can do inside a world. No JSX, no React.
 *
 * A world activity is a short round — five questions — dealt from the same
 * content packs every Quest deals from, by the same `drawSession`, and played
 * by the same engines inside the same `GameShell`. Nothing here is a new
 * game: an activity is a *session plan* with a name a child would use, a
 * place on the world's map, and the one thing the world gives back when it
 * is finished — a flower for the garden, an animal for the meadow, a page
 * for the storybook.
 *
 * Three per world, on purpose. A world with three doors is a world a four
 * year old can hold in their head; a world with twelve is a menu. The
 * curriculum underneath is not touched — every plan below draws only from
 * activities that already exist, at levels they already have.
 */

export type WorldActivitySlug = string;

/** The worlds a child can walk into. The meadow is where everything else is played. */
export type PlayableWorldId = Exclude<GameWorldId, "meadow">;

/** `<world>.<slug>`, so an id says where it lives without a lookup. */
export type WorldActivityId = `${GameWorldId}.${WorldActivitySlug}`;

/**
 * How big a challenge a door is played at.
 *
 * Three tiers, and only three: Easy is where every door starts, Medium opens
 * when Easy has been finished once, Hard when Medium has. A tier is *not* a
 * curriculum level — `lib/content/difficulty.ts` levels describe what a single
 * question asks; a tier describes which plan a whole round is dealt from. The
 * two meet only inside `plans` below, where each tier names the levels its
 * slots draw at.
 *
 * Deliberately not reusing `LEVEL_LABELS` from the content model: that table's
 * words describe five curriculum levels and its "Medium" is level three. A
 * door's three words are their own vocabulary, and a child hears these ones.
 */
export type Tier = 1 | 2 | 3;

/** The tiers in the order they unlock. */
export const TIERS: readonly Tier[] = [1, 2, 3];

/* What a child (and a parent) *calls* each tier is language, so it lives in
   the catalogue rather than here: `tierKey` in `lib/i18n/names`. */

/**
 * The thing the world gives back. Each world has exactly one kind, and it is
 * the world's own: nothing is tallied across worlds and nothing is spent.
 */
export type WorldRewardKind = "flower" | "animal" | "page";

export interface WorldActivity {
  id: WorldActivityId;
  world: PlayableWorldId;
  slug: WorldActivitySlug;
  /**
   * The round itself, at each tier. Same number of questions at every tier —
   * harder is never *longer* — but a harder tier deals from higher levels of
   * the same activities, widens the pool a distractor can come from, or brings
   * in a neighbouring activity the door's lesson already contains (comparing
   * quantities on a counting door, joining sounds on a word door). Every slot
   * names only levels its activity actually offers, and only activities that
   * deal `choice` or `connect` boards — the two kinds a world round can play —
   * and `tests/journey.test.ts` proves both, tier by tier.
   */
  plans: Readonly<Record<Tier, SessionPlan>>;
  /**
   * The Easy plan, by its old name. Every door opens on this one, old journey
   * data recorded rounds of this one, and the parent dashboard's concept walk
   * started from it — so it stays, and it is always `plans[1]`.
   */
  plan: SessionPlan;
  /**
   * Whether a connect board on this round should walk its left-hand things
   * across to the right when a join is right. Only homes do.
   */
  travel?: boolean;
}

/**
 * What each world gives back — the thing itself, not its name.
 *
 * A flower is a flower in both languages; "a new flower has grown in your
 * garden!" is not. So the kind stays here, where the scenery reads it to
 * decide what to draw, and the three ways of saying it live in the catalogue
 * under `rewardKey`.
 */
export const WORLD_REWARDS: Readonly<Record<GameWorldId, WorldRewardKind>> = {
  meadow: "flower",
  counting: "flower",
  animals: "animal",
  words: "page",
};

const five = (level: 1 | 2 | 3, from: SessionPlan["slots"][number]["from"]) =>
  Array.from({ length: 5 }, () => ({ level, from }));

/** A door as it is written: everything but the derived `plan` alias. */
type WorldActivitySpec = Omit<WorldActivity, "plan">;

const DOORS: readonly WorldActivitySpec[] = [
  /* ---- Counting Garden ------------------------------------------------ */
  {
    id: "counting.count-the-apples",
    world: "counting",
    slug: "count-the-apples",
    plans: {
      /* Small groups, and every one of them a group of *things*. The pip
         boards `math.counting` deals are the same question with the apples
         taken away, and the garden's first door is the one place in the
         product where that trade is worst: a child walking into a world
         called Count the Apples should be counting apples. The pips are
         still dealt at the tiers below, where a block of them is the point. */
      1: { slots: five(1, ["math.counting-objects"]) },
      /* Bigger groups, wider answer pools. */
      2: { slots: five(2, ["math.counting-objects", "math.counting"]) },
      /* The biggest groups, and mixed groups: count only the circles. */
      3: {
        slots: [
          ...five(3, ["math.counting-objects"]).slice(0, 3),
          ...five(3, ["shapes.counting"]).slice(0, 2),
        ],
      },
    },
  },
  {
    id: "counting.count-the-flowers",
    world: "counting",
    slug: "count-the-flowers",
    plans: {
      1: {
        slots: [
          ...five(2, ["math.counting-objects", "math.counting"]).slice(0, 3),
          ...five(3, ["math.counting-objects"]).slice(0, 2),
        ],
      },
      /* All-big counting, and the first taste of which-has-more. */
      2: {
        slots: [
          ...five(3, ["math.counting-objects"]).slice(0, 3),
          ...five(2, ["math.comparison"]).slice(0, 2),
        ],
      },
      /* Comparing quantities in earnest — the reasoning tier. */
      3: {
        slots: [
          ...five(3, ["math.counting-objects"]).slice(0, 3),
          ...five(3, ["math.comparison"]).slice(0, 2),
        ],
      },
    },
  },
  {
    id: "counting.find-the-number",
    world: "counting",
    slug: "find-the-number",
    plans: {
      1: {
        slots: [
          ...five(1, ["math.number-recognition"]).slice(0, 3),
          ...five(2, ["math.number-recognition", "math.before-and-after"]).slice(0, 2),
        ],
      },
      /* The bigger numbers, and neighbours on the number line. */
      2: {
        slots: [
          ...five(2, ["math.number-recognition"]).slice(0, 3),
          ...five(2, ["math.before-and-after"]).slice(0, 2),
        ],
      },
      /* Number-line reasoning: what comes before, after, and in the gap. */
      3: {
        slots: [
          ...five(2, ["math.number-recognition"]).slice(0, 2),
          ...five(3, ["math.before-and-after", "math.missing-number"]).slice(0, 3),
        ],
      },
    },
  },

  /* ---- Animal Adventure ----------------------------------------------- */
  {
    id: "animals.find-the-home",
    world: "animals",
    slug: "find-the-home",
    plans: {
      /* Two pairs, the best-known animals, pictures on both sides. */
      1: { slots: five(1, ["general-knowledge.home-partners"]).slice(0, 3) },
      /* Three pairs, a wider pool of animals. */
      2: { slots: five(2, ["general-knowledge.home-partners"]).slice(0, 3) },
      /* Four pairs, the least obvious matches in the pack. */
      3: { slots: five(3, ["general-knowledge.home-partners"]).slice(0, 3) },
    },
    travel: true,
  },
  {
    id: "animals.who-lives-here",
    world: "animals",
    slug: "who-lives-here",
    plans: {
      1: {
        slots: five(1, [
          "general-knowledge.animal-names",
          "general-knowledge.animal-sounds",
          "general-knowledge.baby-animals",
          "general-knowledge.animal-homes",
        ]),
      },
      2: {
        slots: five(2, [
          "general-knowledge.animal-names",
          "general-knowledge.animal-sounds",
          "general-knowledge.baby-animals",
          "general-knowledge.animal-homes",
        ]),
      },
      3: {
        slots: five(3, [
          "general-knowledge.animal-names",
          "general-knowledge.animal-sounds",
          "general-knowledge.baby-animals",
          "general-knowledge.animal-homes",
        ]),
      },
    },
  },
  {
    id: "animals.land-or-sea",
    world: "animals",
    slug: "land-or-sea",
    plans: {
      1: {
        /* Land and water at *its* entry level, not at the top of its ladder.
           It was the one activity in the product whose easiest door dealt its
           hardest boards, and the cost was not only difficulty: the pictures
           belong to level one, so an Easy round here could arrive with no
           KIDDO drawing anywhere on it — the only door in the product that
           could. Medium and Hard are untouched. */
        slots: [
          ...five(2, ["general-knowledge.animal-homes", "general-knowledge.animal-diet"]).slice(0, 3),
          ...five(1, ["general-knowledge.land-and-water"]).slice(0, 2),
        ],
      },
      /* Everything at the top of its ladder. */
      2: {
        slots: [
          ...five(3, ["general-knowledge.animal-homes", "general-knowledge.animal-diet"]).slice(0, 3),
          ...five(3, ["general-knowledge.land-and-water"]).slice(0, 2),
        ],
      },
      /* The door's namesake, hardest first: land, sea *and* sky. */
      3: {
        slots: [
          ...five(3, ["general-knowledge.land-and-water"]).slice(0, 3),
          ...five(3, ["general-knowledge.animal-diet", "general-knowledge.animal-homes"]).slice(0, 2),
        ],
      },
    },
  },

  /* ---- Word World ----------------------------------------------------- */
  {
    id: "words.alphabet-adventure",
    world: "words",
    slug: "alphabet-adventure",
    plans: {
      1: {
        slots: [
          ...five(1, ["english.letter-recognition"]).slice(0, 3),
          ...five(2, ["english.letter-case", "english.letter-recognition"]).slice(0, 2),
        ],
      },
      /* Trickier letters, and big-to-little matching at full stretch. */
      2: {
        slots: [
          ...five(2, ["english.letter-recognition"]).slice(0, 3),
          ...five(3, ["english.letter-case"]).slice(0, 2),
        ],
      },
      /* The whole alphabet, both cases, the look-alike letters in play. */
      3: {
        slots: [
          ...five(3, ["english.letter-recognition"]).slice(0, 3),
          ...five(3, ["english.letter-case"]).slice(0, 2),
        ],
      },
    },
  },
  {
    id: "words.rhyming-friends",
    world: "words",
    slug: "rhyming-friends",
    plans: {
      /* Two pairs from the twelve first rhymes. */
      1: { slots: five(1, ["english.rhyming-partners"]).slice(0, 3) },
      /* Three pairs, a wider pool. */
      2: { slots: five(2, ["english.rhyming-partners"]).slice(0, 3) },
      /* Four pairs, and rhymes the spelling does not give away. */
      3: { slots: five(3, ["english.rhyming-partners"]).slice(0, 3) },
    },
  },
  {
    id: "words.word-discovery",
    world: "words",
    slug: "word-discovery",
    plans: {
      1: {
        slots: [
          ...five(1, ["english.beginning-sounds"]).slice(0, 2),
          ...five(2, ["english.ending-sounds", "english.spelling"]).slice(0, 3),
        ],
      },
      /* More plausible distractors, deeper gaps to fill. */
      2: {
        slots: [
          ...five(2, ["english.beginning-sounds"]).slice(0, 2),
          ...five(3, ["english.ending-sounds", "english.spelling"]).slice(0, 3),
        ],
      },
      /* Everything by ear: joining sounds to words, and the hardest spelling. */
      3: {
        slots: [
          ...five(3, ["english.beginning-sounds", "english.sound-partners"]).slice(0, 2),
          ...five(3, ["english.ending-sounds", "english.spelling"]).slice(0, 3),
        ],
      },
    },
  },
];

export const WORLD_ACTIVITIES: readonly WorldActivity[] = DOORS.map((door) => ({
  ...door,
  plan: door.plans[1],
}));

/** The worlds a child can walk into, in the order they stand on the map. */
export const PLAYABLE_WORLDS: readonly PlayableWorldId[] = [
  "counting",
  "animals",
  "words",
];

export function activitiesOf(world: GameWorldId): readonly WorldActivity[] {
  return WORLD_ACTIVITIES.filter((activity) => activity.world === world);
}

export function findWorldActivity(
  world: string,
  slug: string,
): WorldActivity | undefined {
  return WORLD_ACTIVITIES.find(
    (activity) => activity.world === world && activity.slug === slug,
  );
}

export function isPlayableWorld(world: string): world is PlayableWorldId {
  return (PLAYABLE_WORLDS as readonly string[]).includes(world);
}
