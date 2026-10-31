<script lang="ts" setup>
import ChatEmote from './ChatEmote.vue';

import { useMentionColor } from '../_composables/useMentionColor';
import { useMessageParts } from '../_composables/useMessageParts';
import type { ChatMessage } from '../_composables/useTwitchChat';
import { LINK_ICON } from '../_utils/pixelIcon';

const props = defineProps<{
  message: ChatMessage;
  /**
   * Text in front of the message, e.g. a terminal prompt. Its color is --message-prefix-color.
   */
  prefix?: string;
  /**
   * The message is "typed": a character (an emote as a whole) every STREAM_CHAR_MS, and a long
   * one speeds up to appear in full within STREAM_MAX_MS.
   */
  stream?: boolean;
}>();

const emit = defineEmits<{
  /**
   * The message is typed in full.
   */
  streamed: [];
}>();

const STREAM_CHAR_MS = 40;
const STREAM_MAX_MS = 2000;

const messageParts = useMessageParts();
const mentionColor = useMentionColor();
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const split = (text: string) => Array.from(graphemes.segment(text), s => s.segment);

// Message parts with text, link domains and mention nicks split into graphemes, so emoji
// sequences are never torn apart
const segments = computed(() => messageParts(props.message).map(part => {
  if (part.type === 'text') {
    return { chars: split(part.text), part };
  }
  if (part.type === 'link') {
    return { chars: split(part.domain), part };
  }
  if (part.type === 'mention') {
    return { chars: split(part.name), part };
  }
  return { chars: null, part };
}));
const total = computed(() => segments.value
  .reduce((sum, { chars }) => sum + (chars ? chars.length : 1), 0));

const elapsed = ref(0);
let frame = 0;

// How many characters are visible already. The first one is visible right away
const shown = computed(() => {
  if (!props.stream) {
    return total.value;
  }
  const step = Math.min(STREAM_CHAR_MS, STREAM_MAX_MS / Math.max(1, total.value));
  return Math.min(total.value, Math.floor(elapsed.value / step) + 1);
});

function startStream() {
  cancelAnimationFrame(frame);
  if (!props.stream) {
    return;
  }
  elapsed.value = 0;
  const begin = performance.now();
  const tick = (now: number) => {
    elapsed.value = now - begin;
    if (shown.value < total.value) {
      frame = requestAnimationFrame(tick);
    } else {
      emit('streamed');
    }
  };
  frame = requestAnimationFrame(tick);
}

watch(() => props.message, startStream, { immediate: true });
onBeforeUnmount(() => cancelAnimationFrame(frame));

// What of each part is typed already: `text` is the visible text, `shown` is whether the part is
// visible at all, `pending` is whether it is not typed in full
const pieces = computed(() => {
  let left = shown.value;
  return segments.value.map(({ chars, part }) => {
    const size = chars ? chars.length : 1;
    const visible = Math.max(0, Math.min(size, left));
    left -= size;
    return {
      part,
      pending: visible < size,
      shown: visible > 0,
      text: chars ? chars.slice(0, visible).join('') : '',
    };
  });
});

// The slot (e.g. a terminal cursor) goes right after the typed text: into the first part not
// typed in full, or after all of them
const cursorAt = computed(() => {
  const i = pieces.value.findIndex(piece => piece.pending);
  return i === -1 ? pieces.value.length : i;
});
</script>

