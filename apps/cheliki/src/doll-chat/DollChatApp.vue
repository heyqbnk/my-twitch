<script setup lang="ts">
import { computed } from 'vue';
import {
  useChannelQuery, useDelayQuery, useGroundQuery, useScaleQuery, useStayQuery,
} from '../composables/useChannelQuery';
import { useFollowDates } from '../composables/useFollowDates';
import { provideMentionColor } from '../composables/useMentionColor';
import { provideMessageParts } from '../composables/useMessageParts';
import { useSceneActors } from '../composables/useSceneActors';
import { useThirdPartyEmotes } from '../composables/useThirdPartyEmotes';
import SceneGround from '../components/SceneGround.vue';
import { useTwitchChat } from '../composables/useTwitchChat';
import { DOLL_64 } from '../doll/doll64';
import { preload } from '../doll/paperDoll';
import { useViewportWidth } from '../doll/useViewportWidth';
import { needsFollowDate } from '../scene/actorPriority';
import ChatDoll from './ChatDoll.vue';

const DOLL = DOLL_64;

preload(DOLL);

/**
 * Without a valid channel the chat stays idle and the page shows a hint
 */
const channel = useChannelQuery();
const { messages, roomId } = useTwitchChat(channel, useDelayQuery());
provideMessageParts(useThirdPartyEmotes(roomId));
provideMentionColor(messages);
/**
 * Only viewers without a role or a sub are ranked by their follow date
 */
const followLogins = computed(() => [
  ...new Set(messages.value.filter(needsFollowDate).map(m => m.login)),
]);
const actors = useSceneActors(
  messages,
  useStayQuery(),
  useFollowDates(computed(() => channel.value ?? ''), followLogins),
);
/**
 * No exit animation yet: a chatter who said goodbye just disappears
 */
const shown = computed(() => actors.value.filter(actor => !actor.leaving));

const scale = useScaleQuery();
const ground = useGroundQuery();
const viewportWidth = useViewportWidth();
/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / scale.value));
</script>

<template>
  <main v-if="channel" class="flex h-dvh flex-col overflow-hidden">
    <div class="relative flex-1">
      <ChatDoll
        v-for="actor in shown"
        :key="actor.login"
        :doll="DOLL"
        :actor="actor"
        :width="width"
        :scale="scale"
      />
    </div>
    <SceneGround :scale="scale" :height="ground" />
  </main>
  <p v-else class="p-4">
    Укажите канал в адресе: <code>?channel=имя_канала</code>
  </p>
</template>
