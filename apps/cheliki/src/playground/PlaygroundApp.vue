<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue';
import DollSprite from '../doll/DollSprite.vue';
import { BROWS, EYES, loadBody, MOUTHS, type Face } from '../doll/face';
import { FRAMES, SPRITE_SIZE } from '../doll/paperDoll';
import { useBlink } from '../doll/useBlink';
import { useHeldDirection } from './useHeldDirection';
import { useWalker } from './useWalker';

const SCALES = [1, 2, 3, 4];

// Parts without a label (new layers in base.aseprite) show their name
const EYE_LABELS: Record<string, string> = {
  bead: 'Бусинки',
  open: 'Открытые',
  sleepy: 'Сонные',
  lashes: 'С ресничкой',
  anime: 'Аниме',
  happy: 'Довольные',
};
const BROW_LABELS: Record<string, string> = {
  thin: 'Тонкие',
  thick: 'Густые',
  arched: 'Дугой',
  stern: 'Суровые',
  angular: 'Угловатые',
  feathered: 'Пушистые',
  tapered: 'Сужающиеся',
  worried: 'Грустные',
};
const MOUTH_LABELS: Record<string, string> = {
  neutral: 'Ровный',
  smile: 'Улыбка',
  grin: 'Улыбка с зубами',
  laugh: 'Смех',
  smirk: 'Ухмылка',
};

for (const frame of FRAMES) void loadBody(frame);

const viewportWidth = ref(window.innerWidth);
function onResize() {
  viewportWidth.value = window.innerWidth;
}
window.addEventListener('resize', onResize);
onScopeDispose(() => window.removeEventListener('resize', onResize));

const scale = ref(1);

/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / scale.value));
const direction = useHeldDirection();
const { x, frame } = useWalker(direction, width);
x.value = Math.floor((width.value - SPRITE_SIZE) / 2);

// Keeps the doll at the same spot on screen, within the new walkable width
watch(scale, (next, prev) => {
  const maxX = Math.max(0, width.value - SPRITE_SIZE);
  x.value = Math.min(maxX, Math.round(x.value * prev / next));
});

const face = reactive<Face>({ eyes: 'open', brows: 'thin', mouth: 'smile' });
const blink = useBlink();
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
      <label class="flex items-center gap-2">
        Глаза
        <select v-model="face.eyes" class="bg-neutral-700">
          <option v-for="eyes in EYES" :key="eyes" :value="eyes">
            {{ EYE_LABELS[eyes] ?? eyes }}
          </option>
        </select>
      </label>
      <label class="flex items-center gap-2">
        Брови
        <select v-model="face.brows" class="bg-neutral-700">
          <option v-for="brows in BROWS" :key="brows" :value="brows">
            {{ BROW_LABELS[brows] ?? brows }}
          </option>
        </select>
      </label>
      <label class="flex items-center gap-2">
        Рот
        <select v-model="face.mouth" class="bg-neutral-700">
          <option v-for="mouth in MOUTHS" :key="mouth" :value="mouth">
            {{ MOUTH_LABELS[mouth] ?? mouth }}
          </option>
        </select>
      </label>
    </div>
    <!-- Whole sprite px only, so the pixel art stays sharp -->
    <div class="absolute bottom-0 left-0" :style="{ translate: `${x * scale}px 0` }">
      <DollSprite :frame="frame" :face="face" :blink="blink" :scale="scale" />
    </div>
  </div>
</template>
