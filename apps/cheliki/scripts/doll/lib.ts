/** Shared paths and helpers of the paper doll asset scripts. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { Anchors, Bitmap } from '../../src/doll/stamps.ts';

export const APP = resolve(import.meta.dirname, '../..');
export const DOLL = join(APP, 'public/characters/paper-doll-128');
export const IDLE = join(DOLL, 'Idle');
export const BASE_ASEPRITE = join(DOLL, 'base.aseprite');
// The app imports it, so it lives in src/ (Vite doesn't import from public/)
export const ANCHORS_JSON = join(APP, 'src/doll/face-anchors.json');
export const LUA = join(import.meta.dirname, 'aseprite');

/**
 * Animations of base.aseprite: tag, first frame, frame count and where the aseprite canvas
 * (128x128, the rotation) sits on the animation's own frame canvas.
 */
const TAGS: [string, number, number, [number, number]][] = [
  ['south-turn-walk/east', 1, 8, [16, 15]],
  ['walk-loop/east', 9, 8, [16, 15]],
  ['stop-turn-south/east', 17, 8, [0, 16]],
  ['south-turn-walk/west', 25, 8, [16, 16]],
  ['walk-loop/west', 33, 8, [16, 16]],
  ['stop-turn-south/west', 41, 8, [0, 16]],
  ['breathing-idle/south', 49, 4, [0, 0]],
];

/** A frame's path relative to Idle/, as used in face-anchors.json. */
export const framePath = (tag: string, k: number) => (
  `animations/${tag}/frame_${String(k).padStart(3, '0')}.png`
);

export interface TagFrame {
  /** Path relative to Idle/. */
  rel: string;
  /** Aseprite frame number. */
  frame: number;
  /** Where the aseprite canvas sits on the frame canvas. */
  offset: [number, number];
}

/** Every tagged frame of base.aseprite. */
export const tagFrames = (): TagFrame[] => TAGS.flatMap(([tag, first, count, offset]) => (
  Array.from({ length: count }, (_, k) => ({ rel: framePath(tag, k), frame: first + k, offset }))
));

export const isWest = (rel: string) => rel.includes('/west') || rel.endsWith('west.png');

export type AnchorsFile = Record<string, Anchors>;

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

/** Like Python's json.dumps: a space after commas and colons. */
const spaced = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(spaced).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${spaced(v)}`)
      .join(', ')}}`;
  }
  return JSON.stringify(value);
};

/** One entry per line, sorted: small diffs when a few frames change. */
export function writeJsonLines(path: string, data: Record<string, unknown>) {
  const lines = Object.keys(data).sort()
    .map(key => `  ${JSON.stringify(key)}: ${spaced(data[key])}`);
  writeFileSync(path, `{\n${lines.join(',\n')}\n}\n`);
}

export interface Image extends Bitmap {
  data: Buffer;
}

export const blank = (width: number, height: number): Image => (
  { width, height, data: Buffer.alloc(width * height * 4) }
);

export const copy = (img: Image): Image => ({ ...img, data: Buffer.from(img.data) });

export const same = (a: Image, b: Image) => (
  a.width === b.width && a.height === b.height && a.data.equals(b.data)
);

export function load(path: string): Image {
  const { width, height, data } = PNG.sync.read(readFileSync(path));
  return { width, height, data };
}

export function save(img: Image, path: string) {
  const png = new PNG({ width: img.width, height: img.height });
  img.data.copy(png.data);
  writeFileSync(path, PNG.sync.write(png));
}

/** Copies the opaque pixels of `src` onto `dst` at (x, y). */
export function paste(dst: Image, src: Image, x: number, y: number) {
  for (let sy = 0; sy < src.height; sy++) {
    for (let sx = 0; sx < src.width; sx++) {
      const dx = x + sx;
      const dy = y + sy;
      const i = (sy * src.width + sx) * 4;
      if (!src.data[i + 3] || dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      src.data.copy(dst.data, (dy * dst.width + dx) * 4, i, i + 4);
    }
  }
}

export const tempDir = () => mkdtempSync(join(tmpdir(), 'doll-'));

const STEAM = 'C:/Program Files (x86)/Steam';

/** Steam library folders: the default one and those listed in its libraryfolders.vdf. */
function steamLibraries(): string[] {
  try {
    const vdf = readFileSync(join(STEAM, 'steamapps/libraryfolders.vdf'), 'utf8');
    return [...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map(([, path]) => path!.replaceAll('\\\\', '\\'));
  } catch {
    return [STEAM];
  }
}

/** `ASEPRITE`, else the Steam or standalone install on Windows, else `aseprite` from PATH. */
function asepriteExe(): string {
  if (process.env.ASEPRITE) return process.env.ASEPRITE;
  if (process.platform !== 'win32') return 'aseprite';
  const candidates = [
    ...steamLibraries().map(lib => join(lib, 'steamapps/common/Aseprite/Aseprite.exe')),
    'C:/Program Files/Aseprite/Aseprite.exe',
  ];
  return candidates.find(path => existsSync(path)) ?? 'aseprite';
}

/** Runs Aseprite in batch mode; `ASEPRITE` overrides the executable. */
export function aseprite(args: string[], script: string, params: Record<string, string> = {}) {
  const cmd = ['-b', ...args];
  for (const [key, value] of Object.entries(params)) cmd.push('--script-param', `${key}=${value}`);
  cmd.push('--script', join(LUA, script));
  let out: string;
  try {
    out = execFileSync(asepriteExe(), cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    console.error("Can't find Aseprite: set ASEPRITE to its executable, e.g. ASEPRITE=\"D:/Aseprite/Aseprite.exe\"");
    process.exit(1);
  }
  // Some Aseprite extensions print errors in batch mode; they don't affect the result
  return out.split('\n').filter(line => !/[\\/]extensions[\\/]/.test(line))
    .join('\n');
}

export interface Cel {
  img: Image;
  x: number;
  y: number;
}

/** The cels of `layer` (all layers if not given) by frame number. */
export function exportCels(sprite: string, layer?: string): Map<number, Cel> {
  const dir = tempDir();
  aseprite([sprite], 'export_cels.lua', layer ? { out: dir, layer } : { out: dir });
  const cels = new Map<number, Cel>();
  for (const line of readFileSync(join(dir, 'cels.txt'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [f = 0, x = 0, y = 0] = line.split(' ').map(Number);
    cels.set(f, { img: load(join(dir, `${f}.png`)), x, y });
  }
  return cels;
}
