<script setup lang="ts">
import { emoteImage, type Emote } from '../twitch/emotes';

/**
 * size — высота картинки в пикселях; без него эмодзи встраивается в строку текста
 */
const props = defineProps<{ emote: Emote; overlays: Emote[]; size?: number }>();

function lightSrcset(e: Emote) {
  const { src, srcset } = emoteImage(e, 'light', !!props.size);
  return `${src} 1x, ${srcset}`;
}
</script>

<template>
  <span
    :class="[cn.root, !size && cn.rootInline]"
    :style="size ? { '--emote-size': `${size}px` } : undefined"
    :title="[emote, ...overlays].map((e) => e.name).join(' ')"
  >
    <picture v-for="(e, i) in [emote, ...overlays]" :key="i" :class="cn.layer">
      <source
        v-if="e.provider === 'twitch'"
        media="(prefers-color-scheme: light)"
        :srcset="lightSrcset(e)"
      />
      <img v-bind="emoteImage(e, 'dark', !!size)" :class="cn.image" :alt="e.name" />
    </picture>
  </span>
</template>

<style module="cn">
.root {
  /* Все слои в одной ячейке грида: zero-width эмодзи ложатся поверх основного */
  display: inline-grid;
  vertical-align: middle;
}

.rootInline {
  /* Не раздвигает строку текста: -4px при высоте 28px */
  margin: calc(var(--emote-size, 28px) / -7) 0;
}

.layer {
  grid-area: 1 / 1;
  place-self: center;
  display: flex;
}

.image {
  /* Высота фиксирована заранее, чтобы загрузка картинок не сбивала автопрокрутку */
  height: var(--emote-size, 28px);
}
</style>
