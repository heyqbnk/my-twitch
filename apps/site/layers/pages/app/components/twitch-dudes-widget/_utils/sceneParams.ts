const CHANNEL_RE = /^[a-z0-9_]{1,25}$/;
/**
 * Screen px per scene px by default.
 */
export const DEFAULT_SCALE = 2;
const MAX_SCALE = 10;

function toNumber(raw: string | undefined): number {
  return raw === undefined || raw.trim() === '' ? Number.NaN : Number(raw);
}

/**
 * The channel login: case and a leading `#` are ignored. Null if it is not a valid login.
 */
export function parseChannel(raw: string): string | null {
  const name = raw.trim().replace(/^#/, '').toLowerCase();
  return CHANNEL_RE.test(name) ? name : null;
}

/**
 * Screen px per scene px, 1–10. Whole, so all sprite pixels are of the same size.
 */
export function parseScale(raw: string | undefined): number {
  const scale = toNumber(raw);
  return Number.isInteger(scale) && scale >= 1 && scale <= MAX_SCALE ? scale : DEFAULT_SCALE;
}

/**
 * How long a dude stays on the scene after its last message: minutes (may be fractional) in the
 * parameter, ms in the result. Null — no limit.
 */
export function parseStay(raw: string | undefined): number | null {
  const minutes = toNumber(raw);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : null;
}

/**
 * Message display delay: seconds (may be fractional) in the parameter, ms in the result.
 */
export function parseDelay(raw: string | undefined): number {
  const seconds = toNumber(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

/**
 * Floor height in screen px by default.
 */
export const DEFAULT_FLOOR = 32;

/**
 * Floor height in screen px, a whole number ≥ 0. 0 — no floor.
 */
export function parseFloor(raw: string | undefined): number {
  const height = toNumber(raw);
  return Number.isInteger(height) && height >= 0 ? height : DEFAULT_FLOOR;
}
