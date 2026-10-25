// Роли со своим значком: владелец канала, модератор, VIP
export type ChatRole = 'broadcaster' | 'moderator' | 'vip';

// Значки ролей глобальные, канал не может их заменить, поэтому ссылки постоянные
const ROLE_BADGES: Record<ChatRole, { id: string; title: string }> = {
  broadcaster: { id: '5527c58c-fb7d-422d-b71b-f309dcb85cc1', title: 'Владелец канала' },
  moderator: { id: '3267646d-33f0-4b17-b3df-f923a41db1d0', title: 'Модератор' },
  vip: { id: 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec', title: 'VIP' },
};

// Цвет ника по роли — в цвет значка; ник при этом жирный
export const ROLE_COLORS: Record<ChatRole, string> = {
  broadcaster: '#e91916',
  moderator: '#00ad03',
  vip: '#e005b9',
};

// Тег badges: "broadcaster/1,subscriber/12". Старший модератор показывается как модератор
const ROLE_BY_BADGE: Record<string, ChatRole> = {
  broadcaster: 'broadcaster',
  lead_moderator: 'moderator',
  moderator: 'moderator',
  vip: 'vip',
};

// Порядок старшинства: если значков несколько, показываем старший
const ROLE_ORDER: ChatRole[] = ['broadcaster', 'moderator', 'vip'];

// Названия значков из тега badges без версий: "broadcaster/1,subscriber/12" → ["broadcaster", "subscriber"]
function badgeNames(badgesTag: string | undefined): string[] {
  return badgesTag ? badgesTag.split(',').map(badge => badge.split('/')[0]) : [];
}

export function parseRole(badgesTag: string | undefined): ChatRole | undefined {
  const roles = new Set(badgeNames(badgesTag).map(name => ROLE_BY_BADGE[name]));
  return ROLE_ORDER.find(role => roles.has(role));
}

// Общий стаж подписки в месяцах из тега badge-info: "subscriber/16" (у основателей — "founder/16").
// Без подписки тега нет — 0
export function parseSubMonths(badgeInfoTag: string | undefined): number {
  for (const info of badgeInfoTag?.split(',') ?? []) {
    const [name, months] = info.split('/');
    if (name === 'subscriber' || name === 'founder') return Number(months) || 1;
  }
  return 0;
}

// Известные боты: на сцене они роботы
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
// Значок «Чат-бот» Twitch вешает на сообщения ботов, отправленные через Chat API
const BOT_BADGE = 'bot-badge';

export function isBot(login: string, badgesTag?: string): boolean {
  return BOT_LOGINS.has(login) || badgeNames(badgesTag).includes(BOT_BADGE);
}

// large — для крупного показа: база 2x и 3x для экранов с высокой плотностью
export function roleBadge(role: ChatRole, large = false) {
  const { id, title } = ROLE_BADGES[role];
  const base = `https://static-cdn.jtvnw.net/badges/v1/${id}`;
  const [base1, base2] = large ? [2, 3] : [1, 2];
  return { src: `${base}/${base1}`, srcset: `${base}/${base2} 2x`, title };
}
