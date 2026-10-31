<script lang="ts" setup>
import {
  DOOR_APPEAR_MS,
  DOOR_HEIGHT,
  DOOR_JAMB,
  DOOR_LEAF,
  DOOR_SWING_MS,
  type DoorView,
  type Side,
} from '../_composables/useSceneDoors';

const props = defineProps<{
  /**
   * Screen px per scene px.
   */
  scale: number;
  side: Side;
  view: DoorView;
}>();

// The leaf is a pixel lower than the jamb: above it is the top of the doorway
const LEAF_HEIGHT = DOOR_HEIGHT - 1;

const HANDLE = '#e8c15a';
const PANEL = '#8c5a2e';
const PANEL_FRAME = '#7f4f28';
const LEAF = '#9a6233';
// The leaf's edge, visible while it isn't turned all the way
const EDGE = '#5b3a1e';
const JAMB = '#5b3a1e';
const JAMB_LIGHT = '#7a5230';

// Pixels of the leaf turned to the viewer: x goes from the hinges (at the scene's edge) to the
// free edge
function texel(x: number, y: number): string {
  const lastX = DOOR_LEAF - 1;
  const lastY = LEAF_HEIGHT - 1;
  if (x === lastX - 2 && (y === 14 || y === 15)) {
    return HANDLE;
  }
  const inPanel = (inset: number) => x >= 2 + inset
    && x <= lastX - 2 - inset
    && ((y >= 2 + inset && y <= 12 - inset) || (y >= 16 + inset && y <= lastY - 2 - inset));
  if (inPanel(1)) {
    return PANEL;
  }
  if (inPanel(0)) {
    return PANEL_FRAME;
  }
  return LEAF;
}

// The more the leaf is turned away from the viewer, the darker it is
function shade(hex: string, k: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * k);
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

// Swing frames: the visible leaf width in scene px. Opening, the leaf swings out from behind the
// edge with a slight overshoot; closing, it goes back edge-on
const OPEN_FRAMES = [1, 4, 8, 11, 13, 14, 13, 14];
const CLOSE_FRAMES = [13, 11, 8, 4, 1, 0];

const width = ref(props.view.open ? DOOR_LEAF : 0);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.view.open,
  open => {
    if (timer) {
      clearTimeout(timer);
    }
    const all = open ? OPEN_FRAMES : CLOSE_FRAMES;
    // A swing in the middle of the opposite one continues from the current width
    const from = all.findIndex(w => (open ? w > width.value : w < width.value));
    const frames = from < 0 ? [] : all.slice(from);
    const frameMs = DOOR_SWING_MS / all.length;
    const next = () => {
      const w = frames.shift();
      if (w === undefined) {
        return;
      }
      width.value = w;
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

// A leaf frame: columns of the squeezed texture (the nearest column, no smoothing; the face's
// outer columns are the texture's outer columns) and the edge. A path per color, vertical runs of
// one color merged
const leafPaths = computed(() => {
  const w = width.value;
  const k = 0.55 + ((0.45 * w) / DOOR_LEAF);
  // The face; the last column of a leaf not turned all the way is the edge
  const face = w < DOOR_LEAF ? w - 1 : w;
  const paths = new Map<string, string>();
  const add = (color: string, x: number, y: number, h: number) => {
    paths.set(color, (paths.get(color) ?? '') + `M${x} ${y}h1v${h}h-1z`);
  };
  for (let c = 0; c < w; c++) {
    // The right door has its hinges on the right: mirrored
    const x = props.side === 'left' ? c : w - 1 - c;
    const src = face <= 1 ? 0 : Math.round((c * (DOOR_LEAF - 1)) / (face - 1));
    let runColor = '';
    let runStart = 0;
    for (let y = 0; y <= LEAF_HEIGHT; y++) {
      let color = '';
      if (y < LEAF_HEIGHT) {
        color = c >= face ? EDGE : shade(texel(src, y), k);
      }
      if (color === runColor) {
        continue;
      }
      if (runColor) {
        add(runColor, x, runStart, y - runStart);
      }
      runColor = color;
      runStart = y;
    }
  }
  return [...paths].map(([fill, d]) => ({ d, fill }));
});

const cn = useCssModule('cn');

const sideClasses: Record<Side, string | undefined> = {
  left: cn.rootLeft,
  right: cn.rootRight,
};
</script>

<template>
  <div
    :class="[cn.root, sideClasses[side], view.visible && cn.rootVisible]"
    :style="{ '--appear': `${DOOR_APPEAR_MS}ms` }"
  >
    <svg
      :class="cn.part"
      :viewBox="`0 0 ${DOOR_JAMB} ${DOOR_HEIGHT}`"
      :width="DOOR_JAMB * scale"
      :height="DOOR_HEIGHT * scale"
      shape-rendering="crispEdges"
    >
      <rect :width="DOOR_JAMB" :height="DOOR_HEIGHT" :fill="JAMB"/>
      <rect
        :x="side === 'left' ? DOOR_JAMB - 1 : 0"
        width="1"
        :height="DOOR_HEIGHT"
        :fill="JAMB_LIGHT"
      />
    </svg>
    <svg
      v-if="width > 0"
      :class="cn.part"
      :viewBox="`0 0 ${width} ${LEAF_HEIGHT}`"
      :width="width * scale"
      :height="LEAF_HEIGHT * scale"
      shape-rendering="crispEdges"
    >
      <path v-for="path in leafPaths" :key="path.fill" :fill="path.fill" :d="path.d"/>
    </svg>
  </div>
</template>

<style module="cn">
/* The door adjoins the scene's edge (beyond the scene gutters) and covers the dudes: passing
   through it, a dude hides behind the leaf. The layer is above any dude (see zIndex in
   SceneActor) */
.root {
  position: absolute;
  bottom: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  transition: opacity var(--appear);
  pointer-events: none;
}

.rootLeft {
  left: calc(-1 * var(--scene-gutter, 0px));
}

.rootRight {
  right: calc(-1 * var(--scene-gutter, 0px));
  flex-direction: row-reverse;
}

.rootVisible {
  opacity: 1;
}

.part {
  display: block;
  flex-shrink: 0;
}
</style>
