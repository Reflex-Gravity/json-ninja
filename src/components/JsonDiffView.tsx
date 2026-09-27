import type { JsonChange } from '@/lib/json-diff';

interface Props {
  changes: JsonChange[];
}

const MAX_VALUE_LENGTH = 300;
const MAX_ROWS = 2000;

const typeStyles: Record<JsonChange['type'], { label: string; className: string }> = {
  added: {
    label: 'Added',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  },
  removed: {
    label: 'Removed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  },
  changed: {
    label: 'Changed',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
};

function preview(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
}

function ValueCell({ present, value, tone }: { present: boolean; value: unknown; tone: 'red' | 'green' }) {
  if (!present) return <td className="px-2 py-1 align-top text-gray-300 dark:text-gray-600">—</td>;
  return (
    <td
      title={JSON.stringify(value, null, 2)}
      className={`px-2 py-1 align-top whitespace-pre-wrap break-all ${
        tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
      }`}
    >
      {preview(value)}
    </td>
  );
}

export default function JsonDiffView({ changes }: Props) {
  const rows = changes.slice(0, MAX_ROWS);
  return (
    <>
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-750 text-[10px] font-semibold text-gray-500 dark:text-gray-400 font-sans">
          <tr>
            <th className="px-2 py-1 text-left w-20">Change</th>
            <th className="px-2 py-1 text-left w-1/4">Path</th>
            <th className="px-2 py-1 text-left">Original</th>
            <th className="px-2 py-1 text-left">Changed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((change, i) => {
            const { label, className } = typeStyles[change.type];
            return (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-2 py-1 align-top">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${className}`}>
                    {label}
                  </span>
                </td>
                <td className="px-2 py-1 align-top break-all text-gray-700 dark:text-gray-200">{change.path}</td>
                <ValueCell present={change.type !== 'added'} value={change.left} tone="red" />
                <ValueCell present={change.type !== 'removed'} value={change.right} tone="green" />
              </tr>
            );
          })}
        </tbody>
      </table>
      {changes.length > MAX_ROWS && (
        <p className="px-2 py-2 text-xs text-gray-400">
          Showing the first {MAX_ROWS} of {changes.length} differences.
        </p>
      )}
    </>
  );
}
