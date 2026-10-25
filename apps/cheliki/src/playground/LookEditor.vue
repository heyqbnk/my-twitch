<script setup lang="ts">
import { computed } from 'vue';
import type { AccessoryName, PantsName, ShoesName, TopName } from '../scene/actorStyle';
import { WALKER } from '../scene/walkerSprite';
import { lookOf, randomUserId, type Dude, type Look } from './usePlayground';

const props = defineProps<{ dude: Dude }>();

const TOPS = Object.keys(WALKER.clothes.tops) as TopName[];
const PANTS = Object.keys(WALKER.clothes.pants) as PantsName[];
const SHOES = Object.keys(WALKER.clothes.shoes) as ShoesName[];
const ACCESSORIES = Object.keys(WALKER.accessories) as AccessoryName[];
const DEFAULT_ACCESSORY_COLOR = '#e53935';

const look = computed(() => lookOf(props.dude));

/* eslint-disable vue/no-mutating-props -- зритель — общее реактивное состояние песочницы */
// Первая правка превращает автоматическую внешность в ручную
function edit(change: (look: Look) => void) {
  const next = structuredClone(look.value);
  change(next);
  props.dude.look = next;
}

function resetLook() {
  props.dude.look = null;
}

// Новый Twitch ID — новая автоматическая внешность
function reroll() {
  props.dude.userId = randomUserId();
  props.dude.look = null;
}
/* eslint-enable vue/no-mutating-props */

function accessory(name: AccessoryName) {
  return look.value.accessories.find(a => a.name === name);
}

// Аксессуары держим в порядке отрисовки из WALKER.accessories
function toggleAccessory(name: AccessoryName, on: boolean) {
  edit(l => {
    const colors = new Map(l.accessories.map(a => [a.name, a.color]));
    if (on) colors.set(name, colors.get(name) || DEFAULT_ACCESSORY_COLOR);
    else colors.delete(name);
    l.accessories = ACCESSORIES
      .filter(n => colors.has(n))
      .map(n => ({ name: n, color: colors.get(n)! }));
  });
}

function setAccessoryColor(name: AccessoryName, color: string) {
  edit(l => {
    const item = l.accessories.find(a => a.name === name);
    if (item) item.color = color;
  });
}

const isAuto = computed(() => props.dude.look === null);
const value = (event: Event) => (event.target as HTMLInputElement).value;
const checked = (event: Event) => (event.target as HTMLInputElement).checked;

// Цвет из палитры может быть не в #rrggbb — input[type=color] его не покажет, но и не сломается
const toHex = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? color : '#000000');
</script>

<template>
  <div class="look">
    <div class="look__actions">
      <span class="look__mode">{{ isAuto ? 'Внешность по Twitch ID' : 'Внешность вручную' }}</span>
      <button type="button" :disabled="isAuto" @click="resetLook">Авто</button>
      <button type="button" title="Новый Twitch ID — новая случайная внешность" @click="reroll">
        🎲
      </button>
    </div>

    <label class="look__row">
      <span>Причёска</span>
      <select :value="look.hairstyle" @change="edit(l => (l.hairstyle = Number(value($event))))">
        <option v-for="(name, i) in WALKER.hairstyles" :key="name" :value="i">{{ name }}</option>
      </select>
      <input
        type="color"
        :value="toHex(look.hairColor)"
        @input="edit(l => (l.hairColor = value($event)))"
      />
    </label>

    <label class="look__row">
      <span>Верх</span>
      <select
        :value="look.outfit.top"
        @change="edit(l => (l.outfit.top = value($event) as TopName))"
      >
        <option v-for="name in TOPS" :key="name" :value="name">{{ name }}</option>
      </select>
      <span class="look__hint">в цвет ника</span>
    </label>

    <label class="look__row">
      <span>Штаны</span>
      <select
        :value="look.outfit.pants"
        @change="edit(l => (l.outfit.pants = value($event) as PantsName))"
      >
        <option v-for="name in PANTS" :key="name" :value="name">{{ name }}</option>
      </select>
      <input
        type="color"
        :value="toHex(look.outfit.pantsColor)"
        @input="edit(l => (l.outfit.pantsColor = value($event)))"
      />
    </label>

    <label class="look__row">
      <span>Обувь</span>
      <select
        :value="look.outfit.shoes"
        @change="edit(l => (l.outfit.shoes = value($event) as ShoesName))"
      >
        <option v-for="name in SHOES" :key="name" :value="name">{{ name }}</option>
      </select>
      <input
        type="color"
        :value="toHex(look.outfit.shoesColor)"
        @input="edit(l => (l.outfit.shoesColor = value($event)))"
      />
    </label>

    <fieldset class="look__accessories">
      <legend>Аксессуары</legend>
      <label v-for="name in ACCESSORIES" :key="name" class="look__accessory">
        <input
          type="checkbox"
          :checked="!!accessory(name)"
          @change="toggleAccessory(name, checked($event))"
        />
        <span>{{ name }}</span>
        <input
          v-if="accessory(name)"
          type="color"
          :value="toHex(accessory(name)!.color)"
          @input="setAccessoryColor(name, value($event))"
        />
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.look {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.look__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.look__mode {
  flex: 1;
  font-size: 0.85em;
  opacity: 0.8;
}

.look__row {
  display: grid;
  grid-template-columns: 70px 1fr 40px;
  align-items: center;
  gap: 6px;
}

.look__hint {
  font-size: 0.75em;
  opacity: 0.6;
}

.look__accessories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px 8px;
  margin: 0;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.look__accessory {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
}

.look__accessory input[type='color'] {
  margin-left: auto;
}

input[type='color'] {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  background: none;
}
</style>
