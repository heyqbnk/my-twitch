<script lang="ts" setup>
import { type Emote, emoteImage } from '../_utils/emotes';

const props = defineProps<{
  /**
   * How many times the emote is repeated in a row: above 1 a badge "x{count}" is shown.
   */
  count?: number;
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
    <span v-if="count && count > 1" :class="cn.count">x{{ count }}</span>
  </span>
</template>

<style module="cn">
.root {
  /* All layers share one grid cell: zero-width emotes lie over the main one */
  position: relative;
  display: inline-grid;
  vertical-align: middle;
}

.rootInline {
  /* Sticks out of the line by a seventh of its height at the top and bottom: a 20px emote
     doesn't stretch a line of 13px text */
  margin: calc(var(--emote-size, 28px) / -7) 0;
}

.layer {
  display: flex;
  grid-area: 1 / 1;
  place-self: center;
}

/* In the top right corner, out of the flow: a long counter doesn't widen the emote. It stays
   within the emote, else the bubble's and the sign's scroll areas clip it */
.count {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0 0.25em;
  border-radius: 0.4em;
  font-size: max(9px, calc(var(--emote-size, 28px) * 0.32));
  font-weight: 700;
  line-height: 1.2;
  color: var(--dudes-name-color);
  white-space: nowrap;
  background: var(--dudes-outline-color);
}

/* The parent may round the images with --emote-radius */
.image {
  /* The height is fixed up front, so loading images doesn't shift the layout */
  height: var(--emote-size, 28px);
  border-radius: var(--emote-radius, 0);
}
</style>
