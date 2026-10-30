import type { ShallowRef, WatchSource } from 'vue';

/**
 * Attribute that links a rendered message element to its message id.
 */
export const MESSAGE_ID_ATTR = 'data-message-id';

/**
 * Reports messages that new ones pushed out through the top of `container` and that are no longer
 * visible at all. Message elements are the container's children with the `MESSAGE_ID_ATTR`
 * attribute; `messages` is watched to pick up newly rendered ones.
 */
export function useOffscreenMessages(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  messages: WatchSource,
  onOffscreen: (ids: Set<string>) => void,
) {
  let observer: IntersectionObserver | undefined;
  const observed = new WeakSet<Element>();

  function observeNew() {
    if (!observer || !container.value) {
      return;
    }
    for (const el of container.value.children) {
      if (!observed.has(el) && el.hasAttribute(MESSAGE_ID_ATTR)) {
        observed.add(el);
        observer.observe(el);
      }
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver(entries => {
      const ids = new Set<string>();
      for (const { boundingClientRect, isIntersecting, rootBounds, target } of entries) {
        // A removed element stays observed until it is unobserved explicitly.
        if (!target.isConnected) {
          observer?.unobserve(target);
          continue;
        }
        const id = target.getAttribute(MESSAGE_ID_ATTR);
        if (id && !isIntersecting && rootBounds && boundingClientRect.bottom <= rootBounds.top) {
          observer?.unobserve(target);
          ids.add(id);
        }
      }
      if (ids.size) {
        onOffscreen(ids);
      }
    }, { root: container.value });

    watch(messages, observeNew, { deep: 1, flush: 'post', immediate: true });
  });

  onBeforeUnmount(() => observer?.disconnect());
}
