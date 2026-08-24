import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  ART_IDS,
  artCategoryOf,
  illustratedAtLevel,
  narrowToDrawn,
  type ArtId,
} from "@/lib/content/art";
import {
  conceptKey,
  drawChallenges,
  labelOf,
  spokenOf,
} from "@/lib/content/challenges";
import { LEVELS, type Level } from "@/lib/content/difficulty";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { Activity, Challenge, ContentItem } from "@/lib/content/types";

/**
 * The visual system, checked as a system rather than as a screenshot.
 *
 * Everything in here is a promise `docs/kiddo-visual-system.md` makes, and
 * every one of them is the kind of promise that looks like nothing in a diff:
 * an `art:` added to a fact at the wrong level, a drawing that reaches for a
 * hex code, a board that ends up half illustrated. None of them would break a
 * build and all of them would quietly change what a four year old is learning.
 *
 * Two kinds of test, in the house style. The ones that can ask the content
 * layer do — the packs are pure functions of a seed, so "does the picture go
 * away at level two" is a question with a real answer. The ones about a
 * component read the source, because there is no DOM in this suite and the
 * thing being protected is a decision. What a board *measures* on a real phone
 * is `scripts/measure-visual.mjs`, which is a different question and a
 * different tool.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const ART_SOURCE = read("src/lib/content/art.ts");
const REGISTRY_SOURCE = read("src/components/kiddo/artwork/illustrations/index.tsx");
const PAINT_SOURCE = read("src/components/kiddo/artwork/illustrations/paint.ts");
const ITEM_VIEW_SOURCE = read("src/components/games/engines/ContentItemView.tsx");
const CSS_SOURCE = read("src/app/globals.css");

const DRAWINGS = [
  "src/components/kiddo/artwork/illustrations/animals.tsx",
  "src/components/kiddo/artwork/illustrations/things.tsx",
  "src/components/kiddo/artwork/illustrations/nature.tsx",
  "src/components/kiddo/artwork/illustrations/places.tsx",
];

/** The activities on the picture ladder: five from Phase 9, two from 10. */
const UPGRADED = [
  "general-knowledge.home-partners",
  "general-knowledge.animal-babies",
  "math.counting-objects",
  "english.alphabet-order",
  "english.rhyming-partners",
  "general-knowledge.animal-homes",
  "english.sound-partners",
] as const;

type ActivityId = Parameters<typeof getActivity>[0];

const activityOf = (id: ActivityId): Activity => {
  const found = getActivity(id);
  assert.ok(found, `${id} is not in the registry`);
  return found;
};

/** Every `ContentItem` on a board, wherever it is: prompt, options, columns. */
function itemsOf(challenge: Challenge): ContentItem[] {
  const items: ContentItem[] = [];

  for (const part of challenge.prompt.display ?? []) {
    if (part.kind === "item") items.push(part.item);
  }

  const payload = challenge.payload;
  if (payload.kind === "choice") items.push(...payload.options.map((o) => o.item));
  if (payload.kind === "order") items.push(...payload.items.map((o) => o.item));
  if (payload.kind === "match") {
    items.push(...payload.pairs.flatMap((pair) => [pair.left, pair.right]));
  }
  if (payload.kind === "connect") {
    items.push(...[...payload.left, ...payload.right].map((node) => node.item));
  }

  return items;
}

/** The `art` on one item, if it has the field at all. */
function artOf(item: ContentItem): ArtId | undefined {
  return item.kind === "picture" || item.kind === "text" ? item.art : undefined;
}

const drawn = (challenge: Challenge) => itemsOf(challenge).filter((i) => artOf(i));

/** Draw a lot from one activity at one level, deterministically. */
function sample(activity: Activity, level: Level, seeds = 60): Challenge[] {
  const drawn: Challenge[] = [];
  for (let seed = 0; seed < seeds; seed++) {
    drawn.push(...drawChallenges(activity, { level, count: 6, rng: createRng(seed) }));
  }
  return drawn;
}

/* ---------------------------------------------------- the vocabulary ---- */

/* 1 ---------------------------------------------------------------------- */
test("the list of names and the union of names are the same list", () => {
  /* `ART_IDS` is written out by hand because a TypeScript union cannot be
     enumerated at runtime, which means the two can drift — and a drifted list
     shows up as a drawing nothing can reach or a name the reference sheet
     never displays, neither of which anybody notices. */
  const union = [...ART_SOURCE.matchAll(/^\s*\|\s*"([a-z]+\.[a-z]+)";?$/gm)].map(
    (match) => match[1],
  );

  assert.deepEqual(
    [...union].sort(),
    [...ART_IDS].sort(),
    "the ArtId union and ART_IDS have drifted apart",
  );
  assert.equal(new Set(ART_IDS).size, ART_IDS.length, "a name is in the list twice");
});

