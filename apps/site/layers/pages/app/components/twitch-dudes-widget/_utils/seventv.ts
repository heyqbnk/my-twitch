import type { Emote } from './emotes';
import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://7tv.io/v3';
/**
 * The ZERO_WIDTH flag: on an active emote of a set (1 << 0) and on the emote itself (1 << 8).
 */
const ACTIVE_ZERO_WIDTH = 1 << 0;
const DATA_ZERO_WIDTH = 1 << 8;

interface SevenTvEmote {
  data?: { flags?: number };
  flags: number;
  id: string;
  name: string;
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
 * Channel emotes by the channel's room id. Empty if the channel has no 7TV account.
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
