<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { bodyUrl, FRAME_SIZE, MIRROR_OFFSET } from '../paperDoll';
import { useHeldDirection } from './useHeldDirection';
import { useWalker } from './useWalker';

const SCALE = 2;

const viewportWidth = ref(window.innerWidth);
function onResize() {
  viewportWidth.value = window.innerWidth;
}
window.addEventListener('resize', onResize);
onScopeDispose(() => window.removeEventListener('resize', onResize));

/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / SCALE));
const direction = useHeldDirection();
const { x, frame, mirrored } = useWalker(direction, width);
x.value = Math.floor((width.value - FRAME_SIZE) / 2);
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-neutral-800 text-neutral-400">
    <div class="flex items-center gap-4 p-4">
      <p>← → или A D — идти</p>
    </div>
    <!-- Whole sprite px only, so the pixel art stays sharp -->
    <div
      :style="{ translate: `${(x + (mirrored ? MIRROR_OFFSET : 0)) * SCALE}px 0` }"
      :class="[cn.dude, mirrored && cn.dudeMirrored]"
    >
      <img :src="bodyUrl(frame)" alt="dude" :width="FRAME_SIZE * SCALE" class="block">
    </div>
  </div>
</template>

<style module="cn">
.dude {
  position: absolute;
  bottom: 0;
  left: 0;
  image-rendering: pixelated;
}

.dudeMirrored {
  scale: -1 1;
}
</style>
