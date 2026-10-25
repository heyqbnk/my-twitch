import { onScopeDispose, ref } from 'vue';

/** The window's inner width, in CSS px. */
export function useViewportWidth() {
  const width = ref(window.innerWidth);
  function onResize() {
    width.value = window.innerWidth;
  }
  window.addEventListener('resize', onResize);
  onScopeDispose(() => window.removeEventListener('resize', onResize));
  return width;
}
