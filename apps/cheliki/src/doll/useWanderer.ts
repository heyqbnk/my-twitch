import { onScopeDispose, ref, watch, type Ref } from 'vue';

import type { Direction, Doll } from './paperDoll';
import { useWalker } from './useWalker';

/** How long the doll stands between walks, in ms. */
const MIN_REST = 1000;
const MAX_REST = 6000;

/**
 * Walks the doll on its own: it rests for a few seconds, then walks to a random spot within
 * `0..width - doll.size` (in sprite px), and so on.
 */
export function useWanderer(doll: Doll, width: Ref<number>) {
  const direction = ref<Direction | null>(null);
  const { frame, x } = useWalker(doll, direction, width);

  const randomX = () => Math.floor(Math.random() * Math.max(0, width.value - doll.size));
  x.value = randomX();

  let target = 0;
  let timer: ReturnType<typeof setTimeout>;

  function rest() {
    direction.value = null;
    timer = setTimeout(walk, MIN_REST + (Math.random() * (MAX_REST - MIN_REST)));
  }

  function walk() {
    target = randomX();
    if (target === x.value) rest();
    else direction.value = target < x.value ? 'west' : 'east';
  }

  watch([x, width], () => {
    const d = direction.value;
    if (!d) return;
    // The target may end up past the edge after a resize
    const to = Math.min(target, Math.max(0, width.value - doll.size));
    if (d === 'east' ? x.value >= to : x.value <= to) rest();
  });

  rest();
  onScopeDispose(() => clearTimeout(timer));
  return { frame, x };
}
