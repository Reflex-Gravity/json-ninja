import { useState, useEffect, useRef, useMemo } from 'react';
import { Copy, Check, Wand2, Replace } from 'lucide-react';
import type { RegexToolState } from '@/types';
import { useToolState } from '@/lib/use-tool-state';
import {
  REGEX_FLAGS,
  REGEX_PRESETS,
  TOKEN_GROUPS,
  MAX_MATCHES,
  explainRegex,
  type RegexToken,
  type RegexRequest,
  type RegexResponse,
} from '@/lib/regex-utils';

const DEFAULT_STATE: RegexToolState = {
  pattern: '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+(?:\\.[\\w-]+)+)',
  flags: 'gi',
  text: 'Contact alice@example.com or bob.smith+test@mail.example.org for details.',
  replacement: '$<user> at $<domain>',
  replaceEnabled: false,
};

// A pattern that hasn't finished by then is almost certainly backtracking catastrophically.
const TIMEOUT_MS = 1500;
const MAX_LISTED_MATCHES = 500;

const paneClass =
  'flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden';
const paneHeaderClass =
  'flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700';
const inputClass =
  'text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400';
const MARK_CLASSES = [
  'bg-amber-200 dark:bg-amber-700/60 rounded-sm',
  'bg-sky-200 dark:bg-sky-700/60 rounded-sm',
];

function toLiteral(pattern: string, flags: string): string {
  return `/${pattern.replace(/\\?\//g, (m) => (m.length === 2 ? m : '\\/'))}/${flags}`;
}

function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => {}
    );
  };
  return [copied, copy];
}

