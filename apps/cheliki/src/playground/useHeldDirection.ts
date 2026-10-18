import { computed, onScopeDispose, ref } from 'vue';
import type { Direction } from '../doll/paperDoll';

const KEYS: Record<string, Direction> = {
  ArrowLeft: 'west',
  KeyA: 'west',
  ArrowRight: 'east',
  KeyD: 'east',
};

/** The direction held on the keyboard; with both held, the last pressed wins. */
export function useHeldDirection() {
  const held = ref<Direction[]>([]);

  function onKeyDown(event: KeyboardEvent) {
    const direction = KEYS[event.code];
    if (!direction) return;
    event.preventDefault();
    if (event.repeat) return;
    held.value = [...held.value.filter(d => d !== direction), direction];
  }

  function onKeyUp(event: KeyboardEvent) {
    const direction = KEYS[event.code];
    if (!direction) return;
    // Another key of the same direction may still be down, but tracking keys
    // separately isn't worth it for a playground
    held.value = held.value.filter(d => d !== direction);
  }

  // Keyup never comes if the window loses focus mid-press
  function onBlur() {
    held.value = [];
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  onScopeDispose(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  });

  return computed(() => held.value.at(-1) ?? null);
}
