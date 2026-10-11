import { onBeforeUnmount, ref, type Ref } from 'vue'

// Скорость подобрана под анимацию шага: цикл из 4 кадров за WALK_CYCLE_MS.
// Скорость и расстояния — в пикселях спрайта, на экране умножаются на масштаб.
export const WALK_CYCLE_MS = 500
const WALK_SPEED = 16 // px/с
const MIN_DISTANCE = 20
const MAX_DISTANCE = 110
const MIN_PAUSE = 1500
const MAX_PAUSE = 6000
// Множитель скорости прогулки выбирается заново на каждый шаг
const MIN_STROLL_SPEED = 0.7
const MAX_STROLL_SPEED = 1.5
// Не подходить к краям сцены ближе этой доли ширины
const MARGIN = 0.03

export type Facing = 'left' | 'right'

const random = (min: number, max: number) => min + Math.random() * (max - min)

// Ходьба человечка по полу. x — доля ширины сцены (родителя el), переход по нему делает CSS
// за duration мс; pace — множитель скорости текущего шага (анимация шага ускоряется вместе с ним).
// wander — бродить: стоять случайное время, затем идти на случайное расстояние.
export function useWandering(el: Ref<HTMLElement | null>, scale: Ref<number>) {
  const x = ref(0.5)
  const facing = ref<Facing>(Math.random() < 0.5 ? 'left' : 'right')
  const walking = ref(false)
  const duration = ref(0)
  const pace = ref(1)
  let timer: ReturnType<typeof setTimeout> | null = null
  let arrive: ((arrived: boolean) => void) | null = null

  const stageWidth = () => el.value?.parentElement?.clientWidth ?? 0

  // Где человечек сейчас, в том числе посреди шага
  function currentX() {
    const width = stageWidth()
    if (!el.value || !width) return x.value
    return parseFloat(getComputedStyle(el.value).left) / width
  }

  // Останавливается там, где сейчас стоит; прерванный walkTo завершается с false
  function stop() {
    if (timer) clearTimeout(timer)
    timer = null
    if (walking.value) x.value = currentX()
    walking.value = false
    arrive?.(false)
    arrive = null
  }

  // Мгновенно переносит человечка (за дверью, где этого не видно)
  function place(at: number) {
    stop()
    x.value = at
  }

  // Идёт к target со скоростью WALK_SPEED * speed. Промис — true по приходу, false если прервали.
  // Новый шаг посреди текущего подхватывает CSS-переход с того места, где человечек сейчас.
  function walkTo(target: number, speed = 1): Promise<boolean> {
    const from = currentX()
    stop()
    const distance = Math.abs(target - from) * stageWidth()
    if (distance < 1) return Promise.resolve(true)

    facing.value = target > from ? 'right' : 'left'
    pace.value = speed
    duration.value = (distance / (WALK_SPEED * speed * scale.value)) * 1000
    walking.value = true
    x.value = target
    return new Promise((resolve) => {
      arrive = resolve
      timer = setTimeout(() => {
        timer = null
        arrive = null
        walking.value = false
        resolve(true)
      }, duration.value)
    })
  }

  function rest() {
    timer = setTimeout(stroll, random(MIN_PAUSE, MAX_PAUSE))
  }

  async function stroll() {
    const width = stageWidth()
    if (!width) return rest()

    const min = MARGIN
    const max = 1 - MARGIN
    const step = (random(MIN_DISTANCE, MAX_DISTANCE) * scale.value) / width
    let dir = Math.random() < 0.5 ? -1 : 1
    // Упёрлись бы в край — идём в другую сторону
    if (x.value + dir * step < min || x.value + dir * step > max) dir = -dir
    const target = Math.min(max, Math.max(min, x.value + dir * step))
    // Прервали (уходит со сцены) — больше не бродим
    if (await walkTo(target, random(MIN_STROLL_SPEED, MAX_STROLL_SPEED))) rest()
  }

  // Случайная начальная пауза, чтобы человечки не шагали синхронно
  function wander() {
    stop()
    rest()
  }

  onBeforeUnmount(stop)

  return { x, facing, walking, duration, pace, stageWidth, currentX, place, walkTo, wander, stop }
}
