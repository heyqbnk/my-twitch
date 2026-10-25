<script setup lang="ts">
import { computed, ref } from 'vue';
import { preload, type Doll, type Look, type Slot } from '../doll/paperDoll';
import { useViewportWidth } from '../doll/useViewportWidth';
import CrowdDude from './CrowdDude.vue';

const props = defineProps<{ doll: Doll }>();

const COUNT = 10;
const SCALES = [1, 2, 3, 4];

preload(props.doll);

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)} ${50 + Math.floor(Math.random() * 30)}% ${40 + Math.floor(Math.random() * 25)}%)`;

function slotColor(slot: Slot): string | undefined {
  if (slot.palette) return pick(slot.palette);
  return slot.tinted ? randomColor() : undefined;
}

function randomLooks(): Look[] {
  return Array.from({ length: COUNT }, () => Object.fromEntries(props.doll.slots.map(slot => (
    [slot.key, { name: pick(slot.names), color: slotColor(slot) }]
  ))));
}

const looks = ref(randomLooks());
// Remounts the dolls, so they also start over at new spots
const generation = ref(0);
function shuffle() {
  looks.value = randomLooks();
  generation.value++;
}

const scale = ref(2);
const viewportWidth = useViewportWidth();
/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / scale.value));
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-neutral-800 text-neutral-400">
    <div class="flex items-center gap-4 p-4">
      <label class="flex items-center gap-2">
        Масштаб
        <select v-model="scale" class="bg-neutral-700">
          <option v-for="value in SCALES" :key="value" :value="value">×{{ value }}</option>
        </select>
      </label>
      <button class="bg-neutral-700 px-2" @click="shuffle">Перемешать</button>
    </div>
    <CrowdDude
      v-for="(look, i) in looks"
      :key="`${generation}-${i}`"
      :doll="doll"
      :look="look"
      :width="width"
      :scale="scale"
    />
  </div>
</template>
