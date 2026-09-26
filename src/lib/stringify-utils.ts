import { compactJson, formatJson } from '@/lib/json-utils';

export type CurlShell = 'bash' | 'cmd';

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function prettyIfJson(text: string): string {
  return isJson(text) ? formatJson(text) : text;
}

// Turns JSON (or any text) into a JSON string literal, e.g. {"a":1} -> "{\"a\":1}".
export function stringifyText(input: string, minify: boolean): { output: string; isJson: boolean } {
  const valid = isJson(input);
  const source = valid && minify ? compactJson(input) : input;
  return { output: JSON.stringify(source), isJson: valid };
}

// Reverses stringifyText. Accepts a quoted literal ("{\"a\":1}") or just its escaped
// contents ({\"a\":1}), and unwraps multiple levels of stringification.
export function parseStringified(input: string): string {
  const trimmed = input.trim();
  let value: unknown;
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    value = JSON.parse(trimmed);
  } else {
    value = JSON.parse(`"${trimmed.replace(/(^|[^\\])((?:\\\\)*)"/g, '$1$2\\"')}"`);
  }
  while (typeof value === 'string') {
    const inner = value.trim();
    if (!inner.startsWith('"') || !isJson(inner)) break;
    value = JSON.parse(inner);
  }
  return prettyIfJson(value as string);
}

export function quoteForShell(value: string, shell: CurlShell): string {
  if (shell === 'cmd') {
    // Windows argv rules: backslashes are literal unless they precede a quote, in which case
    // they must be doubled, and the quote itself escaped as \".
    const escaped = value
      .replace(/(\\*)"/g, (_, bs: string) => `${bs}${bs}\\"`)
      .replace(/(\\+)$/, '$1$1');
    return `"${escaped}"`;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface CurlRequest {
  method: string;
  url: string;
  headers: string[];
  body: string;
}

export function buildCurlCommand(
  request: CurlRequest,
  shell: CurlShell,
  minify: boolean
): string {
  const body = minify && isJson(request.body) ? compactJson(request.body) : request.body;
  const parts = [`curl -X ${request.method} ${quoteForShell(request.url, shell)}`];
  for (const header of request.headers) {
    parts.push(`-H ${quoteForShell(header, shell)}`);
  }
  if (body.trim()) parts.push(`--data-raw ${quoteForShell(body, shell)}`);
  const continuation = shell === 'cmd' ? ' ^\n  ' : ' \\\n  ';
  return parts.join(continuation);
}

const ANSI_C_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  a: '\x07',
  b: '\b',
  e: '\x1b',
  E: '\x1b',
  f: '\f',
  v: '\v',
  '\\': '\\',
  "'": "'",
  '"': '"',
  '?': '?',
};

// Splits a shell command line into words, handling bash quoting ('...', "...", $'...'),
// backslash escapes, and line continuations from bash (\), cmd (^) and PowerShell (`).
export function tokenizeShell(input: string): string[] {
  const src = input.replace(/\r\n/g, '\n').replace(/(?:\\|\^|`)\n/g, ' ');
  const tokens: string[] = [];
  let current = '';
  let inToken = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = '';
      inToken = false;
      i++;
      continue;
    }
    inToken = true;

    if (ch === "'") {
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw new Error('Unterminated single quote');
      current += src.slice(i + 1, end);
      i = end + 1;
    } else if (ch === '$' && src[i + 1] === "'") {
      i += 2;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\' && i + 1 < src.length) {
          const next = src[i + 1];
          if (next === 'x') {
            const hex = src.slice(i + 2).match(/^[0-9a-fA-F]{1,2}/)?.[0] ?? '';
            current += hex ? String.fromCharCode(parseInt(hex, 16)) : '\\x';
            i += 2 + hex.length;
          } else if (next === 'u' || next === 'U') {
            const hex = src.slice(i + 2).match(next === 'u' ? /^[0-9a-fA-F]{1,4}/ : /^[0-9a-fA-F]{1,8}/)?.[0] ?? '';
            current += hex ? String.fromCodePoint(parseInt(hex, 16)) : `\\${next}`;
            i += 2 + hex.length;
          } else {
            current += ANSI_C_ESCAPES[next] ?? `\\${next}`;
            i += 2;
          }
        } else {
          current += src[i++];
        }
      }
      if (i >= src.length) throw new Error('Unterminated $\'...\' string');
      i++;
    } else if (ch === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length && '"\\$`\n'.includes(src[i + 1])) {
          current += src[i + 1];
          i += 2;
        } else {
          current += src[i++];
        }
      }
      if (i >= src.length) throw new Error('Unterminated double quote');
      i++;
    } else if (ch === '\\' && i + 1 < src.length) {
      current += src[i + 1];
      i += 2;
    } else {
      current += ch;
      i++;
    }
  }
  if (inToken) tokens.push(current);
  return tokens;
}

