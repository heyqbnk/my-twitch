import type { Emote } from './emotes';

import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://7tv.io/v3';

interface SevenTvEmote {
  id: string;
  name: string;
}

interface SevenTvEmoteSet {
  emotes?: SevenTvEmote[] | null;
}

function toEmote(emote: SevenTvEmote): Emote {
  const base = `https://cdn.7tv.app/emote/${emote.id}`;
  return { name: emote.name, src: `${base}/1x.webp`, srcset: `${base}/2x.webp 2x` };
}

export const fetchSevenTvGlobalEmotes = cachedOnce(async () => {
  const set = await fetchJson<SevenTvEmoteSet>(`${API_URL}/emote-sets/global`);
  return (set?.emotes ?? []).map(toEmote);
});

/**
 * Channel emotes by the channel's Twitch ID. Empty if the channel has no 7TV account.
 */
export async function fetchSevenTvChannelEmotes(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<Emote[]> {
  const user = await fetchJson<{ emote_set?: SevenTvEmoteSet | null }>(
    `${API_URL}/users/twitch/${twitchUserId}`,
    signal,
  );
  return (user?.emote_set?.emotes ?? []).map(toEmote);
}
