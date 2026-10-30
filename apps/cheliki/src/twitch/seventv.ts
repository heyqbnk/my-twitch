import type { Emote } from './emotes';
import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://7tv.io/v3';
/**
 * Флаг ZERO_WIDTH: у активного эмодзи в наборе (1 << 0) и у самого эмодзи (1 << 8)
 */
const ACTIVE_ZERO_WIDTH = 1 << 0;
const DATA_ZERO_WIDTH = 1 << 8;

interface SevenTvEmote {
  id: string;
  name: string;
  flags: number;
  data?: { flags?: number };
}

interface SevenTvEmoteSet {
  emotes?: SevenTvEmote[] | null;
}

function toEmote(e: SevenTvEmote): Emote {
  const zeroWidth = (e.flags & ACTIVE_ZERO_WIDTH) !== 0
    || ((e.data?.flags ?? 0) & DATA_ZERO_WIDTH) !== 0;
  return { id: e.id, name: e.name, provider: '7tv', zeroWidth };
}

export const fetchGlobalEmotes = cachedOnce(async () => {
  const set = await fetchJson<SevenTvEmoteSet>(`${API_URL}/emote-sets/global`);
  return (set?.emotes ?? []).map(toEmote);
});

/**
 * twitchUserId — room-id канала. Если у канала нет аккаунта 7TV, возвращает [].
 */
export async function fetchChannelEmotes(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<Emote[]> {
  const user = await fetchJson<{ emote_set?: SevenTvEmoteSet | null }>(
    `${API_URL}/users/twitch/${twitchUserId}`,
    signal,
  );
  return (user?.emote_set?.emotes ?? []).map(toEmote);
}
