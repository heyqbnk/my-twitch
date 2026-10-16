<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { useClothing } from '../clothing';
import { bodyUrl, eyesUrl, FRAME_SIZE, MIRROR_OFFSET, type Eyes } from '../paperDoll';
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

const eyes = ref<Eyes>('sticks');

const shirtColor = ref('#4c9be8');
const shirt = useClothing('t-shirt', shirtColor);

type Bottoms = 'jeans' | 'shorts';
const bottomsKind = ref<Bottoms>('jeans');
const bottomsColor = ref('#3d5f9e');
const bottoms: Record<Bottoms, ReturnType<typeof useClothing>> = {
  jeans: useClothing('jeans', bottomsColor),
  shorts: useClothing('shorts', bottomsColor),
};
/** Drawn under the t-shirt, so its hem covers the waistband. */
const bottomsLayer = computed(() => bottoms[bottomsKind.value].value.get(frame.value));
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-neutral-800 text-neutral-400">
    <div class="flex items-center gap-4 p-4">
      <p>← → или A D — идти</p>
      <label class="flex items-center gap-2">
        Глаза
        <select v-model="eyes" class="bg-neutral-700">
          <option value="sticks">Палочки</option>
          <option value="big">Большие</option>
          <option value="sleepy">Сонные</option>
          <option value="happy">Довольные</option>
        </select>
      </label>
      <label class="flex items-center gap-2">
        Футболка
        <input v-model="shirtColor" type="color">
      </label>
      <label class="flex items-center gap-2">
        <select v-model="bottomsKind" class="bg-neutral-700">
          <option value="jeans">Джинсы</option>
          <option value="shorts">Шорты</option>
        </select>
        <input v-model="bottomsColor" type="color">
      </label>
    </div>
    <!-- Whole sprite px only, so the pixel art stays sharp -->
    <div
      :style="{ translate: `${(x + (mirrored ? MIRROR_OFFSET : 0)) * SCALE}px 0` }"
      :class="[cn.dude, mirrored && cn.dudeMirrored]"
    >
      <img :src="bodyUrl(frame)" alt="dude" :width="FRAME_SIZE * SCALE" class="block">
      <img
        :src="eyesUrl(eyes, frame)"
        alt=""
        :width="FRAME_SIZE * SCALE"
        class="absolute inset-0"
      >
      <img
        v-if="bottomsLayer"
        :src="bottomsLayer"
        alt=""
        :width="FRAME_SIZE * SCALE"
        class="absolute inset-0"
      >
      <img
        v-if="shirt.get(frame)"
        :src="shirt.get(frame)"
        alt=""
        :width="FRAME_SIZE * SCALE"
        class="absolute inset-0"
      >
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
