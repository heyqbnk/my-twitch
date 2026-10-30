import { fetchJson } from './http';

/**
 * Публичный API ivr.fi: у Twitch дату фоллова без токена модератора не узнать
 */
const API_URL = 'https://api.ivr.fi/v2/twitch';

interface IvrSubage {
  followedAt: string | null;
}

/**
 * Когда login зафолловил channel (мс), null — не зафолловлен
 */
export async function fetchFollowedAt(
  login: string,
  channel: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const subage = await fetchJson<IvrSubage>(`${API_URL}/subage/${login}/${channel}`, signal);
  return subage?.followedAt ? Date.parse(subage.followedAt) : null;
}

interface IvrUser {
  id: string;
}

/**
 * Twitch ID by login, null — no such user
 */
export async function fetchUserId(login: string, signal?: AbortSignal): Promise<string | null> {
  const users = await fetchJson<IvrUser[]>(`${API_URL}/user?login=${encodeURIComponent(login)}`, signal);
  return users?.[0]?.id ?? null;
}
