<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useActivityGrowth } from '../composables/useActivityGrowth'
import { useKeepInside } from '../composables/useKeepInside'
import { useMessageParts } from '../composables/useMessageParts'
import type { SceneActor } from '../composables/useSceneActors'
import { DOOR_JAMB, DOOR_LEAF, useSceneDoors, type Side } from '../composables/useSceneDoors'
import { useWandering, WALK_CYCLE_MS } from '../composables/useWandering'
import { WALKER } from '../scene/walkerSprite'
import { ROLE_COLORS, roleRank } from '../twitch/badges'
import { soloEmote } from '../twitch/emotes'
import ChatEmote from './ChatEmote.vue'
import MessageText from './MessageText.vue'
import RoleBadge from './RoleBadge.vue'

const BUBBLE_DURATION = 6000
const SOLO_EMOTE_SIZE = 37
const NAME_FLIGHT_MS = 300
// Значок роли перед ником: над головой и в облачке ник 11px
const BADGE_SIZE = 13

// scale — экранных пикселей на пиксель спрайта; exiting — пропал из списка и уходит со сцены
const props = defineProps<{ actor: SceneActor; scale: number; exiting: boolean }>()
// Вышел за дверь — можно убирать
const emit = defineEmits<{ exited: [] }>()

// Активные зрители крупнее: px — итоговый масштаб с учётом роста
const growth = useActivityGrowth(() => props.actor.lastMessage)
const px = computed(() => props.scale * growth.value)

function paint(fill: string): string {
  if (fill === 'shirt') return props.actor.color
  if (fill === 'hair') return props.actor.hairColor
  return fill
}

// Головной убор прячет волосы над собой: человечек обрезается по его clip
const clipId = useId()
const headwearClip = computed(
  () => props.actor.accessories.map((a) => WALKER.accessories[a.name].clip).find((clip) => clip !== null) ?? null,
)

// Высота шеста таблички: от кисти до чуть выше макушки
const POLE_HEIGHT = WALKER.holdHand.y + 3

// У владельца, модераторов и VIP ник жирный и в цвет роли — и над головой, и в облачке
const roleColor = computed(() => (props.actor.role ? ROLE_COLORS[props.actor.role] : null))

const messageParts = useMessageParts()
// Сообщение из одного эмодзи человечек показывает на табличке вместо облачка
const emoteOnly = computed(() => soloEmote(messageParts(props.actor.lastMessage)))

const bubbleVisible = ref(false)
// Слой человечка: старшие роли поверх младших и зрителей без роли, даже молчащие.
// Внутри одного старшинства говорящий поверх молчащих. Двери всё равно выше всех
const zIndex = computed(() => roleRank(props.actor.role) * 2 + (bubbleVisible.value ? 1 : 0))
// Смена ключа перемонтирует тело и перезапускает анимацию прыжка
const jumpKey = ref(0)
let bubbleTimer: ReturnType<typeof setTimeout> | null = null

const root = ref<HTMLElement | null>(null)
const { x, facing, walking, duration, pace, stageWidth, currentX, place, walkTo, wander, stop } = useWandering(
  root,
  px,
)

// На сцену человечек заходит из-за края, ближайшего к его месту, через дверь у этого края,
// а уходит через дверь у ближайшего к нему края, ускорив шаг
const EXIT_SPEED = 1.3
// Зазор между человечком и створкой, в пикселях спрайта
const DOOR_GAP = 2
// Войдя, человечек проходит от двери до GREET_MAX_DISTANCE экранных пикселей
// и машет зрителям WAVE_MS мс: взмах туда-обратно за WAVE_CYCLE_MS
const GREET_MAX_DISTANCE = 100
const WAVE_MS = 1600
const WAVE_CYCLE_MS = 400

const doors = useSceneDoors()
// Пока человечек за краем сцены, его не видно — и облачко с ником не прижимаются к краю
const hidden = ref(true)
// Дверь, которую держит человечек
let heldDoor: Side | null = null
// Номер текущего сценария (вход, уход, возвращение): новый прерывает предыдущий
let scenario = 0
// Стоит лицом к зрителям и машет
const waving = ref(false)
let waveTimer: ReturnType<typeof setTimeout> | null = null

