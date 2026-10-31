import type { ChatMessage } from '../_composables/useTwitchChat';

/**
 * Seniority tiers, from the lowest: viewer, follower, subscriber, VIP, moderator, channel owner.
 */
const TIER = { broadcaster: 5, follower: 1, moderator: 4, subscriber: 2, viewer: 0, vip: 3 };
/**
 * The spread within a tier: subscription months or follow age in hours stay below it.
 */
const TIER_SPAN = 10_000_000;
const HOUR = 3_600_000;
/**
 * Higher than any seniority: added to the seniority of a dude while its message is shown.
 */
export const TALKING_PRIORITY = (TIER.broadcaster + 1) * TIER_SPAN;
/**
 * A highlighted message (for channel points) is above any talking dude: added instead of
 * TALKING_PRIORITY.
 */
export const HIGHLIGHTED_PRIORITY = 2 * TALKING_PRIORITY;

/**
 * Seniority of the message's author: the senior one is drawn over the others.
 * VIPs and subscribers are ranked within their tier by total subscription length (a VIP without a
 * subscription is below a VIP with one), followers by who followed first. `followedAt` is the
 * follow date, null or undefined when unknown.
 */
export function actorPriority(msg: ChatMessage, followedAt: number | null | undefined): number {
  const subMonths = msg.subMonths ?? 0;
  if (msg.role === 'broadcaster' || msg.role === 'moderator') {
    return TIER[msg.role] * TIER_SPAN;
  }
  if (msg.role === 'vip') {
    return (TIER.vip * TIER_SPAN) + subMonths;
  }
  if (subMonths) {
    return (TIER.subscriber * TIER_SPAN) + subMonths;
  }
  // Hours from the follow to TIER_SPAN hours after the epoch (year 3110): the earlier, the higher
  if (followedAt != null) {
    return (TIER.follower * TIER_SPAN) + TIER_SPAN - 1 - Math.floor(followedAt / HOUR);
  }
  return TIER.viewer;
}

/**
 * A viewer is ranked by the follow date only if no role or subscription ranks them higher.
 * Bots are not asked about: they rarely follow, and the IVR requests would be wasted.
 */
export function needsFollowDate(msg: ChatMessage): boolean {
  return !msg.bot && !msg.role && !msg.subMonths;
}
