import { computed, onScopeDispose, ref, type Ref } from 'vue';
import { FACING_SOUTH, FPS, FRAME_SIZE, START_WALK, STOP_TURN_SOUTH, WALK } from '../paperDoll';

export type Direction = 'west' | 'east';

/** How far one walk frame moves the dude, in sprite px. */
const WALK_STEP = 3;

type State =
  | { kind: 'start'; direction: Direction; frame: number }
  | { kind: 'walk'; direction: Direction; frame: number }
  | { kind: 'turn'; direction: Direction; frame: number }
  | { kind: 'idle'; direction: Direction };

/**
 * Walks the dude while `input` holds a direction, stepping off with the start
 * animation when he stands facing the viewer; once it is released, finishes
 * the current walk cycle, then plays the stop-and-turn animation and leaves
 * him facing the viewer.
 * `x` is the left edge of the frame in sprite px, kept within `0..width - FRAME_SIZE`.
 */
export function useWalker(input: Ref<Direction | null>, width: Ref<number>) {
  const state = ref<State>({ kind: 'idle', direction: 'west' });
  const x = ref(0);

  function move(direction: Direction, step: number) {
    const maxX = Math.max(0, width.value - FRAME_SIZE);
    x.value = Math.min(maxX, Math.max(0, x.value + (direction === 'west' ? -step : step)));
  }

  function start(direction: Direction, frame: number) {
    state.value = { kind: 'start', direction, frame };
    // Turns in place first, then speeds up to the walk
    move(direction, Math.round(WALK_STEP * frame / START_WALK.length));
  }

  function walk(direction: Direction, frame: number) {
    state.value = { kind: 'walk', direction, frame };
    move(direction, WALK_STEP);
  }

  function tick() {
    const s = state.value;
    const direction = input.value;
    if (s.kind === 'start') {
      // Plays out even if released, so the dude never snaps out of the turn
      const turned = s.frame + 1 >= START_WALK.length;
      if (direction && direction !== s.direction) walk(direction, 0);
      else if (turned) walk(s.direction, 0);
      else start(s.direction, s.frame + 1);
    } else if (direction) {
      if (s.kind === 'idle') start(direction, 0);
      else {
        // Changing direction or starting mid-turn restarts the cycle
        const frame = s.kind === 'walk' && s.direction === direction ? (s.frame + 1) % WALK.length : 0;
        walk(direction, frame);
      }
    } else if (s.kind === 'walk') {
      // The turn picks up from the pose that ends the cycle, so the step plays out first
      if (s.frame + 1 < WALK.length) walk(s.direction, s.frame + 1);
      else state.value = { kind: 'turn', direction: s.direction, frame: 0 };
    } else if (s.kind === 'turn') {
      state.value = s.frame + 1 < STOP_TURN_SOUTH.length
        ? { ...s, frame: s.frame + 1 }
        : { kind: 'idle', direction: s.direction };
    }
  }

  const timer = setInterval(tick, 1000 / FPS);
  onScopeDispose(() => clearInterval(timer));

  const src = computed(() => {
    const s = state.value;
    if (s.kind === 'start') return START_WALK[s.frame]!;
    if (s.kind === 'walk') return WALK[s.frame]!;
    if (s.kind === 'turn') return STOP_TURN_SOUTH[s.frame]!;
    return FACING_SOUTH;
  });
  /** Only west frames exist, so walking east (and stopping after it) is drawn mirrored. */
  const mirrored = computed(() => state.value.direction === 'east');

  return { x, src, mirrored };
}
