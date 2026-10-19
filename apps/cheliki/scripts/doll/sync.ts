/**
 * Moves the doll between base.aseprite and the files the app uses.
 *
 * base.aseprite holds one 128x128 canvas; each tag is an animation direction whose frames sit on
 * their own canvas at the offset in TAGS (lib.ts). There are no rotations in it: south is
 * breathing-idle frame 0, east and west exist only as Idle/rotations/*.png.
 *
 * The "anchors" layer has one pixel per anchor: magenta #ff00ff on an eye, cyan #00ffff on the
 * mouth. Move them and run `anchors`; "face preview" (locked) shows the face they give.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawFace, partStamps, PART_KINDS, type Anchors, type Stamps } from '../../src/doll/stamps.ts';
import {
  ANCHORS_JSON,
  APP,
  aseprite,
  BASE_ASEPRITE,
  blank,
  copy,
  exportCels,
  IDLE,
  isWest,
  load,
  paste,
  readJson,
  same,
  save,
  tagFrames,
  tempDir,
  writeJsonLines,
  type AnchorsFile,
  type Image,
} from './lib.ts';

const EYE_MARK = [255, 0, 255];
const MOUTH_MARK = [0, 255, 255];
const FACE_STRIPS = join(APP, 'src/doll/face');

/** The face parts from their strips in src/doll/face. */
export function loadStamps(anchors: AnchorsFile): Stamps {
  const stamps = {} as Stamps;
  for (const kind of PART_KINDS) {
    stamps[kind] = {};
    for (const file of readdirSync(join(FACE_STRIPS, kind)).filter(f => f.endsWith('.png'))) {
      const strip = load(join(FACE_STRIPS, kind, file));
      stamps[kind][file.slice(0, -4)] = partStamps(kind, strip, anchors['rotations/south.png']!, anchors['rotations/east.png']!);
    }
  }
  return stamps;
}

/** Body frames retouched in base.aseprite -> Idle/. */
export function frames() {
  const cels = exportCels(BASE_ASEPRITE, 'animations');
  let changed = 0;
  for (const { rel, frame, offset } of tagFrames()) {
    const old = load(join(IDLE, rel));
    const img = blank(old.width, old.height);
    const cel = cels.get(frame);
    if (cel) paste(img, cel.img, cel.x + offset[0], cel.y + offset[1]);
    if (!same(img, old)) {
      changed++;
      console.log('changed', rel);
      save(img, join(IDLE, rel));
    }
  }
  const south = load(join(IDLE, 'animations/breathing-idle/south/frame_000.png'));
  if (!same(south, load(join(IDLE, 'rotations/south.png')))) {
    console.log('changed rotations/south.png');
    save(south, join(IDLE, 'rotations/south.png'));
  }
  console.log(changed, 'animation frames changed');
}

/** Rebuilds the "face preview" and "anchors" layers of base.aseprite from face-anchors.json. */
export function layers() {
  const anchors = readJson<AnchorsFile>(ANCHORS_JSON);
  const stamps = loadStamps(anchors);
  const dir = tempDir();
  const lines = [];
  for (const { rel, frame, offset } of tagFrames()) {
    const a = anchors[rel]!;
    const body = load(join(IDLE, rel));
    const img = copy(body);
    drawFace(img, body, a, isWest(rel), stamps, { eyes: 'open', brows: 'thin', mouth: 'smile' });
    // The face layer holds only what the stamps changed
    const face = blank(body.width, body.height);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data.subarray(i, i + 4).equals(body.data.subarray(i, i + 4))) continue;
      img.data.copy(face.data, i, i, i + 4);
    }
    const marks = blank(body.width, body.height);
    const mark = ([x = 0, y = 0]: number[], rgb: number[]) => (
      marks.data.set([...rgb, 255], (y * body.width + x) * 4)
    );
    for (const eye of a.eyes) mark(eye, EYE_MARK);
    mark(a.mouth, MOUTH_MARK);
    save(face, join(dir, `face-${frame}.png`));
    save(marks, join(dir, `marks-${frame}.png`));
    lines.push(`${frame} ${-offset[0]} ${-offset[1]}`);
  }
  writeFileSync(join(dir, 'list.txt'), `${lines.join('\n')}\n`);
  aseprite([BASE_ASEPRITE], 'add_layers.lua', { dir: dir.replaceAll('\\', '/') });
}

const isMark = (img: Image, i: number, rgb: number[]) => rgb.every((v, k) => img.data[i + k] === v);

/** The anchors layer by frame; exits listing the frames whose marks are off. */
function readAnchors(): AnchorsFile {
  const cels = exportCels(BASE_ASEPRITE, 'anchors');
  const found: AnchorsFile = {};
  const problems = [];
  for (const { rel, frame, offset: [ox, oy] } of tagFrames()) {
    const cel = cels.get(frame);
    if (!cel) {
      problems.push(`${rel}: no marks`);
      continue;
    }
    const eyes: number[][] = [];
    const mouth: number[][] = [];
    let other = 0;
    for (let y = 0; y < cel.img.height; y++) {
      for (let x = 0; x < cel.img.width; x++) {
        const i = (y * cel.img.width + x) * 4;
        if (!cel.img.data[i + 3]) continue;
        const at = [x + cel.x + ox, y + cel.y + oy];
        if (isMark(cel.img, i, EYE_MARK)) eyes.push(at);
        else if (isMark(cel.img, i, MOUTH_MARK)) mouth.push(at);
        else other++;
      }
    }
    if (![1, 2].includes(eyes.length) || mouth.length !== 1 || other) {
      problems.push(`${rel}: ${eyes.length} eye marks, ${mouth.length} mouth marks, ${other} other pixels`);
    }
    eyes.sort(([ax = 0, ay = 0], [bx = 0, by = 0]) => ax - bx || ay - by);
    found[rel] = { eyes, mouth: mouth[0]! } satisfies Anchors;
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  return found;
}

/** "anchors" layer -> face-anchors.json, then rebuilds the helper layers. */
export function anchors() {
  const data = readJson<AnchorsFile>(ANCHORS_JSON);
  for (const [rel, found] of Object.entries(readAnchors())) {
    if (JSON.stringify(found) !== JSON.stringify(data[rel])) {
      console.log(`${rel}: ${JSON.stringify(data[rel])} -> ${JSON.stringify(found)}`);
      data[rel] = found;
    }
  }
  data['rotations/south.png'] = data['animations/breathing-idle/south/frame_000.png']!;
  writeJsonLines(ANCHORS_JSON, data);
  layers();
  const back = readAnchors();
  if (tagFrames().some(({ rel }) => JSON.stringify(back[rel]) !== JSON.stringify(data[rel]))) {
    console.error('the rebuilt anchors layer reads back differently');
    process.exit(1);
  }
}
