/**
 * Placeholder audio for KIDDO.
 *
 *     node scripts/make-placeholder-audio.mjs
 *
 * Writes `public/audio/*.wav`. Everything here is synthesised from sine and
 * triangle partials by this file — there is no sample, no library and nothing
 * licensed, which is the whole point: the sound system needs something real to
 * play before the real KIDDO music exists, and a placeholder that carries a
 * rights question is worse than no placeholder at all.
 *
 * Replacing any of it is a new file at the same path. Nothing in `src` knows
 * these were generated.
 *
 * ## The two rules the clips obey
 *
 * **Seamless.** The bed is rendered with wrap-around: a sample written past the
 * end of the buffer lands back at the start, so a note's tail crosses the loop
 * point instead of being cut at it. Every sustained partial is quantised to a
 * whole number of cycles across the loop, so it meets itself exactly. There is
 * no fade at either end, because a fade *is* the seam.
 *
 * **Quiet.** Peaks are normalised well below full scale and the engine trims
 * again on top. A child's first second of KIDDO should never be loud.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");

/** Plenty for tones whose highest partial is under 4 kHz, and a third the size. */
const RATE = 22050;

/* --------------------------------------------------------------- the notes */

/**
 * C major pentatonic, which is the scale with no wrong answer in it.
 *
 * Any two of these sound fine together, so a phrase built from them cannot
 * come out sour — the right property for music a four-year-old will hear a few
 * hundred times.
 */
const NOTE = {
  C3: 130.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 784.0, A5: 880.0,
  C6: 1046.5, E6: 1318.5,
};

/* ---------------------------------------------------------------- the tools */

/** A buffer of silence, in samples. */
const canvas = (seconds) => new Float32Array(Math.round(seconds * RATE));

/**
 * Add one struck note.
 *
 * `wrap` sends the tail back round to the start of the buffer, which is what
 * makes a looping bed joinless. One-shot effects leave it off and simply run
 * out of buffer.
 */
function strike(buf, { at, freq, seconds, gain = 1, partials = [1, 0.32, 0.1], wrap = false }) {
  const start = Math.round(at * RATE);
  const length = Math.round(seconds * RATE);
  const attack = Math.round(0.012 * RATE);

  for (let i = 0; i < length; i++) {
    const index = start + i;
    if (index >= buf.length && !wrap) break;

    const t = i / RATE;
    /* Exponential decay, the shape a struck thing actually makes. */
    const envelope =
      Math.min(1, i / attack) * Math.exp((-t / seconds) * 4.2);

    let value = 0;
    for (let p = 0; p < partials.length; p++) {
      value += partials[p] * Math.sin(2 * Math.PI * freq * (p + 1) * t);
    }

    buf[index % buf.length] += value * envelope * gain;
  }
}

/**
 * Add a held tone across the whole buffer.
 *
 * The frequency is snapped to a whole number of cycles over the loop, so the
 * waveform arrives back where it started. The error is a fraction of a cent
 * and nobody has ever heard one.
 */
function drone(buf, { freq, gain, tremolo = 0 }) {
  const seconds = buf.length / RATE;
  const tuned = Math.round(freq * seconds) / seconds;
  const wobble = Math.round(tremolo * seconds) / seconds;

  for (let i = 0; i < buf.length; i++) {
    const t = i / RATE;
    const swell = wobble ? 0.78 + 0.22 * Math.sin(2 * Math.PI * wobble * t) : 1;
    buf[i] +=
      (Math.sin(2 * Math.PI * tuned * t) +
        0.14 * Math.sin(2 * Math.PI * tuned * 2 * t)) *
      gain *
      swell;
  }
}

/** A short pitch sweep. Used only by the two smallest interface sounds. */
function sweep(buf, { at, from, to, seconds, gain = 1 }) {
  const start = Math.round(at * RATE);
  const length = Math.round(seconds * RATE);
  let phase = 0;

  for (let i = 0; i < length && start + i < buf.length; i++) {
    const progress = i / length;
    const freq = from + (to - from) * progress;
    phase += (2 * Math.PI * freq) / RATE;
    const envelope = Math.min(1, i / (0.004 * RATE)) * Math.exp(-progress * 4);
    buf[start + i] += Math.sin(phase) * envelope * gain;
  }
}

