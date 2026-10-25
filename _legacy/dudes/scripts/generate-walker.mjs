// Walker sprite generator: node scripts/generate-walker.mjs src/scene/walkerSprite.ts [preview.svg]
// Pixels live in sprites/*.aseprite (how they are laid out — in README.md, section «Спрайты»); this script
// puts heads and accessories into body frames, outlines the figure, mirrors the side views and writes SVG paths.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readAseprite } from './aseprite.mjs';

const SPRITES = fileURLToPath(new URL('../sprites/', import.meta.url));

// Sprite pixels per scene pixel (?scale= units, the same pixel as doors, step and UI)
const RES = 1;
const W = 12;
const H = 22;
// Head canvas height in heads.aseprite (side view on the left, front view on the right)
const HEAD_H = 10;
// The neck starts at this row of the head: everything above it nods separately from the body
const NECK = 9;
// Automatic outline thickness
const OUTLINE = 1;
// Transparent gap between sheet frames: with a fractional scale the frame edge gets rounded,
// and without the gap a neighbouring frame bled through (e.g. the cigar tip)
const GAP = 1;
// The hand holding the sign pole in the standing frame (sideways or front): x — middle of the hand, y — its top
const HOLD_HAND = { x: 9.5, y: 12 };

// Writes the file only if its content changed: the generator runs on every dev server start,
// and a needless rewrite of walkerSprite.ts would trigger HMR
function write(path, content) {
  if (existsSync(path) && readFileSync(path).equals(Buffer.from(content))) return;
  writeFileSync(path, content);
}

// Colors are 'rrggbbaa' strings, a transparent pixel is null
const hex8 = ([r, g, b, a = 255]) => [r, g, b, a].map(v => v.toString(16).padStart(2, '0')).join('');
const rgbaOf = color => [0, 2, 4, 6].map(i => parseInt(color.slice(i, i + 2), 16));
const fillOf = color => {
  const [r, g, b, a] = rgbaOf(color);
  return a === 255 ? `#${color.slice(0, 6)}` : `rgb(${r} ${g} ${b} / ${+(a / 255).toFixed(2)})`;
};

// Key colors: pixels of these colors are repainted in the viewer's colors at runtime,
// shades additionally get a translucent black on top
const KEY = {
  shirt: hex8([59, 130, 246]),
  shirtShade: hex8([37, 99, 200]),
  hair: hex8([92, 58, 38]),
  pants: hex8([59, 74, 107]),
  pantsShade: hex8([41, 52, 78]),
  shoes: hex8([58, 38, 28]),
  shoesShade: hex8([40, 26, 19]),
  accessory: hex8([229, 57, 53]),
  accessoryShade: hex8([167, 42, 39]),
  accessoryHighlight: hex8([239, 136, 134]),
};
const KEYS = new Set(Object.values(KEY));
const OUTLINE_COLOR = hex8([27, 27, 36]);
// Fixed colors in the order of their SVG layers; colors drawn in the sprites but missing here go after them
const BODY_PALETTE = [
  OUTLINE_COLOR,
  // skin and skin in shadow (the far arm)
  hex8([242, 194, 155]),
  hex8([204, 156, 120]),
  // white: stripes, sneakers
  hex8([244, 244, 246]),
  // pink dress and the same in shadow
  hex8([240, 128, 180]),
  hex8([206, 88, 148]),
  // phone body, screen and its lighter spot
  hex8([44, 44, 54]),
  hex8([120, 200, 255]),
  hex8([205, 240, 255]),
];
// Robot for chat bots: the same body, but skin, legs and feet are metal (body pixels are recolored)
const ROBOT_METAL = {
  [BODY_PALETTE[1]]: hex8([184, 192, 204]),
  [BODY_PALETTE[2]]: hex8([128, 136, 150]),
  [KEY.pants]: hex8([104, 112, 128]),
  [KEY.pantsShade]: hex8([76, 82, 96]),
  [KEY.shoes]: hex8([52, 56, 68]),
  [KEY.shoesShade]: hex8([84, 90, 104]),
};
const ROBOT_PALETTE = [
  OUTLINE_COLOR,
  // metal, metal in shadow, dark metal (antenna rod, neck, bolt)
  hex8([184, 192, 204]),
  hex8([128, 136, 150]),
  hex8([84, 90, 104]),
  // visor, glowing eye, antenna light
  hex8([24, 32, 48]),
  hex8([94, 240, 255]),
  hex8([255, 82, 82]),
  ...BODY_PALETTE.slice(6),
  // legs, far leg, feet
  hex8([104, 112, 128]),
  hex8([76, 82, 96]),
  hex8([52, 56, 68]),
];
const ACC_PALETTE = [
  // outline and dark glass
  OUTLINE_COLOR,
  // pompom
  hex8([244, 244, 246]),
  // glare on glasses
  hex8([191, 227, 255]),
  // VR goggles: strap, body, front panel, light
  hex8([43, 43, 51]),
  hex8([228, 230, 238]),
  hex8([42, 48, 70]),
  hex8([94, 240, 255]),
  // cigar, its ember and smoke
  hex8([122, 74, 42]),
  hex8([255, 122, 42]),
  hex8([220, 220, 228, 190]),
  // gold of the crown and monocle, halo glow
  hex8([240, 192, 48]),
  hex8([255, 234, 128]),
];

