import { computed, ref, watch, type Ref } from 'vue';
import { toChatMessage, type ChatMessage } from '../composables/useTwitchChat';
import { actorAccessories, actorHair, actorOutfit, type Accessory, type Outfit } from '../scene/actorStyle';
import { WALKER } from '../scene/walkerSprite';
import type { ChatRole } from '../twitch/badges';

const STORAGE_KEY = 'dudes-playground:v1';
const MAX_MESSAGES = 200;
const DAY = 86_400_000;

// Внешность человечка: те же поля, что у SceneActor
export interface Look {
  hairstyle: number;
  hairColor: string;
  outfit: Outfit;
  accessories: Accessory[];
}

// Выдуманный зритель песочницы: всё, что в настоящем чате приходит в тегах сообщения
export interface Dude {
  login: string;
  name: string;
  // Twitch ID: от него зависит автоматическая внешность, новый ID — новая внешность
  userId: string;
  // Цвет ника, null — не выбран (человечек красится в цвет из Twitch ID)
  color: string | null;
  role?: ChatRole;
  subMonths: number;
  // Сколько дней назад зафолловил, null — не фолловер
  followDays: number | null;
  bot: boolean;
  // Внешность, заданная вручную; null — автоматическая, как на настоящей сцене
  look: Look | null;
}

export interface SendOptions {
  highlighted?: boolean;
  firstMessage?: boolean;
  // Логин зрителя, на чьё последнее сообщение это ответ
  replyTo?: string | null;
}

// Автоматическая внешность — как её выберет сцена по Twitch ID
export function autoLook(dude: Pick<Dude, 'login' | 'userId'>): Look {
  return {
    ...actorHair(dude),
    outfit: actorOutfit(dude),
    accessories: actorAccessories(dude),
  };
}

export function lookOf(dude: Dude): Look {
  return dude.look ?? autoLook(dude);
}

export function randomUserId(): string {
  return String(100_000_000 + Math.floor(Math.random() * 900_000_000));
}

const SYLLABLES = ['ka', 'zu', 'mi', 'ro', 'ne', 'ta', 'shi', 'po', 'lu', 'vi', 'do', 'ge', 'xa', 'ry'];
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

export function randomLogin(): string {
  const length = 2 + Math.floor(Math.random() * 2);
  const name = Array.from({ length }, () => pick(SYLLABLES)).join('');
  return Math.random() < 0.5 ? name : `${name}_${Math.floor(Math.random() * 1000)}`;
}

// Стандартные цвета ников Twitch
const NICK_COLORS = ['#ff0000', '#0000ff', '#008000', '#b22222', '#ff7f50', '#9acd32', '#ff4500', '#2e8b57', '#daa520', '#d2691e', '#5f9ea0', '#1e90ff', '#ff69b4', '#8a2be2', '#00ff7f'];

export function randomDude(login = randomLogin()): Dude {
  return {
    login,
    name: login,
    userId: randomUserId(),
    color: Math.random() < 0.8 ? pick(NICK_COLORS) : null,
    subMonths: 0,
    followDays: null,
    bot: false,
    look: null,
  };
}

const RANDOM_MESSAGES = [
  'привет чат',
  'KEKW',
  'Pog Pog Pog',
  'а что происходит?',
  'стример, ты лучший',
  'LUL',
  'это было мощно, я аж со стула упал, никогда такого не видел за все годы просмотра стримов',
  'ого',
  'catJAM catJAM',
  'кто-нибудь знает, что за игра?',
  'https://example.com/clip смотрите',
  'gg',
  'FeelsStrongMan',
  '😂😂😂',
];

export function randomMessage(): string {
  return pick(RANDOM_MESSAGES);
}

// Сохранённая внешность могла устареть после правки спрайтов
function isLookValid(look: Look): boolean {
  const { clothes, accessories, hairstyles } = WALKER;
  return look.hairstyle < hairstyles.length
    && look.outfit.top in clothes.tops
    && look.outfit.pants in clothes.pants
    && look.outfit.shoes in clothes.shoes
    && look.accessories.every(a => a.name in accessories);
}

function loadDudes(): Dude[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(data)) {
      return data
        .filter((d: Dude) => typeof d?.login === 'string')
        .map((d: Dude) => ({ ...d, look: d.look && isLookValid(d.look) ? d.look : null }));
    }
  } catch {
    // хранилище недоступно или данные битые
  }
  return [
    { ...randomDude('streamer'), role: 'broadcaster', color: '#9146ff' },
    randomDude('viewer'),
    { ...randomDude('nightbot'), bot: true, role: 'moderator', color: '#7c7cff' },
  ];
}

