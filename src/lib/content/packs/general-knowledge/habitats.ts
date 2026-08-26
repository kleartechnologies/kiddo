import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import { boardIsDrawn, narrowToDrawn, type ArtId } from "../../art";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { ANIMAL_ART, animalItem } from "./animals";
import {
  aOrAn,
  capitalise,
  defineQuizActivity,
  drawn,
  pic,
  type Question,
  type Sym,
} from "./shared";

/**
 * Where animals live. One table, two ways to play.
 *
 * The fact is the same either way — a cow lives on a farm — and it is written
 * down once, in `HOMES`, with the places that would also be true of the same
 * animal named beside it. What differs is what the child is asked to *do*
 * with it:
 *
 * - `animalHabitats` is a `choice`. One animal on the stage, four places to
 *   pick from. The child recognises.
 * - `homePartners` is a `connect`. Two, three or four animals at once and all
 *   of their places, in the wrong order, with nothing said about which to
 *   start with. The child sorts out a whole board.
 *
 * That is the two-axis architecture doing the thing it was built for. The
 * `ActivityType` is `animal-habitats` on both, so a session that wants to
 * teach where animals live can reach for either; the `ChallengeKind` differs,
 * so `ChoiceStage` draws one and `ConnectStage` draws the other, and neither
 * engine was touched to make it happen. There is no habitats component.
 *
 * `avoid` is the whole reason this file is longer than a lookup table. A
 * squirrel lives in a forest *and* in a tree; a seal lives on the snow *and*
 * in the sea; a penguin the same. Every one of those would make a board with
 * two right answers, so the animal names the places that must never appear
 * opposite it. A question that could be argued with is a question a child
 * loses trust in.
 */

/* ----------------------------------------------------------------- places */

const PLACES = {
  sea: pic("🌊", "the sea"),
  jungle: pic("🌴", "the jungle"),
  desert: pic("🏜️", "the desert"),
  snow: pic("❄️", "the snow"),
  forest: pic("🌲", "the forest"),
  /* A field, never a tractor. A tractor is a thing that lives on a farm, not
     the farm itself — and "the dolphin goes to the tractor" was the exact
     confusion this table exists to avoid. */
  farm: pic("🌾", "the farm"),
  tree: pic("🌳", "a tree"),
  pond: pic("🪷", "the pond"),
  nest: pic("🪺", "a nest"),
  burrow: pic("🕳️", "a burrow"),
} as const;

type PlaceKey = keyof typeof PLACES;

/** "on a farm", not "in the farm". The explanation has to read out loud. */
const WHERE: Record<PlaceKey, string> = {
  sea: "in the sea",
  jungle: "in the jungle",
  desert: "in the desert",
  snow: "in the snow",
  forest: "in the forest",
  farm: "on a farm",
  tree: "up in a tree",
  pond: "in the pond",
  nest: "in a nest",
  burrow: "in a burrow",
};

/** Every home, for boards elsewhere in the pack that need somewhere to be. */
export const PLACE_TILES: readonly Sym[] = Object.values(PLACES);

/**
 * Which places the illustration library has drawn.
 *
 * All ten, as of Phase 10. A place is the hardest thing in the library to
 * draw, because it is the one thing on a board that is not an object a child
 * could hold: a farm drawn as a single silhouette is a barn, and a barn is
 * not where a cow lives. So each one is a small scene with a ground line —
 * and with the jungle drawn, the monkey finally deals a drawn board at level
 * one, exactly as the Phase 9 note promised: two drawings, two lines, and
 * `illustrablePool` below lifted the restriction itself.
 */
const PLACE_ART: Readonly<Record<string, ArtId>> = {
  sea: "place.sea",
  farm: "place.farm",
  pond: "place.pond",
  nest: "place.nest",
  burrow: "place.burrow",
  jungle: "place.jungle",
  forest: "place.forest",
  desert: "place.desert",
  snow: "place.snow",
  tree: "place.tree",
};

interface Home {
  animal: string;
  home: PlaceKey;
  /** Places that are also true of this animal, and so cannot be distractors. */
  avoid?: readonly PlaceKey[];
  level: 1 | 2 | 3;
}

