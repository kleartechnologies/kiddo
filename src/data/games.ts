import type { Game } from "@/lib/games/types";

/**
 * The KIDDO catalogue.
 *
 * Local TypeScript on purpose: no database, no CMS. Adding a game means adding
 * an entry here and a component under `components/games`.
 */
export const GAMES: Game[] = [
  {
    id: "memory-match",
    title: "Memory Match",
    tagline: "Find the matching friends!",
    parentSummary:
      "Flip cards and remember where each friend is hiding. Builds visual memory and concentration.",
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
      { id: "friends", title: "KIDDO & Friends", accent: "sage", access: "free" },
      { id: "animals", title: "Animals", accent: "sprout", access: "free" },
      { id: "shapes", title: "Shapes", accent: "tide", access: "premium" },
      { id: "colours", title: "Colours", accent: "blossom", access: "premium" },
    ],
  },
  {
    id: "find-it",
    title: "Find It!",
    tagline: "Can you find the right one?",
    parentSummary:
      "Spot the named character or object among several choices. Builds recognition and vocabulary.",
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
      { id: "friends", title: "KIDDO & Friends", accent: "apricot", access: "free" },
      { id: "animals", title: "Animals", accent: "sprout", access: "free" },
      { id: "colours", title: "Colours", accent: "blossom", access: "premium" },
    ],
  },
  {
    id: "math-quest",
    title: "Math Quest",
    tagline: "Let's play with numbers!",
    parentSummary:
      "Ten questions drawn fresh each time: counting, number recognition, bigger and smaller, adding and taking away, number sequences and patterns.",
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
      { id: "counting", title: "Counting 1-10", accent: "tide", access: "free" },
      { id: "numbers", title: "Number Friends", accent: "honey", access: "free" },
      { id: "compare", title: "Bigger or Smaller", accent: "sage", access: "free" },
      { id: "adding", title: "Adding & Taking Away", accent: "apricot", access: "free" },
      { id: "patterns", title: "Patterns & Sequences", accent: "blossom", access: "free" },
    ],
  },
  {
    id: "english-quest",
    title: "English Quest",
    tagline: "Let's play with letters and words!",
    parentSummary:
      "Ten questions drawn fresh each time: naming letters, matching big and little letters, hearing the sound a word starts with, and finding the letter missing from a word.",
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
      { id: "letters", title: "Knowing Letters", accent: "blossom", access: "free" },
      { id: "case", title: "Big & Little Letters", accent: "sage", access: "free" },
      { id: "sounds", title: "Beginning Sounds", accent: "sprout", access: "free" },
      { id: "spelling", title: "Finishing Words", accent: "apricot", access: "free" },
    ],
  },
  {
    id: "logic-quest",
    title: "Logic Quest",
    tagline: "Let's work it out together!",
    parentSummary:
      "Ten puzzles drawn fresh each time: finishing a repeating pattern, spotting the one that does not belong, sorting things into the group they fit, and working out what comes next in a sequence.",
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
      { id: "patterns", title: "Finishing Patterns", accent: "sprout", access: "free" },
      { id: "odd-one-out", title: "Odd One Out", accent: "apricot", access: "free" },
      { id: "sorting", title: "Sorting Things Out", accent: "tide", access: "free" },
      { id: "sequences", title: "What Comes Next", accent: "honey", access: "free" },
    ],
  },
  {
    id: "shapes-colours-quest",
    title: "Shapes & Colours Quest",
    tagline: "Let's look closely together!",
    parentSummary:
      "Ten pictures drawn fresh each time: naming shapes and colours, matching one thing while ignoring another, big and small, counting, corners and sides, where things are, mirror shapes, and patterns of colour and size.",
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
      { id: "shapes", title: "Knowing Shapes", accent: "honey", access: "free" },
      { id: "colours", title: "Knowing Colours", accent: "blossom", access: "free" },
      { id: "matching", title: "Same or Different", accent: "tide", access: "free" },
      { id: "counting", title: "How Many?", accent: "sage", access: "free" },
      { id: "space", title: "Where Things Are", accent: "apricot", access: "free" },
    ],
  },
  {
    id: "match-quest",
    title: "Match Quest",
    tagline: "Find the friends that belong together!",
    parentSummary:
      "Ten boards drawn fresh each time. Every capital letter has its lower case partner hiding among the others, and the child pairs them up by tapping one card and then the other, or by dragging one onto the other. Nothing is lost by a pair that does not hold.",
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
      { id: "case", title: "Big & Little Letters", accent: "tide", access: "free" },
    ],
  },
  {
    id: "general-knowledge-quest",
    title: "General Knowledge Quest",
    tagline: "Let's find out about the world!",
    parentSummary:
      "Ten questions drawn fresh each time from nearly four hundred facts: animals and their homes, sounds, babies and food; plants, weather and seasons; food, clothes and the things in a house; vehicles, the people who help us and the places we go; the body, the senses, the sky, and staying safe.",
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
      { id: "animals", title: "Animals", accent: "sprout", access: "free" },
      { id: "nature", title: "Nature & Weather", accent: "tide", access: "free" },
      { id: "everyday", title: "Everyday Things", accent: "apricot", access: "free" },
      { id: "people", title: "People & Places", accent: "blossom", access: "free" },
      { id: "body", title: "My Body", accent: "sage", access: "free" },
      { id: "space", title: "Space & Safety", accent: "honey", access: "free" },
    ],
  },
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}

/**
 * Themes queued for later content packs. Shown to the child as a gentle
 * "more is coming" row, and to us as the roadmap.
 */
export const UPCOMING_THEMES = ["Science", "Time", "Music", "Feelings"] as const;