const nearestSide = (at: number): Side => (at < 0.5 ? 'left' : 'right')

// Бродит по сцене, а не входит и не уходит. Пока говорит (видно облачко или табличку),
// стоит на месте лицом к зрителям, а договорив — снова бродит
let roaming = false

function roam() {
  roaming = true
  if (!bubbleVisible.value) wander()
}

watch(bubbleVisible, (talking) => {
  if (!roaming) return
  if (talking) stop()
  else wander()
})

// Точка в fromEdge экранных пикселей от края сцены (за полями) — в долях ширины,
// по которой бродит человечек
function fromSceneEdge(side: Side, fromEdge: number) {
  const stage = root.value?.parentElement
  const scene = stage?.parentElement
  if (!stage || !scene || !stageWidth()) return side === 'left' ? 0 : 1
  const inner = stage.getBoundingClientRect()
  const outer = scene.getBoundingClientRect()
  const gutter = side === 'left' ? inner.left - outer.left : outer.right - inner.right
  const at = (fromEdge - gutter) / inner.width
  return side === 'left' ? at : 1 - at
}

const halfBody = () => (WALKER.frameWidth * px.value) / 2
// За краем сцены, целиком скрыт
const offstage = (side: Side) => fromSceneEdge(side, -halfBody())
// Перед дверью: открывающаяся створка его не задевает
const beforeDoor = (side: Side) =>
  fromSceneEdge(side, (DOOR_JAMB + DOOR_LEAF + DOOR_GAP) * props.scale + halfBody())

function holdDoor(side: Side) {
  letGoDoor()
  heldDoor = side
  return doors.open(side)
}

function letGoDoor() {
  if (heldDoor) doors.release(heldDoor)
  heldDoor = null
}

// Промис — когда домахал; прерванный stopWaving так и не завершается
function wave(): Promise<void> {
  stopWaving()
  waving.value = true
  return new Promise((resolve) => {
    waveTimer = setTimeout(() => {
      waveTimer = null
      waving.value = false
      resolve()
    }, WAVE_MS)
  })
}

function stopWaving() {
  if (waveTimer) clearTimeout(waveTimer)
  waveTimer = null
  waving.value = false
}

// Выходит из-за края сцены (или, передумав уходить, — из-под створки), машет зрителям
// и идёт к своему месту
async function enter(side: Side) {
  const id = ++scenario
  roaming = false
  stopWaving()
  if (hidden.value) place(offstage(side))
  await holdDoor(side)
  if (id !== scenario) return
  hidden.value = false
  if (!(await walkTo(beforeDoor(side)))) return
  // Прошёл дверь — её можно закрывать
  letGoDoor()
  const width = stageWidth()
  const greetAt = width ? (Math.random() * GREET_MAX_DISTANCE) / width : 0
  if (!(await walkTo(currentX() + (side === 'left' ? greetAt : -greetAt)))) return
  await wave()
  if (id !== scenario) return
  if (await walkTo(props.actor.x)) roam()
}

async function exit() {
  const id = ++scenario
  roaming = false
  stopWaving()
  letGoDoor()
  // Ещё за краем — просто не выходит
  if (!hidden.value) {
    const side = nearestSide(currentX())
    if (!(await walkTo(beforeDoor(side), EXIT_SPEED))) return
    await holdDoor(side)
    if (id !== scenario) return
    if (!(await walkTo(offstage(side), EXIT_SPEED))) return
    hidden.value = true
    letGoDoor()
  }
  emit('exited')
}

// Передумал уходить: если уже в дверях или за ней — возвращается через неё,
// а на сцене просто продолжает бродить
function stayOnStage() {
  if (hidden.value || heldDoor) return enter(heldDoor ?? nearestSide(currentX()))
  scenario++
  stopWaving()
  roam()
}

watch(
  () => props.exiting,
  (exiting) => (exiting ? exit() : stayOnStage()),
)
onMounted(() => enter(nearestSide(props.actor.x)))
onBeforeUnmount(() => {
  scenario++
  stop()
  stopWaving()
  letGoDoor()
})

