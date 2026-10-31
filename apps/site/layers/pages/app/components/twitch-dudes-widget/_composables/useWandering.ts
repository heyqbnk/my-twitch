import type { Ref } from 'vue';

/**
 * The speed matches the step animation: a 4-frame cycle in WALK_CYCLE_MS. Speed and distances
 * are in scene px, multiplied by the scale on screen.
 */
export const WALK_CYCLE_MS = 500;
/**
 * px/s
 */
const WALK_SPEED = 16;
const MIN_DISTANCE = 20;
const MAX_DISTANCE = 110;
const MIN_PAUSE = 1500;
const MAX_PAUSE = 6000;
/**
 * The stroll speed factor is picked anew for every step.
 */
const MIN_STROLL_SPEED = 0.7;
const MAX_STROLL_SPEED = 1.5;
/**
 * Don't come closer to the scene's edges than this share of its width.
 */
const MARGIN = 0.03;

export type Facing = 'left' | 'right';

const random = (min: number, max: number) => min + (Math.random() * (max - min));

/**
 * A dude walking on the floor. `x` is a share of the scene width (of el's parent), CSS moves it
 * in `duration` ms; `pace` is the speed factor of the current step (the step animation speeds up
 * with it). `wander` makes it stroll: stand for a random time, then walk a random distance.
 */
export function useWandering(el: Ref<HTMLElement | null>, scale: Ref<number>) {
  const x = ref(0.5);
  const facing = ref<Facing>(Math.random() < 0.5 ? 'left' : 'right');
  const walking = ref(false);
  const duration = ref(0);
  const pace = ref(1);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let arrive: ((arrived: boolean) => void) | null = null;

  const stageWidth = () => el.value?.parentElement?.clientWidth ?? 0;

  // Where the dude is now, mid-step included
  function currentX() {
    const width = stageWidth();
    if (!el.value || !width) {
      return x.value;
    }
    return Number.parseFloat(getComputedStyle(el.value).left) / width;
  }

  // Stops where it stands. An interrupted walkTo resolves with false
  function stop() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = null;
    if (walking.value) {
      x.value = currentX();
    }
    walking.value = false;
    arrive?.(false);
    arrive = null;
  }

  // Moves the dude instantly (behind the door, where it isn't seen)
  function place(at: number) {
    stop();
    x.value = at;
  }

  // Walks to `target` at WALK_SPEED * speed. The promise resolves with true on arrival, false if
  // interrupted. A new step mid-step picks up the CSS transition from where the dude is now
  function walkTo(target: number, speed = 1): Promise<boolean> {
    const from = currentX();
    stop();
    const distance = Math.abs(target - from) * stageWidth();
    if (distance < 1) {
      return Promise.resolve(true);
    }

    facing.value = target > from ? 'right' : 'left';
    pace.value = speed;
    duration.value = (distance / (WALK_SPEED * speed * scale.value)) * 1000;
    walking.value = true;
    x.value = target;
    return new Promise(resolve => {
      arrive = resolve;
      timer = setTimeout(() => {
        timer = null;
        arrive = null;
        walking.value = false;
        resolve(true);
      }, duration.value);
    });
  }

  function rest() {
    timer = setTimeout(stroll, random(MIN_PAUSE, MAX_PAUSE));
  }

  async function stroll() {
    const width = stageWidth();
    if (!width) {
      rest();
      return;
    }

    const min = MARGIN;
    const max = 1 - MARGIN;
    const step = (random(MIN_DISTANCE, MAX_DISTANCE) * scale.value) / width;
    let dir = Math.random() < 0.5 ? -1 : 1;
    // It would hit the edge: go the other way
    if (x.value + (dir * step) < min || x.value + (dir * step) > max) {
      dir = -dir;
    }
    const target = Math.min(max, Math.max(min, x.value + (dir * step)));
    // Interrupted (leaving the scene): no more strolling
    if (await walkTo(target, random(MIN_STROLL_SPEED, MAX_STROLL_SPEED))) {
      rest();
    }
  }

  // A random initial pause, so the dudes don't step in sync
  function wander() {
    stop();
    rest();
  }

  onBeforeUnmount(stop);

  return { currentX, duration, facing, pace, place, stageWidth, stop, walking, walkTo, wander, x };
}
