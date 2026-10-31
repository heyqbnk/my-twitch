<script lang="ts" setup>
import { type Emote, emoteImage } from '../_utils/emotes';

const props = defineProps<{
  emote: Emote;
  overlays: Emote[];
  /**
   * Image height in px. Without it the emote fits into a line of text.
   */
  size?: number;
}>();

function lightSrcset(e: Emote) {
  const { src, srcset } = emoteImage(e, 'light', !!props.size);
  return `${src} 1x, ${srcset}`;
}
</script>

<template>
  <span
    :class="[cn.root, !size && cn.rootInline]"
    :style="size ? { '--emote-size': `${size}px` } : undefined"
    :title="[emote, ...overlays].map(e => e.name).join(' ')"
  >
    <picture v-for="(e, i) in [emote, ...overlays]" :key="i" :class="cn.layer">
      <source
        v-if="e.provider === 'twitch'"
        media="(prefers-color-scheme: light)"
        :srcset="lightSrcset(e)"
      >
      <img v-bind="emoteImage(e, 'dark', !!size)" :class="cn.image" :alt="e.name">
    </picture>
  </span>
</template>

<style module="cn">
.root {
  /* All layers share one grid cell: zero-width emotes lie over the main one */
  display: inline-grid;
  vertical-align: middle;
}

.rootInline {
  /* Doesn't stretch the line of text: -4px at 28px height */
  margin: calc(var(--emote-size, 28px) / -7) 0;
}

.layer {
  display: flex;
  grid-area: 1 / 1;
  place-self: center;
}

/* The parent may round the images with --emote-radius */
.image {
  /* The height is fixed up front, so loading images doesn't shift the layout */
  height: var(--emote-size, 28px);
  border-radius: var(--emote-radius, 0);
}
</style>
