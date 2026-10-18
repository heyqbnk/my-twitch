import { computed, onScopeDispose, ref, type Ref } from 'vue';
import { FPS, IDLE, SOUTH_TURN_WALK, SPRITE_SIZE, STOP_TURN_SOUTH, WALK, type Direction, type Frame } from '../doll/paperDoll';

/** How far one walk frame moves the doll, in sprite px. */
const WALK_STEP = 6;

type State =
  | { kind: 'start'; direction: Direction; frame: number }
  | { kind: 'walk'; direction: Direction; frame: number }
  | { kind: 'turn'; direction: Direction; frame: number }
  | { kind: 'idle'; frame: number };

/**
 * Walks the doll while `input` holds a direction, stepping off with the turn animation when it
 * stands facing the viewer; once it is released, finishes the current walk cycle, then plays the
 * stop-and-turn animation and leaves it breathing, facing the viewer.
 * `x` is the left edge of the sprite box in sprite px, kept within `0..width - SPRITE_SIZE`.
 */
export function useWalker(input: Ref<Direction | null>, width: Ref<number>) {
  const state = ref<State>({ kind: 'idle', frame: 0 });
  const x = ref(0);

  function move(direction: Direction, step: number) {
    const maxX = Math.max(0, width.value - SPRITE_SIZE);
    x.value = Math.min(maxX, Math.max(0, x.value + (direction === 'west' ? -step : step)));
  }

  function start(direction: Direction, frame: number) {
    state.value = { kind: 'start', direction, frame };
    // Turns in place first, then speeds up to the walk
    move(direction, Math.round(WALK_STEP * frame / SOUTH_TURN_WALK[direction].length));
  }

  function walk(direction: Direction, frame: number) {
    state.value = { kind: 'walk', direction, frame };
    move(direction, WALK_STEP);
  }

  function tick() {
    const s = state.value;
    const direction = input.value;
    if (s.kind === 'start') {
      // Plays out even if released, so the doll never snaps out of the turn
      const turned = s.frame + 1 >= SOUTH_TURN_WALK[s.direction].length;
      if (direction && direction !== s.direction) walk(direction, 0);
      // The turn ends on WALK[0], so the walk picks up from the next frame
      else if (turned) walk(s.direction, 1);
      else start(s.direction, s.frame + 1);
    } else if (direction) {
      if (s.kind === 'idle') start(direction, 0);
      else {
        // Changing direction or starting mid-turn restarts the cycle
        const frame = s.kind === 'walk' && s.direction === direction ? (s.frame + 1) % WALK[direction].length : 0;
        walk(direction, frame);
      }
    } else if (s.kind === 'walk') {
      // The turn picks up from the pose that ends the cycle, so the step plays out first
      if (s.frame + 1 < WALK[s.direction].length) walk(s.direction, s.frame + 1);
      else state.value = { kind: 'turn', direction: s.direction, frame: 0 };
    } else if (s.kind === 'turn') {
      // Its last frame is IDLE[0], which comes next anyway
      state.value = s.frame + 2 < STOP_TURN_SOUTH[s.direction].length
        ? { ...s, frame: s.frame + 1 }
        : { kind: 'idle', frame: 0 };
    } else {
      state.value = { kind: 'idle', frame: (s.frame + 1) % IDLE.length };
    }
  }

  const timer = setInterval(tick, 1000 / FPS);
  onScopeDispose(() => clearInterval(timer));

  const frame = computed<Frame>(() => {
    const s = state.value;
    if (s.kind === 'start') return SOUTH_TURN_WALK[s.direction][s.frame]!;
    if (s.kind === 'walk') return WALK[s.direction][s.frame]!;
    if (s.kind === 'turn') return STOP_TURN_SOUTH[s.direction][s.frame]!;
    return IDLE[s.frame]!;
  });

  return { x, frame };
}
