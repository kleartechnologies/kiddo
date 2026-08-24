import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { drawChallenges } from "@/lib/content/challenges";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import { MIXED_ROUND } from "@/components/dev/mixedRound";
import { VISUAL_ROUND } from "@/components/dev/visualRound";

/**
 * Phase 2: where Magic Motion meets the child, checked as a set of promises.
 *
 * Three moments, three words from the vocabulary, and nothing else: a group
 * of things to count `pop`s in one at a time, the character at the end of a
 * round `celebrate`s once, and an animal `walk`s to the home it was joined to.
 * The content layer proves that the boards in question really are what the
 * engines take them for (a counting row is pictures and nothing else; a homes
 * board is animals on the left and places on the right), and the source is
 * read in the house style for the rules that decide *when* a motion plays.
 * What the motions measure in a browser — arrival, settling, reduced motion,
 * layout — is `scripts/measure-magic-wired.mjs`.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
/** The same file with its comments taken out. */
const code = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const PROMPT = "src/components/games/engines/PromptDisplay.tsx";
const CHOICE = "src/components/games/engines/ChoiceStage.tsx";
const VIEW = "src/components/games/engines/ContentItemView.tsx";
const CELEBRATION = "src/components/kiddo/Celebration.tsx";
const CONNECT = "src/components/games/engines/ConnectStage.tsx";
const MIXED = "src/components/dev/MixedPlayground.tsx";

const COUNTING = "math.counting-objects";
const HOMES = "general-knowledge.home-partners";

function activity(id: string) {
  const found = getActivity(id as Parameters<typeof getActivity>[0]);
  assert.ok(found, `${id} is registered`);
  return found;
}

/* ----------------------------------------------------- counting → pop ---- */

test("counting-objects: a row to count is pictures and nothing else", () => {
  const counting = activity(COUNTING);
  for (const level of [1, 2, 3] as const) {
    let rows = 0;
    for (const challenge of drawChallenges(counting, { level, count: 12, rng: createRng(level) })) {
      const { payload } = challenge;
      assert.equal(payload.kind, "choice");
      const parts = challenge.prompt.display ?? [];
      assert.ok(parts.length >= 1, "something on the stage");
      const kinds = parts.map((part) => (part.kind === "item" ? part.item.kind : part.kind));
      if (kinds.every((kind) => kind === "picture")) {
        /* The row the child counts: it pops in, one thing at a time, and
           the answers are numbers. */
        rows += 1;
        if (payload.kind === "choice") {
          for (const option of payload.options) assert.equal(option.item.kind, "number");
        }
      } else {
        /* The other way round — "which has three?" — shows a number, and a
           number does not pop. Nothing else ever reaches this stage. */
        assert.deepEqual(kinds, ["count"]);
      }
    }
    assert.ok(rows > 0, `level ${level} deals rows to count`);
  }
});

