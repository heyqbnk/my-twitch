<script setup lang="ts">
import { emoteImage, type Emote } from '../twitch/emotes';

// size — высота картинки в пикселях; без него эмодзи встраивается в строку текста
const props = defineProps<{ emote: Emote; overlays: Emote[]; size?: number }>();

function lightSrcset(e: Emote) {
  const { src, srcset } = emoteImage(e, 'light', !!props.size);
  return `${src} 1x, ${srcset}`;
}
</script>

<template>
  <span
    class="emote"
    :class="{ 'emote--inline': !size }"
    :style="size ? { '--emote-size': `${size}px` } : undefined"
    :title="[emote, ...overlays].map((e) => e.name).join(' ')"
  >
    <picture v-for="(e, i) in [emote, ...overlays]" :key="i">
      <source
        v-if="e.provider === 'twitch'"
        media="(prefers-color-scheme: light)"
        :srcset="lightSrcset(e)"
      />
      <img v-bind="emoteImage(e, 'dark', !!size)" :alt="e.name" />
    </picture>
  </span>
</template>

<style scoped>
.emote {
  /* Все слои в одной ячейке грида: zero-width эмодзи ложатся поверх основного */
  display: inline-grid;
  vertical-align: middle;
}

.emote--inline {
  margin: -4px 0;
}

.emote > picture {
  grid-area: 1 / 1;
  place-self: center;
  display: flex;
}

.emote img {
  /* Высота фиксирована заранее, чтобы загрузка картинок не сбивала автопрокрутку */
  height: var(--emote-size, 28px);
}
</style>
