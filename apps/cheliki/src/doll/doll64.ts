import { animation, type Doll } from './paperDoll';

const STOP = animation('stop-turn-south', 'west', 8, 76, 0);

/**
 * Natural hair colours. The hair is mid grey (about 50%) with lighter highlights, so these are
 * about twice as light as the hair they give.
 */
const HAIR_COLORS = [
  // black
  '#3a3230',
  // dark brown
  '#6e4b38',
  // brown
  '#9c6a45',
  // light brown
  '#c08a5a',
  // dark blonde
  '#e4a868',
  // blonde
  '#ffd08a',
  // ginger
  '#e8743c',
  // auburn
  '#a8483a',
  // grey
  '#b4b4b8',
  // white
  '#fff8ee',
];

/**
 * Shoe colours from the reference sheet. The shoes are mid grey with light soles, so these are
 * about twice as light as the leather or canvas they give.
 */
const SHOE_COLORS = [
  // black
  '#4a4646',
  // dark brown
  '#7a5440',
  // brown
  '#c07848',
  // tan
  '#f0c088',
  // olive
  '#a0aa6a',
  // navy
  '#5a76c8',
  // red
  '#f05a50',
  // burgundy
  '#b04a50',
  // white
  '#ffffff',
];

/**
 * The 64px doll on a 76px canvas: frames drawn facing west, grey clothes to tint and eyes from
 * paper-doll.aseprite; grey hair to tint is in its hair/* layers. Grey shoes to tint are only
 * exported frames: three from PixelLab outfit transfers, sandals drawn over the bare feet.
 */
export const DOLL_64: Doll = {
  idle: STOP.west.at(-1)!,
  size: 76,
  slots: [
    { folder: 'clothes', key: 'pants', names: ['jeans', 'shorts'], tinted: true },
    {
      folder: 'shoes',
      key: 'shoes',
      names: ['boots', 'sneakers', 'loafers', 'sandals'],
      palette: SHOE_COLORS,
      tinted: true,
    },
    { folder: 'clothes', key: 'top', names: ['t-shirt'], tinted: true },
    { folder: 'face/eyes', key: 'eyes', names: ['sticks'] },
    {
      folder: 'hair',
      key: 'hair',
      names: ['quiff', 'bun', 'wavy', 'ponytail', 'fringe', 'part'],
      palette: HAIR_COLORS,
      tinted: true,
    },
    // Accessories as in dudes, with its shares; drawn in colour as PixelLab made them
    { folder: 'accessories', key: 'neck', names: ['scarf', 'bowtie'], shares: { bowtie: 6, scarf: 10 } },
    { folder: 'accessories', key: 'mouth', names: ['cigar', 'lollipop'], shares: { cigar: 6, lollipop: 6 } },
    {
      folder: 'accessories',
      key: 'eyewear',
      names: ['glasses', 'vr', 'monocle'],
      shares: { glasses: 14, monocle: 4, vr: 6 },
    },
    {
      folder: 'accessories',
      key: 'headwear',
      names: ['beanie', 'helmet', 'cap', 'crown', 'halo', 'headphones'],
      shares: { beanie: 12, cap: 12, crown: 3, halo: 2, headphones: 14, helmet: 8 },
    },
  ],
  // The bare feet end on row 64; some shoes reach a pixel or two lower, into the grass
  soles: 65,
  start: animation('start-walk', 'west', 8, 76, 0),
  stop: STOP,
  url: '/paper-doll',
  walk: animation('walk-loop', 'west', 9, 76, 0),
  // The start ends in the pose before walk[0]
  walkAfterStart: 0,
  walkStep: 3,
};