const DATA_FLAGS = new Set([
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-ascii',
  '--data-urlencode',
  '--json',
]);

// Flags that consume the following word, so it isn't mistaken for the URL.
const FLAGS_WITH_VALUE = new Set([
  '-A', '--user-agent', '-b', '--cookie', '-c', '--cookie-jar', '-e', '--referer',
  '-E', '--cert', '--cacert', '--key', '-F', '--form', '--form-string', '-m', '--max-time',
  '--connect-timeout', '-o', '--output', '-u', '--user', '-w', '--write-out', '-x', '--proxy',
  '-T', '--upload-file', '--resolve', '--retry', '-r', '--range', '-K', '--config',
  '--limit-rate', '-y', '--speed-time', '-Y', '--speed-limit', '--max-redirs', '--oauth2-bearer',
  '--interface', '--unix-socket', '--connect-to', '-z', '--time-cond',
]);

// Splits a Windows cmd command line into words using the MSVCRT argv rules curl.exe follows:
// only double quotes group, backslashes are literal unless they precede a quote, and ^ escapes.
export function tokenizeWindows(input: string): string[] {
  const src = input.replace(/\r\n/g, '\n').replace(/\^\n/g, ' ');
  const tokens: string[] = [];
  let current = '';
  let inToken = false;
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (!inQuotes && /\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = '';
      inToken = false;
      i++;
      continue;
    }
    inToken = true;

    if (ch === '\\') {
      let n = 0;
      while (src[i] === '\\') {
        n++;
        i++;
      }
      if (src[i] === '"') {
        current += '\\'.repeat(Math.floor(n / 2));
        if (n % 2 === 1) {
          current += '"';
          i++;
        }
      } else {
        current += '\\'.repeat(n);
      }
    } else if (ch === '"') {
      inQuotes = !inQuotes;
      i++;
    } else if (ch === '^' && !inQuotes && i + 1 < src.length) {
      current += src[i + 1];
      i += 2;
    } else {
      current += ch;
      i++;
    }
  }
  if (inQuotes) throw new Error('Unterminated double quote');
  if (inToken) tokens.push(current);
  return tokens;
}

function looksLikeWindows(input: string): boolean {
  return /\^\r?\n/.test(input) || /^\s*curl\.exe\b/i.test(input);
}

// Parses a curl command (bash or Windows cmd syntax) into its parts. Input that isn't a curl
// command is treated as a single shell-quoted string (e.g. '{"a":"it'\''s"}') and unquoted.
export function parseCurlCommand(input: string): CurlRequest {
  if (isJson(input)) return { method: '', url: '', headers: [], body: formatJson(input) };
  const windowsFirst = looksLikeWindows(input);
  const tokenizers = windowsFirst ? [tokenizeWindows, tokenizeShell] : [tokenizeShell, tokenizeWindows];
  let fallback: CurlRequest | null = null;
  let firstError: unknown = null;
  // The quoting style is ambiguous, so prefer whichever tokenizer yields a valid JSON body.
  for (const tokenize of tokenizers) {
    try {
      const request = parseCurlTokens(tokenize(input.trim()));
      if (!request.body.trim() || isJson(request.body)) return request;
      fallback ??= request;
    } catch (e) {
      firstError ??= e;
    }
  }
  if (fallback) return fallback;
  throw firstError;
}

function parseCurlTokens(tokens: string[]): CurlRequest {
  if (tokens.length === 0) return { method: '', url: '', headers: [], body: '' };

  const first = tokens[0].toLowerCase();
  if (first !== 'curl' && first !== 'curl.exe') {
    return { method: '', url: '', headers: [], body: prettyIfJson(tokens.join(' ')) };
  }

  let method = '';
  let url = '';
  const headers: string[] = [];
  const data: string[] = [];
  let isJsonFlag = false;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const next = () => tokens[++i] ?? '';

    if (DATA_FLAGS.has(token)) {
      if (token === '--json') isJsonFlag = true;
      data.push(next());
    } else if (/^-d./.test(token)) {
      data.push(token.slice(2));
    } else if (token === '-X' || token === '--request') {
      method = next();
    } else if (/^-X./.test(token)) {
      method = token.slice(2);
    } else if (token === '-H' || token === '--header') {
      headers.push(next());
    } else if (/^-H./.test(token)) {
      headers.push(token.slice(2));
    } else if (token === '--url') {
      url = next();
    } else if (token === '-G' || token === '--get') {
      method = 'GET';
    } else if (token === '-I' || token === '--head') {
      method = 'HEAD';
    } else if (FLAGS_WITH_VALUE.has(token)) {
      i++;
    } else if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  if (isJsonFlag && !headers.some((h) => /^content-type\s*:/i.test(h))) {
    headers.push('Content-Type: application/json');
  }
  const body = data.join('&');
  return {
    method: method || (data.length > 0 ? 'POST' : 'GET'),
    url,
    headers,
    body: prettyIfJson(body),
  };
}
