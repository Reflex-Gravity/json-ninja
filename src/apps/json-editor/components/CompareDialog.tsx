import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { formatJson, tryParseJson } from '@/lib/json-utils';
import { buildSideBySideDiff } from '@/lib/diff-utils';
import { diffJson } from '@/lib/json-diff';
import DiffView from '@/components/DiffView';
import JsonDiffView from '@/components/JsonDiffView';
import type { CompareMode, PanelId, PanelState } from '@/types';
import { findTab } from '../tabs';

interface DocRef {
  panelId: PanelId;
  tabId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  panels: PanelState[];
  initialLeft: DocRef | null;
  initialRight: DocRef | null;
}

interface DocOption extends DocRef {
  key: string;
  label: string;
}

function toKey(ref: DocRef | null): string {
  return ref ? `${ref.panelId}:${ref.tabId}` : '';
}

function resolveContent(panels: PanelState[], ref: DocRef | null): string {
  if (!ref) return '';
  const tab = findTab(panels, ref.panelId, ref.tabId);
  return tab?.content ?? '';
}

function formattedFor(panels: PanelState[], ref: DocRef | null): string {
  const content = resolveContent(panels, ref);
  const parsed = tryParseJson(content);
  if (!parsed.ok) return content;
  try {
    return formatJson(content);
  } catch {
    return content;
  }
}

function structuralDiff(panels: PanelState[], left: DocRef | null, right: DocRef | null) {
  try {
    const parse = (ref: DocRef | null) => JSON.parse(resolveContent(panels, ref) || 'null');
    return { changes: diffJson(parse(left), parse(right)), error: null };
  } catch (e) {
    return { changes: [], error: `Both documents must be valid JSON: ${(e as Error).message}` };
  }
}

export default function CompareDialog({ open, onClose, panels, initialLeft, initialRight }: Props) {
  const [left, setLeft] = useState<DocRef | null>(initialLeft);
  const [right, setRight] = useState<DocRef | null>(initialRight);
  const [mode, setMode] = useState<CompareMode>('text');

  useEffect(() => {
    if (open) {
      setLeft(initialLeft);
      setRight(initialRight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const options: DocOption[] = useMemo(
    () =>
      panels.flatMap((p) =>
        p.tabs.map((t) => ({
          panelId: p.id,
          tabId: t.id,
          key: `${p.id}:${t.id}`,
          label: `Document ${p.id + 1} · ${t.title}`,
        }))
      ),
    [panels]
  );

  const diff = useMemo(() => {
    if (!open || mode !== 'text') return null;
    return buildSideBySideDiff(formattedFor(panels, left), formattedFor(panels, right));
  }, [open, mode, panels, left, right]);

  const jsonDiff = useMemo(() => {
    if (!open || mode !== 'json') return null;
    return structuralDiff(panels, left, right);
  }, [open, mode, panels, left, right]);

  if (!open) return null;

  const handleSelect = (side: 'left' | 'right', key: string) => {
    const option = options.find((o) => o.key === key);
    if (!option) return;
    const ref: DocRef = { panelId: option.panelId, tabId: option.tabId };
    if (side === 'left') setLeft(ref);
    else setRight(ref);
  };

  const handleSwap = () => {
    setLeft(right);
    setRight(left);
  };

  const identical = diff !== null && diff.added === 0 && diff.removed === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Compare Documents</h2>
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
              {(['text', 'json'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  title={m === 'text' ? 'Line-by-line text diff' : 'Key-aware diff that ignores key order and formatting'}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    mode === m
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {m === 'text' ? 'Text' : 'JSON structure'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <select
            value={toKey(left)}
            onChange={(e) => handleSelect('left', e.target.value)}
            className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSwap}
            title="Swap"
            className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <select
            value={toKey(right)}
            onChange={(e) => handleSelect('right', e.target.value)}
            className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {diff && (
          <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            {identical ? (
              <p className="text-xs text-green-600 dark:text-green-400">Documents are identical</p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="text-green-600 dark:text-green-400">+{diff.added} added</span>
                {' · '}
                <span className="text-red-500 dark:text-red-400">-{diff.removed} removed</span>
              </p>
            )}
          </div>
        )}

        {jsonDiff && (
          <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            {jsonDiff.error ? (
              <p className="text-xs text-red-500 dark:text-red-400">{jsonDiff.error}</p>
            ) : jsonDiff.changes.length === 0 ? (
              <p className="text-xs text-green-600 dark:text-green-400">Documents are structurally identical</p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {jsonDiff.changes.length} difference{jsonDiff.changes.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto min-h-0">
          {diff && <DiffView rows={diff.rows} />}
          {jsonDiff && jsonDiff.changes.length > 0 && <JsonDiffView changes={jsonDiff.changes} />}
        </div>
      </div>
    </div>
  );
}
