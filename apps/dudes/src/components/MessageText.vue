<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useMessageParts } from '../composables/useMessageParts';
import type { ChatMessage } from '../composables/useTwitchChat';
import ChatEmote from './ChatEmote.vue';

// stream — сообщение «печатается»: символ (эмодзи — целиком) раз в STREAM_CHAR_MS,
// а длинное ускоряется, чтобы целиком появиться не дольше чем за STREAM_MAX_MS
const props = defineProps<{ message: ChatMessage; stream?: boolean }>();
// Сообщение напечатано целиком
const emit = defineEmits<{ streamed: [] }>();

const STREAM_CHAR_MS = 40;
const STREAM_MAX_MS = 2000;

const messageParts = useMessageParts();
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Части сообщения с разбивкой текста на графемы: эмодзи-последовательности не рвутся
const segments = computed(() => messageParts(props.message).map(part => (
  part.type === 'text'
    ? { part, chars: Array.from(graphemes.segment(part.text), s => s.segment) }
    : { part, chars: null }
)));
const total = computed(() => segments.value
  .reduce((sum, { chars }) => sum + (chars ? chars.length : 1), 0));

const elapsed = ref(0);
let frame = 0;

function startStream() {
  cancelAnimationFrame(frame);
  if (!props.stream) return;
  elapsed.value = 0;
  const begin = performance.now();
  const tick = (now: number) => {
    elapsed.value = now - begin;
    if (shown.value < total.value) frame = requestAnimationFrame(tick);
    else emit('streamed');
  };
  frame = requestAnimationFrame(tick);
}

watch(() => props.message, startStream, { immediate: true });
onBeforeUnmount(() => cancelAnimationFrame(frame));

// Сколько символов уже видно. Первый — сразу
const shown = computed(() => {
  if (!props.stream) return total.value;
  const step = Math.min(STREAM_CHAR_MS, STREAM_MAX_MS / Math.max(1, total.value));
  return Math.min(total.value, Math.floor(elapsed.value / step) + 1);
});

// Что из каждой части уже напечатано: text — видимый текст, shown — видна ли часть хоть немного,
// pending — допечатана ли не до конца
const pieces = computed(() => {
  let left = shown.value;
  return segments.value.map(({ part, chars }) => {
    const size = chars ? chars.length : 1;
    const visible = Math.max(0, Math.min(size, left));
    left -= size;
    return {
      part,
      text: chars ? chars.slice(0, visible).join('') : '',
      shown: visible > 0,
      pending: visible < size,
    };
  });
});

// Слот (например, курсор терминала) стоит сразу за напечатанным: в первой недопечатанной части
// или после всех
const cursorAt = computed(() => {
  const i = pieces.value.findIndex(piece => piece.pending);
  return i === -1 ? pieces.value.length : i;
});
</script>

<template>
  <span>
    <template v-for="(piece, i) in pieces" :key="i">
      <template v-if="piece.part.type === 'emote'">
        <slot v-if="i === cursorAt" />
        <!-- Эмодзи проявляется, когда печать до него добралась -->
        <Transition name="message-text__emote" :appear="stream">
          <ChatEmote v-if="piece.shown" :emote="piece.part.emote" :overlays="piece.part.overlays" />
        </Transition>
      </template>
      <!-- Без переноса между текстом и тегом: он добавил бы пробел -->
      <template v-else>{{ piece.text }}<slot v-if="i === cursorAt" /></template>
    </template>
    <slot v-if="cursorAt === pieces.length" />
    <!-- Невидимая копия всего сообщения нулевой высоты: облачко сразу принимает итоговую ширину,
         а по высоте растёт вместе с напечатанными строками. Стоит последней, чтобы не разрывать
         строку с префиксом ::before у корня -->
    <span v-if="stream" class="message-text__ghost" aria-hidden="true">
      <template v-for="(part, i) in messageParts(message)" :key="i">
        <ChatEmote v-if="part.type === 'emote'" :emote="part.emote" :overlays="part.overlays" />
        <template v-else>{{ part.text }}</template>
      </template>
      <slot />
    </span>
  </span>
</template>

<style scoped>
.message-text__emote-enter-active {
  transition: opacity 0.3s ease-out;
}

.message-text__emote-enter-from {
  opacity: 0;
}

.message-text__ghost {
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}
</style>
