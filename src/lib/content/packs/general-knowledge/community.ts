import { defineGeneratedActivity, type ChallengeSpec } from "../../activity";
import type { Level } from "../../difficulty";
import type { Rng } from "../../rng";
import type { ConnectNode, ConnectPair } from "../../types";
import { defineQuizActivity, except, pic, type Question, type Sym } from "./shared";

/**
 * The people who help, and the places a child goes.
 *
 * Two decisions worth writing down.
 *
 * The helpers are drawn as people, and the set is deliberately mixed — the
 * doctor and the firefighter here are women, the chef and the teacher men —
 * because a child who only ever meets one arrangement learns that too. No
 * question anywhere in this file depends on who is in the picture; the answer
 * is always the job.
 *
 * The places are the ones every child has, not the ones some children have.
 * A school, a shop, a park. Nothing that assumes a particular country, faith,
 * or kind of family.
 */

/* ---------------------------------------------------------------- helpers */

const HELPERS = {
  doctor: pic("👩‍⚕️", "a doctor"),
  firefighter: pic("👩‍🚒", "a firefighter"),
  police: pic("👮", "a police officer"),
  teacher: pic("👨‍🏫", "a teacher"),
  chef: pic("👨‍🍳", "a chef"),
  farmer: pic("👨‍🌾", "a farmer"),
  builder: pic("👷", "a builder"),
  pilot: pic("👩‍✈️", "a pilot"),
  astronaut: pic("👨‍🚀", "an astronaut"),
  artist: pic("👩‍🎨", "an artist"),
  mechanic: pic("👨‍🔧", "a mechanic"),
} as const;

type HelperKey = keyof typeof HELPERS;

export const HELPER_TILES: readonly Sym[] = Object.values(HELPERS);

const JOBS: readonly {
  key: HelperKey;
  ask: string;
  because: string;
  hint: string;
  level: 1 | 2 | 3;
}[] = [
  { key: "doctor", ask: "Who helps you get better when you are poorly?", because: "A doctor checks you over and helps you get better.", hint: "You would see this person at the surgery or the hospital.", level: 1 },
  { key: "teacher", ask: "Who helps you learn new things at school?", because: "A teacher helps everybody in the class learn.", hint: "You would see this person in a classroom.", level: 1 },
  { key: "firefighter", ask: "Who puts out fires and keeps everybody safe?", because: "A firefighter puts out fires and rescues people.", hint: "This person rides on the fire engine.", level: 1 },
  { key: "chef", ask: "Who cooks all the food in a big kitchen?", because: "A chef cooks the food in a restaurant kitchen.", hint: "Look for the tall white hat.", level: 2 },
  { key: "farmer", ask: "Who looks after the animals and grows the food on a farm?", because: "A farmer grows the crops and looks after the animals.", hint: "This person drives the tractor.", level: 2 },
  { key: "builder", ask: "Who builds new houses out of bricks?", because: "A builder puts up walls and roofs and builds new houses.", hint: "Look for the hard hat.", level: 2 },
  { key: "police", ask: "Who helps you if you get lost, and keeps everybody safe?", because: "A police officer helps people and keeps everybody safe.", hint: "This person wears a uniform and a special hat.", level: 2 },
  { key: "pilot", ask: "Who flies an aeroplane?", because: "A pilot sits at the front and flies the aeroplane.", hint: "This person works high up in the sky.", level: 3 },
  { key: "astronaut", ask: "Who travels all the way up into space?", because: "An astronaut rides a rocket up into space.", hint: "This person needs a very big helmet.", level: 3 },
  { key: "artist", ask: "Who paints beautiful pictures?", because: "An artist paints and draws pictures.", hint: "This person works with brushes and paint.", level: 3 },
  { key: "mechanic", ask: "Who mends a car when it stops working?", because: "A mechanic mends cars and engines.", hint: "This person works with spanners in a garage.", level: 3 },
];

export const communityHelpers = defineQuizActivity({
  id: "community-helpers",
  title: "People Who Help Us",
  activityType: "community",
  ageRange: { min: 3, max: 6 },
  host: "kiddo",
  questions: JOBS.map((job): Question => {
    const answer = HELPERS[job.key];
    return {
      level: job.level,
      ask: job.ask,
      answer,
      distractors: except(HELPER_TILES, answer),
      because: job.because,
      hint: job.hint,
      idea: `helper:${job.key}`,
      family: "person who helps",
    };
  }),
});

/* ------------------------------------------------------------------ tools */

