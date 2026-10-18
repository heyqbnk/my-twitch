<script setup lang="ts">
import { useTemplateRef, watchEffect } from 'vue';
import { loadBody, withFace, type BlinkState, type Face } from './face';
import { SPRITE_SIZE, type Frame } from './paperDoll';

/**
 * One frame of the doll with its face, scaled up with sharp pixels. The element is the sprite box
 * (SPRITE_SIZE * scale); the frame canvas around it overflows it.
 */
const props = withDefaults(defineProps<{
  frame: Frame;
  face: Face;
  blink?: BlinkState;
  scale?: number;
}>(), { blink: 0, scale: 2 });

const canvas = useTemplateRef('canvas');

let drawn = 0;
watchEffect(async () => {
  // Read before the await, so the effect tracks them
  const { frame, blink } = props;
  const face: Face = { eyes: props.face.eyes, brows: props.face.brows, mouth: props.face.mouth };
  const request = ++drawn;
  const body = await loadBody(frame);
  // A newer frame may have been asked for while this one loaded
  if (request !== drawn || !canvas.value) return;
  canvas.value.width = frame.width;
  canvas.value.height = frame.height;
  canvas.value.getContext('2d')!.putImageData(withFace(body, frame, face, blink), 0, 0);
});
</script>

<template>
  <div
    class="relative"
    :style="{ width: `${SPRITE_SIZE * scale}px`, height: `${SPRITE_SIZE * scale}px` }"
  >
    <canvas
      ref="canvas"
      :class="cn.frame"
      :style="{
        left: `${-frame.boxX * scale}px`,
        top: `${-frame.boxY * scale}px`,
        width: `${frame.width * scale}px`,
      }"
    />
  </div>
</template>

<style module="cn">
.frame {
  position: absolute;
  image-rendering: pixelated;
}
</style>
