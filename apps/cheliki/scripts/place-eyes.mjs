// Draws every eyes layer over the sticks layer, which marks where the eyes are in each frame:
//   node scripts/place-eyes.mjs
// A stick is a 1x2 column at the eye. Two sticks 6px apart are a face turned to the viewer, one
// is a profile looking west. Anything else (eyes smeared mid-turn) is copied as is, so it reads
// as a blink in every layer. Writes public/characters/paper-doll/eyes/<eyes>/ with the same layout.
import { join, relative, sep } from 'node:path';
import { pngs, readPng, writePng } from './png.mjs';

const EYES_DIR = join(import.meta.dirname, '../public/characters/paper-doll/eyes');
const STICKS_DIR = join(EYES_DIR, 'sticks');

const COLORS = { e: [30, 30, 29, 255], w: [255, 255, 255, 255] };

/**
 * Each eye as rows of pixels; `o` is the stick's top pixel, it is drawn too unless the row says
 * otherwise (`.` leaves it empty). The left eye of a front face uses `left`; the right eye and
 * the profile use `right`, which leans toward the nose.
 */
const STAMPS = {
  big: {
    left: ['we', 'oe', 'ee'],
    right: ['we', 'eo', 'ee'],
  },
  sleepy: {
    left: ['eoe', '.ee'],
    right: ['eoe', 'ee.'],
  },
  happy: {
    left: ['.o.', 'e.e'],
    right: ['.o.', 'e.e'],
  },
};

/** Pixels of `stamp` placed so that its `o` lands on (x, y). */
function* stampPixels(stamp, x, y) {
  const oy = stamp.findIndex(row => row.includes('o'));
  const ox = stamp[oy].indexOf('o');
  for (const [dy, row] of stamp.entries()) {
    for (const [dx, char] of [...row].entries()) {
      if (char === '.') continue;
      yield [x + dx - ox, y + dy - oy, COLORS[char === 'o' ? 'e' : char]];
    }
  }
}

/** Top pixels of the sticks in a layer, left to right; null if its eyes are not sticks. */
function findSticks({ width, height, pixels }) {
  const opaque = (x, y) => y < height && pixels[(y * width + x) * 4 + 3] > 0;
  const tops = [];
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      count++;
      if (!opaque(x, y - 1) && opaque(x, y + 1) && !opaque(x, y + 2)) tops.push([x, y]);
    }
  }
  if (count !== tops.length * 2) return null;
  const isFront = tops.length === 2 && tops[1][0] - tops[0][0] === 6 && tops[0][1] === tops[1][1];
  return isFront || tops.length === 1 ? tops : null;
}

for (const path of pngs(STICKS_DIR)) {
  const frame = relative(STICKS_DIR, path);
  // reference.png sits next to the animation folders and is drawn by hand
  if (!frame.includes(sep)) continue;
  const sticks = readPng(path);
  const tops = findSticks(sticks);
  for (const [eyes, stamps] of Object.entries(STAMPS)) {
    let layer = sticks;
    if (tops) {
      layer = { ...sticks, pixels: Buffer.alloc(sticks.pixels.length) };
      const sides = tops.length === 2 ? [stamps.left, stamps.right] : [stamps.right];
      tops.forEach(([x, y], i) => {
        for (const [px, py, color] of stampPixels(sides[i], x, y)) {
          layer.pixels.set(color, (py * sticks.width + px) * 4);
        }
      });
    }
    writePng(join(EYES_DIR, eyes, frame), layer);
  }
  console.log(`${frame}: ${tops ? `${tops.length} eye(s)` : 'copied'}`);
}