// --- reading sprites ---
const fail = (file, message) => {
  throw new Error(`sprites/${file}: ${message}`);
};
// Region of a layer's frame as rows of colors
function gridOf(sprite, layer, frame, x0 = 0, w = sprite.width) {
  const image = layer < 0 ? null : sprite.image(layer, frame);
  return Array.from({ length: sprite.height }, (_, y) => Array.from({ length: w }, (_, x) => {
    const i = (y * sprite.width + x0 + x) * 4;
    return image?.[i + 3] ? hex8(image.subarray(i, i + 4)) : null;
  }));
}
const isEmpty = grid => grid.every(row => row.every(c => !c));
// Layers that make it into the sprite: reference layers are only a drawing aid
const layersOf = (sprite, parent = -1) => sprite.layers
  .map((layer, index) => ({ ...layer, index }))
  .filter(layer => layer.parent === parent && !layer.reference);
function layerOf(sprite, file, name, parent = -1) {
  const layer = layersOf(sprite, parent).find(l => l.name === name);
  if (!layer) fail(file, `no layer "${name}"`);
  return layer;
}
function tagOf(sprite, file, name) {
  const tag = sprite.tags.find(t => t.name === name);
  if (!tag) fail(file, `no tag "${name}"`);
  return tag;
}

// body.aseprite: a frame per unique pose, tagged by animation. The head goes to the "anchor" pixel,
// the naked "body" over it, "hand" (the raised arm, it covers accessories) over the body, then one whole garment
// of each clothes group; the first layer of a group is the base outfit, the others are stored as overlays over it
const bodySprite = readAseprite(`${SPRITES}body.aseprite`);
if (bodySprite.width !== W || bodySprite.height !== H) fail('body.aseprite', `canvas must be ${W}x${H}`);
const SLOTS = layersOf(bodySprite).filter(l => l.group)
  .map(l => l.name);
const clothesLayers = Object.fromEntries(SLOTS.map(slot => [
  slot,
  layersOf(bodySprite, layerOf(bodySprite, 'body.aseprite', slot).index).filter(l => !l.group),
]));
const BASE_OUTFIT = Object.fromEntries(SLOTS.map(slot => [slot, clothesLayers[slot][0].name]));
// Front view tags: the head faces the viewer
const FRONT_TAGS = new Set(['front', 'wave', 'front-hold', 'wave-hold']);
const bodyLayer = layerOf(bodySprite, 'body.aseprite', 'body').index;
const handLayer = layerOf(bodySprite, 'body.aseprite', 'hand').index;
const anchorLayer = layerOf(bodySprite, 'body.aseprite', 'anchor').index;
const frameCache = new Map();
// Frame i of the tag
function bodyFrame(tagName, i) {
  const tag = tagOf(bodySprite, 'body.aseprite', tagName);
  if (tag.from + i > tag.to) fail('body.aseprite', `tag "${tagName}" needs at least ${i + 1} frames`);
  const f = tag.from + i;
  if (frameCache.has(f)) return frameCache.get(f);
  const anchors = gridOf(bodySprite, anchorLayer, f).flatMap((row, y) => row.flatMap((c, x) => (c ? [{ x, y }] : [])));
  if (anchors.length !== 1) fail('body.aseprite', `frame ${f + 1}: the "anchor" layer must have exactly one pixel`);
  const frame = {
    front: FRONT_TAGS.has(tagName),
    anchor: anchors[0],
    body: gridOf(bodySprite, bodyLayer, f),
    hand: gridOf(bodySprite, handLayer, f),
    clothes: Object.fromEntries(SLOTS.map(slot => [
      slot,
      Object.fromEntries(clothesLayers[slot].map(l => [l.name, gridOf(bodySprite, l.index, f)])),
    ])),
  };
  frameCache.set(f, frame);
  return frame;
}

