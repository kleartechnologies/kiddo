import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { ALL_CATALOGUES } from "@/lib/i18n/messages";
import { en } from "@/lib/i18n/messages/en";
import { assertNothingScolds } from "./helpers/words";

/**
 * The promises this pass made about the shell, checked against the source.
 *
 * All of these were found in a real browser and all of them look like nothing
 * in a diff: a `tabIndex`, a `flex-wrap`, a word in a sentence a screen reader
 * reads out. They are exactly the kind of thing that gets tidied away by
 * someone who cannot see why it is there, so each one is written down here
 * with the reason attached.
 *
 * Source-scanning rather than rendering, in the house style: there is no DOM
 * in this suite, and the thing being protected is a decision rather than a
 * behaviour.
 */

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/* 1 ---------------------------------------------------------------------- */
test("the motion wrappers that only lean are not keyboard stops", () => {
  /* Framer Motion makes anything carrying `whileTap` focusable. On three
     elements the real control is a link *inside* the wrapper, so left alone
     the home screen handed a keyboard user eight stops that did nothing when
     you pressed Enter — one per card, plus KIDDO. */
  for (const path of [
    "src/components/kiddo/GameCard.tsx",
    "src/components/kiddo/WorldHero.tsx",
    "src/components/kiddo/BackLink.tsx",
  ]) {
    assert.match(read(path), /tabIndex=\{-1\}/, `${path} lost its tabIndex`);
  }
});

/* 2 ---------------------------------------------------------------------- */
test("nothing that a child actually operates was taken out of the order", () => {
  /* The other half of the rule above. Every one of these is a real control,
     and a `tabIndex={-1}` on any of them would be the same bug pointing the
     other way — a button a keyboard cannot reach. */
  for (const path of [
    "src/components/ui/Button.tsx",
    "src/components/kiddo/SoundToggle.tsx",
    "src/components/kiddo/ChoiceTile.tsx",
    "src/components/games/memory/MemoryCard.tsx",
  ]) {
    assert.doesNotMatch(read(path), /tabIndex=\{-1\}/, `${path} is unreachable`);
  }
});