/* 2 ---------------------------------------------------------------------- */
test("every name in the library has a drawing behind it, and nothing else does", () => {
  /* The missing-asset test. A name with no drawing is a blank tile in front of
     a child; a drawing no name reaches is dead weight in the bundle. */
  const registered = [...REGISTRY_SOURCE.matchAll(/^\s*"([a-z]+\.[a-z]+)":\s*(\w+),$/gm)]
    .map((match) => ({ id: match[1], component: match[2] }));

  assert.deepEqual(
    registered.map((entry) => entry.id).sort(),
    [...ART_IDS].sort(),
    "the registry and the library disagree about what exists",
  );

  const source = DRAWINGS.map(read).join("\n");
  for (const { id, component } of registered) {
    assert.match(
      source,
      new RegExp(`export function ${component}\\(`),
      `${id} names ${component}, which nothing exports`,
    );
  }
});

/* 3 ---------------------------------------------------------------------- */
test("a name says which shelf it is on, and the shelf is one of the five", () => {
  const shelves = new Set(["animal", "food", "object", "nature", "place"]);
  for (const id of ART_IDS) {
    assert.match(id, /^[a-z]+\.[a-z]+$/, `${id} is not <category>.<thing>`);
    assert.ok(shelves.has(artCategoryOf(id)), `${id} is on no shelf`);
  }
});

/* -------------------------------------------------------- the drawings -- */

