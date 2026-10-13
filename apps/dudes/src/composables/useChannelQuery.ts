import { computed, onScopeDispose, ref } from 'vue';

const CHANNEL_RE = /^[a-z0-9_]{1,25}$/;
export const DEFAULT_SCALE = 2;
const MAX_SCALE = 10;

function readChannel(params: URLSearchParams): string | null {
  const name = params.get('channel')?.trim()
    .replace(/^#/, '')
    .toLowerCase();
  return name && CHANNEL_RE.test(name) ? name : null;
}

// Целый масштаб, чтобы пиксели спрайта были одинакового размера
function readScale(params: URLSearchParams): number {
  const scale = Number(params.get('scale'));
  return Number.isInteger(scale) && scale >= 1 && scale <= MAX_SCALE ? scale : DEFAULT_SCALE;
}

// Время на сцене в минутах; дробное допустимо, нет параметра — без ограничения
function readStay(params: URLSearchParams): number | null {
  const raw = params.get('stay');
  const minutes = raw === null ? NaN : Number(raw);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : null;
}

// Задержка показа сообщения в секундах; дробное допустимо, нет параметра — без задержки
function readDelay(params: URLSearchParams): number {
  const raw = params.get('msg_delay');
  const seconds = raw === null ? NaN : Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

// Параметры адреса; обновляются при навигации назад/вперёд.
function useSearchParams() {
  const search = ref(window.location.search);
  const onPopState = () => (search.value = window.location.search);
  window.addEventListener('popstate', onPopState);
  onScopeDispose(() => window.removeEventListener('popstate', onPopState));
  return computed(() => new URLSearchParams(search.value));
}

// Имя канала из ?channel=<name>
export function useChannelQuery() {
  const params = useSearchParams();
  return computed(() => readChannel(params.value));
}

// Размер человечков из ?scale=<1–10>: экранных пикселей на пиксель спрайта
export function useScaleQuery() {
  const params = useSearchParams();
  return computed(() => readScale(params.value));
}

// Сколько мс человечек остаётся на сцене после своего последнего сообщения: ?stay=<минуты>
export function useStayQuery() {
  const params = useSearchParams();
  return computed(() => readStay(params.value));
}

// Через сколько мс показывать сообщение: ?msg_delay=<секунды>. Удалённое за это время не показывается
export function useDelayQuery() {
  const params = useSearchParams();
  return computed(() => readDelay(params.value));
}
