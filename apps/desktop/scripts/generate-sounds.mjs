#!/usr/bin/env node
/**
 * Generates the built-in alert sounds.
 *
 * These are small, deliberately unglamorous tones rather than recordings: the
 * app ships them in its installer, and a notifier that plays a piece of music
 * at you when a build fails is worse than one that pings.
 *
 * They are generated rather than committed as opaque binaries so that changing
 * one is a reviewable diff, and so the licensing question ("where did these
 * come from?") has the only answer that needs no attribution: they were
 * synthesised here.
 *
 * Format: 16-bit mono PCM WAV at 22 050 Hz. That is half the rate of a CD,
 * which halves the file size, and every sound is a low-partial-count tone well
 * under the 11 kHz Nyquist limit, so nothing audible is lost. `PlaySoundW` on
 * Windows and `afplay` on macOS both read plain PCM WAV without any decoder.
 *
 * Run it with `npm run generate:sounds` in apps/desktop. The output is
 * committed, so this only needs running when a sound changes.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(HERE, "..", "core", "assets", "sounds");

const SAMPLE_RATE = 22050;
/** Leaves headroom so the loudest sound cannot clip when mixed with anything. */
const PEAK = 0.72;

/**
 * A note: a frequency, when it starts, how long it rings, and its character.
 *
 * `partials` are relative amplitudes of the harmonic series. A sine wave is
 * `[1]`; a struck bell needs the odd, slightly-detuned partials that make it
 * read as metal rather than as a beep.
 */
function note(frequency, startSeconds, durationSeconds, { partials = [1], decay = 1 } = {}) {
  return { frequency, startSeconds, durationSeconds, partials, decay };
}

/**
 * A two-tone alarm has to work at low volume, so it uses a squarer partial set
 * and a hard on/off rather than a decay.
 */
function alarmTone(frequency, startSeconds, durationSeconds) {
  return {
    frequency,
    startSeconds,
    durationSeconds,
    partials: [1, 0.5, 0.32, 0.2, 0.14],
    decay: 0,
  };
}

const SOUNDS = {
  // A soft two-note rise. The default: audible across a desk, not across a room.
  chime: {
    duration: 1.3,
    notes: [
      note(1046.5, 0.0, 0.9, { partials: [1, 0.32, 0.1], decay: 3.4 }),
      note(1318.5, 0.14, 1.0, { partials: [1, 0.3, 0.09], decay: 3.2 }),
    ],
  },
  // One short note. The quietest option, for people who share an office.
  ping: {
    duration: 0.55,
    notes: [note(880.0, 0.0, 0.5, { partials: [1, 0.22, 0.07], decay: 6.0 })],
  },
  // A struck bell: inharmonic partials and a long decay.
  bell: {
    duration: 1.9,
    notes: [
      note(659.3, 0.0, 1.85, {
        partials: [1, 0.55, 0.3, 0.22, 0.14, 0.09],
        decay: 2.4,
      }),
      note(1318.5, 0.0, 1.0, { partials: [1, 0.4], decay: 5.0 }),
    ],
  },
  // Three wooden notes. Warm and short, so a ring is not tiring to hear.
  marimba: {
    duration: 1.7,
    notes: [
      note(523.25, 0.0, 0.7, { partials: [1, 0.3, 0.12, 0.05], decay: 5.0 }),
      note(659.25, 0.22, 0.7, { partials: [1, 0.3, 0.12, 0.05], decay: 5.0 }),
      note(783.99, 0.44, 0.9, { partials: [1, 0.3, 0.12, 0.05], decay: 4.4 }),
    ],
  },
  // A hard two-tone. For when missing the alert is the expensive outcome.
  alarm: {
    duration: 1.0,
    notes: [
      alarmTone(784.0, 0.0, 0.22),
      alarmTone(587.3, 0.25, 0.22),
      alarmTone(784.0, 0.5, 0.22),
      alarmTone(587.3, 0.75, 0.22),
    ],
  },
};

/** Render one sound to float samples in [-1, 1]. */
function render(spec) {
  const total = Math.ceil(spec.duration * SAMPLE_RATE);
  const samples = new Float64Array(total);

  for (const tone of spec.notes) {
    const start = Math.round(tone.startSeconds * SAMPLE_RATE);
    const length = Math.ceil(tone.durationSeconds * SAMPLE_RATE);
    for (let index = 0; index < length; index += 1) {
      const position = start + index;
      if (position >= total) break;

      const time = index / SAMPLE_RATE;
      // Exponential decay, with `decay: 0` meaning "hold until the note ends"
      // (which the alarm needs and a bell must not have).
      const envelope = tone.decay === 0 ? 1 : Math.exp(-tone.decay * time);
      // A short fade at the very start and end. Without it, a waveform that
      // begins at a non-zero value produces an audible click on both platforms.
      const fade = Math.min(1, index / (SAMPLE_RATE * 0.004));
      const tail = Math.min(1, (length - index) / (SAMPLE_RATE * 0.01));

      let value = 0;
      for (let partial = 0; partial < tone.partials.length; partial += 1) {
        const harmonic = partial + 1;
        value += tone.partials[partial] * Math.sin(2 * Math.PI * tone.frequency * harmonic * time);
      }
      samples[position] += value * envelope * fade * tail;
    }
  }

  // Normalise to a fixed peak rather than the maximum: every sound should be
  // roughly as loud as the others, so the choice is about character not volume.
  let largest = 0;
  for (const sample of samples) largest = Math.max(largest, Math.abs(sample));
  if (largest > 0) {
    const scale = PEAK / largest;
    for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
  }
  return samples;
}

/** Wrap float samples in a 16-bit mono PCM WAV container. */
function encodeWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(1, 22); // channels: mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    // Asymmetric scaling: 16-bit signed ranges from -32768 to 32767.
    const value = clamped < 0 ? clamped * 32768 : clamped * 32767;
    buffer.writeInt16LE(Math.round(value), 44 + index * 2);
  }
  return buffer;
}

mkdirSync(OUTPUT_DIR, { recursive: true });

let totalBytes = 0;
for (const [id, spec] of Object.entries(SOUNDS)) {
  const wav = encodeWav(render(spec));
  const path = join(OUTPUT_DIR, `${id}.wav`);
  writeFileSync(path, wav);
  totalBytes += wav.length;
  process.stdout.write(
    `${id.padEnd(9)} ${String(wav.length).padStart(7)} bytes  ${spec.duration.toFixed(2)}s\n`,
  );
}
process.stdout.write(`total     ${String(totalBytes).padStart(7)} bytes\n`);
