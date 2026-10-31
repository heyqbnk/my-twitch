<script lang="ts" setup>
import SceneActor from './SceneActor.vue';
import SceneDoor from './SceneDoor.vue';

import { useFollowDates } from '../_composables/useFollowDates';
import { provideSceneBounds } from '../_composables/useKeepInside';
import { provideMentionColor } from '../_composables/useMentionColor';
import { provideMessageParts } from '../_composables/useMessageParts';
import { type SceneActor as Actor, useSceneActors } from '../_composables/useSceneActors';
import { provideSceneDoors, SIDES } from '../_composables/useSceneDoors';
import { useThirdPartyEmotes } from '../_composables/useThirdPartyEmotes';
import { useTwitchChat } from '../_composables/useTwitchChat';
import { needsFollowDate } from '../_utils/actorPriority';

/**
 * The scene itself. Relies on browser APIs from setup on, so it is rendered on the client only.
 */
const props = defineProps<{
  /**
   * Valid lowercase channel login.
   */
  channel: string;
  /**
   * Message display delay, in ms.
   */
  delay: number;
  /**
   * Floor height in screen px. 0 — no floor.
   */
  floor: number;
  /**
   * Screen px per scene px.
   */
  scale: number;
  /**
   * How long a dude stays after its last message, in ms. Null — no limit.
   */
  stay: number | null;
}>();

const channel = toRef(props, 'channel');
const { messages, roomId } = useTwitchChat(channel, () => props.delay);
provideMessageParts(useThirdPartyEmotes(roomId));
provideMentionColor(messages);
// The follow date is only needed for viewers without a role or a subscription
const followLogins = computed(() => [
  ...new Set(messages.value.filter(needsFollowDate).map(m => m.login)),
]);
const actors = useSceneActors(
  messages,
  toRef(props, 'stay'),
  useFollowDates(channel, followLogins),
);

const scene = ref<HTMLElement | null>(null);
provideSceneBounds(scene);
const doors = provideSceneDoors();

// A dude gone from the actors still walks to the door: kept on the scene until it is out.
// The order stays the same — a move in the DOM would break the step's CSS transition
interface Entry {
  actor: Actor;
  exiting: boolean;
}
const entries = shallowRef<Entry[]>([]);

watch(
  actors,
  list => {
    const fresh = new Map(list.map(a => [a.login, a]));
    const next = entries.value.map((entry): Entry => {
      const actor = fresh.get(entry.actor.login);
      fresh.delete(entry.actor.login);
      // One who said goodbye leaves with the farewell; one back before going out the door changes
      // their mind
      if (!actor) {
        return { actor: entry.actor, exiting: true };
      }
      return { actor, exiting: !!actor.leaving };
    });
    // Those who said goodbye and are already gone don't come back
    for (const actor of fresh.values()) {
      if (!actor.leaving) {
        next.push({ actor, exiting: false });
      }
    }
    entries.value = next;
  },
  { immediate: true },
);

function exited(login: string) {
  entries.value = entries.value.filter(entry => !(entry.exiting && entry.actor.login === login));
}
</script>

<template>
  <main ref="scene" :class="cn.root">
    <div class="relative flex-1 mx-(--scene-gutter)">
      <SceneActor
        v-for="entry in entries"
        :key="entry.actor.login"
        :actor="entry.actor"
        :exiting="entry.exiting"
        :scale
        @exited="exited(entry.actor.login)"
      />
      <SceneDoor
        v-for="side in SIDES"
        :key="side"
        :side
        :view="doors[side]"
        :scale
      />
    </div>
    <div
      v-if="floor > 0"
      class="border-t-2 border-(--dudes-border-color) bg-(--dudes-floor-color)"
      :style="{ height: `${floor}px` }"
    />
  </main>
</template>

<style module="cn">
.root {
  /* Gutters at the scene's sides: dudes don't stroll there but pass through them to the doors */
  --scene-gutter: 24px;

  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
</style>
