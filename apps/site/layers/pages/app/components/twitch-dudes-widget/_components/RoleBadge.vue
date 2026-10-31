<script lang="ts" setup>
import { type ChatRole, roleBadge } from '../_utils/badges';

/**
 * The badge of a chatter's role. The parent may set --role-badge-filter and
 * --role-badge-align (vertical-align).
 */
const props = defineProps<{
  role: ChatRole;
  /**
   * Side of the badge in px.
   */
  size: number;
}>();

// The source badge is 18px; bigger ones take larger images
const image = computed(() => roleBadge(props.role, props.size > 18));
</script>

<template>
  <img
    :class="cn.root"
    :src="image.src"
    :srcset="image.srcset"
    :alt="image.title"
    :title="image.title"
    :width="size"
    :height="size"
  >
</template>

<style module="cn">
.root {
  display: inline-block;
  margin-right: 0.3em;
  vertical-align: var(--role-badge-align, middle);
  border-radius: 2px;
  filter: var(--role-badge-filter, none);
}
</style>
