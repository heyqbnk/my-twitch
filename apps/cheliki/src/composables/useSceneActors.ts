import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

import { shownAt, type ChatMessage } from './useTwitchChat';
import { actorPriority } from '../scene/actorPriority';
import { actorColor } from '../scene/actorStyle';
import type { ChatRole } from '../twitch/badges';

const MAX_TIMEOUT = (2 ** 31) - 1;

export interface SceneActor {
  login: string;
  name: string;
  /**
   * Значок роли перед ником — по последнему сообщению: роль могут выдать или снять
   */
  role?: ChatRole;
  /**
   * Старшинство: кто старше, тот поверх остальных (см. actorPriority)
   */
  priority: number;
  color: string;
  lastMessage: ChatMessage;
  /**
   * Попрощался (lastMessage — прощание) и уходит со сцены
   */
  leaving?: boolean;
}

/**
 * Человечки на сцене — авторы сообщений из буфера чата, в порядке первого появления.
 * Сообщения автора выпали из буфера, он молчит дольше stay мс или написал !vanish / bb —
 * человечек уходит со сцены, а сама команда не показывается.
 * Ушедший по команде остаётся в списке с leaving, чтобы сцена знала его прощание.
 * followDates — даты фоллова канала по логинам, для старшинства фолловеров.
 */
export function useSceneActors(
  messages: Ref<ChatMessage[]>,
  stay: Ref<number | null>,
  followDates: Ref<ReadonlyMap<string, number | null>>,
) {
  // Текущее время обновляется к моменту, когда истекает срок ближайшего человечка
  const now = ref(Date.now());
  let timer: ReturnType<typeof setTimeout> | null = null;
  onScopeDispose(() => {
    if (timer) clearTimeout(timer);
  });

  const all = computed<SceneActor[]>(() => {
    const actors = new Map<string, SceneActor>();
    for (const msg of messages.value) {
      const actor = actors.get(msg.login);
      if (msg.vanish) {
        if (!actor) continue;
        if (msg.farewell && !actor.leaving) actor.lastMessage = msg;
        actor.leaving = true;
      } else if (actor && !actor.leaving) {
        actor.name = msg.author;
        actor.role = msg.role;
        actor.priority = actorPriority(msg, followDates.value.get(msg.login));
        // Зритель мог сменить цвет ника — человечек перекрашивается вслед за ним
        actor.color = actorColor(msg);
        actor.lastMessage = msg;
      } else {
        actors.set(msg.login, {
          color: actorColor(msg),
          lastMessage: msg,
          login: msg.login,
          name: msg.author,
          priority: actorPriority(msg, followDates.value.get(msg.login)),
          role: msg.role,
        });
      }
    }
    return [...actors.values()];
  });

  /**
   * Срок, когда человечек уходит
   */
  const expiry = (a: SceneActor, limit: number) => shownAt(a.lastMessage) + limit;

  const visible = computed(() => {
    const limit = stay.value;
    if (limit === null) return all.value;
    return all.value.filter(actor => expiry(actor, limit) > now.value);
  });

  watch(
    [visible, stay],
    () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const limit = stay.value;
      if (limit === null) return;
      const nextExpiry = Math.min(...visible.value.map(a => expiry(a, limit)));
      if (nextExpiry === Infinity) return;
      // Больше MAX_TIMEOUT setTimeout срабатывает сразу — тогда просто перепроверим позже
      const delay = Math.min(Math.max(0, nextExpiry - Date.now()), MAX_TIMEOUT);
      timer = setTimeout(() => (now.value = Date.now()), delay);
    },
    { immediate: true },
  );

  return visible;
}
