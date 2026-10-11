<script setup lang="ts">
import { toRef } from 'vue'
import { useScaleQuery, useStayQuery } from '../composables/useChannelQuery'
import { provideMessageParts } from '../composables/useMessageParts'
import { useSceneActors } from '../composables/useSceneActors'
import { useThirdPartyEmotes } from '../composables/useThirdPartyEmotes'
import { useTwitchChat } from '../composables/useTwitchChat'
import ChatScene from './ChatScene.vue'

const props = defineProps<{ channel: string }>()

const { messages, roomId } = useTwitchChat(toRef(props, 'channel'))
provideMessageParts(useThirdPartyEmotes(roomId))
const actors = useSceneActors(messages, useStayQuery())
const scale = useScaleQuery()
</script>

<template>
  <ChatScene class="channel" :actors="actors" :scale="scale" />
</template>

<style scoped>
.channel {
  height: 100%;
}
</style>
