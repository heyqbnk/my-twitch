<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useMentionColor } from '../composables/useMentionColor';
import { useMessageParts } from '../composables/useMessageParts';
import type { ChatMessage } from '../composables/useTwitchChat';
import { LINK_ICON } from '../scene/pixelIcon';
import ChatEmote from './ChatEmote.vue';

// stream — сообщение «печатается»: символ (эмодзи — целиком) раз в STREAM_CHAR_MS,
// а длинное ускоряется, чтобы целиком появиться не дольше чем за STREAM_MAX_MS
const props = defineProps<{ message: ChatMessage; stream?: boolean }>();
// Сообщение напечатано целиком
const emit = defineEmits<{ streamed: [] }>();

const STREAM_CHAR_MS = 40;
const STREAM_MAX_MS = 2000;

const messageParts = useMessageParts();
const mentionColor = useMentionColor();
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const split = (text: string) => Array.from(graphemes.segment(text), s => s.segment);

// Части сообщения с разбивкой текста, доменов ссылок и ников упоминаний на графемы:
// эмодзи-последовательности не рвутся
const segments = computed(() => messageParts(props.message).map(part => {
  if (part.type === 'text') return { part, chars: split(part.text) };
  if (part.type === 'link') return { part, chars: split(part.domain) };
  if (part.type === 'mention') return { part, chars: split(part.name) };
  return { part, chars: null };
}));
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
      <!-- Домен ссылки печатается внутри своей плашки -->
      <template v-else-if="piece.part.type === 'link'">
        <span v-if="piece.shown" class="message-text__link">{{ piece.text }}</span>
        <slot v-if="i === cursorAt" />
      </template>
      <!-- Упоминание — та же плашка, но без иконки и @, цвета упомянутого -->
      <template v-else-if="piece.part.type === 'mention'">
        <span
          v-if="piece.shown"
          class="message-text__link message-text__mention"
          :style="{ '--link': mentionColor(piece.part.name) }"
        >{{ piece.text }}</span>
        <slot v-if="i === cursorAt" />
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
        <span v-else-if="part.type === 'link'" class="message-text__link">{{ part.domain }}</span>
        <span
          v-else-if="part.type === 'mention'"
          class="message-text__link message-text__mention"
        >{{ part.name }}</span>
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

/* Домен всегда в нижнем регистре: плашка обрезается по высоте строчных букв (от x-высоты
   до базовой линии), и равные отступы сверху и снизу ставят буквы ровно посередине */
.message-text__link {
  display: inline-flex;
  align-items: center;
  padding-inline: 0.4em;
  border-radius: 0.3em;
  font-family: var(--mono);
  color: var(--link);
  background: color-mix(in srgb, var(--link) 18%, transparent);
  white-space: nowrap;
  text-box: trim-both ex alphabetic;
}

/* Без text-box фон идёт от верха прописных до низа подстрочных: над строчными места больше,
   чем под ними, — добираем снизу примерно эту разницу */
@supports not (text-box: trim-both ex alphabetic) {
  .message-text__link {
    padding-block: 0.05em 0.25em;
  }
}

/* Ник пишется как угодно, с прописными: плашка обрезается по высоте прописных.
   Цвет --link — цвет упомянутого, задаётся на самой плашке */
.message-text__mention {
  text-box: trim-both cap alphabetic;
}

/* Без text-box над прописными места примерно столько же, сколько под базовой линией */
@supports not (text-box: trim-both cap alphabetic) {
  .message-text__mention {
    padding-block: 0.05em;
  }
}

/* Пиксельное звено цепи перед доменом — маской, чтобы красилось цветом ссылки.
   Пиксель иконки — как пиксель человечка: на сцене --ui — половина её масштаба */
.message-text__link:not(.message-text__mention)::before {
  --icon-px: calc(var(--ui, 1px) * 2);
  content: '';
  display: inline-block;
  width: calc(var(--icon-px) * v-bind('LINK_ICON.width') / 1.5);
  height: calc(var(--icon-px) * v-bind('LINK_ICON.height') / 1.5);
  margin-right: 0.25em;
  vertical-align: -0.05em;
  background: currentColor;
  mask: v-bind('LINK_ICON.mask') center / 100% 100% no-repeat;
}

.message-text__ghost {
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}
</style>
