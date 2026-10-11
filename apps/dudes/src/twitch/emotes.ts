export interface Emote {
  provider: 'twitch' | '7tv' | 'bttv';
  id: string;
  name: string;
  // Zero-width эмодзи рисуется поверх предыдущего
  zeroWidth?: boolean;
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'emote'; emote: Emote; overlays: Emote[] };

export type EmoteMap = ReadonlyMap<string, Emote>;

interface EmoteRange {
  id: string;
  start: number;
  end: number;
}

// Тег emotes: "25:0-4,12-16/1902:6-10" — id эмодзи и диапазоны (включительно)
// в символах Unicode (code points), а не в UTF-16.
function parseEmotesTag(tag: string): EmoteRange[] {
  const ranges: EmoteRange[] = [];
  for (const entry of tag.split('/')) {
    const [id, positions] = entry.split(':');
    if (!id || !positions) continue;
    for (const pos of positions.split(',')) {
      const [start, end] = pos.split('-').map(Number);
      if (Number.isInteger(start) && Number.isInteger(end)) ranges.push({ id, start, end });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

// Разбивает текст на фрагменты по нативным эмодзи Twitch из тега emotes.
export function splitMessage(text: string, emotesTag: string | undefined): MessagePart[] {
  if (!emotesTag) return [{ type: 'text', text }];

  const chars = Array.from(text);
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const { id, start, end } of parseEmotesTag(emotesTag)) {
    if (start < cursor || end >= chars.length) continue;
    if (start > cursor) parts.push({ type: 'text', text: chars.slice(cursor, start).join('') });
    const name = chars.slice(start, end + 1).join('');
    parts.push({ type: 'emote', emote: { provider: 'twitch', id, name }, overlays: [] });
    cursor = end + 1;
  }
  if (cursor < chars.length) parts.push({ type: 'text', text: chars.slice(cursor).join('') });

  return parts;
}

// Ищет в текстовых фрагментах слова, совпадающие со сторонними эмодзи (7TV, BTTV).
export function expandEmotes(parts: MessagePart[], emotes: EmoteMap): MessagePart[] {
  if (!emotes.size) return parts;

  const out: MessagePart[] = [];

  const pushText = (text: string) => {
    const last = out.at(-1);
    if (last?.type === 'text') last.text += text;
    else out.push({ type: 'text', text });
  };

  // Прикрепляет zero-width эмодзи к предыдущему эмодзи, если между ними только пробелы
  const attachOverlay = (emote: Emote) => {
    let i = out.length - 1;
    const prev = out[i];
    if (prev?.type === 'text' && !prev.text.trim()) i--;
    const target = out[i];
    if (target?.type !== 'emote') return false;
    out.length = i + 1;
    target.overlays.push(emote);
    return true;
  };

  for (const part of parts) {
    if (part.type === 'emote') {
      out.push({ ...part, overlays: [...part.overlays] });
      continue;
    }
    for (const token of part.text.split(/(\s+)/)) {
      if (!token) continue;
      const emote = emotes.get(token);
      if (!emote) pushText(token);
      else if (!(emote.zeroWidth && attachOverlay(emote))) {
        out.push({ type: 'emote', emote, overlays: [] });
      }
    }
  }

  return out;
}

const SINGLE_EMOJI = /^\p{Extended_Pictographic}(\p{Emoji_Modifier}|\uFE0F|\u200D\p{Extended_Pictographic})*$|^\p{Regional_Indicator}{2}$/u;

// Сообщение из одного эмодзи (с точностью до пробелов) — возвращает эту часть, иначе null
export function soloEmote(parts: MessagePart[]): MessagePart | null {
  const meaningful = parts.filter(p => p.type === 'emote' || p.text.trim());
  if (meaningful.length !== 1) return null;
  const [part] = meaningful;
  if (part.type === 'emote') return part;
  const text = part.text.trim();
  return SINGLE_EMOJI.test(text) ? { type: 'text', text } : null;
}

// large — для крупного показа: база 2x и 3x для экранов с высокой плотностью
export function emoteImage(emote: Emote, theme: 'light' | 'dark', large = false) {
  const [base1, base2] = large ? [2, 3] : [1, 2];
  if (emote.provider === 'bttv' || emote.provider === '7tv') {
    const base =
      emote.provider === 'bttv' ? `https://cdn.betterttv.net/emote/${emote.id}` : `https://cdn.7tv.app/emote/${emote.id}`;
    return { src: `${base}/${base1}x.webp`, srcset: `${base}/${base2}x.webp 2x` };
  }
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/${theme}`;
  return { src: `${base}/${base1}.0`, srcset: `${base}/${base2}.0 2x` };
}
