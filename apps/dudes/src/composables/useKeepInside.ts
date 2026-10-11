import { inject, onScopeDispose, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

const BOUNDS_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('sceneBounds')

// Элемент, за границы которого не должны выходить облачка и подписи человечков
export function provideSceneBounds(el: Ref<HTMLElement | null>) {
  provide(BOUNDS_KEY, el)
}

interface KeepInsideOptions {
  padding?: number
  // Ограничить высоту местом над нижним краем элемента (для облачков, растущих вверх)
  limitHeight?: boolean
  // Пока true, пересчитывать каждый кадр (target движется без изменения размеров)
  track?: Ref<boolean>
  // Желаемый сдвиг по горизонтали; итоговый поправляется так, чтобы target не выходил за сцену
  offset?: Ref<number>
}

// Сдвигает target по горизонтали так, чтобы он помещался в границы сцены.
// Возвращает сдвиг (применять через CSS translate) и, при limitHeight, максимальную высоту.
// Сдвиг может анимироваться CSS-переходом: замер учитывает текущий translate элемента.
export function useKeepInside(target: Ref<HTMLElement | null>, options: KeepInsideOptions = {}) {
  const { padding = 8, limitHeight = false, track, offset } = options
  const bounds = inject(BOUNDS_KEY, ref(null))
  const shift = ref(0)
  const maxHeight = ref<number | null>(null)

  function update() {
    const el = target.value
    const box = bounds.value?.getBoundingClientRect()
    if (!el || !box) return
    // Скрытый (display: none) элемент мерить нельзя: его нулевой прямоугольник в начале окна
    // дал бы огромный сдвиг, и при появлении элемент приехал бы сбоку
    if (!el.getClientRects().length) return

    const rect = el.getBoundingClientRect()
    // Положение без текущего сдвига, иначе сдвиг накапливался бы.
    // Берём translate из computed-стиля: посреди перехода он ещё не равен shift.
    const current = parseFloat(getComputedStyle(el).translate) || 0
    const base = offset?.value ?? 0
    const left = rect.left - current + base
    const right = left + rect.width
    if (left < box.left + padding) shift.value = base + box.left + padding - left
    else if (right > box.right - padding) shift.value = base + box.right - padding - right
    else shift.value = base

    if (limitHeight) maxHeight.value = Math.max(0, rect.bottom - box.top - padding)
  }

  // Размер target меняется при смене текста и догрузке картинок эмодзи,
  // размер сцены — при изменении окна (человечки стоят в процентах от ширины)
  const observer = new ResizeObserver(update)
  watch(
    [target, bounds],
    ([el, box], _, onCleanup) => {
      if (el) observer.observe(el)
      if (box) observer.observe(box)
      // Появление человечка сдвигает его по вертикали без изменения размеров —
      // перемеряем высоту, когда анимации на сцене закончатся
      if (limitHeight) box?.addEventListener('transitionend', update)
      onCleanup(() => {
        observer.disconnect()
        box?.removeEventListener('transitionend', update)
      })
    },
    { immediate: true, flush: 'post' },
  )
  let frame = 0
  function tick() {
    update()
    frame = requestAnimationFrame(tick)
  }
  if (offset) watch(offset, update, { flush: 'post' })
  if (track) {
    watch(track, (on) => {
      cancelAnimationFrame(frame)
      if (on) tick()
      else update()
    })
  }

  onScopeDispose(() => {
    observer.disconnect()
    cancelAnimationFrame(frame)
  })

  return { shift, maxHeight }
}
