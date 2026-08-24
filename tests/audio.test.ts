import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUDIO_SETTINGS_KEY,
  DEFAULT_AUDIO_SETTINGS,
  MAX_MUSIC_VOLUME,
  clampVolume,
  normalizeAudioSettings,
} from "@/lib/audio/settings";
import {
  MUSIC,
  MUSIC_IDS,
  SOUNDS,
  SOUND_IDS,
  WORLD_MUSIC,
} from "@/lib/audio/tracks";

/**
 * The audio layer, checked where it can actually be checked.
 *
 * The engine itself is a Web Audio graph and needs a browser, so what is
 * asserted here is everything that is not: the registry every screen looks
 * clips up in, and the settings a child's mute survives on. Those are the two
 * places a silent regression could hide — a sound that no longer resolves to a
 * file, or a stored preference that comes back as something the gain nodes
 * cannot use.
 */

/**
 * Any container a browser can decode.
 *
 * Deliberately not `.wav`. The placeholders happen to be wav, but the promise
 * the registry makes is that swapping in the finished KIDDO music is one line
 * in `tracks.ts` — and a test that pinned the extension would turn that one
 * line into a failing suite the moment the real files arrived as mp3.
 */
const AUDIO_FILE = /^\/audio\/[\w-]+\.(wav|mp3|ogg|m4a|aac|flac|opus|webm)$/;

test("every registered sound and music id resolves to a clip under /audio", () => {
  assert.ok(SOUND_IDS.length > 0);
  assert.ok(MUSIC_IDS.length > 0);

  for (const id of SOUND_IDS) {
    const clip = SOUNDS[id];
    assert.ok(clip, `sound "${id}" has no clip`);
    assert.match(clip.src, AUDIO_FILE, `sound "${id}" src`);
    if (clip.gain !== undefined) {
      assert.ok(clip.gain > 0 && clip.gain <= 1, `sound "${id}" gain`);
    }
  }

  for (const id of MUSIC_IDS) {
    const clip = MUSIC[id];
    assert.ok(clip, `music "${id}" has no clip`);
    assert.match(clip.src, AUDIO_FILE, `music "${id}" src`);
  }

  assert.ok(MUSIC[WORLD_MUSIC], "the world bed the play screens ask for exists");
});

test("the placeholder flag marks exactly what still has to be replaced", () => {
  /* Not that anything *is* a placeholder — that is a fact about today, and
     this test outlives today. What is checked is that the flag means one
     thing: a clip carrying it is stand-in art, and dropping the finished file
     in is a src change and dropping the flag. Nothing reads it at runtime, so
     it can never be the reason a sound does or does not play. */
  const clips = [
    ...SOUND_IDS.map((id) => SOUNDS[id]),
    ...MUSIC_IDS.map((id) => MUSIC[id]),
  ];

  for (const clip of clips) {
    if ("placeholder" in clip && clip.placeholder !== undefined) {
      assert.equal(clip.placeholder, true, "placeholder is a flag, not a value");
    }
  }
});

test("no two ids point at the same file", () => {
  const srcs = [
    ...SOUND_IDS.map((id) => SOUNDS[id].src),
    ...MUSIC_IDS.map((id) => MUSIC[id].src),
  ];
  assert.equal(new Set(srcs).size, srcs.length);
});

test("the defaults are quiet enough to sit under a child's instructions", () => {
  assert.equal(DEFAULT_AUDIO_SETTINGS.muted, false);
  assert.ok(DEFAULT_AUDIO_SETTINGS.music <= MAX_MUSIC_VOLUME);
  assert.ok(DEFAULT_AUDIO_SETTINGS.music < DEFAULT_AUDIO_SETTINGS.effects);
  assert.ok(DEFAULT_AUDIO_SETTINGS.effects <= 1);
});

test("clampVolume keeps a usable number or says it cannot", () => {
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(0), 0);
  assert.equal(clampVolume(1), 1);
  assert.equal(clampVolume(4), 1, "above the ceiling clamps to it");
  assert.equal(clampVolume(-1), 0, "below the floor clamps to it");
  assert.equal(clampVolume(4, MAX_MUSIC_VOLUME), MAX_MUSIC_VOLUME);

  for (const junk of [null, undefined, "loud", NaN, Infinity, {}, []]) {
    assert.equal(clampVolume(junk), null, `${String(junk)} is not a volume`);
  }
});

test("normalizeAudioSettings survives anything that was in storage", () => {
  assert.deepEqual(
    normalizeAudioSettings({ muted: true, music: 0.3, effects: 0.6 }),
    { muted: true, music: 0.3, effects: 0.6 },
  );

  // A JSON string, which is what localStorage actually hands back.
  assert.deepEqual(
    normalizeAudioSettings('{"muted":true,"music":0.1,"effects":0.2}'),
    { muted: true, music: 0.1, effects: 0.2 },
  );

  for (const junk of [null, undefined, "", "not json", 7, [], "[]"]) {
    assert.deepEqual(
      normalizeAudioSettings(junk),
      DEFAULT_AUDIO_SETTINGS,
      `${String(junk)} falls all the way back`,
    );
  }
});

test("one bad field does not throw away the others", () => {
  assert.deepEqual(normalizeAudioSettings({ muted: true, music: "x" }), {
    muted: true,
    music: DEFAULT_AUDIO_SETTINGS.music,
    effects: DEFAULT_AUDIO_SETTINGS.effects,
  });

  assert.deepEqual(normalizeAudioSettings({ muted: "yes", effects: 0.9 }), {
    muted: DEFAULT_AUDIO_SETTINGS.muted,
    music: DEFAULT_AUDIO_SETTINGS.music,
    effects: 0.9,
  });
});

test("a stored music volume can never exceed the child-safe ceiling", () => {
  // However it got in there — a hand-edited value, an older build, a bug.
  for (const loud of [0.9, 1, 99]) {
    const settings = normalizeAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, music: loud });
    assert.ok(
      settings.music <= MAX_MUSIC_VOLUME,
      `music ${loud} came back as ${settings.music}`,
    );
  }
});

test("the storage key is namespaced and versioned like the profile keys", () => {
  assert.match(AUDIO_SETTINGS_KEY, /^kiddo\..+\.v\d+$/);
});
