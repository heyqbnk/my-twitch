<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { bodyUrl, eyesUrl, FACING_SOUTH, FPS, FRAME_SIZE, STOP_TURN_SOUTH, WALK } from './paperDoll';

const SCALE = 2;
const WALK_CYCLES = 2;
/** How long the dude stands facing the viewer after the turn, in frames. */
const HOLD_FRAMES = 15;

/** Demo: walk, stop and turn to the viewer, stand for a while, repeat. */
const PLAYLIST = [
  ...Array.from({ length: WALK_CYCLES }, () => WALK).flat(),
  ...STOP_TURN_SOUTH,
  ...Array.from({ length: HOLD_FRAMES }, () => FACING_SOUTH),
];

const frame = ref(0);
const timer = setInterval(() => {
  frame.value = (frame.value + 1) % PLAYLIST.length;
}, 1000 / FPS);
onScopeDispose(() => clearInterval(timer));
</script>

<template>
  <div class="flex items-end gap-4 p-4">
    <!-- No separate east animations: the west frames are mirrored -->
    <div
      v-for="side in ['west', 'east']"
      :key="side"
      :title="side"
      :class="[cn.sprite, side === 'east' && cn.spriteMirrored]"
    >
      <img
        :src="bodyUrl(PLAYLIST[frame]!)"
        :alt="`dude ${side}`"
        :width="FRAME_SIZE * SCALE"
        class="block"
      >
      <img
        :src="eyesUrl('sticks', PLAYLIST[frame]!)"
        alt=""
        :width="FRAME_SIZE * SCALE"
        class="absolute inset-0"
      >
    </div>
  </div>
</template>

<style module="cn">
.sprite {
  position: relative;
  image-rendering: pixelated;
}

.spriteMirrored {
  transform: scaleX(-1);
}
</style>
