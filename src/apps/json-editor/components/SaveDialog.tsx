import { useState } from 'react';
import { X } from 'lucide-react';
import { byteSize } from '@/lib/json-utils';

interface Props {
  open: boolean;
  defaultName: string;
  content: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

export default function SaveDialog({
  open,
  defaultName,
  content,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(defaultName);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Save Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Document name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onSave(name.trim());
                }
              }}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
            />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Size: {byteSize(content)}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => name.trim() && onSave(name.trim())}
              disabled={!name.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
