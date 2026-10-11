import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { parseRole, type ChatRole } from '../twitch/badges';
import { splitMessage, type MessagePart } from '../twitch/emotes';
import { loadChatHistory, saveChatHistory } from '../storage/chatHistory';
import { parseIrcLine, type IrcMessage } from '../twitch/irc';

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
  parts: MessagePart[];
  timestamp: number;
  // Сообщение отправлено через награду «Выделить моё сообщение»
  highlighted?: boolean;
  // Первое сообщение пользователя на этом канале
  firstMessage?: boolean;
  // Команда VANISH_COMMAND или прощание: уводит автора со сцены
  vanish?: boolean;
  // Прощание из FAREWELLS: вместо текста показывается эмодзи «bb»
  farewell?: boolean;
}

// Ответ на сообщение — прощание с конкретным человеком, а не уход со сцены.
// Упоминаний в прощании быть не может: текст должен совпасть целиком
function isFarewell(msg: IrcMessage, text: string): boolean {
  return FAREWELLS.includes(text.trim().toLowerCase()) && !msg.tags['reply-parent-msg-id'];
}

function toChatMessage(msg: IrcMessage): ChatMessage {
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
    parts: splitMessage(text, msg.tags['emotes']),
    timestamp: Number(msg.tags['tmi-sent-ts']) || Date.now(),
    highlighted: msg.tags['msg-id'] === 'highlighted-message',
    firstMessage: msg.tags['first-msg'] === '1',
    vanish: farewell || text.trim().toLowerCase() === VANISH_COMMAND,
    farewell,
  };
}

// Анонимное read-only подключение к чату канала через Twitch IRC (WebSocket).
export function useTwitchChat(channel: Ref<string | null>) {
  const messages = ref<ChatMessage[]>([]);
  const status = ref<ChatStatus>('idle');
  const error = ref<string | null>(null);
  // Twitch ID канала, приходит в ROOMSTATE после JOIN
  const roomId = ref<string | null>(null);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

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
        messages.value.push(toChatMessage(msg));
        if (messages.value.length > MAX_MESSAGES) {
          messages.value.splice(0, messages.value.length - MAX_MESSAGES);
        }
        break;
      case 'CLEARCHAT':
        // Бан/таймаут конкретного пользователя или полная очистка чата
        if (msg.params[1]) {
          const login = msg.params[1].toLowerCase();
          messages.value = messages.value.filter(m => m.login !== login);
        } else {
          messages.value = [];
        }
        break;
      case 'CLEARMSG': {
        const targetId = msg.tags['target-msg-id'];
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
      messages.value = name ? loadChatHistory(name) : [];
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
