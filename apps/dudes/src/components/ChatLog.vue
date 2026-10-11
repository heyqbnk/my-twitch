<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage, ChatStatus } from '../composables/useTwitchChat'
import { actorColor } from '../scene/actorStyle'
import { ROLE_COLORS } from '../twitch/badges'
import MessageText from './MessageText.vue'
import RoleBadge from './RoleBadge.vue'

const props = defineProps<{
  channel: string
  status: ChatStatus
  error: string | null
  messages: ChatMessage[]
}>()

const STATUS_LABELS: Record<ChatStatus, string> = {
  idle: 'Нет канала',
  connecting: 'Подключение…',
  connected: 'В чате',
  disconnected: 'Переподключение…',
}
const statusLabel = computed(() => STATUS_LABELS[props.status])

const list = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)

function onScroll() {
  const el = list.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

watch(
  () => props.messages.length,
  async () => {
    if (!stickToBottom.value) return
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight })
  },
)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section class="chat">
    <header class="chat__header">
      <span class="chat__channel">#{{ channel }}</span>
      <span class="chat__status" :data-status="status">{{ statusLabel }}</span>
    </header>

    <p v-if="error" class="chat__error">{{ error }}</p>

    <ul ref="list" class="chat__messages" @scroll="onScroll">
      <li v-if="!messages.length" class="chat__empty">Ждём сообщений…</li>
      <li
        v-for="msg in messages"
        :key="msg.id"
        class="chat__message"
        :class="{
          'chat__message--highlighted': msg.highlighted,
          'chat__message--first': msg.firstMessage && !msg.highlighted,
        }"
      >
        <time class="chat__time">{{ formatTime(msg.timestamp) }}</time>
        <RoleBadge v-if="msg.role" :role="msg.role" :size="18" class="chat__badge" />
        <span
          class="chat__author"
          :class="{ 'chat__author--role': msg.role }"
          :style="{ color: msg.role ? ROLE_COLORS[msg.role] : actorColor(msg) }"
          >{{ msg.author }}</span>:
        <MessageText class="chat__text" :message="msg" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.chat__channel {
  font-weight: 600;
  color: var(--text-h);
}

.chat__status {
  font-size: 0.8em;
}

.chat__status[data-status='connected'] {
  color: #22c55e;
}

.chat__error {
  margin: 0;
  padding: 8px 16px;
  color: #ef4444;
}

.chat__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 8px 16px;
  list-style: none;
}

.chat__message {
  padding: 2px 0;
  overflow-wrap: anywhere;
}

.chat__message--first,
.chat__message--highlighted {
  margin: 4px 0;
  padding: 6px 10px;
  border-radius: 6px;
}

.chat__message--first {
  border: 1px solid var(--first-msg);
  background: color-mix(in srgb, var(--first-msg) 15%, transparent);
}

/* Награда «Выделить сообщение»: янтарная полоса слева и тёплый градиент, чтобы не путать с первым сообщением */
.chat__message--highlighted {
  margin-inline: -16px;
  padding-inline: 12px 16px;
  border-radius: 0;
  border-left: 4px solid var(--highlight);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--highlight) 28%, transparent),
    color-mix(in srgb, var(--highlight) 6%, transparent)
  );
}

.chat__time {
  margin-right: 6px;
  font-size: 0.75em;
  opacity: 0.6;
}

.chat__author {
  font-weight: 600;
  text-shadow: var(--text-outline);
  color: var(--accent);
}

.chat__badge {
  filter: var(--icon-outline);
}

/* Обычные ники и так полужирные — ники ролей ещё жирнее */
.chat__author--role {
  font-weight: 800;
}

.chat__text {
  color: var(--text-h);
}

.chat__empty {
  opacity: 0.6;
}
</style>
