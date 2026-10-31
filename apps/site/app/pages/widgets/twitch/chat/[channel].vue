<script lang="ts" setup>
definePageMeta({ name: PageNames.TwitchChatWidget });

const route = useRoute();

const background = computed(() => {
  const { background } = route.query;
  return (Array.isArray(background) ? background[0] : background) ?? undefined;
});
</script>

<template>
  <TwitchChatWidgetPage :channel="String(route.params.channel)" :background/>
</template>
