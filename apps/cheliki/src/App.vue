<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import DollSprite from './doll/DollSprite.vue';
import { loadBody, type Face } from './doll/face';
import { FPS, FRAMES, IDLE, SOUTH_TURN_WALK, STOP_TURN_SOUTH, WALK, type Direction } from './doll/paperDoll';
import { useBlink } from './doll/useBlink';

const IDLE_CYCLES = 3;
const WALK_CYCLES = 2;
const FACE: Face = { eyes: 'open', brows: 'thin', mouth: 'smile' };

/**
 * Demo: breathe, turn and walk, stop and turn to the viewer, repeat. Frames that repeat their
 * neighbor at a seam are dropped: SOUTH_TURN_WALK ends on WALK[0], STOP_TURN_SOUTH on IDLE[0].
 */
const playlist = (direction: Direction) => [
  ...Array.from({ length: IDLE_CYCLES }, () => IDLE).flat(),
  ...SOUTH_TURN_WALK[direction],
  ...WALK[direction].slice(1),
  ...Array.from({ length: WALK_CYCLES - 1 }, () => WALK[direction]).flat(),
  ...STOP_TURN_SOUTH[direction].slice(0, -1),
];
const PLAYLISTS = { west: playlist('west'), east: playlist('east') };

for (const frame of FRAMES) void loadBody(frame);

const tick = ref(0);
const timer = setInterval(() => tick.value++, 1000 / FPS);
onScopeDispose(() => clearInterval(timer));
const blink = useBlink();
</script>

<template>
  <div class="flex items-end gap-4 p-4">
    <DollSprite
      v-for="(frames, side) in PLAYLISTS"
      :key="side"
      :title="side"
      :frame="frames[tick % frames.length]!"
      :face="FACE"
      :blink="blink"
    />
  </div>
</template>
