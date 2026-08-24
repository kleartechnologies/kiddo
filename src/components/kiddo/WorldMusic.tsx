"use client";

import { useMusic } from "@/lib/audio/useAudio";
import { WORLD_MUSIC } from "@/lib/audio/tracks";

/**
 * The room the child is standing in, switched on.
 *
 * Renders nothing. It exists so that "this screen is part of the play
 * experience" is one line in a page rather than a hook call every screen has
 * to remember, and so the bed is started from the tree instead of from module
 * scope — where it would run during a prerender and have nothing to play to.
 *
 * Mounting it on a second screen does not restart anything: the engine treats
 * a request for the bed that is already playing as already done. That is what
 * lets a child walk from the world into a game without a seam in the music.
 */
export function WorldMusic() {
  useMusic(WORLD_MUSIC);
  return null;
}
