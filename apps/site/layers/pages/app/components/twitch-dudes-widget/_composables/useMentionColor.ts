import type { InjectionKey, Ref } from 'vue';

import type { ChatMessage } from './useTwitchChat';

import { actorColor } from '../_utils/actorStyle';

type MentionColorResolver = (name: string) => string;

const KEY: InjectionKey<MentionColorResolver> = Symbol('mentionColor');

/**
 * Someone who hasn't written to the chat as far as we know gets the color derived from the nick,
 * as a dude without its own color.
 */
const fallback: MentionColorResolver = name => (
  actorColor({ color: null, login: name.toLowerCase() })
);

/**
 * The color of a mentioned chatter is the color of their dude by the last message. Mentions use
 * both the login and the display name, case-insensitively.
 */
export function provideMentionColor(messages: Ref<ChatMessage[]>) {
  const colors = computed(() => {
    const map = new Map<string, string>();
    for (const msg of messages.value) {
      const color = actorColor(msg);
      map.set(msg.login, color);
      map.set(msg.author.toLowerCase(), color);
    }
    return map;
  });

  provide(KEY, name => colors.value.get(name.toLowerCase()) ?? fallback(name));
}

export function useMentionColor(): MentionColorResolver {
  return inject(KEY, fallback);
}
