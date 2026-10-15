import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { isBot, parseRole, parseSubMonths, type ChatRole } from '../twitch/badges';
import { splitMessage, type MessagePart } from '../twitch/emotes';
import { loadChatHistory, saveChatHistory } from '../storage/chatHistory';
import { parseIrcLine, type IrcMessage } from '../twitch/irc';
import { MENTION } from '../twitch/links';

const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const MAX_MESSAGES = 200;
const MAX_RECONNECT_DELAY = 30_000;
const SAVE_DELAY = 500;
// Команда зрителя «уйти со сцены»: вместо неё человечек прощается и уходит
const VANISH_COMMAND = '!vanish';
// Прощание тоже уводит со сцены, но только адресованное всем: не ответ и без упоминаний
const FAREWELLS = ['bb', 'бб'];

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface ChatMessage {
  id: string;
  login: string;
  // Twitch ID автора: не меняется при смене логина. В истории до его появления отсутствует
  userId?: string;
  author: string;
  color: string | null;
  // Владелец канала, модератор или VIP — по значкам из тега badges
  role?: ChatRole;
  // Общий стаж подписки в месяцах, 0 — не подписан. В истории до его появления отсутствует
  subMonths?: number;
  parts: MessagePart[];
  timestamp: number;
  // Когда сообщение показано: при ?msg_delay= позже timestamp. Нет — показано сразу
  shownAt?: number;
  // Сообщение отправлено через награду «Выделить моё сообщение»
  highlighted?: boolean;
  // Первое сообщение пользователя на этом канале
  firstMessage?: boolean;
  // Команда VANISH_COMMAND или прощание: уводит автора со сцены
  vanish?: boolean;
  // Прощание из FAREWELLS: вместо текста показывается эмодзи «bb»
  farewell?: boolean;
  // Сообщение чат-бота: на сцене бот — робот, а его сообщения — в облачке-терминале
  bot?: boolean;
  // Кому адресовано: автор сообщения, на которое это ответ, и упомянутые через @, кроме самого автора.
  // Ник в нижнем регистре — логин или отображаемое имя. Нет — сообщение для всех
  addressees?: string[];
}

// С этого момента отсчитываются показ облачка и время на сцене
export function shownAt(message: ChatMessage): number {
  return message.shownAt ?? message.timestamp;
}

// Ответ на сообщение — прощание с конкретным человеком, а не уход со сцены.
// Упоминаний в прощании быть не может: текст должен совпасть целиком
function isFarewell(msg: IrcMessage, text: string): boolean {
  return FAREWELLS.includes(text.trim().toLowerCase()) && !msg.tags['reply-parent-msg-id'];
}

function addresseesOf(msg: IrcMessage, login: string, text: string): string[] | undefined {
  const names = new Set<string>();
  const parent = msg.tags['reply-parent-user-login'];
  if (parent) names.add(parent.toLowerCase());
  for (const [, name] of text.matchAll(MENTION)) names.add(name!.toLowerCase());
  names.delete(login);
  names.delete((msg.tags['display-name'] ?? '').toLowerCase());
  return names.size ? [...names] : undefined;
}

// Сообщение PRIVMSG в виде для чата и сцены. Песочница собирает им сообщения от имени выдуманных зрителей
export function toChatMessage(msg: IrcMessage): ChatMessage {
  const login = msg.prefix?.split('!')[0] ?? 'unknown';
  const text = msg.params[1] ?? '';
  const farewell = isFarewell(msg, text);
  return {
    id: msg.tags['id'] || crypto.randomUUID(),
    login,
    userId: msg.tags['user-id'] || undefined,
    author: msg.tags['display-name'] || login,
    color: msg.tags['color'] || null,
    role: parseRole(msg.tags['badges']),
    subMonths: parseSubMonths(msg.tags['badge-info']),
    parts: splitMessage(text, msg.tags['emotes']),
    timestamp: Number(msg.tags['tmi-sent-ts']) || Date.now(),
    highlighted: msg.tags['msg-id'] === 'highlighted-message',
    firstMessage: msg.tags['first-msg'] === '1',
    vanish: farewell || text.trim().toLowerCase() === VANISH_COMMAND,
    farewell,
    bot: isBot(login, msg.tags['badges']),
    addressees: addresseesOf(msg, login, text),
  };
}

