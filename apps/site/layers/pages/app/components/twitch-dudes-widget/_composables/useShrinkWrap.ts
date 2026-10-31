import type { Ref } from 'vue';

/**
 * A block with wrapped lines stretches to its max-width even if no line reaches it, leaving empty
 * room at the side. This narrows the target to its longest line: the line breaks stay the same,
 * as each line still fits.
 * The line widths come from the rects of text and inline leaves (emote images, badges, the
 * cursor); block rects don't fit — they are always full-width.
 * `measure` is a selector of the target's parts the width is measured by (the whole target by
 * default).
 */
export function useShrinkWrap(target: Ref<HTMLElement | null>, measure?: string) {
  const range = document.createRange();

  function contentRight(el: Element) {
    let right = -Infinity;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let rects: DOMRectList;
      if (node instanceof Text) {
        if (!node.data.trim()) {
          continue;
        }
        range.selectNodeContents(node);
        rects = range.getClientRects();
      } else if (node instanceof HTMLElement && !node.children.length
        && (node instanceof HTMLImageElement || getComputedStyle(node).display.startsWith('inline'))) {
        rects = node.getClientRects();
      } else {
        continue;
      }
      for (const rect of rects) {
        right = Math.max(right, rect.right);
      }
    }
    return right;
  }

  function fit() {
    const el = target.value;
    if (!el) {
      return;
    }
    // Measured at the natural width: the text may have changed since the last fit
    el.style.width = '';
    const box = el.getBoundingClientRect();
    if (!box.width) {
      return;
    }
    const parts = measure ? Array.from(el.querySelectorAll(measure)) : [el];
    const right = Math.max(...parts.map(contentRight));
    if (right === -Infinity) {
      return;
    }
    // The rects are on screen, the width is in the element's CSS px
    const scale = el.offsetWidth / box.width;
    const width = Math.ceil((right - box.left) * scale);
    if (width < el.offsetWidth) {
      el.style.width = `${width}px`;
    }
  }

  // Lines change as the text is typed, emote images and fonts load, the scale changes — all of
  // this changes the target's size too. The fit repeats the same width, so the observer doesn't
  // loop
  const observer = new ResizeObserver(fit);
  watch(target, (el, _, onCleanup) => {
    if (!el) {
      return;
    }
    observer.observe(el);
    onCleanup(() => observer.unobserve(el));
  }, { flush: 'post' });
  onScopeDispose(() => observer.disconnect());

  return fit;
}