// heads.aseprite: a frame per hairstyle named by its tag, the "robot" tag is the bot's head
const headSprite = readAseprite(`${SPRITES}heads.aseprite`);
if (headSprite.width !== 2 * W || headSprite.height !== HEAD_H) fail('heads.aseprite', `canvas must be ${2 * W}x${HEAD_H}`);
const headLayers = layersOf(headSprite).filter(l => !l.group);
// Pixels of all non-reference layers, upper layers over lower ones
const flatten = (sprite, layers, frame, x0, w) => layers
  .map(l => gridOf(sprite, l.index, frame, x0, w))
  .reduce((bottom, top) => bottom.map((row, y) => row.map((c, x) => top[y][x] ?? c)));
const headOf = tag => ({
  side: flatten(headSprite, headLayers, tag.from, 0, W),
  front: flatten(headSprite, headLayers, tag.from, W, W),
});
const STYLE_NAMES = headSprite.tags.map(t => t.name).filter(name => name !== 'robot');
const HEADS = STYLE_NAMES.map(name => headOf(tagOf(headSprite, 'heads.aseprite', name)));
const ROBOT_HEAD = headOf(tagOf(headSprite, 'heads.aseprite', 'robot'));

// Sheet layout: rows are pose and direction, columns are [tag, frame of the tag]; mirror — the row flipped to face left
const walk = tag => [0, 1, 2, 3, 4].map(i => [tag, i]);
const phone = [['phone', 0], ['phone', 0], ['phone', 1], ['phone', 0], ['phone', 0]];
const LAYOUT = [
  { cells: walk('walk') },
  { cells: walk('walk'), mirror: true },
  { cells: walk('hold') },
  { cells: walk('hold'), mirror: true },
  { cells: [['front', 0], ['wave', 0], ['wave', 1], ['front', 0], ['front', 0]] },
  { cells: [['front-hold', 0], ['wave-hold', 0], ['wave-hold', 1], ['front-hold', 0], ['front-hold', 0]] },
  { cells: phone },
  { cells: phone, mirror: true },
].map(row => ({ ...row, frames: row.cells.map(([tag, i]) => bodyFrame(tag, i)) }));
const rows = LAYOUT.length;
const cols = LAYOUT[0].frames.length;
const sheetW = cols * W;
const sheetH = rows * H;

// --- composing ---
const blank = () => Array.from({ length: H }, () => Array(W).fill(null));
const over = (bottom, top) => bottom.map((row, y) => row.map((c, x) => top[y][x] ?? c));
// A grid in a full frame with its top-left corner at `at`
function place(grid, at) {
  const out = blank();
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (c && out[y + at.y]?.[x + at.x] !== undefined) out[y + at.y][x + at.x] = c;
  }));
  return out;
}
const mirror = g => g.map(r => [...r].reverse());
// Pixels on the 4 sides no farther than distance
const near = distance => Array.from(
  { length: distance },
  (_, i) => [[0, i + 1], [0, -i - 1], [i + 1, 0], [-i - 1, 0]],
).flat();
const AROUND = near(OUTLINE);
// Outline: a transparent pixel next to (on the 4 sides, no farther than OUTLINE) a painted one
const addOutline = g => g.map((row, y) => row.map((c, x) => (
  c ?? (AROUND.some(([dx, dy]) => g[y + dy]?.[x + dx]) ? OUTLINE_COLOR : null)
)));

