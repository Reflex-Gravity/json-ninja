import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import type { SvgToolState } from '@/types';
import { getToolState, saveToolState } from '@/lib/db';
import { byteSize } from '@/lib/json-utils';
import PreviewFrame from '@/components/PreviewFrame';
import SandboxToggle from '@/components/SandboxToggle';

const TOOL_KEY = 'svg';

const DEFAULT_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="80" fill="#3b82f6" />
</svg>`;

function wrapSvg(svg: string): string {
  return `<!doctype html><html><head><style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}</style></head><body>${svg}</body></html>`;
}

export default function SvgPreviewApp() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [scriptsEnabled, setScriptsEnabled] = useState(false);
  const [srcDoc, setSrcDoc] = useState(() => wrapSvg(DEFAULT_CONTENT));
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<SvgToolState | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToolState<SvgToolState>(TOOL_KEY).then((state) => {
      if (cancelled) return;
      if (state) {
        setContent(state.content);
        setSrcDoc(wrapSvg(state.content));
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistState = useCallback((newContent: string) => {
    pendingRef.current = { content: newContent };
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
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleContentChange = (value: string) => {
    setContent(value);
    persistState(value);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setSrcDoc(wrapSvg(value)), 300);
  };

  const handleClear = () => {
    handleContentChange('');
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <SandboxToggle enabled={scriptsEnabled} onChange={setScriptsEnabled} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{byteSize(content)}</span>
        </div>
        <button
          onClick={handleClear}
          title="Clear"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste or write SVG markup..."
            className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-1 min-w-0 bg-white border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <PreviewFrame srcDoc={srcDoc} scriptsEnabled={scriptsEnabled} />
        </div>
      </div>
    </div>
  );
}
