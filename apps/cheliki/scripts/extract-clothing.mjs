// Cuts a clothing layer out of PixelLab frames of the dressed paper doll:
//   node scripts/extract-clothing.mjs <dressed-dir> <clothing>
// <dressed-dir> mirrors the body's animations folder (walk-loop/west/frame_000.png, ...);
// the clothing must be drawn bright green so it can be told apart from the body.
// Writes public/characters/paper-doll/clothes/<clothing>/ with the same layout. Each layer keeps
// only the clothing pixels, snapped to the tone markers that src/clothing.ts recolors.
import { join, relative } from 'node:path';
import { pngs, readPng, writePng } from './png.mjs';

const ROOT = join(import.meta.dirname, '..');
const BODY_DIR = join(ROOT, 'public/characters/paper-doll/Idle/animations');

// Tone markers; keep in sync with src/clothing.ts
const LIGHT = [255, 255, 255];
const MID = [170, 170, 170];
const SHADOW = [85, 85, 85];
const OUTLINE = [0, 0, 0];

const isGreen = (r, g, b) => g > r + 25 && g > b + 15;
const isDark = (r, g, b) => r + g + b < 120;
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Snaps a green clothing pixel to its tone by brightness. */
function tone(g) {
  if (g > 170) return LIGHT;
  if (g > 100) return MID;
  return SHADOW;
}

function extract(body, dressed) {
  const { width, height } = body;
  const layer = { width, height, pixels: Buffer.alloc(body.pixels.length) };
  const at = (x, y) => (y * width + x) * 4;
  const greenAt = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const i = at(x, y);
    return isGreen(dressed.pixels[i], dressed.pixels[i + 1], dressed.pixels[i + 2]);
  };
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      const [r, g, b, a] = dressed.pixels.subarray(i, i + 4);
      if (a < 128) continue;
      let color = null;
      if (isGreen(r, g, b)) color = tone(g);
      // The clothing's own outline: dark pixels touching it
      else if (isDark(r, g, b) && NEIGHBORS.some(([dx, dy]) => greenAt(x + dx, y + dy))) {
        color = OUTLINE;
      }
      if (!color) continue;
      layer.pixels.set([...color, 255], i);
      count++;
    }
  }
  return { layer, count };
}

const [dressedDir, clothing] = process.argv.slice(2);
if (!dressedDir || !clothing) {
  console.error('usage: node scripts/extract-clothing.mjs <dressed-dir> <clothing>');
  process.exit(1);
}
const outDir = join(ROOT, 'public/characters/paper-doll/clothes', clothing);
for (const path of pngs(dressedDir)) {
  const frame = relative(dressedDir, path);
  const body = readPng(join(BODY_DIR, frame));
  const dressed = readPng(path);
  if (body.width !== dressed.width || body.height !== dressed.height) {
    throw new Error(`${frame}: size differs from the body frame`);
  }
  const { layer, count } = extract(body, dressed);
  writePng(join(outDir, frame), layer);
  console.log(`${frame}: ${count} px`);
}
