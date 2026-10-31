import { fetchJson } from './http';

/**
 * Public ivr.fi API: Twitch tells the follow date only with a moderator token.
 */
const API_URL = 'https://api.ivr.fi/v2/twitch';

interface IvrSubage {
  followedAt: string | null;
}

/**
 * When `login` followed `channel`, in ms. Null if it doesn't follow.
 */
export async function fetchFollowedAt(
  login: string,
  channel: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const subage = await fetchJson<IvrSubage>(`${API_URL}/subage/${login}/${channel}`, signal);
  return subage?.followedAt ? Date.parse(subage.followedAt) : null;
}
