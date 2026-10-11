import { inject, provide, watch, type InjectionKey, type Ref } from 'vue';
import { expandEmotes, type Emote, type EmoteMap, type MessagePart } from '../twitch/emotes';
import type { ChatMessage } from './useTwitchChat';

type MessagePartsResolver = (msg: ChatMessage) => MessagePart[];

const KEY: InjectionKey<MessagePartsResolver> = Symbol('messageParts');

// Прощание показываем эмодзи «bb»: канальным, если он есть в наборе, иначе этим из 7TV
const FAREWELL_EMOTE_NAME = 'bb';
const FAREWELL_EMOTE: Emote = { provider: '7tv', id: '01FN1M3GQR00071FCSB63SB1P4', name: FAREWELL_EMOTE_NAME };

// Эмодзи 7TV и BTTV подгружаются асинхронно, поэтому подставляем их при отрисовке,
// кэшируя результат на сообщение до смены набора эмодзи.
export function provideMessageParts(emotes: Ref<EmoteMap>) {
  let cache = new WeakMap<ChatMessage, MessagePart[]>();
  watch(emotes, () => (cache = new WeakMap()));

  const resolve: MessagePartsResolver = msg => {
    // читаем всегда, чтобы рендер зависел от набора эмодзи
    const map = emotes.value;
    let parts = cache.get(msg);
    if (!parts) {
      parts = msg.farewell
        ? [{ type: 'emote', emote: map.get(FAREWELL_EMOTE_NAME) ?? FAREWELL_EMOTE, overlays: [] }]
        : expandEmotes(msg.parts, map);
      cache.set(msg, parts);
    }
    return parts;
  };

  provide(KEY, resolve);
}

export function useMessageParts(): MessagePartsResolver {
  return inject(KEY, msg => msg.parts);
}
