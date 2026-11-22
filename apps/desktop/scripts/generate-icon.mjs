#!/usr/bin/env node
/**
 * Draws the Skyboy icon and derives the platform icon set from it.
 *
 * ## Why this is code rather than a binary in the repository
 *
 * An icon is a design decision, and a decision is easier to review as twenty
 * lines of shapes than as an opaque `.ico`. It also means there is no
 * "where did this come from" question to answer, and changing the brand colour
 * is a one-line diff.
 *
 * ## What it does
 *
 * 1. Renders `assets/icon.png`, 1024x1024, with a hand-rolled PNG encoder.
 *    No image library: the only thing needed is "write some pixels", and a
 *    dependency for that is a supply-chain surface for no benefit.
 * 2. Runs `tauri icon` over it, which produces the `.ico`, `.icns` and the
 *    sized PNGs the bundler wants. That step is the Tauri CLI's job because it
 *    knows the sizes each platform expects, and getting `.icns` right by hand
 *    is a project of its own.
 *
 * Usage: `npm run generate:icon` in apps/desktop.
 */

import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP = resolve(HERE, "..");
const SOURCE = join(DESKTOP, "assets", "icon.png");
const OUTPUT = join(DESKTOP, "core", "icons");

const SIZE = 1024;
/** Supersampling factor per axis. 3 gives clean edges without being slow. */
const SAMPLES = 3;

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------

/** A rounded square that fills the tile, in normalised 0..1 coordinates. */
function insideTile(x, y, inset, radius) {
  const min = inset;
  const max = 1 - inset;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function insideCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** Blend `over` onto `under` with an alpha. */
function blend(under, over, alpha) {
  return [
    under[0] + (over[0] - under[0]) * alpha,
    under[1] + (over[1] - under[1]) * alpha,
    under[2] + (over[2] - under[2]) * alpha,
  ];
}

const TILE_TOP = [26, 34, 54];
const TILE_BOTTOM = [12, 14, 20];
const MOON = [241, 245, 255];
const STAR = [190, 208, 246];

/** The stars: position and radius, in normalised coordinates. */
const STARS = [
  [0.72, 0.28, 0.026],
  [0.79, 0.42, 0.017],
  [0.31, 0.24, 0.02],
  [0.24, 0.72, 0.015],
  [0.68, 0.75, 0.013],
];

/**
 * The colour at one point, before supersampling.
 *
 * The mark is a crescent: a large disc with a second disc subtracted from its
 * upper right, which is the oldest trick there is and reads clearly at 16px
 * because the shape stays open rather than filling in.
 */
function sample(x, y) {
  // Outside the tile is fully transparent, so the icon sits on any background.
  if (!insideTile(x, y, 0.06, 0.22)) {
    return [0, 0, 0, 0];
  }

  // A vertical gradient, brighter at the top, so the tile has depth at large
  // sizes without looking like a different colour at small ones.
  const t = Math.min(1, Math.max(0, y));
  let colour = [
    TILE_TOP[0] + (TILE_BOTTOM[0] - TILE_TOP[0]) * t,
    TILE_TOP[1] + (TILE_BOTTOM[1] - TILE_TOP[1]) * t,
    TILE_TOP[2] + (TILE_BOTTOM[2] - TILE_TOP[2]) * t,
  ];

  for (const [sx, sy, radius] of STARS) {
    if (insideCircle(x, y, sx, sy, radius)) {
      colour = blend(colour, STAR, 0.75);
    }
  }

  const moonDisc = insideCircle(x, y, 0.5, 0.53, 0.27);
  const bite = insideCircle(x, y, 0.62, 0.43, 0.235);
  if (moonDisc && !bite) {
    colour = blend(colour, MOON, 1);
  }

  return [colour[0], colour[1], colour[2], 255];
}

/** Render the whole image, supersampled and downsampled back. */
function render() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const step = 1 / (SIZE * SAMPLES);

  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const x = (px * SAMPLES + sx + 0.5) * step;
          const y = (py * SAMPLES + sy + 0.5) * step;
          const [ir, ig, ib, ia] = sample(x, y);
          // Weight colour by alpha so edge pixels do not darken toward black.
          const weight = ia / 255;
          r += ir * weight;
          g += ig * weight;
          b += ib * weight;
          a += ia;
        }
      }
      const count = SAMPLES * SAMPLES;
      const alpha = a / count;
      const scale = alpha > 0 ? 255 / a : 0;
      const offset = (py * SIZE + px) * 4;
      pixels[offset] = Math.round(r * scale);
      pixels[offset + 1] = Math.round(g * scale);
      pixels[offset + 2] = Math.round(b * scale);
      pixels[offset + 3] = Math.round(alpha);
    }
  }
  return pixels;
}

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte per scanline. Filter 1 (Sub) is a good default for a
  // smooth gradient and costs nothing to implement.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const target = y * (stride + 1);
    raw[target] = 1;
    for (let x = 0; x < stride; x += 1) {
      const current = pixels[y * stride + x];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      raw[target + 1 + x] = (current - left) & 0xff;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

mkdirSync(dirname(SOURCE), { recursive: true });
const png = encodePng(render(), SIZE);
writeFileSync(SOURCE, png);
process.stdout.write(`generate-icon: wrote ${SOURCE} (${(png.length / 1024).toFixed(0)} KiB)\n`);

/**
 * Find the Tauri CLI's JavaScript entry point.
 *
 * Not `npx`: on Windows `npx` is a `.cmd` file, and a `.cmd` cannot be spawned
 * without a shell - the same trap that makes a shell-form hook fragile, and the
 * reason `skyboy-hook` has to be a real `.exe`. Running the CLI's script with
 * the current Node binary avoids the shell entirely, and avoids depending on
 * whether npm's bin directory happens to be on PATH.
 *
 * npm workspaces hoist, so the package sits at the repository root even though
 * it is declared in apps/desktop.
 */
function findTauriCli() {
  let directory = DESKTOP;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(directory, "node_modules", "@tauri-apps", "cli", "tauri.js");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}

const cli = findTauriCli();
if (!cli) {
  process.stderr.write(
    "\ngenerate-icon: could not find the Tauri CLI at @tauri-apps/cli.\n" +
      "Run `npm install` at the repository root first.\n" +
      `The source PNG was written to ${SOURCE} regardless, so this can be re-run.\n`,
  );
  process.exit(1);
}

// Run from apps/desktop: `tauri.conf.json` is the marker Tauri uses to find the
// crate, and its path resolution starts at the working directory.
const result = spawnSync(process.execPath, [cli, "icon", SOURCE, "-o", "core/icons"], {
  cwd: DESKTOP,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  process.stderr.write(
    `\ngenerate-icon: \`tauri icon\` failed with ${result.status}.\n` +
      `The source PNG was written to ${SOURCE}, so it can be re-run.\n`,
  );
  process.exit(result.status ?? 1);
}

process.stdout.write(`generate-icon: wrote the icon set to ${OUTPUT}\n`);
