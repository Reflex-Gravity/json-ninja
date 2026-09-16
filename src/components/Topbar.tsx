import { useState } from 'react';
import {
  Orbit,
  Braces,
  Sun,
  Moon,
  Square,
  Columns2,
  Rows2,
  Grid2x2,
  FolderOpen,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import type { Theme, ToolId, LayoutType } from '@/types';
import { TOOLS } from '@/lib/tools';

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  activeTool: ToolId;
  jsonLayout?: LayoutType;
  jsonPanelCount?: number;
  onJsonLayoutChange?: (layout: LayoutType) => void;
  onFormatAll?: () => void;
  onOpenDocuments?: () => void;
  onImportUrl?: (text: string, panelIndex: number) => void;
}

const layoutOptions: { type: LayoutType; label: string; icon: typeof Square }[] = [
  { type: 'single', label: '1 Panel', icon: Square },
  { type: 'horizontal', label: '2 Side-by-Side', icon: Columns2 },
  { type: 'vertical', label: '2 Stacked', icon: Rows2 },
  { type: 'grid', label: '2x2 Grid', icon: Grid2x2 },
];

export default function Topbar({
  theme,
  onThemeChange,
  activeTool,
  jsonLayout,
  jsonPanelCount = 1,
  onJsonLayoutChange,
  onFormatAll,
  onOpenDocuments,
  onImportUrl,
}: Props) {
  const activeLabel = TOOLS.find((t) => t.id === activeTool)?.label ?? '';
  const showPanelConfig = activeTool === 'json' && jsonLayout && onJsonLayoutChange;

  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [panelIndex, setPanelIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImportUrl = async () => {
    if (!url.trim() || !onImportUrl) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      onImportUrl(text, panelIndex);
      setUrlModalOpen(false);
      setUrl('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 text-white flex-shrink-0">
            <Orbit className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
              GravityTools
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight hidden sm:block">
              {activeLabel}
            </span>
          </div>
        </div>

        {showPanelConfig && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

            {/* Layout selector */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-shrink-0">
              {layoutOptions.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onJsonLayoutChange?.(type)}
                  title={label}
                  className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
                    jsonLayout === type
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        {showPanelConfig && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onFormatAll}
              title="Format all panels"
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Braces className="w-4 h-4" />
            </button>
            <button
              onClick={() => setUrlModalOpen(true)}
              title="Import from URL"
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenDocuments}
              title="Open saved documents"
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* URL import modal */}
      {urlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Import from URL</h2>
              <button
                onClick={() => setUrlModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  JSON URL
                </label>
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/data.json"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImportUrl();
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Target panel
                </label>
                <select
                  value={panelIndex}
                  onChange={(e) => setPanelIndex(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
                >
                  {Array.from({ length: jsonPanelCount }, (_, i) => (
                    <option key={i} value={i}>
                      Panel {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setUrlModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportUrl}
                  disabled={loading || !url.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Fetching...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
