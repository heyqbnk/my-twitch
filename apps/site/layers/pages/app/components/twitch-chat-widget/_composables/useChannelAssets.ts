import type { Ref } from 'vue';

import { type Badge, type BadgeMap, fetchChannelBadges, fetchGlobalBadges } from '../_utils/badges';
import { fetchBttvChannelEmotes, fetchBttvGlobalEmotes } from '../_utils/bttv';
import type { Emote, EmoteMap } from '../_utils/emotes';
import { fetchFfzChannelEmotes, fetchFfzGlobalEmotes } from '../_utils/ffz';
import { fetchSevenTvChannelEmotes, fetchSevenTvGlobalEmotes } from '../_utils/seventv';

/**
 * Collects entries from all sources into a map. On a key collision the later source wins.
 * A failed source is skipped, so one service being down doesn't break the others.
 */
async function collect<T>(sources: [string, Promise<[string, T][]>][]): Promise<Map<string, T>> {
  const results = await Promise.allSettled(sources.map(([, request]) => request));
  const map = new Map<string, T>();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      for (const [key, value] of result.value) {
        map.set(key, value);
      }
    } else {
      console.warn(`Failed to load ${sources[i]![0]}`, result.reason);
    }
  });
  return map;
}

function byName(request: Promise<Emote[]>): Promise<[string, Emote][]> {
  return request.then(emotes => emotes.map(emote => [emote.name, emote]));
}

/**
 * Badges and third-party emotes (BTTV, FFZ, 7TV) of a channel by its Twitch ID. Channel ones
 * override global ones; among emotes with the same name 7TV beats FFZ, and FFZ beats BTTV.
 */
export function useChannelAssets(roomId: Ref<string | null>) {
  /**
   * Null while badges are loading.
   */
  const badges = shallowRef<BadgeMap | null>(null);
  const emotes = shallowRef<EmoteMap>(new Map());
  let controller: AbortController | undefined;

  watch(roomId, async id => {
    controller?.abort();
    badges.value = null;
    emotes.value = new Map();
    if (!id) {
      return;
    }

    const ctrl = new AbortController();
    controller = ctrl;
    const { signal } = ctrl;

    const [badgeMap, emoteMap] = await Promise.all([
      collect<Badge>([
        ['global badges', fetchGlobalBadges()],
        ['channel badges', fetchChannelBadges(id, signal)],
      ]),
      collect<Emote>([
        ['BTTV global emotes', byName(fetchBttvGlobalEmotes())],
        ['FFZ global emotes', byName(fetchFfzGlobalEmotes())],
        ['7TV global emotes', byName(fetchSevenTvGlobalEmotes())],
        ['BTTV channel emotes', byName(fetchBttvChannelEmotes(id, signal))],
        ['FFZ channel emotes', byName(fetchFfzChannelEmotes(id, signal))],
        ['7TV channel emotes', byName(fetchSevenTvChannelEmotes(id, signal))],
      ]),
    ]);
    if (signal.aborted) {
      return;
    }
    badges.value = badgeMap;
    emotes.value = emoteMap;
  });

  onBeforeUnmount(() => controller?.abort());

  return { badges, emotes };
}
