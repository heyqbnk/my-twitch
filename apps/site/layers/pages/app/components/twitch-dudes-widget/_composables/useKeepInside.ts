import type { InjectionKey, Ref } from 'vue';

const BOUNDS_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('sceneBounds');

/**
 * The element whose bounds the dudes' bubbles and names must not cross.
 */
export function provideSceneBounds(el: Ref<HTMLElement | null>) {
  provide(BOUNDS_KEY, el);
}

interface KeepInsideOptions {
  /**
   * Limit the height to the room above the element's bottom edge (for bubbles growing upwards).
   */
  limitHeight?: boolean;
  /**
   * The desired horizontal shift. The final one is corrected so the target stays inside the scene.
   */
  offset?: Ref<number>;
  padding?: number;
  /**
   * While true, recompute every frame (the target moves without changing its size).
   */
  track?: Ref<boolean>;
}

/**
 * Shifts the target horizontally so it fits into the scene bounds. Returns the shift (apply it
 * with CSS translate) and, with `limitHeight`, the max height. The shift may be animated with
 * a CSS transition: the measurement accounts for the element's current translate.
 */
export function useKeepInside(target: Ref<HTMLElement | null>, options: KeepInsideOptions = {}) {
  const { limitHeight = false, offset, padding = 8, track } = options;
  const bounds = inject(BOUNDS_KEY, ref(null));
  const shift = ref(0);
  const maxHeight = ref<number | null>(null);

  function update() {
    const el = target.value;
    const box = bounds.value?.getBoundingClientRect();
    if (!el || !box) {
      return;
    }
    // A hidden (display: none) element can't be measured: its zero rect at the window's start
    // would give a huge shift, and the element would slide in from the side on appearing
    if (!el.getClientRects().length) {
      return;
    }

    const rect = el.getBoundingClientRect();
    // The position without the current shift, else the shift would accumulate. The translate is
    // taken from the computed style: mid-transition it doesn't equal `shift` yet
    const current = Number.parseFloat(getComputedStyle(el).translate) || 0;
    const base = offset?.value ?? 0;
    const left = rect.left - current + base;
    const right = left + rect.width;
    if (left < box.left + padding) {
      shift.value = base + box.left + padding - left;
    } else if (right > box.right - padding) {
      shift.value = base + box.right - padding - right;
    } else {
      shift.value = base;
    }

    if (limitHeight) {
      maxHeight.value = Math.max(0, rect.bottom - box.top - padding);
    }
  }

  // The target's size changes with the text and with emote images loading, the scene's size with
  // the window (dudes stand at a share of the width)
  const observer = new ResizeObserver(update);
  watch(
    [target, bounds],
    ([el, box], _, onCleanup) => {
      if (el) {
        observer.observe(el);
      }
      if (box) {
        observer.observe(box);
      }
      // A dude appearing moves vertically without changing its size: the height is measured
      // again once the scene's animations end
      if (limitHeight) {
        box?.addEventListener('transitionend', update);
      }
      onCleanup(() => {
        observer.disconnect();
        box?.removeEventListener('transitionend', update);
      });
    },
    { flush: 'post', immediate: true },
  );
  let frame = 0;
  function tick() {
    update();
    frame = requestAnimationFrame(tick);
  }
  if (offset) {
    watch(offset, update, { flush: 'post' });
  }
  if (track) {
    watch(track, on => {
      cancelAnimationFrame(frame);
      if (on) {
        tick();
      } else {
        update();
      }
    });
  }

  onScopeDispose(() => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  });

  return { maxHeight, shift };
}