const bubble = ref<HTMLElement | null>(null)
const name = ref<HTMLElement | null>(null)
const bubbleName = ref<HTMLElement | null>(null)
const nameGhost = ref<HTMLElement | null>(null)
const board = ref<HTMLElement | null>(null)
const bubbleFit = useKeepInside(bubble, { limitHeight: true, track: walking })
// У края сцены сдвигаем только доску, шест остаётся в руке
const boardFit = useKeepInside(board, { track: walking })

const holdingSign = computed(() => bubbleVisible.value && !!emoteOnly.value)
// Пока видно облачко, ник показываем в нём: при наложении облачков иначе не понять, кто пишет
const showBubble = computed(() => bubbleVisible.value && !emoteOnly.value)
// Остановившись, человечек поворачивается лицом к зрителям
const facingFront = computed(() => waving.value || !walking.value)
// Строка спрайт-листа: 0/1 — вправо/влево, 2/3 — то же с табличкой, 4/5 — анфас без неё и с ней
const spriteRow = computed(() => {
  if (facingFront.value) return holdingSign.value ? 5 : 4
  return (holdingSign.value ? 2 : 0) + (facing.value === 'left' ? 1 : 0)
})
// Смещение шеста от центра человечка (в пикселях спрайта), зеркалится при повороте влево.
// Анфас шест в той же руке, что и при взгляде вправо
const poleOffset = computed(() => {
  const fromCenter = WALKER.holdHand.x + 0.5 - WALKER.frameWidth / 2
  return facing.value === 'left' && !facingFront.value ? -fromCenter : fromCenter
})
// С табличкой никнейм переезжает к центру доски: она висит на шесте в руке, а не над головой
// Кадр показываем через viewBox, а не сдвигом листа: при дробном px сдвиг на кадр дробный,
// и края пикселей в разных кадрах округлялись по-разному — человечек «дышал» по ширине
const frameBox = (col: number) =>
  `${col * (WALKER.frameWidth + WALKER.gap)} ${spriteRow.value * (WALKER.frameHeight + WALKER.gap)} ${WALKER.frameWidth} ${WALKER.frameHeight}`
// Кадры анимации: шаг — 1–4, взмах — 1–2; стоит — без анимации, кадр 0
const animation = computed(() => {
  if (waving.value) return { frames: [1, 2].map(frameBox).join(';'), dur: WAVE_CYCLE_MS }
  if (walking.value) return { frames: [1, 2, 3, 4].map(frameBox).join(';'), dur: WALK_CYCLE_MS / pace.value }
  return null
})
const nameOffset = computed(() =>
  holdingSign.value ? poleOffset.value * px.value + boardFit.shift.value : 0,
)
const nameFit = useKeepInside(name, { track: walking, offset: nameOffset })

// Ник перелетает между местом над головой и облачком. Летит копия (nameGhost) поверх облачка:
// сам ник в облачке прозрачен, пока облачко проявляется. Цель перемеряется каждый кадр —
// облачко и подпись могут сдвигаться у края сцены, пока человечек идёт.
const nameFlying = ref(false)
let flightFrame = 0

// Координаты считаем от середины низа человечка: она не сдвигается, когда ник над головой
// прячется или появляется и человечек меняет ширину и высоту
function offsetInRoot(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const base = root.value!.getBoundingClientRect()
  return { x: rect.left - (base.left + base.width / 2), y: rect.top - base.bottom }
}

