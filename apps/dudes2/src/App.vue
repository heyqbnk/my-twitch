<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';

const ANIMATIONS_URL = '/characters/paper-doll/Idle/animations';
const FPS = 10;
/** Frame canvas in px: v3 grows it past the 64px sprite. */
const FRAME_SIZE = 76;
const SCALE = 2;

const frameUrls = (name: string, count: number) => Array.from(
  { length: count },
  (_, i) => `${ANIMATIONS_URL}/${name}/west/frame_${String(i).padStart(3, '0')}.png`,
);

// PixelLab generated 12 frames, but frames 8-11 repeat 0-3, so only one 8-frame cycle is kept
const walk = frameUrls('walk-v3-loop', 8);
// Starts right after walk frame 7 and ends in the south pose
const stopTurn = frameUrls('stop-turn-south', 8);

/** Demo: a few walk cycles, stop and turn to the viewer, hold, repeat. */
const PLAYLIST = [
  ...walk,
  ...walk,
  ...walk,
  ...stopTurn,
  ...Array<string>(15).fill(stopTurn.at(-1)!),
];

const frame = ref(0);
const timer = setInterval(() => {
  frame.value = (frame.value + 1) % PLAYLIST.length;
}, 1000 / FPS);
onScopeDispose(() => clearInterval(timer));
</script>

<template>
  <div class="flex items-end gap-4 p-4">
    <img
      :src="PLAYLIST[frame]"
      alt="walk west"
      title="walk west"
      :width="FRAME_SIZE * SCALE"
      :class="cn.sprite"
    >
    <!-- No separate east animations: the west frames are mirrored -->
    <img
      :src="PLAYLIST[frame]"
      alt="walk east"
      title="walk east"
      :width="FRAME_SIZE * SCALE"
      :class="[cn.sprite, cn.spriteMirrored]"
    >
  </div>
</template>

<style module="cn">
.sprite {
  image-rendering: pixelated;
}

.spriteMirrored {
  transform: scaleX(-1);
}
</style>
