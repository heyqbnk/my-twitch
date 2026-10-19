import anchorsJson from './face-anchors.json';
import { bodyUrl, type Frame } from './paperDoll';
import {
  drawFace,
  partStamps,
  PART_KINDS,
  type Anchors,
  type BlinkState,
  type Face,
  type PartKind,
  type Stamps,
} from './stamps';

// face-anchors.json and the face/ strips both come from base.aseprite through
// `pnpm doll` (scripts/doll).

export type { BlinkState, Face } from './stamps';

export const ANCHORS: Record<string, Anchors> = anchorsJson;

/** Strip URLs by kind and part name. */
const STRIPS = Object.fromEntries(PART_KINDS.map(kind => [kind, {}])) as (
  Record<PartKind, Record<string, string>>
);
const urls = import.meta.glob<string>('./face/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
for (const [path, url] of Object.entries(urls)) {
  const [, kind, name] = /^\.\/face\/(\w+)\/(.+)\.png$/.exec(path)!;
  STRIPS[kind as PartKind][name!] = url;
}

export const EYES = Object.keys(STRIPS.eyes);
export const BROWS = Object.keys(STRIPS.brows);
export const MOUTHS = Object.keys(STRIPS.mouths);

function loadPixels(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Can't load ${src}`));
    img.src = src;
  });
}

let stamps: Promise<Stamps> | undefined;

/** Every face part, loaded once. */
export function loadStamps(): Promise<Stamps> {
  stamps ??= Promise.all(PART_KINDS.map(async kind => {
    const parts = await Promise.all(Object.entries(STRIPS[kind]).map(async ([name, url]) => {
      const strip = await loadPixels(url);
      return [name, partStamps(kind, strip, ANCHORS['rotations/south.png']!, ANCHORS['rotations/east.png']!)];
    }));
    return [kind, Object.fromEntries(parts)];
  })).then(kinds => Object.fromEntries(kinds) as Stamps);
  return stamps;
}

/** The body frame with the face stamped on it. */
export function withFace(
  body: ImageData,
  frame: Frame,
  faceStamps: Stamps,
  face: Face,
  blink: BlinkState,
): ImageData {
  const anchors = ANCHORS[frame.src];
  const out = new ImageData(new Uint8ClampedArray(body.data), body.width, body.height);
  if (anchors) drawFace(out, body, anchors, frame.facing === 'west', faceStamps, face, blink);
  return out;
}

const bodies = new Map<string, Promise<ImageData>>();

/** The body frame's pixels, loaded once. */
export function loadBody(frame: Frame): Promise<ImageData> {
  let body = bodies.get(frame.src);
  if (!body) {
    body = loadPixels(bodyUrl(frame));
    bodies.set(frame.src, body);
  }
  return body;
}
