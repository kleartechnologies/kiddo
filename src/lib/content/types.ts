import type { Accent, AgeRange, CharacterId } from "@/lib/games/types";
import type { ArtId } from "./art";
import type { Level } from "./difficulty";
import type { Rng } from "./rng";

/**
 * The KIDDO content vocabulary.
 *
 * One idea holds the whole file up: **what is being learned and how it is
 * played are two different axes.**
 *
 * - `ActivityType` says what a challenge teaches — addition, spelling,
 *   odd one out. Editorial. There will be dozens.
 * - `ChallengeKind` says how the child answers it — pick one, put in order,
 *   pair them up. Mechanical. There will stay very few.
 *
 * Addition and letter recognition are nothing alike as subjects and identical
 * as interactions: a question, some tiles, tap the right one. Keying the
 * payload on the interaction is what buys us a hundred challenges without a
 * hundred components — one engine renders every `choice` challenge ever
 * written, and a new subject is data.
 *
 * Nothing here is React, and nothing here knows a game exists.
 */

/** A themed bundle of activities. Grown-up taxonomy; the child sees worlds. */
export type PackId =
  | "math"
  | "english"
  | "logic"
  | "shapes"
  | "general-knowledge"
  | "match"
  | "discovery";

/** The subject a challenge belongs to. Used for filtering, never shown. */
export type ContentCategory =
  | "math"
  | "english"
  | "logic"
  | "memory"
  | "vocabulary"
  | "shapes"
  | "colours"
  | "general-knowledge"
  | "discovery";

/**
 * What the child is practising. This union grows every time content does, and
 * adding to it touches no engine — an engine only ever reads `ChallengeKind`.
 */
export type ActivityType =
  /* Math */
  | "counting"
  | "number-recognition"
  | "addition"
  | "subtraction"
  | "comparison"
  | "number-sequence"
  | "missing-number"
  | "before-and-after"
  /* English */
  | "letter-recognition"
  | "letter-case"
  | "letter-sequence"
  | "phonics"
  | "rhyming"
  | "spelling"
  | "vocabulary"
  | "word-matching"
  | "ending-sounds"
  | "singular-plural"
  | "opposites"
  /* Logic */
  | "memory"
  | "matching"
  | "patterns"
  | "sequences"
  | "sorting"
  | "odd-one-out"
  | "goes-together"
  /* Shapes & Colours */
  | "shape-recognition"
  | "colour-recognition"
  | "same-or-different"
  | "size-comparison"
  | "classifying"
  | "shape-properties"
  | "position"
  | "symmetry"
  /* General Knowledge */
  | "animal-recognition"
  | "animal-habitats"
  | "animal-sounds"
  | "baby-animals"
  | "animal-diet"
  | "plants"
  | "weather"
  | "seasons"
  | "food-knowledge"
  | "everyday-objects"
  | "clothing"
  | "transport"
  | "community"
  | "places"
  | "body-parts"
  | "senses"
  | "healthy-habits"
  | "space-facts"
  | "day-and-night"
  | "living-things"
  | "life-cycles"
  | "natural-or-made"
  | "hot-or-cold"
  | "land-and-water"
  | "safety"
  /* Discovery */
  | "animals"
  | "colours"
  | "shapes"
  | "space"
  | "vehicles";

/**
 * How a challenge is answered, and therefore which engine can render it.
 *
 * Four, deliberately. `choice` carries the overwhelming majority of early
 * years content; `order`, `match` and `connect` exist because arranging,
 * pairing and joining are genuinely different gestures, not different
 * subjects. A fifth belongs here only when a new gesture arrives, never when a
 * new subject does.
 *
 * ## Why `connect` is not `match`
 *
 * It was the first thing checked, and the answer is in `Answer` rather than in
 * the payload. A `match` answer is `pairIds`: the pairs the child *found*.
 * There is no id for a pairing that was never authored, so a match answer
 * cannot say "the child put the dog with the fish" — which means whatever drew
 * the board had to work out that the two cards went together before it could
 * report anything. That is fine for Memory Match, where turning over two cards
 * and seeing they are the same *is* the game, and it is exactly wrong for a
 * line the child draws on purpose: the engine would be marking the answer.
 *
 * `connect` gives both sides their own stable ids so a join is reportable
 * whether or not it is right, and marking stays where `checkAnswer` is. That
 * is a different gesture, not a different subject, so it earns the kind.
 */
