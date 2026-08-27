/**
 * Prepares the four photographs the landing page's pain-point section is
 * built from.
 *
 * The originals live in `assets/` as ~1.9MB PNGs at 1402×1122, which is a
 * lossless screenshot format carrying photographs — the worst possible
 * combination for a parent meeting KIDDO on mobile data from an Instagram
 * advert. This rewrites each one as WebP at the largest size the layout can
 * ever show it (the section is at most one half of a 1152px column, and a
 * 2× phone shows it at ~780px), which is where the file stops being the
 * thing that makes the page slow.
 *
 * Quality 78 rather than 80-something: these are soft indoor photographs
 * with no text and no hard edges, so the artefacts WebP makes at this
 * setting are invisible at the size they are shown, and the saving is about
 * 95% of the bytes.
 *
 *   node scripts/make-pain-images.mjs
 *
 * Re-run it if an original is replaced. The output is committed, so an
 * ordinary build never needs sharp.
 */
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/illustrations/landing/pain");
mkdirSync(OUT, { recursive: true });

/** The original, and the name the page knows it by. */
const IMAGES = [
  { from: "asyik minta phone.png", to: "asks-for-phone.webp" },
  { from: "asyik tengok youtube.png", to: "endless-videos.webp" },
  { from: "parent rasa serba salah.png", to: "parent-torn.webp" },
  { from: "susah nak berhenti.png", to: "hard-to-stop.webp" },
];

/** Wide enough for a 2× phone and for half of the widest desktop column. */
const WIDTH = 1200;
const QUALITY = 78;

const kb = (bytes) => `${Math.round(bytes / 1024)}kB`;

for (const image of IMAGES) {
  const source = join(ROOT, "assets", image.from);
  const target = join(OUT, image.to);
  const info = await sharp(source)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(target);
  const before = statSync(source).size;
  console.log(
    `${image.to.padEnd(22)} ${info.width}×${info.height}  ${kb(before)} → ${kb(info.size)}`,
  );
}
