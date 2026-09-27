import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Copy, Check, Wrench } from 'lucide-react';
import type { TypesOutputFormat, TypesToolState } from '@/types';
import { useToolState } from '@/lib/use-tool-state';
import { generateTypes } from '@/lib/json-to-types';
import { repairJson } from '@/lib/json-utils';

const DEFAULT_STATE: TypesToolState = {
  input: `{
  "id": 42,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "roles": ["admin", "editor"],
  "address": { "city": "London", "postcode": null },
  "orders": [
    { "id": "A-1", "total": 19.99, "items": 2 },
    { "id": "A-2", "total": 5, "coupon": "SPRING" }
  ]
}`,
  rootName: 'Root',
  format: 'typescript',
  declaration: 'interface',
};

const FORMATS: { id: TypesOutputFormat; label: string }[] = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'zod', label: 'Zod' },
];

const segmentClass = (active: boolean) =>
  `px-3 py-1.5 rounded text-xs font-medium transition-colors ${
    active
      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

const inputClass =
  'text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400';

export default function TypesApp() {
  const { state, update, loaded } = useToolState('types', DEFAULT_STATE);
  const { input, rootName, format, declaration } = state;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const deferredInput = useDeferredValue(input);
  const { output, error } = useMemo(() => {
    if (!deferredInput.trim()) return { output: '', error: '' };
    try {
      return { output: generateTypes(deferredInput, { rootName, format, declaration }), error: '' };
    } catch (e) {
      return { output: '', error: `Invalid JSON: ${(e as Error).message}` };
    }
  }, [deferredInput, rootName, format, declaration]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      // ignore
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
          {FORMATS.map((f) => (
            <button key={f.id} onClick={() => update({ format: f.id })} className={segmentClass(format === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        {format === 'typescript' && (
          <div
            className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5"
            title="Declare object shapes as interfaces or type aliases"
          >
            {(['interface', 'type'] as const).map((d) => (
              <button key={d} onClick={() => update({ declaration: d })} className={segmentClass(declaration === d)}>
                {d}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          Root name
          <input
            value={rootName}
            onChange={(e) => update({ rootName: e.target.value })}
            spellCheck={false}
            className={`${inputClass} w-32`}
          />
        </label>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Fields missing from some array items are marked optional
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden gap-2">
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <span>JSON sample</span>
            {error && (
              <button
                onClick={() => update({ input: repairJson(input) })}
                title="Try to fix trailing commas, single quotes, unquoted keys..."
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <Wrench className="w-3 h-3" />
                Repair
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => update({ input: e.target.value })}
            spellCheck={false}
            placeholder="Paste a JSON sample, e.g. an API response..."
            className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <span>{format === 'zod' ? 'Zod schema' : 'TypeScript types'}</span>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-40"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
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