// Анонимное read-only подключение к чату канала через Twitch IRC (WebSocket).
// delay — задержка показа сообщения в мс: удалённое модератором за это время так и не появится.
export function useTwitchChat(channel: Ref<string | null>, delay: Ref<number>) {
  const messages = ref<ChatMessage[]>([]);
  const status = ref<ChatStatus>('idle');
  const error = ref<string | null>(null);
  // Twitch ID канала, приходит в ROOMSTATE после JOIN
  const roomId = ref<string | null>(null);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  // Сообщения, ждущие показа, по id
  const pending = new Map<string, { message: ChatMessage; timer: ReturnType<typeof setTimeout> }>();

  function addMessage(message: ChatMessage) {
    messages.value.push(message);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
  }

  function enqueueMessage(message: ChatMessage) {
    if (delay.value <= 0) return addMessage(message);
    const timer = setTimeout(() => {
      pending.delete(message.id);
      addMessage({ ...message, shownAt: Date.now() });
    }, delay.value);
    pending.set(message.id, { message, timer });
  }

  function dropPending(predicate: (message: ChatMessage) => boolean) {
    for (const [id, { message, timer }] of pending) {
      if (!predicate(message)) continue;
      clearTimeout(timer);
      pending.delete(id);
    }
  }

  // История сохраняется в localStorage, чтобы пережить перезагрузку страницы
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function flushHistory() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    if (channel.value) saveChatHistory(channel.value, messages.value);
  }

  function scheduleSave() {
    saveTimer ??= setTimeout(flushHistory, SAVE_DELAY);
  }

  function handleLine(ws: WebSocket, line: string) {
    const msg = parseIrcLine(line);
    if (!msg) return;

    switch (msg.command) {
      case 'PING':
        ws.send(`PONG :${msg.params[0] ?? 'tmi.twitch.tv'}`);
        break;
      case 'JOIN':
        status.value = 'connected';
        reconnectAttempts = 0;
        break;
      case 'ROOMSTATE':
        if (msg.tags['room-id']) roomId.value = msg.tags['room-id'];
        break;
      case 'PRIVMSG':
        enqueueMessage(toChatMessage(msg));
        break;
      case 'CLEARCHAT':
        // Бан/таймаут конкретного пользователя или полная очистка чата
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
        if (msg.params[1]) error.value = msg.params[1];
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
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 90000)}`);
      ws.send(`JOIN #${name}`);
    });

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      for (const line of event.data.split('\r\n')) {
        if (line) handleLine(ws, line);
      }
    });

    ws.addEventListener('error', () => {
      error.value = 'Ошибка соединения с Twitch';
    });

    ws.addEventListener('close', () => {
      // закрыт намеренно при смене канала
      if (socket !== ws) return;
      socket = null;
      status.value = 'disconnected';
      scheduleReconnect(name);
    });
  }

  function scheduleReconnect(name: string) {
    const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => connect(name), delay);
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    reconnectAttempts = 0;
    // Отложенные сообщения прежнего канала не должны попасть в новый
    dropPending(() => true);
    const ws = socket;
    socket = null;
    ws?.close();
  }

  watch(
    channel,
    (name, prevName) => {
      // Дописываем историю прежнего канала, пока channel.value не указывает на новый
      if (saveTimer && prevName) saveChatHistory(prevName, messages.value);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;

      disconnect();
      // Записи истории до появления флага bot — без него, а значков в истории нет: узнаём бота по логину
      messages.value = name
        ? loadChatHistory(name).map(m => (m.bot || !isBot(m.login) ? m : { ...m, bot: true }))
        : [];
      roomId.value = null;
      if (name) connect(name);
      else status.value = 'idle';
    },
    { immediate: true },
  );

  // deep: 1 — реагируем на push/splice/замену массива, не обходя сами сообщения
  watch(messages, scheduleSave, { deep: 1 });

  window.addEventListener('pagehide', flushHistory);
  onScopeDispose(() => {
    flushHistory();
    window.removeEventListener('pagehide', flushHistory);
    disconnect();
  });

  return { messages, status, error, roomId };
}