export type ChallengeKind = "choice" | "order" | "match" | "connect";

/* ------------------------------------------------------------------ items */

interface ItemBase {
  /**
   * Overrides the words the engine would derive. Everything shown to a child
   * has a name, because a picture alone cannot be read aloud.
   */
  label?: string;
}

export interface TextItem extends ItemBase {
  kind: "text";
  /** Brand voice: "CAT", "A" — upper case, the way a child first meets them. */
  text: string;
  /**
   * A picture drawn *above* the word, when one is wanted.
   *
   * The word stays the item. This is the scaffold beside it: an `A` with an
   * apple over it, a `CAT` with a cat over it — the child reads the word and
   * has something to check it against, which is the second rung of the
   * PICTURE -> PICTURE + WORD -> SYMBOL ladder in
   * `docs/kiddo-visual-system.md`.
   *
   * Optional, and all-or-nothing across a board: a tray with three of five
   * tiles anchored is a tray where the answer is the odd one out. What decides
   * is `boardIsDrawn` in `art.ts` — the library, not the level — because a
   * drawing and an emoji of the same thing ask a child for the same work, so
   * withholding one above the entry level removed no scaffold and only put two
   * art styles on one board. The rungs that do remove something (the window
   * widening, the pool widening) are elsewhere and untouched.
   *
   * An id with no drawing registered simply draws nothing, and the word is
   * exactly what it was.
   */
  art?: ArtId;
}

export interface NumberItem extends ItemBase {
  kind: "number";
  value: number;
}

export interface CharacterItem extends ItemBase {
  kind: "character";
  characterId: CharacterId;
}

export interface SwatchItem extends ItemBase {
  kind: "swatch";
  accent: Accent;
  /** Required: a colour has to be named in words a child knows, not "tide". */
  label: string;
}

/**
 * The shapes a four year old can name and tell apart at tile size.
 *
 * The first six are unmistakable in silhouette alone, which is why every pack
 * that writes a *pattern* in shapes uses only those: a repeat is answerable
 * without seeing colour exactly when no two of its symbols could be confused.
 *
 * `rectangle`, `oval` and `hexagon` are the three that break that promise on
 * purpose. A rectangle beside a square, or an oval beside a circle, is the
 * whole point of a shape-recognition question at the top level — telling those
 * apart *is* the skill — and a pack that offers them has to say so by choosing
 * them, which is why they sit at the end of the list rather than in the middle
 * of it. Logic enumerates its own six in `packs/logic/shared.ts` and is
 * untouched by their arriving here.
 */
export type ShapeName =
  | "circle"
  | "square"
  | "triangle"
  | "star"
  | "heart"
  | "diamond"
  | "rectangle"
  | "oval"
  | "hexagon";

/**
 * How big a shape is drawn, relative to the box it is drawn in.
 *
 * Not pixels: the box never changes, so a small circle and a big circle sit on
 * identically sized tiles and only the drawing inside them differs. That is
 * what makes "which one is bigger?" a question about the shapes rather than a
 * question about the layout.
 */
export type ShapeSize = "small" | "medium" | "large";

/**
 * A plain shape. The visual alphabet patterns, sorting and odd-one-out are
 * written in, and what Shapes & Colours is almost entirely made of.
 *
 * `accent` is decoration in most content — every shape has a house colour, and
 * two different shapes are already two different answers. It becomes the
 * question itself only when a challenge is *about* colour, and then the label
 * says the colour out loud so the board is answerable without seeing it.
 *
 * `size` is the same bargain one step along: absent in nearly all content, and
 * when present it is named in the label for the same reason.
 */
export interface ShapeItem extends ItemBase {
  kind: "shape";
  shape: ShapeName;
  accent?: Accent;
  size?: ShapeSize;
}

/**
 * Where one thing is, relative to another.
 *
 * The nine words a four year old learns first, and the only ones a `SceneItem`
 * can be built from. They are a closed list because each one has to be *drawn*
 * unambiguously, and because two of them drawn side by side must not look the
 * same: `beside` and `right` put the same shape in nearly the same place, so
 * content that asks about one never offers the other. That rule lives in the
 * pack that asks the question, not here.
 */
export type SpatialRelation =
  | "above"
  | "below"
  | "left"
  | "right"
  | "beside"
  | "inside"
  | "outside"
  | "near"
  | "far";