// The sheet repeats frames (mirrored rows, standing columns), so each frame is dressed once per head and outfit
const dressedCache = new Map();
function dressedFrame(frame, head, outfit) {
  const key = SLOTS.map(slot => outfit[slot]).join(' ');
  const byHead = dressedCache.get(frame) ?? dressedCache.set(frame, new Map()).get(frame);
  const byOutfit = byHead.get(head) ?? byHead.set(head, new Map()).get(head);
  if (byOutfit.has(key)) return byOutfit.get(key);
  let g = over(over(place(frame.front ? head.front : head.side, frame.anchor), frame.body), frame.hand);
  for (const slot of SLOTS) g = over(g, frame.clothes[slot][outfit[slot]]);
  g = addOutline(g);
  byOutfit.set(key, g);
  return g;
}
const sheetOf = (head, outfit = BASE_OUTFIT) => LAYOUT.map(row => row.frames.map(frame => {
  const g = dressedFrame(frame, head, outfit);
  return row.mirror ? mirror(g) : g;
}));
const SHEETS = HEADS.map(head => sheetOf(head));
const ROBOT_SHEET = sheetOf(ROBOT_HEAD).map(row => row.map(g => g.map(r => r.map(c => ROBOT_METAL[c] ?? c))));

// accessories.aseprite: a frame per accessory named by its tag, drawn over the finished dude in tag order
// and placed like the head. The right half is the front view (empty — the same as the side view).
// "cut=N" in the tag's user data: a headwear hides the dude above row N of the head, otherwise hair would stick out
const accSprite = readAseprite(`${SPRITES}accessories.aseprite`);
if (accSprite.width !== 2 * W || accSprite.height !== H) fail('accessories.aseprite', `canvas must be ${2 * W}x${H}`);
const accLayers = layersOf(accSprite).filter(l => !l.group);
const ACC_NAMES = accSprite.tags.map(t => t.name);
// The raised arm waves in front of accessories: under it and its outline the accessory is erased
function underHand(g, hand) {
  return g.map((row, y) => row.map((c, x) => ([[0, 0], ...AROUND].some(([dx, dy]) => hand[y + dy]?.[x + dx]) ? null : c)));
}
const ACCESSORIES = Object.fromEntries(accSprite.tags.map(tag => {
  const side = flatten(accSprite, accLayers, tag.from, 0, W);
  const front = flatten(accSprite, accLayers, tag.from, W, W);
  const cut = tag.userData.match(/cut\s*=\s*(\d+)/)?.[1];
  const sheet = LAYOUT.map(row => row.frames.map(frame => {
    const g = underHand(place(frame.front && !isEmpty(front) ? front : side, frame.anchor), frame.hand);
    return row.mirror ? mirror(g) : g;
  }));
  return [tag.name, { cut: cut === undefined ? undefined : Number(cut), sheet }];
}));

// Part of the sheet below row `cut` of the head in every frame, or above it (`above`)
function clipOf(cut, above = false) {
  let d = '';
  LAYOUT.forEach((row, r) => row.frames.forEach((frame, c) => {
    const y = cut + frame.anchor.y;
    const [top, height] = above ? [0, y] : [y, H - y];
    d += `M${c * (W + GAP)} ${r * (H + GAP) + top}h${W}v${height}h${-W}z`;
  }));
  return d;
}

// --- SVG paths ---
const cellAt = (sheet, x, y) => sheet[Math.floor(y / H)][Math.floor(x / W)][y % H][x % W];

// Pixel outline: horizontal runs of consecutive pixels for which has(x, y).
// Runs don't cross frame borders; coordinates are in the sheet with GAP gaps.
// Equal runs in adjacent rows of a frame merge into one rectangle — the path gets twice shorter
function pathOf(has) {
  const rects = [];
  // Rectangles that can still grow down: the key is the run's start and end
  let open = new Map();
  for (let y = 0; y < sheetH; y++) {
    if (y % H === 0) open = new Map();
    const next = new Map();
    let x = 0;
    while (x < sheetW) {
      if (!has(x, y)) {
        x++;
        continue;
      }
      let end = x;
      do end++;
      while (end % W && has(end, y));
      const key = `${x} ${end}`;
      const rect = open.get(key) ?? { x, y, w: end - x, h: 0 };
      if (!rect.h) rects.push(rect);
      rect.h++;
      next.set(key, rect);
      x = end;
    }
    open = next;
  }
  return rects.map(({ x, y, w, h }) => {
    const left = x + Math.floor(x / W) * GAP;
    const top = y + Math.floor(y / H) * GAP;
    return `M${left} ${top}h${w}v${h}h${-w}z`;
  }).join('');
}

