import type { Ref } from 'vue';

import { fetchFollowedAt } from '../_utils/ivr';

/**
 * No more parallel requests than this: the chat history may bring a hundred viewers at once.
 */
const MAX_PARALLEL = 4;

/**
 * Dates the viewers from `logins` followed the channel (ms, null — doesn't follow). Each viewer is
 * asked about once per channel; until the answer comes, the viewer is absent from the map.
 */
export function useFollowDates(channel: Ref<string>, logins: Ref<string[]>) {
  const dates = shallowRef<ReadonlyMap<string, number | null>>(new Map());
  let controller = new AbortController();
  // Already requested or waiting in the queue
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
          if (!signal.aborted) {
            console.warn(`Failed to find out when ${login} followed ${name}`, err);
          }
          return null;
        })
        .then(followedAt => {
          if (signal.aborted) {
            return;
          }
          dates.value = new Map(dates.value).set(login, followedAt);
        })
        .finally(() => {
          if (signal.aborted) {
            return;
          }
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
        if (requested.has(login)) {
          continue;
        }
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
