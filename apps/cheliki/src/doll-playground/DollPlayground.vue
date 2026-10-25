<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { DOLL_64 } from '../doll/doll64';
import DollSprite from '../doll/DollSprite.vue';
import { preload, type Look } from '../doll/paperDoll';
import { useViewportWidth } from '../doll/useViewportWidth';
import { useWalker } from '../doll/useWalker';
import { useHeldDirection } from './useHeldDirection';

const DOLL = DOLL_64;
const SCALES = [1, 2, 3, 4];

// Parts without a label (new layers in the doll's .aseprite) show their name
const LABELS: Record<string, string> = {
  jeans: 'Джинсы',
  shorts: 'Шорты',
  't-shirt': 'Футболка',
  sticks: 'Палочки',
  quiff: 'Квифф',
  bun: 'Пучок',
  wavy: 'Волнистые',
  ponytail: 'Хвост',
  fringe: 'Чёлка набок',
  part: 'Прямой пробор',
};

preload(DOLL);

const scale = ref(2);
const viewportWidth = useViewportWidth();
/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / scale.value));
const { x, frame } = useWalker(DOLL, useHeldDirection(), width);
x.value = Math.floor((width.value - DOLL.size) / 2);

// Keeps the doll at the same spot on screen, within the new walkable width
watch(scale, (next, prev) => {
  const maxX = Math.max(0, width.value - DOLL.size);
  x.value = Math.min(maxX, Math.round(x.value * prev / next));
});

/** Part name per slot, null for none. */
const names = reactive<Record<string, string | null>>(Object.fromEntries(
  DOLL.slots.map(slot => [slot.key, DOLL.defaultLook[slot.key]?.name ?? null]),
));
/** Colour per tinted slot. */
const colors = reactive<Record<string, string>>(Object.fromEntries(
  DOLL.slots.filter(slot => slot.tinted).map(slot => [slot.key, DOLL.defaultLook[slot.key]?.color ?? '#4a7bd0']),
));
const look = computed<Look>(() => Object.fromEntries(
  Object.entries(names).map(([key, name]) => [key, name ? { name, color: colors[key] } : null]),
));
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-neutral-800 text-neutral-400">
    <div class="flex items-center gap-4 p-4">
      <p>← → или A D — идти</p>
      <label class="flex items-center gap-2">
        Масштаб
        <select v-model="scale" class="bg-neutral-700">
          <option v-for="value in SCALES" :key="value" :value="value">×{{ value }}</option>
        </select>
      </label>
      <label v-for="slot in DOLL.slots" :key="slot.key" class="flex items-center gap-2">
        {{ slot.label }}
        <select v-model="names[slot.key]" class="bg-neutral-700">
          <option :value="null">Нет</option>
          <option v-for="name in slot.names" :key="name" :value="name">
            {{ LABELS[name] ?? name }}
          </option>
        </select>
        <template v-if="slot.tinted">
          <input
            v-model="colors[slot.key]"
            type="color"
            :list="`${slot.key}-palette`"
            class="bg-neutral-700"
          >
          <datalist v-if="slot.palette" :id="`${slot.key}-palette`">
            <option v-for="color in slot.palette" :key="color" :value="color" />
          </datalist>
        </template>
      </label>
    </div>
    <!-- Whole sprite px only, so the pixel art stays sharp -->
    <div class="absolute bottom-0 left-0" :style="{ translate: `${x * scale}px 0` }">
      <DollSprite :doll="DOLL" :frame="frame" :look="look" :scale="scale" />
    </div>
  </div>
</template>
