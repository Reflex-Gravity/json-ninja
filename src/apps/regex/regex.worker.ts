import { MAX_MATCHES, type RegexMatch, type RegexRequest, type RegexResponse } from '@/lib/regex-utils';

// Runs off the main thread so a catastrophically backtracking pattern can be killed via terminate().
function run({ id, pattern, flags, text, replacement }: RegexRequest): RegexResponse {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { id, ok: false, error: (e as Error).message };
  }

  const matches: RegexMatch[] = [];
  const repeat = re.global || re.sticky;
  let truncated = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      value: m[0],
      groups: m.slice(1),
      named: m.groups ? { ...m.groups } : null,
    });
    if (!repeat) break;
    if (matches.length >= MAX_MATCHES) {
      truncated = true;
      break;
    }
    // Zero-length matches would otherwise loop forever at the same index.
    if (m[0].length === 0) re.lastIndex++;
  }

  const replaced = replacement === null ? null : text.replace(new RegExp(pattern, flags), replacement);
  return { id, ok: true, matches, truncated, replaced };
}

self.addEventListener('message', (e: MessageEvent<RegexRequest>) => {
  self.postMessage(run(e.data));
});
