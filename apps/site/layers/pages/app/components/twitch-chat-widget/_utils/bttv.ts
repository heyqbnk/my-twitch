import type { Emote } from './emotes';

import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://api.betterttv.net/3/cached';

interface BttvEmote {
  code: string;
  id: string;
}

function toEmote(emote: BttvEmote): Emote {
  const base = `https://cdn.betterttv.net/emote/${emote.id}`;
  return { name: emote.code, src: `${base}/1x.webp`, srcset: `${base}/2x.webp 2x` };
}

export const fetchBttvGlobalEmotes = cachedOnce(async () => {
  return ((await fetchJson<BttvEmote[]>(`${API_URL}/emotes/global`)) ?? []).map(toEmote);
});

/**
 * Channel emotes by the channel's Twitch ID. Empty if the channel has no BTTV account.
 */
export async function fetchBttvChannelEmotes(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<Emote[]> {
  const user = await fetchJson<{ channelEmotes?: BttvEmote[]; sharedEmotes?: BttvEmote[] }>(
    `${API_URL}/users/twitch/${twitchUserId}`,
    signal,
  );
  return [...(user?.channelEmotes ?? []), ...(user?.sharedEmotes ?? [])].map(toEmote);
}
