import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, ArrowLeftRight } from 'lucide-react';
import type { StringifyMode, StringifyToolState } from '@/types';
import { getToolState, saveToolState } from '@/lib/db';
import { setShareableState } from '@/lib/share';
import {
  stringifyText,
  parseStringified,
  buildCurlCommand,
  parseCurlCommand,
  type CurlRequest,
} from '@/lib/stringify-utils';

const TOOL_KEY = 'stringify';

const DEFAULT_STATE: StringifyToolState = {
  mode: 'stringify',
  input: '',
  minify: true,
  method: 'POST',
  url: 'https://api.example.com/endpoint',
  shell: 'bash',
};

const MODES: { id: StringifyMode; label: string; inputLabel: string; outputLabel: string; placeholder: string }[] = [
  {
    id: 'stringify',
    label: 'Stringify',
    inputLabel: 'JSON',
    outputLabel: 'String literal',
    placeholder: 'Paste JSON to escape into a string...',
  },
  {
    id: 'parse',
    label: 'Parse',
    inputLabel: 'String literal',
    outputLabel: 'JSON',
    placeholder: 'Paste a stringified value, e.g. "{\\"a\\":1}"...',
  },
  {
    id: 'to-curl',
    label: 'To cURL',
    inputLabel: 'JSON body',
    outputLabel: 'cURL command',
    placeholder: 'Paste the JSON request body...',
  },
  {
    id: 'from-curl',
    label: 'From cURL',
    inputLabel: 'cURL command',
    outputLabel: 'JSON body',
    placeholder: "Paste a curl command, e.g. curl -X POST https://... -d '{\"a\":1}'",
  },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const selectClass =
  'text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400';

export default function StringifyApp() {
  const [state, setState] = useState<StringifyToolState>(DEFAULT_STATE);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<StringifyToolState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToolState<StringifyToolState>(TOOL_KEY).then((saved) => {
      if (cancelled) return;
      if (saved) setState({ ...DEFAULT_STATE, ...saved });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistState = useCallback((next: StringifyToolState) => {
    pendingRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) saveToolState(TOOL_KEY, pendingRef.current);
      pendingRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) saveToolState(TOOL_KEY, pendingRef.current);
    };
  }, []);

  useEffect(() => setShareableState(TOOL_KEY, state), [state]);

  const update = (patch: Partial<StringifyToolState>) => {
    const next = { ...state, ...patch };
    setState(next);
    persistState(next);
  };

  const { mode, input, minify, method, url, shell } = state;
  const modeInfo = MODES.find((m) => m.id === mode) ?? MODES[0];

  let output = '';
  let error = '';
  let notice = '';
  let parsedCurl: CurlRequest | null = null;
  if (input.trim()) {
    try {
      if (mode === 'stringify') {
        const result = stringifyText(input, minify);
        output = result.output;
        if (!result.isJson) notice = 'Input is not valid JSON — escaped as plain text';
      } else if (mode === 'parse') {
        output = parseStringified(input);
      } else if (mode === 'to-curl') {
        output = buildCurlCommand(
          { method, url, headers: ['Content-Type: application/json'], body: input },
          shell,
          minify
        );
      } else {
        parsedCurl = parseCurlCommand(input);
        output = parsedCurl.body;
        if (!output) notice = 'No request body found in this command';
      }
    } catch (e) {
      error =
        mode === 'parse'
          ? `Not a valid JSON string literal: ${(e as Error).message}`
          : (e as Error).message;
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // Feeds the output back in with the opposite mode, so a round trip is one click.
  const handleReverse = () => {
    if (!output || error) return;
    if (mode === 'stringify') update({ mode: 'parse', input: output });
    else if (mode === 'parse') update({ mode: 'stringify', input: output });
    else if (mode === 'to-curl') update({ mode: 'from-curl', input: output });
    else if (parsedCurl) {
      update({
        mode: 'to-curl',
        input: parsedCurl.body,
        method: parsedCurl.method || method,
        url: parsedCurl.url || url,
      });
    }
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => update({ mode: m.id })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === m.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'to-curl' && (
            <div className="flex items-center gap-1.5">
              <select value={method} onChange={(e) => update({ method: e.target.value })} className={selectClass}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
                spellCheck={false}
                className={`${selectClass} w-64`}
              />
              <select
                value={shell}
                onChange={(e) => update({ shell: e.target.value as StringifyToolState['shell'] })}
                title="Quoting style"
                className={selectClass}
              >
                <option value="bash">Bash / zsh</option>
                <option value="cmd">Windows cmd</option>
              </select>
            </div>
          )}

          {(mode === 'stringify' || mode === 'to-curl') && (
            <label
              title="Compact valid JSON onto one line before escaping"
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={minify}
                onChange={(e) => update({ minify: e.target.checked })}
                className="accent-blue-500"
              />
              Minify
            </label>
          )}
        </div>

        <button
          onClick={handleReverse}
          disabled={!output || !!error}
          title="Use the output as input in the opposite direction"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Reverse
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden gap-2">
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            {modeInfo.inputLabel}
          </div>
          <textarea
            value={input}
            onChange={(e) => update({ input: e.target.value })}
            spellCheck={false}
            placeholder={modeInfo.placeholder}
            className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <span>{modeInfo.outputLabel}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {parsedCurl && (parsedCurl.url || parsedCurl.headers.length > 0) && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5 max-h-32 overflow-auto">
              <div className="break-all">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{parsedCurl.method}</span>{' '}
                {parsedCurl.url}
              </div>
              {parsedCurl.headers.map((h, i) => (
                <div key={i} className="break-all text-gray-500 dark:text-gray-400">
                  {h}
                </div>
              ))}
            </div>
          )}
          {notice && !error && (
            <div className="px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 border-b border-gray-100 dark:border-gray-700">
              {notice}
            </div>
          )}
          <textarea
            value={error || output}
            readOnly
            spellCheck={false}
            className={`flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 ${
              error ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
