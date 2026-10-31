import { WALKER } from './walkerSprite';

import type { ChatMessage } from '../_composables/useTwitchChat';

/**
 * FNV-1a: a fast stable string hash.
 */
function hash(str: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The dude's color is the chatter's nick color. If the chatter never picked one (the `color` tag
 * is empty), it is derived from the Twitch ID (or the login without it), so it stays the same
 * across sessions.
 */
export function actorColor(msg: Pick<ChatMessage, 'color' | 'login' | 'userId'>): string {
  return msg.color ?? fallbackColor(msg.userId ?? msg.login);
}

function fallbackColor(key: string): string {
  const h = hash(key);
  const hue = h % 360;
  const saturation = 55 + ((h >>> 9) % 30);
  const lightness = 50 + ((h >>> 17) % 15);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/**
 * Hair colors: natural and dyed.
 */
const HAIR_COLORS = [
  // dark brown
  '#3d2a1f',
  // chestnut
  '#5c3a26',
  // light brown
  '#8a5a34',
  // ginger
  '#b04a22',
  // blonde
  '#d6a848',
  // platinum
  '#ece0bd',
  // grey
  '#96969e',
  // pink
  '#e86fa5',
  // blue
  '#4f7fd9',
  // black
  '#1f1b20',
  // copper
  '#c4622d',
  // strawberry blonde
  '#d98f62',
  // ash blonde
  '#b5aa8e',
  // white
  '#f5f3ee',
  // purple
  '#8e5bd6',
  // lavender
  '#b9a2e8',
  // green
  '#4caf6a',
  // turquoise
  '#2fb5b0',
  // red
  '#d23a3a',
];

/**
 * Hairstyle and hair color, picked by Twitch ID (or the login without it): the same across
 * sessions.
 */
export function actorHair(
  msg: Pick<ChatMessage, 'login' | 'userId'>,
): { hairColor: string; hairstyle: number } {
  const key = msg.userId ?? msg.login;
  return {
    hairColor: HAIR_COLORS[hash(key, 0xc2b2ae35) % HAIR_COLORS.length]!,
    hairstyle: hash(key, 0x85ebca6b) % WALKER.hairstyles.length,
  };
}

export type TopName = keyof typeof WALKER.clothes.tops;
export type PantsName = keyof typeof WALKER.clothes.pants;
export type ShoesName = keyof typeof WALKER.clothes.shoes;
export interface Outfit {
  pants: PantsName;
  pantsColor: string;
  shoes: ShoesName;
  shoesColor: string;
  top: TopName;
}

/**
 * The top is always the nick color, so only pants and shoes have palettes (for sneakers it is the
 * sock color).
 */
const PANTS_COLORS: Record<PantsName, string[]> = {
  jeans: ['#3b4a6b', '#2c3e66', '#4a6a9a', '#23252b', '#5b6170'],
  joggers: ['#3a3a42', '#7a7a84', '#1f2a44', '#8b1e2e', '#2f5d3a'],
  shorts: ['#c2a878', '#3b4a6b', '#4a7a4a', '#b23a3a', '#1f1f26', '#8a6a4a'],
};
const SHOES_COLORS: Record<ShoesName, string[]> = {
  boots: ['#3a261c', '#6b4428', '#1f1b20', '#8a5a34'],
  highboots: ['#1f1b20', '#3a261c', '#5a3d2b', '#2f3a2a'],
  sneakers: ['#e53935', '#1e88e5', '#43a047', '#1f1f26', '#ff8f00', '#8e24aa'],
};
/**
 * Tops picked at random. The rest (the dress) only come from a personal outfit.
 */
const RANDOM_TOPS: TopName[] = ['longsleeve', 'tshirt', 'hoodie'];
/**
 * Personal outfits by login: they override the random clothes.
 */
const PERSONAL_OUTFITS: Record<string, Partial<Pick<Outfit, 'pants' | 'shoes' | 'top'>>> = {
  // Bare legs under the dress: shorts under the skirt are not visible
  ilyinvp: { pants: 'shorts', top: 'dress' },
};

/**
 * Clothes and their colors, picked by Twitch ID (or the login without it): the same across
 * sessions.
 */
export function actorOutfit(msg: Pick<ChatMessage, 'login' | 'userId'>): Outfit {
  const key = msg.userId ?? msg.login;
  const pick = <T>(list: readonly T[], seed: number) => list[hash(key, seed) % list.length]!;
  const personal = PERSONAL_OUTFITS[msg.login];
  const top = personal?.top ?? pick(RANDOM_TOPS, 0x1b873593);
  // Listed explicitly rather than taken from the sorted palette keys: the order decides the pick,
  // so changing it would change every viewer's clothes
  const pants = personal?.pants ?? pick(['jeans', 'shorts', 'joggers'] as PantsName[], 0xcc9e2d51);
  const shoes = personal?.shoes ?? pick(['boots', 'sneakers', 'highboots'] as ShoesName[], 0xe6546b64);
  return {
    pants,
    pantsColor: pick(PANTS_COLORS[pants], 0x5bd1e995),
    shoes,
    shoesColor: pick(SHOES_COLORS[shoes], 0x9e3779b1),
    top,
  };
}

export type AccessoryName = keyof typeof WALKER.accessories;
export interface Accessory {
  color: string;
  name: AccessoryName;
}

/**
 * Accessory colors (for the crown, the color of its gems). The cigar, VR glasses, monocle and
 * halo always have the same color and need no palette.
 */
const ACCESSORY_COLORS: Partial<Record<AccessoryName, string[]>> = {
  beanie: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff8f00', '#37474f', '#ec407a', '#00acc1'],
  bowtie: ['#1f1f26', '#c62828', '#1565c0', '#8e24aa', '#c9a227', '#f2f2f5'],
  cap: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#1f1f26', '#f2f2f5', '#ff8f00', '#8e24aa'],
  crown: ['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#00acc1'],
  glasses: ['#1f1f26', '#c62828', '#1565c0', '#2e7d32', '#ad1457', '#c9a227', '#6d4c41'],
  headphones: ['#1f1f26', '#f2f2f5', '#e53935', '#1e88e5', '#43a047', '#8e24aa', '#ff8f00', '#ec407a'],
  helmet: ['#fdd835', '#ff8f00', '#f2f2f5', '#e53935', '#1e88e5', '#43a047'],
  lollipop: ['#e53935', '#ec407a', '#fdd835', '#43a047', '#1e88e5', '#ff8f00'],
  scarf: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff8f00', '#ec407a', '#37474f'],
};

/**
 * Each accessory takes its own slot: one of six on the head, glasses, VR or monocle on the eyes,
 * a cigar or a lollipop in the mouth, a scarf or a bowtie on the neck. Shares are out of 100
 * viewers; the rest go without an accessory in that slot. New options are appended to the end of
 * a slot, so the accessories of existing viewers don't change.
 */
const SLOTS: { options: [AccessoryName, number][]; seed: number }[] = [
  { options: [['beanie', 12], ['helmet', 8], ['cap', 12], ['crown', 3], ['halo', 2], ['headphones', 14]], seed: 0x27d4eb2f },
  { options: [['glasses', 14], ['vr', 6]], seed: 0x165667b1 },
  { options: [['monocle', 4]], seed: 0x72866362 },
  { options: [['cigar', 6], ['lollipop', 6]], seed: 0xd3a2646c },
  { options: [['scarf', 10], ['bowtie', 6]], seed: 0x9b05688c },
];

/**
 * Accessories and their colors, picked by Twitch ID (or the login without it): the same across
 * sessions. In the drawing order of WALKER.accessories.
 */
export function actorAccessories(msg: Pick<ChatMessage, 'login' | 'userId'>): Accessory[] {
  const key = msg.userId ?? msg.login;
  const names = new Set<AccessoryName>();
  for (const { options, seed } of SLOTS) {
    let roll = hash(key, seed) % 100;
    for (const [name, share] of options) {
      if (roll < share) {
        names.add(name);
        break;
      }
      roll -= share;
    }
  }
  return (Object.keys(WALKER.accessories) as AccessoryName[])
    .filter(name => names.has(name))
    .map(name => {
      const colors = ACCESSORY_COLORS[name];
      return {
        color: colors ? colors[hash(`${key}:${name}`, 0x6a09e667) % colors.length]! : '',
        name,
      };
    });
}

/**
 * The spot on the floor: a share of the scene width, with margins from the edges.
 */
export function actorPosition(login: string): number {
  const MARGIN = 0.04;
  return MARGIN + ((hash(login, 0x9e3779b9) / 0xffffffff) * (1 - (2 * MARGIN)));
}
