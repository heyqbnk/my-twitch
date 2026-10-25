import type { ChatMessage } from '../composables/useTwitchChat';

// Ступени старшинства, от младшей: зритель, фолловер, подписчик, VIP, модератор, владелец канала
const TIER = { viewer: 0, follower: 1, subscriber: 2, vip: 3, moderator: 4, broadcaster: 5 };
// Разброс внутри ступени: стаж подписки в месяцах или стаж фоллова в часах — меньше TIER_SPAN
const TIER_SPAN = 10_000_000;
const HOUR = 3_600_000;
// Старшинство выше любого: на время сообщения прибавляется к старшинству говорящего
export const TALKING_PRIORITY = (TIER.broadcaster + 1) * TIER_SPAN;
// Выделенное сообщение (за баллы канала) — выше любого говорящего: прибавляется вместо TALKING_PRIORITY
export const HIGHLIGHTED_PRIORITY = 2 * TALKING_PRIORITY;

// Старшинство автора сообщения: кто старше, того видно поверх остальных.
// VIP и подписчики внутри ступени — по общему стажу подписки (VIP без подписки ниже VIP с ней),
// фолловеры — кто раньше зафолловил. followedAt — дата фоллова, null или undefined — неизвестна
export function actorPriority(msg: ChatMessage, followedAt: number | null | undefined): number {
  const subMonths = msg.subMonths ?? 0;
  if (msg.role === 'broadcaster' || msg.role === 'moderator') return TIER[msg.role] * TIER_SPAN;
  if (msg.role === 'vip') return TIER.vip * TIER_SPAN + subMonths;
  if (subMonths) return TIER.subscriber * TIER_SPAN + subMonths;
  // Часов от фоллова до TIER_SPAN часов от начала эпохи (3110 год): чем раньше, тем больше
  if (followedAt != null) {
    return TIER.follower * TIER_SPAN + TIER_SPAN - 1 - Math.floor(followedAt / HOUR);
  }
  return TIER.viewer;
}

// Зрителя ранжируем по фоллову, только если он не выше по роли или подписке.
// Ботов не спрашиваем: фолловят они редко, а запросы к IVR лишние
export function needsFollowDate(msg: ChatMessage): boolean {
  return !msg.bot && !msg.role && !msg.subMonths;
}
