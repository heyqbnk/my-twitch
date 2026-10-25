<script setup lang="ts">
import { toRef } from 'vue';
import DollSprite from '../doll/DollSprite.vue';
import type { Doll, Look } from '../doll/paperDoll';
import { useWanderer } from '../doll/useWanderer';

const props = defineProps<{
  doll: Doll;
  look: Look;
  /** Walkable width in sprite px. */
  width: number;
  scale: number;
}>();

const { x, frame } = useWanderer(props.doll, toRef(props, 'width'));
</script>

<template>
  <!-- Whole sprite px only, so the pixel art stays sharp -->
  <div class="absolute bottom-0 left-0" :style="{ translate: `${x * scale}px 0` }">
    <DollSprite :doll="doll" :frame="frame" :look="look" :scale="scale" />
  </div>
</template>
