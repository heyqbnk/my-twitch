import { onScopeDispose, watch, type Ref } from 'vue';

// Блок с переносом строк растягивается до max-width, даже если ни одна строка до неё не доходит,
// и сбоку остаётся пустое место. Сужаем target до самой длинной строки: переносы при этом
// остаются прежними, ведь каждая строка по-прежнему помещается.
// Ширину строк дают прямоугольники текста и строчных листьев (картинок эмодзи, значков, курсора);
// прямоугольники блоков не годятся — они всегда во всю ширину.
// measure — селектор частей target, по которым считается ширина (по умолчанию — весь target)
export function useShrinkWrap(target: Ref<HTMLElement | null>, measure?: string) {
  const range = document.createRange();

  function contentRight(el: Element) {
    let right = -Infinity;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let rects: DOMRectList;
      if (node instanceof Text) {
        if (!node.data.trim()) continue;
        range.selectNodeContents(node);
        rects = range.getClientRects();
      } else if (node instanceof HTMLElement && !node.children.length
        && (node instanceof HTMLImageElement || getComputedStyle(node).display.startsWith('inline'))) {
        rects = node.getClientRects();
      } else continue;
      for (const rect of rects) right = Math.max(right, rect.right);
    }
    return right;
  }

  function fit() {
    const el = target.value;
    if (!el) return;
    // Мерим при естественной ширине: с прошлой подгонки текст мог смениться
    el.style.width = '';
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    const parts = measure ? Array.from(el.querySelectorAll(measure)) : [el];
    const right = Math.max(...parts.map(contentRight));
    if (right === -Infinity) return;
    // Прямоугольники экранные, ширина — в CSS-пикселях элемента
    const scale = el.offsetWidth / box.width;
    const width = Math.ceil((right - box.left) * scale);
    if (width < el.offsetWidth) el.style.width = `${width}px`;
  }

  // Строки меняются, когда печатается текст, догружаются картинки эмодзи и шрифты, меняется масштаб —
  // всё это меняет и размер target. Подгонка повторяет ту же ширину, так что наблюдатель не зацикливается
  const observer = new ResizeObserver(fit);
  watch(target, (el, _, onCleanup) => {
    if (!el) return;
    observer.observe(el);
    onCleanup(() => observer.unobserve(el));
  }, { flush: 'post' });
  onScopeDispose(() => observer.disconnect());

  return fit;
}
