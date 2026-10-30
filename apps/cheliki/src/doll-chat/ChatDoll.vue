<script setup lang="ts">
import { computed, onScopeDispose, ref, toRef, watch } from 'vue';
import MessageText from '../components/MessageText.vue';
import type { SceneActor } from '../composables/useSceneActors';
import { shownAt } from '../composables/useTwitchChat';
import DollSprite from '../doll/DollSprite.vue';
import type { Doll, Look } from '../doll/paperDoll';
import { useWanderer } from '../doll/useWanderer';
import { HIGHLIGHTED_PRIORITY, TALKING_PRIORITY } from '../scene/actorPriority';
import { dollLook, lookSeed } from './dollLook';

/** How long the message bubble is shown, in ms. */
const BUBBLE_MS = 6000;

const props = defineProps<{
  doll: Doll;
  actor: SceneActor;
  /** Walkable width in sprite px. */
  width: number;
  scale: number;
  /** Overrides the look picked for the chatter. */
  look?: Look;
}>();

const { x, frame } = useWanderer(props.doll, toRef(props, 'width'));
const look = computed(() => props.look ?? dollLook(props.doll, lookSeed(props.actor)));

const talking = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.actor.lastMessage,
  message => {
    clearTimeout(timer);
    // Messages from the history were shown before the reload, maybe long ago
    const left = BUBBLE_MS - (Date.now() - shownAt(message));
    talking.value = left > 0;
    if (talking.value) timer = setTimeout(() => (talking.value = false), left);
  },
  { immediate: true },
);
onScopeDispose(() => clearTimeout(timer));

/**
 * The talking doll is over the silent ones, the highlighted message over any other
 */
const zIndex = computed(() => {
  if (!talking.value) return props.actor.priority;
  const bonus = props.actor.lastMessage.highlighted ? HIGHLIGHTED_PRIORITY : TALKING_PRIORITY;
  return props.actor.priority + bonus;
});
</script>

<template>
  <!-- Whole sprite px only, so the pixel art stays sharp -->
  <!-- The soles stand on the bottom of the stage, the empty rows under them overlap the ground -->
  <div
    class="absolute left-0"
    :style="{
      bottom: `${(doll.soles - doll.size) * scale}px`,
      translate: `${x * scale}px 0`,
      zIndex,
    }"
  >
    <div :class="cn.above">
      <div
        v-if="talking"
        :class="[cn.bubble, actor.lastMessage.highlighted && cn.bubbleHighlighted]"
      >
        <MessageText :message="actor.lastMessage" stream />
      </div>
      <span :class="cn.name" :style="{ color: actor.color }">{{ actor.name }}</span>
    </div>
    <DollSprite :doll="doll" :frame="frame" :look="look" :scale="scale" />
  </div>
</template>

<style module="cn">
.above {
  position: absolute;
  bottom: 100%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  translate: -50% 0;
}

.bubble {
  width: max-content;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 10px;
  background: white;
  color: var(--text-h);
  font-size: 14px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.bubbleHighlighted {
  outline: 2px solid var(--highlight);
}

.name {
  text-shadow: var(--text-outline);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}
</style>
