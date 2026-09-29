import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { ArrowLeftRight, Eraser } from 'lucide-react';
import type { CompareToolState } from '@/types';
import { getToolState, saveToolState } from '@/lib/db';
import { buildSideBySideDiff } from '@/lib/diff-utils';
import { sortJsonKeys, tryParseJson } from '@/lib/json-utils';
import { setShareableState } from '@/lib/share';
import DiffView from '@/components/DiffView';

const TOOL_KEY = 'compare';

const DEFAULT_STATE: CompareToolState = {
  left: '',
  right: '',
  ignoreWhitespace: false,
  ignoreCase: false,
  normalizeJson: false,
};

type Toggle = { key: 'ignoreWhitespace' | 'ignoreCase' | 'normalizeJson'; label: string; title: string };

// Structural JSON comparison lives in the JSON editor's Compare dialog; this tool is a plain text diff.
const TOGGLES: Toggle[] = [
  { key: 'ignoreWhitespace', label: 'Ignore whitespace', title: 'Treat lines that differ only in spacing or indentation as equal' },
  { key: 'ignoreCase', label: 'Ignore case', title: 'Treat lines that differ only in letter case as equal' },
  { key: 'normalizeJson', label: 'Normalize JSON', title: 'Pretty-print valid JSON with sorted keys before comparing' },
];

// Formats with sorted keys so JSON that differs only in key order or indentation compares equal.
function normalize(text: string): string {
  if (!text.trim() || !tryParseJson(text).ok) return text;
  return sortJsonKeys(text);
}

export default function CompareApp() {
  const [state, setState] = useState<CompareToolState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<CompareToolState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToolState<CompareToolState>(TOOL_KEY).then((saved) => {
      if (cancelled) return;
      if (saved) {
        // Older saves also carried the removed JSON-structure mode's fields.
        const { left, right, ignoreWhitespace, ignoreCase, normalizeJson } = { ...DEFAULT_STATE, ...saved };
        setState({ left, right, ignoreWhitespace, ignoreCase, normalizeJson });
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistState = useCallback((next: CompareToolState) => {
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

  const update = (patch: Partial<CompareToolState>) => {
    const next = { ...state, ...patch };
    setState(next);
    persistState(next);
  };

  // Diffing large inputs on every keystroke is expensive; let typing stay responsive.
  const deferred = useDeferredValue(state);
  const diff = useMemo(() => {
    const { left, right, normalizeJson, ignoreWhitespace, ignoreCase } = deferred;
    if (!left && !right) return null;
    return buildSideBySideDiff(
      normalizeJson ? normalize(left) : left,
      normalizeJson ? normalize(right) : right,
      { ignoreWhitespace, ignoreCase }
    );
  }, [deferred]);

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const identical = diff !== null && diff.added === 0 && diff.removed === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {TOGGLES.map(({ key, label, title }) => (
            <label
              key={key}
              title={title}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={state[key]}
                onChange={(e) => update({ [key]: e.target.checked })}
                className="accent-blue-500"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => update({ left: state.right, right: state.left })}
            title="Swap left and right"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap
          </button>
          <button
            onClick={() => update({ left: '', right: '' })}
            title="Clear both sides"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Eraser className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="h-2/5 min-h-[8rem] flex overflow-hidden gap-2">
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
              {side === 'left' ? 'Original' : 'Changed'}
            </div>
            <textarea
              value={state[side]}
              onChange={(e) => update({ [side]: e.target.value })}
              spellCheck={false}
              placeholder={side === 'left' ? 'Paste the original text...' : 'Paste the changed text...'}
              className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            />
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
          {diff === null ? (
            'Differences'
          ) : identical ? (
            <span className="text-green-600 dark:text-green-400">Texts are identical</span>
          ) : (
            <>
              <span className="text-green-600 dark:text-green-400">+{diff.added} added</span>
              {' · '}
              <span className="text-red-500 dark:text-red-400">-{diff.removed} removed</span>
            </>
          )}
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {diff ? (
            <DiffView
              rows={diff.rows}
              options={{ ignoreCase: deferred.ignoreCase }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              Paste text on both sides to see the differences
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