/** Scale so the loudest sample lands on `peak`, leaving the rest as headroom. */
function normalize(buf, peak) {
  let loudest = 0;
  for (const sample of buf) loudest = Math.max(loudest, Math.abs(sample));
  if (loudest === 0) return buf;
  const scale = peak / loudest;
  for (let i = 0; i < buf.length; i++) buf[i] *= scale;
  return buf;
}

/** 16-bit mono PCM in a WAV wrapper. The plainest thing every browser decodes. */
function wav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

function save(name, buf, peak) {
  const file = join(OUT, name);
  writeFileSync(file, wav(normalize(buf, peak)));
  console.log(`${name}  ${(buf.length / RATE).toFixed(2)}s`);
}

/* ----------------------------------------------------------------- the bed */

/**
 * Eight seconds of somewhere warm.
 *
 * Twelve beats at 90, a rocking pentatonic phrase over a held C, and a second
 * voice a beat behind the first so the loop never quite lines up with itself.
 * Slow, low and unmelodic enough to stop being information after a minute,
 * which is the only thing background music has to get right.
 */
function bed() {
  const beat = 60 / 90;
  const buf = canvas(beat * 12);

  drone(buf, { freq: NOTE.C3, gain: 0.1, tremolo: 0.125 });
  drone(buf, { freq: NOTE.G3, gain: 0.062, tremolo: 0.25 });
  drone(buf, { freq: NOTE.C4, gain: 0.04, tremolo: 0.125 });

  const phrase = [
    [0, NOTE.G4], [1, NOTE.A4], [2, NOTE.C5], [3.5, NOTE.A4],
    [5, NOTE.G4], [6, NOTE.E4], [7, NOTE.G4], [8.5, NOTE.D4],
    [10, NOTE.C4], [11, NOTE.E4],
  ];

  for (const [at, freq] of phrase) {
    strike(buf, { at: at * beat, freq, seconds: 1.5, gain: 0.3, wrap: true });
  }

  /* The answering voice: an octave up, a beat behind, and half as loud. */
  for (const [at, freq] of phrase) {
    strike(buf, {
      at: (at + 1) * beat,
      freq: freq * 2,
      seconds: 1.1,
      gain: 0.1,
      partials: [1, 0.16],
      wrap: true,
    });
  }

  return buf;
}

/* ------------------------------------------------------------- the replies */

mkdirSync(OUT, { recursive: true });

save("kiddo-world.wav", bed(), 0.62);

/* A finger landing. The most-played sound in KIDDO, so it is the shortest. */
{
  const buf = canvas(0.1);
  strike(buf, { at: 0, freq: NOTE.A5, seconds: 0.07, partials: [1, 0.2] });
  save("tap.wav", buf, 0.42);
}

/* A control being used, rather than an answer being given. */
{
  const buf = canvas(0.16);
  sweep(buf, { at: 0, from: NOTE.D5, to: NOTE.A5, seconds: 0.12 });
  save("button.wav", buf, 0.44);
}

/* Right. A rising major triad — the shape of the word "yes". */
{
  const buf = canvas(0.55);
  [NOTE.C5, NOTE.E5, NOTE.G5].forEach((freq, i) => {
    strike(buf, { at: i * 0.075, freq, seconds: 0.35, gain: 0.9 });
  });
  save("correct.wav", buf, 0.5);
}

/* Let's try again. Two soft notes falling a fifth: warm, unhurried, and
   pointedly not a buzzer. Nothing in KIDDO tells a child off, which is why
   the registry calls this one `retry` rather than anything harsher. */
{
  const buf = canvas(0.5);
  strike(buf, { at: 0, freq: NOTE.G4, seconds: 0.3, partials: [1, 0.1] });
  strike(buf, { at: 0.13, freq: NOTE.D4, seconds: 0.34, partials: [1, 0.1] });
  save("retry.wav", buf, 0.34);
}

/* A round finished. The one moment KIDDO is allowed to be loud. */
{
  const buf = canvas(1.3);
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((freq, i) => {
    strike(buf, { at: i * 0.1, freq, seconds: 0.6, gain: 0.9 });
  });
  [NOTE.E6, NOTE.C6, NOTE.G5].forEach((freq, i) => {
    strike(buf, { at: 0.44 + i * 0.09, freq, seconds: 0.5, gain: 0.32, partials: [1, 0.12] });
  });
  save("complete.wav", buf, 0.66);
}