watch(showBubble, async (inBubble) => {
  const from = inBubble ? name.value : bubbleName.value
  const leavingBubble = inBubble ? null : bubble.value
  if (!from || !root.value) return
  // Если ник ещё в полёте — продолжаем с того места, где он сейчас
  const ghostEl = nameGhost.value
  const start = nameFlying.value && ghostEl ? offsetInRoot(ghostEl) : offsetInRoot(from)
  const fromStyle = nameFlying.value && ghostEl ? ghostEl.style : getComputedStyle(from)
  const fromColor = fromStyle.color
  const fromWeight = fromStyle.fontWeight
  const fromShadow = fromStyle.textShadow
  const rootHeight = root.value.offsetHeight
  cancelAnimationFrame(flightFrame)
  nameFlying.value = true

  await nextTick()
  const ghost = nameGhost.value
  if (!ghost || !root.value) return
  // Ник над головой вернулся в поток и приподнял человечка сверху — уходящее облачко
  // привязано к его верху, поэтому опускаем облачко обратно, чтобы оно не подпрыгнуло
  if (leavingBubble) {
    leavingBubble.style.bottom = `calc(100% + var(--bubble-gap) - ${root.value.offsetHeight - rootHeight}px)`
  }

  const begin = performance.now()
  const fly = (now: number) => {
    const to = inBubble ? bubbleName.value : name.value
    if (!to || !root.value) {
      nameFlying.value = false
      return
    }
    const t = Math.min(1, (now - begin) / NAME_FLIGHT_MS)
    const k = 1 - (1 - t) ** 3 // ease-out
    const end = offsetInRoot(to)
    const target = getComputedStyle(to)
    ghost.style.translate = `${start.x + (end.x - start.x) * k}px ${start.y + (end.y - start.y) * k}px`
    ghost.style.color = `color-mix(in srgb, ${target.color} ${k * 100}%, ${fromColor})`
    // Толщина и обводка ника (в облачке её нет) меняются на полпути
    ghost.style.fontWeight = k < 0.5 ? fromWeight : target.fontWeight
    ghost.style.textShadow = k < 0.5 ? fromShadow : target.textShadow
    if (t < 1) flightFrame = requestAnimationFrame(fly)
    else nameFlying.value = false
  }
  fly(begin)
})

// Убираемая табличка сжимается по высоте, чтобы никнейм над ней съезжал вниз вместе с ней.
// Конечная высота равна захлёсту на тело (-marginBottom), тогда место в потоке — ноль.
function collapseSign(el: Element) {
  const sign = el as HTMLElement
  sign.style.height = `${sign.offsetHeight}px`
  void sign.offsetHeight // фиксируем начальную высоту, иначе переход не запустится
  sign.style.height = `${WALKER.holdHand.y * px.value}px`
}

watch(
  () => props.actor.lastMessage.id,
  (_, prevId) => {
    if (bubbleTimer) clearTimeout(bubbleTimer)
    // Облачко только для свежих сообщений, а не для восстановленных из истории
    const age = Math.max(0, Date.now() - props.actor.lastMessage.timestamp)
    bubbleVisible.value = age < BUBBLE_DURATION
    if (bubbleVisible.value) {
      bubbleTimer = setTimeout(() => (bubbleVisible.value = false), BUBBLE_DURATION - age)
    }
    if (prevId) jumpKey.value++
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (bubbleTimer) clearTimeout(bubbleTimer)
  cancelAnimationFrame(flightFrame)
})
</script>