const SHADE = 'rgb(0 0 0 / 0.27)';
const colorsIn = sheets => new Set(sheets.flat(4).filter(Boolean));
// Fixed colors grouped by fill: the palette order first, then the other colors met in the sheets
function fixedGroups(palette, sheets) {
  const byFill = new Map();
  const extra = [...colorsIn(sheets)].filter(c => !KEYS.has(c) && !palette.includes(c)).sort();
  for (const color of [...palette, ...extra]) {
    const fill = fillOf(color);
    byFill.set(fill, new Set([...(byFill.get(fill) ?? []), color]));
  }
  return [...byFill].map(([fill, colors]) => ({ fill, colors }));
}
const groups = [
  { fill: 'shirt', colors: new Set([KEY.shirt, KEY.shirtShade]) },
  { fill: 'pants', colors: new Set([KEY.pants, KEY.pantsShade]) },
  { fill: 'shoes', colors: new Set([KEY.shoes, KEY.shoesShade]) },
  { fill: SHADE, colors: new Set([KEY.shirtShade, KEY.pantsShade, KEY.shoesShade]) },
  { fill: 'hair', colors: new Set([KEY.hair]) },
];

// Layers of the dude in the base outfit: shirt, pants, shoes and hair are painted by the component, the shade goes
// over them. Pixels common to all hairstyles go to d, the rest — to hairstyles[hairstyle index]
const clothesSheets = Object.fromEntries(SLOTS.map(slot => [slot, Object.fromEntries(clothesLayers[slot].map(({ name }) => [
  name,
  STYLE_NAMES.map((_, i) => sheetOf(HEADS[i], { ...BASE_OUTFIT, [slot]: name })),
]))]));
const bodyGroups = [...groups, ...fixedGroups(BODY_PALETTE, [...SHEETS, ...Object.values(clothesSheets).flatMap(Object.values)
  .flat()])];
const layers = bodyGroups.map(({ fill, colors }) => {
  const common = (x, y) => SHEETS.every(sheet => colors.has(cellAt(sheet, x, y)));
  return {
    fill,
    d: pathOf(common),
    hairstyles: SHEETS.map(sheet => pathOf((x, y) => colors.has(cellAt(sheet, x, y)) && !common(x, y))),
  };
});

// Clothes on the sprite are an overlay over the dude in the base outfit: the pixels by which the variant (with
// the other parts in the base outfit) differs from it. The overlay must not depend on the hairstyle, and the pants,
// shoes and top overlays laid in the SLOTS order must give exactly the dude in that outfit — both are checked here
const mapSheet = (sheet, fn) => sheet.map((row, r) => row.map((grid, c) => grid.map(
  (line, y) => line.map((color, x) => fn(color, r, c, y, x)),
)));
const diffOf = (base, dressed) => mapSheet(dressed, (color, r, c, y, x) => (color === base[r][c][y][x] ? null : color));
// Deep equality of nested arrays of colors (sheets, frames)
const same = (a, b) => a === b || (Array.isArray(a) && a.length === b.length && a.every((v, i) => same(v, b[i])));
const clothesDiffs = Object.fromEntries(SLOTS.map(slot => [slot, Object.fromEntries(
  Object.entries(clothesSheets[slot]).map(([name, sheets]) => {
    const diffs = sheets.map((sheet, i) => diffOf(SHEETS[i], sheet));
    const style = diffs.findIndex(d => !same(d, diffs[0]));
    if (style >= 0) {
      fail('body.aseprite', `${slot}/${name} changes different pixels with hairstyles ${STYLE_NAMES[0]} and ${STYLE_NAMES[style]}: clothes must not overlap pixels where heads differ`);
    }
    return [name, diffs[0]];
  }),
)]));
const outfits = SLOTS.reduce((acc, slot) => acc.flatMap(o => clothesLayers[slot].map(l => ({ ...o, [slot]: l.name }))), [{}]);
for (const outfit of outfits) {
  HEADS.forEach((head, i) => {
    let sheet = SHEETS[i];
    for (const slot of SLOTS) {
      const diff = clothesDiffs[slot][outfit[slot]];
      sheet = mapSheet(sheet, (color, r, c, y, x) => diff[r][c][y][x] ?? color);
    }
    if (!same(sheet, sheetOf(head, outfit))) {
      fail('body.aseprite', `overlays don't add up to ${SLOTS.map(s => outfit[s]).join(' + ')} on ${STYLE_NAMES[i]}: clothes of different groups probably touch each other's outline`);
    }
  });
}
const clothes = Object.fromEntries(SLOTS.map(slot => [slot, Object.fromEntries(
  Object.entries(clothesDiffs[slot]).map(([name, diff]) => [name, bodyGroups
    .map(({ fill, colors }) => ({ fill, d: pathOf((x, y) => colors.has(cellAt(diff, x, y))) }))
    .filter(layer => layer.d)]),
)]));

