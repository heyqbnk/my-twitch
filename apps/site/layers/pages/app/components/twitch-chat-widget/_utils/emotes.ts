export interface Emote {
  name: string;
  src: string;
  srcset: string;
}

/**
 * Third-party emotes by name.
 */
export type EmoteMap = ReadonlyMap<string, Emote>;

export type MessagePart = { emote: Emote; type: 'emote' } | { text: string; type: 'text' };

interface EmoteRange {
  end: number;
  id: string;
  start: number;
}

function twitchEmote(id: string, name: string): Emote {
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark`;
  return { name, src: `${base}/1.0`, srcset: `${base}/2.0 2x` };
}

/**
 * Parses the `emotes` tag: "25:0-4,12-16/1902:6-10" — emote ids with inclusive ranges counted in
 * Unicode code points rather than UTF-16 units.
 */
function parseEmotesTag(tag: string): EmoteRange[] {
  const ranges: EmoteRange[] = [];
  for (const entry of tag.split('/')) {
    const [id, positions] = entry.split(':');
    if (!id || !positions) {
      continue;
    }
    for (const position of positions.split(',')) {
      const [start, end] = position.split('-').map(Number);
      if (Number.isInteger(start) && Number.isInteger(end)) {
        ranges.push({ end: end!, id, start: start! });
      }
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Splits a message into text and native Twitch emotes from the `emotes` tag.
 */
export function splitMessage(text: string, emotesTag: string | undefined): MessagePart[] {
  if (!emotesTag) {
    return [{ text, type: 'text' }];
  }

  const chars = Array.from(text);
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const { end, id, start } of parseEmotesTag(emotesTag)) {
    if (start < cursor || end >= chars.length) {
      continue;
    }
    if (start > cursor) {
      parts.push({ text: chars.slice(cursor, start).join(''), type: 'text' });
    }
    parts.push({ emote: twitchEmote(id, chars.slice(start, end + 1).join('')), type: 'emote' });
    cursor = end + 1;
  }
  if (cursor < chars.length) {
    parts.push({ text: chars.slice(cursor).join(''), type: 'text' });
  }

  return parts;
}

/**
 * Replaces words in text parts that match third-party emotes (BTTV, FFZ, 7TV).
 */
export function expandEmotes(parts: MessagePart[], emotes: EmoteMap): MessagePart[] {
  if (!emotes.size) {
    return parts;
  }

  const result: MessagePart[] = [];
  const pushText = (text: string) => {
    const last = result.at(-1);
    if (last?.type === 'text') {
      last.text += text;
    } else {
      result.push({ text, type: 'text' });
    }
  };

  for (const part of parts) {
    if (part.type === 'emote') {
      result.push(part);
      continue;
    }
    for (const token of part.text.split(/(\s+)/)) {
      const emote = emotes.get(token);
      if (emote) {
        result.push({ emote, type: 'emote' });
      } else if (token) {
        pushText(token);
      }
    }
  }

  return result;
}
