import type { MessagePart } from './emotes';

/**
 * A link is a word with an http(s) scheme, with "www.", or a domain with a path or in a popular
 * zone: this way "node.js" or "т.е." don't become links.
 */
const LINK = /^(https?:\/\/)?(www\.)?((?:[\p{L}\d-]+\.)+(\p{L}{2,63}))(?::\d+)?([/?#]\S*)?$/iu;
const BARE_TLDS = new Set(
  'com net org ru рф su ua by kz io tv gg me dev app co be ly gl to cc info xyz link site online pro store'
    .split(' '),
);
/**
 * A "@nick" mention: the @ is not in the middle of a word (not an email) and not doubled.
 */
export const MENTION = /(?<![\p{L}\p{N}_@])@([\p{L}\p{N}_]+)/gu;
/**
 * Punctuation at the end of a word continues the sentence rather than the link.
 */
const TRAILING_PUNCTUATION = /[.,!?;:)\]}»"'…]+$/u;

/**
 * The link's domain without "www.", or null if the word is not a link.
 */
function linkDomain(word: string): string | null {
  const match = LINK.exec(word);
  if (!match) {
    return null;
  }
  const [, scheme, www, host, tld, path] = match;
  if (!scheme && !www && !path && !BARE_TLDS.has(tld!.toLowerCase())) {
    return null;
  }
  return host!.toLowerCase();
}

/**
 * Splits text into text fragments, links (only their domain is kept) and mentions.
 */
export function splitLinks(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const pushText = (chunk: string) => {
    const last = parts.at(-1);
    if (last?.type === 'text') {
      last.text += chunk;
    } else if (chunk) {
      parts.push({ text: chunk, type: 'text' });
    }
  };

  for (const token of text.split(/(\s+)/)) {
    const tail = TRAILING_PUNCTUATION.exec(token)?.[0] ?? '';
    const domain = linkDomain(token.slice(0, token.length - tail.length));
    if (!domain) {
      let cursor = 0;
      for (const match of token.matchAll(MENTION)) {
        pushText(token.slice(cursor, match.index));
        parts.push({ name: match[1]!, type: 'mention' });
        cursor = match.index + match[0].length;
      }
      pushText(token.slice(cursor));
      continue;
    }
    parts.push({ domain, type: 'link' });
    pushText(tail);
  }

  return parts;
}
