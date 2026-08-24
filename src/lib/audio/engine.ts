"use client";

import {
  DEFAULT_AUDIO_SETTINGS,
  MAX_MUSIC_VOLUME,
  readAudioSettings,
  writeAudioSettings,
  type AudioSettings,
} from "./settings";
import { MUSIC, SOUNDS, type Clip, type MusicId, type SoundId } from "./tracks";

/**
 * The one thing in KIDDO that makes a noise.
 *
 * A single Web Audio graph for the whole product, built the first time a child
 * touches the screen and never before:
 *
 *     music  ──▶ musicBus  ──┐
 *                            ├──▶ master ──▶ speakers
 *     effects ─▶ effectsBus ─┘
 *
 * Two buses because the two kinds of sound are answering different questions.
 * The bed is the room; an effect is a reply. A grown-up who wants the music
 * off but still wants a child to hear that they got it right can have exactly
 * that, and no game has to know it happened — it plays `correct` and the
 * graph decides how loud that is.
 *
 * ## Why Web Audio and not an `<audio>` tag
 *
 * Seamless looping. `<audio loop>` re-primes the decoder at the loop point and
 * most browsers put a click or a few milliseconds of silence there, which over
 * a twenty-minute play session is a metronome. An `AudioBufferSourceNode` with
 * `loop = true` is sample-accurate, so the bed is genuinely endless. It also
 * gives the two buses above for free, and a real gain ramp for ducking, both
 * of which would otherwise be a second system.
 *
 * ## Why nothing happens until the child touches something
 *
 * Every browser blocks audio until a gesture, and the wrong way to handle that
 * is to try anyway and let the console fill with rejected promises. So the
 * `AudioContext` is not even constructed until a real `pointerdown` or
 * `keydown` arrives. Anything asked for before then is remembered and played
 * the moment it is allowed — which is why entering the world "starts" the
 * music even though the music actually starts on the child's first tap.
 *
 * ## Why a missing file is not an error
 *
 * A clip that 404s is remembered as missing and never asked for again. KIDDO
 * has to stay completely playable with no audio at all: the files are art, and
 * art arrives later than the code that plays it.
 */

/** How long the bed takes to arrive, and to leave. Slow enough to be weather. */
const MUSIC_FADE = 1.4;

/** How long a volume change takes to land. Short, but never a step. */
const RAMP = 0.12;

/**
 * What is left of the music while KIDDO is talking.
 *
 * Not zero: the room should still be there behind the instruction, just
 * clearly behind it.
 */
const DUCK = 0.3;

type Listener = () => void;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  try {
    return new Ctor();
  } catch {
    return null;
  }
}

class KiddoAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;

  /** Decoded clips by src. `null` means "asked for, not there, stop asking". */
  private readonly buffers = new Map<string, AudioBuffer | null>();
  private readonly loading = new Map<string, Promise<AudioBuffer | null>>();

  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private loaded = false;

  private playing: { id: MusicId; node: AudioBufferSourceNode } | null = null;
  /** What was asked for before the browser would allow it. */
  private wanted: MusicId | null = null;
  private ducked = false;

  private readonly listeners = new Set<Listener>();
  private unlockInstalled = false;

  /* ---------------------------------------------------------------- state */

  /**
   * The current preference, read from storage on first ask.
   *
   * Lazy for the same reason `useChildName` is: this module is imported into
   * a prerendered tree, and there is no storage on the server.
   */
  getSettings(): AudioSettings {
    if (!this.loaded && typeof window !== "undefined") {
      this.settings = readAudioSettings();
      this.loaded = true;
    }
    return this.settings;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Change a preference, persist it, and apply it to whatever is playing. */
  update(patch: Partial<AudioSettings>): AudioSettings {
    this.settings = writeAudioSettings({ ...this.getSettings(), ...patch });
    this.applyGains();
    this.emit();
    return this.settings;
  }

  toggleMuted(): AudioSettings {
    return this.update({ muted: !this.getSettings().muted });
  }

  /* ----------------------------------------------------------------- graph */

  /**
   * Build the graph, or wake it up. Only ever called from a real gesture.
   *
   * Returns false when this browser has no Web Audio at all, which is the one
   * case where every other method quietly becomes a no-op.
   */
  private wake(): boolean {
    if (!this.ctx) {
      const ctx = context();
      if (!ctx) return false;

      this.ctx = ctx;
      this.master = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.effectsBus = ctx.createGain();

      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.master.connect(ctx.destination);

      this.applyGains(0);
    }

    if (this.ctx.state === "suspended") void this.ctx.resume();
    return true;
  }

  /** Push the current settings into the graph. */
  private applyGains(ramp = RAMP): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.musicBus || !this.effectsBus) return;

    const settings = this.getSettings();
    const now = ctx.currentTime;
    const set = (node: GainNode, value: number) => {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(value, now + ramp);
    };

    set(this.master, settings.muted ? 0 : 1);
    set(
      this.musicBus,
      Math.min(settings.music, MAX_MUSIC_VOLUME) * (this.ducked ? DUCK : 1),
    );
    set(this.effectsBus, settings.effects);
  }

  /**
   * Listen once for the gesture that lets us make a sound.
   *
   * Capturing and passive: this must never be able to change what a tap on a
   * game card does. `once` on each, and the first one to fire removes the
   * others, so this costs nothing after the child's first touch.
   */
  installUnlock(): void {
    if (this.unlockInstalled || typeof window === "undefined") return;
    this.unlockInstalled = true;

    const events = ["pointerdown", "touchend", "keydown"] as const;
    const unlock = () => {
      for (const event of events) window.removeEventListener(event, unlock, true);
      if (!this.wake()) return;
      if (this.wanted) {
        const id = this.wanted;
        this.wanted = null;
        void this.playMusic(id);
      }
    };

    for (const event of events) {
      window.addEventListener(event, unlock, { capture: true, passive: true });
    }
  }

  /* ----------------------------------------------------------------- clips */

  private async buffer(clip: Clip): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(clip.src);
    if (cached !== undefined) return cached;

    const inFlight = this.loading.get(clip.src);
    if (inFlight) return inFlight;

    const ctx = this.ctx;
    if (!ctx) return null;

    const load = (async () => {
      try {
        const response = await fetch(clip.src);
        if (!response.ok) throw new Error(String(response.status));
        const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(clip.src, decoded);
        return decoded;
      } catch {
        /* Not there, or not decodable. Remember that, so a game that plays
           `tap` on every touch does not fetch a missing file every touch. */
        this.buffers.set(clip.src, null);
        return null;
      } finally {
        this.loading.delete(clip.src);
      }
    })();

    this.loading.set(clip.src, load);
    return load;
  }

  /* ----------------------------------------------------------------- music */

  /**
   * Start the bed, or remember to start it as soon as we are allowed.
   *
   * Asking for the bed that is already playing does nothing at all — which is
   * what makes it safe to call from a component that mounts on every screen.
   */
  async playMusic(id: MusicId): Promise<void> {
    if (this.playing?.id === id) return;

    if (!this.ctx || this.ctx.state !== "running") {
      /* No gesture yet. Hold the request; `installUnlock` will honour it. */
      this.wanted = id;
      this.installUnlock();
      return;
    }

    const clip = MUSIC[id];
    const buffer = await this.buffer(clip);
    const ctx = this.ctx;
    if (!buffer || !ctx || !this.musicBus) return;

    /* Re-check: an await is long enough for the child to have hit mute, or
       for a second screen to have asked for a different bed. */
    if (this.playing?.id === id) return;
    this.stopMusic();

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;

    const trim = ctx.createGain();
    trim.gain.setValueAtTime(0, ctx.currentTime);
    trim.gain.linearRampToValueAtTime(
      clip.gain ?? 1,
      ctx.currentTime + MUSIC_FADE,
    );

    node.connect(trim);
    trim.connect(this.musicBus);
    node.start();

    this.playing = { id, node };
  }

  /** Stop the bed. Immediate, because the only caller is leaving the page. */
  stopMusic(): void {
    const playing = this.playing;
    this.playing = null;
    this.wanted = null;
    if (!playing) return;

    try {
      playing.node.stop();
    } catch {
      /* Already stopped. */
    }
    playing.node.disconnect();
  }

  /**
   * Pull the bed down behind something being said, and let it back up after.
   *
   * The knob a game reaches for while KIDDO is giving an instruction. Idempotent
   * on purpose: a screen that ducks on mount and un-ducks on unmount does not
   * have to know whether anything else already did.
   */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.applyGains(RAMP * 2);
  }

  /* --------------------------------------------------------------- effects */

  /**
   * A one-shot reply.
   *
   * Deliberately fire-and-forget and deliberately silent before the first
   * gesture: an effect is a response to a tap, so by the time one is genuinely
   * wanted the graph is always awake.
   */
  play(id: SoundId): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.effectsBus) return;
    if (this.getSettings().muted) return;

    const clip = SOUNDS[id];
    void this.buffer(clip).then((buffer) => {
      if (!buffer || !this.ctx || !this.effectsBus) return;

      const node = this.ctx.createBufferSource();
      node.buffer = buffer;

      const trim = this.ctx.createGain();
      trim.gain.value = clip.gain ?? 1;

      node.connect(trim);
      trim.connect(this.effectsBus);
      node.start();
      node.onended = () => {
        node.disconnect();
        trim.disconnect();
      };
    });
  }
}

/**
 * The instrument. One per document, and there is no second one.
 *
 * Module scope rather than a React context because sound outlives any tree
 * that plays it: a bed started on the home screen has to survive the child
 * navigating into a game, and a context that unmounts would take it with it.
 */
export const kiddoAudio = new KiddoAudio();