/**
 * Two shapes and the word between them: the star *above* the box.
 *
 * A scene is one item, not a container of items — it draws both of its shapes
 * in a single coordinate space, which is the only way "inside" can be drawn at
 * all. That is also why `subject` and `anchor` are `ShapeItem` and not
 * `ContentItem`: a friend or a swatch has its own idea of how big it is and
 * where its edges are, and could not be placed. The day a scene needs to hold
 * a picture, this widens — until then narrow is honest.
 *
 * Nothing here is Shapes-specific. Any pack that wants to ask where a thing is
 * gets the same item, and the engine that draws it does not know which one
 * asked.
 */
export interface SceneItem extends ItemBase {
  kind: "scene";
  /** The thing being placed. Drawn second, so it sits on top. */
  subject: ShapeItem;
  /** The thing it is placed against. `inside` draws it as an outline. */
  anchor: ShapeItem;
  relation: SpatialRelation;
}

/**
 * A picture of a thing in the world, and the word for it.
 *
 * The item every subject that is *about* things rather than about symbols has
 * been waiting for. A sum can be drawn from numerals, a letter is its own
 * picture and a shape has a path — but a penguin, a fire engine and a
 * toothbrush cannot be derived from anything, and no pack should have to
 * invent a way to show one.
 *
 * `glyph` is one character the platform draws in colour. Today that means an
 * emoji, which is the only picture library that ships with every device a
 * child will hold, is drawn at any size without pixelating, and is already
 * localised. It is deliberately typed as a string rather than as an enum of
 * illustrations: the day `public/illustrations` has a penguin in it, this
 * widens to hold a src and every existing challenge keeps working, because
 * nothing outside `ContentItemView` ever looks at what is in here.
 *
 * `label` is required — unlike everywhere else in this file, where a label is
 * an override. A picture has no text to fall back on, so a picture nobody can
 * name could not be read aloud, captioned, or checked by a grown-up.
 *
 * Nothing here is General Knowledge's. Any pack that wants to show a thing
 * gets the same item, and the engine that draws it does not know which one
 * asked.
 */
export interface PictureItem extends ItemBase {
  kind: "picture";
  /** One character, drawn in colour. Never a word, never markup. */
  glyph: string;
  /** Required: a picture that cannot be named cannot be a fair answer. */
  label: string;
  /**
   * Draw this as a KIDDO illustration instead of as the glyph.
   *
   * The widening the block above promised, and it is a *promotion* rather than
   * a replacement: `glyph` stays required, so an item that names an id nobody
   * has drawn yet — or a device that renders the drawing badly — falls back to
   * the picture the product has always shown. Twenty illustrations will never
   * catch an emoji set, and nothing here asks them to.
   *
   * Only `ContentItemView` reads it, which is the same promise `glyph` makes:
   * a pack names a thing, and no engine, stage or game learns how it is drawn.
   */
  art?: ArtId;
}

/** `value` pips of one hue. Three apples, five dots — counting without art. */
export interface CountItem extends ItemBase {
  kind: "count";
  value: number;
  accent?: Accent;
}

/**
 * Anything a challenge can put on a tile.
 *
 * The union is where `| PictureItem` goes the day `public/illustrations` has
 * something in it. Only the engine reads `kind`, exactly as only
 * `FindItChoice` reads Find It's.
 */
export type ContentItem =
  | TextItem
  | NumberItem
  | CharacterItem
  | SwatchItem
  | CountItem
  | ShapeItem
  | SceneItem
  | PictureItem;

/* ----------------------------------------------------------------- prompt */

/** Glyphs the stage may draw. Ids, not characters, so the engine picks the font's. */
export type PromptSymbol =
  | "plus"
  | "minus"
  | "equals"
  | "question"
  | "less"
  | "greater"
  /** The step in `2 → 4 → 6 → ?`. What makes a sequence read as a journey. */
  | "arrow";

/**
 * One piece of the big line across the stage.
 *
 * `2 + 3 = ?` is five parts. `C _ T` is three. The same three part kinds draw
 * both, which is why a spelling engine and an addition engine can be the same
 * component.
 */
export type PromptPart =
  | { kind: "item"; item: ContentItem }
  | { kind: "symbol"; symbol: PromptSymbol }
  | { kind: "blank" };

