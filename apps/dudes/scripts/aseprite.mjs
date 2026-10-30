// Minimal Aseprite (.aseprite/.ase) reader: layers, tags with user data, frame durations and cel pixels.
// Format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const LAYER_VISIBLE = 1;
const LAYER_REFERENCE = 64;
const LAYER_GROUP = 1;

const CHUNK_LAYER = 0x2004;
const CHUNK_CEL = 0x2005;
const CHUNK_TAGS = 0x2018;
const CHUNK_PALETTE = 0x2019;
const CHUNK_USER_DATA = 0x2020;

const string = (buf, at) => buf.toString('utf8', at + 2, at + 2 + buf.readUInt16LE(at));

// Reads the file. image(layer, frame) returns the layer's pixels in the frame as canvas-sized RGBA
// (Uint8Array, 4 bytes per pixel) or null when the frame has no cel on that layer
export function readAseprite(path) {
  const buf = readFileSync(path);
  if (buf.readUInt16LE(4) !== 0xa5e0) throw new Error(`${path}: not an Aseprite file`);
  const frameCount = buf.readUInt16LE(6);
  const width = buf.readUInt16LE(8);
  const height = buf.readUInt16LE(10);
  const depth = buf.readUInt16LE(12);
  const transparentIndex = buf[28];
  const layers = [];
  const tags = [];
  const frames = [];
  const palette = [];
  // Parents of the current layer by child level
  const parents = [];
  // A user data chunk describes the previous chunk's object; right after a tags chunk — each tag in turn
  let userDataOf = null;
  let tagsAwaitingUserData = [];

  let pos = 128;
  for (let f = 0; f < frameCount; f++) {
    const frameSize = buf.readUInt32LE(pos);
    const chunkCount = buf.readUInt32LE(pos + 12) || buf.readUInt16LE(pos + 6);
    const cels = new Map();
    frames.push({ duration: buf.readUInt16LE(pos + 8), cels });
    let at = pos + 16;
    for (let i = 0; i < chunkCount; i++) {
      const size = buf.readUInt32LE(at);
      const type = buf.readUInt16LE(at + 4);
      const data = buf.subarray(at + 6, at + size);
      if (type !== CHUNK_USER_DATA) tagsAwaitingUserData = [];
      if (type === CHUNK_LAYER) {
        const flags = data.readUInt16LE(0);
        const level = data.readUInt16LE(4);
        const layer = {
          name: string(data, 16),
          group: data.readUInt16LE(2) === LAYER_GROUP,
          visible: Boolean(flags & LAYER_VISIBLE),
          reference: Boolean(flags & LAYER_REFERENCE),
          parent: level ? parents[level - 1] : -1,
        };
        parents[level] = layers.length;
        layers.push(layer);
        userDataOf = layer;
      } else if (type === CHUNK_CEL) {
        const layer = data.readUInt16LE(0);
        const x = data.readInt16LE(2);
        const y = data.readInt16LE(4);
        const celType = data.readUInt16LE(7);
        let cel;
        if (celType === 1) cel = frames[data.readUInt16LE(16)].cels.get(layer);
        else if (celType === 0 || celType === 2) {
          const pixels = data.subarray(20);
          cel = {
            x,
            y,
            w: data.readUInt16LE(16),
            h: data.readUInt16LE(18),
            pixels: celType === 2 ? inflateSync(pixels) : pixels,
          };
        } else throw new Error(`${path}: tilemap cels are not supported`);
        cels.set(layer, cel);
        userDataOf = cel;
      } else if (type === CHUNK_TAGS) {
        let tagAt = 10;
        for (let t = data.readUInt16LE(0); t > 0; t--) {
          const name = string(data, tagAt + 17);
          tags.push({ name, from: data.readUInt16LE(tagAt), to: data.readUInt16LE(tagAt + 2), userData: '' });
          tagAt += 17 + 2 + Buffer.byteLength(name);
        }
        tagsAwaitingUserData = tags.slice(-data.readUInt16LE(0));
      } else if (type === CHUNK_PALETTE) {
        const first = data.readUInt32LE(4);
        let entryAt = 20;
        for (let index = first; index <= data.readUInt32LE(8); index++) {
          const flags = data.readUInt16LE(entryAt);
          palette[index] = [...data.subarray(entryAt + 2, entryAt + 6)];
          entryAt += 6 + (flags & 1 ? 2 + data.readUInt16LE(entryAt + 6) : 0);
        }
      } else if (type === CHUNK_USER_DATA) {
        const text = data.readUInt32LE(0) & 1 ? string(data, 4) : '';
        const target = tagsAwaitingUserData.shift() ?? userDataOf;
        if (target) target.userData = text;
      }
      at += size;
    }
    pos += frameSize;
  }

  // RGBA of pixel i of a cel
  const rgba = (pixels, i) => {
    if (depth === 32) return pixels.subarray(i * 4, i * 4 + 4);
    if (depth === 16) return [pixels[i * 2], pixels[i * 2], pixels[i * 2], pixels[i * 2 + 1]];
    const index = pixels[i];
    return index === transparentIndex ? [0, 0, 0, 0] : palette[index] ?? [0, 0, 0, 0];
  };

  return {
    width,
    height,
    layers,
    tags,
    frames: frames.map(({ duration }) => ({ duration })),
    image(layer, frame) {
      const cel = frames[frame].cels.get(layer);
      if (!cel) return null;
      const out = new Uint8Array(width * height * 4);
      for (let y = Math.max(0, -cel.y); y < cel.h && cel.y + y < height; y++) {
        for (let x = Math.max(0, -cel.x); x < cel.w && cel.x + x < width; x++) {
          out.set(rgba(cel.pixels, y * cel.w + x), ((cel.y + y) * width + cel.x + x) * 4);
        }
      }
      return out;
    },
  };
}
