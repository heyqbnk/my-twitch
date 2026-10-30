<script setup lang="ts">
import { useTemplateRef, watchEffect } from 'vue';
import { frameLayers, loadImage, type Doll, type Frame, type Look } from './paperDoll';

/**
 * One frame of the doll with its look, scaled up with sharp pixels. The element is the sprite box
 * (doll.size * scale); a taller frame canvas overflows it upwards.
 */
const props = withDefaults(defineProps<{
  doll: Doll;
  frame: Frame;
  look: Look;
  scale?: number;
}>(), { scale: 2 });

const canvas = useTemplateRef('canvas');
/**
 * Scratch canvas for tinting one layer
 */
const tint = document.createElement('canvas').getContext('2d')!;

/** Multiplies the grey image by the colour, keeping its alpha. */
function tinted(image: HTMLImageElement, color: string) {
  tint.canvas.width = image.width;
  tint.canvas.height = image.height;
  tint.drawImage(image, 0, 0);
  tint.globalCompositeOperation = 'multiply';
  tint.fillStyle = color;
  tint.fillRect(0, 0, image.width, image.height);
  tint.globalCompositeOperation = 'destination-in';
  tint.drawImage(image, 0, 0);
  tint.globalCompositeOperation = 'source-over';
  return tint.canvas;
}

let drawn = 0;
watchEffect(async () => {
  // Read before the await, so the effect tracks them
  const { doll, frame } = props;
  const layers = frameLayers(doll, frame, { ...props.look });
  const request = ++drawn;
  const images = await Promise.all(layers.map(layer => loadImage(layer.url)));
  // A newer frame may have been asked for while this one loaded
  if (request !== drawn || !canvas.value) return;
  canvas.value.width = doll.size;
  canvas.value.height = frame.height;
  const context = canvas.value.getContext('2d')!;
  images.forEach((image, i) => {
    const color = layers[i]!.color;
    context.drawImage(color ? tinted(image, color) : image, 0, 0);
  });
});
</script>

<template>
  <div
    class="relative"
    :style="{ width: `${doll.size * scale}px`, height: `${doll.size * scale}px` }"
  >
    <canvas
      ref="canvas"
      :class="[cn.frame, frame.mirrored && cn.frameMirrored]"
      :style="{ top: `${-frame.boxY * scale}px`, width: `${doll.size * scale}px` }"
    />
  </div>
</template>

<style module="cn">
.frame {
  position: absolute;
  left: 0;
  image-rendering: pixelated;
}

.frameMirrored {
  scale: -1 1;
}
</style>
