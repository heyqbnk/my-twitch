import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

import { toChatMessage, type ChatMessage } from '../composables/useTwitchChat';
import type { Doll, Look } from '../doll/paperDoll';
import type { ChatRole } from '../twitch/badges';

const STORAGE_KEY = 'cheliki-playground:v2';
const MAX_MESSAGES = 200;
const DAY = 86_400_000;

/** A made-up viewer: everything a real chat sends in the message tags. */
export interface Dude {
  login: string;
  name: string;
  /** The automatic look is picked by it, so a new ID gives a new look. */
  userId: string;
  /** Nick colour, null — not chosen (the doll gets a colour from the Twitch ID). */
  color: string | null;
  role?: ChatRole;
  subMonths: number;
  /** How many days ago they followed, null — not a follower. */
  followDays: number | null;
  bot: boolean;
  /** A look set by hand; null — the automatic one, as on the real scene. */
  look: Look | null;
}

export interface SendOptions {
  highlighted?: boolean;
  firstMessage?: boolean;
  /** Login of the viewer whose last message this one replies to. */
  replyTo?: string | null;
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

/** Twitch's default nick colours. */
const NICK_COLORS = ['#ff0000', '#0000ff', '#008000', '#b22222', '#ff7f50', '#9acd32', '#ff4500', '#2e8b57', '#daa520', '#d2691e', '#5f9ea0', '#1e90ff', '#ff69b4', '#8a2be2', '#00ff7f'];

export function randomDude(login = randomLogin()): Dude {
  return {
    bot: false,
    color: Math.random() < 0.8 ? pick(NICK_COLORS) : null,
    followDays: null,
    login,
    look: null,
    name: login,
    subMonths: 0,
    userId: randomUserId(),
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

/** A look set by hand still has the top in the nick colour, as on the real scene. */
export function withNickColor(look: Look, color: string): Look {
  return look.top ? { ...look, top: { ...look.top, color } } : look;
}

/** A saved look may be stale after the doll's parts change. */
function isLookValid(doll: Doll, look: Look): boolean {
  return doll.slots.every(slot => {
    const part = look[slot.key];
    return part === null || (part !== undefined && slot.names.includes(part.name));
  });
}

function loadDudes(doll: Doll): Dude[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(data)) {
      return data
        .filter((d: Dude) => typeof d?.login === 'string')
        .map((d: Dude) => ({ ...d, look: d.look && isLookValid(doll, d.look) ? d.look : null }));
    }
  } catch {
    // No storage or broken data: start over
  }
  return [
    { ...randomDude('streamer'), color: '#9146ff', role: 'broadcaster' },
    randomDude('viewer'),
    // Has noPants and noShoes in userFeatures.json
    { ...randomDude('sarorn'), subMonths: 12 },
    { ...randomDude('nightbot'), bot: true, color: '#7c7cff', role: 'moderator' },
  ];
}

/** Badges as Twitch sends them: "broadcaster/1,subscriber/12,bot-badge/1". */
function badgesOf(dude: Dude): { badges: string; badgeInfo: string } {
  const badges = [
    dude.role && `${dude.role}/1`,
    dude.subMonths > 0 && `subscriber/${dude.subMonths}`,
    dude.bot && 'bot-badge/1',
  ].filter(Boolean);
  return {
    badgeInfo: dude.subMonths > 0 ? `subscriber/${dude.subMonths}` : '',
    badges: badges.join(','),
  };
}

interface Queued {
  message: ChatMessage;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Made-up viewers and their messages. Messages are built from IRC tags by the same
 * `toChatMessage` as in the real chat, so roles, bots, replies, !vanish and bb work as on a
 * channel. `delay` (ms) holds a message back like ?msg_delay=: deleted before it's due, it never
 * shows.
 */
export function usePlayground(doll: Doll, delay: Ref<number>) {
  const dudes = ref<Dude[]>(loadDudes(doll));
  const messages = ref<ChatMessage[]>([]);
  const queued = ref<Queued[]>([]);

  watch(dudes, value => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // No storage: the viewers just won't be remembered
    }
  }, { deep: true });

