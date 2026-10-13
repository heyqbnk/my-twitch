<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useDelayQuery, useScaleQuery, useStayQuery } from '../composables/useChannelQuery';
import { useFollowDates } from '../composables/useFollowDates';
import { provideMessageParts } from '../composables/useMessageParts';
import { useSceneActors } from '../composables/useSceneActors';
import { useThirdPartyEmotes } from '../composables/useThirdPartyEmotes';
import { useTwitchChat } from '../composables/useTwitchChat';
import { needsFollowDate } from '../scene/actorPriority';
import ChatScene from './ChatScene.vue';

const props = defineProps<{ channel: string }>();

const channel = toRef(props, 'channel');
const { messages, roomId } = useTwitchChat(channel, useDelayQuery());
provideMessageParts(useThirdPartyEmotes(roomId));
// Дата фоллова нужна только зрителям без роли и подписки
const followLogins = computed(() => [
  ...new Set(messages.value.filter(needsFollowDate).map(m => m.login)),
]);
const actors = useSceneActors(messages, useStayQuery(), useFollowDates(channel, followLogins));
const scale = useScaleQuery();
</script>

<template>
  <ChatScene class="channel" :actors="actors" :scale="scale" />
</template>

<style scoped>
.channel {
  height: 100%;
}
</style>
