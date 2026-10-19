/**
 * Draws breathing-idle from the south rotation; no PixelLab generation.
 *
 * Frame 0 is the rotation, frame 1 lifts everything above the belly by 1px (repeating the row
 * under the cut, so the torso stretches), frame 2 also lifts everything above the chest by 1px,
 * frame 3 repeats frame 1. The head moves with the lifts, so the face anchors of these frames are
 * the south ones lifted by 0, 1, 2, 1 px.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { copy, IDLE, load, same, save, type Image } from './lib.ts';

/** First row that stays put in each lift. */
const BELLY = 66;
const CHEST = 54;

/** Rows above `cut` move up by 1px; row cut - 1 is repeated to fill the gap. */
function lift(img: Image, cut: number): Image {
  const out = copy(img);
  const row = img.width * 4;
  img.data.copy(out.data, 0, row, cut * row);
  img.data.copy(out.data, (cut - 1) * row, (cut - 1) * row, cut * row);
  return out;
}

export function breathing() {
  const south = load(join(IDLE, 'rotations/south.png'));
  const f1 = lift(south, BELLY);
  const f2 = lift(f1, CHEST - 1);
  const dir = join(IDLE, 'animations/breathing-idle/south');
  mkdirSync(dir, { recursive: true });
  [south, f1, f2, f1].forEach((frame, i) => {
    const path = join(dir, `frame_${String(i).padStart(3, '0')}.png`);
    let old: Image | undefined;
    try {
      old = load(path);
    } catch {
      // a new frame
    }
    if (old && same(old, frame)) return;
    console.log('changed', path);
    save(frame, path);
  });
}
