import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppPreferences, Theme, ToolId, LayoutType } from '@/types';
import { MAX_PANELS } from '@/types';
import { getPreferences, savePreferences } from '@/lib/db';
import { getToolFromPath, getPathForTool } from '@/lib/tools';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import JsonEditorApp, { type JsonEditorHandle } from '@/apps/json-editor/JsonEditorApp';
import SvgPreviewApp from '@/apps/svg-preview/SvgPreviewApp';
import HtmlPreviewApp from '@/apps/html-preview/HtmlPreviewApp';
import Base64App from '@/apps/base64/Base64App';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTool, setActiveTool] = useState<ToolId>(() =>
    getToolFromPath(window.location.pathname)
  );
  const [loaded, setLoaded] = useState(false);
  const [jsonLayout, setJsonLayout] = useState<LayoutType>('horizontal');
  const jsonEditorRef = useRef<JsonEditorHandle>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<AppPreferences | null>(null);

  // Canonicalize the URL once on mount (e.g. an unknown path falls back to '/').
  useEffect(() => {
    const canonicalPath = getPathForTool(activeTool);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(null, '', canonicalPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep activeTool in sync with browser back/forward navigation.
  useEffect(() => {
    const handlePopState = () => {
      setActiveTool(getToolFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs) {
        setTheme(prefs.theme);
      }
      setLoaded(true);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) savePreferences(pendingRef.current);
    };
  }, []);

  const persistShellPrefs = useCallback((newTheme: Theme) => {
    pendingRef.current = { theme: newTheme };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) savePreferences(pendingRef.current);
      pendingRef.current = null;
    }, 800);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    persistShellPrefs(newTheme);
  };

  const handleToolChange = (newTool: ToolId) => {
    setActiveTool(newTool);
    const path = getPathForTool(newTool);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  if (!loaded) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex overflow-hidden ${
        theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <Sidebar activeTool={activeTool} onChange={handleToolChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          theme={theme}
          onThemeChange={handleThemeChange}
          activeTool={activeTool}
          jsonLayout={jsonLayout}
          jsonPanelCount={MAX_PANELS[jsonLayout]}
          onJsonLayoutChange={(layout) => jsonEditorRef.current?.setLayout(layout)}
          onFormatAll={() => jsonEditorRef.current?.formatAll()}
          onOpenDocuments={() => jsonEditorRef.current?.openDocuments()}
          onImportUrl={(text, panelIndex) => jsonEditorRef.current?.importUrl(text, panelIndex)}
        />
        <div className="flex-1 overflow-hidden">
          {activeTool === 'json' && (
            <JsonEditorApp
              ref={jsonEditorRef}
              theme={theme}
              onLayoutChange={setJsonLayout}
            />
          )}
          {activeTool === 'svg' && <SvgPreviewApp />}
          {activeTool === 'html' && <HtmlPreviewApp />}
          {activeTool === 'base64' && <Base64App />}
        </div>
      </div>
    </div>
  );
}
