import type { Ref } from 'vue';

import { type ChatMessage, shownAt } from './useTwitchChat';

import { actorPriority } from '../_utils/actorPriority';
import {
  type Accessory,
  actorAccessories,
  actorColor,
  actorHair,
  actorOutfit,
  actorPosition,
  type Outfit,
} from '../_utils/actorStyle';
import type { ChatRole } from '../_utils/badges';

const MAX_TIMEOUT = (2 ** 31) - 1;

export interface SceneActor {
  /**
   * Accessories in drawing order. A robot has none.
   */
  accessories: Accessory[];
  /**
   * A chat bot: drawn as a robot (WALKER.robot), needs no hairstyle or hair color.
   */
  bot?: boolean;
  color: string;
  hairColor: string;
  /**
   * Index of the hairstyle in WALKER.hairstyles.
   */
  hairstyle: number;
  /**
   * The last message addressed to them (a reply or a mention) while they were on the scene.
   */
  lastPing?: ChatMessage;
  lastMessage: ChatMessage;
  /**
   * Said goodbye (`lastMessage` is the farewell) and leaves the scene.
   */
  leaving?: boolean;
  login: string;
  name: string;
  /**
   * Clothes: variants from WALKER.clothes and the colors of pants and shoes. A robot needs none.
   */
  outfit: Outfit;
  /**
   * Seniority: the senior one is over the others (see actorPriority).
   */
  priority: number;
  /**
   * The role by the last message: a role may be granted or taken away.
   */
  role?: ChatRole;
  /**
   * The spot on the floor, a share of the scene width.
   */
  x: number;
}

// A message's addressee, by login or display name
const isAddressee = (msg: ChatMessage, actor: SceneActor) => !!msg.addressees?.some(
  name => name === actor.login || name === actor.name.toLowerCase(),
);

/**
 * Dudes on the scene: authors of the messages in the chat buffer, in the order they first
 * appeared. When the author's messages fall out of the buffer, they stay silent longer than `stay`
 * ms, or write !vanish / bb, the dude leaves the scene (saying goodbye with a "bb" sign), and the
 * command itself is not shown.
 * One who left by a command stays in the list with `leaving`, so the scene knows the farewell.
 * `followDates` are the channel follow dates by login, for the seniority of followers.
 */
export function useSceneActors(
  messages: Ref<ChatMessage[]>,
  stay: Ref<number | null>,
  followDates: Ref<ReadonlyMap<string, number | null>>,
) {
  // The current time is updated by the moment the nearest dude expires
  const now = ref(Date.now());
  let timer: ReturnType<typeof setTimeout> | null = null;
  onScopeDispose(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });

  const all = computed<SceneActor[]>(() => {
    const actors = new Map<string, SceneActor>();
    for (const msg of messages.value) {
      const actor = actors.get(msg.login);
      if (msg.vanish) {
        if (!actor) {
          continue;
        }
        if (msg.farewell && !actor.leaving) {
          actor.lastMessage = msg;
        }
        actor.leaving = true;
      } else if (actor && !actor.leaving) {
        actor.name = msg.author;
        actor.role = msg.role;
        actor.priority = actorPriority(msg, followDates.value.get(msg.login));
        // The viewer may have changed the nick color: the dude is repainted after it
        actor.color = actorColor(msg);
        actor.lastMessage = msg;
      } else {
        actors.set(msg.login, {
          accessories: msg.bot ? [] : actorAccessories(msg),
          bot: msg.bot,
          color: actorColor(msg),
          ...actorHair(msg),
          lastMessage: msg,
          login: msg.login,
          name: msg.author,
          outfit: actorOutfit(msg),
          priority: actorPriority(msg, followDates.value.get(msg.login)),
          role: msg.role,
          x: actorPosition(msg.login),
        });
      }
      if (msg.vanish || !msg.addressees) {
        continue;
      }
      for (const other of actors.values()) {
        if (other.login !== msg.login && !other.leaving && isAddressee(msg, other)) {
          other.lastPing = msg;
        }
      }
    }
    return [...actors.values()];
  });

  // When the dude leaves
  const expiry = (a: SceneActor, limit: number) => shownAt(a.lastMessage) + limit;

  const visible = computed(() => {
    const limit = stay.value;
    if (limit === null) {
      return all.value;
    }
    return all.value.filter(actor => expiry(actor, limit) > now.value);
  });

  watch(
    [visible, stay],
    () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = null;
      const limit = stay.value;
      if (limit === null) {
        return;
      }
      const nextExpiry = Math.min(...visible.value.map(a => expiry(a, limit)));
      if (nextExpiry === Infinity) {
        return;
      }
      // setTimeout fires right away past MAX_TIMEOUT, so it just checks again later
      const delay = Math.min(Math.max(0, nextExpiry - Date.now()), MAX_TIMEOUT);
      timer = setTimeout(() => (now.value = Date.now()), delay);
    },
    { immediate: true },
  );

  return visible;
}
