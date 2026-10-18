import { onScopeDispose, ref } from 'vue';
import type { BlinkState } from './face';

/** Half-closed, closed, half-closed again, in ms; then the eyes are open until the next blink. */
const BLINK: [BlinkState, number][] = [[1, 50], [2, 80], [1, 50]];
const MIN_OPEN = 2000;
const MAX_OPEN = 6000;

/** Blinks every few seconds, on its own clock: it plays over any animation. */
export function useBlink() {
  const state = ref<BlinkState>(0);
  let timer: ReturnType<typeof setTimeout>;

  function step(i: number) {
    const next = BLINK[i];
    if (!next) {
      state.value = 0;
      timer = setTimeout(() => step(0), MIN_OPEN + Math.random() * (MAX_OPEN - MIN_OPEN));
      return;
    }
    state.value = next[0];
    timer = setTimeout(() => step(i + 1), next[1]);
  }

  step(BLINK.length);
  onScopeDispose(() => clearTimeout(timer));
  return state;
}
