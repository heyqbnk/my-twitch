import { onScopeDispose, ref, watch, type WatchSource } from 'vue';

// Пока человечек говорит, он крупнее на TALK_GROWTH; договорив — возвращается к 1
const TALK_GROWTH = 0.15;
const GROW_MS = 200;
const SHRINK_MS = 400;

// Множитель размера человечка: talking — видно ли его облачко или табличку
export function useTalkGrowth(talking: WatchSource<boolean>) {
  const growth = ref(1);
  let frame = 0;

  // Плавный переход growth к to за duration мс
  function animateTo(to: number, duration: number) {
    cancelAnimationFrame(frame);
    const from = growth.value;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-in-out
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      growth.value = from + (to - from) * k;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  watch(
    talking,
    isTalking => animateTo(isTalking ? 1 + TALK_GROWTH : 1, isTalking ? GROW_MS : SHRINK_MS),
    { immediate: true },
  );

  onScopeDispose(() => cancelAnimationFrame(frame));

  return growth;
}