test("pop plays for a group of things, and only for a group of things", () => {
  const source = code(PROMPT);
  assert.match(source, /import \{ MagicMotion \} from "@\/components\/kiddo\/MagicMotion"/);
  /* All pictures, or no pop: a number, a symbol, a blank or a subject never pops. */
  assert.match(
    source,
    /const group =\s*!subject &&\s*parts\.length > 0 &&\s*parts\.every\(\(part\) => part\.kind === "item" && part\.item\.kind === "picture"\)/,
  );
  /* One wrapper, used two ways: round a whole picture, or — for the one
     prompt that is a lone block of pips, which is what Counting deals —
     round each pip, so 🍎 → 🍎🍎 → 🍎🍎🍎 happens in the real Quest too. */
  assert.match(
    source,
    /const arrive = \(member: ReactNode, index: number\) => \(\s*<MagicMotion motion="pop" playKey=\{1\} delay=\{index \* POP_STAGGER\}>\s*\{member\}\s*<\/MagicMotion>/,
  );
  assert.match(
    source,
    /const pips =\s*!subject &&\s*parts\.length === 1 &&\s*parts\[0\]\.kind === "item" &&\s*parts\[0\]\.item\.kind === "count"/,
  );
  assert.match(source, /group \? \(\s*arrive\(<ContentItemView item=\{part\.item\} scale="stage" \/>, index\)/);
  assert.match(source, /eachOf=\{pips \? arrive : undefined\}/);
  assert.equal((source.match(/<MagicMotion/g) ?? []).length, 1, "one callsite");
  assert.equal((source.match(/motion="/g) ?? []).length, 1, "one word");
  /* One at a time, quickly: a row of eight is on the stage inside a second. */
  const stagger = Number(/const POP_STAGGER = ([\d.]+);/.exec(source)?.[1]);
  assert.ok(stagger > 0 && stagger <= 0.12, `stagger ${stagger}s`);
  /* The same thing is drawn either way: the motion wraps it, never replaces it.
     `ContentItemView` hands its pips out through `eachOf` and knows nothing
     of motion — the wrapper is the prompt's. */
  const view = code(VIEW);
  assert.match(view, /eachOf\?: EachOf/);
  assert.match(view, /\{eachOf\(\s*<span\s+className=\{cn\(\s*"block rounded-full"/);
  assert.doesNotMatch(view, /MagicMotion|motion=/);
});

test("a new question is a new board, so the group arrives afresh", () => {
  /* Keyed on the question — and distinct from its sibling row's key, which
     is what let the last question stay mounted inside the next one. */
  assert.match(code(CHOICE), /<PromptDisplay\s+key=\{`\$\{challenge\.id\}:prompt`\}/);
  assert.doesNotMatch(code(CHOICE), /MagicMotion/, "the choice engine itself does not animate");
});

/* ------------------------------------------------ round → celebrate ---- */

test("the celebration lifts the character once, after the card has arrived", () => {
  const source = code(CELEBRATION);
  assert.match(source, /import \{ MagicMotion \} from "\.\/MagicMotion"/);
  assert.equal((source.match(/<MagicMotion/g) ?? []).length, 1, "one callsite");
  assert.match(source, /<MagicMotion motion="celebrate" playKey=\{lift\} delay=\{LIFT_AFTER\}>\s*<CharacterFigure/);
  /* Played after hydration, so the server's markup and the first client
     paint agree whatever the visitor's motion setting is. */
  assert.match(source, /useSyncExternalStore\(\s*never,\s*\(\) => 1,\s*\(\) => 0,?\s*\)/);
  assert.doesNotMatch(source, /useEffect|setPlayKey|setInterval|repeat/);
  const after = Number(/const LIFT_AFTER = ([\d.]+);/.exec(source)?.[1]);
  assert.ok(after >= 0.2 && after <= 0.6, `lift waits ${after}s`);
});

test("the celebration is the same celebration: no new words, controls or rewards", () => {
  const source = code(CELEBRATION);
  assert.match(source, /onPlayAgain/);
  assert.doesNotMatch(source, /coin|streak|\bxp\b|score/i);
  /* The shell that decides when a round is complete was not touched. */
  assert.doesNotMatch(read("src/components/games/GameShell.tsx"), /MagicMotion/);
});

test("a bigger finish grows the light round the character, never the lift", () => {
  const source = code(CELEBRATION);
  /* The scale exists, and unasked-for the celebration is what it always was. */
  assert.match(source, /export type CelebrationMoment = 1 \| 2 \| 3 \| "world";/);
  assert.match(source, /moment = 1,/, "the default is the smallest moment");
  /* The aura is drawn still: between the moment's first branch and the lift
     there is no motion word, no timer and nothing thrown — only paint. */
  const aura = source.slice(source.indexOf('moment !== 1'), source.indexOf("<MagicMotion"));
  assert.ok(aura.length > 0, "the aura is drawn behind the lift");
  assert.doesNotMatch(aura, /MagicMotion|motion=|animate|transition/);
  /* And the aura is decoration to a screen reader, every part of it. */
  assert.match(source, /moment !== 1 \? \(\s*<div\s+aria-hidden/);
});

test("the world round's moment is the tier that was played, and the world's own when the world is done", () => {
  const world = code("src/components/worlds/WorldActivityGame.tsx");
  assert.match(
    world,
    /progress\.complete && earned === "first" \? "world" : finishedTier/,
    "the ring is earned by finishing the world, whatever the tier",
  );
  assert.match(world, /moment,/, "and the round hands its moment to the shell");
});

/* ----------------------------------------------------- homes → walk ---- */

test("home-partners: animals on the left, places on the right, every animal has a home", () => {
  const homes = activity(HOMES);
  for (const level of [1, 2] as const) {
    for (const challenge of drawChallenges(homes, { level, count: 6, rng: createRng(level) })) {
      const { payload } = challenge;
      assert.equal(payload.kind, "connect");
      if (payload.kind !== "connect") continue;
      const { left, right, pairs } = payload;
      for (const node of left) {
        assert.equal(node.item.kind, "picture");
        assert.match(node.id, /^animal-/);
      }
      for (const node of right) assert.equal(node.item.kind, "picture");
      assert.equal(pairs.length, left.length, "every animal goes somewhere");
      for (const pair of pairs) {
        assert.ok(left.some((node) => node.id === pair.leftId));
        assert.ok(right.some((node) => node.id === pair.rightId));
      }
    }
  }
});

test("walk is opt-in, left-hand only, and plays on a join that is right", () => {
  const source = code(CONNECT);
  assert.match(source, /import \{ MagicMotion \} from "@\/components\/kiddo\/MagicMotion"/);
  assert.match(source, /travel\?: boolean;/);
  assert.match(source, /travel = false,/, "off unless asked for");
  assert.equal((source.match(/<MagicMotion/g) ?? []).length, 1, "one callsite");
  assert.match(source, /travel && side === "left" \? \(/);
  /* `matched` is a join the reducer accepted; a wrong attempt never sets it. */
  assert.match(source, /<MagicMotion\s+motion="walk"\s+playKey=\{matched \? 1 : 0\}/);
  assert.match(source, /const matched = partner !== null;/);
  assert.doesNotMatch(source, /playKey=\{attempt|attempt \? 1/, "a wrong join never walks");
  /* Stops at the home's near edge, a distance measured off the board. */
  assert.match(source, /distance=\{partnerId \? travelOf\(node\.id, partnerId\) : 0\}/);
  assert.match(source, /const gap = home\.inner - art\.left;\s*return gap > 0 \? gap : 0;/);
  /* Measured in the board's own pixels, whatever a world zooms the board by. */
  assert.match(
    source,
    /inner: \(box\.left - origin\.left\) \/ zoom \+ padding,/,
    "past the port and the check",
  );
  assert.match(source, /const home = spans\[portKey\("right", rightId\)\];/);
  /* The picture crosses into a later card, so its own node stacks above. */
  assert.match(source, /travel && side === "left" && "z-10"/);
  /* The right column draws exactly what it drew before. */
  const right = source.slice(source.indexOf('column("right"'));
  assert.doesNotMatch(right, /MagicMotion/);
});

test("the walk goes to the home that was joined, not just sideways", () => {
  /* Regression: the walk used to carry only a horizontal distance, so an
     animal joined to a home in a *different row* was seen arriving at
     whichever home sat level with it — a right join drawn as a wrong one.
     The stage must hand the walk the vertical gap between the two joined
     ports, measured off the same pass that places the lines, and the gap
     must be the *partner's* port against the walker's own. */
  const source = code(CONNECT);
  assert.match(source, /rise=\{partnerId \? riseOf\(node\.id, partnerId\) : 0\}/);
  assert.match(
    source,
    /const from = ports\[portKey\("left", leftId\)\];\s*const home = ports\[portKey\("right", rightId\)\];\s*if \(!from \|\| !home\) return 0;\s*return home\.y - from\.y;/,
    "the rise is the joined partner's port against the walker's own",
  );
});

test("the homes boards ask for travel, and nothing else does", () => {
  const asks = (steps: readonly { from: readonly string[]; travel?: boolean }[]) => {
    for (const step of steps) {
      const homes = step.from.every((id) => id === HOMES);
      assert.equal(Boolean(step.travel), homes, `${step.from.join(",")} travel=${String(step.travel)}`);
    }
  };
  asks(VISUAL_ROUND);
  asks(MIXED_ROUND);
  assert.match(code(MIXED), /travel=\{shape\.travel\}/);
  assert.match(code(MIXED), /travel=\{travel\}/);
  /* And the real Quest: the only board it joins up asks for travel by the
     same name, and the Quest does not animate anything itself. */
  const quest = code("src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx");
  assert.match(quest, /const WALKS_HOME = "general-knowledge\.home-partners";/);
  assert.match(quest, /travel=\{board\.challenge\.activityId === WALKS_HOME\}/);
  assert.doesNotMatch(quest, /MagicMotion/);
  assert.doesNotMatch(code("src/components/games/GameShell.tsx"), /MagicMotion/);
});

/* ------------------------------------------------------- the borders ---- */

test("three words, three moments, and the rest of the vocabulary stays in the box", () => {
  const used = new Set<string>();
  for (const path of [PROMPT, CELEBRATION, CONNECT]) {
    for (const match of code(path).matchAll(/motion="(\w+)"/g)) used.add(match[1]);
  }
  assert.deepEqual([...used].sort(), ["celebrate", "pop", "walk"]);
  for (const path of [
    "src/components/games/engines/OrderStage.tsx",
    "src/components/games/engines/MatchStage.tsx",
    "src/components/games/engines/ContentItemView.tsx",
    "src/components/kiddo/artwork/illustrations/index.tsx",
    "src/lib/content/art.ts",
    "src/lib/content/packs/general-knowledge/habitats.ts",
    "src/lib/content/packs/math/countingObjects.ts",
  ]) {
    assert.doesNotMatch(read(path), /MagicMotion|magicMotion/, `${path} knows nothing of motion`);
  }
});

test("the shell lets the playfield's own moments mount and play", () => {
  /* framer remembers `initial={false}` on AnimatePresence for the life of a
     subtree that was present at first render: anything that mounts inside
     the playfield later starts at its finished values, so a pip never
     popped and an animal never walked in a real Quest. The first-paint rule
     belongs to the playfield element, where it cannot leak downwards. */
  const shell = read("src/components/games/GameShell.tsx");
  assert.doesNotMatch(shell, /<AnimatePresence[^>]*initial=\{false\}/);
  assert.match(shell, /key="playing"[\s\S]*?initial=\{celebrated \? "hidden" : false\}/);
  assert.match(shell, /status === "complete" && !celebrated/);
});
