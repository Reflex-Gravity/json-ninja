import { useEffect, useState } from 'react';
import { X, Trash2, FileText, Calendar, HardDrive, Search } from 'lucide-react';
import type { SavedDocument } from '@/types';
import { getAllDocuments, deleteDocument } from '@/lib/db';
import { byteSize } from '@/lib/json-utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (doc: SavedDocument) => void;
}

export default function DocumentDialog({ open, onClose, onLoad }: Props) {
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      getAllDocuments().then(setDocs);
    }
  }, [open]);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocs(await getAllDocuments());
  };

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Saved Documents</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="text-xs bg-transparent flex-1 outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <FileText className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">No saved documents yet</p>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group transition-colors"
                onClick={() => {
                  onLoad(doc);
                  onClose();
                }}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {byteSize(doc.content)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
