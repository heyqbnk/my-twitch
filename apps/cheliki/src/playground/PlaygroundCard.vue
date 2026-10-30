<script setup lang="ts">
defineProps<{ title: string; wide?: boolean }>();
</script>

<template>
  <section :class="[cn.card, wide && cn.cardWide]">
    <h2 class="font-semibold text-neutral-100">{{ title }}</h2>
    <slot />
  </section>
</template>

<style module="cn">
.card {
  display: flex;
  flex: 0 0 290px;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  overflow-y: auto;
  border: 1px solid rgb(64 64 64);
  border-radius: 8px;
  background: rgb(23 23 23);
}

.cardWide {
  flex-basis: 380px;
}
</style>