export interface Prompt {
  /**
   * What the host says, in the brand voice. Also what a screen reader hears,
   * so it must make sense with the stage covered up.
   */
  speech: string;
  /** The big thing on the stage. Omitted when the question is only spoken. */
  display?: readonly PromptPart[];
  /**
   * How the display is set out.
   *
   * `line` — the default, and what every prompt written before this field
   * existed does — is the row that draws `2 + 3 = ?`, `C _ T` and a row of
   * five apples. Parts sit side by side and wrap.
   *
   * `subject` says the display is **one thing to look at**, not a line to
   * read: the animal in "where does this live?", the shape in "which one is a
   * triangle?". The stage draws it larger and alone, which is the difference
   * between a child seeing a question and a child seeing a cow. It is a
   * request rather than a rule — a `subject` prompt holding four parts is
   * still drawn as a line, because a row of four large things is neither.
   */
  layout?: "line" | "subject";
  /**
   * The thing the question is about, drawn above the display line.
   *
   * `S _ N` is a puzzle to a reader and noise to a four year old — until a
   * sun sits over it, at which point it is a word with a meaning. That is
   * what this is: **context, not a scaffold**. It never encodes the answer —
   * the speech has already said the word out loud — so it does not fade with
   * level, and the glyph inside it follows the same promotion rule as every
   * picture: drawn whenever the library knows the word, and the emoji it has
   * always been when it does not.
   *
   * Ignored when the layout is `subject`: a subject is already one big thing
   * to look at, and two heroes on one stage is a crowd.
   */
  anchor?: ContentItem;
}

/* ---------------------------------------------------------------- payload */

export interface ChoiceOption {
  /** Unique within the challenge. */
  id: string;
  item: ContentItem;
}

/** Tap the right one. Addition, recognition, phonics, odd one out, comparison. */
export interface ChoicePayload {
  kind: "choice";
  options: readonly ChoiceOption[];
  /** The `id` in `options` that is correct. Exactly one, always. */
  answerId: string;
}

export interface OrderItem {
  id: string;
  item: ContentItem;
}

/** Put them in the right order. Sorting, sequencing, patterns, spelling. */
export interface OrderPayload {
  kind: "order";
  items: readonly OrderItem[];
  /** `items` ids, in the order that is right. */
  answerOrder: readonly string[];
}

export interface MatchPair {
  id: string;
  left: ContentItem;
  right: ContentItem;
}

/**
 * Pair them up. Memory Match's shape, and word-to-picture, and capital-to-
 * lower-case. `left` and `right` need not look alike — a numeral pairs with
 * three dots — which is the same freedom `MemoryCardData.pairId` already has.
 */
export interface MatchPayload {
  kind: "match";
  pairs: readonly MatchPair[];
}

/**
 * One end of a line: something on the board, and the id the child's gesture is
 * reported by. Nothing more — a node is a `ContentItem` with a handle on it.
 */
export interface ConnectNode {
  /** Unique within its own column. */
  id: string;
  item: ContentItem;
}

/**
 * A line: one node on the left, one on the right.
 *
 * The same shape says two different things depending on where it is. In a
 * `ConnectPayload` it is a join that *is* right; in an `Answer` it is a join
 * the child *made*. Keeping them one type is what lets `checkAnswer` compare
 * them without either side knowing what a dog or a bone is.
 */
export interface ConnectPair {
  leftId: string;
  rightId: string;
}

/**
 * Join them up. Three dots to a 3, A to APPLE, an animal to where it lives.
 *
 * The payload describes the interaction and nothing else: two columns of nodes
 * and the lines between them. There is no subject in here, and there is no
 * room for one — an engine handed this can draw the board and report a join,
 * and could not work out which joins are right if it wanted to, because the
 * only thing that says so is `pairs` and that is the content layer's.
 *
 * Every node on both sides appears in exactly one pair. A board with a node
 * nothing can join to would leave a child tapping at it for ever; the day a
 * deliberate spare is wanted, `validateChallenge` is where that widens.
 */
export interface ConnectPayload {
  kind: "connect";
  left: readonly ConnectNode[];
  right: readonly ConnectNode[];
  /** The joins that are right. Order is not part of the question. */
  pairs: readonly ConnectPair[];
}

export type ChallengePayload =
  | ChoicePayload
  | OrderPayload
  | MatchPayload
  | ConnectPayload;

