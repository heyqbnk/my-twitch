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
 * paper-doll-64.aseprite; grey hair to tint is in its hair/* layers. Grey shoes to tint are only
 * exported frames: three from PixelLab outfit transfers, sandals drawn over the bare feet.
 */
export const DOLL_64: Doll = {
  url: '/characters/paper-doll-64',
  size: 76,
  walkStep: 3,
  start: animation('start-walk', 'west', 8, 76, 0),
  walk: animation('walk-loop', 'west', 9, 76, 0),
  // The start ends in the pose before walk[0]
  walkAfterStart: 0,
  stop: STOP,
  idle: STOP.west.at(-1)!,
  slots: [
    { key: 'pants', label: 'Штаны', folder: 'clothes', names: ['jeans', 'shorts'], tinted: true },
    {
      key: 'shoes',
      label: 'Обувь',
      folder: 'shoes',
      names: ['boots', 'sneakers', 'loafers', 'sandals'],
      tinted: true,
      palette: SHOE_COLORS,
    },
    { key: 'top', label: 'Верх', folder: 'clothes', names: ['t-shirt'], tinted: true },
    { key: 'eyes', label: 'Глаза', folder: 'face/eyes', names: ['sticks'] },
    {
      key: 'hair',
      label: 'Причёска',
      folder: 'hair',
      names: ['quiff', 'bun', 'wavy', 'ponytail', 'fringe', 'part'],
      tinted: true,
      palette: HAIR_COLORS,
    },
  ],
  defaultLook: {
    pants: { name: 'jeans' },
    shoes: { name: 'sneakers', color: SHOE_COLORS[5] },
    top: { name: 't-shirt' },
    eyes: { name: 'sticks' },
    hair: { name: 'quiff', color: HAIR_COLORS[2] },
  },
};
