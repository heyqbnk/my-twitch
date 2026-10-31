import type { MaybeRefOrGetter } from 'vue';

import { type ChatRole, isBot, parseRole, parseSubMonths } from '../_utils/badges';
import { loadChatHistory, saveChatHistory } from '../_utils/chatHistory';
import { type MessagePart, splitMessage } from '../_utils/emotes';
import { type IrcMessage, parseIrcLine } from '../_utils/irc';
import { MENTION } from '../_utils/links';

const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const MAX_MESSAGES = 200;
const MAX_RECONNECT_DELAY = 30_000;
const SAVE_DELAY = 500;
/**
 * The viewer's command to leave the scene: the dude says goodbye and leaves instead of showing it.
 */
const VANISH_COMMAND = '!vanish';
/**
 * A farewell leaves the scene too, but only one addressed to everyone: not a reply.
 */
const FAREWELLS = ['bb', 'бб'];

export interface ChatMessage {
  /**
   * Whom the message is addressed to: the author of the replied message and those mentioned with
   * @, except the author. Lowercase nicks: logins or display names. Absent — to everyone.
   */
  addressees?: string[];
  author: string;
  /**
   * A chat bot's message.
   */
  bot?: boolean;
  color: string | null;
  /**
   * A farewell from FAREWELLS: the "bb" emote is shown instead of the text.
   */
  farewell?: boolean;
  /**
   * The user's first message on this channel.
   */
  firstMessage?: boolean;
  /**
   * Sent with the "Highlight My Message" reward.
   */
  highlighted?: boolean;
  id: string;
  login: string;
  parts: MessagePart[];
  /**
   * Channel owner, moderator or VIP, by the badges from the `badges` tag.
   */
  role?: ChatRole;
  /**
   * When the message was shown: later than `timestamp` with a display delay. Absent — shown
   * right away.
   */
  shownAt?: number;
  /**
   * Total subscription length in months, 0 — not subscribed. Absent in history saved before it
   * appeared.
   */
  subMonths?: number;
  timestamp: number;
  /**
   * The author's Twitch ID: it doesn't change with the login. Absent in history saved before it
   * appeared.
   */
  userId?: string;
  /**
   * VANISH_COMMAND or a farewell: takes the author off the scene.
   */
  vanish?: boolean;
}

export type ChatStatus = 'connected' | 'connecting' | 'disconnected' | 'idle';

/**
 * The moment the bubble and the time on the scene are counted from.
 */
export function shownAt(message: ChatMessage): number {
  return message.shownAt ?? message.timestamp;
}

/**
 * A reply is a goodbye to a particular person rather than leaving the scene. A farewell can't
 * have mentions: the text must match as a whole.
 */
function isFarewell(msg: IrcMessage, text: string): boolean {
  return FAREWELLS.includes(text.trim().toLowerCase()) && !msg.tags['reply-parent-msg-id'];
}

function addresseesOf(msg: IrcMessage, login: string, text: string): string[] | undefined {
  const names = new Set<string>();
  const parent = msg.tags['reply-parent-user-login'];
  if (parent) {
    names.add(parent.toLowerCase());
  }
  for (const [, name] of text.matchAll(MENTION)) {
    names.add(name!.toLowerCase());
  }
  names.delete(login);
  names.delete((msg.tags['display-name'] ?? '').toLowerCase());
  return names.size ? [...names] : undefined;
}

function toChatMessage(msg: IrcMessage): ChatMessage {
  const login = msg.prefix?.split('!')[0] ?? 'unknown';
  const text = msg.params[1] ?? '';
  const farewell = isFarewell(msg, text);
  return {
    addressees: addresseesOf(msg, login, text),
    author: msg.tags['display-name'] || login,
    bot: isBot(login, msg.tags['badges']),
    color: msg.tags['color'] || null,
    farewell,
    firstMessage: msg.tags['first-msg'] === '1',
    highlighted: msg.tags['msg-id'] === 'highlighted-message',
    id: msg.tags['id'] || crypto.randomUUID(),
    login,
    parts: splitMessage(text, msg.tags['emotes']),
    role: parseRole(msg.tags['badges']),
    subMonths: parseSubMonths(msg.tags['badge-info']),
    timestamp: Number(msg.tags['tmi-sent-ts']) || Date.now(),
    userId: msg.tags['user-id'] || undefined,
    vanish: farewell || text.trim().toLowerCase() === VANISH_COMMAND,
  };
}

/**
 * Anonymous read-only connection to the channel's chat through Twitch IRC (WebSocket). The history
 * is kept in localStorage to survive a page reload. `delay` is the message display delay in ms:
 * a message deleted by a moderator meanwhile never shows up. Client-only.
 */
