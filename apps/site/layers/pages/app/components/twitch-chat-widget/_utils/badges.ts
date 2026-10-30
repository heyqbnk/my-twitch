import { cachedOnce, fetchJson } from './http';

/**
 * Public ivr.fi API: Twitch's own badge API requires an app token.
 */
const API_URL = 'https://api.ivr.fi/v2/twitch/badges';

export interface Badge {
  src: string;
  srcset: string;
  title: string;
}

/**
 * Badges by "set/version" key, as in the `badges` tag: "subscriber/12".
 */
export type BadgeMap = ReadonlyMap<string, Badge>;

interface IvrBadgeSet {
  set_id: string;
  versions: {
    id: string;
    image_url_1x: string;
    image_url_2x: string;
    title: string;
  }[];
}

function toBadgeEntries(sets: IvrBadgeSet[] | null): [string, Badge][] {
  return (sets ?? []).flatMap(set => set.versions.map((version): [string, Badge] => [
    `${set.set_id}/${version.id}`,
    {
      src: version.image_url_1x,
      srcset: `${version.image_url_2x} 2x`,
      title: version.title,
    },
  ]));
}

export const fetchGlobalBadges = cachedOnce(async () => {
  return toBadgeEntries(await fetchJson<IvrBadgeSet[]>(`${API_URL}/global`));
});

/**
 * Channel badges (subscriber, bits) by the channel's Twitch ID.
 */
export async function fetchChannelBadges(
  twitchUserId: string,
  signal?: AbortSignal,
): Promise<[string, Badge][]> {
  const sets = await fetchJson<IvrBadgeSet[]>(`${API_URL}/channel?id=${twitchUserId}`, signal);
  return toBadgeEntries(sets);
}

/**
 * Badge keys from the `badges` tag: "broadcaster/1,subscriber/12" → ["broadcaster/1", "subscriber/12"].
 */
export function parseBadgesTag(tag: string | undefined): string[] {
  return tag ? tag.split(',').filter(Boolean) : [];
}
