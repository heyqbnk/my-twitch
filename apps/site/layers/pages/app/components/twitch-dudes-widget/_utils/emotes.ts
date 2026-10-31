import { splitLinks } from './links';

export interface Emote {
  id: string;
  name: string;
  provider: '7tv' | 'bttv' | 'twitch';
  /**
   * A zero-width emote is drawn over the previous one.
   */
  zeroWidth?: boolean;
}

export interface EmotePart {
  /**
   * How many times the emote is repeated in a row: such a run is shown as one emote with a
   * counter. 1 if absent.
   */
  count?: number;
  emote: Emote;
  overlays: Emote[];
  type: 'emote';
}

/**
 * Only the domain of a link is shown.
 */
export interface LinkPart {
  domain: string;
  type: 'link';
}

/**
 * A "@nick" mention: `name` is the nick without the @, as written.
 */
export interface MentionPart {
  name: string;
  type: 'mention';
}

export type MessagePart = EmotePart | LinkPart | MentionPart | { text: string; type: 'text' };

export type EmoteMap = ReadonlyMap<string, Emote>;

interface EmoteRange {
  end: number;
  id: string;
  start: number;
}

/**
 * The `emotes` tag: "25:0-4,12-16/1902:6-10" — emote ids and their ranges (inclusive) in Unicode
 * characters (code points), not in UTF-16 units.
 */
function parseEmotesTag(tag: string): EmoteRange[] {
  const ranges: EmoteRange[] = [];
  for (const entry of tag.split('/')) {
    const [id, positions] = entry.split(':');
    if (!id || !positions) {
      continue;
    }
    for (const pos of positions.split(',')) {
      const [start, end] = pos.split('-').map(Number);
      if (Number.isInteger(start) && Number.isInteger(end)) {
        ranges.push({ end: end!, id, start: start! });
      }
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Splits text into fragments by native Twitch emotes from the `emotes` tag and by links.
 */
export function splitMessage(text: string, emotesTag: string | undefined): MessagePart[] {
  if (!emotesTag) {
    return splitLinks(text);
  }

  const chars = Array.from(text);
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const { end, id, start } of parseEmotesTag(emotesTag)) {
    if (start < cursor || end >= chars.length) {
      continue;
    }
    if (start > cursor) {
      parts.push(...splitLinks(chars.slice(cursor, start).join('')));
    }
    const name = chars.slice(start, end + 1).join('');
    parts.push({ emote: { id, name, provider: 'twitch' }, overlays: [], type: 'emote' });
    cursor = end + 1;
  }
  if (cursor < chars.length) {
    parts.push(...splitLinks(chars.slice(cursor).join('')));
  }

  return parts;
}

/**
 * Finds words matching third-party emotes (7TV, BTTV) in text fragments.
 */
export function expandEmotes(parts: MessagePart[], emotes: EmoteMap): MessagePart[] {
  if (!emotes.size) {
    return parts;
  }

  const out: MessagePart[] = [];

  const pushText = (text: string) => {
    const last = out.at(-1);
    if (last?.type === 'text') {
      last.text += text;
    } else {
      out.push({ text, type: 'text' });
    }
  };

  // Attaches a zero-width emote to the previous emote if only whitespace is between them.
  const attachOverlay = (emote: Emote) => {
    let i = out.length - 1;
    const prev = out[i];
    if (prev?.type === 'text' && !prev.text.trim()) {
      i--;
    }
    const target = out[i];
    if (target?.type !== 'emote') {
      return false;
    }
    out.length = i + 1;
    target.overlays.push(emote);
    return true;
  };

  for (const part of parts) {
    if (part.type === 'emote') {
      out.push({ ...part, overlays: [...part.overlays] });
      continue;
    }
    if (part.type === 'link' || part.type === 'mention') {
      out.push(part);
      continue;
    }
    for (const token of part.text.split(/(\s+)/)) {
      if (!token) {
        continue;
      }
      const emote = emotes.get(token);
      if (!emote) {
        pushText(token);
      } else if (!(emote.zeroWidth && attachOverlay(emote))) {
        out.push({ emote, overlays: [], type: 'emote' });
      }
    }
  }

  return out;
}

function emoteKey({ emote, overlays }: EmotePart): string {
  return [emote, ...overlays].map(e => `${e.provider}:${e.id}`).join(' ');
}

/**
 * Merges runs of the same emote (with the same overlays), separated by whitespace only, into
 * one emote with a `count`.
 */
export function mergeRepeatedEmotes(parts: MessagePart[]): MessagePart[] {
  const out: MessagePart[] = [];

  for (const part of parts) {
    if (part.type === 'emote') {
      const last = out.at(-1);
      const i = last?.type === 'text' && !last.text.trim() ? out.length - 2 : out.length - 1;
      const prev = out[i];
      if (prev?.type === 'emote' && emoteKey(prev) === emoteKey(part)) {
        out.length = i + 1;
        out[i] = { ...prev, count: (prev.count ?? 1) + (part.count ?? 1) };
        continue;
      }
    }
    out.push(part);
  }

  return out;
}

/**
 * The emotes of a message made of emotes only (up to whitespace), else null. Native Unicode emoji
 * are plain text: emotes here are only Twitch, 7TV and BTTV ones.
 */
export function emotesOnly(parts: MessagePart[]): EmotePart[] | null {
  const out: EmotePart[] = [];
  for (const part of parts) {
    if (part.type === 'emote') {
      out.push(part);
    } else if (part.type !== 'text' || part.text.trim()) {
      return null;
    }
  }
  return out.length ? out : null;
}

/**
 * Image sources of an emote. `large` is for big emotes: 2x base and 3x for high-density screens.
 */
export function emoteImage(emote: Emote, theme: 'dark' | 'light', large = false) {
  const [base1, base2] = large ? [2, 3] : [1, 2];
  if (emote.provider === 'bttv' || emote.provider === '7tv') {
    const base = emote.provider === 'bttv'
      ? `https://cdn.betterttv.net/emote/${emote.id}`
      : `https://cdn.7tv.app/emote/${emote.id}`;
    return { src: `${base}/${base1}x.webp`, srcset: `${base}/${base2}x.webp 2x` };
  }
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/${theme}`;
  return { src: `${base}/${base1}.0`, srcset: `${base}/${base2}.0 2x` };
}
