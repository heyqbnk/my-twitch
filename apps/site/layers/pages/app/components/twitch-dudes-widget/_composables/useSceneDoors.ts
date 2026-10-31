import type { InjectionKey } from 'vue';

export type Side = 'left' | 'right';
export const SIDES: Side[] = ['left', 'right'];

/**
 * Animation durations: the door appearing/disappearing and the leaf swinging.
 */
export const DOOR_APPEAR_MS = 200;
export const DOOR_SWING_MS = 350;
/**
 * How long the door stays open after the last one passed: the next one gets through without
 * closing.
 */
const LINGER_MS = 400;
/**
 * How long a closed door stands idle before disappearing.
 */
const HIDE_DELAY = 1200;

export interface DoorView {
  open: boolean;
  visible: boolean;
}

/**
 * hidden ⇄ closed ⇄ open; appearing, opening, closing and vanishing are the animations between them.
 */
type Phase = 'appearing' | 'closed' | 'closing' | 'hidden' | 'open' | 'opening' | 'vanishing';

interface Door {
  /**
   * The timer is a wait rather than an animation: a new dude interrupts it.
   */
  idle: boolean;
  phase: Phase;
  timer: ReturnType<typeof setTimeout> | null;
  /**
   * How many dudes are passing or waiting to pass now.
   */
  users: number;
  view: DoorView;
  waiters: (() => void)[];
}

export interface SceneDoors {
  /**
   * A dude queues up at the door; the promise resolves once it is open. Holds the door until
   * `release`.
   */
  open(side: Side): Promise<void>;
  release(side: Side): void;
}

const DOORS_KEY: InjectionKey<SceneDoors> = Symbol('sceneDoors');

/**
 * A door at each edge of the scene. A door appears when someone goes through it and stays open
 * while at least one dude holds it: those entering and leaving at once go through the same door.
 */
export function provideSceneDoors() {
  const view = reactive<Record<Side, DoorView>>({
    left: { open: false, visible: false },
    right: { open: false, visible: false },
  });
  const doors = Object.fromEntries(
    SIDES.map((side): [Side, Door] => [
      side,
      { idle: false, phase: 'hidden', timer: null, users: 0, view: view[side], waiters: [] },
    ]),
  ) as Record<Side, Door>;

  function settle(door: Door, phase: Phase, ms: number, idle = false) {
    door.idle = idle;
    door.timer = setTimeout(() => {
      door.timer = null;
      door.phase = phase;
      advance(door);
    }, ms);
  }

  function advance(door: Door) {
    const wanted = door.users > 0;
    if (door.timer) {
      // An animation plays out; a wait is interrupted only if the door is needed again
      if (!door.idle || !wanted) {
        return;
      }
      clearTimeout(door.timer);
      door.timer = null;
    }
    switch (door.phase) {
      case 'hidden':
        if (!wanted) {
          break;
        }
        door.view.visible = true;
        door.phase = 'appearing';
        settle(door, 'closed', DOOR_APPEAR_MS);
        break;
      case 'closed':
        if (wanted) {
          door.view.open = true;
          door.phase = 'opening';
          settle(door, 'open', DOOR_SWING_MS);
        } else {
          settle(door, 'vanishing', HIDE_DELAY, true);
        }
        break;
      case 'open':
        if (wanted) {
          door.waiters.splice(0).forEach(resolve => resolve());
        } else {
          settle(door, 'closing', LINGER_MS, true);
        }
        break;
      // The wait is over: the animation starts
      case 'closing':
        door.view.open = false;
        settle(door, 'closed', DOOR_SWING_MS);
        break;
      case 'vanishing':
        door.view.visible = false;
        settle(door, 'hidden', DOOR_APPEAR_MS);
        break;
    }
  }

  const api: SceneDoors = {
    open(side) {
      const door = doors[side];
      door.users++;
      return new Promise(resolve => {
        door.waiters.push(resolve);
        advance(door);
      });
    },
    release(side) {
      const door = doors[side];
      door.users = Math.max(0, door.users - 1);
      if (door.users === 0) {
        advance(door);
      }
    },
  };

  provide(DOORS_KEY, api);
  onScopeDispose(() => {
    for (const door of Object.values(doors)) {
      if (door.timer) {
        clearTimeout(door.timer);
      }
    }
  });
  return view;
}

export function useSceneDoors(): SceneDoors {
  const doors = inject(DOORS_KEY, null);
  if (!doors) {
    throw new Error('useSceneDoors: no provideSceneDoors up the tree');
  }
  return doors;
}
