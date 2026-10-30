import { computed, inject, provide, type InjectionKey, type Ref } from 'vue';

import type { ChatMessage } from './useTwitchChat';
import { actorColor } from '../scene/actorStyle';

type MentionColorResolver = (name: string) => string;

const KEY: InjectionKey<MentionColorResolver> = Symbol('mentionColor');

/**
 * Кто не писал в чат на нашей памяти — цвет, вычисленный из ника,
 * как у человечка без своего цвета
 */
const fallback: MentionColorResolver = name => (
  actorColor({ color: null, login: name.toLowerCase() })
);

/**
 * Цвет упомянутого — цвет его человечка по последнему сообщению. Упоминают и по логину,
 * и по отображаемому имени, без учёта регистра
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
