<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  DOOR_APPEAR_MS,
  DOOR_HEIGHT,
  DOOR_JAMB,
  DOOR_LEAF,
  DOOR_SWING_MS,
  type DoorView,
  type Side,
} from '../composables/useSceneDoors'

// scale — экранных пикселей на пиксель спрайта
const props = defineProps<{ side: Side; view: DoorView; scale: number }>()

// Створка ниже косяка на пиксель: над ней — верх проёма
const LEAF_HEIGHT = DOOR_HEIGHT - 1

// Пиксели створки, развёрнутой к зрителю: x — от петель (у края сцены) к свободному краю
function texel(x: number, y: number): string {
  const lastX = DOOR_LEAF - 1
  const lastY = LEAF_HEIGHT - 1
  if (x === lastX - 2 && (y === 14 || y === 15)) return '#e8c15a' // ручка
  const inPanel = (inset: number) =>
    x >= 2 + inset && x <= lastX - 2 - inset && ((y >= 2 + inset && y <= 12 - inset) || (y >= 16 + inset && y <= lastY - 2 - inset))
  if (inPanel(1)) return '#8c5a2e'
  if (inPanel(0)) return '#7f4f28'
  return '#9a6233'
}
// Торец створки — виден, пока она развёрнута не полностью
const EDGE = '#5b3a1e'

// Чем сильнее створка повёрнута от зрителя, тем она темнее
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * k)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

// Кадры поворота — видимая ширина створки в пикселях спрайта. Открываясь, створка
// вываливается из-за края с небольшим перехлёстом; закрываясь — уходит обратно ребром.
const OPEN_FRAMES = [1, 4, 8, 11, 13, 14, 13, 14]
const CLOSE_FRAMES = [13, 11, 8, 4, 1, 0]

const width = ref(props.view.open ? DOOR_LEAF : 0)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.view.open,
  (open) => {
    if (timer) clearTimeout(timer)
    const all = open ? OPEN_FRAMES : CLOSE_FRAMES
    // Поворот посреди встречного продолжаем с текущей ширины
    const from = all.findIndex((w) => (open ? w > width.value : w < width.value))
    const frames = from < 0 ? [] : all.slice(from)
    const frameMs = DOOR_SWING_MS / all.length
    const next = () => {
      const w = frames.shift()
      if (w === undefined) return
      width.value = w
      timer = setTimeout(next, frameMs)
    }
    next()
  },
)
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

// Кадр створки: столбцы сжатой текстуры (ближайший столбец, без сглаживания, крайние
// столбцы лицевой стороны — крайние столбцы текстуры) и торец. По пути на цвет,
// вертикальные отрезки одного цвета склеены
const leafPaths = computed(() => {
  const w = width.value
  const k = 0.55 + (0.45 * w) / DOOR_LEAF
  // Лицевая сторона; у не до конца развёрнутой створки последний столбец — торец
  const face = w < DOOR_LEAF ? w - 1 : w
  const paths = new Map<string, string>()
  const add = (color: string, x: number, y: number, h: number) =>
    paths.set(color, (paths.get(color) ?? '') + `M${x} ${y}h1v${h}h-1z`)
  for (let c = 0; c < w; c++) {
    // Для правой двери петли справа — зеркалим
    const x = props.side === 'left' ? c : w - 1 - c
    const src = face <= 1 ? 0 : Math.round((c * (DOOR_LEAF - 1)) / (face - 1))
    let runColor = ''
    let runStart = 0
    for (let y = 0; y <= LEAF_HEIGHT; y++) {
      const color = y === LEAF_HEIGHT ? '' : c >= face ? EDGE : shade(texel(src, y), k)
      if (color === runColor) continue
      if (runColor) add(runColor, x, runStart, y - runStart)
      runColor = color
      runStart = y
    }
  }
  return [...paths].map(([fill, d]) => ({ fill, d }))
})
</script>

<template>
  <div
    class="door"
    :class="[`door--${side}`, { 'door--visible': view.visible }]"
    :style="{ '--appear': `${DOOR_APPEAR_MS}ms` }"
  >
    <svg
      class="door__jamb"
      :viewBox="`0 0 ${DOOR_JAMB} ${DOOR_HEIGHT}`"
      :width="DOOR_JAMB * scale"
      :height="DOOR_HEIGHT * scale"
      shape-rendering="crispEdges"
    >
      <rect :width="DOOR_JAMB" :height="DOOR_HEIGHT" fill="#5b3a1e" />
      <rect :x="side === 'left' ? DOOR_JAMB - 1 : 0" width="1" :height="DOOR_HEIGHT" fill="#7a5230" />
    </svg>
    <svg
      v-if="width > 0"
      class="door__leaf"
      :viewBox="`0 0 ${width} ${LEAF_HEIGHT}`"
      :width="width * scale"
      :height="LEAF_HEIGHT * scale"
      shape-rendering="crispEdges"
    >
      <path v-for="path in leafPaths" :key="path.fill" :fill="path.fill" :d="path.d" />
    </svg>
  </div>
</template>

<style scoped>
/* Дверь прилегает к краю сцены (за полями сцены) и перекрывает человечков:
   проходя в неё, человечек скрывается за створкой. Слой выше любого человечка (см. zIndex в SceneActor) */
.door {
  position: absolute;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  transition: opacity var(--appear);
  pointer-events: none;
}

.door--left {
  left: calc(-1 * var(--scene-gutter, 0px));
}

.door--right {
  right: calc(-1 * var(--scene-gutter, 0px));
  flex-direction: row-reverse;
}

.door--visible {
  opacity: 1;
}

.door__jamb,
.door__leaf {
  display: block;
  flex-shrink: 0;
}
</style>
