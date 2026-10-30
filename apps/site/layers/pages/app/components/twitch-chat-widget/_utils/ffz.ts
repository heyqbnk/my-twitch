import type { Emote } from './emotes';

import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://api.frankerfacez.com/v1';

/**
 * Image URLs by scale: "1", "2", "4".
 */
type FfzUrls = Partial<Record<string, string>>;

interface FfzEmote {
  /**
   * Animated versions of the image, if the emote is animated.
   */
  animated?: FfzUrls | null;
  name: string;
  urls: FfzUrls;
}

interface FfzSets {
  sets: Partial<Record<string, { emoticons?: FfzEmote[] }>>;
}

function toEmotes(sets: FfzSets, setIds: number[]): Emote[] {
  return setIds.flatMap(id => sets.sets[id]?.emoticons ?? []).flatMap(emote => {
    const urls = emote.animated ?? emote.urls;
    const src = urls['1'];
    if (!src) {
      return [];
    }
    return [{ name: emote.name, src, srcset: urls['2'] ? `${urls['2']} 2x` : '' }];
  });
}

export const fetchFfzGlobalEmotes = cachedOnce(async () => {
  const global = await fetchJson<FfzSets & { default_sets: number[] }>(`${API_URL}/set/global`);
  return global ? toEmotes(global, global.default_sets) : [];
});

/**
 * Channel emotes by the channel's Twitch ID. Empty if the channel has no FFZ account.
 */
export async function fetchFfzChannelEmotes(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<Emote[]> {
  const room = await fetchJson<FfzSets & { room: { set: number } }>(
    `${API_URL}/room/id/${twitchUserId}`,
    signal,
  );
  return room ? toEmotes(room, [room.room.set]) : [];
}