/**
 * Every correspondence this file can teach, either way round.
 *
 * `level` is *familiarity*, not board difficulty — a fish is level one because
 * a toddler names one, an octopus is level three because it is a word from a
 * book. Both activities read it, and both mean the same thing by it.
 */
const HOMES: readonly Home[] = [
  /* The sea. Sharks and crabs before octopuses, by how early a child meets them. */
  { animal: "fish", home: "sea", avoid: ["pond"], level: 1 },
  { animal: "shark", home: "sea", level: 1 },
  { animal: "dolphin", home: "sea", level: 2 },
  { animal: "crab", home: "sea", level: 2 },
  { animal: "octopus", home: "sea", level: 3 },
  { animal: "turtle", home: "sea", avoid: ["pond"], level: 3 },

  /* The farm. A chicken would also be at home in a nest, so it says so. */
  { animal: "cow", home: "farm", level: 1 },
  { animal: "sheep", home: "farm", level: 1 },
  { animal: "horse", home: "farm", level: 2 },
  { animal: "chicken", home: "farm", avoid: ["nest"], level: 2 },

  /* Homes a child can act out — the pond, the nest, the burrow. Every one of
     these is an animal *going home*, which is what the Find the Home round
     is for. The avoids run wide because the new places are plausible for
     half the garden: a duck would nest and swim on a farm pond, a rabbit is
     happy in a forest, a bird lives in a tree as surely as a nest. */
  { animal: "duck", home: "pond", avoid: ["farm", "nest", "sea"], level: 1 },
  { animal: "rabbit", home: "burrow", avoid: ["farm", "forest"], level: 1 },
  { animal: "bird", home: "nest", avoid: ["tree", "forest", "jungle"], level: 1 },

  /* The forest. Squirrels and owls really do live in trees, so no tree tile. */
  { animal: "deer", home: "forest", level: 2 },
  { animal: "fox", home: "forest", avoid: ["burrow"], level: 2 },
  { animal: "bear", home: "forest", level: 2 },
  { animal: "wolf", home: "forest", level: 3 },
  { animal: "hedgehog", home: "forest", avoid: ["burrow"], level: 3 },
  { animal: "squirrel", home: "forest", avoid: ["tree", "nest"], level: 3 },

  /* The jungle. A snake would also be at home in the desert, so it is not asked. */
  { animal: "monkey", home: "jungle", level: 1 },
  { animal: "tiger", home: "jungle", level: 2 },
  { animal: "parrot", home: "jungle", avoid: ["tree", "nest"], level: 3 },

  /* Cold, hot, and up high. A penguin swims in the sea as surely as a seal
     does, so neither may ever be dealt against it. */
  { animal: "penguin", home: "snow", avoid: ["sea"], level: 2 },
  { animal: "seal", home: "snow", avoid: ["sea"], level: 3 },
  { animal: "camel", home: "desert", level: 2 },
  { animal: "koala", home: "tree", avoid: ["jungle", "forest"], level: 3 },
];

/** The honest content count: how many animal-to-place facts exist here. */
export const HABITAT_FACTS = HOMES.length;

/* ------------------------------------------------- one animal, four places */

export const animalHabitats = defineQuizActivity({
  id: "animal-homes",
  activityType: "animal-habitats",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  questions: HOMES.map((entry): Question => {
    /* Drawn, fact by fact, and drawn at every level the fact is asked at. The
       library knows all ten places, so the options row is never half of each
       whatever is sampled onto it; the one thing that can be missing is the
       animal on the stage above them, and a drawn row under an emoji animal is
       exactly the mixture the visual system refuses. So the whole question —
       subject and every place it could be asked against — is drawn together or
       not at all. */
    const illustrated = boardIsDrawn([
      ANIMAL_ART[entry.animal],
      ...(Object.keys(PLACES) as PlaceKey[]).map((key) => PLACE_ART[key]),
    ]);

    const place = (key: PlaceKey): Sym =>
      illustrated
        ? { key: PLACES[key].key, item: drawn(PLACES[key], PLACE_ART[key]) }
        : PLACES[key];
    const barred = new Set<PlaceKey>([entry.home, ...(entry.avoid ?? [])]);
    return {
      level: entry.level,
      ask: `Where does ${aOrAn(entry.animal)} live?`,
      answer: place(entry.home),
      distractors: (Object.keys(PLACES) as PlaceKey[])
        .filter((key) => !barred.has(key))
        .map(place),
      because: `${capitalise(aOrAn(entry.animal))} lives ${WHERE[entry.home]}.`,
      hint: "Picture the animal at home. What is all around it?",
      idea: `home:${entry.animal}`,
      family: "place",
      display: [{ kind: "item", item: animalItem(entry.animal, illustrated) }],
    };
  }),
});