/**
 * The thing each helper works with.
 *
 * Every entry is *one* helper's, and no helper has two. That is not tidiness:
 * `helperPartners` below joins these up as a board, and a board where two
 * pictures could fairly meet the same person has no right answer. So the
 * spanner belongs to the mechanic and nobody else, the tractor to the farmer
 * and nobody else, and a job whose tool is shared — a teacher's pencil, a
 * nurse's gloves — is simply not on this list.
 *
 * Four of the ten are vehicles, which is not a category error: what a pilot
 * uses to do the job is the aeroplane, the same way a doctor uses the
 * stethoscope. The question the child answers is always "what does this
 * person work with", never "what kind of thing is this".
 */
const TOOLS = {
  stethoscope: pic("🩺", "a stethoscope"),
  hammer: pic("🔨", "a hammer"),
  brush: pic("🖌️", "a paintbrush"),
  pan: pic("🍳", "a frying pan"),
  spanner: pic("🔧", "a spanner"),
  hose: pic("🧯", "a fire extinguisher"),
  tractor: pic("🚜", "a tractor"),
  plane: pic("✈️", "an aeroplane"),
  rocket: pic("🚀", "a rocket"),
  patrolCar: pic("🚓", "a police car"),
} as const;

type ToolKey = keyof typeof TOOLS;

const TOOL_TILES: readonly Sym[] = Object.values(TOOLS);

const TOOL_FACTS: readonly {
  tool: ToolKey;
  ask: string;
  because: string;
  idea: string;
  /** Tiles that would also be a fair answer, kept off the board. */
  avoid?: readonly ToolKey[];
  level: 1 | 2 | 3;
}[] = [
  { tool: "stethoscope", ask: "What does a doctor use to listen to your heart?", because: "A doctor listens to your heart through a stethoscope.", idea: "tool:doctor", level: 2 },
  { tool: "hammer", ask: "What does a builder use to knock in a nail?", because: "A builder taps nails in with a hammer.", idea: "tool:builder", level: 2 },
  { tool: "pan", ask: "What does a chef cook an egg in?", because: "A chef cooks in a frying pan on the hob.", idea: "tool:chef", level: 2 },
  { tool: "tractor", ask: "What does a farmer drive up and down the field?", because: "A farmer drives a tractor to pull things across the field.", idea: "tool:farmer", level: 2 },
  { tool: "brush", ask: "What does an artist paint with?", because: "An artist paints with a paintbrush.", idea: "tool:artist", level: 3 },
  { tool: "spanner", ask: "What does a mechanic tighten a bolt with?", because: "A mechanic uses a spanner to tighten bolts.", idea: "tool:mechanic", level: 3 },
  { tool: "hose", ask: "What would you grab if something started burning?", because: "A fire extinguisher sprays a fire out. Only grown-ups use one.", idea: "tool:firefighter", level: 3 },
  { tool: "patrolCar", ask: "Which one has a flashing blue light on top and a loud siren?", because: "A police officer drives a police car with a flashing blue light.", idea: "tool:police", level: 3 },
  /* Both of these fly, so neither is ever on the board opposite the other. */
  { tool: "plane", ask: "What does a pilot fly, to carry lots of people at once?", because: "A pilot flies an aeroplane full of passengers.", idea: "tool:pilot", avoid: ["rocket"], level: 3 },
  { tool: "rocket", ask: "What does an astronaut ride all the way up into space?", because: "An astronaut rides a rocket up into space.", idea: "tool:astronaut", avoid: ["plane"], level: 3 },
];

export const helperTools = defineQuizActivity({
  id: "helper-tools",
  title: "Tools of the Job",
  activityType: "community",
  ageRange: { min: 4, max: 6 },
  host: "wally",
  questions: TOOL_FACTS.map((fact): Question => {
    const answer = TOOLS[fact.tool];
    const barred = new Set<string>([
      answer.key,
      ...(fact.avoid ?? []).map((key) => TOOLS[key].key),
    ]);
    return {
      level: fact.level,
      ask: fact.ask,
      answer,
      distractors: TOOL_TILES.filter((tile) => !barred.has(tile.key)),
      because: fact.because,
      hint: "Picture the person at work. What have they got with them?",
      idea: fact.idea,
      family: "tool",
    };
  }),
});

/* -------------------------------------------------- helpers and their tools */