export function useTwitchChat(
  channelSource: MaybeRefOrGetter<string | null>,
  delaySource: MaybeRefOrGetter<number>,
) {
  const channel = toRef(channelSource);
  const delay = toRef(delaySource);
  const messages = ref<ChatMessage[]>([]);
  const status = ref<ChatStatus>('idle');
  const error = ref<string | null>(null);
  // The channel's Twitch ID, comes in ROOMSTATE after JOIN
  const roomId = ref<string | null>(null);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  // Messages waiting to be shown, by id
  const pending = new Map<string, { message: ChatMessage; timer: ReturnType<typeof setTimeout> }>();

  function addMessage(message: ChatMessage) {
    messages.value.push(message);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
  }

  function enqueueMessage(message: ChatMessage) {
    if (delay.value <= 0) {
      addMessage(message);
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(message.id);
      addMessage({ ...message, shownAt: Date.now() });
    }, delay.value);
    pending.set(message.id, { message, timer });
  }

  function dropPending(predicate: (message: ChatMessage) => boolean) {
    for (const [id, { message, timer }] of pending) {
      if (!predicate(message)) {
        continue;
      }
      clearTimeout(timer);
      pending.delete(id);
    }
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function flushHistory() {
    if (!saveTimer) {
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    if (channel.value) {
      saveChatHistory(channel.value, messages.value);
    }
  }

  function scheduleSave() {
    saveTimer ??= setTimeout(flushHistory, SAVE_DELAY);
  }

  function handleLine(ws: WebSocket, line: string) {
    const msg = parseIrcLine(line);
    if (!msg) {
      return;
    }

    switch (msg.command) {
      case 'PING':
        ws.send(`PONG :${msg.params[0] ?? 'tmi.twitch.tv'}`);
        break;
      case 'JOIN':
        status.value = 'connected';
        reconnectAttempts = 0;
        break;
      case 'ROOMSTATE':
        if (msg.tags['room-id']) {
          roomId.value = msg.tags['room-id'];
        }
        break;
      case 'PRIVMSG':
        enqueueMessage(toChatMessage(msg));
        break;
      case 'CLEARCHAT':
        // A ban or timeout of a particular user, or the whole chat cleared
        if (msg.params[1]) {
          const login = msg.params[1].toLowerCase();
          dropPending(m => m.login === login);
          messages.value = messages.value.filter(m => m.login !== login);
        } else {
          dropPending(() => true);
          messages.value = [];
        }
        break;
      case 'CLEARMSG': {
        const targetId = msg.tags['target-msg-id'];
        dropPending(m => m.id === targetId);
        messages.value = messages.value.filter(m => m.id !== targetId);
        break;
      }
      case 'RECONNECT':
        ws.close();
        break;
      case 'NOTICE':
        if (msg.params[1]) {
          error.value = msg.params[1];
        }
        break;
    }
  }

  function connect(name: string) {
    status.value = 'connecting';
    error.value = null;

    const ws = new WebSocket(TWITCH_IRC_URL);
    socket = ws;

    ws.addEventListener('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(10000 + (Math.random() * 90000))}`);
      ws.send(`JOIN #${name}`);
    });

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      for (const line of event.data.split('\r\n')) {
        if (line) {
          handleLine(ws, line);
        }
      }
    });

    ws.addEventListener('error', () => {
      error.value = 'Connection to Twitch failed';
    });

    ws.addEventListener('close', () => {
      // Closed on purpose on a channel change
      if (socket !== ws) {
        return;
      }
      socket = null;
      status.value = 'disconnected';
      scheduleReconnect(name);
    });
  }

  function scheduleReconnect(name: string) {
    const reconnectDelay = Math.min(1000 * (2 ** reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => connect(name), reconnectDelay);
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = null;
    reconnectAttempts = 0;
    // Delayed messages of the previous channel must not get into the new one
    dropPending(() => true);
    const ws = socket;
    socket = null;
    ws?.close();
  }

  watch(
    channel,
    (name, prevName) => {
      // Saves the previous channel's history while channel.value doesn't point to the new one
      if (saveTimer && prevName) {
        saveChatHistory(prevName, messages.value);
      }
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = null;

      disconnect();
      // History records from before the `bot` flag lack it, and history has no badges: a bot is
      // recognized by its login
      messages.value = name
        ? loadChatHistory(name).map(m => (m.bot || !isBot(m.login) ? m : { ...m, bot: true }))
        : [];
      roomId.value = null;
      if (name) {
        connect(name);
      } else {
        status.value = 'idle';
      }
    },
    { immediate: true },
  );

  // deep: 1 reacts to push/splice/replacing the array without walking the messages
  watch(messages, scheduleSave, { deep: 1 });

  window.addEventListener('pagehide', flushHistory);
  onScopeDispose(() => {
    flushHistory();
    window.removeEventListener('pagehide', flushHistory);
    disconnect();
  });

  return { error, messages, roomId, status };
}
