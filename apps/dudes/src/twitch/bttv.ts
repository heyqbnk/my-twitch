import type { Emote } from './emotes';
import { cachedOnce, fetchJson } from './http';

const API_URL = 'https://api.betterttv.net/3/cached';
// У BTTV нет флага zero-width в API: такие эмодзи — фиксированный список глобальных
const ZERO_WIDTH = new Set(['cvHazmat', 'cvMask', 'IceCold', 'SoSnowy', 'SantaHat', 'TopHat', 'ReinDeer', 'CandyCane']);

interface BttvEmote {
  id: string;
  code: string;
  // Модификаторы (h!, w!, …) меняют соседний эмодзи; пока не поддерживаем
  modifier?: boolean;
}

function toEmotes(list: BttvEmote[]): Emote[] {
  return list
    .filter(e => !e.modifier)
    .map(e => ({ provider: 'bttv', id: e.id, name: e.code, zeroWidth: ZERO_WIDTH.has(e.code) }));
}

export const fetchGlobalEmotes = cachedOnce(async () => {
  return toEmotes((await fetchJson<BttvEmote[]>(`${API_URL}/emotes/global`)) ?? []);
});

// twitchUserId — room-id канала. Если у канала нет аккаунта BTTV, возвращает [].
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
