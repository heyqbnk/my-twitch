<script setup lang="ts">
import { computed, useId } from 'vue';
import { DEFAULT_GROUND } from '../composables/useChannelQuery';

/**
 * scale — экранных пикселей на пиксель сцены
 */
const props = withDefaults(defineProps<{
  scale: number;
  /** Ground height in scene px. */
  height?: number;
}>(), { height: DEFAULT_GROUND });

/**
 * Земля — плитка в пикселях сцены, повторяется по ширине: трава сверху, под ней земля с камешками
 */
const TILE_WIDTH = 64;

const GRASS_TOP = '#8fd14f';
const GRASS_LIGHT = '#a8e061';
const GRASS = '#5fae3a';
const GRASS_DARK = '#4a8f2e';
const DIRT = '#8b5a2b';
const DIRT_DEEP = '#7a4e25';
const DIRT_SPECK = '#6b4220';
const PEBBLE = '#a39e93';
const PEBBLE_SHADOW = '#7d786f';

/**
 * Детерминированный ГПСЧ (mulberry32): земля одна и та же при каждой загрузке
 */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawTile(height: number): string[][] {
  const random = prng(20261025);
  const tile = Array.from({ length: height }, () => Array<string>(TILE_WIDTH).fill(DIRT));
  // The deep dirt takes the bottom quarter of the ground
  const deepFrom = height - Math.floor(height / 4);
  for (let x = 0; x < TILE_WIDTH; x++) {
    // Нижний край травы неровный: от 3 до 5 пикселей
    const grassDepth = 3 + Math.floor(random() * 3);
    for (let y = 0; y < height; y++) {
      if (y === 0) tile[y]![x] = random() < 0.2 ? GRASS_LIGHT : GRASS_TOP;
      else if (y < grassDepth - 1) tile[y]![x] = GRASS;
      else if (y === grassDepth - 1) tile[y]![x] = GRASS_DARK;
      else if (random() < 0.08) tile[y]![x] = DIRT_SPECK;
      else if (y >= deepFrom) tile[y]![x] = DIRT_DEEP;
    }
  }
  // Камешки 2×2 с тенью снизу справа. Pebbles lie under the deepest grass, if there is room
  const pebbleRows = height - 6;
  for (let i = 0; pebbleRows > 0 && i < 6; i++) {
    const x = Math.floor(random() * (TILE_WIDTH - 2));
    const y = 5 + Math.floor(random() * pebbleRows);
    tile[y]![x] = PEBBLE;
    tile[y]![x + 1] = PEBBLE;
    tile[y + 1]![x] = PEBBLE;
    tile[y + 1]![x + 1] = PEBBLE_SHADOW;
  }
  return tile;
}

/**
 * Путь на цвет, горизонтальные отрезки одного цвета склеены
 */
const tilePaths = computed(() => {
  const paths = new Map<string, string>();
  drawTile(props.height).forEach((row, y) => {
    let start = 0;
    for (let x = 1; x <= TILE_WIDTH; x++) {
      if (x < TILE_WIDTH && row[x] === row[start]) continue;
      const color = row[start]!;
      paths.set(color, (paths.get(color) ?? '') + `M${start} ${y}h${x - start}v1h${start - x}z`);
      start = x;
    }
  });
  return [...paths].map(([fill, d]) => ({ fill, d }));
});

const patternId = useId();
const screenHeight = computed(() => props.height * props.scale);
</script>

<template>
  <svg class="block shrink-0" width="100%" :height="screenHeight" shape-rendering="crispEdges">
    <defs>
      <pattern
        :id="patternId"
        patternUnits="userSpaceOnUse"
        :width="TILE_WIDTH * scale"
        :height="screenHeight"
      >
        <g :transform="`scale(${scale})`">
          <path v-for="path in tilePaths" :key="path.fill" :fill="path.fill" :d="path.d" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" :fill="`url(#${patternId})`" />
  </svg>
</template>
