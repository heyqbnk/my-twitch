import type { ChatMessage } from '../composables/useTwitchChat';
import { WALKER } from './walkerSprite';

// FNV-1a: быстрый стабильный хеш строки
function hash(str: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Цвет человечка — цвет ника в чате. Если зритель цвет не выбирал (тег color пуст),
// вычисляем его из Twitch ID (а без него — из логина), поэтому он одинаков в разных сессиях
export function actorColor(msg: Pick<ChatMessage, 'color' | 'userId' | 'login'>): string {
  return msg.color ?? fallbackColor(msg.userId ?? msg.login);
}

function fallbackColor(key: string): string {
  const h = hash(key);
  const hue = h % 360;
  const saturation = 55 + ((h >>> 9) % 30);
  const lightness = 50 + ((h >>> 17) % 15);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

// Цвета волос: натуральные и крашеные
const HAIR_COLORS = [
  // тёмно-каштановый
  '#3d2a1f',
  // каштановый
  '#5c3a26',
  // русый
  '#8a5a34',
  // рыжий
  '#b04a22',
  // блонд
  '#d6a848',
  // платиновый
  '#ece0bd',
  // седой
  '#96969e',
  // розовый
  '#e86fa5',
  // синий
  '#4f7fd9',
  // чёрный
  '#1f1b20',
  // медный
  '#c4622d',
  // клубничный блонд
  '#d98f62',
  // пепельный блонд
  '#b5aa8e',
  // белый
  '#f5f3ee',
  // фиолетовый
  '#8e5bd6',
  // лавандовый
  '#b9a2e8',
  // зелёный
  '#4caf6a',
  // бирюзовый
  '#2fb5b0',
  // красный
  '#d23a3a',
];

// Причёска и цвет волос — из Twitch ID (а без него — из логина), одинаковы в разных сессиях
export function actorHair(msg: Pick<ChatMessage, 'userId' | 'login'>): { hairstyle: number; hairColor: string } {
  console.log(msg);
  const key = msg.userId ?? msg.login;
  return {
    hairstyle: hash(key, 0x85ebca6b) % WALKER.hairstyles.length,
    hairColor: HAIR_COLORS[hash(key, 0xc2b2ae35) % HAIR_COLORS.length],
  };
}

export type TopName = keyof typeof WALKER.clothes.tops;
export type PantsName = keyof typeof WALKER.clothes.pants;
export type ShoesName = keyof typeof WALKER.clothes.shoes;
export interface Outfit {
  top: TopName;
  pants: PantsName;
  pantsColor: string;
  shoes: ShoesName;
  shoesColor: string;
}

// Верх всегда в цвет ника, поэтому палитры только у штанов и обуви (у кед — цвет носка)
const PANTS_COLORS: Record<PantsName, string[]> = {
  jeans: ['#3b4a6b', '#2c3e66', '#4a6a9a', '#23252b', '#5b6170'],
  shorts: ['#c2a878', '#3b4a6b', '#4a7a4a', '#b23a3a', '#1f1f26', '#8a6a4a'],
  joggers: ['#3a3a42', '#7a7a84', '#1f2a44', '#8b1e2e', '#2f5d3a'],
};
const SHOES_COLORS: Record<ShoesName, string[]> = {
  boots: ['#3a261c', '#6b4428', '#1f1b20', '#8a5a34'],
  sneakers: ['#e53935', '#1e88e5', '#43a047', '#1f1f26', '#ff8f00', '#8e24aa'],
  highboots: ['#1f1b20', '#3a261c', '#5a3d2b', '#2f3a2a'],
};
// Верх, который выпадает случайно; остальной (платье) — только по личному наряду
const RANDOM_TOPS: TopName[] = ['longsleeve', 'tshirt', 'hoodie'];
// Личные наряды по логину: перекрывают случайную одежду
const PERSONAL_OUTFITS: Record<string, Partial<Pick<Outfit, 'top' | 'pants' | 'shoes'>>> = {
  // Под платьем голые ноги — шорты под юбкой не видны
  ilyinvp: { top: 'dress', pants: 'shorts' },
};

// Одежда и её цвета — из Twitch ID (а без него — из логина), одинаковы в разных сессиях
export function actorOutfit(msg: Pick<ChatMessage, 'userId' | 'login'>): Outfit {
  const key = msg.userId ?? msg.login;
  const pick = <T>(list: readonly T[], seed: number) => list[hash(key, seed) % list.length];
  const personal = PERSONAL_OUTFITS[msg.login];
  const top = personal?.top ?? pick(RANDOM_TOPS, 0x1b873593);
  const pants = personal?.pants ?? pick(Object.keys(PANTS_COLORS) as PantsName[], 0xcc9e2d51);
  const shoes = personal?.shoes ?? pick(Object.keys(SHOES_COLORS) as ShoesName[], 0xe6546b64);
  return {
    top,
    pants,
    pantsColor: pick(PANTS_COLORS[pants], 0x5bd1e995),
    shoes,
    shoesColor: pick(SHOES_COLORS[shoes], 0x9e3779b1),
  };
}

export type AccessoryName = keyof typeof WALKER.accessories;
export interface Accessory {
  name: AccessoryName;
  color: string;
}

// Цвета аксессуаров (у короны — цвет камней). Сигара, VR-очки, монокль и нимб всегда одного цвета, им палитра не нужна
const ACCESSORY_COLORS: Partial<Record<AccessoryName, string[]>> = {
  headphones: ['#1f1f26', '#f2f2f5', '#e53935', '#1e88e5', '#43a047', '#8e24aa', '#ff8f00', '#ec407a'],
  beanie: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff8f00', '#37474f', '#ec407a', '#00acc1'],
  helmet: ['#fdd835', '#ff8f00', '#f2f2f5', '#e53935', '#1e88e5', '#43a047'],
  glasses: ['#1f1f26', '#c62828', '#1565c0', '#2e7d32', '#ad1457', '#c9a227', '#6d4c41'],
  cap: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#1f1f26', '#f2f2f5', '#ff8f00', '#8e24aa'],
  crown: ['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#00acc1'],
  scarf: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff8f00', '#ec407a', '#37474f'],
  bowtie: ['#1f1f26', '#c62828', '#1565c0', '#8e24aa', '#c9a227', '#f2f2f5'],
  lollipop: ['#e53935', '#ec407a', '#fdd835', '#43a047', '#1e88e5', '#ff8f00'],
};

// Каждый аксессуар занимает своё место: на голове одно из шести, на глазах — очки, VR или монокль,
// во рту — сигара или леденец, на шее — шарф или бабочка. Доли — из 100 зрителей; остальные ходят без аксессуара
// на этом месте. Новые варианты дописываются в конец места, чтобы у прежних зрителей аксессуары не менялись
const SLOTS: { seed: number; options: [AccessoryName, number][] }[] = [
  { seed: 0x27d4eb2f, options: [['beanie', 12], ['helmet', 8], ['cap', 12], ['crown', 3], ['halo', 2], ['headphones', 14]] },
  { seed: 0x165667b1, options: [['glasses', 14], ['vr', 6]] },
  { seed: 0x72866362, options: [['monocle', 4]] },
  { seed: 0xd3a2646c, options: [['cigar', 6], ['lollipop', 6]] },
  { seed: 0x9b05688c, options: [['scarf', 10], ['bowtie', 6]] },
];

// Аксессуары и их цвета — из Twitch ID (а без него — из логина), одинаковы в разных сессиях.
// Порядок — порядок отрисовки из WALKER.accessories
export function actorAccessories(msg: Pick<ChatMessage, 'userId' | 'login'>): Accessory[] {
  const key = msg.userId ?? msg.login;
  const names = new Set<AccessoryName>();
  for (const { seed, options } of SLOTS) {
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
      return { name, color: colors ? colors[hash(`${key}:${name}`, 0x6a09e667) % colors.length] : '' };
    });
}

// Положение на полу: доля ширины сцены с отступами от краёв
export function actorPosition(login: string): number {
  const MARGIN = 0.04;
  return MARGIN + (hash(login, 0x9e3779b9) / 0xffffffff) * (1 - 2 * MARGIN);
}
