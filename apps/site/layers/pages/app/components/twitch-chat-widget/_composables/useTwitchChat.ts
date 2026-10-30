import type { MaybeRefOrGetter } from 'vue';

import { parseBadgesTag } from '../_utils/badges';
import { type MessagePart, splitMessage } from '../_utils/emotes';
import { type IrcMessage, parseIrcLine } from '../_utils/irc';

const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const MAX_MESSAGES = 100;
const MAX_RECONNECT_DELAY = 30_000;

export interface ChatMessage {
  author: string;
  /**
   * Badge keys in display order: "subscriber/12".
   */
  badges: string[];
  /**
   * Name color chosen by the user. Absent if the user never picked one.
   */
  color: string | null;
  id: string;
  login: string;
  /**
   * Text and native Twitch emotes. Third-party emotes are resolved at render time, since they
   * load asynchronously.
   */
  parts: MessagePart[];
}

function toChatMessage(msg: IrcMessage): ChatMessage {
  const login = msg.prefix?.split('!')[0] ?? '';
  return {
    author: msg.tags['display-name'] || login,
    badges: parseBadgesTag(msg.tags['badges']),
    color: msg.tags['color'] || null,
    id: msg.tags['id'] || crypto.randomUUID(),
    login,
    parts: splitMessage(msg.params[1] ?? '', msg.tags['emotes']),
  };
}

/**
 * Anonymous read-only connection to a channel's chat over Twitch IRC (WebSocket). Connects in the
 * browser only.
 */
export function useTwitchChat(channel: MaybeRefOrGetter<string>) {
  const messages = ref<ChatMessage[]>([]);
  /**
   * The channel's Twitch ID, arrives in ROOMSTATE after JOIN.
   */
  const roomId = ref<string | null>(null);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAttempts = 0;

  function addMessage(message: ChatMessage) {
    messages.value.push(message);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES);
    }
  }

  function removeMessages(ids: ReadonlySet<string>) {
    messages.value = messages.value.filter(m => !ids.has(m.id));
  }

  function handleLine(ws: WebSocket, line: string) {
    const msg = parseIrcLine(line);
    if (!msg) {
      return;
    }

    switch (msg.command) {
      case 'CLEARCHAT': {
        // A ban or timeout of a single user, or the whole chat being cleared.
        const login = msg.params[1]?.toLowerCase();
        messages.value = login ? messages.value.filter(m => m.login !== login) : [];
        break;
      }
      case 'CLEARMSG': {
        const targetId = msg.tags['target-msg-id'];
        messages.value = messages.value.filter(m => m.id !== targetId);
        break;
      }
      case 'JOIN':
        reconnectAttempts = 0;
        break;
      case 'PING':
        ws.send(`PONG :${msg.params[0] ?? 'tmi.twitch.tv'}`);
        break;
      case 'PRIVMSG':
        addMessage(toChatMessage(msg));
        break;
      case 'RECONNECT':
        ws.close();
        break;
      case 'ROOMSTATE':
        if (msg.tags['room-id']) {
          roomId.value = msg.tags['room-id'];
        }
        break;
    }
  }

  function connect(name: string) {
    const ws = new WebSocket(TWITCH_IRC_URL);
    socket = ws;

    ws.addEventListener('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(10_000 + (Math.random() * 90_000))}`);
      ws.send(`JOIN #${name}`);
    });

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      for (const line of event.data.split('\r\n')) {
        if (line) {
          handleLine(ws, line);
        }
      }
    });

    ws.addEventListener('close', () => {
      // Closed on purpose when switching channels.
      if (socket !== ws) {
        return;
      }
      socket = null;
      const delay = Math.min(1000 * (2 ** reconnectAttempts), MAX_RECONNECT_DELAY);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => connect(name), delay);
    });
  }

  function disconnect() {
    clearTimeout(reconnectTimer);
    reconnectAttempts = 0;
    const ws = socket;
    socket = null;
    ws?.close();
  }

  onMounted(() => {
    watch(
      () => toValue(channel).toLowerCase(),
      name => {
        disconnect();
        messages.value = [];
        roomId.value = null;
        if (name) {
          connect(name);
        }
      },
      { immediate: true },
    );
  });

  onBeforeUnmount(disconnect);

  return { messages, removeMessages, roomId };
}
