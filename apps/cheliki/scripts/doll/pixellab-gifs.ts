/**
 * Packs the body animations into GIFs laid out like their PixelLab canvases, for save_to_asset.
 *
 * PixelLab character "Paper doll (male, 4-dir, 128px)" 0849f3ec-0676-4b70-9035-f839e5ab11f3 keeps
 * walk-loop as 9 frames (the 9th repeats frame 0) and its west direction on a 160x164 canvas with
 * our frames at (0, 2). The GIFs get an exact palette, and every frame is decoded back and
 * compared.
 *
 * Upload each GIF (get_upload_url + curl) and save it with
 * save_to_asset(image="upload:<id>", target="character:<id>:<direction>:<group id>"); rotations go
 * as plain PNGs to "character:<id>:<direction>".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GifReader, GifWriter } from 'omggif';
import { blank, IDLE, load, paste, type Image } from './lib.ts';

const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7];

/** Name, animation, frames, PixelLab canvas, where our frame sits on it. */
const JOBS: [string, string, number[], [number, number], [number, number]][] = [
  ['stop-turn-south-west', 'stop-turn-south/west', EIGHT, [128, 160], [0, 0]],
  ['stop-turn-south-east', 'stop-turn-south/east', EIGHT, [128, 160], [0, 0]],
  ['south-turn-walk-west', 'south-turn-walk/west', EIGHT, [160, 160], [0, 0]],
  ['south-turn-walk-east', 'south-turn-walk/east', EIGHT, [160, 160], [0, 0]],
  ['walk-loop-west', 'walk-loop/west', [...EIGHT, 0], [160, 164], [0, 2]],
  ['walk-loop-east', 'walk-loop/east', [...EIGHT, 0], [160, 160], [0, 0]],
];

/** Writes the frames as a GIF; returns its color count. Index 0 is transparent. */
function pack(frames: Image[], path: string): number {
  const { width, height } = frames[0]!;
  const colors = new Map<number, number>();
  for (const { data } of frames) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0 && data[i + 3] !== 255) throw new Error(`${path}: partial alpha`);
      const rgb = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      if (data[i + 3] && !colors.has(rgb)) colors.set(rgb, colors.size + 1);
    }
  }
  if (colors.size > 255) throw new Error(`${path}: ${colors.size} colors`);
  const palette = [0, ...colors.keys()];
  // GIF palettes have a power of two entries
  while (palette.length & (palette.length - 1) || palette.length < 2) palette.push(0);
  const buf = Buffer.alloc(1024 + frames.length * width * height * 2);
  const gif = new GifWriter(buf, width, height, { palette, loop: 0 });
  for (const { data } of frames) {
    const indexed: number[] = new Array<number>(width * height);
    for (let p = 0; p < indexed.length; p++) {
      const i = p * 4;
      const rgb = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      indexed[p] = data[i + 3] ? colors.get(rgb)! : 0;
    }
    gif.addFrame(0, 0, width, height, indexed, { delay: 10, disposal: 2, transparent: 0 });
  }
  const bytes = buf.subarray(0, gif.end());
  const reader = new GifReader(bytes);
  frames.forEach(({ data }, k) => {
    const back = new Uint8Array(width * height * 4);
    reader.decodeAndBlitFrameRGBA(k, back);
    for (let i = 0; i < data.length; i += 4) {
      const differs = back[i + 3] !== data[i + 3]
        || (data[i + 3] && [0, 1, 2].some(c => back[i + c] !== data[i + c]));
      if (differs) throw new Error(`${path}: frame ${k} differs`);
    }
  });
  writeFileSync(path, bytes);
  return colors.size;
}

export function pixellabGifs(out: string) {
  mkdirSync(out, { recursive: true });
  for (const [name, animation, indices, [width, height], [x, y]] of JOBS) {
    const frames = indices.map(i => {
      const canvas = blank(width, height);
      paste(canvas, load(join(IDLE, `animations/${animation}/frame_${String(i).padStart(3, '0')}.png`)), x, y);
      return canvas;
    });
    console.log(name, `${width}x${height}`, frames.length, 'frames', pack(frames, join(out, `${name}.gif`)), 'colors');
  }
}