// Значки так, как их шлёт Twitch: "broadcaster/1,subscriber/12,bot-badge/1"
function badgesOf(dude: Dude): { badges: string; badgeInfo: string } {
  const badges = [
    dude.role && `${dude.role}/1`,
    dude.subMonths > 0 && `subscriber/${dude.subMonths}`,
    dude.bot && 'bot-badge/1',
  ].filter(Boolean);
  return {
    badges: badges.join(','),
    badgeInfo: dude.subMonths > 0 ? `subscriber/${dude.subMonths}` : '',
  };
}

// Песочница: зрители и их сообщения. Сообщения собираются из тегов IRC тем же toChatMessage,
// что и в настоящем чате, поэтому роли, боты, ответы, !vanish и bb работают как на канале
export function usePlayground() {
  const dudes = ref<Dude[]>(loadDudes());
  const messages = ref<ChatMessage[]>([]);

  watch(dudes, value => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // хранилище недоступно — песочница просто не запомнит зрителей
    }
  }, { deep: true });

  const find = (login: string) => dudes.value.find(d => d.login === login);
  const lastMessageOf = (login: string) => [...messages.value].reverse()
    .find(m => m.login === login);

  function send(login: string, text: string, options: SendOptions = {}) {
    const dude = find(login);
    if (!dude || !text.trim()) return;
    const { badges, badgeInfo } = badgesOf(dude);
    const tags: Record<string, string> = {
      id: crypto.randomUUID(),
      'user-id': dude.userId,
      'display-name': dude.name,
      color: dude.color ?? '',
      'tmi-sent-ts': String(Date.now()),
      badges,
      'badge-info': badgeInfo,
    };
    if (options.highlighted) tags['msg-id'] = 'highlighted-message';
    if (options.firstMessage) tags['first-msg'] = '1';
    const parent = options.replyTo ? find(options.replyTo) : null;
    if (parent) {
      tags['reply-parent-user-login'] = parent.login;
      tags['reply-parent-display-name'] = parent.name;
      tags['reply-parent-msg-id'] = lastMessageOf(parent.login)?.id ?? crypto.randomUUID();
      // Twitch сам дописывает обращение в начало ответа
      const greeting = `@${parent.name.toLowerCase()}`;
      if (!text.trimStart().toLowerCase()
        .startsWith(greeting)) {
        text = `@${parent.name} ${text}`;
      }
    }
    messages.value.push(toChatMessage({
      tags,
      prefix: `${dude.login}!${dude.login}@${dude.login}.tmi.twitch.tv`,
      command: 'PRIVMSG',
      params: ['#playground', text],
    }));
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
  }

  // Как CLEARMSG: модератор удалил сообщение
  function deleteMessage(id: string) {
    messages.value = messages.value.filter(m => m.id !== id);
  }

  // Как CLEARCHAT с логином: бан или таймаут — все сообщения зрителя пропадают, и он со сцены
  function timeout(login: string) {
    messages.value = messages.value.filter(m => m.login !== login);
  }

  // Как CLEARCHAT без логина
  function clearChat() {
    messages.value = [];
  }

  function addDude(dude: Dude) {
    while (find(dude.login)) dude = { ...dude, login: `${dude.login}_`, name: `${dude.name}_` };
    dudes.value.push(dude);
    return dude;
  }

  function removeDude(login: string) {
    timeout(login);
    dudes.value = dudes.value.filter(d => d.login !== login);
  }

  // Переименование меняет логин: прежние сообщения остаются за старым логином, поэтому их убираем
  function renameDude(dude: Dude, login: string) {
    login = login.trim().toLowerCase();
    if (!login || login === dude.login || find(login)) return false;
    timeout(dude.login);
    dude.login = login;
    return true;
  }

  // Даты фоллова для старшинства — как ответил бы IVR
  const followDates = computed<ReadonlyMap<string, number | null>>(() => {
    const now = Date.now();
    return new Map(dudes.value.map(d => [
      d.login,
      d.followDays === null ? null : now - d.followDays * DAY,
    ]));
  });

  return {
    dudes,
    messages,
    followDates,
    send,
    deleteMessage,
    timeout,
    clearChat,
    addDude,
    removeDude,
    renameDude,
    lastMessageOf,
  };
}

export type Playground = ReturnType<typeof usePlayground>;

// Внешность, заданная вручную, поверх автоматической у человечков на сцене
export function withLooks<T extends { login: string; bot?: boolean }>(
  actors: Ref<T[]>,
  dudes: Ref<Dude[]>,
) {
  return computed(() => actors.value.map(actor => {
    const look = actor.bot ? null : dudes.value.find(d => d.login === actor.login)?.look;
    return look ? { ...actor, ...look } : actor;
  }));
}
