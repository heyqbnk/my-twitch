/**
 * Роли со своим значком: владелец канала, модератор, VIP
 */
export type ChatRole = 'broadcaster' | 'moderator' | 'vip';

/**
 * Тег badges: "broadcaster/1,subscriber/12". Старший модератор показывается как модератор
 */
const ROLE_BY_BADGE: Record<string, ChatRole> = {
  broadcaster: 'broadcaster',
  lead_moderator: 'moderator',
  moderator: 'moderator',
  vip: 'vip',
};

/**
 * Порядок старшинства: если значков несколько, показываем старший
 */
const ROLE_ORDER: ChatRole[] = ['broadcaster', 'moderator', 'vip'];

/**
 * Названия значков из тега badges без версий: "broadcaster/1,subscriber/12" → ["broadcaster", "subscriber"]
 */
function badgeNames(badgesTag: string | undefined): string[] {
  return badgesTag ? badgesTag.split(',').map(badge => badge.split('/')[0]) : [];
}

export function parseRole(badgesTag: string | undefined): ChatRole | undefined {
  const roles = new Set(badgeNames(badgesTag).map(name => ROLE_BY_BADGE[name]));
  return ROLE_ORDER.find(role => roles.has(role));
}

/**
 * Общий стаж подписки в месяцах из тега badge-info: "subscriber/16" (у основателей — "founder/16").
 * Без подписки тега нет — 0
 */
export function parseSubMonths(badgeInfoTag: string | undefined): number {
  for (const info of badgeInfoTag?.split(',') ?? []) {
    const [name, months] = info.split('/');
    if (name === 'subscriber' || name === 'founder') return Number(months) || 1;
  }
  return 0;
}

/**
 * Известные боты: их не ранжируют по дате фоллова
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
 * Значок «Чат-бот» Twitch вешает на сообщения ботов, отправленные через Chat API
 */
const BOT_BADGE = 'bot-badge';

export function isBot(login: string, badgesTag?: string): boolean {
  return BOT_LOGINS.has(login) || badgeNames(badgesTag).includes(BOT_BADGE);
}