export default function RegexApp() {
  const { state, update, loaded } = useToolState('regex', DEFAULT_STATE);
  const { pattern, flags, text, replacement, replaceEnabled } = state;
  const [result, setResult] = useState<RegexResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(true);
  const [literalCopied, copyLiteral] = useCopied();
  const [outputCopied, copyOutput] = useCopied();

  const patternRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  // Re-run (debounced) whenever the inputs change; stale responses are dropped by request id.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!pattern) {
        setResult(null);
        setTimedOut(false);
        return;
      }
      if (!workerRef.current) {
        const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<RegexResponse>) => {
          if (e.data.id !== requestIdRef.current) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setResult(e.data);
          setTimedOut(false);
        };
        workerRef.current = worker;
      }
      const request: RegexRequest = {
        id: ++requestIdRef.current,
        pattern,
        flags,
        text,
        replacement: replaceEnabled ? replacement : null,
      };
      workerRef.current.postMessage(request);
      timeoutRef.current = setTimeout(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
        setResult(null);
        setTimedOut(true);
      }, TIMEOUT_MS);
    }, 150);
    return () => clearTimeout(timer);
  }, [loaded, pattern, flags, text, replacement, replaceEnabled]);

  const explanation = useMemo(() => explainRegex(pattern), [pattern]);

  const matches = useMemo(() => (result?.ok ? result.matches : []), [result]);

  // Split the test text into plain and matched runs for highlighting.
  const segments = useMemo(() => {
    const out: { value: string; match: number | null }[] = [];
    let pos = 0;
    matches.forEach((m, i) => {
      if (m.index > pos) out.push({ value: text.slice(pos, m.index), match: null });
      out.push({ value: m.value, match: i });
      pos = Math.max(pos, m.end);
    });
    if (pos < text.length) out.push({ value: text.slice(pos), match: null });
    return out;
  }, [matches, text]);

  const toggleFlag = (flag: string) => {
    const next = flags.includes(flag) ? flags.replace(flag, '') : flags + flag;
    // Keep flags in canonical order so the literal reads naturally.
    update({ flags: REGEX_FLAGS.map((f) => f.flag).filter((f) => next.includes(f)).join('') });
  };

  const insertToken = (token: RegexToken) => {
    const input = patternRef.current;
    const start = input?.selectionStart ?? pattern.length;
    const end = input?.selectionEnd ?? pattern.length;
    const selected = pattern.slice(start, end);
    const inserted = token.wrap && selected ? `${token.wrap[0]}${selected}${token.wrap[1]}` : token.insert;
    update({ pattern: pattern.slice(0, start) + inserted + pattern.slice(end) });
    // Place the caret inside empty wrappers like "()" so the user can type straight into them.
    const caret = token.wrap && !selected ? start + token.wrap[0].length : start + inserted.length;
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const status = timedOut ? (
    <span className="text-red-500 dark:text-red-400">
      Timed out after {TIMEOUT_MS / 1000}s — the pattern is probably backtracking catastrophically
    </span>
  ) : result && !result.ok ? (
    <span className="text-red-500 dark:text-red-400">{result.error}</span>
  ) : result ? (
    <span className={matches.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
      {matches.length}
      {result.truncated ? '+' : ''} match{matches.length === 1 ? '' : 'es'}
      {result.truncated ? ` (stopped at ${MAX_MATCHES})` : ''}
    </span>
  ) : (
    <span className="text-gray-400">Enter a pattern</span>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-col gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[16rem] flex items-center font-mono text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus-within:border-blue-400">
            <span className="pl-2 text-gray-400">/</span>
            <input
              ref={patternRef}
              value={pattern}
              onChange={(e) => update({ pattern: e.target.value })}
              spellCheck={false}
              placeholder="pattern"
              className="flex-1 min-w-0 px-1 py-1.5 bg-transparent outline-none text-gray-800 dark:text-gray-100"
            />
            <span className="pr-2 text-gray-400">/{flags}</span>
          </div>
          <select
            value=""
            onChange={(e) => {
              const preset = REGEX_PRESETS[Number(e.target.value)];
              if (preset) update({ pattern: preset.pattern, flags: preset.flags });
            }}
            title="Insert a common pattern"
            className={inputClass}
          >
            <option value="" disabled>
              Common patterns…
            </option>
            {REGEX_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => copyLiteral(toLiteral(pattern, flags))}
            title="Copy as a JavaScript regex literal"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {literalCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {literalCopied ? 'Copied!' : 'Copy regex'}
          </button>
        </div>

        {replaceEnabled && (
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-[10px] font-sans font-semibold text-gray-500 dark:text-gray-400 w-16">Replace with</span>
            <input
              value={replacement}
              onChange={(e) => update({ replacement: e.target.value })}
              spellCheck={false}
              placeholder="$1, $<name>, $&"
              className={`${inputClass} flex-1 font-mono`}
            />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {REGEX_FLAGS.map(({ flag, label, title }) => (
            <label
              key={flag}
              title={title}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={flags.includes(flag)}
                onChange={() => toggleFlag(flag)}
                className="accent-blue-500"
              />
              <span className="font-mono">{flag}</span>
              <span className="text-gray-400 dark:text-gray-500">{label}</span>
            </label>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => update({ replaceEnabled: !replaceEnabled })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              replaceEnabled
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Replace className="w-4 h-4" />
            Replace
          </button>
          <button
            onClick={() => setBuilderOpen(!builderOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              builderOpen
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            Builder
          </button>
        </div>

        {builderOpen && (
          <div className="flex items-start gap-x-4 gap-y-1.5 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-700">
            {TOKEN_GROUPS.map((group) => (
              <div key={group.label} className="flex items-center gap-1 pt-1">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mr-0.5">{group.label}</span>
                {group.tokens.map((token) => (
                  <button
                    key={token.label}
                    onClick={() => insertToken(token)}
                    title={token.wrap ? `${token.title} — wraps the selection` : token.title}
                    className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {token.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden p-2 gap-2 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className={`${paneClass} flex-1 min-h-0`}>
            <div className={paneHeaderClass}>Test string</div>
            <textarea
              value={text}
              onChange={(e) => update({ text: e.target.value })}
              spellCheck={false}
              placeholder="Paste text to test the pattern against..."
              className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            />
          </div>
          <div className={`${paneClass} h-1/3 min-h-[6rem]`}>
            <div className={paneHeaderClass}>Explanation</div>
            <div className="flex-1 overflow-auto p-2 text-xs">
              {explanation.length === 0 ? (
                <p className="text-gray-400">Enter a pattern to see a token-by-token breakdown</p>
              ) : (
                <ul className="space-y-0.5">
                  {explanation.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <code className="flex-shrink-0 min-w-[3rem] font-mono text-blue-600 dark:text-blue-400">{t.token}</code>
                      <span className="text-gray-600 dark:text-gray-300">{t.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className={`${paneClass} flex-1 min-h-0`}>
            <div className={paneHeaderClass}>
              {replaceEnabled ? <span>Replace result</span> : status}
              {replaceEnabled && result?.ok && result.replaced !== null && (
                <button
                  onClick={() => copyOutput(result.replaced ?? '')}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {outputCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {outputCopied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap break-all text-gray-700 dark:text-gray-200">
              {replaceEnabled && result?.ok
                ? result.replaced
                : segments.map((s, i) =>
                    s.match === null ? (
                      <span key={i}>{s.value}</span>
                    ) : s.value === '' ? (
                      <span key={i} className="border-l-2 border-amber-500" title={`Empty match ${s.match + 1}`} />
                    ) : (
                      <mark key={i} title={`Match ${s.match + 1}`} className={`text-inherit ${MARK_CLASSES[s.match % 2]}`}>
                        {s.value}
                      </mark>
                    )
                  )}
            </div>
          </div>
          <div className={`${paneClass} h-2/5 min-h-[8rem]`}>
            <div className={paneHeaderClass}>{replaceEnabled ? status : <span>Match details</span>}</div>
            <div className="flex-1 overflow-auto">
              {matches.length === 0 ? (
                <p className="p-3 text-xs text-gray-400">No matches</p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-750 text-[10px] text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-2 py-1 text-left w-10">#</th>
                      <th className="px-2 py-1 text-left w-24">Position</th>
                      <th className="px-2 py-1 text-left">Match</th>
                      <th className="px-2 py-1 text-left">Groups</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {matches.slice(0, MAX_LISTED_MATCHES).map((m, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-700 align-top">
                        <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                        <td className="px-2 py-1 text-gray-500 dark:text-gray-400">
                          {m.index}–{m.end}
                        </td>
                        <td className="px-2 py-1 break-all text-gray-800 dark:text-gray-100">{m.value}</td>
                        <td className="px-2 py-1 break-all text-gray-600 dark:text-gray-300">
                          {m.named
                            ? Object.entries(m.named).map(([name, v]) => (
                                <div key={name}>
                                  <span className="text-blue-600 dark:text-blue-400">{name}</span>: {v ?? '∅'}
                                </div>
                              ))
                            : m.groups.map((g, gi) => (
                                <div key={gi}>
                                  <span className="text-blue-600 dark:text-blue-400">${gi + 1}</span>: {g ?? '∅'}
                                </div>
                              ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {matches.length > MAX_LISTED_MATCHES && (
                <p className="px-2 py-2 text-xs text-gray-400">
                  Listing the first {MAX_LISTED_MATCHES} of {matches.length} matches.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