/**
 * The same ten facts, joined up instead of picked from.
 *
 * `helperTools` shows one tool and asks whose it is. This puts three, four or
 * five helpers on the board at once and asks for all of them together, which
 * is a harder thing than it sounds: a tool that has already been used is gone,
 * so the last line is decided by the first four. Same objective, same
 * `activityType`, no new engine — `ConnectStage` has drawn `homePartners`
 * since the habitats pack landed.
 *
 * ## How a level gets harder
 *
 * | | pairs | who is on the board |
 * |-|-------|---------------------|
 * |1| 3 | the four a child meets in picture books |
 * |2| 4 | and the ones whose tool has to be recognised |
 * |3| 5 | and the ones that fly, never both at once |
 */
interface Job {
  helper: HelperKey;
  tool: ToolKey;
  /** The level this pairing joins the pool at. Pools are cumulative. */
  level: 1 | 2 | 3;
  /** Helpers this one must never share a board with. Both ways. */
  avoid?: readonly HelperKey[];
}

const JOB_PAIRS: readonly Job[] = [
  { helper: "doctor", tool: "stethoscope", level: 1 },
  { helper: "builder", tool: "hammer", level: 1 },
  { helper: "chef", tool: "pan", level: 1 },
  { helper: "firefighter", tool: "hose", level: 1 },
  { helper: "farmer", tool: "tractor", level: 2 },
  /* A mechanic works with cars all day, so the police patrol car must never
     be on the mechanic's board: joining the mechanic to the car would be a
     fair guess, and a fair guess marked wrong is a broken board. */
  { helper: "mechanic", tool: "spanner", level: 2, avoid: ["police"] },
  { helper: "artist", tool: "brush", level: 2 },
  { helper: "police", tool: "patrolCar", level: 3, avoid: ["mechanic"] },
  /* A four year old knows that both of these fly and may not yet know which
     flies what. On one board that is a fact to learn; on the same board it is
     a guess, so they are kept apart. */
  { helper: "pilot", tool: "plane", level: 3, avoid: ["astronaut"] },
  { helper: "astronaut", tool: "rocket", level: 3, avoid: ["pilot"] },
];

/**
 * The honest content count of this objective: ten helpers and the one thing
 * each of them works with. Not the boards — there are hundreds of those.
 */
export const JOB_FACTS: readonly Job[] = JOB_PAIRS;

const PAIRS_AT: Record<1 | 2 | 3, number> = { 1: 3, 2: 4, 3: 5 };

function jobsAtLevel(level: Level): readonly Job[] {
  const ceiling = level <= 1 ? 1 : level === 2 ? 2 : 3;
  return JOB_PAIRS.filter((job) => job.level <= ceiling);
}

/** Two helpers that must not meet, checked both ways round. */
function clash(a: Job, b: Job): boolean {
  return Boolean(a.avoid?.includes(b.helper) || b.avoid?.includes(a.helper));
}

/**
 * Choose the helpers for one board.
 *
 * Greedy over a shuffled pool, refusing anything that clashes with what is
 * already down, and retried because a greedy walk can come up short. The
 * fallback is the best attempt rather than a relaxed rule: a board of four
 * where five were asked for is merely easier, and an ambiguous one is broken.
 */
