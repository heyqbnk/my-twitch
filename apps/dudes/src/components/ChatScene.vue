<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { provideSceneBounds } from '../composables/useKeepInside'
import { provideSceneDoors, SIDES } from '../composables/useSceneDoors'
import type { SceneActor as Actor } from '../composables/useSceneActors'
import SceneActor from './SceneActor.vue'
import SceneDoor from './SceneDoor.vue'

const props = defineProps<{ actors: Actor[]; scale: number }>()

const scene = ref<HTMLElement | null>(null)
provideSceneBounds(scene)
const doors = provideSceneDoors()

// Человечек, пропавший из actors, ещё идёт к двери: держим его на сцене, пока он не выйдет.
// Порядок не меняем — перестановка в DOM оборвала бы CSS-переход шага.
interface Entry {
  actor: Actor
  exiting: boolean
}
const entries = shallowRef<Entry[]>([])

watch(
  () => props.actors,
  (actors) => {
    const fresh = new Map(actors.map((a) => [a.login, a]))
    const next = entries.value.map((entry): Entry => {
      const actor = fresh.get(entry.actor.login)
      fresh.delete(entry.actor.login)
      // Попрощавшийся уходит со своим прощанием; вернувшийся до выхода за дверь передумывает
      if (!actor) return { actor: entry.actor, exiting: true }
      return { actor, exiting: !!actor.leaving }
    })
    // Уже ушедшие попрощавшиеся на сцену не возвращаются
    for (const actor of fresh.values()) if (!actor.leaving) next.push({ actor, exiting: false })
    entries.value = next
  },
  { immediate: true },
)

function exited(login: string) {
  entries.value = entries.value.filter((entry) => !(entry.exiting && entry.actor.login === login))
}
</script>

<template>
  <div ref="scene" class="scene">
    <div class="scene__stage">
      <SceneActor
        v-for="entry in entries"
        :key="entry.actor.login"
        :actor="entry.actor"
        :exiting="entry.exiting"
        :scale="scale"
        @exited="exited(entry.actor.login)"
      />
      <SceneDoor v-for="side in SIDES" :key="side" :side="side" :view="doors[side]" :scale="scale" />
    </div>
    <div class="scene__floor" />
  </div>
</template>

<style scoped>
.scene {
  /* Поля по бокам сцены: человечки по ним не бродят, но проходят через них к дверям */
  --scene-gutter: 24px;

  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.scene__stage {
  position: relative;
  flex: 1;
  margin-inline: var(--scene-gutter);
}

.scene__floor {
  height: 30px;
  border-top: 2px solid var(--border);
  background: var(--code-bg);
}
</style>