  const find = (login: string) => dudes.value.find(d => d.login === login);
  const lastMessageOf = (login: string) => [...messages.value].reverse()
    .find(m => m.login === login);

  function add(message: ChatMessage) {
    messages.value.push(message);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
  }

  function send(login: string, text: string, options: SendOptions = {}) {
    const dude = find(login);
    if (!dude || !text.trim()) return;
    const { badgeInfo, badges } = badgesOf(dude);
    const tags: Record<string, string> = {
      'badge-info': badgeInfo,
      badges,
      color: dude.color ?? '',
      'display-name': dude.name,
      id: crypto.randomUUID(),
      'tmi-sent-ts': String(Date.now()),
      'user-id': dude.userId,
    };
    if (options.highlighted) tags['msg-id'] = 'highlighted-message';
    if (options.firstMessage) tags['first-msg'] = '1';
    const parent = options.replyTo ? find(options.replyTo) : null;
    if (parent) {
      tags['reply-parent-user-login'] = parent.login;
      tags['reply-parent-display-name'] = parent.name;
      tags['reply-parent-msg-id'] = lastMessageOf(parent.login)?.id ?? crypto.randomUUID();
      // Twitch puts the mention at the start of a reply itself
      if (!text.trimStart().toLowerCase()
        .startsWith(`@${parent.name.toLowerCase()}`)) {
        text = `@${parent.name} ${text}`;
      }
    }
    const message = toChatMessage({
      command: 'PRIVMSG',
      params: ['#playground', text],
      prefix: `${dude.login}!${dude.login}@${dude.login}.tmi.twitch.tv`,
      tags,
    });
    if (delay.value <= 0) return add(message);
    const timer = setTimeout(() => {
      queued.value = queued.value.filter(q => q.message.id !== message.id);
      add({ ...message, shownAt: Date.now() });
    }, delay.value);
    queued.value.push({ message, timer });
  }

  function drop(predicate: (message: ChatMessage) => boolean) {
    queued.value = queued.value.filter(({ message, timer }) => {
      if (!predicate(message)) return true;
      clearTimeout(timer);
      return false;
    });
    messages.value = messages.value.filter(m => !predicate(m));
  }

  /** Like CLEARMSG: a moderator deleted the message. */
  const deleteMessage = (id: string) => drop(m => m.id === id);
  /** Like CLEARCHAT with a login: a ban or a timeout takes all their messages, and them off the scene. */
  const timeout = (login: string) => drop(m => m.login === login);
  /** Like CLEARCHAT without a login. */
  const clearChat = () => drop(() => true);

  function addDude(dude: Dude) {
    while (find(dude.login)) dude = { ...dude, login: `${dude.login}_`, name: `${dude.name}_` };
    dudes.value.push(dude);
    return dude;
  }

  function removeDude(login: string) {
    timeout(login);
    dudes.value = dudes.value.filter(d => d.login !== login);
  }

  /** The old messages stay with the old login, so they go. */
  function renameDude(dude: Dude, login: string) {
    login = login.trim().toLowerCase();
    if (!login || login === dude.login || find(login)) return false;
    timeout(dude.login);
    dude.login = login;
    return true;
  }

  /** Follow dates for the ranking, as IVR would answer; bots aren't asked on the real scene. */
  const followDates = computed<ReadonlyMap<string, number | null>>(() => {
    const now = Date.now();
    return new Map(dudes.value.map(d => [
      d.login,
      d.bot || d.followDays === null ? null : now - (d.followDays * DAY),
    ]));
  });

  onScopeDispose(() => queued.value.forEach(q => clearTimeout(q.timer)));

  return {
    addDude,
    clearChat,
    deleteMessage,
    dudes,
    followDates,
    lastMessageOf,
    messages,
    queued: computed(() => queued.value.map(q => q.message)),
    removeDude,
    renameDude,
    send,
    timeout,
  };
}
