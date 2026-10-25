import { computed, onScopeDispose, ref, type Ref } from 'vue';
import { FRAME_MS, type Direction, type Doll, type Frame } from './paperDoll';

type State =
  | { kind: 'start'; direction: Direction; frame: number }
  | { kind: 'walk'; direction: Direction; frame: number }
  | { kind: 'turn'; direction: Direction; frame: number }
  | { kind: 'idle' };

/**
 * Walks the doll while `input` holds a direction, stepping off with the start animation when it
 * stands facing the viewer; once it is released, finishes the current walk cycle, then plays the
 * stop-and-turn animation and leaves it standing, facing the viewer.
 * `x` is the left edge of the sprite box in sprite px, kept within `0..width - doll.size`.
 */
export function useWalker(doll: Doll, input: Ref<Direction | null>, width: Ref<number>) {
  const state = ref<State>({ kind: 'idle' });
  const x = ref(0);

  function move(direction: Direction, step: number) {
    const maxX = Math.max(0, width.value - doll.size);
    x.value = Math.min(maxX, Math.max(0, x.value + (direction === 'west' ? -step : step)));
  }

  function start(direction: Direction, frame: number) {
    state.value = { kind: 'start', direction, frame };
    // Turns in place first, then speeds up to the walk
    move(direction, Math.round(doll.walkStep * frame / doll.start[direction].length));
  }

  function walk(direction: Direction, frame: number) {
    state.value = { kind: 'walk', direction, frame };
    move(direction, doll.walkStep);
  }

  function tick() {
    const s = state.value;
    const direction = input.value;
    if (s.kind === 'start') {
      // Plays out even if released, so the doll never snaps out of the turn
      const turned = s.frame + 1 >= doll.start[s.direction].length;
      if (direction && direction !== s.direction) walk(direction, 0);
      else if (turned) walk(s.direction, doll.walkAfterStart);
      else start(s.direction, s.frame + 1);
    } else if (direction) {
      if (s.kind === 'idle') start(direction, 0);
      else {
        // Changing direction or starting mid-turn restarts the cycle
        const frame = s.kind === 'walk' && s.direction === direction ? (s.frame + 1) % doll.walk[direction].length : 0;
        walk(direction, frame);
      }
    } else if (s.kind === 'walk') {
      // The turn picks up from the pose that ends the cycle, so the step plays out first
      if (s.frame + 1 < doll.walk[s.direction].length) walk(s.direction, s.frame + 1);
      else state.value = { kind: 'turn', direction: s.direction, frame: 0 };
    } else if (s.kind === 'turn') {
      // Its last frame is the idle pose, which comes next anyway
      state.value = s.frame + 2 < doll.stop[s.direction].length
        ? { ...s, frame: s.frame + 1 }
        : { kind: 'idle' };
    }
  }

  const timer = setInterval(tick, FRAME_MS);
  onScopeDispose(() => clearInterval(timer));

  const frame = computed<Frame>(() => {
    const s = state.value;
    if (s.kind === 'start') return doll.start[s.direction][s.frame]!;
    if (s.kind === 'walk') return doll.walk[s.direction][s.frame]!;
    if (s.kind === 'turn') return doll.stop[s.direction][s.frame]!;
    return doll.idle;
  });

  return { x, frame };
}
