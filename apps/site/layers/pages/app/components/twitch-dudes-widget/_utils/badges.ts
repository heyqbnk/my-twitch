/**
 * Roles with their own badge: channel owner, moderator, VIP.
 */
export type ChatRole = 'broadcaster' | 'moderator' | 'vip';

/**
 * Role badges are global and a channel can't replace them, so their links are permanent.
 */
const ROLE_BADGES: Record<ChatRole, { id: string; title: string }> = {
  broadcaster: { id: '5527c58c-fb7d-422d-b71b-f309dcb85cc1', title: 'Broadcaster' },
  moderator: { id: '3267646d-33f0-4b17-b3df-f923a41db1d0', title: 'Moderator' },
  vip: { id: 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec', title: 'VIP' },
};

/**
 * Nick color by role, the color of its badge. Such a nick is bold.
 */
export const ROLE_COLORS: Record<ChatRole, string> = {
  broadcaster: '#e91916',
  moderator: '#00ad03',
  vip: '#e005b9',
};

/**
 * Image sources of a role badge. `large` is for big badges: 2x base and 3x for high-density
 * screens.
 */
export function roleBadge(role: ChatRole, large = false) {
  const { id, title } = ROLE_BADGES[role];
  const base = `https://static-cdn.jtvnw.net/badges/v1/${id}`;
  const [base1, base2] = large ? [2, 3] : [1, 2];
  return { src: `${base}/${base1}`, srcset: `${base}/${base2} 2x`, title };
}

/**
 * Roles by badge name from the `badges` tag. A lead moderator counts as a moderator.
 */
const ROLE_BY_BADGE: Record<string, ChatRole> = {
  broadcaster: 'broadcaster',
  lead_moderator: 'moderator',
  moderator: 'moderator',
  vip: 'vip',
};

/**
 * Seniority order: with several role badges, the senior one wins.
 */
const ROLE_ORDER: ChatRole[] = ['broadcaster', 'moderator', 'vip'];

/**
 * Badge names from the `badges` tag without versions:
 * "broadcaster/1,subscriber/12" → ["broadcaster", "subscriber"].
 */
function badgeNames(badgesTag: string | undefined): string[] {
  return badgesTag ? badgesTag.split(',').map(badge => badge.split('/')[0]!) : [];
}

export function parseRole(badgesTag: string | undefined): ChatRole | undefined {
  const roles = new Set(badgeNames(badgesTag).map(name => ROLE_BY_BADGE[name]));
  return ROLE_ORDER.find(role => roles.has(role));
}

/**
 * Total subscription length in months from the `badge-info` tag: "subscriber/16" ("founder/16"
 * for founders). Without a subscription the tag is absent, giving 0.
 */
export function parseSubMonths(badgeInfoTag: string | undefined): number {
  for (const info of badgeInfoTag?.split(',') ?? []) {
    const [name, months] = info.split('/');
    if (name === 'subscriber' || name === 'founder') {
      return Number(months) || 1;
    }
  }
  return 0;
}

/**
 * Well-known bots: they are robots on the scene.
 */
const BOT_LOGINS = new Set([
  'nightbot',
  'streamelements',
  'moobot',
  'fossabot',
  'streamlabs',
  'wizebot',
  'botrixoficial',
  'sery_bot',
  'soundalerts',
  'kofistreambot',
  'pokemoncommunitygame',
  'own3d',
  'blerp',
  'streamstickers',
  'tangiabot',
  'lumiastream',
  'frostytoolsdotcom',
  'creatisbot',
]);

/**
 * The "Chat Bot" badge Twitch puts on bot messages sent through the Chat API.
 */
const BOT_BADGE = 'bot-badge';

export function isBot(login: string, badgesTag?: string): boolean {
  return BOT_LOGINS.has(login) || badgeNames(badgesTag).includes(BOT_BADGE);
}