<template>
  <span>
    <span v-if="prefix" :class="cn.prefix">{{ prefix }}</span>
    <template v-for="(piece, i) in pieces" :key="i">
      <template v-if="piece.part.type === 'emote'">
        <slot v-if="i === cursorAt"/>
        <!-- The emote fades in once the typing reaches it -->
        <Transition
          :enter-active-class="cn.emoteEnterActive"
          :enter-from-class="cn.emoteEnterFrom"
          :appear="stream"
        >
          <ChatEmote
            v-if="piece.shown"
            :count="piece.part.count"
            :emote="piece.part.emote"
            :overlays="piece.part.overlays"
          />
        </Transition>
      </template>
      <!-- The link's domain is typed inside its plate -->
      <template v-else-if="piece.part.type === 'link'">
        <span v-if="piece.shown" :class="[cn.link, cn.linkWithIcon]">{{ piece.text }}</span>
        <slot v-if="i === cursorAt"/>
      </template>
      <!-- A mention is the same plate, without the icon and the @, in the mentioned one's color -->
      <template v-else-if="piece.part.type === 'mention'">
        <span
          v-if="piece.shown"
          :class="[cn.link, cn.linkMention]"
          :style="{ '--link-color': mentionColor(piece.part.name) }"
        >{{ piece.text }}</span>
        <slot v-if="i === cursorAt"/>
      </template>
      <!-- No line break between the text and the tag: it would add a space -->
      <template v-else>{{ piece.text }}<slot v-if="i === cursorAt"/></template>
    </template>
    <slot v-if="cursorAt === pieces.length"/>
    <!-- An invisible zero-height copy of the whole message: the bubble takes its final width
         right away and grows in height with the typed lines. It goes last, so it doesn't break
         the line with the prefix. A parent measuring the lines finds it by
         data-message-ghost -->
    <span v-if="stream" :class="cn.ghost" aria-hidden="true" data-message-ghost>
      <span v-if="prefix" :class="cn.prefix">{{ prefix }}</span>
      <template v-for="(part, i) in messageParts(message)" :key="i">
        <ChatEmote
          v-if="part.type === 'emote'"
          :count="part.count"
          :emote="part.emote"
          :overlays="part.overlays"
        />
        <span
          v-else-if="part.type === 'link'"
          :class="[cn.link, cn.linkWithIcon]"
        >{{ part.domain }}</span>
        <span
          v-else-if="part.type === 'mention'"
          :class="[cn.link, cn.linkMention]"
        >{{ part.name }}</span>
        <template v-else>{{ part.text }}</template>
      </template>
      <slot/>
    </span>
  </span>
</template>

<style module="cn">
.prefix {
  color: var(--message-prefix-color, inherit);
}

.emoteEnterActive {
  transition: opacity 0.3s ease-out;
}

.emoteEnterFrom {
  opacity: 0;
}

/* The domain is always lowercase: the plate is trimmed to the lowercase letters' height (from
   the x-height to the baseline), and equal paddings put the letters right in the middle.
   `--link-color` is overridden on a mention plate with the mentioned one's color */
.link {
  --link-color: var(--dudes-link-color);

  display: inline-flex;
  align-items: center;
  padding-inline: 0.4em;
  border-radius: 0.3em;
  font-family: ui-monospace, Consolas, monospace;
  color: var(--link-color);
  background: color-mix(in srgb, var(--link-color) 18%, transparent);
  white-space: nowrap;
  text-box: trim-both ex alphabetic;
}

/* Without text-box the background spans from the capitals' top to the descenders' bottom: there
   is more room above the lowercase letters than below them, so roughly the difference is added
   below */
@supports not (text-box: trim-both ex alphabetic) {
  .link {
    padding-block: 0.05em 0.25em;
  }
}

/* A nick is written any way, with capitals: the plate is trimmed to the capitals' height */
.linkMention {
  text-box: trim-both cap alphabetic;
}

/* Without text-box there is about as much room above the capitals as below the baseline */
@supports not (text-box: trim-both cap alphabetic) {
  .linkMention {
    padding-block: 0.05em;
  }
}

/* A pixel chain link in front of the domain, as a mask, so it takes the link's color. An icon
   pixel is a dude's pixel: --ui on the scene is half its scale */
.linkWithIcon::before {
  --icon-px: calc(var(--ui, 1px) * 2);

  content: '';
  display: inline-block;
  width: calc(var(--icon-px) * v-bind('LINK_ICON.width') / 1.5);
  height: calc(var(--icon-px) * v-bind('LINK_ICON.height') / 1.5);
  margin-right: 0.25em;
  vertical-align: -0.05em;
  background: currentcolor;
  mask: v-bind('LINK_ICON.mask') center / 100% 100% no-repeat;
}

.ghost {
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}
</style>
