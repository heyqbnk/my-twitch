<script lang="ts" setup>
import DudesScene from './_components/DudesScene.vue';
import { parseChannel, parseDelay, parseScale, parseStay } from './_utils/sceneParams';

/**
 * Chatters of a Twitch channel as pixel dudes walking along the bottom of the screen, for an OBS
 * browser source. Invalid optional parameters fall back to their defaults.
 */
const props = defineProps<{
  /**
   * Login of the Twitch channel whose chat is shown. Case and a leading `#` are ignored.
   */
  channel: string;
  /**
   * Message display delay in seconds, may be fractional. A message deleted by a moderator (or
   * whose author is banned or timed out) meanwhile is never shown. No delay by default.
   */
  msgDelay?: string;
  /**
   * Dude size, 1–10: screen px per scene px. 2 by default.
   */
  scale?: string;
  /**
   * How long a dude stays on the scene after its last message, in minutes, may be fractional.
   * No limit by default.
   */
  stay?: string;
}>();

const { t } = useI18n({
  messages: {
    en: { invalidChannel: 'Invalid Twitch channel name: {channel}' },
    ru: { invalidChannel: 'Некорректное имя канала Twitch: {channel}' },
  },
});

const channelLogin = computed(() => parseChannel(props.channel));
</script>

<template>
  <ClientOnly v-if="channelLogin">
    <DudesScene
      :channel="channelLogin"
      :delay="parseDelay(msgDelay)"
      :scale="parseScale(scale)"
      :stay="parseStay(stay)"
    />
  </ClientOnly>
  <p v-else class="p-4">
    {{ t('invalidChannel', { channel }) }}
  </p>
</template>
