import type { ChatMessage } from '../composables/useTwitchChat';

/**
 * FNV-1a: быстрый стабильный хеш строки
 */
export function hash(str: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Цвет человечка — цвет ника в чате. Если зритель цвет не выбирал (тег color пуст),
 * вычисляем его из Twitch ID (а без него — из логина), поэтому он одинаков в разных сессиях
 */
export function actorColor(msg: Pick<ChatMessage, 'color' | 'userId' | 'login'>): string {
  return msg.color ?? fallbackColor(msg.userId ?? msg.login);
}

function fallbackColor(key: string): string {
  const h = hash(key);
  const hue = h % 360;
  const saturation = 55 + ((h >>> 9) % 30);
  const lightness = 50 + ((h >>> 17) % 15);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
