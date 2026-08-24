"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { kiddoAudio } from "./engine";
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "./settings";
import type { MusicId, SoundId } from "./tracks";

/**
 * Sound, as things React can render and call.
 *
 * The same shape as `useChildName`, and for the same reason: the preference is
 * a browser value on a prerendered page, so the server and the hydrating
 * render have to agree on an answer before the real one is available.
 */

/** The server, and the first client render, both see the default. */
function serverSnapshot(): AudioSettings {
  return DEFAULT_AUDIO_SETTINGS;
}

function snapshot(): AudioSettings {
  return kiddoAudio.getSettings();
}

function subscribe(listener: () => void): () => void {
  return kiddoAudio.subscribe(listener);
}

export interface AudioControls extends AudioSettings {
  toggleMuted: () => void;
  setMusicVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
}

/** The current preference, plus the ways to change it. */
export function useAudioSettings(): AudioControls {
  const settings = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggleMuted = useCallback(() => {
    kiddoAudio.toggleMuted();
  }, []);

  const setMusicVolume = useCallback((music: number) => {
    kiddoAudio.update({ music });
  }, []);

  const setEffectsVolume = useCallback((effects: number) => {
    kiddoAudio.update({ effects });
  }, []);

  return { ...settings, toggleMuted, setMusicVolume, setEffectsVolume };
}

/**
 * Play a short sound.
 *
 * Stable across renders, so it can sit in a dependency array without being the
 * reason an effect re-runs. Calling it before the child's first tap is silent
 * and harmless — which is exactly the shape of the browser's own rule.
 */
export function useSound(): (id: SoundId) => void {
  return useCallback((id: SoundId) => {
    kiddoAudio.play(id);
  }, []);
}

/**
 * Say a sound the moment a screen starts asking for one.
 *
 * The bridge between "what just happened" and "what KIDDO says about it", and
 * the reason no game contains the word `play`. Every KIDDO game already
 * reports its round in one shared vocabulary — `feedback` and `status`, the
 * two props `GameShell` reads — so the shell can map that vocabulary onto a
 * clip once, here, and six games get their sound without one of them being
 * edited. A seventh gets it by existing.
 *
 * `null` is silence, and it is what makes the cue repeatable: every game
 * passes back through it — a right answer settles to `idle` before the next
 * question, a nudge hands the board back — so the same cue twice in a row is
 * still two sounds. A cue that never returns to `null`, on the other hand,
 * fires exactly once, which is what the end of a round wants.
 */
export function useSoundCue(id: SoundId | null): void {
  const play = useSound();

  useEffect(() => {
    if (!id) return;
    play(id);
  }, [id, play]);
}

/**
 * Keep a bed playing for as long as this screen is on it.
 *
 * Idempotent, so several screens asking for the same bed is one bed that never
 * restarts as the child moves between them. It is deliberately *not* stopped
 * on unmount: navigating from the world into a game should not put a hole in
 * the music.
 *
 * Under `prefers-reduced-motion: reduce` nothing starts on its own. That
 * setting is the closest thing a browser has to "I would like less happening
 * at me", and a bed that fades up unasked is the audio version of the thing it
 * is asking us not to do. The toggle still turns it on.
 */
export function useMusic(id: MusicId | null): void {
  useEffect(() => {
    if (!id) return;

    kiddoAudio.installUnlock();

    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (calm?.matches) return;

    void kiddoAudio.playMusic(id);
  }, [id]);
}

/**
 * Hold the bed down while this screen is saying something.
 *
 * Mount it where an instruction is spoken and the room quietens behind it;
 * unmount and it comes back.
 */
export function useDuckedMusic(ducked: boolean): void {
  useEffect(() => {
    kiddoAudio.duck(ducked);
    return () => kiddoAudio.duck(false);
  }, [ducked]);
}
