<script lang="ts" setup>
definePageMeta({ name: PageNames.TwitchDudesWidget });

const route = useRoute();

function queryParam(name: string) {
  const value = route.query[name];
  return (Array.isArray(value) ? value[0] : value) ?? undefined;
}
</script>

<template>
  <TwitchDudesWidgetPage
    :channel="String(route.params.channel)"
    :floor="queryParam('floor')"
    :msg-delay="queryParam('msg_delay')"
    :scale="queryParam('scale')"
    :stay="queryParam('stay')"
  />
</template>
