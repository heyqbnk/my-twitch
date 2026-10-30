import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';

import * as bttv from '../twitch/bttv';
import type { Emote, EmoteMap } from '../twitch/emotes';
import * as seventv from '../twitch/seventv';

/**
 * Эмодзи BTTV и 7TV по room-id канала. При совпадении названий побеждает
 * более поздний источник в списке: канальные важнее глобальных, 7TV важнее BTTV.
 */
export function useThirdPartyEmotes(roomId: Ref<string | null>) {
  const emotes = shallowRef<EmoteMap>(new Map());
  let controller: AbortController | null = null;

  watch(
    roomId,
    async id => {
      controller?.abort();
      emotes.value = new Map();
      if (!id) return;

      const ctrl = new AbortController();
      controller = ctrl;
      const sources = [
        ['BTTV', bttv.fetchGlobalEmotes()],
        ['7TV', seventv.fetchGlobalEmotes()],
        ['BTTV', bttv.fetchChannelEmotes(id, ctrl.signal)],
        ['7TV', seventv.fetchChannelEmotes(id, ctrl.signal)],
      ] as const;
      const results = await Promise.allSettled(sources.map(([, request]) => request));
      if (ctrl.signal.aborted) return;

      const map = new Map<string, Emote>();
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') for (const e of result.value) map.set(e.name, e);
        else console.warn(`Не удалось загрузить эмодзи ${sources[i][0]}`, result.reason);
      });
      emotes.value = map;
    },
    { immediate: true },
  );

  onScopeDispose(() => controller?.abort());

  return emotes;
}
