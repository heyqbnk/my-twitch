<script lang="ts" setup>
import TwitchChatBadge from './TwitchChatBadge.vue';
import type { ChatMessage } from '../_composables/useTwitchChat';
import type { Badge, BadgeMap } from '../_utils/badges';

import { type EmoteMap, expandEmotes } from '../_utils/emotes';

const props = defineProps<{
  /**
   * Null while badges are loading.
   */
  badges: BadgeMap | null;
  emotes: EmoteMap;
  message: ChatMessage;
}>();

/**
 * Delay between printed characters while the message is short enough.
 */
const STREAM_CHAR_MS = 40;
/**
 * Long messages speed up to be printed in full within this time.
 */
const STREAM_MAX_MS = 1000;

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Message parts with text split into graphemes, so emoji sequences are never torn apart. An emote
 * is printed as a single character.
 */
const segments = computed(() => expandEmotes(props.message.parts, props.emotes).map(part => ({
  chars: part.type === 'text' ? Array.from(graphemes.segment(part.text), s => s.segment) : null,
  part,
})));
const total = computed(() => segments.value
  .reduce((sum, { chars }) => sum + (chars ? chars.length : 1), 0));

const elapsed = ref(0);
let frame = 0;

/**
 * Delay between printed characters. The newest character fades in for the same time, so it is
 * fully visible by the time the next one appears.
 */
const step = computed(() => Math.min(STREAM_CHAR_MS, STREAM_MAX_MS / Math.max(1, total.value)));
/**
 * How many characters are printed. The first one is shown right away.
 */
const shown = computed(() => Math.min(total.value, Math.floor(elapsed.value / step.value) + 1));

/**
 * The printed portion of each part: `text` is the settled text, `fresh` is the newest printed
 * character that is still fading in, `shown` tells whether the part is visible at all.
 */
const pieces = computed(() => {
  let left = shown.value;
  return segments.value.map(({ chars, part }) => {
    const size = chars ? chars.length : 1;
    const visible = Math.max(0, Math.min(size, left));
    // The part holding the newest character is the one where printing stops.
    const isLast = left > 0 && left <= size;
    left -= size;
    return {
      fresh: chars && isLast ? chars[visible - 1] : undefined,
      part,
      shown: visible > 0,
      text: chars ? chars.slice(0, isLast ? visible - 1 : visible).join('') : '',
    };
  });
});

onMounted(() => {
  const begin = performance.now();
  const tick = (now: number) => {
    elapsed.value = now - begin;
    if (shown.value < total.value) {
      frame = requestAnimationFrame(tick);
    }
  };
  frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

/**
 * While badges are loading, every badge from the tag keeps its place as a placeholder.
 * Afterwards badges unknown to the APIs are dropped.
 */
const messageBadges = computed(() => props.message.badges.flatMap((key): {
  badge?: Badge;
  key: string;
}[] => {
  if (!props.badges) {
    return [{ badge: undefined, key }];
  }
  const badge = props.badges.get(key);
  return badge ? [{ badge, key }] : [];
}));
</script>

<template>
  <p class="leading-7 wrap-break-word">
    <TwitchChatBadge v-for="{ badge, key } in messageBadges" :key :badge/>
    <span :class="cn.author" :style="{ '--chat-author-color': message.color ?? undefined }">
      {{ message.author }}
    </span>
    <span>{{ ' ' }}</span>
    <template v-for="(piece, i) in pieces" :key="i">
      <!-- An emote fades in once printing reaches it. -->
      <Transition
        v-if="piece.part.type === 'emote'"
        :enter-active-class="cn.emoteEnterActive"
        :enter-from-class="cn.emoteEnterFrom"
        appear
      >
        <img
          v-if="piece.shown"
          class="inline h-7 align-middle"
          :src="piece.part.emote.src"
          :srcset="piece.part.emote.srcset"
          :alt="piece.part.emote.name"
          :title="piece.part.emote.name"
        >
      </Transition>
      <!-- The only per-character element: a new key restarts the fade for each new character. -->
      <template v-else>{{ piece.text }}<span
        v-if="piece.fresh"
        :key="shown"
        :class="cn.fresh"
        :style="{ animationDuration: `${step}ms` }"
      >{{ piece.fresh }}</span></template>
    </template>
  </p>
</template>

<style module="cn">
.author {
  color: var(--chat-author-color, var(--chat-default-author-color));
  font-weight: 700;
}

/* `animation-duration` comes from the template: it equals the printing step. */
.fresh {
  animation-name: fadeIn;
  animation-timing-function: ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
}

.emoteEnterActive {
  transition: opacity 0.3s ease-out;
}

.emoteEnterFrom {
  opacity: 0;
}
</style>