// Robot layers: it has a single variant, so each layer is whole in d
const robot = [
  { fill: 'shirt', colors: new Set([KEY.shirt, KEY.shirtShade]) },
  { fill: SHADE, colors: new Set([KEY.shirtShade]) },
  ...fixedGroups(ROBOT_PALETTE, [ROBOT_SHEET]),
]
  .map(({ fill, colors }) => ({ fill, d: pathOf((x, y) => colors.has(cellAt(ROBOT_SHEET, x, y))) }))
  .filter(layer => layer.d);

// Accessory layers: fill: 'accessory' is painted by the component, the shade and highlight go over it, then fixed colors
const accessories = Object.fromEntries(ACC_NAMES.map(name => {
  const { cut, sheet } = ACCESSORIES[name];
  const accGroups = [
    { fill: 'accessory', colors: new Set([KEY.accessory, KEY.accessoryShade, KEY.accessoryHighlight]) },
    { fill: SHADE, colors: new Set([KEY.accessoryShade]) },
    { fill: 'rgb(255 255 255 / 0.4)', colors: new Set([KEY.accessoryHighlight]) },
    ...fixedGroups(ACC_PALETTE, [sheet]),
  ];
  const accLayers = accGroups
    .map(({ fill, colors }) => ({ fill, d: pathOf((x, y) => colors.has(cellAt(sheet, x, y))) }))
    .filter(layer => layer.d);
  return [name, { clip: cut === undefined ? null : clipOf(cut), layers: accLayers }];
}));

const out = process.argv[2];
write(
  out,
  `// Generated by scripts/generate-walker.mjs from sprites/*.aseprite — do not edit by hand.
// Dude sprite sheet (frames are separated by a transparent gap): rows are pose and direction (0 — right, 1 — left,
// 2 and 3 — the same with a sign, 4 — front, 5 — front with a sign, 6 and 7 — looking at the phone right and left),
// columns are frames (0 — standing, 1–4 — step; in the front rows 1–2 — waving, 3–4 — standing;
// in the phone rows 1–2 — the screen flickers, 3–4 — as 0).
// Layers with fill: 'shirt', 'hair', 'pants' and 'shoes' are painted in the viewer's colors. Pixels common to all
// hairstyles are in d, the rest — in hairstyles[hairstyle index]. This is the dude in the base outfit;
// clothes — layers of clothes drawn over him in the order ${SLOTS.join(', ')} (empty for the base outfit).
// Coordinates and sizes are in sprite pixels, res — how many of them make a scene pixel (in ?scale= units).
// holdHand — the hand with the sign in the standing frame right and front: x — its middle, y — its top.
// accessories — accessories in drawing order: the fill: 'accessory' layer is painted in the accessory color,
// clip — the part of the dude's sheet visible under a headwear (null — the accessory hides nothing).
// robot — robot layers for chat bots on the same frames: fill: 'shirt' is painted in the nick color.
// head and body — parts of the sheet above the neck and from it down: the head nods separately from the body.
export const WALKER = {
  res: ${RES},
  frameWidth: ${W},
  frameHeight: ${H},
  gap: ${GAP},
  cols: ${cols},
  rows: ${rows},
  holdHand: ${JSON.stringify(HOLD_HAND)},
  head: '${clipOf(NECK, true)}',
  body: '${clipOf(NECK)}',
  hairstyles: ${JSON.stringify(STYLE_NAMES)},
  layers: ${JSON.stringify(layers, null, 2).replace(/\n/g, '\n  ')},
  clothes: ${JSON.stringify(clothes, null, 2).replace(/\n/g, '\n  ')},
  accessories: ${JSON.stringify(accessories, null, 2).replace(/\n/g, '\n  ')},
  robot: ${JSON.stringify(robot, null, 2).replace(/\n/g, '\n  ')},
} as const
`,
);

