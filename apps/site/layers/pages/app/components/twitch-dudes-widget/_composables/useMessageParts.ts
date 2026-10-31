import type { InjectionKey, Ref } from 'vue';

import type { ChatMessage } from './useTwitchChat';

import {
  type Emote,
  type EmoteMap,
  expandEmotes,
  mergeRepeatedEmotes,
  type MessagePart,
} from '../_utils/emotes';

type MessagePartsResolver = (msg: ChatMessage) => MessagePart[];

const KEY: InjectionKey<MessagePartsResolver> = Symbol('messageParts');

/**
 * A farewell is shown as the "bb" emote: the channel's one if the set has it, else this 7TV one.
 */
const FAREWELL_EMOTE_NAME = 'bb';
const FAREWELL_EMOTE: Emote = { id: '01FN1M3GQR00071FCSB63SB1P4', name: FAREWELL_EMOTE_NAME, provider: '7tv' };

/**
 * 7TV and BTTV emotes load asynchronously, so they are resolved at render time, caching the
 * result per message until the emote set changes.
 */
export function provideMessageParts(emotes: Ref<EmoteMap>) {
  let cache = new WeakMap<ChatMessage, MessagePart[]>();
  watch(emotes, () => (cache = new WeakMap()));

  const resolve: MessagePartsResolver = msg => {
    // Always read, so the render depends on the emote set
    const map = emotes.value;
    let parts = cache.get(msg);
    if (!parts) {
      parts = msg.farewell
        ? [{ emote: map.get(FAREWELL_EMOTE_NAME) ?? FAREWELL_EMOTE, overlays: [], type: 'emote' }]
        : mergeRepeatedEmotes(expandEmotes(msg.parts, map));
      cache.set(msg, parts);
    }
    return parts;
  };

  provide(KEY, resolve);
}

export function useMessageParts(): MessagePartsResolver {
  return inject(KEY, msg => msg.parts);
}