/* --------------------------------------------- everybody home, all at once */

/**
 * How many lines a board asks for, by level.
 *
 * Two is the smallest board that is a board at all — one line would be a
 * question with no choice in it. Four is as many as a 360px phone holds with
 * the nodes still comfortably bigger than a fingertip, and is therefore a
 * ceiling rather than a step: `resolveLevel` has already snapped anything
 * above level 3 down to 3 before it arrives here.
 *
 * Note what is *not* on this list. There is no clock, nothing gets faster,
 * and nothing is taken away for a line that does not hold. A harder board is
 * a bigger board, and that is the only lever.
 */
function pairsAtLevel(level: Level): number {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  return 4;
}

/**
 * Which animals a level may deal from.
 *
 * The same familiarity ladder the choice activity climbs, so a child meets
 * the fish and the cow in both activities before they meet the koala in
 * either. Level three is the whole table.
 */
function poolAtLevel(level: Level): readonly Home[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return HOMES.filter((entry) => entry.level <= ceiling);
}

/**
 * The facts a *fully drawn* board can be made of.
 *
 * This activity is the one place in the phase where a half-drawn board would
 * genuinely give something away. Both columns are pictures, so a board holding
 * two illustrations and two emoji hands the child a second, wrong way to
 * finish it: join the drawn ones to the drawn ones. It works, it is not the
 * skill, and a five year old will find it before an adult does.
 *
 * A fact survives here only if the library has both halves of it, which since
 * the places were finished means both halves of every level-one fact and the
 * animals it knows above that. It is what `narrowToDrawn` narrows *to*, and
 * nothing more: whether a board ends up drawn is read off the facts that came
 * out of the deal, by `boardIsDrawn`, so a board dealt from the whole pool
 * that happens to be drawable is drawn too and no board is ever half of each.
 */
function illustrablePool(pool: readonly Home[]): readonly Home[] {
  return pool.filter(
    (entry) => ANIMAL_ART[entry.animal] && PLACE_ART[entry.home],
  );
}

/**
 * Whether two animals can share a board.
 *
 * A connect board is a bijection — every animal joins to exactly one place and
 * every place takes exactly one animal — so two animals from the same place
 * cannot both be on it, and neither can two animals where one could fairly
 * claim the other's place. The check reads `avoid` from *both* sides, so a
 * fact only ever has to be written down once: `seal` says it might be in the
 * sea, and that is enough to keep the fish away from the seal as well as the
 * seal away from the fish.
 */
function clash(a: Home, b: Home): boolean {
  if (a.home === b.home) return true;
  if (a.avoid?.includes(b.home)) return true;
  if (b.avoid?.includes(a.home)) return true;
  return false;
}

/**
 * Choose the animals for one board.
 *
 * Greedy over a shuffled pool, refusing anything that clashes with what is
 * already down. One pass always terminates; a handful of passes is there
 * because a greedy walk can paint itself into a corner — pick the koala, the
 * seal and the camel and four of the seven places are spoken for. The pack's
 * test deals every level across thousands of seeds and proves a short board
 * never actually comes out, which is why the fallback is the best attempt
 * rather than a relaxed rule: a smaller board is merely easier, and an
 * ambiguous one is broken.
 */
function joinable(pool: readonly Home[], count: number, rng: Rng): Home[] {
  let best: Home[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: Home[] = [];
    for (const candidate of rng.shuffle(pool)) {
      if (picked.length >= count) break;
      if (picked.some((taken) => clash(taken, candidate))) continue;
      picked.push(candidate);
    }
    if (picked.length === count) return picked;
    if (picked.length > best.length) best = picked;
  }

  return best;
}

