import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { formatJson, tryParseJson } from '@/lib/json-utils';

interface Props {
  open: boolean;
  onClose: () => void;
  leftTitle: string;
  rightTitle: string;
  leftContent: string;
  rightContent: string;
}

interface DiffEntry {
  path: string;
  leftValue: string;
  rightValue: string;
  type: 'added' | 'removed' | 'changed';
}

function flattenJson(obj: unknown, prefix = ''): Map<string, string> {
  const map = new Map<string, string>();
  if (obj === null) {
    map.set(prefix || '$', 'null');
    return map;
  }
  if (typeof obj !== 'object') {
    map.set(prefix || '$', JSON.stringify(obj));
    return map;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const path = `${prefix}[${i}]`;
      flattenJson(item, path).forEach((v, k) => map.set(k, v));
    });
    return map;
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    flattenJson((obj as Record<string, unknown>)[key], path).forEach((v, k) => map.set(k, v));
  }
  return map;
}

function computeDiffs(left: string, right: string): DiffEntry[] {
  let leftJson: unknown, rightJson: unknown;
  try {
    leftJson = JSON.parse(left);
  } catch {
    return [];
  }
  try {
    rightJson = JSON.parse(right);
  } catch {
    return [];
  }
  const leftMap = flattenJson(leftJson);
  const rightMap = flattenJson(rightJson);
  const diffs: DiffEntry[] = [];
  for (const [path, value] of leftMap) {
    if (!rightMap.has(path)) {
      diffs.push({ path, leftValue: value, rightValue: '', type: 'removed' });
    } else if (rightMap.get(path) !== value) {
      diffs.push({ path, leftValue: value, rightValue: rightMap.get(path)!, type: 'changed' });
    }
  }
  for (const [path, value] of rightMap) {
    if (!leftMap.has(path)) {
      diffs.push({ path, leftValue: '', rightValue: value, type: 'added' });
    }
  }
  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

export default function CompareDialog({
  open,
  onClose,
  leftTitle,
  rightTitle,
  leftContent,
  rightContent,
}: Props) {
  const [leftFormatted, setLeftFormatted] = useState('');
  const [rightFormatted, setRightFormatted] = useState('');
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    const lv = tryParseJson(leftContent);
    const rv = tryParseJson(rightContent);
    if (lv.ok) {
      try {
        setLeftFormatted(formatJson(leftContent));
      } catch {
        setLeftFormatted(leftContent);
      }
    } else {
      setLeftFormatted(leftContent);
    }
    if (rv.ok) {
      try {
        setRightFormatted(formatJson(rightContent));
      } catch {
        setRightFormatted(rightContent);
      }
    } else {
      setRightFormatted(rightContent);
    }
    if (lv.ok && rv.ok) {
      setDiffs(computeDiffs(leftContent, rightContent));
    } else {
      setDiffs([]);
    }
  }, [open, leftContent, rightContent]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Compare Documents</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {diffs.length > 0 && (
          <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{diffs.length}</span> differences found
              {' '}
              <span className="text-green-600 dark:text-green-400">{diffs.filter((d) => d.type === 'added').length} added</span>
              {' · '}
              <span className="text-red-500 dark:text-red-400">{diffs.filter((d) => d.type === 'removed').length} removed</span>
              {' · '}
              <span className="text-amber-500 dark:text-amber-400">{diffs.filter((d) => d.type === 'changed').length} changed</span>
            </p>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-700">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                {leftTitle}
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800">
                {leftFormatted || '(empty)'}
              </pre>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                {rightTitle}
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800">
                {rightFormatted || '(empty)'}
              </pre>
            </div>
          </div>

          {diffs.length > 0 && (
            <div className="h-40 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">Path</th>
                    <th className="text-left px-3 py-1.5 font-medium">Left</th>
                    <th className="text-left px-3 py-1.5 font-medium">Right</th>
                    <th className="text-left px-3 py-1.5 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-1.5 font-mono text-gray-600 dark:text-gray-300">{d.path}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">
                        {d.leftValue || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">
                        {d.rightValue || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            d.type === 'added'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : d.type === 'removed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {d.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {diffs.length === 0 && tryParseJson(leftContent).ok && tryParseJson(rightContent).ok && (
            <div className="px-5 py-3 text-xs text-green-600 dark:text-green-400 text-center border-t border-gray-200 dark:border-gray-700">
              Documents are identical
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
