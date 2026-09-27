export interface RegexMatch {
  index: number;
  end: number;
  value: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined> | null;
}

export interface RegexRequest {
  id: number;
  pattern: string;
  flags: string;
  text: string;
  replacement: string | null;
}

export type RegexResponse =
  | { id: number; ok: true; matches: RegexMatch[]; truncated: boolean; replaced: string | null }
  | { id: number; ok: false; error: string };

export const MAX_MATCHES = 5000;

export const REGEX_FLAGS: { flag: string; label: string; title: string }[] = [
  { flag: 'g', label: 'global', title: 'Find all matches instead of stopping at the first' },
  { flag: 'i', label: 'ignore case', title: 'Case-insensitive matching' },
  { flag: 'm', label: 'multiline', title: '^ and $ match at line breaks' },
  { flag: 's', label: 'dotall', title: '. also matches newlines' },
  { flag: 'u', label: 'unicode', title: 'Full Unicode matching and \\p{…} escapes' },
  { flag: 'y', label: 'sticky', title: 'Match only at lastIndex' },
];

export interface RegexToken {
  insert: string;
  label: string;
  title: string;
  // Tokens that wrap the current selection, e.g. a group around the highlighted text.
  wrap?: [string, string];
}

export const TOKEN_GROUPS: { label: string; tokens: RegexToken[] }[] = [
  {
    label: 'Characters',
    tokens: [
      { insert: '.', label: '.', title: 'Any character except newline' },
      { insert: '\\d', label: '\\d', title: 'Digit (0-9)' },
      { insert: '\\w', label: '\\w', title: 'Word character (letter, digit, underscore)' },
      { insert: '\\s', label: '\\s', title: 'Whitespace' },
      { insert: '\\D', label: '\\D', title: 'Not a digit' },
      { insert: '\\W', label: '\\W', title: 'Not a word character' },
      { insert: '\\S', label: '\\S', title: 'Not whitespace' },
    ],
  },
  {
    label: 'Sets',
    tokens: [
      { insert: '[]', label: '[abc]', title: 'Any one of the listed characters', wrap: ['[', ']'] },
      { insert: '[^]', label: '[^abc]', title: 'Any character not listed', wrap: ['[^', ']'] },
      { insert: '[a-z]', label: '[a-z]', title: 'Character range' },
    ],
  },
  {
    label: 'Anchors',
    tokens: [
      { insert: '^', label: '^', title: 'Start of string (or line with m flag)' },
      { insert: '$', label: '$', title: 'End of string (or line with m flag)' },
      { insert: '\\b', label: '\\b', title: 'Word boundary' },
    ],
  },
  {
    label: 'Quantifiers',
    tokens: [
      { insert: '*', label: '*', title: '0 or more' },
      { insert: '+', label: '+', title: '1 or more' },
      { insert: '?', label: '?', title: '0 or 1 (optional)' },
      { insert: '{3}', label: '{n}', title: 'Exactly n times' },
      { insert: '{2,5}', label: '{n,m}', title: 'Between n and m times' },
      { insert: '*?', label: '*?', title: 'Lazy: as few as possible' },
    ],
  },
  {
    label: 'Groups',
    tokens: [
      { insert: '()', label: '(…)', title: 'Capture group', wrap: ['(', ')'] },
      { insert: '(?:)', label: '(?:…)', title: 'Non-capturing group', wrap: ['(?:', ')'] },
      { insert: '(?<name>)', label: '(?<n>…)', title: 'Named capture group', wrap: ['(?<name>', ')'] },
      { insert: '|', label: '|', title: 'Alternation (or)' },
      { insert: '(?=)', label: '(?=…)', title: 'Lookahead', wrap: ['(?=', ')'] },
      { insert: '(?!)', label: '(?!…)', title: 'Negative lookahead', wrap: ['(?!', ')'] },
    ],
  },
];