/* 4 ---------------------------------------------------------------------- */
test("a drawing reaches for a token and never for a colour", () => {
  /* The whole point of `paint.ts`: a palette change reaches the library at
     once, and no illustration can drift from the rest of the product. A hex
     code in one of these files would be a colour nobody could find again. */
  for (const path of DRAWINGS) {
    const source = read(path);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${path} has a hex colour`);
    assert.doesNotMatch(source, /\brgba?\(/, `${path} has an rgb colour`);
    assert.doesNotMatch(source, /\bhsla?\(/, `${path} has an hsl colour`);
    /* Flat, like the character rig. Depth on an object beside KIDDO would look
       like it came out of a different box. */
    assert.doesNotMatch(source, /Gradient|filter=|drop-shadow|feGaussian/, `${path} is not flat`);
    /* An illustration is the subject of a board. The tile around it is what
       moves when the board does. */
    assert.doesNotMatch(source, /motion\.|animate=|@keyframes|transition=/, `${path} moves`);
  }
});

/* 5 ---------------------------------------------------------------------- */
test("every colour a drawing may use is a token that exists", () => {
  const tokens = [...PAINT_SOURCE.matchAll(/var\((--color-[a-z0-9-]+)\)/g)].map(
    (match) => match[1],
  );
  assert.ok(tokens.length > 10, "the palette lost most of itself");

  for (const token of new Set(tokens)) {
    assert.ok(
      CSS_SOURCE.includes(`${token}:`),
      `${token} is painted with but never defined`,
    );
  }

  /* KIDDO has no brown, no grey and no red. A drawing that named one would be
     naming something that is not in the product. */
  assert.doesNotMatch(PAINT_SOURCE, /--color-(brown|grey|gray|red)/, "a banned hue");
});

/* 6 ---------------------------------------------------------------------- */
test("a drawing is always decorative and never a tab stop", () => {
  /* The word for a thing lives in the item's accessible name, where it is part
     of a whole instruction. A drawing that announced itself would say it
     twice, and a focusable one would give a keyboard a stop that does nothing. */
  assert.match(REGISTRY_SOURCE, /aria-hidden="true"/, "Illustration lost aria-hidden");
  assert.match(REGISTRY_SOURCE, /focusable="false"/, "Illustration became focusable");
  assert.match(REGISTRY_SOURCE, /role="presentation"/, "Illustration lost its role");
  assert.doesNotMatch(REGISTRY_SOURCE, /aria-label=|<title>/, "a drawing names itself");
});

/* 7 ---------------------------------------------------------------------- */
test("a drawing is sized in em, so it is interchangeable with a glyph", () => {
  /* Why nothing already measured has to be measured again: `pictureSize` sets
     a font size, `Illustration` is 1.15em square, and a board does not change
     height when a fact is promoted from an emoji to a drawing. A drawing sized
     in rem or px would be a second sizing path to keep in step. */
  assert.match(REGISTRY_SOURCE, /h-\[1\.15em\] w-\[1\.15em\]/, "the em sizing went");
  assert.match(ITEM_VIEW_SOURCE, /function pictureSize/, "pictureSize went");
  assert.match(ITEM_VIEW_SOURCE, /function anchorSize/, "anchorSize went");
});

/* --------------------------------------------------------- the schema --- */

/* 8 ---------------------------------------------------------------------- */
test("a picture is a promotion and never a requirement", () => {
  /* The fallback. Twenty-odd drawings will never catch an emoji set, so every
     item that names one still carries the thing it was drawn with before —
     which is what makes a pack written against a bigger library than this
     build ships harmless rather than a blank tile. */
  for (const id of UPGRADED) {
    const activity = activityOf(id);
    for (const level of activity.levels) {
      for (const challenge of sample(activity, level, 20)) {
        for (const item of itemsOf(challenge)) {
          const art = artOf(item);
          if (!art) continue;

          assert.ok(ART_IDS.includes(art), `${id} names ${art}, which is not drawn`);
          if (item.kind === "picture") {
            assert.ok(item.glyph.length > 0, `${id} promoted a picture with no glyph`);
            assert.ok(item.label.length > 0, `${id} promoted a picture with no label`);
          }
          if (item.kind === "text") {
            assert.ok(item.text.length > 0, `${id} promoted a word that is empty`);
          }
        }
      }
    }
  }
});

/* 9 ---------------------------------------------------------------------- */
test("a screen reader hears the same board whether it was drawn or glyphed", () => {
  /* The claim the promotion rests on. Every accessible name is built from the
     item's words, so removing the drawing has to change nothing that is
     spoken — if it ever did, promoting a fact would quietly change the
     question. Checked by stripping `art` and comparing. */
  for (const id of UPGRADED) {
    const activity = activityOf(id);
    for (const level of activity.levels) {
      for (const challenge of sample(activity, level, 20)) {
        for (const item of itemsOf(challenge)) {
          if (!artOf(item)) continue;
          const plain = { ...item, art: undefined } as ContentItem;
          assert.equal(labelOf(item), labelOf(plain), `${id}: the label moved`);
          assert.equal(spokenOf(item), spokenOf(plain), `${id}: the words moved`);
          assert.ok(labelOf(item).trim().length > 0, `${id}: a drawn item has no name`);
        }
      }
    }
  }
});

/* 10 --------------------------------------------------------------------- */
test("no accessible name is a picture where a word should be", () => {
  /* The other half of the same rule, pointed at the words themselves. A name
     containing a pictograph would be a name coming from the fallback rather
     than from the content — readable on a screen, meaningless in an ear. */
  const pictographs = /\p{Extended_Pictographic}/u;

  for (const id of UPGRADED) {
    const activity = activityOf(id);
    for (const level of activity.levels) {
      for (const challenge of sample(activity, level, 20)) {
        assert.doesNotMatch(challenge.prompt.speech, pictographs, `${id} speaks an emoji`);
        for (const item of itemsOf(challenge)) {
          assert.doesNotMatch(spokenOf(item), pictographs, `${id} reads out an emoji`);
        }
      }
    }
  }
});

/* 11 --------------------------------------------------------------------- */
test("a subject prompt is one thing to look at, never a line", () => {
  /* `layout: "subject"` asks the stage for the largest size it has. Handing it
     four parts would ask for four of them, which is a stage with no room left
     on it — so the content layer never sets it on more than one part, and
     `PromptDisplay` degrades rather than trusts. */
  const withSubjects = UPGRADED;
  for (const activity of withSubjects) {
    const found = activityOf(activity);
    for (const level of found.levels) {
      for (const challenge of sample(found, level, 15)) {
        if (challenge.prompt.layout !== "subject") continue;
        assert.equal(
          challenge.prompt.display?.length,
          1,
          `${activity} asked for a subject with more than one part`,
        );
      }
    }
  }

  assert.match(
    read("src/components/games/engines/PromptDisplay.tsx"),
    /layout === "subject" && parts\.length === 1/,
    "PromptDisplay stopped degrading a crowded subject to a line",
  );
});

/* ---------------------------------------------------------- the ladder -- */

/* 12 --------------------------------------------------------------------- */
test("the scaffold belongs to the entry level and to no other", () => {
  /* PICTURE -> PICTURE + WORD -> SYMBOL, asserted on real boards rather than
     read off a function. Help that never goes away is not help: it is a crutch
     a child learns to lean on instead of learning the thing. */
  for (const id of UPGRADED) {
    const activity = activityOf(id);

    for (const level of activity.levels) {
      const boards = sample(activity, level, 40);
      const withArt = boards.filter((board) => drawn(board).length > 0);

      if (level === 1) {
        assert.ok(
          withArt.length > 0,
          `${id} draws nothing at all at level one`,
        );
      } else {
        assert.equal(
          withArt.length,
          0,
          `${id} carried its pictures up to level ${level}`,
        );
      }
    }
  }
});

/* 13 --------------------------------------------------------------------- */
test("the rule about when is written down once", () => {
  /* Five activities cannot disagree about which level is the entry level, so
     none of them decides for itself. */
  for (const level of LEVELS) {
    assert.equal(illustratedAtLevel(level), level === 1, `level ${level}`);
  }

  /* And the coin is a coin: never at level two, sometimes at level one. */
  const rng = createRng(7);
  assert.equal(narrowToDrawn(2, rng), false, "a level-two board narrowed itself");
  assert.equal(narrowToDrawn(3, rng), false, "a level-three board narrowed itself");

  const spread = Array.from({ length: 200 }, (_, seed) => narrowToDrawn(1, createRng(seed)));
  assert.ok(spread.some(Boolean), "the coin never comes up drawn");
  assert.ok(spread.some((value) => !value), "the coin never comes up plain");
});

/* 14 --------------------------------------------------------------------- */
test("a board is wholly drawn or wholly plain, and never half of each", () => {
  /* The answer leak. On a board where both columns are content, two drawings
     among four glyphs is a pattern — and a child who joins the two drawn ones
     is right half the time for entirely the wrong reason. It works, it is not
     the skill, and a five year old finds it before an adult does. */
  const bothColumns = ["general-knowledge.home-partners", "english.rhyming-partners"] as const;
  for (const id of bothColumns) {
    const activity = activityOf(id);
    for (const level of activity.levels) {
      for (const challenge of sample(activity, level, 40)) {
        const payload = challenge.payload;
        if (payload.kind !== "connect") continue;

        const nodes = [...payload.left, ...payload.right].map((node) => node.item);
        const withArt = nodes.filter((item) => artOf(item)).length;
        assert.ok(
          withArt === 0 || withArt === nodes.length,
          `${id} dealt a board with ${withArt}/${nodes.length} drawn`,
        );
      }
    }
  }
});

/* 15 --------------------------------------------------------------------- */
test("animal-babies draws the animal and spells the baby, on purpose", () => {
  /* The one board that is deliberately two modes at once. A picture of a lamb
     would answer the question the word is asking, so the right column is words
     — and because it is words, a drawn left column leaks nothing and needs no
     coin. Each column is still all or nothing. */
  const activity = activityOf("general-knowledge.animal-babies");

  for (const level of activity.levels) {
    for (const challenge of sample(activity, level, 30)) {
      const payload = challenge.payload;
      if (payload.kind !== "connect") continue;

      const left = payload.left.map((node) => node.item);
      const right = payload.right.map((node) => node.item);
      const drawnLeft = left.filter((item) => artOf(item)).length;

      assert.ok(
        drawnLeft === 0 || drawnLeft === left.length,
        `a left column with ${drawnLeft}/${left.length} drawn`,
      );
      assert.equal(
        right.filter((item) => artOf(item)).length,
        0,
        "the baby was drawn, which answers the question the word is asking",
      );
      for (const item of right) {
        assert.equal(item.kind, "text", "a baby stopped being a word");
      }
    }
  }
});

/* 15b -------------------------------------------------------------------- */
test("sound-partners draws the picture and keeps the letter a letter", () => {
  /* The same deliberate two-mode board as animal-babies, the other way
     round: a drawn picture leaks nothing about a letter, so the left column
     needs only its all-or-nothing rule — and the right column is the
     objective itself, so it is never drawn over and never stops being text. */
  const activity = activityOf("english.sound-partners");

  for (const level of activity.levels) {
    for (const challenge of sample(activity, level, 30)) {
      const payload = challenge.payload;
      if (payload.kind !== "connect") continue;

      const left = payload.left.map((node) => node.item);
      const right = payload.right.map((node) => node.item);
      const drawnLeft = left.filter((item) => artOf(item)).length;

      assert.ok(
        drawnLeft === 0 || drawnLeft === left.length,
        `a left column with ${drawnLeft}/${left.length} drawn`,
      );
      assert.equal(
        right.filter((item) => artOf(item)).length,
        0,
        "a letter was drawn over, and the letter is the objective",
      );
      for (const item of right) {
        assert.equal(item.kind, "text", "a letter stopped being text");
      }
    }
  }
});

/* 16 --------------------------------------------------------------------- */
test("an alphabet tray is anchored on every tile or on none of them", () => {
  /* Nothing about an apple says it comes before a ball, so this one is not
     about leaking. It is about attention: a tray with pictures on two tiles
     and nothing on the third is a tray with two tiles that look important, and
     "which of these comes first" is exactly the question that cannot afford
     that. */
  const activity = activityOf("english.alphabet-order");

  for (const level of activity.levels) {
    for (const challenge of sample(activity, level, 40)) {
      const payload = challenge.payload;
      if (payload.kind !== "order") continue;

      const items = payload.items.map((entry) => entry.item);
      const anchored = items.filter((item) => artOf(item)).length;
      assert.ok(
        anchored === 0 || anchored === items.length,
        `a tray with ${anchored}/${items.length} anchored`,
      );
    }
  }
});

/* 17 --------------------------------------------------------------------- */
test("promoting a fact took no fact away from the level it was dealt at", () => {
  /* The governing constraint of the whole phase, and the one the first attempt
     broke. Narrowing an entry level to what the library can draw deletes facts
     from it — so where that would have happened the narrowing became a coin,
     and every concept is still reachable at every level it was reachable at.
     Counted as concepts, which is how this product counts content. */
  for (const id of UPGRADED) {
    const activity = activityOf(id);
    for (const level of activity.levels) {
      const concepts = new Set(
        sample(activity, level, 60).map(conceptKey),
      );
      assert.ok(
        concepts.size >= 3,
        `${id} level ${level} deals only ${concepts.size} concepts`,
      );
    }
  }

  /* And specifically: level one still reaches the facts the library cannot
     draw. Rhyming's twelve first pairs are the ones that were nearly lost. */
  const rhyming = activityOf("english.rhyming-partners");
  const words = new Set(
    sample(rhyming, 1, 80).flatMap((challenge) =>
      itemsOf(challenge).map((item) => labelOf(item)),
    ),
  );
  for (const word of ["SUN", "SNAKE"]) {
    assert.ok(words.has(word), `${word} lost its place at level one`);
  }
});

/* ---------------------------------------------------------- the motion -- */

/* 18 --------------------------------------------------------------------- */
test("nothing shakes when a child gets something wrong", () => {
  /* A tile that was not the answer used to throw itself left and right five
     times — the web's idiom for a rejected password, borrowed for a four year
     old. It was the one piece of motion in the product that existed to say a
     child got something wrong, and a sharp repeated movement is the hardest
     kind for a motion-sensitive child to sit through.

     What replaced it is a settle: down a hair, back, once. The horizontal
     keyframe array is what this is guarding against coming back. */
  for (const path of [
    "src/components/kiddo/ChoiceTile.tsx",
    "src/components/games/memory/MemoryCard.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /x:\s*\[/, `${path} shakes again`);
    assert.doesNotMatch(source, /rotate:\s*\[/, `${path} wobbles`);
    assert.match(source, /\[1,\s*0\.965,\s*1\]/, `${path} lost its settle`);
  }
});

/* 19 --------------------------------------------------------------------- */
test("no state rests on colour alone", () => {
  /* Every state that means something carries a shape as well as a hue, so a
     colour-blind child and a child looking at a washed-out screen in the back
     of a car read the same board. There is no cross anywhere in KIDDO: a wrong
     answer is not a verdict, it is an instruction to keep looking. */
  const source = read("src/components/kiddo/ChoiceTile.tsx");
  for (const state of ["correct", "wrong", "tried"]) {
    assert.match(
      source,
      new RegExp(`state === "${state}" && <StateBadge`),
      `the ${state} tile lost its badge`,
    );
  }
});

/* 20 --------------------------------------------------------------------- */
test("reduced motion is honoured in both places, and by default", () => {
  /* Framer Motion is told to follow the setting, and CSS is collapsed by a
     blanket rule — neither covers the other. And there is no mode to switch
     on: the calm version is what everybody gets. */
  assert.match(
    read("src/components/MotionProvider.tsx"),
    /reducedMotion="user"/,
    "MotionProvider stopped following the setting",
  );
  assert.match(
    CSS_SOURCE,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    "the blanket CSS rule went",
  );
  /* The clouds are declared inside `no-preference` rather than switched off
     afterwards, because a collapsed transform animation jumps to its end
     position instead of never starting. */
  assert.match(
    CSS_SOURCE,
    /@media\s*\(prefers-reduced-motion:\s*no-preference\)/,
    "the only thing that moves on its own stopped opting in",
  );
});
