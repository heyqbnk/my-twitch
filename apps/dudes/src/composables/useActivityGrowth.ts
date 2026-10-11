import { onScopeDispose, ref, watch, type WatchSource } from 'vue'
import type { ChatMessage } from './useTwitchChat'

// Каждое сообщение увеличивает человечка на GROWTH_STEP, но не больше MAX_GROWTH.
// Если зритель молчит HOLD_MS после последнего сообщения, за SHRINK_MS он возвращается к 1.
const GROWTH_STEP = 0.1
const MAX_GROWTH = 1.5
const HOLD_MS = 10_000
const SHRINK_MS = 2000
const GROW_MS = 200

// Множитель размера человечка за активность в чате.
// message — последнее сообщение зрителя.
export function useActivityGrowth(message: WatchSource<ChatMessage>) {
  const growth = ref(1)
  // Размер, к которому идёт рост: быстрые сообщения подряд не теряют шаги,
  // даже если предыдущая анимация ещё не закончилась
  let target = 1
  let shrinking = false
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let frame = 0

  // Плавный переход growth к to за duration мс
  function animateTo(to: number, duration: number) {
    cancelAnimationFrame(frame)
    const from = growth.value
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-in-out
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      growth.value = from + (to - from) * k
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  }

  watch(
    message,
    (msg) => {
      // Восстановленные из истории сообщения, чей срок уже прошёл, не считаются
      const age = Math.max(0, Date.now() - msg.timestamp)
      if (age >= HOLD_MS) return
      // Новое сообщение посреди уменьшения прибавляет к текущему размеру
      target = Math.min(MAX_GROWTH, (shrinking ? growth.value : target) + GROWTH_STEP)
      shrinking = false
      animateTo(target, GROW_MS)
      // Debounce: каждое сообщение откладывает уменьшение
      if (holdTimer) clearTimeout(holdTimer)
      holdTimer = setTimeout(() => {
        shrinking = true
        target = 1
        animateTo(target, SHRINK_MS)
      }, HOLD_MS - age)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (holdTimer) clearTimeout(holdTimer)
    cancelAnimationFrame(frame)
  })

  return growth
}