export const REGEX_PRESETS: { label: string; pattern: string; flags: string }[] = [
  { label: 'Email address', pattern: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+', flags: 'gi' },
  { label: 'URL', pattern: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*', flags: 'gi' },
  { label: 'IPv4 address', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b', flags: 'g' },
  { label: 'UUID', pattern: '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b', flags: 'gi' },
  { label: 'ISO 8601 date', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])(?:T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?', flags: 'g' },
  { label: 'Hex color', pattern: '#(?:[0-9a-f]{3}){1,2}\\b', flags: 'gi' },
  { label: 'Phone (E.164)', pattern: '\\+[1-9]\\d{6,14}\\b', flags: 'g' },
  { label: 'Semantic version', pattern: '\\bv?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[\\w.-]+)?(?:\\+[\\w.-]+)?\\b', flags: 'g' },
  { label: 'JWT', pattern: 'eyJ[\\w-]+\\.[\\w-]+\\.[\\w-]*', flags: 'g' },
  { label: 'URL slug', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', flags: 'gm' },
];

export interface ExplainedToken {
  token: string;
  description: string;
}

const ESCAPES: Record<string, string> = {
  d: 'a digit',
  D: 'a non-digit',
  w: 'a word character',
  W: 'a non-word character',
  s: 'whitespace',
  S: 'non-whitespace',
  b: 'a word boundary',
  B: 'a non-word boundary',
  n: 'a newline',
  r: 'a carriage return',
  t: 'a tab',
};

const GROUP_OPENERS: [string, string][] = [
  ['(?:', 'start of a non-capturing group'],
  ['(?=', 'start of a lookahead'],
  ['(?!', 'start of a negative lookahead'],
  ['(?<=', 'start of a lookbehind'],
  ['(?<!', 'start of a negative lookbehind'],
];

function describeQuantifier(q: string): string {
  const lazy = q.length > 1 && q.endsWith('?') ? ' (lazy)' : '';
  const base = lazy ? q.slice(0, -1) : q;
  if (base === '*') return `0 or more times${lazy}`;
  if (base === '+') return `1 or more times${lazy}`;
  if (base === '?') return `0 or 1 times (optional)${lazy}`;
  const [min, max] = base.slice(1, -1).split(',');
  if (max === undefined) return `exactly ${min} times${lazy}`;
  if (max === '') return `${min} or more times${lazy}`;
  return `between ${min} and ${max} times${lazy}`;
}

// Best-effort, token-by-token plain-English breakdown of a pattern (not a full parser).
export function explainRegex(pattern: string): ExplainedToken[] {
  const tokens: ExplainedToken[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    let token = ch;
    let description: string;

    if (ch === '\\') {
      token = pattern.slice(i, i + 2);
      const next = pattern[i + 1] ?? '';
      if (/[pP]/.test(next) && pattern[i + 2] === '{') {
        token = pattern.slice(i, pattern.indexOf('}', i) + 1 || undefined);
        description = `${next === 'P' ? 'not ' : ''}a character with Unicode property ${token.slice(3, -1)}`;
      } else if (/[1-9]/.test(next)) {
        description = `back-reference to group ${next}`;
      } else {
        description = ESCAPES[next] ?? `the literal "${next}"`;
      }
    } else if (ch === '[') {
      let j = i + 1;
      while (j < pattern.length && pattern[j] !== ']') j += pattern[j] === '\\' ? 2 : 1;
      token = pattern.slice(i, j + 1);
      const negated = token.startsWith('[^');
      description = negated ? `any character except [${token.slice(2)}` : `one of ${token}`;
    } else if (ch === '(') {
      const special = GROUP_OPENERS.find(([opener]) => pattern.startsWith(opener, i));
      if (special) {
        [token, description] = special;
      } else if (pattern.startsWith('(?<', i)) {
        token = pattern.slice(i, pattern.indexOf('>', i) + 1);
        description = `start of capture group "${token.slice(3, -1)}"`;
      } else {
        description = 'start of a capture group';
      }
    } else if (ch === ')') {
      description = 'end of group';
    } else if (ch === '|') {
      description = 'or';
    } else if (ch === '.') {
      description = 'any character';
    } else if (ch === '^') {
      description = 'start of input/line';
    } else if (ch === '$') {
      description = 'end of input/line';
    } else if (/[*+?{]/.test(ch)) {
      const m = /^(?:[*+?]|\{\d+(?:,\d*)?\})\??/.exec(pattern.slice(i));
      token = m ? m[0] : ch;
      description = m ? `…${describeQuantifier(token)}` : `the literal "${ch}"`;
    } else {
      // Collapse a run of plain literal characters into one token.
      const m = /^[^\\[\]().|^$*+?{}]+/.exec(pattern.slice(i));
      token = m ? m[0] : ch;
      // A quantifier after a literal run only applies to its last character.
      const quantified = token.length > 1 && /^[*+?{]/.test(pattern[i + token.length] ?? '');
      if (quantified) token = token.slice(0, -1);
      description = token.length === 1 ? `the character "${token}"` : `the text "${token}"`;
    }

    tokens.push({ token, description });
    i += Math.max(token.length, 1);
  }
  return tokens;
}
