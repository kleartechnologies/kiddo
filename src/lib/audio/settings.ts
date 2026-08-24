/**
 * What the household has decided about sound.
 *
 * Three numbers on one device, in one key, and nothing else — the same shape
 * and the same promise as the child's name in `profile/child.ts`. There is no
 * server to tell, so there is nothing to leak.
 *
 * Pure and total: every function here takes `unknown` and returns something
 * usable, because the input is a JSON string out of `localStorage` that a
 * previous version of KIDDO wrote, or that a curious ten-year-old edited. A
 * settings module that can return a broken value is a settings module that
 * will one day blast a child at full volume.
 */

/**
 * Where the preference lives.
 *
 * Namespaced and versioned for the same reasons the child's name is: the
 * origin is shared, and the day this shape changes old values have to be
 * ignorable rather than migrated.
 */
export const AUDIO_SETTINGS_KEY = "kiddo.audio.v1";

export interface AudioSettings {
  /** One switch over everything. Music and effects both stop. */
  muted: boolean;
  /** The looping bed. */
  music: number;
  /** Taps, answers, celebrations. */
  effects: number;
}

/**
 * The ceiling on the music bed.
 *
 * Not 1. A background loop that can reach the same level as a spoken
 * instruction is a background loop that will eventually cover one, and no
 * child is going to go and fix that in a settings screen. The bed is capped
 * below the effects on purpose, and this is the only place that decides it.
 */
export const MAX_MUSIC_VOLUME = 0.45;

/**
 * Where sound starts for a child nobody has set preferences for.
 *
 * Quiet. The first impression of KIDDO should be a room with something warm
 * happening in the corner, not a game that has started shouting.
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  music: 0.22,
  effects: 0.5,
};

/** A volume, or null if it was never a volume. */
export function clampVolume(raw: unknown, max = 1): number | null {
  const value = typeof raw === "number" ? raw : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, 0), max);
}

/**
 * Whatever came out of storage, as settings.
 *
 * Every field falls back independently, so one corrupt number does not throw
 * away a preference the grown-up did set.
 */
export function normalizeAudioSettings(raw: unknown): AudioSettings {
  let value: unknown = raw;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  const source = value as Partial<Record<keyof AudioSettings, unknown>>;

  return {
    muted:
      typeof source.muted === "boolean"
        ? source.muted
        : DEFAULT_AUDIO_SETTINGS.muted,
    music:
      clampVolume(source.music, MAX_MUSIC_VOLUME) ??
      DEFAULT_AUDIO_SETTINGS.music,
    effects: clampVolume(source.effects) ?? DEFAULT_AUDIO_SETTINGS.effects,
  };
}

/**
 * Read the stored preference, or the default.
 *
 * Wrapped, because `localStorage` throws rather than returns nothing in Safari
 * private mode and anywhere site data is switched off. None of that is worth
 * showing anybody: it just means sound behaves the way it does on a fresh
 * device.
 */
export function readAudioSettings(): AudioSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AUDIO_SETTINGS };

  try {
    return normalizeAudioSettings(
      window.localStorage.getItem(AUDIO_SETTINGS_KEY),
    );
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

/**
 * Store a preference, and hand back what was actually kept.
 *
 * The return value is normalised, so a caller that writes and then applies is
 * applying the clamped settings rather than the ones it asked for.
 */
export function writeAudioSettings(raw: unknown): AudioSettings {
  const settings = normalizeAudioSettings(raw);
  if (typeof window === "undefined") return settings;

  try {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* Storage refused. The setting still holds for this visit; it simply will
       not be remembered, which is the mildest possible failure. */
  }

  return settings;
}
