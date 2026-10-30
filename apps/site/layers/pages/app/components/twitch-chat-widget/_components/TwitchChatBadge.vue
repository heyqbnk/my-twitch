<script lang="ts" setup>
import type { Badge } from '../_utils/badges';

const props = defineProps<{
  /**
   * Absent while badges are loading.
   */
  badge?: Badge;
}>();

const loaded = ref(false);

watch(() => props.badge?.src, () => {
  loaded.value = false;
});
</script>

<template>
  <span :class="[cn.root, !loaded && cn.rootLoading]">
    <img
      v-if="badge"
      class="block size-full"
      :src="badge.src"
      :srcset="badge.srcset"
      :alt="badge.title"
      :title="badge.title"
      @load="loaded = true"
    >
  </span>
</template>

<style module="cn">
.root {
  display: inline-block;
  height: 18px;
  aspect-ratio: 1;
  margin-inline-end: 4px;
  overflow: hidden;
  border-radius: 0.2em;
  vertical-align: middle;
}

.rootLoading {
  background: linear-gradient(
    90deg,
    var(--chat-shimmer-color) 30%,
    var(--chat-shimmer-highlight-color) 50%,
    var(--chat-shimmer-color) 70%
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}
</style>
