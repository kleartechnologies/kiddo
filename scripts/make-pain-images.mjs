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

/**
 * One photograph shows a real television UI: the YouTube wordmark, and a grid
 * of thumbnails carrying other studios' characters and show titles. KIDDO is a
 * commercial product competing for the same evening, so putting those marks on
 * its sales page would both borrow brands we have no licence to and imply an
 * association nobody agreed to.
 *
 * Throwing the screen out of focus fixes that without losing the picture: a
 * child lit by a television is still a child lit by a television, and a photo
 * focused on the boy with the screen behind him soft is what the eye expects
 * anyway. `screen` is the rectangle to defocus and `keepSharp` is the ellipse
 * over his head that stays in focus, both as fractions of the output so they
 * survive a change to WIDTH.
 */
const DEFOCUS_SCREEN = {
  screen: { x: 0.058, y: 0.047, width: 0.842, height: 0.62 },
  keepSharp: { cx: 0.204, cy: 0.594, rx: 0.09, ry: 0.208 },
};

/** The original, and the name the page knows it by. */
const IMAGES = [
  { from: "asyik minta phone.png", to: "asks-for-phone.webp" },
  {
    from: "asyik tengok youtube.png",
    to: "endless-videos.webp",
    defocus: DEFOCUS_SCREEN,
  },
  { from: "parent rasa serba salah.png", to: "parent-torn.webp" },
  { from: "susah nak berhenti.png", to: "hard-to-stop.webp" },
];

/** Wide enough for a 2× phone and for half of the widest desktop column. */
const WIDTH = 1200;
const QUALITY = 78;

/**
 * Blur enough that a wordmark and a cartoon face stop being readable, not so
 * much that the screen stops looking like a screen. Both are tied to the
 * output width so the result is the same picture at any size.
 */
const BLUR = 0.035;
/** Softens the mask edge, so the sharp head meets the soft screen gradually. */
const FEATHER = 0.01;

const kb = (bytes) => `${Math.round(bytes / 1024)}kB`;

/**
 * Returns `photo` with `screen` thrown out of focus and `keepSharp` left as it
 * was, by laying a blurred copy of the whole frame over the original through a
 * feathered alpha mask.
 */
async function defocus(photo, { width, height }, { screen, keepSharp }) {
  const px = (fraction, of) => Math.round(fraction * of);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${width}" height="${height}" fill="black"/>` +
      `<rect x="${px(screen.x, width)}" y="${px(screen.y, height)}"` +
      ` width="${px(screen.width, width)}" height="${px(screen.height, height)}" fill="white"/>` +
      `<ellipse cx="${px(keepSharp.cx, width)}" cy="${px(keepSharp.cy, height)}"` +
      ` rx="${px(keepSharp.rx, width)}" ry="${px(keepSharp.ry, height)}" fill="black"/>` +
      `</svg>`,
  );
  // The mask becomes the blurred copy's alpha channel, so it shows through only
  // over the screen. Blurring the mask first is what turns the ellipse into a
  // soft edge rather than a cut-out traced around his hair.
  const alpha = await sharp(mask)
    .blur(FEATHER * width)
    .flatten({ background: "black" })
    .greyscale()
    .raw()
    .toBuffer();
  // Two passes on purpose: sharp applies `joinChannel` before `blur` within a
  // single pipeline, which would blur the alpha we just attached along with
  // everything else and put the whole room out of focus.
  const soft = await sharp(await sharp(photo).blur(BLUR * width).toBuffer())
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  return sharp(photo).composite([{ input: soft }]).toBuffer();
}

for (const image of IMAGES) {
  const source = join(ROOT, "assets", image.from);
  const target = join(OUT, image.to);
  const resized = await sharp(source)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  const photo = image.defocus
    ? await defocus(resized.data, resized.info, image.defocus)
    : resized.data;
  const info = await sharp(photo)
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(target);
  const before = statSync(source).size;
  console.log(
    `${image.to.padEnd(22)} ${info.width}×${info.height}  ${kb(before)} → ${kb(info.size)}` +
      (image.defocus ? "  (screen defocused)" : ""),
  );
}
