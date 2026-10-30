import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';

import { fetchFollowedAt } from '../twitch/ivr';

/**
 * Одновременных запросов не больше: история чата может разом дать сотню зрителей
 */
const MAX_PARALLEL = 4;

/**
 * Даты фоллова канала (мс, null — не зафолловлен) для зрителей из logins.
 * Каждого спрашиваем один раз за канал; пока ответа нет, зрителя в карте нет
 */
export function useFollowDates(channel: Ref<string>, logins: Ref<string[]>) {
  const dates = shallowRef<ReadonlyMap<string, number | null>>(new Map());
  let controller = new AbortController();
  // Уже запрошенные и ждущие очереди
  let requested = new Set<string>();
  let queue: string[] = [];
  let active = 0;

  function pump() {
    while (active < MAX_PARALLEL && queue.length) {
      const login = queue.shift()!;
      const name = channel.value;
      const { signal } = controller;
      active++;
      fetchFollowedAt(login, name, signal)
        .catch((err: unknown) => {
          if (!signal.aborted) console.warn(`Не удалось узнать, когда ${login} зафолловил ${name}`, err);
          return null;
        })
        .then(followedAt => {
          if (signal.aborted) return;
          dates.value = new Map(dates.value).set(login, followedAt);
        })
        .finally(() => {
          if (signal.aborted) return;
          active--;
          pump();
        });
    }
  }

  watch(channel, () => {
    controller.abort();
    controller = new AbortController();
    requested = new Set();
    queue = [];
    active = 0;
    dates.value = new Map();
  });

  watch(
    [logins, channel],
    () => {
      for (const login of logins.value) {
        if (requested.has(login)) continue;
        requested.add(login);
        queue.push(login);
      }
      pump();
    },
    { immediate: true },
  );

  onScopeDispose(() => controller.abort());

  return dates;
}