/**
 * The order the places are laid out in.
 *
 * Shuffled on its own — dealt in step with the animals the board would be
 * answerable by joining row to row without looking at either column. On three
 * tiles and up the shuffle is *deranged* as well, so no place is ever left
 * facing its own animal and a child who joins straight across is never
 * accidentally right.
 *
 * Two tiles are left alone on purpose. The only derangement of two is the
 * swap, so deranging a two-pair board would mean the answer is *always* the
 * crossed one — a pattern to learn instead of a fact. A plain shuffle keeps
 * it an even coin, and at two pairs the second line is forced by the first
 * anyway, so there is no shortcut worth closing.
 */
function displace(chosen: readonly Home[], rng: Rng): Home[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  /* A rotation by one displaces every position, whatever the length. */
  return [...chosen.slice(1), chosen[0]];
}

/** Ids read as `animal-cow>farm` in a failing test. */
const animalId = (entry: Home) => `animal-${entry.animal}`;

/**
 * The name of the idea behind a board, as a `meta` tag.
 *
 * A concept is what the child has to know, never the board it was drawn on.
 * Here it names the *set* of correspondences the board practises, sorted — so
 * the same three animals dealt to different rows, in a different order, is
 * one concept, and `conceptKey` collapses every shuffle of them into a single
 * thing to have learned.
 *
 * What it is deliberately **not** is a way of counting. There are twenty-four
 * facts in `HOMES` and thousands of four-animal sets of them; the sets are
 * boards. `HABITAT_FACTS` is the number that means something to a child, and
 * the pack's test counts that.
 */
function conceptOf(chosen: readonly Home[]): string {
  const facts = chosen.map((entry) => `${entry.animal}>${entry.home}`).sort();
  return `concept:homes:${facts.join("+")}`;
}

export const homePartners = defineGeneratedActivity({
  id: "home-partners",
  packId: "general-knowledge",
  category: "general-knowledge",
  activityType: "animal-habitats",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "bibi",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    /* MODE 1, both sides, and no reading anywhere on the board — the purest
       SHOW -> INTERACT -> REINFORCE activity in the product.

       Two decisions, and they are no longer the same decision. `narrowToDrawn`
       still tosses its coin over *which facts* a level-one board is dealt from,
       so the monkey keeps its place at level one and every fact is still dealt
       at every level it was dealt at before. What the board is *drawn with* is
       then read off the facts that actually came out: the library knows every
       place, so a board is drawn exactly when it knows every animal on it —
       which is every level-one board however the coin fell, and the boards
       above it that happened to deal animals it has drawn.

       Never half of each, at any level. That is `boardIsDrawn`, and it is
       asked over both columns at once because both columns are content here:
       two drawings among four glyphs would be a pattern to join rather than a
       home to find.

       If a narrowed pool somehow could not fill a board, `joinable` returns its
       best attempt and the board would be short, so the fall back to the full
       pool is a guard rather than a nicety. Today it never fires. */
    const wanted = pairsAtLevel(level);
    const drawing = narrowToDrawn(level, rng);
    const narrowed = drawing ? illustrablePool(poolAtLevel(level)) : [];

    const chosen = joinable(
      drawing && narrowed.length >= wanted ? narrowed : poolAtLevel(level),
      wanted,
      rng,
    );

    const illustrated = boardIsDrawn([
      ...chosen.map((entry) => ANIMAL_ART[entry.animal]),
      ...chosen.map((entry) => PLACE_ART[entry.home]),
    ]);

    const left: ConnectNode[] = chosen.map((entry) => ({
      id: animalId(entry),
      item: animalItem(entry.animal, illustrated),
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((entry) => ({
      id: entry.home,
      item: drawn(
        PLACES[entry.home],
        illustrated ? PLACE_ART[entry.home] : undefined,
      ),
    }));

    const pairs: ConnectPair[] = chosen.map((entry) => ({
      leftId: animalId(entry),
      rightId: entry.home,
    }));

    return {
      level,
      prompt: { speech: "Can you help each animal find its home?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: "Everybody is home!",
      hint: "Picture one animal at home. What is all around it?",
      meta: {
        objective: "joins each animal to the place it lives",
        tags: ["family:place", conceptOf(chosen)],
      },
    };
  },
});

export const HABITAT_ACTIVITIES = [animalHabitats, homePartners];
