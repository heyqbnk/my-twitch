import { inject, onScopeDispose, provide, reactive, type InjectionKey } from 'vue';

export type Side = 'left' | 'right';
export const SIDES: Side[] = ['left', 'right'];

// Размеры в пикселях спрайта, на экране умножаются на масштаб: косяк у самого края сцены
// и створка на петлях у него. Закрытая створка стоит ребром к зрителю и не видна,
// открываясь — поворачивается из-за края сцены к зрителю.
export const DOOR_JAMB = 2;
export const DOOR_LEAF = 14;
export const DOOR_HEIGHT = 30;
// Длительности анимаций: появление/исчезновение двери и поворот створки
export const DOOR_APPEAR_MS = 200;
export const DOOR_SWING_MS = 350;
// Сколько дверь стоит открытой после последнего прошедшего: следующий успеет без закрывания
const LINGER_MS = 400;
// Сколько закрытая дверь стоит без дела, прежде чем исчезнуть
const HIDE_DELAY = 1200;

export interface DoorView {
  visible: boolean;
  open: boolean;
}

// hidden ⇄ closed ⇄ open; appearing, opening, closing и vanishing — анимации между ними
type Phase = 'hidden' | 'appearing' | 'closed' | 'opening' | 'open' | 'closing' | 'vanishing';

interface Door {
  view: DoorView;
  phase: Phase;
  // Сколько человечков сейчас проходит или ждёт прохода
  users: number;
  waiters: (() => void)[];
  timer: ReturnType<typeof setTimeout> | null;
  // Таймер — ожидание, а не анимация: новый человечек его прерывает
  idle: boolean;
}

export interface SceneDoors {
  // Человечек встаёт в очередь к двери; промис — когда она открыта. Держит дверь до release.
  open(side: Side): Promise<void>;
  release(side: Side): void;
}

const DOORS_KEY: InjectionKey<SceneDoors> = Symbol('sceneDoors');

// По двери на каждом краю сцены. Дверь появляется, когда через неё кто-то идёт, и открыта,
// пока её держит хоть один человечек: одновременно заходящие и уходящие проходят через одну дверь.
export function provideSceneDoors() {
  const view = reactive<Record<Side, DoorView>>({
    left: { visible: false, open: false },
    right: { visible: false, open: false },
  });
  const doors = Object.fromEntries(
    SIDES.map((side): [Side, Door] => [
      side,
      { view: view[side], phase: 'hidden', users: 0, waiters: [], timer: null, idle: false },
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
      // Анимацию доигрываем; ожидание прерываем, только если дверь снова нужна
      if (!door.idle || !wanted) return;
      clearTimeout(door.timer);
      door.timer = null;
    }
    switch (door.phase) {
      case 'hidden':
        if (!wanted) break;
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
        if (wanted) door.waiters.splice(0).forEach(resolve => resolve());
        else settle(door, 'closing', LINGER_MS, true);
        break;
      // Ожидание истекло — запускаем анимацию
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
      if (door.users === 0) advance(door);
    },
  };

  provide(DOORS_KEY, api);
  onScopeDispose(() => {
    for (const door of Object.values(doors)) if (door.timer) clearTimeout(door.timer);
  });
  return view;
}

export function useSceneDoors(): SceneDoors {
  const doors = inject(DOORS_KEY, null);
  if (!doors) throw new Error('useSceneDoors: нет provideSceneDoors выше по дереву');
  return doors;
}