function joinable(pool: readonly Job[], count: number, rng: Rng): Job[] {
  let best: Job[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const picked: Job[] = [];
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
 * The order the tools are laid out in.
 *
 * Shuffled on its own, and *deranged* from three tiles up, so no tool is ever
 * left facing the person it belongs to and a child who joins straight across
 * is never accidentally right. Two tiles are left to a plain shuffle: the only
 * derangement of two is the swap, which would make the crossed line always
 * correct — a pattern to learn instead of a fact.
 */
function displace(chosen: readonly Job[], rng: Rng): Job[] {
  if (chosen.length < 3) return rng.shuffle(chosen);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = rng.shuffle(chosen);
    if (order.every((entry, index) => entry !== chosen[index])) return order;
  }

  return [...chosen.slice(1), chosen[0]];
}

const helperId = (job: Job) => `helper-${job.helper}`;
const toolId = (job: Job) => `tool-${job.tool}`;

/**
 * The name of the idea behind a board.
 *
 * The *set* of correspondences it practises, sorted, so the same four helpers
 * dealt to different rows is one thing to have learned. It is deliberately not
 * a way of counting: `JOB_FACTS` is the number that means something to a
 * child, and the pack's test counts that.
 */
function conceptOf(chosen: readonly Job[]): string {
  const facts = chosen.map((job) => `${job.helper}>${job.tool}`).sort();
  return `concept:job:${facts.join("+")}`;
}

export const helperPartners = defineGeneratedActivity({
  id: "helper-partners",
  packId: "general-knowledge",
  title: "Who Uses What",
  category: "general-knowledge",
  activityType: "community",
  kind: "connect",
  ageRange: { min: 4, max: 7 },
  host: "wally",
  levels: [1, 2, 3],
  generate: ({ level, rng }): ChallengeSpec => {
    const wanted = PAIRS_AT[level <= 1 ? 1 : level === 2 ? 2 : 3];
    const chosen = joinable(jobsAtLevel(level), wanted, rng);

    const left: ConnectNode[] = chosen.map((job) => ({
      id: helperId(job),
      item: HELPERS[job.helper].item,
    }));

    const right: ConnectNode[] = displace(chosen, rng).map((job) => ({
      id: toolId(job),
      item: TOOLS[job.tool].item,
    }));

    const pairs: ConnectPair[] = chosen.map((job) => ({
      leftId: helperId(job),
      rightId: toolId(job),
    }));

    return {
      level,
      prompt: { speech: "Can you give everybody the thing they work with?" },
      payload: { kind: "connect", left, right, pairs },
      explanation: "Everybody has what they need!",
      hint: "Picture one person at work. What are they holding?",
      meta: {
        objective: "joins each helper to the thing they work with",
        tags: ["family:tool", conceptOf(chosen)],
      },
    };
  },
});

/* ----------------------------------------------------------------- places */

const PLACES = {
  school: pic("🏫", "school"),
  hospital: pic("🏥", "the hospital"),
  shop: pic("🏪", "the shop"),
  library: pic("📚", "the library"),
  playground: pic("🛝", "the playground"),
  beach: pic("🏖️", "the beach"),
  home: pic("🏠", "your home"),
  postOffice: pic("🏤", "the post office"),
  station: pic("🚉", "the train station"),
  airport: pic("🛫", "the airport"),
  restaurant: pic("🍽️", "a restaurant"),
  castle: pic("🏰", "a castle"),
} as const;

type PlaceKey = keyof typeof PLACES;

export const TOWN_TILES: readonly Sym[] = Object.values(PLACES);

const GOING: readonly { key: PlaceKey; ask: string; because: string; idea: string; level: 1 | 2 | 3 }[] = [
  { key: "school", ask: "Where do you go to learn with your teacher?", because: "You learn at school with your teacher and your friends.", idea: "place:school", level: 1 },
  { key: "home", ask: "Where do you go at the end of the day to sleep in your own bed?", because: "Home is where your own bed is.", idea: "place:home", level: 1 },
  { key: "shop", ask: "Where would you go to buy some bread and milk?", because: "You buy food at the shop.", idea: "place:shop", level: 1 },
  { key: "hospital", ask: "Where would you go if you hurt yourself badly?", because: "Doctors and nurses look after people at the hospital.", idea: "place:hospital", level: 2 },
  { key: "playground", ask: "Where would you go to play on the swings and the slide?", because: "Swings and slides are at the playground.", idea: "place:playground", level: 2 },
  { key: "library", ask: "Where would you go to borrow a book to read at home?", because: "You borrow books from the library.", idea: "place:library", level: 2 },
  { key: "beach", ask: "Where would you go to build a sandcastle by the sea?", because: "The beach is where the sand meets the sea.", idea: "place:beach", level: 2 },
  { key: "station", ask: "Where do you go to catch a train?", because: "Trains stop for you at the station.", idea: "place:station", level: 3 },
  { key: "airport", ask: "Where do aeroplanes take off and land?", because: "Aeroplanes take off and land at the airport.", idea: "place:airport", level: 3 },
  { key: "postOffice", ask: "Where would you go to post a parcel?", because: "You send parcels and letters from the post office.", idea: "place:post-office", level: 3 },
  { key: "restaurant", ask: "Where would you go to eat a meal that a chef cooks for you?", because: "A chef cooks your meal at a restaurant.", idea: "place:restaurant", level: 3 },
  { key: "castle", ask: "In a story, where would a king or a queen live?", because: "Kings and queens live in castles in stories.", idea: "place:castle", level: 3 },
];

export const places = defineQuizActivity({
  id: "places",
  title: "Places We Go",
  activityType: "places",
  ageRange: { min: 3, max: 6 },
  host: "bibi",
  questions: GOING.map((entry): Question => {
    const answer = PLACES[entry.key];
    return {
      level: entry.level,
      ask: entry.ask,
      answer,
      distractors: except(TOWN_TILES, answer),
      because: entry.because,
      hint: "Picture yourself walking in through the door.",
      idea: entry.idea,
      family: "place you go",
    };
  }),
});

export const COMMUNITY_ACTIVITIES = [communityHelpers, helperTools, helperPartners, places];