/* 3 ---------------------------------------------------------------------- */
test("the game header may become two rows rather than crush the title", () => {
  const shell = read("src/components/games/GameShell.tsx");

  /* A 360px phone holds two 56px round controls, a game's name and ten
     progress dots in about 350px, which it cannot. Without the wrap the
     flexible thing gave way and "Logic Quest" was rendered as "L...". */
  assert.match(shell, /<header className="flex flex-wrap/);
  assert.match(shell, /order-last w-full justify-center sm:order-none sm:w-auto/);
});

/* 4 ---------------------------------------------------------------------- */
test("the playfield is a landmark, on both sides of the round", () => {
  const shell = read("src/components/games/GameShell.tsx");
  /* Two: the board and the celebration. A screen reader jumping by landmark
     should land on the game, and there is no screen where that is nothing. */
  assert.equal((shell.match(/<motion\.main/g) ?? []).length, 2);
  assert.equal((shell.match(/<\/motion\.main>/g) ?? []).length, 2);
});

/* 5 ---------------------------------------------------------------------- */
test("every header control is big enough for a four-year-old's hand", () => {
  const header = read("src/components/kiddo/WorldHeader.tsx");
  /* Measured at 360px: the wordmark link was 82x36 and the grown-up door
     42px tall, both under the 44px floor and well under KIDDO's own 3.5rem
     rule. The logo itself is fixed art, so the padding grew, not the mark. */
  assert.match(header, /min-h-14/, "the wordmark link lost its height");
  assert.match(header, /min-h-12 .*sm:min-h-14|min-h-12/, "the grown-up door shrank");
  /* And it is still named — in the reader's language, so the one link every
     child screen carries is not the one English phrase on a Malay page. */
  assert.match(header, /aria-label=\{t\("chrome\.home"\)\}/, "the wordmark lost its name");
  for (const words of Object.values(ALL_CATALOGUES)) {
    assert.ok(words["chrome.home"].trim().length > 0);
  }
});

/* 6 ---------------------------------------------------------------------- */
test("a wrong answer is never a verdict, in the ear as well as the eye", () => {
  /* The bubble a sighted child reads and the line a screen reader speaks are
     the same moment and have to carry the same warmth. They had drifted:
     KIDDO said "Ooh, so close! Have another go." out loud while the live
     region said "Not that one. Keep trying." */
  const unkind = /\b(wrong|incorrect|failed?|failure|bad|no good|try harder|nope)\b/i;

  for (const [path, prefix] of [
    ["src/components/games/math/MathQuestGame.tsx", "game.math-quest."],
    ["src/components/games/english/EnglishQuestGame.tsx", "game.english-quest."],
    ["src/components/games/logic/LogicQuestGame.tsx", "game.logic-quest."],
    ["src/components/games/shapes/ShapesColoursQuestGame.tsx", "game.shapes-colours-quest."],
    [
      "src/components/games/general-knowledge/GeneralKnowledgeQuestGame.tsx",
      "game.general-knowledge-quest.",
    ],
  ] as const) {
    const source = read(path);

    /* Only the words KIDDO says or announces — `phase === "incorrect"` is a
       state name, not something a child ever hears. Kept as a backstop for a
       sentence written straight into a component instead of the catalogue. */
    const spoken = [...source.matchAll(/"([^"\\]{6,})"/g)]
      .map((m) => m[1])
      .filter((s) => /[a-z] [a-z]/i.test(s) && !s.includes("/") && !s.includes("."));

    for (const line of spoken) {
      assert.doesNotMatch(line, unkind, `${path} says "${line}"`);
    }

    /* And the words themselves, where they now live: every line this game can
       say, in every language it says them in. The scan above would pass on a
       component holding nothing but keys, which is exactly what these are now,
       and would never have looked at the Malay half at all. */
    assertNothingScolds(assert, prefix);

    assert.match(
      source,
      /t\("quest\.notQuite"\)/,
      `${path} lost its kind announcement`,
    );
  }

  /* One announcement, shared by all five, and kind in both languages. */
  assert.equal(en["quest.notQuite"], "Not quite. Have another go.");
  assertNothingScolds(assert, "quest.");
});

/* 7 ---------------------------------------------------------------------- */
test("the sound switch says what it is, in words a child's grown-up expects", () => {
  const toggle = read("src/components/kiddo/SoundToggle.tsx");

  /* "Sound on" / "Sound off" rather than "Audio settings": a switch, not a
     panel. `aria-pressed` tracks the *sound*, not the mute — a switch
     labelled "Sound on" that reports pressed=false is a contradiction. */
  assert.match(toggle, /const on = !muted/);
  assert.match(toggle, /aria-pressed=\{on\}/);
  assert.match(toggle, /"Sound on"/);
  assert.match(toggle, /"Sound off"/);

  /* Only the strings the switch actually wears — `toggleMuted` is the name of
     a function and the prose above it explains itself. What must never come
     back is a grown-up's word for this on a child's control. */
  const worn = [...toggle.matchAll(/(?:aria-label|title|label)\s*[=:]\s*\{?\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .concat([...toggle.matchAll(/\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)].flatMap((m) => [m[1], m[2]]));

  for (const text of worn) {
    assert.doesNotMatch(
      text,
      /audio|settings|mute|unmute|volume/i,
      `the switch is wearing "${text}"`,
    );
  }

  /* Same 3.5rem as every other round control, at every size. */
  assert.match(toggle, /size-14/);
  assert.doesNotMatch(toggle, /size-11/);
});

/* 8 ---------------------------------------------------------------------- */
test("the round's sound is decided once, in the shell, from what a game reports", () => {
  const shell = read("src/components/games/GameShell.tsx");

  assert.match(shell, /useSoundCue\(cue\)/);
  assert.match(shell, /useDuckedMusic\(status === "complete"\)/);
  /* Three cues and no fourth, because there is no fourth thing a game can
     say. `complete` outranks `correct` deliberately. */
  assert.match(shell, /status === "complete"\s*\?\s*"complete"/);
  assert.match(shell, /feedback === "correct"\s*\?\s*"correct"/);
  assert.match(shell, /feedback === "retry"\s*\?\s*"retry"/);

  /* And no game reaches for the speaker itself — that is the whole point of
     doing it here. */
  for (const path of [
    "src/components/games/math/MathQuestGame.tsx",
    "src/components/games/logic/LogicQuestGame.tsx",
    "src/components/games/engines/ChoiceStage.tsx",
  ]) {
    assert.doesNotMatch(read(path), /useSound\b|kiddoAudio/, `${path} plays its own`);
  }
});
