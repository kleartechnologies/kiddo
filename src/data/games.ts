import type { Game } from "@/lib/games/types";
import type { MessageKey } from "@/lib/i18n/messages";

/**
 * The KIDDO catalogue.
 *
 * Local TypeScript on purpose: no database, no CMS. Adding a game means adding
 * an entry here and a component under `components/games`.
 *
 * Every word a person reads is a message key, never a string: the shelf holds
 * a game's *shape* — its id, route, colour, cast, artwork and themes — and the
 * catalogue in `lib/i18n/messages` holds its words. So a new language adds
 * lines to two files and touches nothing here, and a game cannot ship with a
 * name in one language only, because `MessageKey` will not let it.
 */
export const GAMES: Game[] = [
  {
    id: "memory-match",
    title: "game.memory-match.title",
    tagline: "game.memory-match.tagline",
    parentSummary: "game.memory-match.summary",
    category: "memory",
    ageRange: { min: 4, max: 8 },
    difficulty: "gentle",
    accent: "sage",
    cast: ["kiddo", "bibi"],
    /* Two BIBI cards and one still face down, with KIDDO pointing at the
       row: the game is remembering where a friend was hiding. */
    artwork: {
      host: "kiddo",
      action: "pointing",
      motif: { kind: "memory", face: "bibi" },
    },
    route: "/play/memory-match",
    access: "free",
    status: "ready",
    themes: [
      { id: "friends", title: "game.memory-match.theme.friends", accent: "sage", access: "free" },
      { id: "animals", title: "game.memory-match.theme.animals", accent: "sprout", access: "free" },
      { id: "shapes", title: "game.memory-match.theme.shapes", accent: "tide", access: "premium" },
      {
        id: "colours",
        title: "game.memory-match.theme.colours",
        accent: "blossom",
        access: "premium",
      },
    ],
  },
  {
    id: "find-it",
    title: "game.find-it.title",
    tagline: "game.find-it.tagline",
    parentSummary: "game.find-it.summary",
    category: "discovery",
    ageRange: { min: 4, max: 7 },
    difficulty: "gentle",
    accent: "apricot",
    cast: ["foxy", "pip"],
    /* One friend picked out of three, under a magnifier. FOXY hosts it and
       PIP is the one being looked for. */
    artwork: {
      host: "foxy",
      action: "holding",
      motif: { kind: "search", target: "pip", others: ["wally", "bibi"] },
    },
    route: "/play/find-it",
    access: "free",
    status: "ready",
    themes: [
      { id: "friends", title: "game.find-it.theme.friends", accent: "apricot", access: "free" },
      { id: "animals", title: "game.find-it.theme.animals", accent: "sprout", access: "free" },
      { id: "colours", title: "game.find-it.theme.colours", accent: "blossom", access: "premium" },
    ],
  },
  {
    id: "math-quest",
    title: "game.math-quest.title",
    tagline: "game.math-quest.tagline",
    parentSummary: "game.math-quest.summary",
    category: "numbers",
    ageRange: { min: 4, max: 8 },
    difficulty: "growing",
    accent: "tide",
    cast: ["wally", "kiddo"],
    /* WALLY holding a sum whose answer is still an empty slot. Small enough
       for a five-year-old to actually answer while looking at the card. */
    artwork: {
      host: "wally",
      action: "holding",
      motif: { kind: "sum", left: 2, right: 3, operation: "+" },
    },
    route: "/play/math-quest",
    access: "free",
    status: "ready",
    /* One chip per group of activities the Math pack actually deals. Every
       round mixes all of them, so none of it sits behind a lock. */
    themes: [
      { id: "counting", title: "game.math-quest.theme.counting", accent: "tide", access: "free" },
      { id: "numbers", title: "game.math-quest.theme.numbers", accent: "honey", access: "free" },
      { id: "compare", title: "game.math-quest.theme.compare", accent: "sage", access: "free" },
      { id: "adding", title: "game.math-quest.theme.adding", accent: "apricot", access: "free" },
      {
        id: "patterns",
        title: "game.math-quest.theme.patterns",
        accent: "blossom",
        access: "free",
      },
    ],
  },
  {
    id: "english-quest",
    title: "game.english-quest.title",
    tagline: "game.english-quest.tagline",
    parentSummary: "game.english-quest.summary",
    category: "letters",
    ageRange: { min: 4, max: 8 },
    difficulty: "growing",
    accent: "blossom",
    cast: ["bibi", "kiddo"],
    /* C _ T. BIBI holds the letters and the gap is the game. */
    artwork: {
      host: "bibi",
      action: "holding",
      motif: { kind: "word", letters: ["C", "T"] },
    },
    route: "/play/english-quest",
    access: "free",
    status: "ready",
    /* One chip per activity the English pack actually deals. Every round
       mixes all four, so none of it sits behind a lock. */
    themes: [
      {
        id: "letters",
        title: "game.english-quest.theme.letters",
        accent: "blossom",
        access: "free",
      },
      { id: "case", title: "game.english-quest.theme.case", accent: "sage", access: "free" },
      { id: "sounds", title: "game.english-quest.theme.sounds", accent: "sprout", access: "free" },
      {
        id: "spelling",
        title: "game.english-quest.theme.spelling",
        accent: "apricot",
        access: "free",
      },
    ],
  },
  {
    id: "logic-quest",
    title: "game.logic-quest.title",
    tagline: "game.logic-quest.tagline",
    parentSummary: "game.logic-quest.summary",
    category: "patterns",
    ageRange: { min: 4, max: 8 },
    difficulty: "growing",
    accent: "sprout",
    cast: ["foxy", "kiddo"],
    /* Circle, square, circle, and the slot that finishes the pattern. FOXY
       is the clever one, so FOXY hosts the puzzle. */
    artwork: {
      host: "foxy",
      action: "pointing",
      motif: { kind: "pattern", sequence: ["circle", "square", "circle"] },
    },
    route: "/play/logic-quest",
    access: "free",
    status: "ready",
    /* One chip per activity the Logic pack actually deals. Every round mixes
       all four, so none of it sits behind a lock. */
    themes: [
      {
        id: "patterns",
        title: "game.logic-quest.theme.patterns",
        accent: "sprout",
        access: "free",
      },
      {
        id: "odd-one-out",
        title: "game.logic-quest.theme.odd-one-out",
        accent: "apricot",
        access: "free",
      },
      { id: "sorting", title: "game.logic-quest.theme.sorting", accent: "tide", access: "free" },
      {
        id: "sequences",
        title: "game.logic-quest.theme.sequences",
        accent: "honey",
        access: "free",
      },
    ],
  },
  {
    id: "shapes-colours-quest",
    title: "game.shapes-colours-quest.title",
    tagline: "game.shapes-colours-quest.tagline",
    parentSummary: "game.shapes-colours-quest.summary",
    category: "shapes",
    ageRange: { min: 3, max: 8 },
    difficulty: "growing",
    accent: "honey",
    cast: ["pip", "kiddo"],
    /* Four shapes in four colours, as big as the bed allows, with PIP
       arranging them. The only card in the set with no tiles on it. */
    artwork: {
      host: "pip",
      action: "holding",
      motif: {
        kind: "shapes",
        shapes: ["circle", "square", "triangle", "star"],
      },
    },
    route: "/play/shapes-colours-quest",
    access: "free",
    status: "ready",
    /* One chip per group of activities the Shapes pack actually deals. Every
       round mixes them, so none of it sits behind a lock. */
    themes: [
      {
        id: "shapes",
        title: "game.shapes-colours-quest.theme.shapes",
        accent: "honey",
        access: "free",
      },
      {
        id: "colours",
        title: "game.shapes-colours-quest.theme.colours",
        accent: "blossom",
        access: "free",
      },
      {
        id: "matching",
        title: "game.shapes-colours-quest.theme.matching",
        accent: "tide",
        access: "free",
      },
      {
        id: "counting",
        title: "game.shapes-colours-quest.theme.counting",
        accent: "sage",
        access: "free",
      },
      {
        id: "space",
        title: "game.shapes-colours-quest.theme.space",
        accent: "apricot",
        access: "free",
      },
    ],
  },
  {
    id: "match-quest",
    title: "game.match-quest.title",
    tagline: "game.match-quest.tagline",
    parentSummary: "game.match-quest.summary",
    category: "letters",
    ageRange: { min: 4, max: 7 },
    difficulty: "growing",
    /* Blue, because blue is the colour a card turns the moment the child
       picks it up on the board. The hue on the shelf is the hue of choosing. */
    accent: "tide",
    cast: ["bibi", "kiddo"],
    /* A and a, joined, and one card still looking for its partner. BIBI
       holds them: letters are BIBI's world. */
    artwork: {
      host: "bibi",
      action: "holding",
      motif: { kind: "pair", left: "A", right: "a" },
    },
    route: "/play/match-quest",
    access: "free",
    status: "ready",
    /* One chip, because the Matching pack deals one activity today. It is a
       shelf that grows sideways: a second chip is a second activity, not a
       second game. */
    themes: [
      { id: "case", title: "game.match-quest.theme.case", accent: "tide", access: "free" },
    ],
  },
  {
    id: "general-knowledge-quest",
    title: "game.general-knowledge-quest.title",
    tagline: "game.general-knowledge-quest.tagline",
    parentSummary: "game.general-knowledge-quest.summary",
    category: "discovery",
    ageRange: { min: 3, max: 8 },
    difficulty: "growing",
    accent: "sage",
    cast: ["foxy", "kiddo"],
    /* KIDDO showing FOXY the world. The one card that earns a second
       character: discovering something is a thing you do together. */
    artwork: {
      host: "kiddo",
      action: "pointing",
      companion: "foxy",
      motif: { kind: "world" },
    },
    route: "/play/general-knowledge-quest",
    access: "free",
    status: "ready",
    /* One chip per corner of the world the pack covers. Every round tours
       several of them, so none of it sits behind a lock. */
    themes: [
      {
        id: "animals",
        title: "game.general-knowledge-quest.theme.animals",
        accent: "sprout",
        access: "free",
      },
      {
        id: "nature",
        title: "game.general-knowledge-quest.theme.nature",
        accent: "tide",
        access: "free",
      },
      {
        id: "everyday",
        title: "game.general-knowledge-quest.theme.everyday",
        accent: "apricot",
        access: "free",
      },
      {
        id: "people",
        title: "game.general-knowledge-quest.theme.people",
        accent: "blossom",
        access: "free",
      },
      {
        id: "body",
        title: "game.general-knowledge-quest.theme.body",
        accent: "sage",
        access: "free",
      },
      {
        id: "space",
        title: "game.general-knowledge-quest.theme.space",
        accent: "honey",
        access: "free",
      },
    ],
  },
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}

/**
 * Themes queued for later content packs. Shown to the child as a gentle
 * "more is coming" row, and to us as the roadmap.
 *
 * Keys, like everything else on this shelf: the roadmap is read by a child
 * too, and a chip saying "Science" to a Malay-speaking five year old would be
 * the one word on the screen they could not read.
 */
export const UPCOMING_THEMES = [
  "upcoming.science",
  "upcoming.time",
  "upcoming.music",
  "upcoming.feelings",
] as const satisfies readonly MessageKey[];
