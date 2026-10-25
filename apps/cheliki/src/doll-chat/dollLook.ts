import type { SceneActor } from '../composables/useSceneActors';
import type { Doll, Look } from '../doll/paperDoll';
import { hash } from '../scene/actorStyle';

/** The top is always the nick colour, so only the pants have a palette. */
const PANTS_COLORS: Record<string, string[]> = {
  jeans: ['#3b4a6b', '#2c3e66', '#4a6a9a', '#23252b', '#5b6170'],
  shorts: ['#c2a878', '#3b4a6b', '#4a7a4a', '#b23a3a', '#1f1f26', '#8a6a4a'],
};

/**
 * The doll's look for a chatter: the same in every session, picked by Twitch ID (or the login
 * without it), with the top in the nick colour.
 */
export function dollLook(doll: Doll, actor: SceneActor): Look {
  const key = actor.lastMessage.userId ?? actor.login;
  const pick = <T>(items: readonly T[], seed: number) => items[hash(key, seed) % items.length]!;
  return Object.fromEntries(doll.slots.map((slot, i) => {
    const name = pick(slot.names, 0x1b873593 + i);
    let color: string | undefined;
    if (slot.key === 'top') color = actor.color;
    else if (slot.key === 'pants') color = pick(PANTS_COLORS[name] ?? PANTS_COLORS.jeans!, 0x5bd1e995);
    else if (slot.palette) color = pick(slot.palette, 0xc2b2ae35);
    return [slot.key, { name, color }];
  }));
}
