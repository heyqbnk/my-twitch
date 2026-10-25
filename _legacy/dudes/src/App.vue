<script setup lang="ts">
import ChannelView from './components/ChannelView.vue';
import { useChannelQuery } from './composables/useChannelQuery';

const channel = useChannelQuery();
</script>

<template>
  <main class="app">
    <ChannelView v-if="channel" :channel="channel" />
    <p v-else class="app__hint">
      Укажите канал в адресе: <code>?channel=имя_канала</code>
    </p>
  </main>
</template>

<style scoped>
.app {
  height: 100vh;
}

.app__hint {
  padding: 16px;
}
</style>
