/**
 * Face stamps of the paper doll and how they are drawn on a body frame. The app and the asset
 * scripts (scripts/doll) both use this file, so it imports nothing.
 *
 * Every face part is a layer of base.aseprite ("facial-features" group) drawn over the doll's
 * rotations, exported as a strip of two 128x128 frames, one PNG per part
 * (src/doll/face/<eyes|brows|mouths>/<name>.png): front over the south rotation, then profile
 * over the east one. Eyes don't blink yet: every part has one state. A stamp is a
 * frame's pixels relative to that rotation's anchors (face-anchors.json): eyes and brows to the
 * eye anchors, the front ones split between the two eyes by the face axis, mouths to the mouth
 * anchor. Drawn on any frame, a stamp hangs off that frame's anchors; a west profile is the east
 * one mirrored about the anchor. Face pixels land only on the body's skin, never on the outline.
 */

export const PART_KINDS = ['eyes', 'brows', 'mouths'] as const;
export type PartKind = typeof PART_KINDS[number];

/** Frames of a strip are rotation-sized. */
export const STAMP_SIZE = 128;

/** A stamp pixel: offset from its anchor and RGB. */
export interface Pixel {
  dx: number;
  dy: number;
  rgb: [number, number, number];
}

/** One face part in one blink state. */
export interface Stamp {
  /** Per anchor: the two eyes, or the mouth. */
  front: Pixel[][];
  /** East, from the profile's one anchor. */
  profile: Pixel[];
}

/** Every part by kind and name; eyes have a stamp per blink state, other parts one. */
export type Stamps = Record<PartKind, Record<string, Stamp[]>>;

export interface Face {
  eyes: string;
  brows: string;
  mouth: string;
}

/** Eyes open, half-closed, closed. */
export type BlinkState = 0 | 1 | 2;

/** [x, y] in the frame canvas. */
export type Point = number[];

export interface Anchors {
  /** Two for a front or three-quarter face, one for a profile. */
  eyes: Point[];
  mouth: Point;
}

/** RGBA pixels, like ImageData. */
export interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

/** The opaque pixels of strip frame `k`, as offsets from the frame's top-left corner. */
function framePixels(strip: Bitmap, k: number): Pixel[] {
  const px: Pixel[] = [];
  for (let y = 0; y < strip.height; y++) {
    for (let x = 0; x < STAMP_SIZE; x++) {
      const i = (y * strip.width + k * STAMP_SIZE + x) * 4;
      if (!strip.data[i + 3]) continue;
      px.push({ dx: x, dy: y, rgb: [strip.data[i]!, strip.data[i + 1]!, strip.data[i + 2]!] });
    }
  }
  return px;
}

const relative = (px: Pixel[], [ax = 0, ay = 0]: Point) => (
  px.map(p => ({ ...p, dx: p.dx - ax, dy: p.dy - ay }))
);

/**
 * Stamps of one part from its strip. `front` and `profile` are the anchors of the south and east
 * rotations, the ones the strip is drawn over. Front eyes and brows left of the face axis (the
 * mouth anchor) belong to the left eye.
 */
export function partStamps(
  kind: PartKind,
  strip: Bitmap,
  front: Anchors,
  profile: Anchors,
): Stamp[] {
  if (strip.width !== 2 * STAMP_SIZE) throw new Error(`a ${kind} strip is ${strip.width}px wide`);
  const states = 1;
  const axis = front.mouth[0] ?? 0;
  const [left = [], right = []] = front.eyes;
  return Array.from({ length: states }, (_, s) => {
    const px = framePixels(strip, s);
    return {
      front: kind === 'mouths'
        ? [relative(px, front.mouth)]
        : [
          relative(px.filter(p => p.dx <= axis), left),
          relative(px.filter(p => p.dx > axis), right),
        ],
      profile: relative(
        framePixels(strip, states + s),
        kind === 'mouths' ? profile.mouth : profile.eyes[0] ?? [],
      ),
    };
  });
}

/** Darker body pixels are the outline: the face never draws on them. */
const OUTLINE = 60;

/**
 * Draws stamp pixels at the anchor into `out`, only where `body` has skin. A west profile is the
 * east one mirrored about the anchor.
 */
export function drawPixels(
  out: Bitmap,
  body: Bitmap,
  px: Pixel[],
  anchor: Point,
  mirrored = false,
) {
  const { width, height, data } = body;
  const [ax = 0, ay = 0] = anchor;
  for (const { dx, dy, rgb } of px) {
    const x = mirrored ? ax + 1 - dx : ax + dx;
    const y = ay + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = (y * width + x) * 4;
    if (!data[i + 3] || (data[i]! + data[i + 1]! + data[i + 2]!) / 3 < OUTLINE) continue;
    out.data.set([...rgb, 255], i);
  }
}

/** Stamps a face on `out` by the anchors of `body`: brows, then eyes, then the mouth. */
export function drawFace(
  out: Bitmap,
  body: Bitmap,
  anchors: Anchors,
  mirrored: boolean,
  stamps: Stamps,
  face: Partial<Face>,
  blink: BlinkState = 0,
) {
  const eyes = face.eyes ? stamps.eyes[face.eyes] : undefined;
  const parts = [
    face.brows ? stamps.brows[face.brows]?.[0] : undefined,
    eyes?.[blink] ?? eyes?.[0],
    face.mouth ? stamps.mouths[face.mouth]?.[0] : undefined,
  ];
  const [left, right] = anchors.eyes;
  parts.forEach((stamp, i) => {
    if (!stamp || !left) return;
    const mouth = i === 2;
    if (right) {
      stamp.front.forEach((px, k) => {
        drawPixels(out, body, px, mouth ? anchors.mouth : [left, right][k]!);
      });
    } else {
      drawPixels(out, body, stamp.profile, mouth ? anchors.mouth : left, mirrored);
    }
  });
}
