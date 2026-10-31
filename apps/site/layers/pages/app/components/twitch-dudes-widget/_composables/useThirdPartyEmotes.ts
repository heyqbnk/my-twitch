import type { Ref } from 'vue';

import * as bttv from '../_utils/bttv';
import type { Emote, EmoteMap } from '../_utils/emotes';
import * as seventv from '../_utils/seventv';

/**
 * BTTV and 7TV emotes by the channel's room id. On a name clash the later source in the list
 * wins: channel emotes beat global ones, 7TV beats BTTV.
 */
export function useThirdPartyEmotes(roomId: Ref<string | null>) {
  const emotes = shallowRef<EmoteMap>(new Map());
  let controller: AbortController | null = null;

  watch(
    roomId,
    async id => {
      controller?.abort();
      emotes.value = new Map();
      if (!id) {
        return;
      }

      const ctrl = new AbortController();
      controller = ctrl;
      const sources = [
        ['BTTV', bttv.fetchGlobalEmotes()],
        ['7TV', seventv.fetchGlobalEmotes()],
        ['BTTV', bttv.fetchChannelEmotes(id, ctrl.signal)],
        ['7TV', seventv.fetchChannelEmotes(id, ctrl.signal)],
      ] as const;
      const results = await Promise.allSettled(sources.map(([, request]) => request));
      if (ctrl.signal.aborted) {
        return;
      }

      const map = new Map<string, Emote>();
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          for (const e of result.value) {
            map.set(e.name, e);
          }
        } else {
          console.warn(`Failed to load ${sources[i]![0]} emotes`, result.reason);
        }
      });
      emotes.value = map;
    },
    { immediate: true },
  );

  onScopeDispose(() => controller?.abort());

  return emotes;
}
