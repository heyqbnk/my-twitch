<script setup lang="ts">
import { computed } from 'vue'
import { roleBadge, type ChatRole } from '../twitch/badges'

// size — сторона значка в пикселях
const props = defineProps<{ role: ChatRole; size: number }>()

// Исходник значка — 18px; крупнее него берём картинки побольше
const image = computed(() => roleBadge(props.role, props.size > 18))
</script>

<template>
  <img
    class="badge"
    :src="image.src"
    :srcset="image.srcset"
    :alt="image.title"
    :title="image.title"
    :width="size"
    :height="size"
  />
</template>

<style scoped>
.badge {
  display: inline-block;
  margin-right: 0.3em;
  vertical-align: middle;
  border-radius: 2px;
}
</style>
