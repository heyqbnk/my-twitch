<script lang="ts" setup>
import TwitchChatMessage from './_components/TwitchChatMessage.vue';
import { useChannelAssets } from './_composables/useChannelAssets';
import { MESSAGE_ID_ATTR, useOffscreenMessages } from './_composables/useOffscreenMessages';
import { useTwitchChat } from './_composables/useTwitchChat';

const props = defineProps<{
  /**
   * CSS `background` value of the widget. A hex color may omit the leading `#`, so it does not
   * have to be escaped in the URL. Transparent when not set.
   */
  background?: string;
  /**
   * Login of the Twitch channel whose chat is shown.
   */
  channel: string;
}>();

const { messages, removeMessages, roomId } = useTwitchChat(() => props.channel);
const { badges, emotes } = useChannelAssets(roomId);

const root = useTemplateRef('root');
// A message that left the screen is never shown again, so it is dropped from memory right away.
useOffscreenMessages(root, messages, removeMessages);

const background = computed(() => {
  const value = props.background?.trim();
  if (!value) {
    return undefined;
  }
  return /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? `#${value}` : value;
});
</script>

<template>
  <main ref="root" :class="cn.root" :style="{ '--chat-background': background }">
    <TwitchChatMessage
      v-for="message in messages"
      :key="message.id"
      :[MESSAGE_ID_ATTR]="message.id"
      :message
      :badges
      :emotes
    />
  </main>
</template>

<style module="cn">
.root {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  height: 100dvh;
  padding: 8px;
  overflow: hidden;
  background: var(--chat-background, transparent);
  color: var(--chat-text-color);
  font-size: 18px;
  text-shadow: 0 1px 2px var(--chat-text-shadow-color);
}
</style>
