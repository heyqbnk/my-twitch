<script setup lang="ts">
import { useMessageParts } from '../composables/useMessageParts';
import type { ChatMessage } from '../composables/useTwitchChat';
import ChatEmote from './ChatEmote.vue';

defineProps<{ message: ChatMessage }>();

const messageParts = useMessageParts();
</script>

<template>
  <span>
    <template v-for="(part, i) in messageParts(message)" :key="i">
      <ChatEmote v-if="part.type === 'emote'" :emote="part.emote" :overlays="part.overlays" />
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>