<template>
  <div
    ref="root"
    class="actor"
    :class="{ 'actor--hidden': hidden }"
    :style="{
      '--px': `${px}px`,
      zIndex,
      left: `${x * 100}%`,
      transition: walking ? `left ${duration}ms linear` : undefined,
    }"
  >
    <Transition name="bubble">
      <div
        v-if="showBubble"
        ref="bubble"
        class="actor__bubble"
        :class="{
          'actor__bubble--highlighted': actor.lastMessage.highlighted,
          'actor__bubble--first': actor.lastMessage.firstMessage && !actor.lastMessage.highlighted,
        }"
        :style="{
          translate: `${bubbleFit.shift.value}px 0`,
          maxHeight: bubbleFit.maxHeight.value === null ? undefined : `${bubbleFit.maxHeight.value}px`,
        }"
      >
        <div class="actor__bubble-body">
          <span
            ref="bubbleName"
            class="actor__bubble-name"
            :style="{ color: roleColor ?? actor.color, visibility: nameFlying ? 'hidden' : undefined }"
          >
            <RoleBadge v-if="actor.role" :role="actor.role" :size="BADGE_SIZE" />{{ actor.name }}
          </span>
          <MessageText :message="actor.lastMessage" />
        </div>
        <!-- Хвостик смотрит на человечка, даже когда облачко сдвинуто от края сцены -->
        <div
          class="actor__bubble-tail"
          :style="{ left: `clamp(var(--tail-inset), calc(50% - ${bubbleFit.shift.value}px), calc(100% - var(--tail-inset)))` }"
        />
      </div>
    </Transition>
    <span
      v-show="!showBubble"
      ref="name"
      class="actor__name"
      :class="{ 'actor__name--role': roleColor }"
      :style="{
        translate: `${nameFit.shift.value}px 0`,
        color: roleColor ?? undefined,
        visibility: nameFlying ? 'hidden' : undefined,
      }"
    >
      <RoleBadge v-if="actor.role" :role="actor.role" :size="BADGE_SIZE" class="actor__badge" />{{ actor.name }}
    </span>
    <span v-show="nameFlying" ref="nameGhost" class="actor__name-ghost">
      <RoleBadge v-if="actor.role" :role="actor.role" :size="BADGE_SIZE" class="actor__badge" />{{ actor.name }}
    </span>
    <div :key="jumpKey" class="actor__figure" :class="{ 'actor__figure--jump': jumpKey > 0 }">
      <!-- Табличка стоит в потоке над телом и заходит на него так, что шест упирается в кисть -->
      <Transition name="sign" @leave="collapseSign">
        <div
          v-if="holdingSign && emoteOnly"
          class="actor__sign"
          :style="{
            transform: `translateX(${poleOffset * px}px)`,
            marginBottom: `${-WALKER.holdHand.y * px}px`,
          }"
        >
          <div
            ref="board"
            class="actor__board"
            :class="{
              'actor__board--highlighted': actor.lastMessage.highlighted,
              'actor__board--first': actor.lastMessage.firstMessage && !actor.lastMessage.highlighted,
            }"
            :style="{ translate: `${boardFit.shift.value}px 0` }"
          >
            <ChatEmote
              v-if="emoteOnly.type === 'emote'"
              :emote="emoteOnly.emote"
              :overlays="emoteOnly.overlays"
              :size="SOLO_EMOTE_SIZE"
            />
            <span v-else class="actor__emoji">{{ emoteOnly.text }}</span>
          </div>
          <div class="actor__pole" :style="{ height: `${POLE_HEIGHT * px}px` }" />
        </div>
      </Transition>
      <div
        class="actor__body"
        :style="{ width: `${WALKER.frameWidth * px}px`, height: `${WALKER.frameHeight * px}px` }"
      >
        <!-- Спрайт-лист: строка — поза и направление, столбец — кадр (0 — стоит, 1–4 — шаг или взмах).
             viewBox вырезает из листа один кадр -->
        <svg
          class="sprite"
          :viewBox="frameBox(0)"
          :width="WALKER.frameWidth * px"
          :height="WALKER.frameHeight * px"
          shape-rendering="crispEdges"
        >
          <animate
            v-if="animation"
            attributeName="viewBox"
            calcMode="discrete"
            :values="animation.frames"
            :dur="`${animation.dur}ms`"
            repeatCount="indefinite"
          />
          <clipPath v-if="headwearClip" :id="clipId">
            <path :d="headwearClip" />
          </clipPath>
          <!-- Рубашка — в цвет ника, волосы — в цвет волос; к общим пикселям слоя добавляются пиксели причёски -->
          <g :clip-path="headwearClip ? `url(#${clipId})` : undefined">
            <path
              v-for="(layer, i) in WALKER.layers"
              :key="i"
              :fill="paint(layer.fill)"
              :d="layer.d + layer.hairstyles[actor.hairstyle]"
            />
          </g>
          <!-- Аксессуары поверх: основной слой — в цвет аксессуара -->
          <template v-for="accessory in actor.accessories" :key="accessory.name">
            <path
              v-for="(layer, i) in WALKER.accessories[accessory.name].layers"
              :key="i"
              :fill="layer.fill === 'accessory' ? accessory.color : layer.fill"
              :d="layer.d"
            />
          </template>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actor {
  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.actor--hidden {
  visibility: hidden;
}

.actor__body {
  overflow: hidden;
}

.sprite {
  display: block;
}

.actor__figure {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actor__figure--jump {
  animation: jump 0.4s ease-out;
}

/* Высота прыжка в пикселях спрайта, чтобы табличка не делала его выше */
@keyframes jump {
  40% {
    transform: translateY(calc(var(--px) * -7));
  }
}

.actor__sign {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* При сжатии на уходе доска с шестом остаются у руки, а не у верхнего края */
  justify-content: flex-end;
}

.actor__sign > * {
  flex-shrink: 0;
}

.actor__board {
  display: flex;
  padding: calc(var(--px) * 0.75);
  border: var(--px) solid #6b4423;
  border-radius: 10px;
  background: #f0d9b5;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.18);
}

.actor__board--first {
  border-color: var(--first-msg);
}

.actor__board--highlighted {
  border-color: var(--highlight);
  box-shadow: 0 0 10px color-mix(in srgb, var(--highlight) 60%, transparent), 0 4px 12px rgb(0 0 0 / 0.18);
}

.actor__board :deep(img) {
  border-radius: 6px;
}

.actor__pole {
  width: var(--px);
  background: #8a5a2b;
  /* Тёмный край шеста — объём в пиксельном стиле */
  box-shadow: inset calc(var(--px) * -0.34) 0 rgb(0 0 0 / 0.25);
}

/* Табличку «достают» снизу, из руки */
.sign-enter-active,
.sign-leave-active {
  transition:
    opacity 0.25s,
    translate 0.25s ease-out,
    height 0.25s ease-out;
}

.sign-enter-from,
.sign-leave-to {
  opacity: 0;
  translate: 0 calc(var(--px) * 6);
}

.actor__name {
  margin-bottom: 4px;
  text-shadow: var(--text-outline);
  transition: translate 0.25s ease-out;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  /* Белый в обеих темах: под ником стрим, читаемость держит тёмная обводка */
  color: #fff;
}

.actor__badge {
  filter: var(--icon-outline);
}

.actor__name--role {
  font-weight: 700;
}

.actor__name-ghost {
  position: absolute;
  text-shadow: var(--text-outline);
  top: 100%;
  left: 50%;
  z-index: 2;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.actor__bubble {
  /* Цвета и рамка общие у тела облачка и хвостика */
  --bubble-gap: 10px;
  --bubble-border: 1px solid var(--border);
  --bubble-bg: var(--bg);
  --tail-size: 10px;
  /* Хвостик не заезжает на скруглённые углы */
  --tail-inset: 16px;
  position: absolute;
  bottom: calc(100% + var(--bubble-gap));
  display: flex;
  flex-direction: column;
  width: max-content;
  max-width: 220px;
}

.actor__bubble-body {
  min-height: 0;
  padding: 6px 10px;
  border: var(--bubble-border);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  /* Не влезло по высоте — показываем начало сообщения */
  overflow: hidden;
  color: var(--text-h);
  background: var(--bubble-bg);
  box-shadow: var(--bubble-shadow, 0 4px 12px rgb(0 0 0 / 0.12));
}

/* Повёрнутый квадрат с рамкой снизу и справа: торчит из-под облачка уголком вниз
   и закрывает рамку облачка над собой */
.actor__bubble-tail {
  position: absolute;
  top: 100%;
  width: var(--tail-size);
  height: var(--tail-size);
  border-right: var(--bubble-border);
  border-bottom: var(--bubble-border);
  background: var(--bubble-bg);
  translate: -50% -50%;
  rotate: 45deg;
}

.actor__bubble-name {
  display: block;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actor__emoji {
  padding: 0 2px;
  font-size: 27px;
  line-height: 1.2;
}

.actor__bubble--first {
  --bubble-border: 1px solid var(--first-msg);
  --bubble-bg: color-mix(in srgb, var(--first-msg) 15%, var(--bg));
}

.actor__bubble--highlighted {
  --bubble-border: 2px solid var(--highlight);
  --bubble-bg: color-mix(in srgb, var(--highlight) 22%, var(--bg));
  --bubble-shadow: 0 0 10px color-mix(in srgb, var(--highlight) 60%, transparent), 0 4px 12px rgb(0 0 0 / 0.12);
}

.bubble-enter-active,
.bubble-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
