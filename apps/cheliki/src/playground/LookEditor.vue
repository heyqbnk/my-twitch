<script setup lang="ts">
import { computed } from 'vue';
import { dollLook } from '../doll-chat/dollLook';
import DollSprite from '../doll/DollSprite.vue';
import type { Doll, Look, Slot } from '../doll/paperDoll';
import { actorColor } from '../scene/actorStyle';
import controls from './controls.module.css';
import { randomUserId, withNickColor, type Dude } from './usePlayground';

const props = defineProps<{ doll: Doll; dude: Dude }>();

const SLOT_LABELS: Record<string, string> = {
  pants: 'Штаны',
  shoes: 'Обувь',
  top: 'Верх',
  eyes: 'Глаза',
  hair: 'Волосы',
  neck: 'Шея',
  mouth: 'Во рту',
  eyewear: 'Очки',
  headwear: 'Голова',
};
const DEFAULT_COLOR = '#808080';

const nickColor = computed(() => actorColor(props.dude));
const look = computed(() => withNickColor(
  props.dude.look ?? dollLook(props.doll, { ...props.dude, color: nickColor.value }),
  nickColor.value,
));
const isAuto = computed(() => props.dude.look === null);

/* eslint-disable vue/no-mutating-props -- the viewer is the playground's shared reactive state */
/** The first edit turns the automatic look into a manual one. */
function edit(change: (look: Look) => void) {
  const next = structuredClone(look.value);
  change(next);
  props.dude.look = next;
}

function resetLook() {
  props.dude.look = null;
}

/** A new Twitch ID gives a new automatic look. */
function reroll() {
  props.dude.userId = randomUserId();
  props.dude.look = null;
}
/* eslint-enable vue/no-mutating-props */

function setName(slot: Slot, name: string) {
  edit(l => {
    const color = l[slot.key]?.color ?? slot.palette?.[0] ?? DEFAULT_COLOR;
    l[slot.key] = name ? { name, color } : null;
  });
}

function setColor(slot: Slot, color: string) {
  edit(l => {
    const part = l[slot.key];
    if (part) part.color = color;
  });
}

const value = (event: Event) => (event.target as HTMLInputElement).value;
/** A colour that isn't #rrggbb (hsl from the palette) can't be shown by input[type=color]. */
const toHex = (color?: string) => (color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000');
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="flex-1 text-xs text-neutral-400">
      {{ isAuto ? 'По Twitch ID, как на сцене' : 'Задана вручную' }}
    </span>
    <button
      type="button"
      :class="controls.button"
      :disabled="isAuto"
      @click="resetLook"
    >
      Авто
    </button>
    <button
      type="button"
      :class="controls.button"
      title="Новый Twitch ID — новая автоматическая внешность"
      @click="reroll"
    >
      🎲
    </button>
  </div>

  <div class="flex justify-center rounded bg-neutral-700 py-1">
    <DollSprite :doll="doll" :frame="doll.idle" :look="look" :scale="2" />
  </div>

  <div
    v-for="slot in doll.slots"
    :key="slot.key"
    class="grid grid-cols-[60px_1fr_36px] items-center gap-1.5"
  >
    <span>{{ SLOT_LABELS[slot.key] ?? slot.key }}</span>
    <select
      :class="controls.input"
      :value="look[slot.key]?.name ?? ''"
      @change="setName(slot, value($event))"
    >
      <option value="">— нет —</option>
      <option v-for="name in slot.names" :key="name" :value="name">{{ name }}</option>
    </select>
    <span v-if="slot.key === 'top'" class="text-xs text-neutral-500">ник</span>
    <input
      v-else-if="slot.tinted"
      type="color"
      :class="controls.color"
      :disabled="!look[slot.key]"
      :value="toHex(look[slot.key]?.color)"
      @input="setColor(slot, value($event))"
    />
    <div v-if="slot.palette && look[slot.key]" class="col-span-3 flex flex-wrap gap-1 pl-[66px]">
      <button
        v-for="color in slot.palette"
        :key="color"
        type="button"
        :class="[cn.swatch, look[slot.key]?.color === color && cn.swatchActive]"
        :style="{ background: color }"
        :title="color"
        @click="setColor(slot, color)"
      />
    </div>
  </div>
</template>

<style module="cn">
.swatch {
  width: 16px;
  height: 16px;
  border: 1px solid rgb(0 0 0 / 50%);
  border-radius: 3px;
  cursor: pointer;
}

.swatchActive {
  outline: 2px solid white;
}
</style>
