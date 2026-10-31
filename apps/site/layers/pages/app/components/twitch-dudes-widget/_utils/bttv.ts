import type { Emote } from './emotes';
import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://api.betterttv.net/3/cached';
/**
 * BTTV has no zero-width flag in its API: such emotes are a fixed list of global ones.
 */
const ZERO_WIDTH = new Set(['cvHazmat', 'cvMask', 'IceCold', 'SoSnowy', 'SantaHat', 'TopHat', 'ReinDeer', 'CandyCane']);

interface BttvEmote {
  code: string;
  id: string;
  /**
   * Modifiers (h!, w!, …) change the adjacent emote. Not supported yet.
   */
  modifier?: boolean;
}

function toEmotes(list: BttvEmote[]): Emote[] {
  return list
    .filter(e => !e.modifier)
    .map(e => ({ id: e.id, name: e.code, provider: 'bttv', zeroWidth: ZERO_WIDTH.has(e.code) }));
}

export const fetchGlobalEmotes = cachedOnce(async () => {
  return toEmotes((await fetchJson<BttvEmote[]>(`${API_URL}/emotes/global`)) ?? []);
});

/**
 * Channel emotes by the channel's room id. Empty if the channel has no BTTV account.
 */
export async function fetchChannelEmotes(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<Emote[]> {
  const user = await fetchJson<{ channelEmotes?: BttvEmote[]; sharedEmotes?: BttvEmote[] }>(
    `${API_URL}/users/twitch/${twitchUserId}`,
    signal,
  );
  return toEmotes([...(user?.channelEmotes ?? []), ...(user?.sharedEmotes ?? [])]);
}