/**
 * What the child did, on its way back to `checkAnswer`.
 *
 * `connect` carries a list rather than one line because the answer to a
 * connect board is all of its lines. One line at a time is a legitimate answer
 * *so far*, which is the question `checkStep` takes.
 */
export type Answer =
  | { kind: "choice"; optionId: string }
  | { kind: "order"; itemIds: readonly string[] }
  | { kind: "match"; pairIds: readonly string[] }
  | { kind: "connect"; links: readonly ConnectPair[] };

/* -------------------------------------------------------------- challenge */

/** `<packId>.<local>`, e.g. `math.addition`. Unique across the registry. */
export type ActivityId = `${PackId}.${string}`;

/** `<activityId>#<local>`, e.g. `math.addition#l2-7`. Unique per challenge. */
export type ChallengeId = string;

/**
 * Internal notes about a challenge. Typed, small, and never rendered to the
 * child — the brief is a `Record<string, unknown>` away from being a dumping
 * ground, so it stays a closed shape until something real needs a field.
 */
export interface ChallengeMeta {
  /** One line for a grown-up: "adds two numbers below ten". */
  objective?: string;
  tags?: readonly string[];
}

/**
 * One thing to answer. The unit every engine receives and nothing else.
 *
 * It carries where it came from (`packId`, `activityId`) so a session can be
 * described without holding the activity, and it carries its own difficulty
 * and age band so a mixed set can still be sorted.
 */
export interface Challenge {
  id: ChallengeId;
  packId: PackId;
  activityId: ActivityId;
  category: ContentCategory;
  activityType: ActivityType;
  level: Level;
  ageRange: AgeRange;
  prompt: Prompt;
  payload: ChallengePayload;
  /** Said after a right answer, when there is something worth saying. */
  explanation?: string;
  /**
   * Said after a couple of wrong ones: a nudge back towards the thinking, and
   * never the answer. The twin of `explanation` — one is why it was right, the
   * other is where to look again — and a game is free to ignore it.
   */
  hint?: string;
  /** Which friend asks this one. Falls back to the activity's, then the game's. */
  host?: CharacterId;
  meta?: ChallengeMeta;
}

/** A challenge narrowed to one payload, for an engine that renders one kind. */
export type ChallengeOf<K extends ChallengeKind> = Challenge & {
  payload: Extract<ChallengePayload, { kind: K }>;
};

/* --------------------------------------------------------------- activity */

/** Everything an activity is, apart from where its challenges come from. */
export interface ActivityBase {
  id: ActivityId;
  packId: PackId;
  /** Grown-up facing: "Adding to 10". The child is never shown this. */
  title: string;
  category: ContentCategory;
  activityType: ActivityType;
  /** The one engine shape this activity speaks. */
  kind: ChallengeKind;
  ageRange: AgeRange;
  /** Levels this activity can actually deal. Ascending, never empty. */
  levels: readonly Level[];
  host?: CharacterId;
}

/**
 * Authored content: every question written out, because it could not have been
 * derived. CAT, DOG, SUN. Animals. The names of shapes.
 */
export interface StaticActivity extends ActivityBase {
  source: "static";
  challenges: readonly Challenge[];
}

export interface GenerateContext {
  level: Level;
  rng: Rng;
  /** Which draw this is, 0-based. Makes ids unique without a counter. */
  index: number;
}

export type ChallengeGenerator = (context: GenerateContext) => Challenge;

/**
 * Derived content: a rule that makes questions. 2 + 3, 4 + 1, 7 + 2, for ever,
 * without storing one of them.
 */
export interface GeneratedActivity extends ActivityBase {
  source: "generated";
  generate: ChallengeGenerator;
}

/**
 * The two are deliberately one type at the point of use. `drawChallenges`
 * takes either, and nothing downstream — no engine, no session, no shell —
 * is ever told which it got. That seam is the architecture.
 */
export type Activity = StaticActivity | GeneratedActivity;

/* ------------------------------------------------------------------- pack */

/**
 * A subject: Math, English, Logic, Discovery.
 *
 * Not to be confused with `Game.themes` in `lib/games/types.ts`, which is the
 * row of chips on a game card. A pack is the curriculum; a theme is a costume.
 */
export interface ContentPack {
  id: PackId;
  /** Grown-up facing. The child's home screen says Play, Learn, Discover. */
  title: string;
  blurb: string;
  accent: Accent;
  activities: readonly Activity[];
}