// Preview hair and accessory colors
const PREVIEW_HAIR = ['#5c3a26', '#1e1e1e', '#d6a848', '#b04a22', '#96969e', '#e86fa5', '#4f7fd9', '#3d2a1f'];
const PREVIEW_ACC = ['#e53935', '#43a047', '#1e88e5', '#fdd835', '#8e24aa', '#ff8f00'];

// SVG preview for review in the browser: built from the same layers that go to walkerSprite.ts and drawn
// the same way as in SceneActor.vue. On top — sheets of all hairstyles, below — each accessory on its own hairstyle
// and the robot, at the bottom — each clothes variant
function svgPreview() {
  const sw = cols * (W + GAP) - GAP;
  const sh = rows * (H + GAP) - GAP;
  const pad = 12;
  const label = 16;
  const cellW = sw + pad;
  const cellH = label + sh + pad;
  const perRow = Math.max(STYLE_NAMES.length, ACC_NAMES.length + 1);
  const width = pad + perRow * cellW;
  const height = pad + 3 * cellH;
  const frames = Array.from({ length: rows * cols }, (_, i) => `<rect x="${(i % cols) * (W + GAP)}" y="${Math.floor(i / cols) * (H + GAP)}" width="${W}" height="${H}"/>`).join('');
  const defs = layers.map((layer, i) => `<path id="l${i}" d="${layer.d}"/>`).join('\n');
  const paint = (fill, style) => ({
    shirt: fillOf(KEY.shirt),
    pants: fillOf(KEY.pants),
    shoes: fillOf(KEY.shoes),
    hair: PREVIEW_HAIR[style % PREVIEW_HAIR.length],
  })[fill] ?? fill;
  const man = (style, clip, outfit = BASE_OUTFIT) => {
    const body = layers
      .map((layer, i) => `<g fill="${paint(layer.fill, style)}"><use href="#l${i}"/><path d="${layer.hairstyles[style]}"/></g>`)
      .join('')
      + SLOTS.flatMap(slot => clothes[slot][outfit[slot]]).map(layer => `<path fill="${paint(layer.fill, style)}" d="${layer.d}"/>`)
        .join('');
    return clip ? `<g clip-path="url(#${clip})">${body}</g>` : body;
  };
  const cell = (n, title, content) => `<g transform="translate(${pad + (n % perRow) * cellW} ${pad + Math.floor(n / perRow) * cellH})">`
    + `<text y="${label - 2}">${title}</text><g transform="translate(0 ${label})"><g class="frame">${frames}</g>${content}</g></g>`;
  const clips = [];
  const cells = [
    ...STYLE_NAMES.map((name, style) => cell(style, name, man(style))),
    ...ACC_NAMES.map((name, i) => {
      const style = i % STYLE_NAMES.length;
      const { clip, layers: accLayers } = accessories[name];
      if (clip) clips.push(`<clipPath id="c${i}"><path d="${clip}"/></clipPath>`);
      const acc = accLayers
        .map(layer => `<path fill="${layer.fill === 'accessory' ? PREVIEW_ACC[i % PREVIEW_ACC.length] : layer.fill}" d="${layer.d}"/>`)
        .join('');
      return cell(perRow + i, name, man(style, clip && `c${i}`) + acc);
    }),
    cell(
      perRow + ACC_NAMES.length,
      'robot',
      robot.map(layer => `<path fill="${layer.fill === 'shirt' ? fillOf(KEY.shirt) : layer.fill}" d="${layer.d}"/>`).join(''),
    ),
    // Each clothes variant with the other parts in the base outfit
    ...SLOTS
      .flatMap(slot => clothesLayers[slot].map(({ name }) => [name, { ...BASE_OUTFIT, [slot]: name }]))
      .map(([name, outfit], i) => cell(2 * perRow + i, name, man(i % STYLE_NAMES.length, null, outfit))),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 2}" height="${height * 2}" shape-rendering="crispEdges">
<style>text { font: 10px monospace; fill: #555 } .frame { fill: #fff }</style>
<rect width="100%" height="100%" fill="#d4d4dc"/>
<defs>
${defs}
${clips.join('\n')}
</defs>
${cells.join('\n')}
</svg>
`;
}

if (process.argv[3]) write(process.argv[3], svgPreview());
