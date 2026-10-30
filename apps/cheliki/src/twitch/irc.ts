export interface IrcMessage {
  tags: Record<string, string>;
  prefix: string | null;
  command: string;
  params: string[];
}

const TAG_ESCAPES: Record<string, string> = {
  ':': ';',
  s: ' ',
  '\\': '\\',
  r: '\r',
  n: '\n',
};

function unescapeTagValue(value: string): string {
  return value.replace(/\\(.?)/g, (_, ch: string) => TAG_ESCAPES[ch] ?? ch);
}

/**
 * Разбирает одну строку IRC: "@tags :prefix COMMAND param1 param2 :trailing"
 */
export function parseIrcLine(line: string): IrcMessage | null {
  let rest = line;
  const tags: Record<string, string> = {};
  let prefix: string | null = null;

  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ');
    if (end === -1) return null;
    for (const pair of rest.slice(1, end).split(';')) {
      const eq = pair.indexOf('=');
      if (eq === -1) tags[pair] = '';
      else tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1));
    }
    rest = rest.slice(end + 1);
  }

  if (rest.startsWith(':')) {
    const end = rest.indexOf(' ');
    if (end === -1) return null;
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1);
  }

  const params: string[] = [];
  const trailingAt = rest.indexOf(' :');
  const trailing = trailingAt === -1 ? null : rest.slice(trailingAt + 2);
  const head = trailingAt === -1 ? rest : rest.slice(0, trailingAt);
  const [command, ...middle] = head.split(' ').filter(Boolean);
  if (!command) return null;
  params.push(...middle);
  if (trailing !== null) params.push(trailing);

  return { tags, prefix, command, params };
}
