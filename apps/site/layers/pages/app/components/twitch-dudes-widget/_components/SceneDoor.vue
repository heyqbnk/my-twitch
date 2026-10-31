<script lang="ts" setup>
import {
  DOOR_APPEAR_MS,
  DOOR_SWING_MS,
  type DoorView,
  type Side,
} from '../_composables/useSceneDoors';
import { DOOR } from '../_utils/walkerSprite';

const props = defineProps<{
  /**
   * Screen px per scene px.
   */
  scale: number;
  side: Side;
  view: DoorView;
}>();

// Frames of sprites/door.aseprite go from closed (0) to fully open (the last). Opening, the leaf
// swings out from behind the edge with a slight overshoot; closing, it goes back edge-on
const OPEN = DOOR.frames.length - 1;
const OPEN_FRAMES = [...Array.from({ length: OPEN }, (_, i) => i + 1), OPEN - 1, OPEN];
const CLOSE_FRAMES = Array.from({ length: OPEN }, (_, i) => OPEN - 1 - i);

const frame = ref(props.view.open ? OPEN : 0);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.view.open,
  open => {
    if (timer) {
      clearTimeout(timer);
    }
    const all = open ? OPEN_FRAMES : CLOSE_FRAMES;
    // A swing in the middle of the opposite one continues from the current frame
    const from = all.findIndex(f => (open ? f > frame.value : f < frame.value));
    const frames = from < 0 ? [] : all.slice(from);
    const frameMs = DOOR_SWING_MS / all.length;
    const next = () => {
      const f = frames.shift();
      if (f === undefined) {
        return;
      }
      frame.value = f;
      timer = setTimeout(next, frameMs);
    };
    next();
  },
);
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});

const cn = useCssModule('cn');

const sideClasses: Record<Side, string | undefined> = {
  left: cn.rootLeft,
  right: cn.rootRight,
};
</script>

<template>
  <svg
    :class="[cn.root, sideClasses[side], view.visible && cn.rootVisible]"
    :style="{ '--appear': `${DOOR_APPEAR_MS}ms` }"
    :viewBox="`0 0 ${DOOR.width} ${DOOR.height}`"
    :width="DOOR.width * scale"
    :height="DOOR.height * scale"
    shape-rendering="crispEdges"
  >
    <path v-for="layer in DOOR.frames[frame]" :key="layer.fill" :fill="layer.fill" :d="layer.d"/>
  </svg>
</template>

<style module="cn">
/* The door adjoins the scene's edge (beyond the scene gutters) and covers the dudes: passing
   through it, a dude hides behind the leaf. The layer is above any dude (see zIndex in
   SceneActor) */
.root {
  position: absolute;
  bottom: 0;
  z-index: 2147483647;
  display: block;
  opacity: 0;
  transition: opacity var(--appear);
  pointer-events: none;
}

.rootLeft {
  left: calc(-1 * var(--scene-gutter, 0px));
}

/* The sprite is the left door: the right one is its mirror */
.rootRight {
  right: calc(-1 * var(--scene-gutter, 0px));
  scale: -1 1;
}

.rootVisible {
  opacity: 1;
}
</style>
